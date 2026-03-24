export function StatusDot({ status }: { status: "connected" | "offline" | "running" | "error" | "starting" }) {
  const chars: Record<string, string> = {
    connected: "●",
    offline: "○",
    running: "▶",
    error: "✗",
    starting: "◌",
  };

  const colors: Record<string, string> = {
    connected: "text-phosphor",
    offline: "text-dim-dark",
    running: "text-phosphor-bright",
    error: "text-red-500",
    starting: "text-phosphor-dim",
  };

  return (
    <span className={`${colors[status]} text-xs`}>
      {chars[status] ?? "○"}
    </span>
  );
}
