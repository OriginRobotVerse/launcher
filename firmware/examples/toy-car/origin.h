#ifndef ORIGIN_H
#define ORIGIN_H

#include <Arduino.h>
#include "transport.h"

// --- Compile-time limits ---

#ifndef ORIGIN_MAX_SENSORS
#define ORIGIN_MAX_SENSORS  4
#endif

#ifndef ORIGIN_MAX_CHIPS
#define ORIGIN_MAX_CHIPS    4
#endif

#ifndef ORIGIN_MAX_ACTIONS
#define ORIGIN_MAX_ACTIONS  8
#endif

#ifndef ORIGIN_MAX_READINGS
#define ORIGIN_MAX_READINGS 8
#endif

#ifndef ORIGIN_MAX_PARAMS
#define ORIGIN_MAX_PARAMS   10
#endif

#ifndef ORIGIN_MAX_STATE_SCHEMA
#define ORIGIN_MAX_STATE_SCHEMA 8
#endif

#ifndef ORIGIN_MAX_PINS
#define ORIGIN_MAX_PINS     8
#endif

// JSON buffer sizes
#define ORIGIN_ANNOUNCE_BUF  1024
#define ORIGIN_READINGS_BUF  512
#define ORIGIN_ACTION_BUF    256

// Protocol version
#define ORIGIN_PROTOCOL_VERSION "0.2"

// --- State types for schema ---

enum OriginStateType {
    ORIGIN_FLOAT,
    ORIGIN_INT,
    ORIGIN_BOOL,
    ORIGIN_STRING
};

// --- Readings: sensor data flowing UP to the host ---

struct Readings {
    struct Entry {
        char key[32];
        float value;
    };

    Entry entries[ORIGIN_MAX_READINGS];
    int count = 0;

    void clear() { count = 0; }

    void set(const char* key, float value) {
        for (int i = 0; i < count; i++) {
            if (strcmp(entries[i].key, key) == 0) {
                entries[i].value = value;
                return;
            }
        }
        if (count < ORIGIN_MAX_READINGS) {
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

// --- Params: action parameters flowing DOWN from the host ---

struct Params {
    struct Entry {
        char key[32];
        float value;
    };

    Entry entries[ORIGIN_MAX_PARAMS];
    int count = 0;

    void clear() { count = 0; }

    void set(const char* key, float value) {
        for (int i = 0; i < count; i++) {
            if (strcmp(entries[i].key, key) == 0) {
                entries[i].value = value;
                return;
            }
        }
        if (count < ORIGIN_MAX_PARAMS) {
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

typedef void (*SensorReadFn)(Readings& readings);
typedef void (*ActionFn)(Params params);

// --- Origin core ---

class Origin {
public:
    Origin();

    // Device identity
    void setDeviceId(const char* id);

    // Hardware registration
    void registerSensor(const char* name, int* pins, int pinCount, SensorReadFn readFn);
    void registerChip(const char* name, int* pins, int pinCount);
    void registerAction(const char* name, ActionFn fn);

    // State schema definition
    void defineState(const char* key, OriginStateType type);

    // Transport
    void setTransport(Transport* transport);

    // Handshake: sends announce, waits for ack, retries indefinitely
    bool handshake();

    // Main loop — call this in loop(). Gated behind handshakeComplete.
    void tick();

    // Access current readings
    const Readings& getReadings() const;

    // Get current action name
    const char* getCurrentAction() const;

private:
    // Announce/ack
    void sendAnnounce();
    bool waitForAck(unsigned long timeoutMs);

    // Tick internals
    void pollSensors();
    void sendReadings();
    bool receiveIncoming();
    void executeCurrentAction();

    // JSON helpers
    void appendJsonString(char* buf, int& pos, int maxLen, const char* str);
    void appendJsonFloat(char* buf, int& pos, int maxLen, float value);
    void appendJsonInt(char* buf, int& pos, int maxLen, int value);

    // Read a complete line from transport
    int readLine(char* buf, int maxLen);

    // Device identity
    const char* deviceId;

    // Sensors
    struct SensorEntry {
        const char* name;
        int* pins;
        int pinCount;
        SensorReadFn readFn;
    };
    SensorEntry sensors[ORIGIN_MAX_SENSORS];
    int sensorCount;

    // Chips
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

    // State schema
    struct StateSchemaEntry {
        const char* key;
        OriginStateType type;
    };
    StateSchemaEntry stateSchema[ORIGIN_MAX_STATE_SCHEMA];
    int stateSchemaCount;

    // Current state
    Readings latestReadings;
    char currentAction[64];
    Params currentParams;

    // Transport
    Transport* transport;

    // Handshake state
    bool handshakeComplete;
};

#endif
