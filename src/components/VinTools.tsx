"use client";
import { useState } from "react";

// FIN-Box: Fahrgestellnummer groß anzeigen und mit einem Klick kopieren.
export function VinTools({ vin }: { vin: string }) {
  const [msg, setMsg] = useState("");
  async function copy() {
    try { await navigator.clipboard.writeText(vin); setMsg("FIN kopiert"); }
    catch { setMsg("Bitte die FIN markieren und kopieren"); }
  }
  return (
    <div className="card overflow-hidden">
      <div className="bg-brand-800 px-5 py-3 text-white">
        <p className="eyebrow text-brand-200">Fahrgestellnummer (FIN)</p>
        <p className="num mt-1 select-all break-all text-lg font-semibold tracking-wider" data-testid="vin">{vin}</p>
      </div>
      <div className="space-y-2 p-5">
        <button type="button" onClick={copy} className="btn btn-primary w-full">FIN kopieren</button>
        <p className="min-h-4 text-xs text-muted" role="status">
          {msg ? <span className="font-semibold text-emerald-700">{msg}</span> : "Für Historie und Ausstattung in Ihren eigenen Programmen."}
        </p>
      </div>
    </div>
  );
}
