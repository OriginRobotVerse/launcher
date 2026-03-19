import { defineTool } from "glove-react";
import { z } from "zod";
import { sendCommand } from "@/lib/backend";
import { InlineToolChip } from "@/components/inline-tool-chip";

const inputSchema = z.object({
  vx: z
    .number()
    .optional()
    .describe("Forward velocity in m/s. Positive = forward, negative = backward. Default 0."),
  vy: z
    .number()
    .optional()
    .describe("Lateral velocity in m/s. Positive = left, negative = right. Default 0."),
  yaw: z
    .number()
    .optional()
    .describe("Yaw rate in rad/s. Positive = counter-clockwise, negative = clockwise. Default 0."),
});

export function createSendCommandTool(callbacks?: {
  onActivity?: (entry: { type: "command"; label: string; status: "executing" | "success" | "error"; detail?: string }) => void;
}) {
  return defineTool({
    name: "send_command",
    description:
      "Send velocity commands to the currently running neural locomotion policy. The policy must already be active (use run_policy first). Commands set the desired forward velocity (vx), lateral velocity (vy), and yaw rate. Set all to 0 to make the robot stand still while the policy maintains balance.",
    inputSchema,
    displayPropsSchema: z.object({
      vx: z.number(),
      vy: z.number(),
      yaw: z.number(),
      status: z.enum(["executing", "success", "error"]),
      message: z.string().optional(),
    }),
    displayStrategy: "hide-on-new" as const,
    async do(input, display) {
      const vx = input.vx ?? 0;
      const vy = input.vy ?? 0;
      const yaw = input.yaw ?? 0;

      await display.pushAndForget({
        vx,
        vy,
        yaw,
        status: "executing" as const,
      });

      callbacks?.onActivity?.({
        type: "command",
        label: "Velocity cmd",
        status: "executing",
      });

      try {
        await sendCommand(vx, vy, yaw);
        const desc = formatCommand(vx, vy, yaw);

        callbacks?.onActivity?.({
          type: "command",
          label: "Velocity cmd",
          status: "success",
          detail: desc,
        });

        return {
          status: "success" as const,
          data: `Velocity command sent: ${desc}`,
          renderData: {
            vx,
            vy,
            yaw,
            status: "success" as const,
            message: desc,
          },
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);

        callbacks?.onActivity?.({
          type: "command",
          label: "Velocity cmd",
          status: "error",
          detail: msg,
        });

        return {
          status: "error" as const,
          data: null,
          message: `Failed to send command: ${msg}`,
          renderData: {
            vx,
            vy,
            yaw,
            status: "error" as const,
            message: msg,
          },
        };
      }
    },
    render({ props }) {
      const desc = formatCommand(props.vx, props.vy, props.yaw);
      return (
        <InlineToolChip
          icon={"\u2192"}
          label={props.status === "executing" ? "Sending cmd..." : "Velocity cmd"}
          status={props.status}
          detail={desc}
        />
      );
    },
    renderResult({ data }) {
      const d = data as {
        vx: number;
        vy: number;
        yaw: number;
        status: "success" | "error";
        message?: string;
      };
      return (
        <InlineToolChip
          icon={"\u2192"}
          label="Velocity cmd"
          status={d.status}
          detail={d.message}
        />
      );
    },
  });
}

function formatCommand(vx: number, vy: number, yaw: number): string {
  const parts: string[] = [];
  if (vx !== 0) parts.push(`vx=${vx.toFixed(2)}`);
  if (vy !== 0) parts.push(`vy=${vy.toFixed(2)}`);
  if (yaw !== 0) parts.push(`yaw=${yaw.toFixed(2)}`);
  if (parts.length === 0) return "standing still";
  return parts.join(" ");
}
