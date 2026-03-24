export function getServerUrl(): string {
  return process.env.ORIGIN_URL ?? "http://localhost:5050";
}

export async function api<T>(method: string, path: string, body?: unknown): Promise<T> {
  const url = `${getServerUrl()}${path}`;
  try {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const text = await res.text();
      console.error(`Error ${res.status}: ${text}`);
      process.exit(1);
    }
    return await res.json() as T;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ECONNREFUSED" ||
        (err as any)?.cause?.code === "ECONNREFUSED") {
      console.error("Origin server is not running. Start it with: origin up");
      process.exit(1);
    }
    throw err;
  }
}
