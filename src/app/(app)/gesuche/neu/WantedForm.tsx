"use client";
import { useActionState } from "react";
import { createWanted } from "@/app/actions/misc";
import { SubmitButton } from "@/components/SubmitButton";
import { CATEGORIES, ALL_MAKES } from "@/lib/vehicle";

export function WantedForm() {
  const [state, action] = useActionState(createWanted, null);
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      {state?.error && <p className="notice notice-error sm:col-span-2" role="alert">{state.error}</p>}
      <div className="sm:col-span-2">
        <label className="label" htmlFor="w-title">Was suchen Sie? *</label>
        <input className="input" id="w-title" name="title" required minLength={3} maxLength={140} placeholder="z. B. Suche Golf 7 Variant Diesel bis 12.000 €" />
      </div>
      <div>
        <label className="label" htmlFor="w-cat">Fahrzeugart</label>
        <select className="input" id="w-cat" name="category" defaultValue="">
          <option value="">Egal</option>
          {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="w-make">Marke</label>
        <input className="input" id="w-make" name="make" list="w-makes" maxLength={60} />
        <datalist id="w-makes">{ALL_MAKES.map((m) => <option key={m} value={m} />)}</datalist>
      </div>
      <div>
        <label className="label" htmlFor="w-model">Modell</label>
        <input className="input" id="w-model" name="model" maxLength={80} />
      </div>
      <div>
        <label className="label" htmlFor="w-price">Preis bis (€)</label>
        <input className="input" id="w-price" name="max_price" inputMode="numeric" />
      </div>
      <div>
        <label className="label" htmlFor="w-km">Kilometer bis</label>
        <input className="input" id="w-km" name="max_km" inputMode="numeric" />
      </div>
      <div>
        <label className="label" htmlFor="w-year">Erstzulassung ab (Jahr)</label>
        <input className="input" id="w-year" name="min_year" inputMode="numeric" maxLength={4} />
      </div>
      <div className="sm:col-span-2">
        <label className="label" htmlFor="w-desc">Details</label>
        <textarea className="input min-h-24" id="w-desc" name="description" maxLength={2000} placeholder="Ausstattung, Zustand, Zeitrahmen …" />
      </div>
      <div className="sm:col-span-2"><SubmitButton>Gesuch veröffentlichen</SubmitButton></div>
    </form>
  );
}
