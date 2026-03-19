import { defineConfig } from "./src/types.js"
import { SqliteStorageAdapter } from "./src/storage-sqlite.js"
// ARDUINO setup
// export default defineConfig({
//   port: 5050,
//   bluetooth: "COM6",
//   baudRate: 9600,
//   storage: new SqliteStorageAdapter("./data/origin.db"),
// })


export default defineConfig({
  tcp: 5051,
  storage: new SqliteStorageAdapter("./data/origin.db"),
  port: 5050
})