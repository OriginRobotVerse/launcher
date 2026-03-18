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
// --- Motor helpers (matched to working test code) ---
void motorA(int dir, int speed) {
    // Left motor wiring is reversed
    if (dir > 0) {
        digitalWrite(IN1, LOW);
        digitalWrite(IN2, HIGH);
    } else if (dir < 0) {
        digitalWrite(IN1, HIGH);
        digitalWrite(IN2, LOW);
    } else {
        digitalWrite(IN1, LOW);
        digitalWrite(IN2, LOW);
    }
    analogWrite(ENA, dir != 0 ? speed : 0);
}
void motorB(int dir, int speed) {
    // Right motor wiring is reversed
    if (dir > 0) {
        digitalWrite(IN3, LOW);
        digitalWrite(IN4, HIGH);
    } else if (dir < 0) {
        digitalWrite(IN3, HIGH);
        digitalWrite(IN4, LOW);
    } else {
        digitalWrite(IN3, LOW);
        digitalWrite(IN4, LOW);
    }
    analogWrite(ENB, dir != 0 ? speed : 0);
}
void stopMotors() {
    motorA(0, 0);
    motorB(0, 0);
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
    int speed = (int)params.get("speed", 255);
    currentSpeed = speed;
    currentAngle = 0;
    motorA(1, speed);
    motorB(1, speed);
}
void moveRight(Params params) {
    int speed = (int)params.get("speed", 255);
    int angle = (int)params.get("angle", 90);
    currentSpeed = speed;
    currentAngle = angle;
    motorA(0, 0);
    motorB(1, speed);
    delay(angle * 8);
    stopMotors();
    currentSpeed = 0;
}
void moveLeft(Params params) {
    int speed = (int)params.get("speed", 255);
    int angle = (int)params.get("angle", 90);
    currentSpeed = speed;
    currentAngle = -angle;
    motorA(1, speed);
    motorB(0, 0);
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