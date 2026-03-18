#include "origin.h"
#include <stdlib.h>
#include <string.h>

Origin::Origin()
    : deviceId("origin-device")
    , sensorCount(0)
    , chipCount(0)
    , actionCount(0)
    , stateSchemaCount(0)
    , transport(nullptr)
    , handshakeComplete(false)
{
    currentAction[0] = '\0';
}

// --- Device identity ---

void Origin::setDeviceId(const char* id) {
    deviceId = id;
}

// --- Hardware registration ---

void Origin::registerSensor(const char* name, int* pins, int pinCount, SensorReadFn readFn) {
    if (sensorCount >= ORIGIN_MAX_SENSORS) return;
    sensors[sensorCount].name = name;
    sensors[sensorCount].pins = pins;
    sensors[sensorCount].pinCount = pinCount;
    sensors[sensorCount].readFn = readFn;
    sensorCount++;
}

void Origin::registerChip(const char* name, int* pins, int pinCount) {
    if (chipCount >= ORIGIN_MAX_CHIPS) return;
    chips[chipCount].name = name;
    chips[chipCount].pins = pins;
    chips[chipCount].pinCount = pinCount;
    chipCount++;
}

void Origin::registerAction(const char* name, ActionFn fn) {
    if (actionCount >= ORIGIN_MAX_ACTIONS) return;
    actions[actionCount].name = name;
    actions[actionCount].fn = fn;
    actionCount++;
}

// --- State schema ---

void Origin::defineState(const char* key, OriginStateType type) {
    if (stateSchemaCount >= ORIGIN_MAX_STATE_SCHEMA) return;
    stateSchema[stateSchemaCount].key = key;
    stateSchema[stateSchemaCount].type = type;
    stateSchemaCount++;
}

// --- Transport ---

void Origin::setTransport(Transport* t) {
    transport = t;
    if (transport) {
        transport->begin();
        Serial.println("tr");
    }
}

// --- JSON helpers ---

void Origin::appendJsonString(char* buf, int& pos, int maxLen, const char* str) {
    if (pos >= maxLen - 2) return;
    buf[pos++] = '"';
    while (*str && pos < maxLen - 2) {
        if (*str == '"' || *str == '\\') {
            if (pos < maxLen - 3) {
                buf[pos++] = '\\';
                buf[pos++] = *str;
            }
        } else {
            buf[pos++] = *str;
        }
        str++;
    }
    buf[pos++] = '"';
}

void Origin::appendJsonFloat(char* buf, int& pos, int maxLen, float value) {
    if (pos >= maxLen - 12) return;
    char tmp[16];
    dtostrf(value, 1, 2, tmp);
    int len = strlen(tmp);
    int dotPos = -1;
    for (int i = 0; i < len; i++) {
        if (tmp[i] == '.') { dotPos = i; break; }
    }
    if (dotPos >= 0) {
        while (len > dotPos + 2 && tmp[len - 1] == '0') {
            len--;
        }
        tmp[len] = '\0';
    }
    char* t = tmp;
    while (*t && pos < maxLen - 1) buf[pos++] = *t++;
}

void Origin::appendJsonInt(char* buf, int& pos, int maxLen, int value) {
    if (pos >= maxLen - 12) return;
    char tmp[12];
    itoa(value, tmp, 10);
    char* t = tmp;
    while (*t && pos < maxLen - 1) buf[pos++] = *t++;
}

// --- Announce ---

void Origin::sendAnnounce() {
    if (!transport) return;

    Serial.println("sa");

    char buf[ORIGIN_ANNOUNCE_BUF];
    int pos = 0;
    int maxLen = ORIGIN_ANNOUNCE_BUF - 2;

    buf[pos++] = '{';

    appendJsonString(buf, pos, maxLen, "type");
    buf[pos++] = ':';
    appendJsonString(buf, pos, maxLen, "announce");
    buf[pos++] = ',';

    appendJsonString(buf, pos, maxLen, "id");
    buf[pos++] = ':';
    appendJsonString(buf, pos, maxLen, deviceId);
    buf[pos++] = ',';

    appendJsonString(buf, pos, maxLen, "version");
    buf[pos++] = ':';
    appendJsonString(buf, pos, maxLen, ORIGIN_PROTOCOL_VERSION);
    buf[pos++] = ',';

    appendJsonString(buf, pos, maxLen, "sensors");
    buf[pos++] = ':';
    buf[pos++] = '[';
    for (int i = 0; i < sensorCount; i++) {
        if (i > 0) buf[pos++] = ',';
        buf[pos++] = '{';
        appendJsonString(buf, pos, maxLen, "name");
        buf[pos++] = ':';
        appendJsonString(buf, pos, maxLen, sensors[i].name);
        buf[pos++] = ',';
        appendJsonString(buf, pos, maxLen, "pins");
        buf[pos++] = ':';
        buf[pos++] = '[';
        for (int j = 0; j < sensors[i].pinCount; j++) {
            if (j > 0) buf[pos++] = ',';
            appendJsonInt(buf, pos, maxLen, sensors[i].pins[j]);
        }
        buf[pos++] = ']';
        buf[pos++] = '}';
    }
    buf[pos++] = ']';
    buf[pos++] = ',';

    appendJsonString(buf, pos, maxLen, "chips");
    buf[pos++] = ':';
    buf[pos++] = '[';
    for (int i = 0; i < chipCount; i++) {
        if (i > 0) buf[pos++] = ',';
        buf[pos++] = '{';
        appendJsonString(buf, pos, maxLen, "name");
        buf[pos++] = ':';
        appendJsonString(buf, pos, maxLen, chips[i].name);
        buf[pos++] = ',';
        appendJsonString(buf, pos, maxLen, "pins");
        buf[pos++] = ':';
        buf[pos++] = '[';
        for (int j = 0; j < chips[i].pinCount; j++) {
            if (j > 0) buf[pos++] = ',';
            appendJsonInt(buf, pos, maxLen, chips[i].pins[j]);
        }
        buf[pos++] = ']';
        buf[pos++] = '}';
    }
    buf[pos++] = ']';
    buf[pos++] = ',';

    appendJsonString(buf, pos, maxLen, "actions");
    buf[pos++] = ':';
    buf[pos++] = '[';
    for (int i = 0; i < actionCount; i++) {
        if (i > 0) buf[pos++] = ',';
        appendJsonString(buf, pos, maxLen, actions[i].name);
    }
    buf[pos++] = ']';
    buf[pos++] = ',';

    appendJsonString(buf, pos, maxLen, "state");
    buf[pos++] = ':';
    buf[pos++] = '[';
    for (int i = 0; i < stateSchemaCount; i++) {
        if (i > 0) buf[pos++] = ',';
        buf[pos++] = '{';
        appendJsonString(buf, pos, maxLen, "key");
        buf[pos++] = ':';
        appendJsonString(buf, pos, maxLen, stateSchema[i].key);
        buf[pos++] = ',';
        appendJsonString(buf, pos, maxLen, "type");
        buf[pos++] = ':';
        switch (stateSchema[i].type) {
            case ORIGIN_FLOAT:  appendJsonString(buf, pos, maxLen, "float"); break;
            case ORIGIN_INT:    appendJsonString(buf, pos, maxLen, "int"); break;
            case ORIGIN_BOOL:   appendJsonString(buf, pos, maxLen, "bool"); break;
            case ORIGIN_STRING: appendJsonString(buf, pos, maxLen, "string"); break;
        }
        buf[pos++] = '}';
    }
    buf[pos++] = ']';

    buf[pos++] = '}';
    buf[pos] = '\0';

    Serial.print("[origin] announce size: ");
    Serial.println(pos);

    transport->send(buf);
    Serial.println("as");
}

// --- Wait for ack ---

bool Origin::waitForAck(unsigned long timeoutMs) {
    if (!transport) return false;

    Serial.println("wa");
    unsigned long start = millis();
    char buf[ORIGIN_ACTION_BUF];

    while (millis() - start < timeoutMs) {
        int len = readLine(buf, sizeof(buf));
        if (len > 0) {
            Serial.print("[origin] waitForAck rx: ");
            Serial.println(buf);

            if (strstr(buf, "\"type\"") && strstr(buf, "\"ack\"")) {
                Serial.println("[origin] ack received!");
                return true;
            }
            if (strstr(buf, "\"type\"") && strstr(buf, "\"discover\"")) {
                Serial.println("[origin] got discover during ack wait, re-announcing");
                sendAnnounce();
                start = millis();
            }
        }
        delay(10);
    }
    Serial.println("at");
    return false;
}

// --- Handshake ---

bool Origin::handshake() {
    if (!transport) return false;

    Serial.println("dh.");
    char buf[ORIGIN_ACTION_BUF];

    while (true) {
        if (transport->available()) {
            Serial.println("transport has data");
        }

        int len = readLine(buf, sizeof(buf));
        if (len > 0) {
            Serial.print("handshake rx: ");
            Serial.println(buf);

            if (strstr(buf, "\"type\"") && strstr(buf, "\"discover\"")) {
                Serial.println("discover received, sending announce");
                sendAnnounce();
                if (waitForAck(5000)) {
                    handshakeComplete = true;
                    Serial.println("handshake complete!");
                    return true;
                }
                Serial.println("ack not received, waiting for next discover...");
            }
        }
        delay(10);
    }
}

// --- Read line from transport ---

int Origin::readLine(char* buf, int maxLen) {
    if (!transport || !transport->available()) return 0;
    String msg = transport->receive();
    int len = msg.length();
    if (len == 0) return 0;
    if (len > maxLen - 1) len = maxLen - 1;
    msg.toCharArray(buf, len + 1);
    return len;
}

// --- Tick ---

void Origin::tick() {
    if (!handshakeComplete) return;

    receiveIncoming();
    executeCurrentAction();
    pollSensors();
    sendReadings();
}

// --- Poll sensors ---

void Origin::pollSensors() {
    latestReadings.clear();
    for (int i = 0; i < sensorCount; i++) {
        if (sensors[i].readFn) {
            sensors[i].readFn(latestReadings);
        }
    }
}

// --- Send readings as JSON ---

void Origin::sendReadings() {
    if (!transport) return;

    char buf[ORIGIN_READINGS_BUF];
    int pos = 0;
    int maxLen = ORIGIN_READINGS_BUF - 2;

    buf[pos++] = '{';

    appendJsonString(buf, pos, maxLen, "type");
    buf[pos++] = ':';
    appendJsonString(buf, pos, maxLen, "readings");
    buf[pos++] = ',';

    appendJsonString(buf, pos, maxLen, "data");
    buf[pos++] = ':';
    buf[pos++] = '{';

    for (int i = 0; i < latestReadings.count; i++) {
        if (i > 0) buf[pos++] = ',';
        appendJsonString(buf, pos, maxLen, latestReadings.entries[i].key);
        buf[pos++] = ':';
        appendJsonFloat(buf, pos, maxLen, latestReadings.entries[i].value);
    }

    buf[pos++] = '}';
    buf[pos++] = '}';
    buf[pos] = '\0';

    transport->send(buf);
}

// --- Receive incoming ---

// Helper: find the string value for a JSON key like "name":"value"
static const char* findJsonStringValue(const char* json, const char* key, const char** endOut) {
    char pattern[40];
    pattern[0] = '"';
    int pi = 1;
    while (*key && pi < 36) pattern[pi++] = *key++;
    pattern[pi++] = '"';
    pattern[pi] = '\0';

    const char* found = strstr(json, pattern);
    if (!found) return NULL;

    found += pi;
    while (*found && (*found == ' ' || *found == ':' || *found == '\t')) found++;
    if (*found != '"') return NULL;
    found++;

    const char* end = found;
    while (*end && *end != '"') end++;
    if (*end != '"') return NULL;

    if (endOut) *endOut = end;
    return found;
}

bool Origin::receiveIncoming() {
    char buf[ORIGIN_ACTION_BUF];
    int len = readLine(buf, sizeof(buf));
    if (len <= 0) return false;

    Serial.print("rx: ");
    Serial.println(buf);

    const char* typeEnd;
    const char* typeVal = findJsonStringValue(buf, "type", &typeEnd);
    if (!typeVal) {
        Serial.println("ntff");
        return false;
    }

    // Handle discover: respond with announce
    if (strncmp(typeVal, "discover", 8) == 0) {
        Serial.println("dr-sa");
        sendAnnounce();
        return true;
    }

    // Handle action
    if (strncmp(typeVal, "action", 6) != 0) {
        Serial.print("ut");
        // Print just the type value
        char typeStr[32];
        int ti = 0;
        while (typeVal + ti < typeEnd && ti < 31) { typeStr[ti] = typeVal[ti]; ti++; }
        typeStr[ti] = '\0';
        Serial.println(typeStr);
        return false;
    }

    Serial.println("ar");

    // Extract action name
    const char* nameEnd;
    const char* nameVal = findJsonStringValue(buf, "name", &nameEnd);
    if (!nameVal) return false;

    int nameLen = nameEnd - nameVal;
    if (nameLen > 63) nameLen = 63;
    strncpy(currentAction, nameVal, nameLen);
    currentAction[nameLen] = '\0';

    Serial.print("ac");
    Serial.println(currentAction);

    // Extract params
    currentParams.clear();
    const char* paramsKey = strstr(buf, "\"params\"");
    if (paramsKey) {
        const char* brace = strchr(paramsKey, '{');
        if (brace) {
            brace++;
            while (*brace && *brace != '}') {
                while (*brace && (*brace == ' ' || *brace == ',' || *brace == '\t')) brace++;
                if (*brace == '}' || !*brace) break;

                if (*brace != '"') break;
                brace++;

                char paramKey[32];
                int ki = 0;
                while (*brace && *brace != '"' && ki < 31) {
                    paramKey[ki++] = *brace++;
                }
                paramKey[ki] = '\0';
                if (*brace == '"') brace++;

                while (*brace && (*brace == ':' || *brace == ' ')) brace++;

                float val = atof(brace);
                currentParams.set(paramKey, val);

                if (*brace == '-') brace++;
                while (*brace && ((*brace >= '0' && *brace <= '9') || *brace == '.' ||
                       *brace == 'e' || *brace == 'E' || *brace == '+' || *brace == '-')) brace++;
            }
        }
    }

    return true;
}

// --- Execute current action ---

void Origin::executeCurrentAction() {
    if (currentAction[0] == '\0') return;

    for (int i = 0; i < actionCount; i++) {
        if (strcmp(actions[i].name, currentAction) == 0) {
            actions[i].fn(currentParams);
            currentAction[0] = '\0';
            return;
        }
    }
    Serial.print("ua");
    Serial.println(currentAction);
}

// --- Getters ---

const Readings& Origin::getReadings() const {
    return latestReadings;
}

const char* Origin::getCurrentAction() const {
    return currentAction;
}
