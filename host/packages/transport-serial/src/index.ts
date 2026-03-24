import { SerialPort, ReadlineParser } from "serialport";
import type { Transport } from "originrobot-core";

export interface SerialTransportOptions {
  path: string;
  baudRate?: number;
}

export class SerialTransport implements Transport {
  private port: SerialPort;
  private buffer: string[] = [];
  private initialized = false;

  constructor(private options: SerialTransportOptions) {
    this.port = new SerialPort({
      path: options.path,
      baudRate: options.baudRate ?? 9600,
      autoOpen: false,
    });
  }

  async connect(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.port.open((err: Error | null) => {
        if (err) return reject(err);
        if (!this.initialized) {
          const parser = new ReadlineParser({ delimiter: "\n" });
          this.port.pipe(parser);
          parser.on("data", (line: string) => {
            this.buffer.push(line.trim());
          });
          this.initialized = true;
        }
        resolve();
      });
    });
  }

  async send(data: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.port.write(data + "\n", (err: Error | null | undefined) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }

  async receive(): Promise<string> {
    return this.buffer.shift() ?? "";
  }

  async disconnect(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.port.close((err: Error | null) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }
}
