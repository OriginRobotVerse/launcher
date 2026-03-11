#include "origin.h"

Origin::Origin()
    : sensorCount(0)
    , chipCount(0)
    , actionCount(0)
    , transport(nullptr)
{
    currentAction[0] = '\0';
    currentParams.clear();
    latestReadings.clear();
}

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

void Origin::setTransport(Transport* t) {
    transport = t;
    if (transport) {
        transport->begin();
    }
}

void Origin::tick() {
    // 1. Poll all registered sensors → update readings
    pollSensors();

    // 2. Send readings to host
    sendReadings();

    // 3. Check for incoming action from host (non-blocking)
    receiveAction();

    // 4. Execute current action (persists until overridden)
    executeCurrentAction();
}

void Origin::pollSensors() {
    for (int i = 0; i < sensorCount; i++) {
        sensors[i].readFn(latestReadings);
    }
}

void Origin::sendReadings() {
    if (!transport) return;

    StaticJsonDocument<512> doc;
    JsonObject readings = doc.createNestedObject("readings");

    for (int i = 0; i < latestReadings.count; i++) {
        readings[latestReadings.entries[i].key] = latestReadings.entries[i].value;
    }

    char buffer[512];
    serializeJson(doc, buffer, sizeof(buffer));
    transport->send(buffer);
}

void Origin::receiveAction() {
    if (!transport || !transport->available()) return;

    String msg = transport->receive();
    if (msg.length() == 0) return;

    StaticJsonDocument<256> doc;
    DeserializationError err = deserializeJson(doc, msg);
    if (err) return;

    const char* action = doc["action"];
    if (!action) return;

    strncpy(currentAction, action, sizeof(currentAction) - 1);
    currentAction[sizeof(currentAction) - 1] = '\0';

    // Parse params
    currentParams.clear();
    JsonObject params = doc["params"];
    if (params) {
        for (JsonPair kv : params) {
            if (currentParams.count >= ORIGIN_MAX_PARAMS) break;
            strncpy(currentParams.entries[currentParams.count].key, kv.key().c_str(), 31);
            currentParams.entries[currentParams.count].key[31] = '\0';
            currentParams.entries[currentParams.count].value = kv.value().as<float>();
            currentParams.count++;
        }
    }
}

void Origin::executeCurrentAction() {
    if (currentAction[0] == '\0') return;

    ActionFn fn = findAction(currentAction);
    if (fn) {
        fn(currentParams);
    }
}

ActionFn Origin::findAction(const char* name) {
    for (int i = 0; i < actionCount; i++) {
        if (strcmp(actions[i].name, name) == 0) {
            return actions[i].fn;
        }
    }
    return nullptr;
}
