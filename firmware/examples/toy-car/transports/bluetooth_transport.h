#ifndef ORIGIN_BLUETOOTH_TRANSPORT_H
#define ORIGIN_BLUETOOTH_TRANSPORT_H

#include <Arduino.h>
#include "../transport.h"

// Uses HardwareSerial (e.g. Serial1 on Arduino Mega).
// HC-05 Bluetooth on Serial1: RX1=pin19, TX1=pin18

class BluetoothTransport : public Transport {
public:
    BluetoothTransport(HardwareSerial& btSerial, long baudRate = 9600)
        : serial(btSerial), baudRate(baudRate), bufLen(0), lineReady(false) {}

    void begin() override {
        serial.begin(baudRate);
    }

    void send(const char* data) override {
        serial.println(data);
    }

    String receive() override {
        if (!lineReady) return "";
        lineReady = false;
        String msg = String(buf);
        bufLen = 0;
        return msg;
    }

    bool available() override {
        // Accumulate characters across loop() iterations.
        // At 9600 baud, chars arrive slowly — a single read() won't get the full message.
        while (serial.available()) {
            char c = serial.read();
            if (c == '\n' || c == '\r') {
                if (bufLen > 0) {
                    buf[bufLen] = '\0';
                    lineReady = true;
                    return true;
                }
            } else if (bufLen < (int)(sizeof(buf) - 1)) {
                buf[bufLen++] = c;
            }
        }
        return lineReady;
    }

private:
    HardwareSerial& serial;
    long baudRate;
    char buf[512];  // Sized for JSON messages
    int bufLen;
    bool lineReady;
};

#endif
