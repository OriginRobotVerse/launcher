# Origin

**Write Arduino logic in TypeScript. Let the microcontroller do what it's good at — toggling pins.**

Origin splits Arduino development into two parts:

1. **Firmware SDK** (C++) — a thin library on the Arduino that registers hardware and executes commands
2. **Host Runtime** (TypeScript) — a server on your laptop/Raspberry Pi that runs your actual application logic

You write your programs in TypeScript. The Arduino becomes a dumb executor.

```
┌─────────────────────┐           ┌─────────────────────┐
│  Your laptop         │  serial   │  Arduino             │
│                      │  or BT    │                      │
│  TypeScript app      ├──────────►│  Origin firmware     │
│  "if distance < 10,  │◄──────────┤  polls sensors,      │
│   go backward"       │           │  runs actions         │
└─────────────────────┘           └─────────────────────┘
```

---

## Table of Contents

- [Quick Start](#quick-start)
- [How It Works](#how-it-works)
- [Project Structure](#project-structure)
- [Firmware SDK (C++)](#firmware-sdk-c)
- [Host Runtime (TypeScript)](#host-runtime-typescript)
- [Transport Layer](#transport-layer)
- [Wire Protocol](#wire-protocol)
- [Writing Your First App](#writing-your-first-app)
- [Full Walkthrough: Building a Robot Car](#full-walkthrough-building-a-robot-car)
- [API Reference](#api-reference)
- [Troubleshooting](#troubleshooting)

---

## Quick Start

### 1. Flash the firmware onto your Arduino

Copy the `firmware/` folder into your Arduino libraries directory and upload a sketch:

```cpp
#include "origin.h"
#include "transports/serial_transport.h"

Origin origin;

void readTemperature(Readings& readings) {
    readings.set("temperature", analogRead(A0) * 0.48828125);
}

void setup() {
    int tempPins[] = {A0};
    origin.setTransport(new SerialTransport(9600));
    origin.registerSensor("thermometer", tempPins, 1, readTemperature);
}

void loop() {
    origin.tick();
}
```

### 2. Install the host packages

```bash
cd host
npm install
npm run build --workspaces
```

### 3. Write an app in TypeScript

```ts
// apps/my-app.ts
import type { OriginApp } from "@aorigin/core";

const app: OriginApp = {
    name: "temperature-logger",
    async loop(ctx) {
        const readings = await ctx.read();
        console.log(`Temperature: ${readings.temperature}°C`);
    },
};

export default app;
```

### 4. Run it

```bash
npx tsx apps/run.ts --port /dev/ttyUSB0 --app my-app
```

That's it. Your TypeScript code reads live sensor data from the Arduino.

---

## How It Works

Origin borrows the game engine pattern: the Arduino is the "renderer" (it talks to hardware), and your TypeScript code is the "game logic" (it makes decisions).

Every cycle works like this:

```
Arduino                              Host
───────                              ────
1. Poll all sensors
2. Pack readings into JSON
3. Send readings over transport  ──►  Launcher receives readings
                                      App's loop() runs with fresh data
4. Check for incoming action     ◄──  App sends action
5. Execute action (or keep
   running the current one)
```

**Key behaviors:**

- **Sensors auto-poll.** Every `tick()`, the firmware calls every registered sensor function and packs the results. The host always has fresh data without requesting it.
- **Actions persist.** When the host sends `moveFwd`, the Arduino keeps executing `moveFwd` on every tick until a different action arrives. No need to spam the same command.
- **Non-blocking receive.** The firmware checks for new actions but never blocks waiting. If nothing arrived, it keeps doing what it was doing.

---

## Project Structure

```
origin/
├── firmware/                        # C++ Arduino library
│   ├── library.properties           # Arduino library metadata
│   ├── src/
│   │   ├── origin.h                 # Core: Readings, Params, Origin class
│   │   ├── origin.cpp               # Implementation of the tick loop
│   │   ├── transport.h              # Abstract transport interface
│   │   └── transports/
│   │       ├── serial_transport.h   # USB Serial transport
│   │       └── bluetooth_transport.h # Bluetooth (SoftwareSerial)
│   └── examples/
│       └── toy-car/
│           └── toy-car.ino          # Reference: car with ultrasonic sensor
│
├── host/                            # TypeScript monorepo
│   ├── package.json                 # npm workspaces root
│   ├── tsconfig.base.json           # Shared TS config
│   ├── packages/
│   │   ├── core/                    # @aorigin/core
│   │   │   └── src/
│   │   │       ├── index.ts         # Public exports
│   │   │       ├── transport.ts     # Transport interface
│   │   │       ├── app.ts           # OriginApp + AppContext interfaces
│   │   │       ├── client.ts        # OriginClient (send/receive)
│   │   │       └── state.ts         # ReadingValue, DeviceState types
│   │   ├── launcher/                # @aorigin/launcher
│   │   │   └── src/
│   │   │       ├── index.ts
│   │   │       └── launcher.ts      # App lifecycle manager
│   │   ├── transport-serial/        # @aorigin/transport-serial
│   │   │   └── src/
│   │   │       └── index.ts         # SerialTransport (USB)
│   │   └── transport-bluetooth/     # @aorigin/transport-bluetooth
│   │       └── src/
│   │           └── index.ts         # BluetoothTransport (HC-05/06)
│   └── apps/                        # Your application code
│       ├── obstacle-avoider.ts      # Reference app
│       └── run.ts                   # CLI runner
│
└── docs/                            # You are here
```

---

## Firmware SDK (C++)

The firmware SDK runs on the Arduino. Its job is simple: register your hardware, then call `tick()` in a loop.

### Installation

Copy the `firmware/` folder into your Arduino libraries directory (usually `~/Arduino/libraries/Origin`), or symlink it. The library depends on [ArduinoJson](https://arduinojson.org/) — install it via the Arduino Library Manager.

### Core Concepts

#### The Origin Object

Every sketch creates one `Origin` instance. It's the central coordinator.

```cpp
#include "origin.h"
Origin origin;
```

#### Registering Sensors

Sensors are hardware that produce data. You register them with a name, their pins, and a read function:

```cpp
void readDistance(Readings& readings) {
    // Your sensor-specific code here
    float distance = /* ... */;
    readings.set("distance", distance);
}

void setup() {
    int ultrasonicPins[] = {7, 8};  // trig, echo
    origin.registerSensor("ultrasonic", ultrasonicPins, 2, readDistance);
}
```

The read function is called **automatically on every tick**. You never need to manually poll — the host always gets fresh data.

**Read function signature:**
```cpp
typedef void (*SensorReadFn)(Readings& readings);
```

The function receives a `Readings` reference. Call `readings.set("key", value)` to store your sensor value. You can set multiple keys in one function if your sensor produces multiple values (e.g., an IMU providing x/y/z acceleration).

#### Registering Chips

Chips are hardware components that don't produce readings on their own — motor drivers, display controllers, relay modules. Registering them documents what pins they use:

```cpp
int motorPins[] = {2, 3, 4, 5};
origin.registerChip("h_bridge", motorPins, 4);
```

Chips don't have a read function. They're manipulated by actions.

#### Registering Actions

Actions are named functions the host can trigger. They receive `Params` from the host:

```cpp
void moveFwd(Params params) {
    float speed = params.get("speed", 255);  // default 255
    analogWrite(motorPin, speed);
}

origin.registerAction("moveFwd", moveFwd);
```

**Critical behavior: actions persist.** When the host sends `moveFwd`, the firmware keeps calling `moveFwd(currentParams)` on every tick until a new action arrives. This means motors keep running, LEDs stay on, etc. The host doesn't need to continuously send the same command.

#### Setting the Transport

Before anything works, you need to tell Origin how to communicate:

```cpp
// USB Serial (for development)
origin.setTransport(new SerialTransport(9600));

// Bluetooth (HC-05/HC-06 module on pins 10, 11)
origin.setTransport(new BluetoothTransport(10, 11, 9600));
```

`setTransport()` calls `begin()` on the transport automatically.

#### The Tick Loop

Your `loop()` function should contain a single call:

```cpp
void loop() {
    origin.tick();
}
```

`tick()` does four things in order:

1. **Poll sensors** — calls every registered sensor's read function, updating `latestReadings`
2. **Send readings** — serializes readings to JSON and sends them to the host
3. **Receive action** — non-blocking check for incoming action from the host
4. **Execute action** — runs the current action function (whether new or persisted from last tick)

### Readings and Params

#### Readings (sensor data going UP to host)

```cpp
struct Readings {
    void set(const char* key, float value);  // store a value
    float get(const char* key, float defaultVal = 0) const;  // retrieve a value
    void clear();  // reset all entries
};
```

Keys are string identifiers you choose: `"distance"`, `"temperature"`, `"accel_x"`, etc. Values are floats.

Maximum entries: 32 (configurable via `ORIGIN_MAX_READINGS`).

#### Params (action parameters coming DOWN from host)

```cpp
struct Params {
    float get(const char* key, float defaultVal = 0) const;  // retrieve a value
    void clear();  // reset
};
```

Params are parsed from the JSON the host sends. Key names are limited to 31 characters. Maximum entries: 16 (configurable via `ORIGIN_MAX_PARAMS`).

### Limits

These are compile-time constants you can override before including `origin.h`:

| Constant | Default | What it limits |
|---|---|---|
| `ORIGIN_MAX_SENSORS` | 16 | Registered sensors |
| `ORIGIN_MAX_CHIPS` | 16 | Registered chips |
| `ORIGIN_MAX_ACTIONS` | 16 | Registered actions |
| `ORIGIN_MAX_READINGS` | 32 | Key-value pairs in readings |
| `ORIGIN_MAX_PARAMS` | 16 | Key-value pairs in params |

The JSON buffer for sending readings is 512 bytes. The buffer for receiving actions is 256 bytes. These are `StaticJsonDocument` sizes in ArduinoJson — increase them in `origin.cpp` if you need more.

---

## Host Runtime (TypeScript)

The host runtime runs on a machine connected to the Arduino (your laptop, a Raspberry Pi, etc.). It loads your apps and manages their lifecycle.

### Package Overview

| Package | npm name | Purpose |
|---|---|---|
| Core | `@aorigin/core` | Types, interfaces, `OriginClient` |
| Launcher | `@aorigin/launcher` | App lifecycle manager |
| Serial Transport | `@aorigin/transport-serial` | USB Serial adapter |
| Bluetooth Transport | `@aorigin/transport-bluetooth` | Bluetooth serial adapter |

### Setup

```bash
cd host
npm install
npm run build --workspaces
```

### @aorigin/core

The core package defines the contracts everything else uses.

#### Transport Interface

Every transport adapter implements this:

```ts
interface Transport {
    connect(): Promise<void>;
    send(data: string): Promise<void>;
    receive(): Promise<string>;
    disconnect(): Promise<void>;
}
```

#### OriginApp Interface

Every app you write implements this:

```ts
interface OriginApp {
    name: string;
    setup?(ctx: AppContext): Promise<void> | void;
    loop(ctx: AppContext): Promise<void> | void;
    teardown?(ctx: AppContext): Promise<void> | void;
}
```

- **`name`** — identifier for logging and management
- **`setup()`** — called once when the app starts. Optional. Use it to initialize resources.
- **`loop()`** — called continuously by the launcher. This is where your logic lives.
- **`teardown()`** — called once when the app stops. Optional. Use it to clean up.

You do **not** write your own `while(true)`. The launcher owns the loop.

#### AppContext

The context object passed to your app on every tick:

```ts
interface AppContext {
    readings: Record<string, number | string | boolean>;
    send(action: string, params?: Record<string, number | string | boolean>): Promise<void>;
    read(): Promise<Record<string, number | string | boolean>>;
}
```

- **`readings`** — the latest sensor data from the device, auto-updated each tick before `loop()` is called
- **`send(action, params?)`** — send an action to the device. It persists until you send a different one.
- **`read()`** — force-read the latest readings. Usually unnecessary since `readings` is already fresh, but useful if your loop takes a long time and you want mid-loop updates.

#### OriginClient

The low-level client that talks to the device. You typically don't use this directly — the Launcher wraps it — but it's available for advanced use:

```ts
import { OriginClient } from "@aorigin/core";

const client = new OriginClient(transport);
await client.connect();
await client.send("moveFwd", { speed: 200 });
const readings = await client.poll();
console.log(readings.distance);
await client.disconnect();
```

**Methods:**

| Method | Description |
|---|---|
| `connect()` | Open the transport connection |
| `disconnect()` | Close the transport connection |
| `send(action, params?)` | Send an action command to the device |
| `read()` | Read a single message and update cached readings |
| `poll()` | Drain all available messages and return the latest readings |
| `readings` (getter) | Get cached readings without waiting for new data |

### @aorigin/launcher

The Launcher loads and runs apps. It handles the setup/loop/teardown lifecycle and manages tick timing.

```ts
import { Launcher } from "@aorigin/launcher";
import { SerialTransport } from "@aorigin/transport-serial";

const transport = new SerialTransport({ path: "/dev/ttyUSB0" });
const launcher = new Launcher(transport, { tickInterval: 50 });

await launcher.connect();
await launcher.run(myApp);

// Later...
await launcher.stop();       // stop current app
await launcher.run(otherApp); // swap to a different app
await launcher.disconnect();  // close everything
```

**How the loop works:**

1. The launcher calls `app.setup(ctx)` once
2. It then enters a loop at the configured tick rate (default: 50ms / ~20Hz)
3. Each tick: poll for fresh readings → build an `AppContext` → call `app.loop(ctx)`
4. When stopped, it calls `app.teardown(ctx)` once

**Constructor options:**

| Option | Default | Description |
|---|---|---|
| `tickInterval` | 50 | Milliseconds between loop iterations |

**Methods:**

| Method | Description |
|---|---|
| `connect()` | Open the transport connection |
| `disconnect()` | Stop the app and close the connection |
| `run(app)` | Start an app (stops the current one first if running) |
| `stop()` | Stop the current app, calling its `teardown()` |

---

## Transport Layer

Transports are pluggable adapters that handle the actual bytes-on-wire communication. The firmware and host each have a matching adapter.

### USB Serial

**Best for:** development, debugging, fastest feedback loop.

Firmware side:
```cpp
#include "transports/serial_transport.h"
origin.setTransport(new SerialTransport(9600));
```

Host side:
```ts
import { SerialTransport } from "@aorigin/transport-serial";
const transport = new SerialTransport({ path: "/dev/ttyUSB0", baudRate: 9600 });
```

**Finding your serial port:**
- macOS: `ls /dev/tty.usb*` (usually `/dev/tty.usbmodem*` or `/dev/tty.usbserial*`)
- Linux: `ls /dev/ttyUSB*` or `ls /dev/ttyACM*`
- Windows: Check Device Manager for COM ports (e.g., `COM3`)

### Bluetooth

**Best for:** wireless control, untethered operation.

Requires an HC-05 or HC-06 Bluetooth module connected to the Arduino via two digital pins (RX and TX).

Firmware side:
```cpp
#include "transports/bluetooth_transport.h"
// RX pin 10, TX pin 11, baud rate 9600
origin.setTransport(new BluetoothTransport(10, 11, 9600));
```

Host side:
```ts
import { BluetoothTransport } from "@aorigin/transport-bluetooth";
// The Bluetooth module appears as a serial port once paired
const transport = new BluetoothTransport({ path: "/dev/tty.HC-05", baudRate: 9600 });
```

**Pairing your Bluetooth module:**
1. Power on the Arduino with the HC-05/06 module
2. On your host machine, open Bluetooth settings and pair with "HC-05" (default PIN: `1234` or `0000`)
3. Once paired, a serial port appears (e.g., `/dev/tty.HC-05` on macOS, `/dev/rfcomm0` on Linux)

### Writing a Custom Transport

Both sides implement a simple interface. Here's what you need:

**Firmware (C++):**
```cpp
#include "transport.h"

class MyTransport : public Transport {
public:
    void begin() override { /* initialize your hardware */ }
    void send(const char* data) override { /* send a line of text */ }
    String receive() override { /* return a line, or "" if nothing available */ }
    bool available() override { /* return true if data is waiting */ }
};
```

**Host (TypeScript):**
```ts
import type { Transport } from "@aorigin/core";

class MyTransport implements Transport {
    async connect() { /* open the connection */ }
    async send(data: string) { /* send a line of text */ }
    async receive(): Promise<string> { /* return next line, or "" */ }
    async disconnect() { /* close the connection */ }
}
```

The contract is simple: send and receive newline-delimited strings. Both sides assume one JSON message per line.

---

## Wire Protocol

Origin uses JSON over newline-delimited text. One message per line.

### Host to Arduino (actions)

```json
{"action": "moveFwd", "params": {"speed": 100}}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `action` | string | yes | Name of the registered action to execute |
| `params` | object | no | Key-value pairs passed to the action function |

All param values are numbers on the Arduino side (parsed as `float`).

### Arduino to Host (readings)

```json
{"readings": {"distance": 24, "temperature": 31.5}}
```

| Field | Type | Description |
|---|---|---|
| `readings` | object | Key-value pairs from all registered sensor read functions |

All reading values are floats on the Arduino side.

### Why JSON?

It's easy to debug (you can read it in a serial monitor), easy to parse on both ends (ArduinoJson on firmware, `JSON.parse()` on host), and good enough for v1 throughput. A binary protocol can replace it later if bandwidth becomes a bottleneck.

---

## Writing Your First App

### Step 1: Define the OriginApp

```ts
// apps/blink-reporter.ts
import type { OriginApp } from "@aorigin/core";

const app: OriginApp = {
    name: "blink-reporter",

    setup(ctx) {
        console.log("App started! Waiting for readings...");
    },

    async loop(ctx) {
        const readings = await ctx.read();
        console.log("Sensor readings:", readings);
    },

    teardown(ctx) {
        console.log("App stopped.");
    },
};

export default app;
```

### Step 2: Run it

```bash
npx tsx apps/run.ts --port /dev/ttyUSB0 --app blink-reporter
```

The `run.ts` CLI dynamically imports your app file by name. It connects to the Arduino via Serial, starts the launcher, and runs your app.

### Step 3: Send actions

```ts
const app: OriginApp = {
    name: "toggler",

    async loop(ctx) {
        const readings = await ctx.read();
        const temp = readings.temperature as number;

        if (temp > 30) {
            await ctx.send("fanOn");
        } else {
            await ctx.send("fanOff");
        }
    },
};
```

Remember: `ctx.send("fanOn")` persists. The Arduino keeps running `fanOn` until you send something else. You don't need to send it every loop iteration — but it's harmless if you do.

---

## Full Walkthrough: Building a Robot Car

This walks through the complete reference project included in the repo.

### Hardware

- Arduino Uno
- HC-SR04 ultrasonic distance sensor (trig: pin 7, echo: pin 8)
- L298N H-bridge motor driver (pins 2, 3, 4, 5)
- HC-05 Bluetooth module (RX: pin 10, TX: pin 11)
- Two DC motors
- Battery pack

### Firmware (Arduino side)

See `firmware/examples/toy-car/toy-car.ino` for the full source.

The firmware registers:

**One sensor** — ultrasonic distance, auto-polled every tick:
```cpp
void readDistance(Readings& readings) {
    digitalWrite(trigPin, LOW);
    delayMicroseconds(2);
    digitalWrite(trigPin, HIGH);
    delayMicroseconds(10);
    digitalWrite(trigPin, LOW);
    long duration = pulseIn(echoPin, HIGH);
    readings.set("distance", duration * 0.034 / 2);
}
```

**One chip** — the H-bridge motor driver (4 pins, no read function).

**Five actions** — `moveFwd`, `moveBkwd`, `turnLeft`, `turnRight`, `stop`. Each sets the four motor pins to specific HIGH/LOW combinations.

The entire `loop()` is:
```cpp
void loop() {
    origin.tick();
}
```

### App (Host side)

See `host/apps/obstacle-avoider.ts`:

```ts
import type { OriginApp } from "@aorigin/core";

const app: OriginApp = {
    name: "obstacle-avoider",

    async loop(ctx) {
        const readings = await ctx.read();
        const distance = readings.distance as number;

        if (distance < 10) {
            await ctx.send("moveBkwd");
            await ctx.send("turnRight");
        } else {
            await ctx.send("moveFwd");
        }
    },
};

export default app;
```

**What happens at runtime:**

1. The launcher connects to the Arduino over Bluetooth
2. Each tick (~20Hz), the Arduino sends `{"readings": {"distance": 24.5}}`
3. The launcher feeds fresh readings to the app's `loop()`
4. The app checks: is the distance under 10 cm?
   - Yes: send `moveBkwd`, then `turnRight`
   - No: send `moveFwd`
5. The Arduino receives the action and keeps executing it until the next one arrives

### Running it

```bash
# Pair with the HC-05 Bluetooth module first, then:
npx tsx apps/run.ts --port /dev/tty.HC-05 --app obstacle-avoider
```

To swap the obstacle avoider for a different behavior — say, a hand-gesture controller — you write a new app file and run it instead. The firmware stays the same.

---

## API Reference

### Firmware (C++)

#### `Origin` class

| Method | Signature | Description |
|---|---|---|
| `registerSensor` | `void registerSensor(const char* name, int* pins, int pinCount, SensorReadFn readFn)` | Register a sensor with its pins and auto-poll read function |
| `registerChip` | `void registerChip(const char* name, int* pins, int pinCount)` | Register a hardware chip (motor driver, display, etc.) |
| `registerAction` | `void registerAction(const char* name, ActionFn fn)` | Register a named action the host can trigger |
| `setTransport` | `void setTransport(Transport* transport)` | Set the communication transport (calls `begin()` automatically) |
| `tick` | `void tick()` | Run one full cycle: poll sensors, send readings, receive action, execute action |
| `getReadings` | `const Readings& getReadings() const` | Access current sensor readings |
| `getCurrentAction` | `const char* getCurrentAction() const` | Get the name of the currently executing action |

#### `Readings` struct

| Method | Signature | Description |
|---|---|---|
| `set` | `void set(const char* key, float value)` | Set a reading value (updates existing or adds new) |
| `get` | `float get(const char* key, float defaultVal = 0) const` | Get a reading value by key |
| `clear` | `void clear()` | Remove all entries |

#### `Params` struct

| Method | Signature | Description |
|---|---|---|
| `get` | `float get(const char* key, float defaultVal = 0) const` | Get a parameter value by key |
| `clear` | `void clear()` | Remove all entries |

#### `Transport` abstract class

| Method | Signature | Description |
|---|---|---|
| `begin` | `virtual void begin() = 0` | Initialize the transport hardware |
| `send` | `virtual void send(const char* data) = 0` | Send a string (one line) |
| `receive` | `virtual String receive() = 0` | Receive a string (one line), or `""` if nothing available |
| `available` | `virtual bool available() = 0` | Check if data is waiting to be read |

#### `SerialTransport`

```cpp
SerialTransport(long baudRate = 9600)
```

Uses the Arduino's built-in `Serial` interface. Good for USB debugging.

#### `BluetoothTransport`

```cpp
BluetoothTransport(int rxPin, int txPin, long baudRate = 9600)
```

Uses `SoftwareSerial` for Bluetooth modules (HC-05, HC-06).

### Host (TypeScript)

#### `Transport` interface (`@aorigin/core`)

```ts
interface Transport {
    connect(): Promise<void>;
    send(data: string): Promise<void>;
    receive(): Promise<string>;
    disconnect(): Promise<void>;
}
```

#### `OriginApp` interface (`@aorigin/core`)

```ts
interface OriginApp {
    name: string;
    setup?(ctx: AppContext): Promise<void> | void;
    loop(ctx: AppContext): Promise<void> | void;
    teardown?(ctx: AppContext): Promise<void> | void;
}
```

#### `AppContext` interface (`@aorigin/core`)

```ts
interface AppContext {
    readings: Record<string, number | string | boolean>;
    send(action: string, params?: Record<string, number | string | boolean>): Promise<void>;
    read(): Promise<Record<string, number | string | boolean>>;
}
```

#### `OriginClient` class (`@aorigin/core`)

```ts
class OriginClient {
    constructor(transport: Transport);
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    send(action: string, params?: Record<string, ReadingValue>): Promise<void>;
    read(): Promise<Record<string, ReadingValue>>;
    poll(): Promise<Record<string, ReadingValue>>;
    get readings(): Record<string, ReadingValue>;
}
```

#### `Launcher` class (`@aorigin/launcher`)

```ts
class Launcher {
    constructor(transport: Transport, options?: { tickInterval?: number });
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    run(app: OriginApp): Promise<void>;
    stop(): Promise<void>;
}
```

#### `SerialTransport` class (`@aorigin/transport-serial`)

```ts
class SerialTransport implements Transport {
    constructor(options: { path: string; baudRate?: number });
}
```

#### `BluetoothTransport` class (`@aorigin/transport-bluetooth`)

```ts
class BluetoothTransport implements Transport {
    constructor(options: { path: string; baudRate?: number });
}
```

---

## Troubleshooting

### "Cannot find module '@aorigin/core'"

Build all packages first:
```bash
cd host
npm run build --workspaces
```

Packages must be built in order: `core` first, then the rest. The workspace root `npm run build --workspaces` handles this.

### Serial port permission denied (Linux)

Add your user to the `dialout` group:
```bash
sudo usermod -a -G dialout $USER
# Log out and back in for it to take effect
```

### No data from Arduino

1. Open the Arduino Serial Monitor to verify the firmware is sending JSON
2. Make sure the baud rate matches on both sides (default: 9600)
3. Close the Serial Monitor before running the host — only one process can hold the serial port

### Bluetooth not connecting

1. Make sure the HC-05/06 module is powered and the LED is blinking
2. Pair it in your OS Bluetooth settings first
3. Find the serial port path: `ls /dev/tty.*` (macOS) or `ls /dev/rfcomm*` (Linux)
4. The default pairing PIN for HC-05 is `1234`, for HC-06 it's `0000`

### Actions not executing on Arduino

- Verify the action name in `ctx.send("name")` exactly matches what was registered with `registerAction("name", fn)` — it's case-sensitive
- Check that `setTransport()` is called in `setup()` before any `registerAction()` calls need to work
- Ensure `origin.tick()` is being called in `loop()` — it's the only thing that processes incoming actions

### Readings are stale or missing

- Sensor read functions run every tick. If readings seem stale, the issue is likely transport latency, not polling frequency.
- Use `await ctx.read()` in your app to force a fresh read if `ctx.readings` feels outdated.
- Check that your sensor read function is calling `readings.set("key", value)` — if it doesn't set a value, nothing gets sent.

### ArduinoJson memory issues

The firmware uses `StaticJsonDocument<512>` for outgoing readings and `StaticJsonDocument<256>` for incoming actions. If you have many sensors or large param sets, increase these in `origin.cpp`:

```cpp
// In sendReadings():
StaticJsonDocument<1024> doc;  // was 512

// In receiveAction():
StaticJsonDocument<512> doc;   // was 256
```

Use the [ArduinoJson Assistant](https://arduinojson.org/v6/assistant/) to calculate the right size for your data.
