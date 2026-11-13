"use client";
import { useState } from "react";

// Textfeld mit Kopieren-Knopf (z. B. für den persönlichen Einladungslink)
export function CopyField({ value, label }: { value: string; label: string }) {
  const [msg, setMsg] = useState("");
  return (
    <div>
      <label className="label" htmlFor="copy-field">{label}</label>
      <div className="flex gap-2">
        <input id="copy-field" readOnly value={value} className="input font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
        <button type="button" className="btn btn-dark" onClick={async (e) => {
          try { await navigator.clipboard.writeText(value); setMsg("Kopiert"); }
          catch { (e.currentTarget.previousElementSibling as HTMLInputElement | null)?.select(); setMsg("Markiert: Strg+C drücken"); }
        }}>Kopieren</button>
      </div>
      <p className="mt-1 h-4 text-xs text-muted" role="status">{msg}</p>
    </div>
  );
}
