import { createServer, Socket, Server } from "node:net";
import type { ServerTransport } from "./types.js";

/**
 * TCP server transport — listens for a single simulator connection.
 * The simulator connects and speaks Origin wire protocol over TCP.
 */
export class TCPServerTransport implements ServerTransport {
  private server: Server | null = null;
  private socket: Socket | null = null;
  private dataCallback: ((line: string) => void) | null = null;
  private closeCallback: (() => void) | null = null;
  private partial = "";

  constructor(
    private port: number,
    private host: string = "127.0.0.1",
  ) {}

  open(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = createServer((socket: Socket) => {
        // Accept first connection, reject others
        if (this.socket) {
          socket.end();
          return;
        }

        this.socket = socket;
        console.log(`[tcp] Simulator connected from ${socket.remoteAddress}:${socket.remotePort}`);

        socket.on("data", (chunk: Buffer) => {
          this.partial += chunk.toString();
          const lines = this.partial.split("\n");
          this.partial = lines.pop() ?? "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed && this.dataCallback) {
              this.dataCallback(trimmed);
            }
          }
        });

        socket.on("close", () => {
          console.log("[tcp] Simulator disconnected");
          this.socket = null;
          this.closeCallback?.();
        });

        socket.on("error", (err: Error) => {
          console.error("[tcp] Socket error:", err.message);
        });
      });

      this.server.on("error", reject);

      this.server.listen(this.port, this.host, () => {
        console.log(`[tcp] Listening for simulator on ${this.host}:${this.port}`);
        resolve();
      });
    });
  }

  async close(): Promise<void> {
    if (this.socket) {
      this.socket.end();
      this.socket = null;
    }
    return new Promise((resolve) => {
      if (!this.server) return resolve();
      this.server.close(() => {
        this.server = null;
        resolve();
      });
    });
  }

  write(data: string): void {
    if (!this.socket || this.socket.destroyed) return;
    this.socket.write(data + "\n");
  }

  onData(callback: (line: string) => void): void {
    this.dataCallback = callback;
  }

  onClose(callback: () => void): void {
    this.closeCallback = callback;
  }
}
