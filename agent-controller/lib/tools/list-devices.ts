import type { ToolConfig } from "glove-react";
import { z } from "zod";
import { listDevices } from "@/lib/origin";

export const listDevicesTool: ToolConfig = {
  name: "list_devices",
  description:
    "List all Origin devices currently connected to the server. Use this to discover available devices and their capabilities before sending commands.",
  inputSchema: z.object({}),
  async do() {
    try {
      const devices = await listDevices();
      if (devices.length === 0) {
        return {
          status: "success" as const,
          data: "No devices are currently connected to the Origin server.",
        };
      }
      const summary = devices
        .map(
          (d) =>
            `- ${d.id} (v${d.version}): actions=[${d.actions.join(", ")}], sensors=${d.sensorCount}, chips=${d.chipCount}`,
        )
        .join("\n");
      return {
        status: "success" as const,
        data: `Connected devices:\n${summary}`,
      };
    } catch (err) {
      return {
        status: "error" as const,
        data: null,
        message: `Failed to list devices: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
