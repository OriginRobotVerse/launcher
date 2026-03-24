// Config file — imports adapt to dev (src/) or built (dist/) mode
let defineConfig: any, SqliteStorageAdapter: any;
try {
  // Built mode (node dist/cli.js)
  const types = await import("./dist/types.js");
  const storage = await import("./dist/storage-sqlite.js");
  defineConfig = types.defineConfig;
  SqliteStorageAdapter = storage.SqliteStorageAdapter;
} catch {
  // Dev mode (tsx src/cli.ts)
  const types = await import("./src/types.js");
  const storage = await import("./src/storage-sqlite.js");
  defineConfig = types.defineConfig;
  SqliteStorageAdapter = storage.SqliteStorageAdapter;
}

export default defineConfig({
  port: 5050,
  dashboardPort: 5052,
  tcp: 5051,
  storage: new SqliteStorageAdapter("./data/origin.db"),
  appsDir: "../apps",
})
