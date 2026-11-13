"use client";
import { useActionState, useState } from "react";
import { makeOffer } from "@/app/actions/contact";

// Schnellgebot direkt aus der Ergebnisliste
export function QuickOffer({ listingId }: { listingId: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(makeOffer, null);
  if (state?.ok) return <span className="num block text-[11px] font-semibold text-emerald-700" role="status">Gebot gesendet</span>;
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="mt-1 cursor-pointer text-[11px] font-semibold underline decoration-accent decoration-2 underline-offset-2">
        Bieten
      </button>
    );
  }
  return (
    <form action={action} className="mt-1 flex items-center justify-end gap-1">
      <input type="hidden" name="listing_id" value={listingId} />
      <label className="sr-only" htmlFor={`qo-${listingId}`}>Gebot in Euro</label>
      <input id={`qo-${listingId}`} name="amount" inputMode="numeric" required autoFocus placeholder="€" className="input w-20 px-2 py-1 text-xs" />
      <button className="btn btn-primary btn-sm px-2 py-1" disabled={pending}>{pending ? "…" : "OK"}</button>
      {state?.error && <span className="sr-only" role="alert">{state.error}</span>}
    </form>
  );
}
