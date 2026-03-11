# Architecture Deep Dive

This document explains how every piece of Origin connects, how data flows through the system, and how the firmware tick loop synchronizes with the host app loop.

---

## The Two Loops

Origin has two loops running simultaneously on different machines, connected by a transport wire.

### Firmware Loop (Arduino)

```
loop()
  └── origin.tick()
        ├── 1. pollSensors()         — call each sensor's readFn, update latestReadings
        ├── 2. sendReadings()         — serialize latestReadings to JSON, push to transport
        ├── 3. receiveAction()        — non-blocking check: did the host send a new action?
        └── 4. executeCurrentAction() — call the current action's function with currentParams
```

This runs as fast as the Arduino can loop — typically thousands of times per second (limited mainly by sensor read time and transport I/O).

**Key properties:**
- `pollSensors()` calls every registered sensor read function. They write into a shared `Readings` struct.
- `sendReadings()` serializes the entire `Readings` struct to JSON and pushes it out. Every tick. This means the host is flooded with readings — it's the host's job to consume or discard them.
- `receiveAction()` checks `transport->available()`. If nothing is waiting, it returns immediately — no blocking. If a message is available, it parses the action name and params, storing them in `currentAction` and `currentParams`.
- `executeCurrentAction()` looks up the action by name and calls its function. If no action has been set yet (`currentAction` is empty), it does nothing.

### Host Loop (TypeScript)

```
launcher.run(app)
  ├── app.setup(ctx)         — called once
  └── startLoop()
        └── tick() [repeats every tickInterval ms]
              ├── 1. client.poll()    — drain transport buffer, merge into cached readings
              ├── 2. build AppContext  — { readings, send(), read() }
              ├── 3. app.loop(ctx)    — your code runs here
              └── 4. setTimeout(tick) — schedule next tick
```

The host loop runs at a configurable tick rate (default: 50ms / ~20Hz). This is deliberately slower than the firmware loop.

**Key properties:**
- `client.poll()` drains all buffered messages from the transport. Since the Arduino sends readings much faster than the host consumes them, the buffer accumulates. `poll()` reads everything available and keeps only the latest merged readings.
- A fresh `AppContext` is built each tick with the latest readings snapshot.
- `app.loop(ctx)` is `await`ed — if your app is async, the next tick waits for it to finish.
- Errors in `app.loop()` are caught and logged, but don't crash the launcher.

---

## Data Flow Diagram

```
                  FIRMWARE (Arduino)                          HOST (TypeScript)
                  ──────────────────                          ─────────────────

    ┌─────────────────────────────────┐
    │ Sensor Read Functions           │
    │                                 │
    │  readDistance() ──┐             │
    │  readTemp()    ──┤             │
    │  readAccel()   ──┘             │
    │                   ▼             │
    │            ┌────────────┐       │
    │            │  Readings   │       │
    │            │  {          │       │
    │            │   distance: │       │
    │            │   temp:     │       │
    │            │   accel:    │       │
    │            │  }          │       │
    │            └──────┬─────┘       │
    │                   │             │
    │           serializeJson()       │
    │                   │             │
    │            ┌──────▼─────┐       │        ┌──────────────────────┐
    │            │  Transport  │───────────────►│  Transport           │
    │            │  .send()    │  JSON line     │  .receive()          │
    │            └─────────────┘       │        └──────────┬───────────┘
    │                                  │                   │
    │                                  │                   ▼
    │                                  │        ┌──────────────────────┐
    │                                  │        │  OriginClient        │
    │                                  │        │  .poll()             │
    │                                  │        │                      │
    │                                  │        │  _readings = {       │
    │                                  │        │    distance: 24,     │
    │                                  │        │    temp: 31.5        │
    │                                  │        │  }                   │
    │                                  │        └──────────┬───────────┘
    │                                  │                   │
    │                                  │                   ▼
    │                                  │        ┌──────────────────────┐
    │                                  │        │  AppContext           │
    │                                  │        │                      │
    │                                  │        │  .readings           │
    │                                  │        │  .send(action)       │
    │                                  │        │  .read()             │
    │                                  │        └──────────┬───────────┘
    │                                  │                   │
    │                                  │                   ▼
    │                                  │        ┌──────────────────────┐
    │                                  │        │  YOUR APP            │
    │                                  │        │                      │
    │                                  │        │  app.loop(ctx) {     │
    │                                  │        │    if distance < 10  │
    │                                  │        │      ctx.send(...)   │
    │                                  │        │  }                   │
    │                                  │        └──────────┬───────────┘
    │                                  │                   │
    │                                  │                   │ ctx.send("moveBkwd")
    │                                  │                   ▼
    │            ┌─────────────┐       │        ┌──────────────────────┐
    │            │  Transport  │◄───────────────│  Transport           │
    │            │  .receive() │  JSON line     │  .send()             │
    │            └──────┬──────┘       │        └──────────────────────┘
    │                   │              │
    │           deserializeJson()      │
    │                   │              │
    │            ┌──────▼─────┐        │
    │            │ currentAction│       │
    │            │ "moveBkwd"  │        │
    │            │             │        │
    │            │ currentParams│       │
    │            │ {speed: 100}│        │
    │            └──────┬─────┘        │
    │                   │              │
    │                   ▼              │
    │  ┌──────────────────────────┐    │
    │  │ Action Functions          │    │
    │  │                           │    │
    │  │  moveFwd(params)          │    │
    │  │  moveBkwd(params)  ◄──────│    │
    │  │  turnRight(params)        │    │
    │  │  stop(params)             │    │
    │  └──────────────────────────┘    │
    └─────────────────────────────────┘
```

---

## Timing and Synchronization

The two loops are **not synchronized**. They run at different speeds and are loosely coupled.

### What this means in practice

The Arduino might send 100 readings between two host ticks. The host's `poll()` drains all 100, merges them, and gives the app the latest snapshot. Intermediate readings are not individually processed — they're overwritten by newer ones.

This is by design:
- The firmware doesn't wait for the host to acknowledge readings
- The host doesn't wait for the firmware to process actions
- Both sides keep running independently

### Timing diagram (approximate)

```
Time  Arduino                           Host (50ms ticks)
────  ──────────────────────────        ─────────────────
0ms   tick: poll, send readings
1ms   tick: poll, send readings
2ms   tick: poll, send readings
...
49ms  tick: poll, send readings
50ms  tick: poll, send readings         poll(): drain ~50 messages, get latest
      tick: receive "moveFwd"           app.loop(): send("moveFwd")
51ms  tick: execute moveFwd
52ms  tick: execute moveFwd
...
99ms  tick: execute moveFwd
100ms tick: poll, send readings         poll(): drain ~50 messages
      tick: execute moveFwd             app.loop(): send("moveFwd") [same action]
      (no change — action persists)
```

### Action persistence

When the host sends `moveFwd`, the firmware stores it as `currentAction`. On every subsequent tick, `executeCurrentAction()` calls the `moveFwd` function again — even without receiving a new message.

This means:
- The host can send at 20Hz, the firmware executes at 1000Hz+ — the action fills the gap
- Network hiccups don't cause motors to stop — the last action keeps running
- To stop, you must explicitly send a `stop` action

---

## Package Dependency Graph

```
@aorigin/core                    ← Transport interface, OriginApp, OriginClient
    ▲           ▲
    │           │
    │     @aorigin/launcher      ← imports OriginClient, OriginApp, AppContext
    │
    ├── @aorigin/transport-serial     ← implements Transport
    │
    └── @aorigin/transport-bluetooth  ← implements Transport


    apps/
    ├── depends on @aorigin/core
    ├── depends on @aorigin/launcher
    ├── depends on @aorigin/transport-serial
    └── depends on @aorigin/transport-bluetooth
```

The `core` package has zero runtime dependencies. Transport packages depend on `serialport`. The launcher depends only on `core`. Apps depend on everything.

---

## Memory Layout (Firmware)

Understanding memory is critical on Arduino where RAM is limited (2KB on Uno).

```
Origin instance:
├── sensors[16]        — 16 × (pointer + pointer + int + pointer) ≈ 128 bytes
├── chips[16]          — 16 × (pointer + pointer + int) ≈ 96 bytes
├── actions[16]        — 16 × (pointer + pointer) ≈ 64 bytes
├── currentAction[64]  — 64 bytes (char array)
├── currentParams      — 16 × (32 + 4) bytes ≈ 576 bytes
├── latestReadings     — 32 × (pointer + 4) bytes ≈ 256 bytes
├── transport*         — 4 bytes (pointer)
└── counters           — 12 bytes (3 ints)
                        ─────────
                        ~1,200 bytes total (worst case, all slots filled)
```

Plus the JSON serialization buffer: 512 bytes for sending, 256 bytes for receiving. These are stack-allocated in `tick()` and freed after each call.

**For Arduino Uno (2KB RAM):** You can comfortably register ~4-5 sensors and ~5-6 actions. Reduce the `ORIGIN_MAX_*` constants if you need tighter memory.

**For Arduino Mega (8KB RAM) or ESP32 (520KB RAM):** The defaults are fine. You can increase buffer sizes freely.

---

## Error Handling

### Firmware side

- If `setTransport()` receives `nullptr`, `sendReadings()` and `receiveAction()` silently no-op.
- If JSON deserialization fails (malformed message), `receiveAction()` returns without changing the current action.
- If an action name doesn't match any registered action, `executeCurrentAction()` silently no-ops.
- If registration arrays are full, new registrations are silently dropped.

There are no exceptions, no panics, no crashes. The firmware is designed to keep running no matter what garbage comes over the wire.

### Host side

- `OriginClient.poll()` catches all exceptions from `transport.receive()` and returns cached readings.
- `OriginClient.read()` wraps JSON parsing in a try-catch — malformed messages are discarded.
- `Launcher` catches errors in `app.loop()`, logs them, and continues the loop.
- Transport errors during `connect()`, `send()`, or `disconnect()` propagate to the caller.
