#!/usr/bin/env node

// Legacy entry point — redirects to the CLI
// Kept for backwards compatibility with `origin-server` binary

import { runUp } from "./commands/up.js";

// Convert legacy flags to up command args
const args = process.argv.slice(2);
runUp(args).catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
