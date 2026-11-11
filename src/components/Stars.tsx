export function Stars({ value, count }: { value: number | null; count?: number }) {
  if (value == null) return <span className="text-xs text-muted">Noch keine Bewertungen</span>;
  const full = Math.round(value);
  return (
    <span className="inline-flex items-center gap-1 text-sm">
      <span aria-hidden className="text-amber-500">{"★".repeat(full)}<span className="text-line">{"★".repeat(5 - full)}</span></span>
      <span className="font-semibold">{value.toLocaleString("de-DE", { maximumFractionDigits: 1 })}</span>
      <span className="sr-only">von 5 Sternen</span>
      {count != null && <span className="text-xs text-muted">({count})</span>}
    </span>
  );
}
