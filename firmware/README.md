# Origin Firmware SDK (v0.2)

C++ library for Arduino that registers hardware, communicates with the Origin server via JSON wire protocol, and executes actions received from client applications.

## Installation

Copy or symlink into your Arduino libraries folder:

```bash
ln -s /path/to/origin/firmware ~/Arduino/libraries/Origin
```

No external dependencies. v0.2 does not use ArduinoJson -- JSON serialization is built in using `dtostrf` (AVR-safe, no `%f` dependency).

## Quick Start

```cpp
#include <SoftwareSerial.h>
#include "origin.h"
#include "transports/bluetooth_transport.h"

SoftwareSerial BTserial(A4, A5);  // Must be in .ino file
Origin origin;

int tempPins[] = {A0};

void readTemp(Readings& readings) {
    readings.set("temperature", analogRead(A0) * 0.48828125);
}

void fanOn(Params params) {
    analogWrite(9, (int)params.get("speed", 255));
}

void fanOff(Params params) {
    analogWrite(9, 0);
}

void setup() {
    origin.setDeviceId("weather-station");
    origin.setTransport(new BluetoothTransport(BTserial, 9600));
    origin.registerSensor("thermistor", tempPins, 1, readTemp);
    origin.registerAction("fanOn", fanOn);
    origin.registerAction("fanOff", fanOff);
    origin.defineState("temperature", ORIGIN_FLOAT);
    origin.handshake();  // Blocks until server sends ack
}

void loop() {
    origin.tick();
}
```

## API

| Method | Description |
|--------|-------------|
| `setDeviceId(id)` | Set the device identifier (used in API routes) |
| `setTransport(transport)` | Set communication transport (calls `begin()`) |
| `registerSensor(name, pins, pinCount, readFn)` | Register a sensor with auto-poll read function |
| `registerChip(name, pins, pinCount)` | Register a hardware chip (motor driver, etc.) |
| `registerAction(name, fn)` | Register a named action the server can trigger |
| `defineState(key, type)` | Define a state schema entry (ORIGIN_FLOAT/INT/BOOL/STRING) |
| `handshake()` | Send announce, wait for ack (blocks, retries indefinitely) |
| `tick()` | Run one cycle: poll sensors, send readings, receive action, execute |

## Wire Protocol (v0.2)

JSON over newline-delimited text:

**Firmware sends:**
- `{"type":"announce","id":"...","version":"0.2","sensors":[...],"chips":[...],"actions":[...],"state":[...]}`
- `{"type":"readings","data":{"distance":24.5}}`

**Firmware receives:**
- `{"type":"ack"}`
- `{"type":"action","name":"moveFwd","params":{"speed":200}}`

## Data Types

- `Readings` -- sensor data flowing up (key-value, string keys, float values)
- `Params` -- action parameters flowing down (key-value, string keys, float values)
- `SensorReadFn` -- `void fn(Readings& readings)`
- `ActionFn` -- `void fn(Params params)`

## Transports

- `SerialTransport(baudRate)` -- USB Serial (development)
- `BluetoothTransport(softwareSerial, baudRate)` -- HC-05/06 via SoftwareSerial

Both use line-buffered accumulation. BluetoothTransport flushes RX before TX (half-duplex).

**SoftwareSerial must be declared in the .ino file** to avoid static initialization order issues.

## Compile-Time Limits

Override before including `origin.h`:

| Constant | Default |
|----------|---------|
| `ORIGIN_MAX_SENSORS` | 8 |
| `ORIGIN_MAX_CHIPS` | 8 |
| `ORIGIN_MAX_ACTIONS` | 16 |
| `ORIGIN_MAX_READINGS` | 16 |
| `ORIGIN_MAX_PARAMS` | 16 |
| `ORIGIN_MAX_STATE_SCHEMA` | 16 |

JSON buffers: announce=1024, readings=512, actions=256 bytes.

## Example

See `examples/toy-car/` for a complete reference with ultrasonic sensor, H-bridge motors, and five actions.

Full documentation: `docs/guides/writing-firmware.md`
