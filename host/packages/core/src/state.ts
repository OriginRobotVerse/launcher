export type ReadingValue = number | string | boolean;

export interface DeviceState {
  readings: Record<string, ReadingValue>;
  params: Record<string, ReadingValue>;
}
