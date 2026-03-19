import type { ToolConfig } from "glove-react";
import type { RobotConfig } from "@/lib/robots";
import { createListPoliciesTool } from "./list-policies";
import { createRunPolicyTool } from "./run-policy";
import { createStopPolicyTool } from "./stop-policy";
import { createGetStateTool } from "./get-state";
import { createSendActionTool } from "./send-action";
import { createSendCommandTool } from "./send-command";

export interface ToolCallbacks {
  onStateReceived?: (state: Record<string, number>, deviceId: string) => void;
  onOpenPanel?: () => void;
  onActivity?: (entry: {
    type: "action" | "policy" | "command" | "state";
    label: string;
    status: "executing" | "success" | "error";
    detail?: string;
  }) => void;
}

export function createTools(
  robotId: string,
  robotConfig: RobotConfig,
  callbacks?: ToolCallbacks,
): ToolConfig[] {
  return [
    createListPoliciesTool(),
    createRunPolicyTool(callbacks ? { onActivity: callbacks.onActivity } : undefined),
    createStopPolicyTool(),
    createGetStateTool(robotId, robotConfig, {
      onStateReceived: callbacks?.onStateReceived,
      onOpenPanel: callbacks?.onOpenPanel,
    }),
    createSendActionTool(robotId, robotConfig, callbacks ? { onActivity: callbacks.onActivity } : undefined),
    createSendCommandTool(callbacks ? { onActivity: callbacks.onActivity } : undefined),
  ];
}
