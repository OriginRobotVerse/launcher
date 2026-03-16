#ifndef ORIGIN_SERIAL_TRANSPORT_H
#define ORIGIN_SERIAL_TRANSPORT_H

#include "../transport.h"

class SerialTransport : public Transport {
public:
    SerialTransport(long baudRate = 9600)
        : baudRate(baudRate), bufLen(0), lineReady(false) {}

    void begin() override {
        Serial.begin(baudRate);
    }

    void send(const char* data) override {
        Serial.println(data);
    }

    String receive() override {
        if (!lineReady) return "";
        lineReady = false;
        String msg = String(buf);
        bufLen = 0;
        return msg;
    }

    bool available() override {
        // Line-buffered accumulation, consistent with BluetoothTransport
        while (Serial.available()) {
            char c = Serial.read();
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
    long baudRate;
    char buf[512];  // Sized for JSON messages
    int bufLen;
    bool lineReady;
};

#endif
