"use client";
import { useActionState } from "react";
import { updateProfile } from "@/app/actions/misc";
import { SubmitButton } from "@/components/SubmitButton";
import type { Dealer } from "@/lib/types";

export function ProfileForm({ dealer: d }: { dealer: Dealer }) {
  const [state, action] = useActionState(updateProfile, null);
  const field = (name: keyof Dealer, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label className="label" htmlFor={`p-${name}`}>{label}</label>
      <input className="input" id={`p-${name}`} name={name} defaultValue={String(d[name] ?? "")} {...props} />
    </div>
  );
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      {state?.error && <p className="notice notice-error sm:col-span-2" role="alert">{state.error}</p>}
      {state?.ok && <p className="notice notice-ok sm:col-span-2" role="status">{state.ok}</p>}
      {field("company_name", "Firma", { required: true, maxLength: 120 })}
      {field("contact_name", "Ansprechpartner", { required: true, maxLength: 120 })}
      {field("street", "Straße und Hausnummer", { maxLength: 120 })}
      {field("zip", "PLZ", { required: true, pattern: "[0-9]{5}", maxLength: 5, inputMode: "numeric" })}
      {field("phone", "Telefon", { type: "tel", maxLength: 30 })}
      {field("whatsapp", "WhatsApp-Nummer", { type: "tel", maxLength: 30 })}
      <div className="sm:col-span-2">
        <label className="label" htmlFor="p-about">Über uns (für andere Händler sichtbar)</label>
        <textarea className="input min-h-24" id="p-about" name="about" defaultValue={d.about} maxLength={2000} />
      </div>
      <div className="sm:col-span-2"><SubmitButton>Profil speichern</SubmitButton></div>
    </form>
  );
}
