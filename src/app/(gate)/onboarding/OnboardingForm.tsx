"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { completeOnboarding } from "@/app/actions/auth";

export function OnboardingForm({ userId }: { userId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const file = fd.get("license") as File | null;
    if (!file || file.size === 0) return setError("Bitte den Gewerbenachweis auswählen.");
    if (file.size > 10 * 1024 * 1024) return setError("Die Datei ist größer als 10 MB.");
    setBusy(true);
    try {
      const ext = (file.name.split(".").pop() || "pdf").toLowerCase().replace(/[^a-z0-9]/g, "");
      const path = `${userId}/gewerbenachweis-${Date.now()}.${ext}`;
      const { error: upErr } = await createClient().storage.from("gewerbescheine").upload(path, file);
      if (upErr) {
        setError("Upload fehlgeschlagen. Erlaubt sind PDF, JPG, PNG und WebP bis 10 MB.");
        return;
      }
      const g = (k: string) => String(fd.get(k) ?? "");
      const res = await completeOnboarding({
        company_name: g("company_name"), contact_name: g("contact_name"), street: g("street"), zip: g("zip"),
        phone: g("phone"), whatsapp: g("whatsapp"), vat_id: g("vat_id"), license_path: path,
      });
      if (res?.error) setError(res.error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
      {error && <p className="notice notice-error sm:col-span-2" role="alert">{error}</p>}
      <div className="sm:col-span-2">
        <label className="label" htmlFor="company_name">Firma</label>
        <input className="input" id="company_name" name="company_name" required maxLength={120} />
      </div>
      <div>
        <label className="label" htmlFor="contact_name">Ansprechpartner</label>
        <input className="input" id="contact_name" name="contact_name" required maxLength={120} />
      </div>
      <div>
        <label className="label" htmlFor="vat_id">USt-IdNr. (falls vorhanden)</label>
        <input className="input" id="vat_id" name="vat_id" placeholder="DE123456789" maxLength={20} />
      </div>
      <div>
        <label className="label" htmlFor="street">Straße und Hausnummer</label>
        <input className="input" id="street" name="street" required maxLength={120} />
      </div>
      <div>
        <label className="label" htmlFor="zip">PLZ</label>
        <input className="input" id="zip" name="zip" inputMode="numeric" pattern="[0-9]{5}" maxLength={5} required />
      </div>
      <div>
        <label className="label" htmlFor="phone">Telefon</label>
        <input className="input" id="phone" name="phone" type="tel" required maxLength={30} />
      </div>
      <div>
        <label className="label" htmlFor="whatsapp">WhatsApp-Nummer (optional)</label>
        <input className="input" id="whatsapp" name="whatsapp" type="tel" maxLength={30} />
      </div>
      <div className="sm:col-span-2">
        <label className="label" htmlFor="license">Gewerbenachweis (Gewerbeanmeldung oder Handelsregisterauszug, PDF oder Foto)</label>
        <input className="input" id="license" name="license" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" required />
      </div>
      <div className="sm:col-span-2">
        <button className="btn btn-primary" disabled={busy}>{busy ? "Wird gesendet …" : "Zur Prüfung einreichen"}</button>
      </div>
    </form>
  );
}
