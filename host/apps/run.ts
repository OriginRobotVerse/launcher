/**
 * Example runner script — connects to the Arduino and starts an app.
 *
 * Usage:
 *   npx tsx apps/run.ts --port /dev/ttyUSB0 --app obstacle-avoider
 */

import { Launcher } from "originrobot-launcher";
import { SerialTransport } from "originrobot-transport-serial";
import type { OriginApp } from "originrobot-core";

const args = process.argv.slice(2);

function getArg(name: string, defaultVal?: string): string {
  const idx = args.indexOf(`--${name}`);
  if (idx === -1 || idx + 1 >= args.length) {
    if (defaultVal !== undefined) return defaultVal;
    console.error(`Missing required argument: --${name}`);
    process.exit(1);
  }
  return args[idx + 1];
}

const port = getArg("port");
const appName = getArg("app", "obstacle-avoider");

async function main() {
  const transport = new SerialTransport({ path: port });
  const launcher = new Launcher(transport);

  await launcher.connect();
  console.log(`[origin] connected to ${port}`);

  // Dynamic import of the app module
  const appModule = await import(`./${appName}.js`);
  const app: OriginApp = appModule.default;

  await launcher.run(app);

  // Graceful shutdown
  process.on("SIGINT", async () => {
    console.log("\n[origin] shutting down...");
    await launcher.disconnect();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error("[origin] fatal:", err);
  process.exit(1);
});
