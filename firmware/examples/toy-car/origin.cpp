#include "origin.h"

Origin::Origin()
    : sensorCount(0)
    , chipCount(0)
    , actionCount(0)
    , transport(nullptr)
{
}

void Origin::registerSensor(const char* name) {
    if (sensorCount < ORIGIN_MAX_SENSORS) {
        sensors[sensorCount++] = name;
    }
}

void Origin::registerChip(const char* name) {
    if (chipCount < ORIGIN_MAX_CHIPS) {
        chips[chipCount++] = name;
    }
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

int Origin::readLine(char* buf, int maxLen) {
    if (!transport || !transport->available()) return 0;
    String msg = transport->receive();
    int len = msg.length();
    if (len == 0) return 0;
    if (len > maxLen - 1) len = maxLen - 1;
    msg.toCharArray(buf, len + 1);
    return len;
}

bool Origin::runAction(const char* name, State& state) {
    for (int i = 0; i < actionCount; i++) {
        if (strcmp(actions[i].name, name) == 0) {
            actions[i].fn(state);
            return true;
        }
    }
    return false;
}

void Origin::sendCurrentState(const State& state) {
    if (!transport) return;

    char buf[256];
    int pos = 0;
    buf[pos++] = '{';

    for (int i = 0; i < state.count; i++) {
        if (i > 0) buf[pos++] = ',';
        buf[pos++] = '"';
        const char* k = state.entries[i].key;
        while (*k && pos < 240) buf[pos++] = *k++;
        buf[pos++] = '"';
        buf[pos++] = ':';
        char tmp[12];
        dtostrf(state.entries[i].value, 1, 1, tmp);
        char* t = tmp;
        while (*t && pos < 250) buf[pos++] = *t++;
    }

    buf[pos++] = '}';
    buf[pos] = '\0';

    transport->send(buf);
}

void Origin::send(const char* msg) {
    if (!transport) return;
    transport->send(msg);
}
