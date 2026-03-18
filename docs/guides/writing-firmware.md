# Writing Origin Firmware (v0.2)

This guide covers how to set up the Origin firmware SDK on your Arduino, register hardware, define state schema, and connect to the Origin server.

---

## Installation

Copy the `firmware/` folder into your Arduino libraries directory:

```bash
# Option A: Symlink (recommended for development)
ln -s /path/to/origin/firmware ~/Arduino/libraries/Origin

# Option B: Copy
cp -r firmware/ ~/Arduino/libraries/Origin
```

Verify: create a new sketch, add `#include "origin.h"`, and compile. No external dependencies required -- v0.2 does not use ArduinoJson.

---

## Minimal Sketch

```cpp
#include "origin.h"
#include "transports/serial_transport.h"

Origin origin;

void setup() {
    origin.setDeviceId("my-device");
    origin.setTransport(new SerialTransport(9600));
    origin.handshake();
}

void loop() {
    origin.tick();
}
```

This compiles, runs, and completes the handshake with the server. It sends empty readings and has no actions.

---

## Device Identity

Every device needs an ID. This is how the server and clients refer to it:

```cpp
origin.setDeviceId("toy-car");
```

The ID is included in the announce message and used as the `:id` parameter in all API routes.

---

## Registering Sensors

Sensors produce data that flows up to the server. Register them with a name, pin array, and read function:

```cpp
int ultrasonicPins[] = {7, 8};  // Must be global (stored by pointer)

void readDistance(Readings& readings) {
    digitalWrite(7, LOW);
    delayMicroseconds(2);
    digitalWrite(7, HIGH);
    delayMicroseconds(10);
    digitalWrite(7, LOW);
    long duration = pulseIn(8, HIGH, 30000);
    float distance = (duration == 0) ? -1 : duration * 0.0343 / 2;
    readings.set("distance", distance);
}

void setup() {
    origin.registerSensor("ultrasonic", ultrasonicPins, 2, readDistance);
}
```

Read functions are called every `tick()`. The server always has fresh data.

**Rules:**
- Signature: `void fn(Readings& readings)`
- Call `readings.set("key", value)` to store values (keys are strings, values are floats)
- One function can set multiple keys (e.g., an IMU with x/y/z)
- Keep it fast -- avoid long `delay()` calls
- Pin arrays must be global or static (stored by pointer)

---

## Registering Chips

Chips are hardware components manipulated by actions but without their own read functions:

```cpp
int motorPins[] = {2, 3, 4, 5};
origin.registerChip("h-bridge", motorPins, 4);
```

Chip registration documents pin usage. The announce message includes chip names and pins so the server and clients know what hardware is present.

---

## Registering Actions

Actions are named functions the server can trigger. They receive `Params` from the host:

```cpp
void moveFwd(Params params) {
    float speed = params.get("speed", 255);
    analogWrite(motorPin, (int)speed);
}

origin.registerAction("moveFwd", moveFwd);
```

**Actions execute once and are cleared.** When the server sends `moveFwd`, the firmware calls `moveFwd(currentParams)` a single time and then clears the pending action. The hardware state set by the action (e.g. motor pins driven HIGH) persists until another action changes it, but the action function itself does not re-execute.

**Action function signature:** `void fn(Params params)`

Use `params.get("key", defaultValue)` to read parameters. All values are floats.

---

## Defining State Schema

Tell the server what state keys to expect and their types:

```cpp
origin.defineState("distance", ORIGIN_FLOAT);
origin.defineState("speed", ORIGIN_INT);
origin.defineState("active", ORIGIN_BOOL);
origin.defineState("mode", ORIGIN_STRING);
```

Available types: `ORIGIN_FLOAT`, `ORIGIN_INT`, `ORIGIN_BOOL`, `ORIGIN_STRING`.

The schema is included in the announce message. It is informational -- the firmware always sends floats over the wire. The schema helps clients interpret the values correctly.

---

## Transport Setup

### USB Serial

```cpp
#include "transports/serial_transport.h"

origin.setTransport(new SerialTransport(9600));
```

### Bluetooth (HC-05/HC-06)

```cpp
#include "transports/bluetooth_transport.h"

void setup() {
    // HC-05 on Arduino Mega: Serial1 (RX1=pin19, TX1=pin18)
    origin.setTransport(new BluetoothTransport(Serial1, 9600));
}
```

`BluetoothTransport` takes a `HardwareSerial&` reference (e.g. `Serial1` on Arduino Mega). No need for SoftwareSerial.

---

## The Handshake

Before the tick loop starts, the firmware must complete a handshake:

```cpp
void setup() {
    // ... register everything ...
    origin.handshake();  // blocks until server sends ack
}
```

The server initiates discovery by sending `{"type":"discover"}` to the port. `handshake()` waits for a discover message, then sends an announce message with the full device manifest (ID, version, sensors, chips, actions, state schema). It then waits up to 5 seconds for an `{"type":"ack"}` response. If no ack arrives, it waits for the next discover message and tries again.

The announce message looks like:
```json
{
  "type": "announce",
  "id": "toy-car",
  "version": "0.2",
  "sensors": [{"name": "ultrasonic", "pins": [7, 8]}],
  "chips": [{"name": "h-bridge", "pins": [2, 3, 4, 5]}],
  "actions": ["moveFwd", "moveRight", "moveLeft", "stop"],
  "state": [{"key": "distance", "type": "float"}, {"key": "speed", "type": "int"}]
}
```

---

## The Tick Loop

After handshake, call `tick()` in `loop()`:

```cpp
void loop() {
    origin.tick();
}
```

`tick()` does four things:
1. **receiveIncoming()** -- non-blocking check for incoming messages
2. **executeCurrentAction()** -- calls the action function if one is pending, then clears it
3. **pollSensors()** -- calls each sensor read function, updating `Readings`
4. **sendReadings()** -- serializes to `{"type":"readings","data":{...}}` and sends

If `handshake()` has not completed, `tick()` does nothing.

---

## Compile-Time Limits

Override these before including `origin.h`:

| Constant | Default | Limits |
|----------|---------|--------|
| `ORIGIN_MAX_SENSORS` | 8 | Sensor registrations |
| `ORIGIN_MAX_CHIPS` | 8 | Chip registrations |
| `ORIGIN_MAX_ACTIONS` | 16 | Action registrations |
| `ORIGIN_MAX_READINGS` | 16 | Key-value pairs in Readings |
| `ORIGIN_MAX_PARAMS` | 16 | Key-value pairs in Params |
| `ORIGIN_MAX_STATE_SCHEMA` | 16 | State schema entries |

JSON buffer sizes (not overridable via define, but editable in source):
- Announce: 1024 bytes
- Readings: 512 bytes
- Actions: 256 bytes

---

## Complete Example

See `firmware/examples/toy-car/toy-car.ino` for a full reference project with an ultrasonic sensor, H-bridge motor driver, and four actions (moveFwd, moveLeft, moveRight, stop).

---

## Tips

- **Always register a "stop" action.** If the server disconnects, the last action keeps running.
- **Use `params.get()` with defaults.** Never assume a parameter exists.
- **Pin arrays must be global.** They are stored by pointer, not copied.
- **Keep sensor read functions fast.** Use `pulseIn` timeouts. Avoid long `delay()`.
- **Use dtostrf, not snprintf %f.** AVR does not support `%f` in snprintf/sscanf. The firmware handles this internally, but keep it in mind for custom code.
- **Test with Serial Monitor.** Use SerialTransport during development. You can see raw JSON and type messages manually.
