#ifndef ORIGIN_BLUETOOTH_TRANSPORT_H
#define ORIGIN_BLUETOOTH_TRANSPORT_H

#include <SoftwareSerial.h>
#include "../transport.h"

class BluetoothTransport : public Transport {
public:
    BluetoothTransport(int rxPin, int txPin, long baudRate = 9600)
        : serial(rxPin, txPin), baudRate(baudRate) {}

    void begin() override {
        serial.begin(baudRate);
    }

    void send(const char* data) override {
        serial.println(data);
    }

    String receive() override {
        if (serial.available()) {
            return serial.readStringUntil('\n');
        }
        return "";
    }

    bool available() override {
        return serial.available() > 0;
    }

private:
    SoftwareSerial serial;
    long baudRate;
};

#endif
