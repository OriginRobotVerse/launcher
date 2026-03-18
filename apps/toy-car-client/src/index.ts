const SERVER = process.env.ORIGIN_SERVER ?? "http://localhost:5050";
const DEVICE = process.env.ORIGIN_DEVICE ?? "toy-car";

// --- API helpers ---

async function api<T = unknown>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${SERVER}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status} ${path}: ${body}`);
  }
  return res.json() as Promise<T>;
}

async function action(name: string, params?: Record<string, number>) {
  return api(`/devices/${DEVICE}/actions`, {
    method: "POST",
    body: JSON.stringify({ name, params }),
  });
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// --- SSE listener ---

function listenEvents() {
  // Node 18+ native fetch doesn't support streaming SSE easily,
  // so we use the http module directly
  const url = new URL(`${SERVER}/devices/${DEVICE}/events`);
  const mod = url.protocol === "https:" ? "node:https" : "node:http";

  import(mod).then(({ get }) => {
    get(url.toString(), (res: any) => {
      console.log("[events] connected\n");
      let buffer = "";

      res.on("data", (chunk: Buffer) => {
        buffer += chunk.toString();
        const parts = buffer.split("\n\n");
        buffer = parts.pop()!;

        for (const part of parts) {
          const eventLine = part.split("\n").find((l: string) => l.startsWith("event: "));
          const dataLine = part.split("\n").find((l: string) => l.startsWith("data: "));
          if (eventLine && dataLine) {
            const event = eventLine.slice(7);
            const data = JSON.parse(dataLine.slice(6));
            console.log(`[${event}]`, JSON.stringify(data.data, null, 2));
          }
        }
      });

      res.on("end", () => console.log("[events] disconnected"));
    });
  });
}

// --- Main demo ---

async function main() {
  console.log(`Origin Toy Car Client`);
  console.log(`Server: ${SERVER}  Device: ${DEVICE}\n`);

  // 1. Discover
  console.log("--- Discovering devices ---");
  const discovery = await api<{ connected: any[]; failed: any[] }>("/discover", {
    method: "POST",
  });
  if (discovery.connected.length === 0) {
    console.error("No devices found:", discovery.failed);
    process.exit(1);
  }
  console.log(`Found: ${discovery.connected.map((d) => d.id).join(", ")}\n`);

  // 2. Device info
  const device = await api(`/devices/${DEVICE}`);
  console.log("--- Device info ---");
  console.log(JSON.stringify(device, null, 2), "\n");

  // 3. Start listening to events
  listenEvents();
  await sleep(500);

  // 4. Read initial state
  const state = await api(`/devices/${DEVICE}/state`);
  console.log("--- Current state ---");
  console.log(JSON.stringify(state, null, 2), "\n");

  // 5. Drive sequence
  console.log("--- Driving sequence ---\n");

  console.log("> Forward for 2s");
  await action("moveFwd", { speed: 255 });
  await sleep(2000);

  console.log("> Stop for 1s");
  await action("stop");
  await sleep(1000);

  console.log("> Turn right 90°");
  await action("moveRight", { speed: 255, angle: 90 });
  await sleep(1500);

  console.log("> Forward for 2s");
  await action("moveFwd", { speed: 255 });
  await sleep(2000);

  console.log("> Turn around (180°)");
  await action("moveRight", { speed: 255, angle: 180 });
  await sleep(1500);

  console.log("> Forward for 2s");
  await action("moveFwd", { speed: 255 });
  await sleep(2000);

  console.log("> Turn left 45°");
  await action("moveLeft", { speed: 255, angle: 45 });
  await sleep(1000);

  console.log("> Stop");
  await action("stop");

  // 6. Final state
  await sleep(500);
  const finalState = await api(`/devices/${DEVICE}/state`);
  console.log("\n--- Final state ---");
  console.log(JSON.stringify(finalState, null, 2));

  console.log("\nDone! (Ctrl+C to stop event stream)");
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
