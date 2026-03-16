# Architecture

Origin v0.2 has three layers that communicate over two boundaries:

```
  Client App            Origin Server                Arduino Firmware
  (TS / Python)         (Node.js)                    (C++)
  ───────────           ─────────────                ────────────────
  HTTP/SSE  <-------->  HTTP Router  <--- serial --->  Origin tick loop
                        Device Manager                  Transport
                        SSE Manager
                        Webhook Manager
```

---

## The Three Loops

### 1. Firmware Tick Loop (Arduino)

```
setup()
  origin.setDeviceId("toy-car")
  origin.setTransport(new BluetoothTransport(...))
  origin.registerSensor(...)
  origin.registerAction(...)
  origin.defineState(...)
  origin.handshake()       <-- blocks until server acks

loop()
  origin.tick()
    1. pollSensors()           call each sensor readFn, update Readings
    2. sendReadings()          serialize to {"type":"readings","data":{...}}, send
    3. receiveAction()         non-blocking check for {"type":"action",...}
    4. executeCurrentAction()  call the current action fn (persists until overridden)
```

The tick loop runs as fast as the Arduino can execute -- typically hundreds to thousands of iterations per second. Sensor read functions are called every tick, so readings are always fresh.

Actions persist: when the server sends `moveFwd`, the firmware keeps calling `moveFwd()` on every tick until a different action arrives. This means motors keep running, LEDs stay on, etc.

### 2. Server Event Loop (Node.js)

The server is event-driven. It does not poll. Data flows through callbacks:

```
Transport.onData(line)
  parse JSON
  if announce -> register device, send ack, emit device.connected
  if readings -> diff state, update, emit state.updated

HTTP Request
  route to handler
  handler reads device state or sends action via transport

SSE Connection
  subscribes to device events
  receives broadcasts from DeviceManager
```

The server holds the current state for each device in memory. When readings arrive, it diffs against the previous state and only emits `state.updated` if something changed.

### 3. Client App (TS / Python)

Clients are stateless HTTP consumers. They make requests to the server and optionally subscribe to SSE for real-time updates.

```
Polling pattern:
  while true:
    state = client.getDeviceState(id)
    decide action based on state
    client.sendAction(id, action, params)
    sleep(interval)

Event-driven pattern:
  sub = client.subscribe(deviceId)
  sub.onEvent("state.updated", handler)
```

---

## Data Flow

### Readings (sensor data flowing up)

```
Arduino                     Server                      Client
───────                     ──────                      ──────

Sensor readFn() fills
Readings struct
       |
JSON serialize:
{"type":"readings",
 "data":{"distance":24.5}}
       |
transport.send() --------> transport.onData()
                            parse JSON
                            diff against stored state
                            update state map
                            emit "state.updated" SSE
                                    |
                            GET /state ---------> returns current state
                            SSE /events --------> pushes to subscribers
                            POST /webhooks -----> dispatches to URLs
```

### Actions (commands flowing down)

```
Client                      Server                      Arduino
──────                      ──────                      ───────

POST /devices/:id/actions
  {"name":"moveFwd",
   "params":{"speed":200}}
       |
                            validate action name
                            serialize to wire format
                            transport.write()
                            emit "action.sent" SSE
                                    |
                                    |---------> transport.receive()
                                                parse JSON
                                                store currentAction
                                                store currentParams
                                                executeCurrentAction()
                                                  calls moveFwd(params)
```

### Handshake

```
Arduino                     Server
───────                     ──────

sendAnnounce() -----------> transport.onData()
{"type":"announce",           parse announce message
 "id":"toy-car",              create device entry
 "version":"0.2",             store manifest
 "sensors":[...],
 "chips":[...],               send ack:
 "actions":[...],             {"type":"ack"}
 "state":[...]}           <--
                                emit "device.connected"
waitForAck() receives ack
handshakeComplete = true
tick() now runs normally
```

If the server does not respond within 5 seconds, the firmware retries the announce. It retries indefinitely until ack is received.

---

## Server Architecture

```
index.ts (CLI)
  |
  |-- parses args (--serial, --bluetooth, --port, --token, --config)
  |-- creates managers
  |-- opens transports
  |-- starts HTTP server
  |
  v
DeviceManager (EventEmitter)
  |-- manages transport -> device mapping
  |-- handles announce/ack handshake
  |-- tracks device state with diffing
  |-- validates and relays actions
  |-- emits SSE events
  |
  +---> SSEManager
  |       |-- manages HTTP response connections
  |       |-- per-device filtering
  |       |-- broadcasts events to all subscribers
  |
  +---> WebhookManager
  |       |-- registers/removes webhooks
  |       |-- HMAC-SHA256 signed payloads
  |       |-- 10s timeout per dispatch
  |       |-- concurrent dispatch with Promise.allSettled
  |
  +---> HTTP Router (native http module)
          |-- CORS headers on all responses
          |-- optional Bearer token auth
          |-- routes to device/webhook/SSE handlers
```

### Why native `http` instead of Express?

Origin server has a small, fixed API surface. Using native `http` means zero runtime dependencies beyond `serialport`. The router is a simple function with string matching -- no middleware chains, no hidden behavior.

---

## Memory and Limits

### Firmware (Arduino)

| Resource | Size | Notes |
|----------|------|-------|
| Announce buffer | 1024 bytes | Stack-allocated in sendAnnounce() |
| Readings buffer | 512 bytes | Stack-allocated in sendReadings() |
| Action buffer | 256 bytes | Stack-allocated in receiveAction() |
| Readings struct | ~576 bytes | 16 entries x (32 + 4) bytes |
| Params struct | ~576 bytes | 16 entries x (32 + 4) bytes |
| Sensor entries | ~128 bytes | 8 entries |
| Chip entries | ~96 bytes | 8 entries |
| Action entries | ~128 bytes | 16 entries |

Total worst case: ~3.3 KB. Fits comfortably on Arduino Uno (2 KB SRAM) with reduced limits, or with defaults on Mega/ESP32.

All compile-time limits are configurable by defining constants before including `origin.h`:
```cpp
#define ORIGIN_MAX_SENSORS 4
#define ORIGIN_MAX_ACTIONS 8
#include "origin.h"
```

### Server (Node.js)

Device state is held in memory as plain objects. No database, no persistence. If the server restarts, devices must re-announce. This is by design -- the firmware is the source of truth.

---

## Error Handling

### Firmware

- Malformed JSON is silently dropped (receiveAction returns false)
- Unknown action names are ignored
- Registration arrays silently cap at their limits
- Transport errors are silently swallowed
- The firmware never crashes, never blocks (except during handshake)

### Server

- Transport errors are logged but do not crash the server
- Device disconnection is detected via transport.onClose() and cleaned up
- HTTP errors return structured JSON with status codes
- Webhook dispatch failures are logged but do not affect other webhooks
- SSE connection failures are silently cleaned up

### Client SDKs

- HTTP errors throw `OriginError` (TS) / `OriginError` exception (Python) with status code
- SSE disconnections trigger automatic reconnection
- Callback errors in SSE handlers are caught and swallowed
