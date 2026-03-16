/**
 * State Monitor — subscribes to SSE events and logs state changes in real time.
 *
 * Usage:
 *   npx tsx examples/state-monitor.ts [server-url] [device-id]
 *
 * Defaults:
 *   server-url: http://localhost:3000
 *   device-id:  monitors all devices
 */

import { OriginClient } from "../clients/typescript/src/index.js";
import type { SSEEventType, SSEEventData } from "../clients/typescript/src/index.js";

const SERVER_URL = process.argv[2] ?? "http://localhost:3000";
const TARGET_DEVICE = process.argv[3] ?? undefined;

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour12: false, fractionalSecondDigits: 3 });
}

function formatState(state: Record<string, unknown>): string {
  return Object.entries(state)
    .map(([k, v]) => {
      if (typeof v === "number") return `${k}=${v.toFixed(2)}`;
      return `${k}=${v}`;
    })
    .join("  ");
}

async function main() {
  const client = new OriginClient({ url: SERVER_URL });

  const info = await client.getServerInfo();
  console.log(`Connected to ${info.name} v${info.version}`);
  console.log(`Monitoring ${TARGET_DEVICE ?? "all devices"}...\n`);

  // Print initial state
  const devices = await client.listDevices();
  for (const device of devices) {
    if (TARGET_DEVICE && device.id !== TARGET_DEVICE) continue;
    const state = await client.getDeviceState(device.id);
    console.log(`[${device.id}] Initial state: ${formatState(state)}`);
  }
  console.log("---");

  // Subscribe to SSE
  const sub = client.subscribe({
    deviceId: TARGET_DEVICE,
    onEvent(event: SSEEventType, data: SSEEventData) {
      const time = formatTimestamp(data.timestamp);
      const device = data.deviceId;

      switch (event) {
        case "state.updated": {
          const payload = data.data as { state: Record<string, number> };
          console.log(`[${time}] ${device}  state: ${formatState(payload.state)}`);
          break;
        }
        case "action.sent": {
          const payload = data.data as { name: string; params: Record<string, number> };
          const params = Object.keys(payload.params).length > 0
            ? ` ${JSON.stringify(payload.params)}`
            : "";
          console.log(`[${time}] ${device}  action: ${payload.name}${params}`);
          break;
        }
        case "device.connected":
          console.log(`[${time}] ${device}  CONNECTED`);
          break;
        case "device.disconnected":
          console.log(`[${time}] ${device}  DISCONNECTED`);
          break;
      }
    },
    onError(err) {
      console.error("SSE error:", err.message);
    },
    onOpen() {
      console.log("SSE connection established.\n");
    },
  });

  // Graceful shutdown
  process.on("SIGINT", () => {
    console.log("\nClosing...");
    sub.close();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
