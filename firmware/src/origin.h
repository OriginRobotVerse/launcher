#ifndef ORIGIN_H
#define ORIGIN_H

#include <Arduino.h>
#include <ArduinoJson.h>
#include "transport.h"

#define ORIGIN_MAX_SENSORS  16
#define ORIGIN_MAX_CHIPS    16
#define ORIGIN_MAX_ACTIONS  16
#define ORIGIN_MAX_READINGS 32
#define ORIGIN_MAX_PARAMS   16

// --- Readings: sensor data flowing up to the host ---

struct Readings {
    struct Entry {
        const char* key;
        float value;
    };

    Entry entries[ORIGIN_MAX_READINGS];
    int count = 0;

    void clear() { count = 0; }

    void set(const char* key, float value) {
        // update existing
        for (int i = 0; i < count; i++) {
            if (strcmp(entries[i].key, key) == 0) {
                entries[i].value = value;
                return;
            }
        }
        // add new
        if (count < ORIGIN_MAX_READINGS) {
            entries[count].key = key;
            entries[count].value = value;
            count++;
        }
    }

    float get(const char* key, float defaultVal = 0) const {
        for (int i = 0; i < count; i++) {
            if (strcmp(entries[i].key, key) == 0) {
                return entries[i].value;
            }
        }
        return defaultVal;
    }
};

// --- Params: action parameters flowing down from the host ---

struct Params {
    struct Entry {
        char key[32];
        float value;
    };

    Entry entries[ORIGIN_MAX_PARAMS];
    int count = 0;

    void clear() { count = 0; }

    float get(const char* key, float defaultVal = 0) const {
        for (int i = 0; i < count; i++) {
            if (strcmp(entries[i].key, key) == 0) {
                return entries[i].value;
            }
        }
        return defaultVal;
    }
};

// --- Function types ---

typedef void (*SensorReadFn)(Readings& readings);
typedef void (*ActionFn)(Params params);

// --- Origin core ---

class Origin {
public:
    Origin();

    void registerSensor(const char* name, int* pins, int pinCount, SensorReadFn readFn);
    void registerChip(const char* name, int* pins, int pinCount);
    void registerAction(const char* name, ActionFn fn);
    void setTransport(Transport* transport);

    // Call this in loop() — runs the entire Origin cycle
    void tick();

    // Access current state
    const Readings& getReadings() const { return latestReadings; }
    const char* getCurrentAction() const { return currentAction; }

private:
    // Sensors
    struct SensorEntry {
        const char* name;
        int* pins;
        int pinCount;
        SensorReadFn readFn;
    };
    SensorEntry sensors[ORIGIN_MAX_SENSORS];
    int sensorCount;

    // Chips (registered hardware, no read function)
    struct ChipEntry {
        const char* name;
        int* pins;
        int pinCount;
    };
    ChipEntry chips[ORIGIN_MAX_CHIPS];
    int chipCount;

    // Actions
    struct ActionEntry {
        const char* name;
        ActionFn fn;
    };
    ActionEntry actions[ORIGIN_MAX_ACTIONS];
    int actionCount;

    // Transport
    Transport* transport;

    // State
    char currentAction[64];
    Params currentParams;
    Readings latestReadings;

    // Internal
    void pollSensors();
    void sendReadings();
    void receiveAction();
    void executeCurrentAction();
    ActionFn findAction(const char* name);
};

#endif
