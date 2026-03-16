import type { ServerResponse } from "node:http";
import type { SSEEvent } from "./types.js";

interface SSEConnection {
  id: string;
  res: ServerResponse;
  deviceFilter: string | null; // null = all devices
}

export class SSEManager {
  private connections: Map<string, SSEConnection> = new Map();
  private nextId = 0;

  addConnection(res: ServerResponse, deviceFilter: string | null): string {
    const id = String(++this.nextId);

    // Set up SSE headers
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
    });

    // Send initial comment to establish connection
    res.write(": connected\n\n");

    const connection: SSEConnection = { id, res, deviceFilter };
    this.connections.set(id, connection);

    // Clean up on close
    res.on("close", () => {
      this.connections.delete(id);
    });

    return id;
  }

  broadcast(event: SSEEvent): void {
    const payload = `event: ${event.event}\ndata: ${JSON.stringify({
      deviceId: event.deviceId,
      data: event.data,
      timestamp: event.timestamp,
    })}\n\n`;

    for (const [id, conn] of this.connections) {
      // Filter by device if the connection has a filter
      if (conn.deviceFilter && conn.deviceFilter !== event.deviceId) {
        continue;
      }

      try {
        conn.res.write(payload);
      } catch {
        // Connection dead, remove it
        this.connections.delete(id);
      }
    }
  }

  getConnectionCount(): number {
    return this.connections.size;
  }

  closeAll(): void {
    for (const [, conn] of this.connections) {
      try {
        conn.res.end();
      } catch {
        // Ignore errors on close
      }
    }
    this.connections.clear();
  }
}
