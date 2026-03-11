#ifndef ORIGIN_SERIAL_TRANSPORT_H
#define ORIGIN_SERIAL_TRANSPORT_H

#include "../transport.h"

class SerialTransport : public Transport {
public:
    SerialTransport(long baudRate = 9600)
        : baudRate(baudRate) {}

    void begin() override {
        Serial.begin(baudRate);
    }

    void send(const char* data) override {
        Serial.println(data);
    }

    String receive() override {
        if (Serial.available()) {
            return Serial.readStringUntil('\n');
        }
        return "";
    }

    bool available() override {
        return Serial.available() > 0;
    }

private:
    long baudRate;
};

#endif
