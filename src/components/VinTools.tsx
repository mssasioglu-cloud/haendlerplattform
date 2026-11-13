"use client";
import { useState } from "react";
import { VIN_TOOLS } from "@/lib/vin";

// FIN mit Kopieren-Knopf und direkten Verweisen auf Historien-Dienste.
// Beim Klick auf einen Dienst wird die FIN zusätzlich kopiert, damit sie dort nur eingefügt werden muss.
export function VinTools({ vin }: { vin: string }) {
  const [msg, setMsg] = useState("");
  async function copy() {
    try { await navigator.clipboard.writeText(vin); setMsg("FIN kopiert"); return true; }
    catch { setMsg("Bitte die FIN markieren und kopieren"); return false; }
  }
  return (
    <div className="card overflow-hidden">
      <div className="bg-brand-800 px-5 py-3 text-white">
        <p className="eyebrow text-brand-200">Fahrgestellnummer (FIN)</p>
        <p className="num mt-1 select-all break-all text-lg font-semibold tracking-wider" data-testid="vin">{vin}</p>
      </div>
      <div className="space-y-2 p-5">
        <button type="button" onClick={copy} className="btn btn-primary w-full">FIN kopieren</button>
        {VIN_TOOLS.map((t) => (
          <a key={t.name} href={t.url(vin)} target="_blank" rel="noopener noreferrer" onClick={() => { void copy(); }}
            className="btn btn-secondary w-full justify-between">
            <span>{t.name}</span>
            <span className="text-xs font-normal text-muted">{t.hint}</span>
          </a>
        ))}
        <p className="h-4 text-xs font-semibold text-emerald-700" role="status">{msg}</p>
        <p className="text-xs text-muted">
          Historie und Ausstattung rufen Sie mit Ihren eigenen Zugängen ab, zum Beispiel bei carVertical, DAT oder
          im Herstellerportal. Die FIN ist beim Klick bereits kopiert.
        </p>
      </div>
    </div>
  );
}
