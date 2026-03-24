import { api } from "./client.js";
import type { DeviceProfile } from "../types.js";

export async function runProfiles(args: string[]): Promise<void> {
  const jsonOutput = args.includes("--json");

  // Check for "show" subcommand
  if (args[0] === "show" && args[1]) {
    return runProfileShow(args[1], jsonOutput);
  }

  const profiles = await api<DeviceProfile[]>("GET", "/api/profiles");

  if (jsonOutput) {
    console.log(JSON.stringify(profiles, null, 2));
    return;
  }

  if (profiles.length === 0) {
    console.log("  No device profiles available.");
    return;
  }

  console.log("");
  console.log(`  ${"DEVICE ID".padEnd(20)}${"TYPE".padEnd(14)}${"DISPLAY NAME".padEnd(24)}GROUPS`);

  for (const p of profiles) {
    const groups = p.stateGroups.map((g) => g.label).join(", ");
    const config = p.needsConfiguration ? " ⚠" : "";
    console.log(`  ${p.deviceId.padEnd(20)}${p.type.padEnd(14)}${p.displayName.padEnd(24)}${groups}${config}`);
  }
  console.log("");
}

async function runProfileShow(deviceId: string, jsonOutput: boolean): Promise<void> {
  const profile = await api<DeviceProfile>("GET", `/api/profiles/${encodeURIComponent(deviceId)}`);

  if (jsonOutput) {
    console.log(JSON.stringify(profile, null, 2));
    return;
  }

  console.log("");
  console.log(`  Device: ${profile.deviceId}`);
  console.log(`  Type: ${profile.type}`);
  console.log(`  Display Name: ${profile.displayName}`);
  console.log(`  Description: ${profile.description}`);

  if (profile.needsConfiguration) {
    console.log(`  ⚠ Needs configuration`);
  }

  console.log("");
  console.log("  Capabilities:");
  console.log(`    Position Control: ${profile.capabilities.positionControl ? "✓" : "✗"}`);
  console.log(`    Torque Control: ${profile.capabilities.torqueControl ? "✓" : "✗"}`);
  console.log(`    Locomotion: ${profile.capabilities.locomotion ? "✓" : "✗"}`);
  console.log(`    Manipulation: ${profile.capabilities.manipulation ? "✓" : "✗"}`);

  if (profile.stateGroups.length > 0) {
    console.log("");
    console.log("  State Groups:");
    for (const g of profile.stateGroups) {
      console.log(`    ${g.label}: ${g.keys.join(", ")}`);
    }
  }

  if (profile.actionAliases && Object.keys(profile.actionAliases).length > 0) {
    console.log("");
    console.log("  Action Aliases:");
    for (const [alias, action] of Object.entries(profile.actionAliases)) {
      console.log(`    ${alias} → ${action}`);
    }
  }

  console.log("");
}
