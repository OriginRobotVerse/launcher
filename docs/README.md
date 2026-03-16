# Origin v0.2

**Write Arduino logic in TypeScript or Python. Let the microcontroller do what it is good at -- toggling pins.**

Origin splits Arduino development into three layers:

1. **Firmware SDK** (C++) -- a thin library on the Arduino that registers hardware and executes commands
2. **Server** (TypeScript) -- an HTTP API bridge that manages device connections and exposes state/actions over REST and SSE
3. **Client SDKs** (TypeScript, Python) -- zero-hassle clients that talk to the server

```
Your App (TS/Python)          Origin Server              Arduino

  client.sendAction() ------> POST /devices/:id/actions
                                  |
                               {"type":"action"} -----> firmware receives,
                                                        executes action

                               {"type":"readings"} <--- firmware sends
                                  |                     sensor data
  client.getDeviceState() <-- GET /devices/:id/state
  client.subscribe()   <----- SSE /events
```

---

## Quick Start

### 1. Flash firmware onto your Arduino

```cpp
#include <SoftwareSerial.h>
#include "origin.h"
#include "transports/bluetooth_transport.h"

SoftwareSerial BTserial(10, 11);
Origin origin;

int tempPins[] = {A0};

void readTemp(Readings& readings) {
    readings.set("temperature", analogRead(A0) * 0.48828125);
}

void fanOn(Params params) {
    float speed = params.get("speed", 255);
    analogWrite(9, (int)speed);
}

void fanOff(Params params) {
    analogWrite(9, 0);
}

void setup() {
    origin.setDeviceId("weather-station");
    origin.setTransport(new BluetoothTransport(BTserial, 9600));
    origin.registerSensor("thermistor", tempPins, 1, readTemp);
    origin.registerAction("fanOn", fanOn);
    origin.registerAction("fanOff", fanOff);
    origin.defineState("temperature", ORIGIN_FLOAT);
    origin.handshake();
}

void loop() {
    origin.tick();
}
```

### 2. Start the server

```bash
cd server
npm install
npm run build
node dist/index.js --serial /dev/ttyUSB0
```

### 3. Write an app

**TypeScript:**
```ts
import { OriginClient } from "@aorigin/client";

const client = new OriginClient({ url: "http://localhost:3000" });
const state = await client.getDeviceState("weather-station");

if (state.temperature > 30) {
    await client.sendAction("weather-station", "fanOn", { speed: 200 });
}
```

**Python:**
```python
from origin_client import OriginClient

client = OriginClient("http://localhost:3000")
state = client.get_device_state("weather-station")

if state["temperature"] > 30:
    client.send_action("weather-station", "fanOn", {"speed": 200})
```

---

## Project Structure

```
origin/
  firmware/                     C++ Arduino library
    src/
      origin.h / origin.cpp      Core: Readings, Params, Origin class
      transport.h                 Abstract transport interface
      transports/
        serial_transport.h        USB Serial
        bluetooth_transport.h     HC-05/06 Bluetooth
    examples/
      toy-car/                    Reference project

  server/                       TypeScript HTTP server
    src/
      types.ts                    Wire protocol + API types
      transport.ts                Serial/BT server transports
      device-manager.ts           Device lifecycle + state tracking
      sse.ts                      Server-sent events
      webhooks.ts                 Webhook dispatch with HMAC
      auth.ts                     Optional bearer token auth
      server.ts                   HTTP router
      index.ts                    CLI entry point

  clients/
    typescript/                 Zero-dep TS client
      src/index.ts                OriginClient + SSESubscription
    python/                     Python client (requests + sseclient-py)
      origin_client/
        client.py                 OriginClient
        sse.py                    SSESubscription
        models.py                 Dataclasses

  examples/
    obstacle-avoider.ts           Polling-based navigation
    state-monitor.ts              SSE real-time display
    gesture-controller.py         Simulated ML gestures
    data-logger.py                SSE to CSV
```

---

## HTTP API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Server info (name, version, uptime, device count) |
| GET | `/devices` | List connected devices |
| GET | `/devices/:id` | Full device detail (manifest + state) |
| GET | `/devices/:id/state` | Current state values |
| POST | `/devices/:id/actions` | Send action `{"name": "...", "params": {...}}` |
| GET | `/devices/:id/events` | SSE stream for one device |
| GET | `/events` | SSE stream for all devices |
| POST | `/webhooks` | Register webhook `{"url": "...", "events": [...]}` |
| GET | `/webhooks` | List registered webhooks |
| DELETE | `/webhooks/:id` | Remove a webhook |

### SSE Event Types

- `state.updated` -- device state changed
- `action.sent` -- action was dispatched to a device
- `device.connected` -- device completed handshake
- `device.disconnected` -- device transport closed

---

## Wire Protocol (v0.2)

JSON over newline-delimited text. The server and firmware exchange typed messages:

**Firmware -> Server:**
```json
{"type":"announce","id":"toy-car","version":"0.2","sensors":[...],"chips":[...],"actions":[...],"state":[...]}
{"type":"readings","data":{"distance":24.5,"speed":200}}
```

**Server -> Firmware:**
```json
{"type":"ack"}
{"type":"action","name":"moveFwd","params":{"speed":200}}
```

### Handshake Flow

1. Firmware sends `announce` message with full device manifest
2. Server parses manifest, registers device, sends `ack`
3. Firmware begins normal tick loop (poll sensors, send readings, receive actions)
4. If no ack within 5 seconds, firmware retries announce indefinitely

---

## Guides

- **[Writing Firmware](guides/writing-firmware.md)** -- register sensors, chips, actions, and state
- **[Writing Apps](guides/writing-apps.md)** -- use the TS or Python client to control devices
- **[Custom Transports](guides/custom-transports.md)** -- implement your own transport adapter
- **[Architecture](architecture.md)** -- deep dive into the system design
