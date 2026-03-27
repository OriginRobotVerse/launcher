"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { installApp } from "@/lib/origin-api";

type Step = "input" | "installing" | "done" | "error";

export default function InstallPage() {
  const router = useRouter();
  const [source, setSource] = useState("");
  const [name, setName] = useState("");
  const [step, setStep] = useState<Step>("input");
  const [result, setResult] = useState<{ id: string; name: string; version: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleInstall = async () => {
    if (!source.trim()) return;
    setStep("installing");
    setError(null);

    try {
      const res = await installApp({ source: source.trim(), name: name.trim() || undefined });
      setResult(res.app);
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStep("error");
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-xs text-dim uppercase tracking-wider mb-6">Install App</h1>

      {step === "input" && (
        <div className="space-y-4">
          <div>
            <label className="text-[10px] text-dim uppercase tracking-wider block mb-1.5">Source</label>
            <input
              type="text"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="https://github.com/someone/robot-app"
              className="w-full bg-void border border-wire px-3 py-2 text-[11px] text-signal placeholder:text-dim-dark focus:border-phosphor focus:outline-none"
            />
            <p className="text-[10px] text-dim mt-1">GitHub URL, local path, or tarball URL</p>
          </div>

          <div>
            <label className="text-[10px] text-dim uppercase tracking-wider block mb-1.5">
              Override ID <span className="text-dim-dark">(optional)</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="my-custom-name"
              className="w-full bg-void border border-wire px-3 py-2 text-[11px] text-signal placeholder:text-dim-dark focus:border-phosphor focus:outline-none"
            />
          </div>

          <button
            onClick={handleInstall}
            disabled={!source.trim()}
            className="border border-phosphor/30 px-6 py-2 text-[11px] text-phosphor hover:bg-phosphor-glow disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            INSTALL
          </button>

          <div className="border border-wire bg-panel p-4 mt-2">
            <p className="text-[11px] text-dim">
              Browse and install apps from the{" "}
              <a
                href="https://store.origin-industries.systems"
                target="_blank"
                rel="noopener noreferrer"
                className="text-phosphor hover:underline"
              >
                Origin Marketplace
              </a>
              , or request new apps from the community.
            </p>
          </div>
        </div>
      )}

      {step === "installing" && (
        <div className="border border-wire bg-panel p-6">
          <p className="text-[11px] text-phosphor">Installing from {source}...</p>
          <p className="text-[10px] text-dim mt-2">Cloning repository and validating manifest</p>
        </div>
      )}

      {step === "done" && result && (
        <div className="border border-phosphor/30 bg-phosphor-glow p-6 space-y-3">
          <p className="text-[11px] text-phosphor font-medium">
            Installed {result.name} (v{result.version})
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => router.push(`/apps/detail?id=${encodeURIComponent(result.id)}`)}
              className="border border-wire px-4 py-1.5 text-[11px] text-phosphor hover:bg-phosphor-glow-strong transition-colors"
            >
              VIEW APP
            </button>
            <button
              onClick={() => { setSource(""); setName(""); setStep("input"); setResult(null); }}
              className="border border-wire px-4 py-1.5 text-[11px] text-dim hover:text-signal transition-colors"
            >
              INSTALL ANOTHER
            </button>
          </div>
        </div>
      )}

      {step === "error" && (
        <div className="border border-red-500/30 bg-red-500/5 p-6 space-y-3">
          <p className="text-[11px] text-red-400">Installation failed</p>
          <p className="text-[10px] text-red-400/70">{error}</p>
          <button
            onClick={() => setStep("input")}
            className="border border-wire px-4 py-1.5 text-[11px] text-dim hover:text-signal transition-colors"
          >
            TRY AGAIN
          </button>
        </div>
      )}
    </div>
  );
}
