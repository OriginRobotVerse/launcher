#include "origin.h"
#include "transports/bluetooth_transport.h"

Origin origin;

// --- Pin definitions ---
const int trigPin = 7;
const int echoPin = 8;

const int leftMotorPin1  = 2;
const int leftMotorPin2  = 3;
const int rightMotorPin1 = 4;
const int rightMotorPin2 = 5;

// Pin arrays for registration
int ultrasonicPins[] = {trigPin, echoPin};
int motorPins[] = {leftMotorPin1, leftMotorPin2, rightMotorPin1, rightMotorPin2};

// --- Sensor read functions (auto-polled every tick) ---

void readDistance(Readings& readings) {
    digitalWrite(trigPin, LOW);
    delayMicroseconds(2);
    digitalWrite(trigPin, HIGH);
    delayMicroseconds(10);
    digitalWrite(trigPin, LOW);
    long duration = pulseIn(echoPin, HIGH);
    float distance = duration * 0.034 / 2;
    readings.set("distance", distance);
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

void turnLeft(Params params) {
    digitalWrite(leftMotorPin1, LOW);
    digitalWrite(leftMotorPin2, LOW);
    digitalWrite(rightMotorPin1, HIGH);
    digitalWrite(rightMotorPin2, LOW);
}

void turnRight(Params params) {
    digitalWrite(leftMotorPin1, LOW);
    digitalWrite(leftMotorPin2, HIGH);
    digitalWrite(rightMotorPin1, LOW);
    digitalWrite(rightMotorPin2, LOW);
}

void stop(Params params) {
    digitalWrite(leftMotorPin1, LOW);
    digitalWrite(leftMotorPin2, LOW);
    digitalWrite(rightMotorPin1, LOW);
    digitalWrite(rightMotorPin2, LOW);
}

void setup() {
    // Motor pins
    pinMode(leftMotorPin1, OUTPUT);
    pinMode(leftMotorPin2, OUTPUT);
    pinMode(rightMotorPin1, OUTPUT);
    pinMode(rightMotorPin2, OUTPUT);

    // Ultrasonic pins
    pinMode(trigPin, OUTPUT);
    pinMode(echoPin, INPUT);

    // Transport: Bluetooth on pins 10 (RX), 11 (TX)
    origin.setTransport(new BluetoothTransport(10, 11, 9600));

    // Register sensors — auto-polled every tick
    origin.registerSensor("ultrasonic", ultrasonicPins, 2, readDistance);

    // Register chip (for documentation / introspection)
    origin.registerChip("h_bridge", motorPins, 4);

    // Register actions — persist until overridden
    origin.registerAction("moveFwd", moveFwd);
    origin.registerAction("moveBkwd", moveBkwd);
    origin.registerAction("turnLeft", turnLeft);
    origin.registerAction("turnRight", turnRight);
    origin.registerAction("stop", stop);
}

void loop() {
    origin.tick();
}
