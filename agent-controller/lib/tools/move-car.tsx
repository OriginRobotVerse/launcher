import { defineTool } from "glove-react";
import { z } from "zod";
import { sendAction, getDeviceState, DEFAULT_DEVICE } from "@/lib/origin";
import { ActionResultCard } from "@/components/action-result-card";

const OBSTACLE_THRESHOLD_CM = 15;

const inputSchema = z.object({
  action: z
    .enum(["moveFwd", "moveRight", "moveLeft", "stop"])
    .describe("The movement action to perform."),
  speed: z
    .number()
    .min(0)
    .max(255)
    .optional()
    .describe("Motor speed 0-255. Default 200. Not used for stop."),
  angle: z
    .number()
    .optional()
    .describe(
      "Turn angle in degrees. Only used for moveRight and moveLeft. Default 90.",
    ),
  duration_ms: z
    .number()
    .optional()
    .describe(
      "Optional duration in milliseconds. If set for moveFwd, the car will automatically stop after this duration.",
    ),
});

export const moveCarTool = defineTool({
  name: "move_car",
  description:
    "Execute a movement action on the toy car. Actions: moveFwd (drive forward continuously until stop), moveRight (turn right by angle then auto-stop), moveLeft (turn left by angle then auto-stop), stop (halt all motors). Use duration_ms with moveFwd to auto-stop after a time. When moving forward, the tool automatically checks the ultrasonic distance sensor and will refuse to move if an obstacle is closer than 15cm.",
  inputSchema,
  displayPropsSchema: z.object({
    action: z.string(),
    speed: z.number().optional(),
    angle: z.number().optional(),
    status: z.enum(["executing", "success", "error", "blocked"]),
    message: z.string().optional(),
    distance: z.number().optional(),
  }),
  displayStrategy: "hide-on-new" as const,
  async do(input, display) {
    const { action, speed, angle, duration_ms } = input;

    // For forward movement, check ultrasonic distance first
    if (action === "moveFwd") {
      try {
        const state = await getDeviceState(DEFAULT_DEVICE);
        const distance = state.distance ?? -1;

        if (distance >= 0 && distance < OBSTACLE_THRESHOLD_CM) {
          await display.pushAndForget({
            action,
            status: "blocked" as const,
            message: `Obstacle detected ${distance.toFixed(1)}cm ahead — too close to move forward safely.`,
            distance,
            ...(speed != null ? { speed } : {}),
          });

          return {
            status: "error" as const,
            data: null,
            message: `BLOCKED: Obstacle at ${distance.toFixed(1)}cm (threshold: ${OBSTACLE_THRESHOLD_CM}cm). The car cannot move forward safely. Suggest turning or backing up.`,
            renderData: {
              action,
              speed,
              status: "blocked" as const,
              message: `Obstacle at ${distance.toFixed(1)}cm — movement blocked`,
              distance,
            },
          };
        }
      } catch {
        // If we can't read the sensor, proceed with caution
      }
    }

    await display.pushAndForget({
      action,
      status: "executing" as const,
      ...(speed != null ? { speed } : {}),
      ...(angle != null ? { angle } : {}),
    });

    try {
      let params: Record<string, number> | undefined;
      if (action !== "stop") {
        params = {};
        params.speed = speed ?? 200;
        if ((action === "moveRight" || action === "moveLeft") && angle != null) {
          params.angle = angle;
        }
      }

      await sendAction(DEFAULT_DEVICE, action, params);

      if (duration_ms && action === "moveFwd") {
        await new Promise((r) => setTimeout(r, duration_ms));
        await sendAction(DEFAULT_DEVICE, "stop");
      }

      const desc = formatAction(action, params ?? {}, duration_ms);

      return {
        status: "success" as const,
        data: `Action executed: ${desc}`,
        renderData: {
          action,
          speed: params?.speed,
          angle: params?.angle,
          duration_ms,
          status: "success" as const,
          message: desc,
        },
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        status: "error" as const,
        data: null,
        message: `Failed to execute ${action}: ${msg}`,
        renderData: {
          action,
          speed,
          angle,
          status: "error" as const,
          message: msg,
        },
      };
    }
  },
  render({ props }) {
    return (
      <ActionResultCard
        action={props.action}
        speed={props.speed}
        angle={props.angle}
        status={props.status}
        message={props.message}
        distance={props.distance}
      />
    );
  },
  renderResult({ data }) {
    const d = data as {
      action: string;
      speed?: number;
      angle?: number;
      duration_ms?: number;
      status: "success" | "error" | "blocked";
      message?: string;
      distance?: number;
    };
    return (
      <ActionResultCard
        action={d.action}
        speed={d.speed}
        angle={d.angle}
        status={d.status}
        message={d.message}
        distance={d.distance}
      />
    );
  },
});

function formatAction(
  action: string,
  params: Record<string, number>,
  duration_ms?: number,
): string {
  switch (action) {
    case "moveFwd":
      return `Moving forward at speed ${params.speed}${duration_ms ? ` for ${duration_ms}ms then stopping` : " (continuous)"}`;
    case "moveRight":
      return `Turning right ${params.angle ?? 90}° at speed ${params.speed}`;
    case "moveLeft":
      return `Turning left ${params.angle ?? 90}° at speed ${params.speed}`;
    case "stop":
      return "Stopped all motors";
    default:
      return `${action} executed`;
  }
}
