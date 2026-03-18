#ifndef ORIGIN_TRANSPORT_H
#define ORIGIN_TRANSPORT_H

#include <Arduino.h>

class Transport {
public:
    virtual ~Transport() {}
    virtual void begin() = 0;
    virtual void send(const char* data) = 0;
    virtual String receive() = 0;
    virtual bool available() = 0;
};

#endif
