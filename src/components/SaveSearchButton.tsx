"use client";
import { useState, useTransition } from "react";
import { saveSearch } from "@/app/actions/searches";
import type { Filters } from "@/lib/filters";

export function SaveSearchButton({ filters, suggestedName }: { filters: Filters; suggestedName: string }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  if (Object.keys(filters).length === 0) return null;
  return (
    <span className="flex items-center gap-2">
      {msg && <span className="text-xs text-muted" role="status">{msg}</span>}
      <button
        type="button" className="btn btn-secondary" disabled={pending}
        onClick={() => start(async () => {
          const r = await saveSearch(suggestedName, filters);
          setMsg(r?.error ?? "Suchauftrag gespeichert");
        })}
      >
        Suche speichern
      </button>
    </span>
  );
}
