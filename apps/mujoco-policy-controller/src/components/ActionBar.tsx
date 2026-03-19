import { api } from "../api.ts";

export function ActionBar() {
  const quickAction = async (name: string) => {
    try {
      await api.sendAction(name);
    } catch (e) {
      console.error("Action failed:", e);
    }
  };

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
      }}
    >
      <span style={{ fontWeight: 600, fontSize: "14px" }}>Quick Actions</span>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        <ActionButton label="Reset Sim" onClick={() => quickAction("reset")} />
        <ActionButton
          label="Pause / Resume"
          onClick={() => quickAction("pause")}
        />
      </div>
    </div>
  );
}

function ActionButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "var(--bg)",
        color: "var(--text)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-sm)",
        padding: "7px 14px",
        fontSize: "13px",
        fontWeight: 500,
        transition: "border-color 0.15s",
      }}
    >
      {label}
    </button>
  );
}
