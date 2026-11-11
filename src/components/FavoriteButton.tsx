"use client";
import { useState, useTransition } from "react";
import { toggleFavorite } from "@/app/actions/listings";

export function FavoriteButton({ listingId, initial, withLabel }: { listingId: string; initial: boolean; withLabel?: boolean }) {
  const [on, setOn] = useState(initial);
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      aria-pressed={on}
      aria-label={on ? "Von der Merkliste entfernen" : "Auf die Merkliste setzen"}
      onClick={() => start(async () => { const r = await toggleFavorite(listingId); if (r != null) setOn(r); })}
      className={withLabel ? "btn btn-secondary" : "cursor-pointer rounded-full p-1 hover:bg-brand-50"}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill={on ? "#d9480f" : "none"} stroke={on ? "#d9480f" : "currentColor"} strokeWidth="2" aria-hidden>
        <path d="M12 21l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.18L12 21z" />
      </svg>
      {withLabel && (on ? "Gemerkt" : "Merken")}
    </button>
  );
}
