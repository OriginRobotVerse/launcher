// examples/robot-walker.ts
//
// Walk the simulated Unitree Go2 forward and turn when it drifts.
//
// Usage:
//   npx tsx examples/robot-walker.ts [server-url] [device-id]

import { OriginClient } from "../clients/typescript/src/index.js";

const SERVER_URL = process.argv[2] ?? "http://localhost:3000";
const DEVICE_ID = process.argv[3] ?? "unitree-go2";

async function main() {
  const client = new OriginClient({ url: SERVER_URL });
  const info = await client.getServerInfo();
  console.log(`Connected to ${info.name} v${info.version}`);

  const device = await client.getDevice(DEVICE_ID);
  console.log(`Device: ${device.id} (v${device.version})`);
  console.log(`Actions: ${device.manifest.actions.join(", ")}`);

  // Simple behavior: walk forward, correct yaw drift
  let lastAction = "";
  const YAW_THRESHOLD = 15; // degrees

  const interval = setInterval(async () => {
    const state = await client.getDeviceState(DEVICE_ID);

    const pitch = state.pitch ?? 0;
    const yaw = state.yaw ?? 0;
    const posZ = state.pos_z ?? 0;

    // Fallen over check
    if (Math.abs(pitch) > 60 || posZ < 0.15) {
      if (lastAction !== "stand") {
        console.log(`Fallen (pitch=${pitch.toFixed(1)}°, z=${posZ.toFixed(2)}) — standing`);
        await client.sendAction(DEVICE_ID, "stand");
        lastAction = "stand";
      }
      return;
    }

    // Yaw correction
    if (yaw > YAW_THRESHOLD) {
      if (lastAction !== "turn_left") {
        console.log(`Yaw drift ${yaw.toFixed(1)}° — turning left`);
        await client.sendAction(DEVICE_ID, "turn_left", { speed: 0.3 });
        lastAction = "turn_left";
      }
    } else if (yaw < -YAW_THRESHOLD) {
      if (lastAction !== "turn_right") {
        console.log(`Yaw drift ${yaw.toFixed(1)}° — turning right`);
        await client.sendAction(DEVICE_ID, "turn_right", { speed: 0.3 });
        lastAction = "turn_right";
      }
    } else {
      if (lastAction !== "walk_fwd") {
        console.log("Walking forward");
        await client.sendAction(DEVICE_ID, "walk_fwd", { speed: 0.5 });
        lastAction = "walk_fwd";
      }
    }
  }, 200);

  process.on("SIGINT", async () => {
    clearInterval(interval);
    await client.sendAction(DEVICE_ID, "stand");
    console.log("\nStopped.");
    process.exit(0);
  });
}

main().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
