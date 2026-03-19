import { createServer, type Server, type Socket } from "node:net";
import type { ServerTransport } from "./types.js";

/**
 * Wraps a single accepted TCP socket as a ServerTransport.
 * The MuJoCo process (or any TCP client) connects and speaks
 * the same newline-delimited JSON wire protocol as serial/BT.
 */
export class TcpConnectionTransport implements ServerTransport {
  private buffer = "";
  private dataCallback: ((line: string) => void) | null = null;
  private closeCallback: (() => void) | null = null;

  constructor(private socket: Socket) {}

  async open(): Promise<void> {
    const addr = `${this.socket.remoteAddress}:${this.socket.remotePort}`;

    this.socket.setEncoding("utf-8");

    this.socket.on("data", (chunk: string) => {
      this.buffer += chunk;
      const lines = this.buffer.split("\n");
      // Keep the last (possibly incomplete) segment in the buffer
      this.buffer = lines.pop()!;

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed) {
          console.log(`[transport] tcp:${addr} rx: ${trimmed}`);
          if (this.dataCallback) this.dataCallback(trimmed);
        }
      }
    });

    this.socket.on("close", () => {
      console.log(`[transport] tcp:${addr} closed`);
      if (this.closeCallback) this.closeCallback();
    });

    this.socket.on("error", (err) => {
      console.error(`[transport] tcp:${addr} error:`, err.message);
    });
  }

  async close(): Promise<void> {
    return new Promise((resolve) => {
      if (this.socket.destroyed) return resolve();
      this.socket.end(() => resolve());
    });
  }

  write(data: string): void {
    if (this.socket.destroyed) {
      console.warn(`[transport] tcp tx DROPPED (socket destroyed): ${data}`);
      return;
    }
    const addr = `${this.socket.remoteAddress}:${this.socket.remotePort}`;
    console.log(`[transport] tcp:${addr} tx: ${data}`);
    this.socket.write(data + "\n");
  }

  onData(callback: (line: string) => void): void {
    this.dataCallback = callback;
  }

  onClose(callback: () => void): void {
    this.closeCallback = callback;
  }
}

/**
 * Creates a TCP server that accepts connections and calls onConnection
 * for each one. The DeviceManager hooks into this to create PortListeners.
 */
export function createTcpListener(
  port: number,
  onConnection: (transport: TcpConnectionTransport, socket: Socket) => void,
): Server {
  const server = createServer((socket) => {
    const addr = `${socket.remoteAddress}:${socket.remotePort}`;
    console.log(`[tcp] New connection from ${addr}`);
    const transport = new TcpConnectionTransport(socket);
    onConnection(transport, socket);
  });

  server.listen(port, () => {
    console.log(`[tcp] Listening on port ${port}`);
  });

  server.on("error", (err) => {
    console.error(`[tcp] Server error:`, err.message);
  });

  return server;
}
