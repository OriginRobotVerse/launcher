import { defineConfig } from "./dist/types.js"
import { SqliteStorageAdapter } from "./dist/storage-sqlite.js"

// ARDUINO setup
// export default defineConfig({
//   port: 5050,
//   dashboardPort: 5051,
//   bluetooth: "COM6",
//   baudRate: 9600,
//   storage: new SqliteStorageAdapter("./data/origin.db"),
// })

export default defineConfig({
  port: 5050,
  dashboardPort: 5052,
  tcp: 5051,
  storage: new SqliteStorageAdapter("./data/origin.db"),
  appsDir: "../apps",
})
