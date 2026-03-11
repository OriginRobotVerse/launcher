# Writing Origin Firmware

This guide covers how to set up the Origin firmware SDK on your Arduino, register hardware, and write sensor and action functions.

---

## Installation

### Option 1: Copy into Arduino libraries

1. Copy the `firmware/` folder to `~/Arduino/libraries/Origin/`
2. Install [ArduinoJson](https://arduinojson.org/) via the Arduino Library Manager (Sketch > Include Library > Manage Libraries > search "ArduinoJson")

### Option 2: Symlink (for development)

```bash
ln -s /path/to/origin/firmware ~/Arduino/libraries/Origin
```

### Verify installation

Create a new sketch, add `#include "origin.h"` at the top, and compile. If it builds, you're good.

---

## Minimal Sketch

The smallest possible Origin sketch:

```cpp
#include "origin.h"
#include "transports/serial_transport.h"

Origin origin;

void setup() {
    origin.setTransport(new SerialTransport(9600));
}

void loop() {
    origin.tick();
}
```

This compiles and runs, but does nothing useful — no sensors registered, no actions available. The Arduino just sends empty readings (`{"readings":{}}`) over Serial.

---

## Registering Sensors

Sensors produce data that flows up to the host. You register them with:

1. A **name** — for identification
2. A **pin array** — which pins the sensor uses
3. A **pin count** — how many pins
4. A **read function** — called every tick to sample the sensor

### Sensor read function

```cpp
void readDistance(Readings& readings) {
    // Do whatever hardware I/O your sensor needs
    digitalWrite(trigPin, LOW);
    delayMicroseconds(2);
    digitalWrite(trigPin, HIGH);
    delayMicroseconds(10);
    digitalWrite(trigPin, LOW);
    long duration = pulseIn(echoPin, HIGH);

    // Store the result in readings
    float distance = duration * 0.034 / 2;
    readings.set("distance", distance);
}
```

**Rules for read functions:**
- Signature must be `void fn(Readings& readings)`
- Call `readings.set("key", value)` to store values — keys are strings, values are floats
- You can set multiple keys in one function (e.g., an IMU that produces x, y, z)
- Keep it fast — this runs every tick. Avoid `delay()` longer than a few milliseconds
- It's safe to use `digitalWrite`, `analogRead`, `pulseIn`, etc. — standard Arduino functions work fine

### Registration

```cpp
int ultrasonicPins[] = {7, 8};  // trig, echo
origin.registerSensor("ultrasonic", ultrasonicPins, 2, readDistance);
```

The pin array is stored by pointer, not copied — make sure it's global or static, not a local variable that goes out of scope.

### Multiple sensors

Register as many as you need:

```cpp
void readDistance(Readings& readings) {
    readings.set("distance", /* ... */);
}

void readTemperature(Readings& readings) {
    readings.set("temperature", analogRead(A0) * 0.48828125);
}

void readLight(Readings& readings) {
    readings.set("light", analogRead(A1));
}

void setup() {
    int distPins[] = {7, 8};
    int tempPins[] = {A0};
    int lightPins[] = {A1};

    origin.registerSensor("ultrasonic", distPins, 2, readDistance);
    origin.registerSensor("thermistor", tempPins, 1, readTemperature);
    origin.registerSensor("photoresistor", lightPins, 1, readLight);
}
```

The host receives all readings merged into one object:
```json
{"readings": {"distance": 24.5, "temperature": 31.2, "light": 680}}
```

### Multi-value sensors

A single sensor can produce multiple readings:

```cpp
void readIMU(Readings& readings) {
    readings.set("accel_x", readAccelX());
    readings.set("accel_y", readAccelY());
    readings.set("accel_z", readAccelZ());
    readings.set("gyro_x", readGyroX());
    readings.set("gyro_y", readGyroY());
    readings.set("gyro_z", readGyroZ());
}

int imuPins[] = {SDA, SCL};
origin.registerSensor("imu", imuPins, 2, readIMU);
```

---

## Registering Chips

Chips are hardware components that are manipulated by actions but don't produce sensor readings. Motor drivers, display controllers, relay modules.

```cpp
int motorPins[] = {2, 3, 4, 5};
origin.registerChip("h_bridge", motorPins, 4);
```

Chip registration is primarily for documentation and introspection. It records which pins are in use and by what. The firmware doesn't call any functions on chips automatically.

---

## Registering Actions

Actions are named functions the host can trigger. They control your hardware.

### Action function

```cpp
void moveFwd(Params params) {
    float speed = params.get("speed", 255);
    analogWrite(leftMotorPin, speed);
    analogWrite(rightMotorPin, speed);
}
```

**Rules for action functions:**
- Signature must be `void fn(Params params)`
- Use `params.get("key", default)` to read parameters sent by the host
- All param values are floats
- Actions are called **every tick** while they're active — write them as "set this state" not "do this once"

### Registration

```cpp
origin.registerAction("moveFwd", moveFwd);
origin.registerAction("moveBkwd", moveBkwd);
origin.registerAction("stop", stop);
```

### Action persistence explained

This is the most important concept in Origin firmware:

```
Host sends: {"action": "moveFwd", "params": {"speed": 200}}

Tick 1: receiveAction() → currentAction = "moveFwd"
        executeCurrentAction() → calls moveFwd({speed: 200})

Tick 2: receiveAction() → no new message
        executeCurrentAction() → calls moveFwd({speed: 200})  ← SAME ACTION

Tick 3: receiveAction() → no new message
        executeCurrentAction() → calls moveFwd({speed: 200})  ← STILL RUNNING
...
Tick N: receiveAction() → host sends {"action": "stop"}
        executeCurrentAction() → calls stop({})               ← NOW CHANGED
```

The action function runs on **every tick** until overridden. This is why actions should set pin states rather than toggle them:

```cpp
// GOOD — idempotent, safe to call every tick
void moveFwd(Params params) {
    digitalWrite(leftMotorPin1, LOW);
    digitalWrite(leftMotorPin2, HIGH);
}

// BAD — toggles on every tick, motor vibrates
void toggleMotor(Params params) {
    static bool on = false;
    on = !on;
    digitalWrite(motorPin, on ? HIGH : LOW);
}
```

### Using params

The host can send parameters with actions:

```ts
// Host sends:
await ctx.send("setSpeed", { left: 200, right: 150 });
```

```cpp
// Firmware receives:
void setSpeed(Params params) {
    float left = params.get("left", 0);
    float right = params.get("right", 0);
    analogWrite(leftMotorPin, left);
    analogWrite(rightMotorPin, right);
}
```

Default values let you handle missing params gracefully:

```cpp
float speed = params.get("speed", 255);  // 255 if not specified
```

---

## Transport Setup

### USB Serial (recommended for development)

```cpp
#include "transports/serial_transport.h"

void setup() {
    origin.setTransport(new SerialTransport(9600));
}
```

The `SerialTransport` uses the Arduino's built-in `Serial` interface. You can use the Arduino Serial Monitor to see raw JSON output (but close it before running the host — only one process can use the port).

Common baud rates: `9600` (default, reliable), `57600`, `115200` (faster, may drop data on some boards).

### Bluetooth

```cpp
#include "transports/bluetooth_transport.h"

void setup() {
    // BluetoothTransport(rxPin, txPin, baudRate)
    origin.setTransport(new BluetoothTransport(10, 11, 9600));
}
```

Uses `SoftwareSerial` under the hood. The RX and TX pins connect to the Bluetooth module's TX and RX pins respectively (they're crossed — Arduino RX connects to module TX).

**Wiring for HC-05/HC-06:**

| Module Pin | Arduino Pin |
|---|---|
| VCC | 5V |
| GND | GND |
| TXD | Pin 10 (Arduino RX) |
| RXD | Pin 11 (Arduino TX) |

**Note:** Some modules need a voltage divider on RXD (3.3V logic). Check your module's datasheet.

---

## Complete Example

Here's a full sketch for a two-wheeled robot with an ultrasonic distance sensor:

```cpp
#include "origin.h"
#include "transports/serial_transport.h"

Origin origin;

// Pin definitions
const int trigPin = 7;
const int echoPin = 8;
const int leftFwd = 2;
const int leftBkwd = 3;
const int rightFwd = 4;
const int rightBkwd = 5;
const int enableLeft = 9;
const int enableRight = 10;

// Pin arrays (must be global — stored by pointer)
int ultrasonicPins[] = {trigPin, echoPin};
int motorPins[] = {leftFwd, leftBkwd, rightFwd, rightBkwd, enableLeft, enableRight};

// --- Sensor ---

void readDistance(Readings& readings) {
    digitalWrite(trigPin, LOW);
    delayMicroseconds(2);
    digitalWrite(trigPin, HIGH);
    delayMicroseconds(10);
    digitalWrite(trigPin, LOW);
    long duration = pulseIn(echoPin, HIGH, 30000);  // 30ms timeout
    float distance = (duration == 0) ? 999 : duration * 0.034 / 2;
    readings.set("distance", distance);
}

// --- Actions ---

void moveFwd(Params params) {
    float speed = params.get("speed", 255);
    analogWrite(enableLeft, speed);
    analogWrite(enableRight, speed);
    digitalWrite(leftFwd, HIGH);
    digitalWrite(leftBkwd, LOW);
    digitalWrite(rightFwd, HIGH);
    digitalWrite(rightBkwd, LOW);
}

void moveBkwd(Params params) {
    float speed = params.get("speed", 200);
    analogWrite(enableLeft, speed);
    analogWrite(enableRight, speed);
    digitalWrite(leftFwd, LOW);
    digitalWrite(leftBkwd, HIGH);
    digitalWrite(rightFwd, LOW);
    digitalWrite(rightBkwd, HIGH);
}

void turnLeft(Params params) {
    float speed = params.get("speed", 200);
    analogWrite(enableLeft, speed);
    analogWrite(enableRight, speed);
    digitalWrite(leftFwd, LOW);
    digitalWrite(leftBkwd, HIGH);
    digitalWrite(rightFwd, HIGH);
    digitalWrite(rightBkwd, LOW);
}

void turnRight(Params params) {
    float speed = params.get("speed", 200);
    analogWrite(enableLeft, speed);
    analogWrite(enableRight, speed);
    digitalWrite(leftFwd, HIGH);
    digitalWrite(leftBkwd, LOW);
    digitalWrite(rightFwd, LOW);
    digitalWrite(rightBkwd, HIGH);
}

void stop(Params params) {
    analogWrite(enableLeft, 0);
    analogWrite(enableRight, 0);
    digitalWrite(leftFwd, LOW);
    digitalWrite(leftBkwd, LOW);
    digitalWrite(rightFwd, LOW);
    digitalWrite(rightBkwd, LOW);
}

// --- Setup ---

void setup() {
    // Configure pins
    pinMode(trigPin, OUTPUT);
    pinMode(echoPin, INPUT);
    pinMode(leftFwd, OUTPUT);
    pinMode(leftBkwd, OUTPUT);
    pinMode(rightFwd, OUTPUT);
    pinMode(rightBkwd, OUTPUT);
    pinMode(enableLeft, OUTPUT);
    pinMode(enableRight, OUTPUT);

    // Transport
    origin.setTransport(new SerialTransport(9600));

    // Register hardware
    origin.registerSensor("ultrasonic", ultrasonicPins, 2, readDistance);
    origin.registerChip("motor_driver", motorPins, 6);

    // Register actions
    origin.registerAction("moveFwd", moveFwd);
    origin.registerAction("moveBkwd", moveBkwd);
    origin.registerAction("turnLeft", turnLeft);
    origin.registerAction("turnRight", turnRight);
    origin.registerAction("stop", stop);
}

void loop() {
    origin.tick();
}
```

Flash this, then control it from TypeScript. The firmware never needs to change unless you add new hardware.

---

## Tips

### Keep read functions fast

`pulseIn()` can block for up to 1 second if the sensor doesn't respond. Always use a timeout:

```cpp
long duration = pulseIn(echoPin, HIGH, 30000);  // 30ms timeout
if (duration == 0) {
    readings.set("distance", 999);  // no reading
    return;
}
```

### Always register a "stop" action

If communication drops, the last action keeps running. Always register a `stop` action so the host can explicitly halt hardware before disconnecting.

### Use `params.get()` with defaults

Never assume a param exists. Always provide a sensible default:

```cpp
float speed = params.get("speed", 255);  // If host forgets to send speed
```

### Pin arrays must be global

The `registerSensor` and `registerChip` functions store a **pointer** to your pin array. If it's a local variable, it'll be garbage after `setup()` returns:

```cpp
// GOOD — global array
int pins[] = {7, 8};

void setup() {
    origin.registerSensor("sensor", pins, 2, readFn);
}

// BAD — local array, dangling pointer
void setup() {
    int pins[] = {7, 8};  // Lives on the stack, dies after setup()
    origin.registerSensor("sensor", pins, 2, readFn);  // Pointer to garbage!
}
```

### Debug with Serial Monitor

When using `SerialTransport`, open the Arduino Serial Monitor to see raw JSON output:

```
{"readings":{"distance":24.5}}
{"readings":{"distance":24.3}}
{"readings":{"distance":25.1}}
```

You can also type JSON into the Serial Monitor to test actions:

```
{"action":"moveFwd","params":{"speed":200}}
```

Close the Serial Monitor before running the host app — only one process can use the serial port at a time.
