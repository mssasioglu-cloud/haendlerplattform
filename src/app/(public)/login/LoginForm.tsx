"use client";
import { useActionState } from "react";
import { signIn } from "@/app/actions/auth";
import { SubmitButton } from "@/components/SubmitButton";

export function LoginForm() {
  const [state, action] = useActionState(signIn, null);
  return (
    <form action={action} className="space-y-4">
      {state?.error && <p className="notice notice-error" role="alert">{state.error}</p>}
      <div>
        <label className="label" htmlFor="email">E-Mail</label>
        <input className="input" id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div>
        <label className="label" htmlFor="password">Passwort</label>
        <input className="input" id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      <SubmitButton className="btn btn-primary w-full">Anmelden</SubmitButton>
    </form>
  );
}
