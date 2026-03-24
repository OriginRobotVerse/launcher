"use client";

interface StateGroup {
  label: string;
  keys: string[];
}

interface StateViewerProps {
  state: Record<string, number>;
  groups?: StateGroup[];
}

export function StateViewer({ state, groups }: StateViewerProps) {
  if (groups && groups.length > 0) {
    return (
      <div className="space-y-4">
        {groups.map((group) => (
          <div key={group.label}>
            <h4 className="text-[11px] text-dim uppercase tracking-wider mb-2">{group.label}</h4>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1">
              {group.keys.map((key) => (
                <div key={key} className="flex justify-between text-[11px]">
                  <span className="text-dim">{key}</span>
                  <span className="text-signal font-medium tabular-nums">
                    {state[key] !== undefined ? Number(state[key]).toFixed(3) : "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Flat display if no groups
  const entries = Object.entries(state);
  if (entries.length === 0) {
    return <p className="text-[11px] text-dim">No state data</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-1">
      {entries.map(([key, value]) => (
        <div key={key} className="flex justify-between text-[11px]">
          <span className="text-dim">{key}</span>
          <span className="text-signal font-medium tabular-nums">
            {Number(value).toFixed(3)}
          </span>
        </div>
      ))}
    </div>
  );
}
