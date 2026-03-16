#include <SoftwareSerial.h>
#include "origin.h"
#include "transports/bluetooth_transport.h"

// SoftwareSerial MUST be declared in the .ino file.
// HC-05 TX → A4 (RX), HC-05 RX → A5 (TX)
SoftwareSerial BTserial(A4, A5);

Origin origin;
State state;

// Motor pins (no timer conflicts)
const int ENA = 11;   // Left speed  (Timer2)
const int IN1 = 8;    // Left fwd
const int IN2 = 4;    // Left bwd
const int ENB = 6;    // Right speed (Timer0)
const int IN3 = 7;    // Right fwd
const int IN4 = 10;   // Right bwd

const int TRIG_PIN = A1;
const int ECHO_PIN = A0;

float readDistanceCm() {
    digitalWrite(TRIG_PIN, LOW);
    delayMicroseconds(2);
    digitalWrite(TRIG_PIN, HIGH);
    delayMicroseconds(10);
    digitalWrite(TRIG_PIN, LOW);

    long duration = pulseIn(ECHO_PIN, HIGH, 25000);
    if (duration == 0) {
        return -1.0f;
    }
    return duration * 0.0343f / 2.0f;
}

void stopMotors() {
    analogWrite(ENA, 0);
    analogWrite(ENB, 0);
    digitalWrite(IN1, LOW);
    digitalWrite(IN2, LOW);
    digitalWrite(IN3, LOW);
    digitalWrite(IN4, LOW);
}

void setMotors(int leftDir, int rightDir, int speed) {
    // Reset direction pins
    digitalWrite(IN1, LOW);
    digitalWrite(IN2, LOW);
    digitalWrite(IN3, LOW);
    digitalWrite(IN4, LOW);

    // Set direction: 1=fwd, -1=bwd, 0=stop
    if (leftDir > 0) digitalWrite(IN1, HIGH);
    else if (leftDir < 0) digitalWrite(IN2, HIGH);

    if (rightDir > 0) digitalWrite(IN3, HIGH);
    else if (rightDir < 0) digitalWrite(IN4, HIGH);

    // Staggered startup to reduce inrush current.
    // Start left at half speed, then right at half, then ramp both up.
    int s = constrain(speed, 0, 255);
    analogWrite(ENA, s / 2);
    delay(50);
    analogWrite(ENB, s / 2);
    delay(50);
    analogWrite(ENA, s);
    delay(30);
    analogWrite(ENB, s);
}

void moveFwd(State& state) {
    int speed = (int)state.get("speed", 200);
    setMotors(1, 1, speed);
    state.set("motion", 1);
    state.set("speed", speed);
    state.set("distance", readDistanceCm());
}

void moveBkwd(State& state) {
    int speed = (int)state.get("speed", 200);
    setMotors(-1, -1, speed);
    state.set("motion", 2);
    state.set("speed", speed);
    state.set("distance", readDistanceCm());
}

void moveRight(State& state) {
    int speed = (int)state.get("speed", 200);
    int angle = (int)state.get("angle", 90);
    setMotors(1, -1, speed);
    delay(angle * 8);
    stopMotors();
    state.set("motion", 0);
    state.set("speed", speed);
    state.set("angle", angle);
    state.set("distance", readDistanceCm());
}

void moveLeft(State& state) {
    int speed = (int)state.get("speed", 200);
    int angle = (int)state.get("angle", 90);
    setMotors(-1, 1, speed);
    delay(angle * 8);
    stopMotors();
    state.set("motion", 0);
    state.set("speed", speed);
    state.set("angle", angle);
    state.set("distance", readDistanceCm());
}

void stop(State& state) {
    stopMotors();
    state.set("motion", 0);
    state.set("speed", 0);
    state.set("distance", readDistanceCm());
}

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
    origin.setTransport(new BluetoothTransport(BTserial, 9600));

    origin.registerSensor("UltrasonicSensor");
    origin.registerChip("H1Bridge");
    origin.registerChip("Accelerator");

    origin.registerAction("moveFwd", moveFwd);
    origin.registerAction("moveBkwd", moveBkwd);
    origin.registerAction("moveRight", moveRight);
    origin.registerAction("moveLeft", moveLeft);
    origin.registerAction("stop", stop);

    state.clear();
    state.set("speed", 200);
    state.set("distance", 0);
    state.set("angle", 90);  // default turn angle in degrees
    state.set("motion", 0);  // 0=stopped, 1=fwd, 2=bkwd, 3=right, 4=left
    stopMotors();
}

void loop() {
    static char buf[64];
    int len = origin.readLine(buf, sizeof(buf));
    if (len <= 0) return;

    Serial.print("BT> ");
    Serial.println(buf);
    delay(50);

    if (strcmp(buf, "state") == 0) {
        state.set("distance", readDistanceCm());
        origin.sendCurrentState(state);
    } else if (strncmp(buf, "set ", 4) == 0) {
        // "set k1 v1 k2 v2 ..." — update one or more state values
        // AVR sscanf doesn't support %f, so parse manually with strtok/atof
        char* p = buf + 4;
        int parsed = 0;
        char* tok = strtok(p, " ");
        while (tok) {
            char* key = tok;
            tok = strtok(NULL, " ");
            if (!tok) break;
            state.set(key, atof(tok));
            parsed++;
            tok = strtok(NULL, " ");
        }
        if (parsed > 0) {
            origin.sendCurrentState(state);
        } else {
            origin.send("ERR: usage set <key> <val> ...\n");
        }
    } else if (origin.runAction(buf, state)) {
        origin.sendCurrentState(state);
    } else {
        origin.send("ERR: unknown action\n");
    }
}
