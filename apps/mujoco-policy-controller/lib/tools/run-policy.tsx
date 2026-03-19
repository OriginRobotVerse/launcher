import { defineTool } from "glove-react";
import { z } from "zod";
import { startPolicy } from "@/lib/backend";
import { InlineToolChip } from "@/components/inline-tool-chip";

const inputSchema = z.object({
  policy: z
    .string()
    .describe(
      "The name of the policy to run (e.g. 'stand', 'walk', 'trot', 'neural').",
    ),
});

export function createRunPolicyTool(callbacks?: {
  onActivity?: (entry: { type: "policy"; label: string; status: "executing" | "success" | "error"; detail?: string }) => void;
}) {
  return defineTool({
    name: "run_policy",
    description:
      "Start a control policy on the robot. The policy runs in a background loop on the Python backend, reading state and sending actions at 30Hz. Any currently running policy will be stopped first.",
    inputSchema,
    displayPropsSchema: z.object({
      policy: z.string(),
      status: z.enum(["starting", "success", "error"]),
      message: z.string().optional(),
    }),
    displayStrategy: "hide-on-new" as const,
    async do(input, display) {
      const { policy } = input;

      await display.pushAndForget({
        policy,
        status: "starting" as const,
      });

      callbacks?.onActivity?.({
        type: "policy",
        label: `Start ${policy}`,
        status: "executing",
      });

      try {
        const result = await startPolicy(policy);

        callbacks?.onActivity?.({
          type: "policy",
          label: `Start ${result.policy}`,
          status: "success",
          detail: `Running at 30Hz`,
        });

        return {
          status: "success" as const,
          data: `Policy "${result.policy}" started successfully.`,
          renderData: {
            policy: result.policy,
            status: "success" as const,
            message: `Policy "${result.policy}" is now running at 30Hz.`,
          },
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);

        callbacks?.onActivity?.({
          type: "policy",
          label: `Start ${policy}`,
          status: "error",
          detail: msg,
        });

        return {
          status: "error" as const,
          data: null,
          message: `Failed to start policy "${policy}": ${msg}`,
          renderData: {
            policy,
            status: "error" as const,
            message: msg,
          },
        };
      }
    },
    render({ props }) {
      const status = props.status === "starting" ? "executing" : props.status;
      return (
        <InlineToolChip
          icon={"\u25B6"}
          label={props.status === "starting" ? `Starting ${props.policy}...` : `Policy: ${props.policy}`}
          status={status as "executing" | "success" | "error"}
          detail={props.message}
        />
      );
    },
    renderResult({ data }) {
      const d = data as {
        policy: string;
        status: "success" | "error";
        message?: string;
      };
      return (
        <InlineToolChip
          icon={d.status === "success" ? "\u25B6" : "\u2716"}
          label={`Policy: ${d.policy}`}
          status={d.status}
          detail={d.message}
        />
      );
    },
  });
}
