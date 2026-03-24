// Ensure better-sqlite3 native addon is available.
// pnpm global installs can skip prebuild-install, so we check and rebuild if needed.

const { execSync } = require("child_process");
const path = require("path");

try {
  require("better-sqlite3");
  // Native addon loaded fine — nothing to do
} catch (e) {
  console.log("[originrobot] Rebuilding better-sqlite3 native module...");
  try {
    // Find the better-sqlite3 package directory
    const bsqlPath = path.dirname(require.resolve("better-sqlite3/package.json"));
    // Run its install script (prebuild-install → node-gyp fallback)
    execSync("npm run install --ignore-scripts=false", {
      cwd: bsqlPath,
      stdio: "inherit",
      env: { ...process.env, npm_config_node_gyp: undefined },
    });
    console.log("[originrobot] better-sqlite3 rebuilt successfully.");
  } catch (rebuildErr) {
    // Try node-gyp directly as last resort
    try {
      const bsqlPath = path.dirname(require.resolve("better-sqlite3/package.json"));
      execSync("npx --yes node-gyp rebuild --release", {
        cwd: bsqlPath,
        stdio: "inherit",
      });
      console.log("[originrobot] better-sqlite3 rebuilt via node-gyp.");
    } catch {
      console.error(
        "[originrobot] Failed to build better-sqlite3. You may need to run:\n" +
        "  npm rebuild better-sqlite3\n" +
        "or install build tools: xcode-select --install (macOS) / apt install build-essential (Linux)"
      );
    }
  }
}
