export interface Transport {
  connect(): Promise<void>;
  send(data: string): Promise<void>;
  receive(): Promise<string>;
  disconnect(): Promise<void>;
}
