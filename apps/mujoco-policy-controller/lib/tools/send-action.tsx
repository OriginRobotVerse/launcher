import { defineTool } from "glove-react";
import { z } from "zod";
import { sendAction } from "@/lib/origin";
import { InlineToolChip } from "@/components/inline-tool-chip";
import type { RobotConfig } from "@/lib/robots";

const inputSchema = z.object({
  action: z
    .string()
    .describe(
      "The action name to execute (e.g. 'reset', 'pause', 'set_pos', 'set_ctrl', or a specific joint name).",
    ),
  params: z
    .record(z.string(), z.number())
    .optional()
    .describe(
      "Optional parameters for the action. For set_pos/set_ctrl, provide joint names as keys with target values. For individual joint actions, provide 'value' as the key.",
    ),
});

const ACTION_LABELS: Record<string, string> = {
  reset: "Reset Pose",
  pause: "Pause Sim",
  set_pos: "Set Positions",
  set_ctrl: "Set Controls",
};

const ACTION_ICONS: Record<string, string> = {
  reset: "\u21BA",
  pause: "\u23F8",
  set_pos: "\u2699",
  set_ctrl: "\u2699",
};

export function createSendActionTool(
  robotId: string,
  robotConfig: RobotConfig,
  callbacks?: {
    onActivity?: (entry: { type: "action"; label: string; status: "executing" | "success" | "error"; detail?: string }) => void;
  },
) {
  return defineTool({
    name: "send_action",
    description: `Send a low-level action to the ${robotConfig.name} robot through the Origin server. Available actions: ${robotConfig.actions.join(", ")}. Use 'reset' to return to default pose, 'set_pos' to set joint positions, or individual joint names for single-joint control.`,
    inputSchema,
    displayPropsSchema: z.object({
      action: z.string(),
      params: z.record(z.string(), z.number()).optional(),
      status: z.enum(["executing", "success", "error"]),
      message: z.string().optional(),
    }),
    displayStrategy: "hide-on-new" as const,
    async do(input, display) {
      const { action, params } = input;

      if (!robotConfig.actions.includes(action)) {
        callbacks?.onActivity?.({
          type: "action",
          label: action,
          status: "error",
          detail: `Unknown action`,
        });
        return {
          status: "error" as const,
          data: null,
          message: `Unknown action "${action}" for ${robotConfig.name}. Available actions: ${robotConfig.actions.join(", ")}`,
          renderData: {
            action,
            params,
            status: "error" as const,
            message: `Unknown action "${action}"`,
          },
        };
      }

      await display.pushAndForget({
        action,
        params,
        status: "executing" as const,
      });

      callbacks?.onActivity?.({
        type: "action",
        label: ACTION_LABELS[action] ?? action,
        status: "executing",
      });

      try {
        await sendAction(robotId, action, params);
        const desc = formatAction(action, params);

        callbacks?.onActivity?.({
          type: "action",
          label: ACTION_LABELS[action] ?? action,
          status: "success",
          detail: desc,
        });

        return {
          status: "success" as const,
          data: `Action executed: ${desc}`,
          renderData: {
            action,
            params,
            status: "success" as const,
            message: desc,
          },
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);

        callbacks?.onActivity?.({
          type: "action",
          label: ACTION_LABELS[action] ?? action,
          status: "error",
          detail: msg,
        });

        return {
          status: "error" as const,
          data: null,
          message: `Failed to execute ${action}: ${msg}`,
          renderData: {
            action,
            params,
            status: "error" as const,
            message: msg,
          },
        };
      }
    },
    render({ props }) {
      const label = ACTION_LABELS[props.action] ?? props.action;
      const icon = ACTION_ICONS[props.action] ?? "\u2699";
      return (
        <InlineToolChip
          icon={icon}
          label={props.status === "executing" ? `${label}...` : label}
          status={props.status}
          detail={props.message}
        />
      );
    },
    renderResult({ data }) {
      const d = data as {
        action: string;
        params?: Record<string, number>;
        status: "success" | "error";
        message?: string;
      };
      const label = ACTION_LABELS[d.action] ?? d.action;
      const icon = ACTION_ICONS[d.action] ?? "\u2699";
      return (
        <InlineToolChip
          icon={icon}
          label={label}
          status={d.status}
          detail={d.message}
        />
      );
    },
  });
}

function formatAction(
  action: string,
  params?: Record<string, number>,
): string {
  switch (action) {
    case "reset":
      return "Reset to default pose";
    case "pause":
      return "Simulation paused";
    case "set_pos": {
      if (!params || Object.keys(params).length === 0) return "Set positions";
      const joints = Object.entries(params)
        .map(([k, v]) => `${k}=${v.toFixed(3)}`)
        .join(", ");
      return joints;
    }
    case "set_ctrl": {
      if (!params || Object.keys(params).length === 0) return "Set controls";
      const ctrls = Object.entries(params)
        .map(([k, v]) => `${k}=${v.toFixed(3)}`)
        .join(", ");
      return ctrls;
    }
    default: {
      if (params && params.value != null) {
        return `${action} = ${params.value.toFixed(3)}`;
      }
      return action;
    }
  }
}
