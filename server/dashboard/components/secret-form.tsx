"use client";

import { useState } from "react";
import { setAppSecrets } from "@/lib/origin-api";

interface SecretInfo {
  key: string;
  description: string;
  required: boolean;
  configured: boolean;
}

export function SecretForm({ appId, secrets, onSaved }: { appId: string; secrets: SecretInfo[]; onSaved?: () => void }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const toSave: Record<string, string> = {};
    for (const [key, value] of Object.entries(values)) {
      if (value.trim()) toSave[key] = value.trim();
    }
    if (Object.keys(toSave).length === 0) return;

    setSaving(true);
    try {
      await setAppSecrets(appId, toSave);
      setValues({});
      onSaved?.();
    } catch (err) {
      console.error("Failed to save secrets:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      {secrets.map((s) => (
        <div key={s.key} className="flex items-start gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-medium text-signal">{s.key}</span>
              {s.configured && <span className="text-[10px] text-phosphor">configured</span>}
              {!s.configured && s.required && <span className="text-[10px] text-amber-600">required</span>}
              {!s.configured && !s.required && <span className="text-[10px] text-dim">optional</span>}
            </div>
            <p className="text-[10px] text-dim mb-1">{s.description}</p>
            <input
              type="password"
              placeholder={s.configured ? "••••••••" : `Enter ${s.key}`}
              value={values[s.key] ?? ""}
              onChange={(e) => setValues((prev) => ({ ...prev, [s.key]: e.target.value }))}
              className="w-full bg-void border border-wire px-3 py-1.5 text-[11px] text-signal placeholder:text-dim-dark focus:border-phosphor focus:outline-none"
            />
          </div>
        </div>
      ))}
      <button
        onClick={handleSave}
        disabled={saving || Object.values(values).every((v) => !v.trim())}
        className="border border-wire px-4 py-1.5 text-[11px] text-phosphor hover:bg-phosphor-glow disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {saving ? "SAVING..." : "SAVE SECRETS"}
      </button>
    </div>
  );
}
