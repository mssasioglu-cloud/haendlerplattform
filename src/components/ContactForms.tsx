"use client";
import { useActionState } from "react";
import { startConversation, makeOffer } from "@/app/actions/contact";
import { reportListing } from "@/app/actions/listings";
import { SubmitButton } from "@/components/SubmitButton";

export function MessageForm({ listingId, wantedId, placeholder }: { listingId?: string; wantedId?: string; placeholder?: string }) {
  const [state, action] = useActionState(startConversation, null);
  return (
    <form action={action} className="space-y-2">
      {listingId && <input type="hidden" name="listing_id" value={listingId} />}
      {wantedId && <input type="hidden" name="wanted_id" value={wantedId} />}
      {state?.error && <p className="notice notice-error" role="alert">{state.error}</p>}
      <label className="label" htmlFor={`msg-${listingId ?? wantedId}`}>Nachricht</label>
      <textarea className="input min-h-20" id={`msg-${listingId ?? wantedId}`} name="body" required maxLength={4000}
        placeholder={placeholder ?? "Ist das Fahrzeug noch verfügbar?"} />
      <SubmitButton className="btn btn-primary w-full">Nachricht senden</SubmitButton>
    </form>
  );
}

export function OfferForm({ listingId }: { listingId: string }) {
  const [state, action] = useActionState(makeOffer, null);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="listing_id" value={listingId} />
      {state?.error && <p className="notice notice-error" role="alert">{state.error}</p>}
      {state?.ok && <p className="notice notice-ok" role="status">{state.ok}</p>}
      <label className="label" htmlFor="offer-amount">Ihr Gebot (€, Endpreis wie im Inserat ausgewiesen)</label>
      <input className="input" id="offer-amount" name="amount" inputMode="numeric" required />
      <label className="label" htmlFor="offer-note">Anmerkung (optional)</label>
      <input className="input" id="offer-note" name="note" maxLength={500} placeholder="z. B. Abholung diese Woche möglich" />
      <SubmitButton className="btn btn-secondary w-full">Gebot abgeben</SubmitButton>
    </form>
  );
}

export function ReportForm({ listingId }: { listingId: string }) {
  const [state, action] = useActionState(reportListing, null);
  if (state?.ok) return <p className="notice notice-ok" role="status">{state.ok}</p>;
  return (
    <details className="text-sm">
      <summary className="cursor-pointer text-muted">Inserat melden</summary>
      <form action={action} className="mt-2 space-y-2">
        <input type="hidden" name="id" value={listingId} />
        {state?.error && <p className="notice notice-error" role="alert">{state.error}</p>}
        <label className="label" htmlFor="report-reason">Was stimmt nicht?</label>
        <textarea className="input" id="report-reason" name="reason" required maxLength={1000} />
        <SubmitButton className="btn btn-secondary btn-sm">Meldung senden</SubmitButton>
      </form>
    </details>
  );
}
