# Writing Custom Transports (v0.2)

Origin's transport layer is pluggable. You can write custom transport adapters for both the firmware and server sides.

---

## The Contract

Both sides exchange **newline-delimited JSON strings**. One message per line.

Messages are typed via a `"type"` field:
- Firmware sends: `announce`, `readings`
- Server sends: `ack`, `action`, `discover`

---

## Firmware Side (C++)

Implement the `Transport` abstract class from `transport.h`:

```cpp
#include "transport.h"

class MyTransport : public Transport {
public:
    void begin() override {
        // Initialize hardware
    }

    void send(const char* data) override {
        // Send data as one line, followed by newline
        // For half-duplex: flush RX before TX
    }

    String receive() override {
        // Return one complete line (no newline), or "" if nothing ready
    }

    bool available() override {
        // Return true if a complete line is buffered
        // MUST be non-blocking
    }
};
```

### Requirements

- `send()` must append a newline (`\n`) after the data
- `receive()` must return a complete line without the newline
- `receive()` returns `""` when no data is available (never blocks)
- `available()` must be non-blocking
- `begin()` may block (e.g., waiting for WiFi connection)
- Use line-buffered accumulation for slow transports (9600 baud)

### Line-Buffered Pattern

For transports where data arrives byte-by-byte (serial, Bluetooth), accumulate into a buffer:

```cpp
class MyTransport : public Transport {
    char buf[512];
    int bufLen = 0;
    bool lineReady = false;

    bool available() override {
        while (myHardware.available()) {
            char c = myHardware.read();
            if (c == '\n' || c == '\r') {
                if (bufLen > 0) {
                    buf[bufLen] = '\0';
                    lineReady = true;
                    return true;
                }
            } else if (bufLen < 511) {
                buf[bufLen++] = c;
            }
        }
        return lineReady;
    }

    String receive() override {
        if (!lineReady) return "";
        lineReady = false;
        String msg = String(buf);
        bufLen = 0;
        return msg;
    }
};
```

### Half-Duplex Considerations

The built-in BluetoothTransport uses HardwareSerial (full duplex), so it no longer flushes RX before TX. However, if your custom transport uses SoftwareSerial or other half-duplex hardware, you should still follow this pattern:

1. Read first: check for incoming data before sending
2. Flush RX before TX: discard any stale bytes in the receive buffer
3. The tick loop now runs receiveIncoming first, then sendReadings — incoming messages are always processed before any TX occurs

```cpp
void send(const char* data) override {
    while (myHardware.available()) myHardware.read();  // flush RX (half-duplex only)
    myHardware.println(data);
}
```

### Example: WiFi Transport (ESP32)

```cpp
#include <WiFi.h>
#include "transport.h"

class WiFiTransport : public Transport {
public:
    WiFiTransport(const char* ssid, const char* pw, const char* host, int port)
        : ssid(ssid), pw(pw), host(host), port(port), bufLen(0), lineReady(false) {}

    void begin() override {
        WiFi.begin(ssid, pw);
        while (WiFi.status() != WL_CONNECTED) delay(500);
        client.connect(host, port);
    }

    void send(const char* data) override {
        if (client.connected()) client.println(data);
    }

    String receive() override {
        if (!lineReady) return "";
        lineReady = false;
        String msg = String(buf);
        bufLen = 0;
        return msg;
    }

    bool available() override {
        while (client.available()) {
            char c = client.read();
            if (c == '\n' || c == '\r') {
                if (bufLen > 0) {
                    buf[bufLen] = '\0';
                    lineReady = true;
                    return true;
                }
            } else if (bufLen < 511) {
                buf[bufLen++] = c;
            }
        }
        return lineReady;
    }

private:
    const char* ssid;
    const char* pw;
    const char* host;
    int port;
    WiFiClient client;
    char buf[512];
    int bufLen;
    bool lineReady;
};
```

---

## Server Side (TypeScript)

Implement the `ServerTransport` interface:

```ts
interface ServerTransport {
    open(): Promise<void>;
    close(): Promise<void>;
    write(data: string): void;
    onData(callback: (line: string) => void): void;
    onClose(callback: () => void): void;
}
```

### Requirements

- `open()` must resolve only after the connection is ready
- `write()` sends one line (append newline)
- `onData` callback receives complete lines (without newline)
- `onClose` callback fires when the connection drops
- `close()` cleans up resources

### Example: TCP Socket Transport

```ts
import { createConnection, Socket } from "net";
import type { ServerTransport } from "../server/src/types.js";

export class TCPTransport implements ServerTransport {
    private socket: Socket | null = null;
    private dataCallback: ((line: string) => void) | null = null;
    private closeCallback: (() => void) | null = null;
    private partial = "";

    constructor(private host: string, private port: number) {}

    open(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.socket = createConnection(
                { host: this.host, port: this.port },
                () => resolve(),
            );

            this.socket.on("error", reject);

            this.socket.on("data", (chunk: Buffer) => {
                this.partial += chunk.toString();
                const lines = this.partial.split("\n");
                this.partial = lines.pop() ?? "";
                for (const line of lines) {
                    const trimmed = line.trim();
                    if (trimmed && this.dataCallback) {
                        this.dataCallback(trimmed);
                    }
                }
            });

            this.socket.on("close", () => {
                this.closeCallback?.();
            });
        });
    }

    write(data: string): void {
        this.socket?.write(data + "\n");
    }

    close(): Promise<void> {
        return new Promise((resolve) => {
            if (!this.socket) return resolve();
            this.socket.end(() => resolve());
        });
    }

    onData(callback: (line: string) => void): void {
        this.dataCallback = callback;
    }

    onClose(callback: () => void): void {
        this.closeCallback = callback;
    }
}
```

---

## Testing

### Step 1: Firmware to server

Flash your Arduino with a basic sketch. Start the server with your transport. You should see the announce/ack handshake in the server logs, followed by readings streaming.

### Step 2: Server to firmware

Use curl or a client to send an action:

```bash
curl -X POST http://localhost:5050/devices/my-device/actions \
  -H "Content-Type: application/json" \
  -d '{"name":"stop"}'
```

Verify the firmware receives and executes it.

### Step 3: Full integration

Write an app using the TypeScript or Python client. Verify readings flow up and actions flow down through your custom transport.

---

## Checklist

Before shipping a custom transport:

- [ ] `send()` appends a newline
- [ ] `receive()` returns complete lines without newline
- [ ] `receive()` returns `""` when no data available (never blocks)
- [ ] `available()` is non-blocking
- [ ] `begin()` / `open()` initializes before first send/receive
- [ ] `close()` releases all resources
- [ ] Line-buffered accumulation handles partial data
- [ ] Half-duplex constraints respected (if applicable)
- [ ] Buffer sized for JSON messages (512 bytes minimum)
