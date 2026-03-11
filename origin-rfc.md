# Origin RFC

## Problem

Writing firmware for Arduinos requires C/C++ knowledge, and the development loop is slow — flash, test, reflash. Most of the interesting logic (decision-making, ML inference, complex control flows) doesn't need to run on the microcontroller. It just needs to tell the microcontroller what to do.

## Core Insight

Arduino firmware follows the same pattern as a game engine: `setup()` initializes hardware, `loop()` runs continuously. The hardware (motors, sensors, pins) is the "renderer" — the low-level engine. The actual application logic is the "game code" scripting layer.

Origin splits these two apart:

1. **Firmware SDK** — a thin C++ library that runs on the Arduino. Registers hardware (sensors, chips, pins), exposes named actions, and communicates state over a pluggable transport.
2. **Host Runtime** — a TypeScript server that runs on a connected machine (laptop, Raspberry Pi, etc.). Loads and executes programs that read state from and send actions to the Arduino.

People write their application logic in TypeScript. The Arduino becomes a dumb executor.

## Architecture

```
┌─────────────────────────────────────────────┐
│  Host Machine                               │
│                                             │
│  ┌───────────────────────────────────────┐  │
│  │  Launcher (TS Server)                 │  │
│  │                                       │  │
│  │  ┌─────────┐ ┌─────────┐ ┌────────┐  │  │
│  │  │ App 1   │ │ App 2   │ │ App N  │  │  │
│  │  └────┬────┘ └────┬────┘ └───┬────┘  │  │
│  │       └───────────┼──────────┘        │  │
│  │                   │                   │  │
│  │          ┌────────▼────────┐          │  │
│  │          │  Origin Client  │          │  │
│  │          └────────┬────────┘          │  │
│  └───────────────────┼───────────────────┘  │
│                      │                      │
│             ┌────────▼────────┐             │
│             │ Transport Adapter│             │
│             │ (BT / WiFi / USB)│             │
│             └────────┬────────┘             │
└──────────────────────┼──────────────────────┘
                       │
          ─ ─ ─ ─ ─ ─ ┼ ─ ─ ─ ─ ─ ─
                       │
┌──────────────────────┼──────────────────────┐
│  Arduino             │                      │
│             ┌────────▼────────┐             │
│             │ Transport Adapter│             │
│             │ (BT / WiFi / USB)│             │
│             └────────┬────────┘             │
│                      │                      │
│           ┌──────────▼──────────┐           │
│           │  Origin Firmware SDK │           │
│           │                      │           │
│           │  - Registered Sensors│           │
│           │  - Registered Chips  │           │
│           │  - Registered Actions│           │
│           │  - State             │           │
│           └──────────────────────┘           │
└──────────────────────────────────────────────┘
```

## The Three Pieces

### 1. Firmware SDK (C++ — runs on Arduino)

The firmware SDK is a C++ library that provides a structured way to:

- Register hardware (sensors, motor driver chips, individual pins)
- Register sensors with read functions that auto-poll every loop — readings are always fresh without the host needing to request them
- Define named actions that manipulate hardware (e.g., `moveFwd`, `stop`)
- Persist the current action until a new one arrives — if the host says `moveFwd`, motors keep running until the next action overrides it
- Communicate over a pluggable transport

#### API Surface (draft)

```cpp
// origin.h

struct Readings {
    // sensor data flowing up to the host
    // v1: flat key-value, shape determined by registered sensors
};

struct Params {
    // action parameters flowing down from the host
    // v1: flat key-value, shape determined by what the app sends
};

// Sensor read functions take no args, return a value to pack into readings
typedef void (*SensorReadFn)(Readings& readings);

// Action functions receive params, execute hardware changes
typedef void (*ActionFn)(Params params);

class Origin {
public:
    // Hardware registration — pins are arrays since sensors and chips often use multiple pins
    void registerSensor(const char* name, int* pins, int pinCount, SensorReadFn readFn);
    void registerChip(const char* name, int* pins, int pinCount);
    void registerAction(const char* name, ActionFn fn);

    void setTransport(Transport* transport);

    // Called in loop() — this runs the entire Origin cycle:
    // 1. Poll all registered sensors → update readings
    // 2. Send readings to host
    // 3. Check for incoming action from host (non-blocking)
    // 4. If new action arrived, switch to it — otherwise keep running current action
    void tick();

private:
    Map<String, ActionFn> actions;
    Map<String, SensorReadFn> sensors;
    Transport* transport;

    String currentAction;       // persists until overridden
    Params currentParams;
    Readings latestReadings;
};
```

#### Usage on Arduino

```cpp
#include "origin.h"

Origin origin;

// --- Sensor read functions (auto-polled every tick) ---

void readDistance(Readings& readings) {
    digitalWrite(trigPin, LOW);
    delayMicroseconds(2);
    digitalWrite(trigPin, HIGH);
    delayMicroseconds(10);
    digitalWrite(trigPin, LOW);
    long duration = pulseIn(echoPin, HIGH);
    readings.distance = duration * 0.034 / 2;
}

// --- Action functions (persist until overridden) ---

void moveFwd(Params params) {
    digitalWrite(leftMotorPin1, LOW);
    digitalWrite(leftMotorPin2, HIGH);
    digitalWrite(rightMotorPin1, HIGH);
    digitalWrite(rightMotorPin2, LOW);
}

void moveBkwd(Params params) {
    digitalWrite(leftMotorPin1, HIGH);
    digitalWrite(leftMotorPin2, LOW);
    digitalWrite(rightMotorPin1, LOW);
    digitalWrite(rightMotorPin2, HIGH);
}

void stop(Params params) {
    digitalWrite(leftMotorPin1, LOW);
    digitalWrite(leftMotorPin2, LOW);
    digitalWrite(rightMotorPin1, LOW);
    digitalWrite(rightMotorPin2, LOW);
}

void setup() {
    // pin setup omitted for brevity

    origin.setTransport(new BluetoothTransport(3, 2, 9600));

    // sensors auto-poll every tick — host always has fresh readings
    int ultrasonicPins[] = {trigPin, echoPin};
    origin.registerSensor("ultrasonic", ultrasonicPins, 2, readDistance);

    origin.registerChip("h_bridge", motorPins, 4);

    // actions persist — moveFwd keeps running until something else overrides it
    origin.registerAction("moveFwd", moveFwd);
    origin.registerAction("moveBkwd", moveBkwd);
    origin.registerAction("stop", stop);
}

void loop() {
    origin.tick();
}
```

The entire firmware loop is a single `tick()` call. Inside, Origin:

1. Polls every registered sensor and packs fresh readings
2. Sends readings to the host
3. Checks (non-blocking) if the host sent a new action
4. If yes — switches to the new action. If no — keeps executing the current one.

The device never freezes waiting for the host. Sensors stay live, motors stay running.

### 2. Communication Layer (Adapters)

Transport is pluggable. The firmware and host each get a matching adapter.

#### Adapters (v1)

| Adapter    | Use Case                        | Notes                                  |
|------------|---------------------------------|----------------------------------------|
| Bluetooth  | Nearby tethered control         | SoftwareSerial on Arduino side         |
| WiFi       | Networked / remote control      | ESP32 or WiFi shield                   |
| USB Serial | Development / debugging         | Fastest feedback loop for iterating    |

#### Transport Interface

```cpp
// transport.h (firmware side)
class Transport {
public:
    virtual void begin() = 0;
    virtual void send(const char* data) = 0;
    virtual String receive() = 0;
    virtual bool available() = 0;
};
```

```ts
// transport.ts (host side)
interface Transport {
    connect(): Promise<void>
    send(data: string): Promise<void>
    receive(): Promise<string>
    disconnect(): Promise<void>
}
```

#### Wire Protocol (v1)

Keep it dead simple. JSON over the wire for v1 — easy to debug, easy to parse on the TS side. Arduino side can use ArduinoJson.

```
Host → Arduino:  {"action": "moveFwd", "params": {"speed": 100}}
Arduino → Host:  {"readings": {"distance": 24, "temperature": 31.5}}
```

Binary protocol can come later if throughput becomes a bottleneck.

### 3. Host Runtime / Launcher (TypeScript)

The launcher is a TypeScript server that:

- Connects to an Arduino via a transport adapter
- Loads and runs installed programs (apps)
- Starts the app's loop and manages its lifecycle (start, stop, swap)
- Continuously relays readings from the device and actions from the app

Think of it like Steam but for Arduino programs. Or like Station but for hardware.

#### Launcher Core

```ts
interface OriginApp {
    name: string
    // called once when the app starts — setup, open resources, etc.
    setup?: (ctx: AppContext) => Promise<void> | void
    // called continuously in a loop by the launcher
    loop: (ctx: AppContext) => Promise<void> | void
    // called when the app is stopped — cleanup
    teardown?: (ctx: AppContext) => Promise<void> | void
}

interface AppContext {
    // latest sensor readings from the device — always fresh
    readings: Record<string, number | string | boolean>
    // send an action to the device (persists until next send)
    send: (action: string, params?: Record<string, number | string | boolean>) => Promise<void>
    // pull the latest readings explicitly (readings prop auto-updates, but this forces a fresh read)
    read: () => Promise<Record<string, number | string | boolean>>
}
```

The launcher calls `app.loop(ctx)` continuously. The app doesn't manage its own `while(true)` — the launcher owns the tick rate and lifecycle. This keeps things clean for swapping apps, pausing, or running multiple apps against different devices.

#### Writing an App

```ts
// apps/obstacle-avoider.ts
import { OriginApp } from "@AOrigin/core"

const app: OriginApp = {
    name: "obstacle-avoider",
    async loop(ctx) {
        const readings = await ctx.read()
        
        if (readings.distance < 10) {
            await ctx.send("moveBkwd")
            await ctx.send("turnRight")
        } else {
            await ctx.send("moveFwd")
        }
    }
}

export default app
```

#### Writing an App with ML

```ts
// apps/gesture-driver.ts
import { OriginApp } from "@AOrigin/core"
import { runModel } from "./ml-utils"

const app: OriginApp = {
    name: "gesture-driver",
    async loop(ctx) {
        const gestures = await getGestureFromCamera()
        const action = await runModel("gesture-to-action", gestures)
        
        await ctx.send(action)
    }
}

export default app
```

This is the hand-gesture car from the original project — but now the control logic is a clean TS module instead of a bespoke Python-to-Bluetooth pipeline.

## State

State is the universal contract between firmware and host, split into two distinct channels:

- **Readings** — sensor data that flows up from the device to the host (distance, temperature, accelerometer values, etc.)
- **Params** — action parameters that flow down from the host to the device (speed, angle, thresholds, etc.)

They travel in the same messages but live in separate fields. This avoids accidental overwrites where an action clobbers a sensor value, and makes the data flow direction explicit.

### V1 Approach

State is not typed per-device — there's no `CarState` vs `ArmState`. Instead, you define state based on what you want to manipulate. A car app might track `speed` and `direction`, an arm app might track `angle` and `grip`. The shape comes from the application, not the hardware class.

```ts
// State is split: readings flow up, params flow down
interface DeviceState {
    readings: Record<string, number | string | boolean>  // sensor data from device
    params: Record<string, number | string | boolean>    // action parameters from host
}
```

```
// Wire format reflects the split
Host → Arduino:  {"action": "moveFwd", "params": {"speed": 100}}
Arduino → Host:  {"readings": {"distance": 24, "temperature": 31.5}}
```

For memory limits — push it as far as the Arduino allows and deal with constraints when they surface. ArduinoJson can handle reasonably large documents on most boards. If it becomes a bottleneck, that's when a binary protocol or state compression moves into scope.

No state versioning for v1. The firmware and host app are tightly coupled by whoever's building the project — they know what they registered and what they're sending.

## V1 Scope

### In

- Firmware SDK with `registerSensor` (auto-polling), `registerChip`, `registerAction` (persistent), and `tick()`
- Bluetooth and USB Serial transport adapters (both sides)
- Host launcher that can load and run a single app loop against a connected device
- JSON wire protocol
- One reference hardware project (the toy car) ported to Origin

### Out (future)

- WiFi adapter
- Multi-device support (one launcher controlling multiple Arduinos)
- App marketplace / sharing
- Binary wire protocol
- State schema validation / typing
- OTA firmware updates
- Dashboard / observability UI (could connect to Station later)
- Model runner integration (keep it as a pattern in app code for now, not a framework primitive)

## Prior Art & Context

Origin comes from real experience building Arduino projects:

1. **Bluetooth toy car** — hand gesture recognition on a laptop, commands sent via Bluetooth to Arduino. One-way communication (host → device). All the interesting logic (MediaPipe hand tracking) ran on the host already — Origin just formalizes this pattern.

2. **Ultrasonic sensor bot** — distance detection on Arduino triggers open/close actions. One-way communication (device → serial). Demonstrates sensor data flowing up from the device.

Origin unifies both directions into a single bidirectional loop and moves all application logic off-device.

## Naming

**Origin** — the starting point. The base layer everything else builds on.

- Firmware SDK: `@AOrigin/firmware` (Arduino library)
- Host Client: `@AOrigin/core` (npm package)
- Launcher: `@AOrigin/launcher` (npm package)
- Transport adapters: `@AOrigin/transport-bluetooth`, `@AOrigin/transport-serial`, etc.