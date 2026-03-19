import type { ToolConfig } from "glove-react";
import { z } from "zod";
import { listPolicies } from "@/lib/backend";

export function createListPoliciesTool(): ToolConfig {
  return {
    name: "list_policies",
    description:
      "List all available control policies for the robot. Shows each policy's name, description, and whether it is currently active. Use this to discover what policies are available before starting one.",
    inputSchema: z.object({}),
    async do() {
      try {
        const policies = await listPolicies();
        if (policies.length === 0) {
          return {
            status: "success" as const,
            data: "No policies are currently available on the backend.",
          };
        }
        const summary = policies
          .map(
            (p) =>
              `- ${p.name}${p.active ? " [ACTIVE]" : ""}: ${p.description}`,
          )
          .join("\n");
        return {
          status: "success" as const,
          data: `Available policies:\n${summary}`,
        };
      } catch (err) {
        return {
          status: "error" as const,
          data: null,
          message: `Failed to list policies: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    },
  };
}
