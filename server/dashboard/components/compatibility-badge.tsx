interface CompatResult {
  compatible: boolean;
  missingActions: string[];
  missingState: string[];
  warnings: string[];
}

export function CompatibilityBadge({ deviceId, compat }: { deviceId: string; compat: CompatResult }) {
  return (
    <div className={`border p-3 ${compat.compatible ? "border-phosphor/30 bg-phosphor-glow" : "border-red-500/30 bg-red-500/5"}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className={`text-[11px] ${compat.compatible ? "text-phosphor" : "text-red-400"}`}>
          {compat.compatible ? "✓" : "✗"}
        </span>
        <span className="text-[11px] text-signal font-medium">{deviceId}</span>
      </div>
      {compat.missingActions.length > 0 && (
        <p className="text-[10px] text-red-400 mt-1">
          Missing actions: {compat.missingActions.join(", ")}
        </p>
      )}
      {compat.missingState.length > 0 && (
        <p className="text-[10px] text-red-400 mt-1">
          Missing state: {compat.missingState.join(", ")}
        </p>
      )}
      {compat.warnings.map((w, i) => (
        <p key={i} className="text-[10px] text-amber-600 mt-1">{w}</p>
      ))}
    </div>
  );
}
