"use client";
import Link from "next/link";
import { useActionState } from "react";
import { signUp } from "@/app/actions/auth";
import { SubmitButton } from "@/components/SubmitButton";

export function RegisterForm() {
  const [state, action] = useActionState(signUp, null);
  if (state?.ok) return <p className="notice notice-ok" role="status">{state.ok}</p>;
  return (
    <form action={action} className="space-y-4">
      {state?.error && <p className="notice notice-error" role="alert">{state.error}</p>}
      <div>
        <label className="label" htmlFor="email">Geschäftliche E-Mail</label>
        <input className="input" id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div>
        <label className="label" htmlFor="password">Passwort (mind. 8 Zeichen)</label>
        <input className="input" id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
      </div>
      <label className="flex gap-2 text-sm">
        <input type="checkbox" name="b2b" className="mt-0.5" required />
        <span>Ich handle ausschließlich als Unternehmer im Sinne des § 14 BGB (Gewerbetreibender).</span>
      </label>
      <label className="flex gap-2 text-sm">
        <input type="checkbox" name="agb" className="mt-0.5" required />
        <span>
          Ich akzeptiere die <Link href="/agb" target="_blank" className="font-semibold text-brand-600">AGB</Link> und habe die{" "}
          <Link href="/datenschutz" target="_blank" className="font-semibold text-brand-600">Datenschutzerklärung</Link> gelesen.
        </span>
      </label>
      <SubmitButton className="btn btn-primary w-full">Weiter</SubmitButton>
    </form>
  );
}
