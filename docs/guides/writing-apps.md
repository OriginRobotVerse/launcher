# Writing Origin Apps (v0.2)

Origin apps are programs that control Arduino devices through the Origin server's HTTP API. You can write them in TypeScript or Python.

---

## Setup

### TypeScript Client

```bash
cd clients/typescript
npm install
npm run build
```

```ts
import { OriginClient } from "@aorigin/client";

const client = new OriginClient({ url: "http://localhost:3000" });
```

### Python Client

```bash
cd clients/python
pip install -e .
```

```python
from origin_client import OriginClient

client = OriginClient("http://localhost:3000")
```

If the server has auth enabled:

```ts
const client = new OriginClient({ url: "http://localhost:3000", token: "my-secret" });
```

```python
client = OriginClient("http://localhost:3000", token="my-secret")
```

---

## Core Operations

### Discover Devices

**TypeScript:**
```ts
const devices = await client.listDevices();
for (const d of devices) {
    console.log(`${d.id} — ${d.actions.join(", ")}`);
}

const detail = await client.getDevice("toy-car");
console.log(detail.manifest.sensors);
```

**Python:**
```python
devices = client.list_devices()
for d in devices:
    print(f"{d.id} — {', '.join(d.actions)}")

detail = client.get_device("toy-car")
print(detail.manifest.sensors)
```

### Read State

**TypeScript:**
```ts
const state = await client.getDeviceState("toy-car");
console.log(`Distance: ${state.distance}`);
```

**Python:**
```python
state = client.get_device_state("toy-car")
print(f"Distance: {state['distance']}")
```

### Send Actions

**TypeScript:**
```ts
await client.sendAction("toy-car", "moveFwd", { speed: 200 });
await client.sendAction("toy-car", "stop");
```

**Python:**
```python
client.send_action("toy-car", "moveFwd", {"speed": 200})
client.send_action("toy-car", "stop")
```

Actions persist on the device until a new action is sent. You do not need to repeatedly send the same action.

---

## Patterns

### Polling Loop

The simplest pattern: read state, decide, act, repeat.

**TypeScript:**
```ts
async function run() {
    const deviceId = "toy-car";

    while (true) {
        const state = await client.getDeviceState(deviceId);
        const distance = state.distance ?? 999;

        if (distance < 10) {
            await client.sendAction(deviceId, "moveBkwd", { speed: 200 });
        } else {
            await client.sendAction(deviceId, "moveFwd", { speed: 200 });
        }

        await new Promise(r => setTimeout(r, 200));
    }
}
```

**Python:**
```python
import time

device_id = "toy-car"

while True:
    state = client.get_device_state(device_id)
    distance = state.get("distance", 999)

    if distance < 10:
        client.send_action(device_id, "moveBkwd", {"speed": 200})
    else:
        client.send_action(device_id, "moveFwd", {"speed": 200})

    time.sleep(0.2)
```

### Event-Driven (SSE)

Subscribe to real-time state updates instead of polling.

**TypeScript:**
```ts
const sub = client.subscribe({
    deviceId: "toy-car",
    onEvent(event, data) {
        if (event === "state.updated") {
            const state = (data.data as any).state;
            console.log("State:", state);
        }
    },
    onError(err) {
        console.error("SSE error:", err);
    },
});

// Later: sub.close()
```

**Python:**
```python
def on_event(event_type, data):
    if event_type == "state.updated":
        state = data["data"]["state"]
        print(f"State: {state}")

sub = client.subscribe(device_id="toy-car", on_event=on_event)

# Later: sub.close()
```

### State Machine

```ts
type Mode = "scanning" | "avoiding" | "stopped";
let mode: Mode = "scanning";
let turnUntil = 0;

setInterval(async () => {
    const state = await client.getDeviceState("toy-car");
    const distance = state.distance ?? 999;
    const now = Date.now();

    switch (mode) {
        case "scanning":
            await client.sendAction("toy-car", "moveFwd", { speed: 200 });
            if (distance < 15) mode = "avoiding";
            break;

        case "avoiding":
            await client.sendAction("toy-car", "moveRight", { speed: 150 });
            if (distance > 30) mode = "scanning";
            break;

        case "stopped":
            await client.sendAction("toy-car", "stop");
            break;
    }
}, 200);
```

### Webhooks

Register a webhook to receive events at a URL. Useful for server-to-server integrations.

**TypeScript:**
```ts
const webhook = await client.registerWebhook({
    url: "https://my-server.example/origin-events",
    events: ["state.updated", "device.disconnected"],
    secret: "my-hmac-secret",
});

console.log(`Webhook registered: ${webhook.id}`);
```

The server sends POST requests to your URL with a JSON body. If a secret is configured, the request includes an `X-Origin-Signature` header with an HMAC-SHA256 signature.

---

## Error Handling

Both clients throw typed errors on non-2xx responses.

**TypeScript:**
```ts
import { OriginError } from "@aorigin/client";

try {
    await client.sendAction("toy-car", "nonexistent");
} catch (err) {
    if (err instanceof OriginError) {
        console.error(`Status ${err.status}: ${err.message}`);
        console.error("Body:", err.body);
    }
}
```

**Python:**
```python
from origin_client import OriginError

try:
    client.send_action("toy-car", "nonexistent")
except OriginError as e:
    print(f"Status {e.status}: {e}")
    print(f"Body: {e.body}")
```

---

## Examples

The `examples/` directory contains complete working programs:

| File | Language | Pattern | Description |
|------|----------|---------|-------------|
| `obstacle-avoider.ts` | TypeScript | Polling | Navigate around obstacles |
| `state-monitor.ts` | TypeScript | SSE | Real-time state display |
| `gesture-controller.py` | Python | Polling | Simulated ML gesture control |
| `data-logger.py` | Python | SSE | Log state changes to CSV |

Run them:
```bash
npx tsx examples/obstacle-avoider.ts http://localhost:3000 toy-car
python examples/gesture-controller.py http://localhost:3000 toy-car
```
