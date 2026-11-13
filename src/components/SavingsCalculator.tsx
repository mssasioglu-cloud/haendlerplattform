"use client";
import { useState } from "react";

// Ersparnisrechner für die Startseite: bisherige Portalkosten gegen die Flatrate
export function SavingsCalculator({ priceMonthly }: { priceMonthly: number }) {
  const [current, setCurrent] = useState("3500");
  const n = Math.max(0, Number.parseInt(current.replace(/\D/g, ""), 10) || 0);
  const saving = Math.max(0, Math.round((n - priceMonthly) * 12));
  return (
    <div className="grid gap-6 rounded-lg bg-brand-800 p-6 text-white md:grid-cols-[1fr_auto] md:items-end">
      <div>
        <label htmlFor="calc-current" className="eyebrow text-brand-200">Was zahlen Sie heute pro Monat für Inserate?</label>
        <div className="mt-2 flex items-center gap-2">
          <input id="calc-current" inputMode="numeric" value={current} onChange={(e) => setCurrent(e.target.value)}
            className="w-40 rounded-md border border-white/20 bg-brand-900 px-3 py-2.5 font-mono text-lg text-white focus:outline-2 focus:outline-accent" />
          <span className="text-brand-200">€ im Monat</span>
        </div>
        <input type="range" min={0} max={8000} step={100} value={Math.min(n, 8000)} onChange={(e) => setCurrent(e.target.value)}
          aria-label="Monatliche Kosten" className="mt-4 w-full accent-[#f2b705]" />
      </div>
      <div className="md:text-right" aria-live="polite">
        <p className="eyebrow text-brand-200">Ersparnis pro Jahr</p>
        <p className="price mt-1 text-6xl text-accent">{saving.toLocaleString("de-DE")} €</p>
        <p className="mt-1 text-xs text-brand-200">gegenüber {priceMonthly.toLocaleString("de-DE", { style: "currency", currency: "EUR" })} im Monat, zzgl. MwSt.</p>
      </div>
    </div>
  );
}
