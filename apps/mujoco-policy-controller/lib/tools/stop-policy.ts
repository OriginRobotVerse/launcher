import type { ToolConfig } from "glove-react";
import { z } from "zod";
import { stopPolicy } from "@/lib/backend";

export function createStopPolicyTool(): ToolConfig {
  return {
    name: "stop_policy",
    description:
      "Stop the currently running control policy. The robot will hold its last position but no new control actions will be sent.",
    inputSchema: z.object({}),
    async do() {
      try {
        await stopPolicy();
        return {
          status: "success" as const,
          data: "Policy stopped. The robot is no longer being actively controlled.",
        };
      } catch (err) {
        return {
          status: "error" as const,
          data: null,
          message: `Failed to stop policy: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    },
  };
}
