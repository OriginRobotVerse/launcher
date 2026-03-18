import { defineTool } from "glove-react";
import { z } from "zod";
import { getDeviceState, DEFAULT_DEVICE } from "@/lib/origin";
import { DeviceStateCard } from "@/components/device-state-card";

const inputSchema = z.object({
  device_id: z
    .string()
    .optional()
    .describe("The device ID to read state from. Defaults to 'toy-car'."),
});

export const getStateTool = defineTool({
  name: "get_device_state",
  description:
    "Read the current sensor state of a device (distance, speed, angle). Use this to check surroundings before moving, or to report the car's current status.",
  inputSchema,
  displayPropsSchema: z.object({
    state: z.record(z.string(), z.number()),
    device_id: z.string(),
  }),
  displayStrategy: "hide-on-new" as const,
  async do(input, display) {
    const deviceId = input.device_id || DEFAULT_DEVICE;
    try {
      const state = await getDeviceState(deviceId);
      await display.pushAndForget({ state, device_id: deviceId });

      const lines = Object.entries(state)
        .map(([key, val]) => `${key}: ${val}`)
        .join(", ");

      return {
        status: "success" as const,
        data: `Device "${deviceId}" state: ${lines}`,
        renderData: { state, device_id: deviceId },
      };
    } catch (err) {
      return {
        status: "error" as const,
        data: null,
        message: `Failed to read state: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
  render({ props }) {
    return <DeviceStateCard state={props.state} deviceId={props.device_id} />;
  },
  renderResult({ data }) {
    const { state, device_id } = data as {
      state: Record<string, number>;
      device_id: string;
    };
    return <DeviceStateCard state={state} deviceId={device_id} />;
  },
});
