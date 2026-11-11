"use client";
import { useActionState } from "react";
import { saveReview } from "@/app/actions/misc";
import { SubmitButton } from "@/components/SubmitButton";

export function ReviewForm({ dealerId, rating, comment }: { dealerId: string; rating?: number; comment?: string }) {
  const [state, action] = useActionState(saveReview, null);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="dealer_id" value={dealerId} />
      {state?.error && <p className="notice notice-error" role="alert">{state.error}</p>}
      {state?.ok && <p className="notice notice-ok" role="status">{state.ok}</p>}
      <label className="label" htmlFor="r-rating">{rating ? "Ihre Bewertung ändern" : "Händler bewerten"}</label>
      <select className="input" id="r-rating" name="rating" defaultValue={rating ?? 5}>
        {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} {n === 1 ? "Stern" : "Sterne"}</option>)}
      </select>
      <label className="label" htmlFor="r-comment">Kommentar (optional)</label>
      <textarea className="input" id="r-comment" name="comment" defaultValue={comment} maxLength={1000} placeholder="Wie lief das Geschäft?" />
      <SubmitButton className="btn btn-secondary btn-sm">Bewertung speichern</SubmitButton>
    </form>
  );
}
