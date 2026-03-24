import { api } from "./client.js";

interface InstallResponse {
  ok: boolean;
  app: { id: string; name: string; version: string };
}

export async function runInstall(args: string[]): Promise<void> {
  const source = args[0];
  if (!source) {
    console.error("Usage: origin install <source>");
    console.error("  source: GitHub URL, local path, or tarball URL");
    process.exit(1);
  }

  // Parse --name flag
  let name: string | undefined;
  const nameIdx = args.indexOf("--name");
  if (nameIdx !== -1 && args[nameIdx + 1]) {
    name = args[nameIdx + 1];
  }

  console.log(`  Installing from ${source}...`);

  const result = await api<InstallResponse>("POST", "/api/apps/install", { source, name });

  console.log(`  ✓ Installed ${result.app.name} (${result.app.id}) v${result.app.version}`);
  console.log(`  Launch with: origin launch ${result.app.id} --device <device-id>`);
}
