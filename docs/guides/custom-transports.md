# Writing Custom Transports

Origin's transport layer is pluggable. If USB Serial and Bluetooth don't fit your setup, you can write your own transport adapter for both the firmware and host sides.

---

## The Contract

Both sides agree on one thing: **newline-delimited JSON strings**. One message per line. Each side implements a simple interface for sending and receiving these lines.

---

## Firmware Side (C++)

Implement the `Transport` abstract class:

```cpp
#include "transport.h"

class Transport {
public:
    virtual ~Transport() {}
    virtual void begin() = 0;
    virtual void send(const char* data) = 0;
    virtual String receive() = 0;
    virtual bool available() = 0;
};
```

### Methods

| Method | Called by | What to do |
|---|---|---|
| `begin()` | `setTransport()` | Initialize your hardware (open connection, set baud rate, etc.) |
| `send(data)` | `sendReadings()` | Send a string as one line. **Add a newline at the end.** |
| `receive()` | `receiveAction()` | Return one complete line (without newline), or `""` if nothing available |
| `available()` | `receiveAction()` | Return `true` if there's at least one complete line waiting |

### Example: WiFi transport (ESP32)

```cpp
#include <WiFi.h>
#include "transport.h"

class WiFiTransport : public Transport {
public:
    WiFiTransport(const char* ssid, const char* password, const char* hostIP, int port)
        : ssid(ssid), password(password), hostIP(hostIP), port(port) {}

    void begin() override {
        WiFi.begin(ssid, password);
        while (WiFi.status() != WL_CONNECTED) {
            delay(500);
        }
        client.connect(hostIP, port);
    }

    void send(const char* data) override {
        if (client.connected()) {
            client.println(data);
        }
    }

    String receive() override {
        if (client.available()) {
            return client.readStringUntil('\n');
        }
        return "";
    }

    bool available() override {
        return client.available() > 0;
    }

private:
    const char* ssid;
    const char* password;
    const char* hostIP;
    int port;
    WiFiClient client;
};
```

Usage:
```cpp
origin.setTransport(new WiFiTransport("MyNetwork", "password", "192.168.1.100", 3000));
```

### Important notes for firmware transports

- `send()` must append a newline. The host reads line-by-line.
- `receive()` must return one complete line. Don't return partial data.
- `available()` must be non-blocking. `receiveAction()` calls this to decide whether to read — if it blocks, the entire tick loop stalls.
- `begin()` is the one place where blocking is OK (e.g., waiting for WiFi connection).

---

## Host Side (TypeScript)

Implement the `Transport` interface from `@aorigin/core`:

```ts
interface Transport {
    connect(): Promise<void>;
    send(data: string): Promise<void>;
    receive(): Promise<string>;
    disconnect(): Promise<void>;
}
```

### Methods

| Method | Called by | What to do |
|---|---|---|
| `connect()` | `launcher.connect()` | Open the connection to the device |
| `send(data)` | `client.send()` | Send a string as one line. **Add a newline.** |
| `receive()` | `client.read()` / `client.poll()` | Return one buffered line, or `""` if nothing available |
| `disconnect()` | `launcher.disconnect()` | Close the connection |

### Example: WiFi transport (TCP socket)

```ts
import { createConnection, Socket } from "net";
import type { Transport } from "@aorigin/core";

export class WiFiTransport implements Transport {
    private socket: Socket | null = null;
    private buffer: string[] = [];
    private partial = "";

    constructor(
        private host: string,
        private port: number,
    ) {}

    connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.socket = createConnection({ host: this.host, port: this.port }, () => {
                resolve();
            });

            this.socket.on("error", reject);

            this.socket.on("data", (chunk: Buffer) => {
                this.partial += chunk.toString();
                const lines = this.partial.split("\n");
                this.partial = lines.pop() ?? "";
                for (const line of lines) {
                    if (line.trim()) {
                        this.buffer.push(line.trim());
                    }
                }
            });
        });
    }

    async send(data: string): Promise<void> {
        if (!this.socket) throw new Error("Not connected");
        return new Promise((resolve, reject) => {
            this.socket!.write(data + "\n", (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    async receive(): Promise<string> {
        return this.buffer.shift() ?? "";
    }

    async disconnect(): Promise<void> {
        return new Promise((resolve) => {
            if (!this.socket) return resolve();
            this.socket.end(() => resolve());
        });
    }
}
```

Usage:
```ts
const transport = new WiFiTransport("192.168.1.50", 3000);
const launcher = new Launcher(transport);
await launcher.connect();
```

### The buffer pattern

Both built-in host transports (Serial and Bluetooth) use the same pattern:

1. When data arrives from the wire, split it by newlines
2. Push complete lines into a `string[]` buffer
3. When `receive()` is called, shift one line off the buffer

This decouples the transport's read timing from the app's read timing. The Arduino sends data much faster than the host consumes it — the buffer absorbs the difference.

```ts
// Incoming data event
socket.on("data", (chunk) => {
    this.buffer.push(chunk.toString().trim());
});

// Called by OriginClient.poll()
async receive(): Promise<string> {
    return this.buffer.shift() ?? "";
}
```

`receive()` should **never block**. Return `""` immediately if there's nothing in the buffer. The `OriginClient.poll()` method calls `receive()` in a loop until it gets `""`, then stops.

---

## Testing Your Transport

### Step 1: Test firmware → host

Flash your Arduino with a basic sketch that sends readings. On the host, write a simple receive loop:

```ts
const transport = new MyTransport(/* ... */);
await transport.connect();

setInterval(async () => {
    const line = await transport.receive();
    if (line) console.log("Received:", line);
}, 100);
```

You should see JSON readings flowing in.

### Step 2: Test host → firmware

Open the Arduino Serial Monitor (or equivalent for your transport) and send from the host:

```ts
await transport.send('{"action":"test","params":{}}');
```

Verify the firmware receives and parses it correctly.

### Step 3: Full integration

Use your transport with the Launcher:

```ts
const transport = new MyTransport(/* ... */);
const launcher = new Launcher(transport);
await launcher.connect();
await launcher.run(myApp);
```

---

## Transport Checklist

Before shipping a custom transport, verify:

- [ ] `send()` appends a newline character
- [ ] `receive()` returns one complete line without the newline
- [ ] `receive()` returns `""` (not null/undefined) when no data is available
- [ ] `receive()` never blocks — returns immediately
- [ ] `available()` (firmware) is non-blocking
- [ ] `begin()` (firmware) initializes hardware before first `send`/`receive`
- [ ] `connect()` (host) resolves only after the connection is actually open
- [ ] `disconnect()` (host) cleans up resources (close sockets, release ports)
- [ ] Both sides handle partial messages (data split across chunks)
