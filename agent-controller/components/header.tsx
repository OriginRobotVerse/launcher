"use client";

export function Header() {
  return (
    <header
      style={{
        height: 56,
        borderBottom: "1px solid var(--wire)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        background: "rgba(10, 10, 10, 0.9)",
        backdropFilter: "blur(12px)",
        flexShrink: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="var(--wire-bright)" strokeWidth="1.5" />
          <line x1="12" y1="2" x2="12" y2="22" stroke="var(--phosphor)" strokeWidth="1" opacity="0.6" />
          <line x1="2" y1="12" x2="22" y2="12" stroke="var(--phosphor)" strokeWidth="1" opacity="0.6" />
          <circle cx="12" cy="12" r="3" fill="var(--phosphor)" />
        </svg>
        <span
          style={{
            fontSize: 13,
            fontWeight: 500,
            letterSpacing: "0.05em",
            color: "var(--signal)",
          }}
        >
          origin<span style={{ color: "var(--dim)" }}>/</span>
          <span style={{ color: "var(--phosphor)" }}>agent</span>
        </span>
      </div>

      <div
        style={{
          fontSize: 11,
          color: "var(--dim-dark)",
          letterSpacing: "0.06em",
        }}
      >
        toy-car controller
      </div>
    </header>
  );
}
