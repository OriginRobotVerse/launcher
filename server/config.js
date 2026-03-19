import { defineConfig } from "./src/types.js";
import { SqliteStorageAdapter } from "./src/storage-sqlite.js";
export default defineConfig({
    port: 5050,
    bluetooth: "COM6",
    baudRate: 9600,
    storage: new SqliteStorageAdapter("./data/origin.db")
});
//# sourceMappingURL=config.js.map