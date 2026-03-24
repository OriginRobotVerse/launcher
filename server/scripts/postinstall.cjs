// Ensure better-sqlite3 native addon is compiled.
// pnpm global installs often skip lifecycle scripts for dependencies,
// so the prebuild binary never gets downloaded/compiled.

const { execSync } = require("child_process");
const path = require("path");

try {
  require("better-sqlite3");
} catch (e) {
  console.log("[originrobot] better-sqlite3 native addon missing, rebuilding...");
  try {
    const bsqlDir = path.dirname(require.resolve("better-sqlite3/package.json"));
    execSync("npx --yes node-gyp rebuild --release", {
      cwd: bsqlDir,
      stdio: "inherit",
    });
    // Verify it loads now
    require("better-sqlite3");
    console.log("[originrobot] better-sqlite3 rebuilt successfully.");
  } catch (err) {
    console.error(
      "[originrobot] Failed to build better-sqlite3.\n" +
      "  Try: pnpm rebuild better-sqlite3\n" +
      "  Or install build tools:\n" +
      "    macOS:  xcode-select --install\n" +
      "    Linux:  apt install build-essential python3\n"
    );
  }
}
