# Origin Firmware SDK

Firmware SDK for Arduino that splits hardware control from application logic. Register sensors, chips, and actions on the Arduino, then control everything from a connected host over Bluetooth (or any transport).

## Architecture

```
Host (Python/TS)  ←──BT serial──→  Arduino (Origin SDK)
     sends commands                  runs actions, returns state
```

Origin uses a **request/response** model over a half-duplex Bluetooth link. The host sends a command, the Arduino executes it and replies with the current state as JSON.

### Core Components

| File | Purpose |
|------|---------|
| `origin.h` | `Origin` class and `State` struct |
| `origin.cpp` | Implementation |
| `transport.h` | Abstract `Transport` interface |
| `transports/bluetooth_transport.h` | HC-05 Bluetooth transport via SoftwareSerial |

### State

`State` is a unified key/value store (string keys, float values) shared between the Arduino and the host. Both sides can read and write it.

- Actions read from state (e.g. `speed`, `angle`) and write back results (e.g. `distance`, `motion`)
- The host can update state before calling an action (e.g. `set speed 150` then `moveFwd`)
- Every response includes the full state as JSON

```cpp
State state;
state.set("speed", 200);
float s = state.get("speed", 0);  // 200
```

### Origin API

```cpp
Origin origin;

// Register hardware (names only — for introspection)
origin.registerSensor("UltrasonicSensor");
origin.registerChip("H1Bridge");

// Register actions — functions that take State& and do hardware work
origin.registerAction("moveFwd", moveFwd);

// Set transport (Bluetooth, Serial, etc.)
origin.setTransport(new BluetoothTransport(BTserial, 9600));

// In loop():
int len = origin.readLine(buf, sizeof(buf));  // non-blocking line read
origin.runAction(buf, state);                  // execute by name
origin.sendCurrentState(state);                // send state JSON via transport
origin.send("OK\n");                           // send raw message
```

### Transport Interface

Any transport implements four methods:

```cpp
class Transport {
    virtual void begin() = 0;
    virtual void send(const char* data) = 0;
    virtual String receive() = 0;
    virtual bool available() = 0;
};
```

**BluetoothTransport** handles HC-05 half-duplex correctly:
- Accumulates characters across `loop()` iterations (9600 baud is slow)
- Only returns complete lines (waits for `\n`)
- Flushes RX buffer before every transmit

## Bluetooth Protocol

Plain text over serial, newline-delimited. No JSON needed for commands — just the action name or a built-in command.

### Commands

| Command | Example | Description |
|---------|---------|-------------|
| `<action>` | `moveFwd\n` | Run a registered action |
| `state` | `state\n` | Get current state (refreshes sensor readings) |
| `set <k> <v> [...]` | `set speed 150 angle 45\n` | Update one or more state values |

### Responses

Every successful command returns the full state as JSON:

```
{"speed":200.0,"distance":12.3,"angle":90.0,"motion":1.0}
```

Errors return a plain text message:

```
ERR: unknown action
ERR: usage set <key> <val> ...
```

### State Fields (toy-car example)

| Key | Type | Values |
|-----|------|--------|
| `speed` | float | 0–255 (PWM duty cycle) |
| `distance` | float | cm from ultrasonic sensor, -1 if no echo |
| `angle` | float | degrees for turn actions |
| `motion` | float | 0=stopped, 1=fwd, 2=bkwd, 3=right, 4=left |

## Hardware Setup (HC-05 Bluetooth)

| Connection | Pin |
|------------|-----|
| HC-05 TX → Arduino RX | A4 |
| HC-05 RX → Arduino TX | A5 |
| Baud rate | 9600 |

**Critical:** `SoftwareSerial` must be declared in the `.ino` file, not in a library `.cpp`/`.h` file. The Arduino build system does not guarantee static initialization order across translation units. Declaring it in a library file causes silent failure.

```cpp
// In your .ino file — NOT in a library
SoftwareSerial BTserial(A4, A5);
```

## Example: Toy Car

See `examples/toy-car/` for a complete example with:
- L298N dual H-bridge motor control with staggered startup
- HC-SR04 ultrasonic distance sensor
- 5 actions: `moveFwd`, `moveBkwd`, `moveRight`, `moveLeft`, `stop`
- State tracking for speed, distance, angle, and motion direction

### Pin Map

| Function | Pin | Timer |
|----------|-----|-------|
| ENA (left speed) | 11 | Timer2 |
| IN1 (left fwd) | 8 | — |
| IN2 (left bwd) | 4 | — |
| ENB (right speed) | 6 | Timer0 |
| IN3 (right fwd) | 7 | — |
| IN4 (right bwd) | 10 | Timer1 |
| Ultrasonic TRIG | A1 | — |
| Ultrasonic ECHO | A0 | — |
| BT RX | A4 | — |
| BT TX | A5 | — |

### Quick Start

```python
import serial
import time

bt = serial.Serial('/dev/tty.HC-05', 9600, timeout=1)
time.sleep(2)

bt.write(b'set speed 180\n')
print(bt.readline())  # state JSON

bt.write(b'moveFwd\n')
print(bt.readline())  # {"speed":180.0,"distance":23.4,...,"motion":1.0}

bt.write(b'state\n')
print(bt.readline())  # fresh state with updated distance

bt.write(b'stop\n')
print(bt.readline())  # {"speed":0.0,...,"motion":0.0}
```

## Half-Duplex Constraints

HC-05 over SoftwareSerial is half-duplex. The firmware handles this, but the host must also follow the rules:

1. **Send one command at a time** — wait for the response before sending the next
2. **Line-delimited** — every command must end with `\n`
3. **Filter echoes** — HC-05 may echo back what it receives; ignore lines that match what you sent
4. **macOS quirk** — BT serial only works on the first connection after a system restart; subsequent connections fail silently. Use Windows to rule out OS issues.
