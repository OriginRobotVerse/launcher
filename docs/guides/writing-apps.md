# Writing Origin Apps

This guide covers everything you need to know to write Origin apps — from your first "hello sensor" to advanced patterns like state machines and multi-sensor fusion.

---

## The Basics

An Origin app is a TypeScript object with a `name` and a `loop` function:

```ts
import type { OriginApp } from "@aorigin/core";

const app: OriginApp = {
    name: "my-app",
    async loop(ctx) {
        // Your logic here. This runs ~20 times per second.
    },
};

export default app;
```

That's it. Export it as default, and the launcher can run it.

---

## Lifecycle

Apps have three lifecycle hooks:

### `setup(ctx)` — runs once at start

Use this for one-time initialization: opening files, connecting to APIs, loading ML models, calibrating sensors.

```ts
const app: OriginApp = {
    name: "calibrator",

    async setup(ctx) {
        const readings = await ctx.read();
        this.baseline = readings.distance as number;
        console.log(`Baseline distance: ${this.baseline}`);
    },

    async loop(ctx) {
        const readings = await ctx.read();
        const delta = (readings.distance as number) - this.baseline;
        console.log(`Delta from baseline: ${delta}`);
    },
};
```

### `loop(ctx)` — runs continuously

Called by the launcher at the configured tick rate (default: 50ms / ~20Hz). Each call gets a fresh `AppContext` with the latest sensor readings.

**Do not write your own while loop.** The launcher owns the tick. Your `loop()` should do one iteration of work and return.

```ts
// GOOD — one iteration, returns
async loop(ctx) {
    const readings = await ctx.read();
    if (readings.distance < 10) {
        await ctx.send("stop");
    }
}

// BAD — blocks the launcher forever
async loop(ctx) {
    while (true) {  // Don't do this!
        const readings = await ctx.read();
        // ...
    }
}
```

### `teardown(ctx)` — runs once at stop

Use this to clean up: close file handles, send a final "stop" action, log summary data.

```ts
const app: OriginApp = {
    name: "data-logger",

    async teardown(ctx) {
        await ctx.send("stop");
        console.log("Motors stopped. Goodbye.");
    },
};
```

---

## The AppContext Object

Every lifecycle method receives a `ctx` object with three things:

### `ctx.readings`

A plain object containing the latest sensor values, auto-updated before each `loop()` call.

```ts
async loop(ctx) {
    console.log(ctx.readings);
    // { distance: 24.5, temperature: 31.2 }
}
```

Values are typed as `number | string | boolean`. Since the firmware sends floats, you'll typically cast:

```ts
const distance = ctx.readings.distance as number;
```

### `ctx.send(action, params?)`

Send an action to the Arduino. The action persists until you send a different one.

```ts
await ctx.send("moveFwd");                    // no params
await ctx.send("moveFwd", { speed: 200 });    // with params
await ctx.send("stop");                        // override previous
```

**Sending the same action again is a no-op on the firmware.** The firmware is already running that action. But it's harmless — if your logic sends `moveFwd` every tick, it works fine. The firmware just keeps doing what it's doing.

### `ctx.read()`

Force a fresh read from the transport. Returns the same type as `ctx.readings`.

```ts
const readings = await ctx.read();
```

Usually unnecessary — `ctx.readings` is already fresh at the start of each `loop()`. Use `ctx.read()` if:
- Your loop takes a long time (heavy computation) and you want mid-loop updates
- You're in `setup()` or `teardown()` and need a current snapshot

---

## Patterns

### Pattern: State Machine

For complex behavior, model your app as a state machine:

```ts
type State = "scanning" | "avoiding" | "stopped";

let state: State = "scanning";

const app: OriginApp = {
    name: "state-machine-bot",

    async loop(ctx) {
        const distance = (await ctx.read()).distance as number;

        switch (state) {
            case "scanning":
                await ctx.send("moveFwd");
                if (distance < 15) {
                    state = "avoiding";
                }
                break;

            case "avoiding":
                await ctx.send("turnRight");
                if (distance > 30) {
                    state = "scanning";
                }
                break;

            case "stopped":
                await ctx.send("stop");
                break;
        }
    },
};
```

### Pattern: Debouncing

Sensor readings can be noisy. Average over multiple ticks:

```ts
const history: number[] = [];
const WINDOW = 5;

const app: OriginApp = {
    name: "smoothed-reader",

    async loop(ctx) {
        const readings = await ctx.read();
        const distance = readings.distance as number;

        history.push(distance);
        if (history.length > WINDOW) history.shift();

        const avg = history.reduce((a, b) => a + b, 0) / history.length;
        console.log(`Smoothed distance: ${avg.toFixed(1)}`);

        if (avg < 10) {
            await ctx.send("stop");
        } else {
            await ctx.send("moveFwd");
        }
    },
};
```

### Pattern: Timed Actions

Do something for a fixed duration, then switch:

```ts
let reverseUntil = 0;

const app: OriginApp = {
    name: "timed-reverse",

    async loop(ctx) {
        const now = Date.now();
        const distance = (await ctx.read()).distance as number;

        if (reverseUntil > now) {
            // Still reversing — do nothing, action persists
            return;
        }

        if (distance < 10) {
            await ctx.send("moveBkwd");
            reverseUntil = now + 1000;  // reverse for 1 second
        } else {
            await ctx.send("moveFwd");
        }
    },
};
```

### Pattern: Multiple Sensors

When your Arduino has multiple sensors, they all appear in the same `readings` object:

```ts
// Firmware registered: readDistance → "distance", readTemp → "temperature", readLight → "light"

const app: OriginApp = {
    name: "multi-sensor",

    async loop(ctx) {
        const readings = await ctx.read();
        const distance = readings.distance as number;
        const temp = readings.temperature as number;
        const light = readings.light as number;

        console.log(`dist=${distance} temp=${temp} light=${light}`);

        // Complex decision using all sensors
        if (temp > 40) {
            await ctx.send("stop");  // overheating
        } else if (distance < 10) {
            await ctx.send("moveBkwd");
        } else if (light < 50) {
            await ctx.send("lightsOn");
        } else {
            await ctx.send("moveFwd");
        }
    },
};
```

### Pattern: External APIs and ML

Since your app runs on a full computer (not a microcontroller), you have access to the entire Node.js ecosystem:

```ts
import type { OriginApp } from "@aorigin/core";

const app: OriginApp = {
    name: "weather-aware-bot",

    async loop(ctx) {
        // Fetch from an API (throttle this in production!)
        const res = await fetch("https://api.weather.example/current");
        const weather = await res.json();

        if (weather.isRaining) {
            await ctx.send("seekShelter");
        } else {
            await ctx.send("moveFwd");
        }
    },
};
```

For ML inference:

```ts
import type { OriginApp } from "@aorigin/core";
import { loadModel, predict } from "./my-ml-utils.js";

let model: any;

const app: OriginApp = {
    name: "gesture-driver",

    async setup() {
        model = await loadModel("gesture-classifier");
    },

    async loop(ctx) {
        const frame = await getCameraFrame();
        const gesture = await predict(model, frame);

        // Map gesture to action
        const actionMap: Record<string, string> = {
            "open_hand": "stop",
            "fist": "moveFwd",
            "point_left": "turnLeft",
            "point_right": "turnRight",
        };

        const action = actionMap[gesture] ?? "stop";
        await ctx.send(action);
    },
};
```

### Pattern: Logging and Data Collection

```ts
import { appendFileSync } from "fs";
import type { OriginApp } from "@aorigin/core";

const app: OriginApp = {
    name: "data-collector",

    setup() {
        appendFileSync("log.csv", "timestamp,distance,temperature\n");
    },

    async loop(ctx) {
        const readings = await ctx.read();
        const line = `${Date.now()},${readings.distance},${readings.temperature}\n`;
        appendFileSync("log.csv", line);
    },
};
```

---

## Running Apps

### Using the CLI runner

The included `run.ts` script handles connection and lifecycle:

```bash
npx tsx apps/run.ts --port /dev/ttyUSB0 --app my-app
```

- `--port` — the serial port path (required)
- `--app` — the app filename without `.ts` extension (default: `obstacle-avoider`)

Press `Ctrl+C` for graceful shutdown (calls `teardown()` and disconnects).

### Programmatic usage

For more control, use the Launcher directly:

```ts
import { Launcher } from "@aorigin/launcher";
import { SerialTransport } from "@aorigin/transport-serial";
import myApp from "./my-app.js";

const transport = new SerialTransport({ path: "/dev/ttyUSB0" });
const launcher = new Launcher(transport, { tickInterval: 100 });  // 10Hz

await launcher.connect();
await launcher.run(myApp);

// Swap apps at runtime:
// await launcher.run(otherApp);

// Clean shutdown:
// await launcher.disconnect();
```

### Adjusting tick rate

The default is 50ms (~20Hz). Adjust based on your needs:

- **10ms (100Hz)** — fast-response applications (PID control, fast sensors)
- **50ms (20Hz)** — general purpose (default)
- **100ms (10Hz)** — slow sensors, data logging
- **1000ms (1Hz)** — monitoring, periodic checks

```ts
const launcher = new Launcher(transport, { tickInterval: 10 });  // 100Hz
```

Note: the actual tick rate depends on how long your `loop()` takes. If `loop()` takes 200ms, you'll only get ~5Hz regardless of the interval setting.
