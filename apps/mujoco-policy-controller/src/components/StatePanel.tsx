interface Props {
  state: Record<string, number>;
  lastAction: Record<string, number>;
  filter: string;
  onFilterChange: (v: string) => void;
}

export function StatePanel({ state, lastAction, filter, onFilterChange }: Props) {
  const entries = Object.entries(state);
  const filtered = filter
    ? entries.filter(([k]) => k.toLowerCase().includes(filter.toLowerCase()))
    : entries;

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        minHeight: 0,
        flex: 1,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={{ fontWeight: 600, fontSize: "14px" }}>
          State ({filtered.length}/{entries.length})
        </span>
        <input
          type="text"
          placeholder="Filter keys..."
          value={filter}
          onChange={(e) => onFilterChange(e.target.value)}
          style={{
            background: "var(--bg)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            color: "var(--text)",
            padding: "6px 10px",
            fontSize: "13px",
            width: "180px",
            outline: "none",
          }}
        />
      </div>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "2px",
          fontSize: "13px",
          fontFamily: "ui-monospace, monospace",
        }}
      >
        {filtered.length === 0 && (
          <div style={{ color: "var(--text-dim)", padding: "8px 0" }}>
            {entries.length === 0
              ? "No state data yet"
              : "No keys match filter"}
          </div>
        )}
        {filtered.map(([key, value]) => {
          const isActive = key in lastAction;
          return (
            <div
              key={key}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "3px 6px",
                borderRadius: "4px",
                background: isActive
                  ? "rgba(108, 92, 231, 0.1)"
                  : "transparent",
              }}
            >
              <span style={{ color: "var(--text-dim)" }}>{key}</span>
              <span
                style={{
                  color: isActive ? "var(--accent)" : "var(--text)",
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                {value.toFixed(4)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
