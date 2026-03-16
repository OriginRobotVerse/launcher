#include <SoftwareSerial.h>
#include "origin.h"
#include "transports/bluetooth_transport.h"

// SoftwareSerial MUST be declared in the .ino file.
// HC-05 TX -> A4 (RX), HC-05 RX -> A5 (TX)
SoftwareSerial BTserial(A4, A5);

Origin origin;

// Motor pins (no timer conflicts)
const int ENA = 11;   // Left speed  (Timer2)
const int IN1 = 8;    // Left fwd
const int IN2 = 4;    // Left bwd
const int ENB = 6;    // Right speed (Timer0)
const int IN3 = 7;    // Right fwd
const int IN4 = 10;   // Right bwd

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

// --- Action functions ---

void moveFwd(Params params) {
    int speed = (int)params.get("speed", 200);
    setMotors(1, 1, speed);
}

void moveBkwd(Params params) {
    int speed = (int)params.get("speed", 200);
    setMotors(-1, -1, speed);
}

void moveRight(Params params) {
    int speed = (int)params.get("speed", 200);
    int angle = (int)params.get("angle", 90);
    setMotors(1, -1, speed);
    delay(angle * 8);
    stopMotors();
}

void moveLeft(Params params) {
    int speed = (int)params.get("speed", 200);
    int angle = (int)params.get("angle", 90);
    setMotors(-1, 1, speed);
    delay(angle * 8);
    stopMotors();
}

void stop(Params params) {
    stopMotors();
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
    origin.setTransport(new BluetoothTransport(BTserial, 9600));

    // Register hardware with pins
    origin.registerSensor("ultrasonic", ultrasonicPins, 2, readDistance);
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
