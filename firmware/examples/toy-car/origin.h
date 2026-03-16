#ifndef ORIGIN_H
#define ORIGIN_H

#include <Arduino.h>
#include "transport.h"

#define ORIGIN_MAX_SENSORS  8
#define ORIGIN_MAX_CHIPS    8
#define ORIGIN_MAX_ACTIONS  16
#define ORIGIN_MAX_STATE    16

// --- State: unified key/value store for action params and sensor data ---

struct State {
    struct Entry {
        char key[32];
        float value;
    };

    Entry entries[ORIGIN_MAX_STATE];
    int count = 0;

    void clear() { count = 0; }

    void set(const char* key, float value) {
        for (int i = 0; i < count; i++) {
            if (strcmp(entries[i].key, key) == 0) {
                entries[i].value = value;
                return;
            }
        }
        if (count < ORIGIN_MAX_STATE) {
            strncpy(entries[count].key, key, 31);
            entries[count].key[31] = '\0';
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

// --- Function types ---

typedef void (*ActionFn)(State& state);

// --- Origin core ---

class Origin {
public:
    Origin();

    void registerSensor(const char* name);
    void registerChip(const char* name);
    void registerAction(const char* name, ActionFn fn);
    void setTransport(Transport* transport);

    // Read a complete line from transport. Returns length, 0 if nothing ready.
    int readLine(char* buf, int maxLen);

    // Run a named action. Returns true if found.
    bool runAction(const char* name, State& state);

    // Send current state as JSON via transport.
    void sendCurrentState(const State& state);

    // Send raw message via transport.
    void send(const char* msg);

private:
    const char* sensors[ORIGIN_MAX_SENSORS];
    int sensorCount;

    const char* chips[ORIGIN_MAX_CHIPS];
    int chipCount;

    struct ActionEntry {
        const char* name;
        ActionFn fn;
    };
    ActionEntry actions[ORIGIN_MAX_ACTIONS];
    int actionCount;

    Transport* transport;
};

#endif
