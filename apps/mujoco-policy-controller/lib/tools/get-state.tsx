import { defineTool } from "glove-react";
import { z } from "zod";
import { getDeviceState } from "@/lib/origin";
import { InlineToolChip } from "@/components/inline-tool-chip";
import type { RobotConfig } from "@/lib/robots";

const inputSchema = z.object({
  device_id: z
    .string()
    .optional()
    .describe(
      "The device ID to read state from. Defaults to the current robot's device ID.",
    ),
});

/**
 * The get_state tool now pushes full state data into the TelemetryContext
 * (via the onStateReceived callback) instead of rendering a large StateCard
 * inline. The chat timeline only shows a compact chip.
 */
export function createGetStateTool(
  robotId: string,
  robotConfig: RobotConfig,
  callbacks?: {
    onStateReceived?: (state: Record<string, number>, deviceId: string) => void;
    onOpenPanel?: () => void;
  },
) {
  return defineTool({
    name: "get_state",
    description: `Read the current state of the ${robotConfig.name} robot — joint positions, velocities, and body pose. Use this to check the robot's configuration before issuing commands.`,
    inputSchema,
    displayPropsSchema: z.object({
      state: z.record(z.string(), z.number()),
      device_id: z.string(),
    }),
    displayStrategy: "hide-on-new" as const,
    async do(input, display) {
      const deviceId = input.device_id || robotId;
      try {
        const state = await getDeviceState(deviceId);
        await display.pushAndForget({ state, device_id: deviceId });

        // Push state data to the telemetry panel
        callbacks?.onStateReceived?.(state, deviceId);

        const lines = Object.entries(state)
          .map(([key, val]) => `${key}: ${typeof val === "number" ? val.toFixed(4) : val}`)
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
      const keyCount = Object.keys(props.state).length;
      return (
        <InlineToolChip
          icon={"\u25CB"}
          label="Reading state..."
          status="executing"
          detail={`${keyCount} values`}
        />
      );
    },
    renderResult({ data }) {
      const { state } = data as {
        state: Record<string, number>;
      };
      const keyCount = Object.keys(state).length;
      const bodyZ = state.body_z;
      const summary = bodyZ != null
        ? `${keyCount} values | height ${bodyZ.toFixed(3)}m`
        : `${keyCount} values`;

      return (
        <InlineToolChip
          icon={"\u25CB"}
          label="State snapshot"
          status="success"
          detail={summary}
          onViewDetail={callbacks?.onOpenPanel}
        />
      );
    },
  });
}
