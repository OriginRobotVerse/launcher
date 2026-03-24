import { api } from "./client.js";

interface AppDetailResponse {
  secrets: Array<{ key: string; description: string; required: boolean; configured: boolean }>;
}

export async function runSecrets(args: string[]): Promise<void> {
  const subcommand = args[0];

  if (subcommand === "set") {
    const appId = args[1];
    const key = args[2];
    const value = args[3];
    if (!appId || !key || !value) {
      console.error("Usage: origin secrets set <app-id> <key> <value>");
      process.exit(1);
    }

    await api("POST", `/api/apps/${encodeURIComponent(appId)}/secrets`, {
      secrets: { [key]: value },
    });
    console.log(`  ✓ Secret ${key} set for ${appId}`);
    return;
  }

  if (subcommand === "list") {
    const appId = args[1];
    if (!appId) {
      console.error("Usage: origin secrets list <app-id>");
      process.exit(1);
    }

    const detail = await api<AppDetailResponse>("GET", `/api/apps/${encodeURIComponent(appId)}`);

    if (detail.secrets.length === 0) {
      console.log(`  ${appId} has no secrets configured.`);
      return;
    }

    console.log("");
    console.log(`  Secrets for ${appId}:`);
    for (const s of detail.secrets) {
      const status = s.configured ? "✓" : "✗";
      const req = s.required ? "required" : "optional";
      console.log(`    ${status} ${s.key.padEnd(30)} ${req.padEnd(10)} ${s.description}`);
    }
    console.log("");
    return;
  }

  console.error("Usage: origin secrets <set|list> ...");
  process.exit(1);
}
