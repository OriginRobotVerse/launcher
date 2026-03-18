#include "origin.h"
#include "transports/bluetooth_transport.h"

Origin origin;

// L298N Motor Driver pins (Arduino Mega)
// Motor A (Left)
const int ENA = 5;
const int IN1 = 2;
const int IN2 = 4;
// Motor B (Right)
const int IN3 = 7;
const int IN4 = 8;
const int ENB = 6;

const int TRIG_PIN = A1;
const int ECHO_PIN = A0;

// Pin arrays (must be global — stored by pointer)
int ultrasonicPins[] = {TRIG_PIN, ECHO_PIN};
int motorPins[] = {ENA, IN1, IN2, ENB, IN3, IN4};

// --- Sensor read function ---

void readDistance(Readings& readings) {
    digitalWrite(TRIG_PIN, LOW);
    delayMicroseconds(2);
    digitalWrite(TRIG_PIN, HIGH);
    delayMicroseconds(10);
    digitalWrite(TRIG_PIN, LOW);

    long duration = pulseIn(ECHO_PIN, HIGH, 25000);
    if (duration == 0) {
        readings.set("distance", -1.0f);
    } else {
        readings.set("distance", duration * 0.0343f / 2.0f);
    }
}

// --- Motor helpers ---

void stopMotors() {
    analogWrite(ENA, 0);
    analogWrite(ENB, 0);
    digitalWrite(IN1, LOW);
    digitalWrite(IN2, LOW);
    digitalWrite(IN3, LOW);
    digitalWrite(IN4, LOW);
}

void setMotors(int leftDir, int rightDir, int speed) {
    digitalWrite(IN1, LOW);
    digitalWrite(IN2, LOW);
    digitalWrite(IN3, LOW);
    digitalWrite(IN4, LOW);

    if (leftDir > 0) digitalWrite(IN1, HIGH);
    else if (leftDir < 0) digitalWrite(IN2, HIGH);

    if (rightDir > 0) digitalWrite(IN3, HIGH);
    else if (rightDir < 0) digitalWrite(IN4, HIGH);

    int s = constrain(speed, 0, 255);
    analogWrite(ENA, s / 2);
    delay(50);
    analogWrite(ENB, s / 2);
    delay(50);
    analogWrite(ENA, s);
    delay(30);
    analogWrite(ENB, s);
}

// --- State tracking ---

int currentSpeed = 0;
int currentAngle = 0;

void readMotorState(Readings& readings) {
    readings.set("speed", (float)currentSpeed);
    readings.set("angle", (float)currentAngle);
}

// --- Action functions ---

void moveFwd(Params params) {
    int speed = (int)params.get("speed", 200);
    currentSpeed = speed;
    currentAngle = 0;
    setMotors(1, 1, speed);
}

void moveBkwd(Params params) {
    int speed = (int)params.get("speed", 200);
    currentSpeed = speed;
    currentAngle = 180;
    setMotors(-1, -1, speed);
}

void moveRight(Params params) {
    int speed = (int)params.get("speed", 200);
    int angle = (int)params.get("angle", 90);
    currentSpeed = speed;
    currentAngle = angle;
    setMotors(1, -1, speed);
    delay(angle * 8);
    stopMotors();
    currentSpeed = 0;
}

void moveLeft(Params params) {
    int speed = (int)params.get("speed", 200);
    int angle = (int)params.get("angle", 90);
    currentSpeed = speed;
    currentAngle = -angle;
    setMotors(-1, 1, speed);
    delay(angle * 8);
    stopMotors();
    currentSpeed = 0;
}

void stop(Params params) {
    stopMotors();
    currentSpeed = 0;
    currentAngle = 0;
}

// --- Setup ---

void setup() {
    pinMode(ENA, OUTPUT);
    pinMode(IN1, OUTPUT);
    pinMode(IN2, OUTPUT);
    pinMode(ENB, OUTPUT);
    pinMode(IN3, OUTPUT);
    pinMode(IN4, OUTPUT);
    pinMode(TRIG_PIN, OUTPUT);
    pinMode(ECHO_PIN, INPUT);

    Serial.begin(9600);

    origin.setDeviceId("toy-car");
    origin.setTransport(new BluetoothTransport(Serial1, 9600));

    // Register hardware with pins
    origin.registerSensor("ultrasonic", ultrasonicPins, 2, readDistance);
    origin.registerSensor("motor-state", nullptr, 0, readMotorState);
    origin.registerChip("h-bridge", motorPins, 6);

    // Register actions
    origin.registerAction("moveFwd", moveFwd);
    origin.registerAction("moveBkwd", moveBkwd);
    origin.registerAction("moveRight", moveRight);
    origin.registerAction("moveLeft", moveLeft);
    origin.registerAction("stop", stop);

    // Define state schema
    origin.defineState("distance", ORIGIN_FLOAT);
    origin.defineState("speed", ORIGIN_INT);
    origin.defineState("angle", ORIGIN_INT);

    stopMotors();

    // Perform handshake — blocks until server sends ack
    Serial.println("Waiting for handshake...");
    origin.handshake();
    Serial.println("Handshake complete!");
}

void loop() {
    origin.tick();
}
