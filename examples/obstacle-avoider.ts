/**
 * Obstacle Avoider — polls device state and navigates around obstacles.
 *
 * Usage:
 *   npx tsx examples/obstacle-avoider.ts [server-url] [device-id]
 *
 * Defaults:
 *   server-url: http://localhost:3000
 *   device-id:  uses first connected device
 */

import { OriginClient } from "../clients/typescript/src/index.js";

const SERVER_URL = process.argv[2] ?? "http://localhost:3000";
const TARGET_DEVICE = process.argv[3] ?? null;

const OBSTACLE_THRESHOLD = 15; // cm
const CLEAR_THRESHOLD = 30; // cm
const POLL_INTERVAL = 200; // ms
const SPEED = 200;

type State = "forward" | "reversing" | "turning";

async function main() {
  const client = new OriginClient({ url: SERVER_URL });

  // Discover device
  const info = await client.getServerInfo();
  console.log(`Connected to ${info.name} v${info.version} (${info.deviceCount} device(s))`);

  const devices = await client.listDevices();
  if (devices.length === 0) {
    console.error("No devices connected.");
    process.exit(1);
  }

  const deviceId = TARGET_DEVICE ?? devices[0].id;
  const device = await client.getDevice(deviceId);
  console.log(`Using device: ${device.id} (v${device.version})`);
  console.log(`  Sensors: ${device.manifest.sensors.map((s) => s.name).join(", ")}`);
  console.log(`  Actions: ${device.manifest.actions.join(", ")}`);

  let state: State = "forward";
  let reverseUntil = 0;
  let turnUntil = 0;

  console.log("\nStarting obstacle avoidance loop...\n");

  async function tick() {
    const readings = await client.getDeviceState(deviceId);
    const distance = readings.distance ?? 999;
    const now = Date.now();

    switch (state) {
      case "forward":
        if (distance < OBSTACLE_THRESHOLD) {
          console.log(`Obstacle at ${distance.toFixed(1)} cm — reversing`);
          await client.sendAction(deviceId, "moveBkwd", { speed: SPEED });
          state = "reversing";
          reverseUntil = now + 800;
        } else {
          await client.sendAction(deviceId, "moveFwd", { speed: SPEED });
        }
        break;

      case "reversing":
        if (now > reverseUntil) {
          console.log("Turning right...");
          await client.sendAction(deviceId, "moveRight", { speed: SPEED, angle: 90 });
          state = "turning";
          turnUntil = now + 1000;
        }
        break;

      case "turning":
        if (now > turnUntil) {
          if (distance > CLEAR_THRESHOLD) {
            console.log(`Clear at ${distance.toFixed(1)} cm — moving forward`);
            state = "forward";
          } else {
            console.log("Still blocked — turning more");
            await client.sendAction(deviceId, "moveRight", { speed: SPEED, angle: 45 });
            turnUntil = now + 500;
          }
        }
        break;
    }
  }

  // Polling loop
  const interval = setInterval(tick, POLL_INTERVAL);

  // Graceful shutdown
  process.on("SIGINT", async () => {
    console.log("\nStopping...");
    clearInterval(interval);
    try {
      await client.sendAction(deviceId, "stop");
    } catch {
      // Ignore errors on shutdown
    }
    process.exit(0);
  });
}

main().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
