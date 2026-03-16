#ifndef ORIGIN_BLUETOOTH_TRANSPORT_H
#define ORIGIN_BLUETOOTH_TRANSPORT_H

#include <SoftwareSerial.h>
#include "../transport.h"

// SoftwareSerial instance MUST be declared in the .ino file (not here)
// to avoid static init order issues. Pass a reference to this class.

class BluetoothTransport : public Transport {
public:
    BluetoothTransport(SoftwareSerial& btSerial, long baudRate = 9600)
        : serial(btSerial), baudRate(baudRate), bufLen(0), lineReady(false) {}

    void begin() override {
        serial.begin(baudRate);
    }

    void send(const char* data) override {
        // Flush RX buffer before transmitting (half-duplex)
        while (serial.available()) serial.read();
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
    SoftwareSerial& serial;
    long baudRate;
    char buf[128];
    int bufLen;
    bool lineReady;
};

#endif
