import type { ServerTransport } from "./types.js";

// --- Serial Transport ---
// Uses the serialport package to communicate over USB serial or Bluetooth serial.

export class SerialServerTransport implements ServerTransport {
  private port: any = null;
  private parser: any = null;
  private dataCallback: ((line: string) => void) | null = null;
  private closeCallback: (() => void) | null = null;

  constructor(
    private path: string,
    private baudRate: number = 9600,
  ) {}

  async open(): Promise<void> {
    const { SerialPort, ReadlineParser } = await import("serialport");

    return new Promise((resolve, reject) => {
      this.port = new SerialPort(
        { path: this.path, baudRate: this.baudRate },
        (err: Error | null) => {
          if (err) return reject(err);

          this.parser = this.port.pipe(
            new ReadlineParser({ delimiter: "\n" }),
          );

          this.parser.on("data", (line: string) => {
            const trimmed = line.trim();
            if (trimmed) {
              console.log(`[transport] ${this.path} rx: ${trimmed}`);
              if (this.dataCallback) {
                this.dataCallback(trimmed);
              }
            }
          });

          this.port.on("close", () => {
            console.log(`[transport] ${this.path} port closed`);
            if (this.closeCallback) this.closeCallback();
          });

          this.port.on("error", (err: Error) => {
            console.error(`[transport] ${this.path} error:`, err.message);
          });

          // Wait briefly for Arduino reset after serial open
          setTimeout(() => resolve(), 2000);
        },
      );
    });
  }

  async close(): Promise<void> {
    if (!this.port) return;
    return new Promise((resolve) => {
      this.port.close((err: Error | null) => {
        if (err) console.error(`[transport] ${this.path} close error:`, err.message);
        this.port = null;
        this.parser = null;
        resolve();
      });
    });
  }

  write(data: string): void {
    if (!this.port || !this.port.isOpen) {
      console.warn(`[transport] ${this.path} tx DROPPED (port not open): ${data}`);
      return;
    }
    console.log(`[transport] ${this.path} tx: ${data}`);
    this.port.write(data + "\n");
  }

  onData(callback: (line: string) => void): void {
    this.dataCallback = callback;
  }

  onClose(callback: () => void): void {
    this.closeCallback = callback;
  }
}

// --- Bluetooth Transport ---
// Bluetooth serial modules (HC-05, HC-06) appear as serial ports once paired.
// This is functionally identical to SerialServerTransport but provides a
// distinct class for clarity and future BT-specific behavior.

export class BluetoothServerTransport extends SerialServerTransport {
  constructor(path: string, baudRate: number = 9600) {
    super(path, baudRate);
  }
}
