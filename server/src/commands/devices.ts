import { api } from "./client.js";
import type { DeviceSummary, DeviceDetail } from "../types.js";

export async function runDevices(args: string[]): Promise<void> {
  const jsonOutput = args.includes("--json");

  // Check for "info" subcommand
  if (args[0] === "info" && args[1]) {
    return runDeviceInfo(args[1], jsonOutput);
  }

  const devices = await api<DeviceSummary[]>("GET", "/devices");

  if (jsonOutput) {
    console.log(JSON.stringify(devices, null, 2));
    return;
  }

  if (devices.length === 0) {
    console.log("  No devices connected.");
    console.log("  Run 'origin discover' to scan for devices.");
    return;
  }

  console.log("");
  // Header
  console.log(`  ${"ID".padEnd(18)}${"TYPE".padEnd(12)}${"ACTIONS".padEnd(42)}STATE KEYS`);

  for (const d of devices) {
    const actions = d.actions.join(", ");
    const truncatedActions = actions.length > 38 ? actions.slice(0, 38) + "..." : actions;
    console.log(`  ${d.id.padEnd(18)}${("" ).padEnd(12)}${truncatedActions.padEnd(42)}${d.sensorCount}`);
  }
  console.log("");
}

async function runDeviceInfo(deviceId: string, jsonOutput: boolean): Promise<void> {
  const detail = await api<DeviceDetail>("GET", `/devices/${encodeURIComponent(deviceId)}`);

  if (jsonOutput) {
    console.log(JSON.stringify(detail, null, 2));
    return;
  }

  console.log("");
  console.log(`  Device: ${detail.id}`);
  console.log(`  Version: ${detail.version}`);
  console.log(`  Connected: ${detail.connectedAt}`);
  console.log(`  Last Updated: ${detail.lastUpdated ?? "never"}`);
  console.log("");

  if (detail.manifest.actions.length > 0) {
    console.log("  Actions:");
    for (const action of detail.manifest.actions) {
      console.log(`    • ${action}`);
    }
    console.log("");
  }

  if (detail.manifest.sensors.length > 0) {
    console.log("  Sensors:");
    for (const sensor of detail.manifest.sensors) {
      console.log(`    • ${sensor.name} (pins: ${sensor.pins.join(", ")})`);
    }
    console.log("");
  }

  if (Object.keys(detail.state).length > 0) {
    console.log("  State:");
    for (const [key, value] of Object.entries(detail.state)) {
      console.log(`    ${key}: ${value}`);
    }
    console.log("");
  }
}
