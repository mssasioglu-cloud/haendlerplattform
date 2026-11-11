import Link from "next/link";
import type { ListingCard as Card } from "@/lib/types";
import { eur, km, monthYear, prices, imageUrl } from "@/lib/format";
import { VAT_LABEL } from "@/lib/vehicle";
import { FavoriteButton } from "@/components/FavoriteButton";

export function ListingCard({ l, isFavorite, showFavorite = true }: { l: Card; isFavorite?: boolean; showFavorite?: boolean }) {
  const p = prices(l);
  const img = imageUrl(l.cover_path);
  const title = `${l.make} ${l.model}${l.variant ? " " + l.variant : ""}`;
  return (
    <article className="card relative flex flex-col overflow-hidden sm:flex-row">
      <Link href={`/inserat/${l.id}`} className="relative block aspect-[4/3] shrink-0 bg-brand-50 sm:w-60">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt={title} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <span className="flex h-full items-center justify-center text-sm text-muted">Kein Foto</span>
        )}
        {l.urgent && <span className="badge absolute left-2 top-2 bg-urgent text-white">Muss schnell weg</span>}
        {l.status === "reserviert" && <span className="badge absolute bottom-2 left-2 bg-ink text-white">Reserviert</span>}
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="min-w-0 text-base font-semibold leading-snug">
            <Link href={`/inserat/${l.id}`} className="hover:text-brand-600">{title}</Link>
          </h3>
          <div className="shrink-0 text-right">
            <p className="text-lg font-bold tabular-nums">{eur(p.gross)}</p>
            <p className="text-xs text-muted">{p.net != null ? `${eur(p.net)} netto` : "§ 25a"}</p>
          </div>
        </div>
        <p className="text-sm text-muted">
          {[`EZ ${monthYear(l.first_registration)}`, km(l.mileage), l.fuel, l.transmission, l.power_kw ? `${l.power_kw} kW` : null]
            .filter(Boolean).join(" · ")}
        </p>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
          <span>
            {l.zip} {l.city}
            {l.distance != null && ` · ${Math.round(l.distance)} km entfernt`}
            {l.company_name && ` · ${l.company_name}`}
          </span>
          <span className="flex items-center gap-2">
            <span className="badge bg-brand-50 text-brand-800">{VAT_LABEL[l.vat_type]?.split(" (")[0]}</span>
            {showFavorite && <FavoriteButton listingId={l.id} initial={!!isFavorite} />}
          </span>
        </div>
      </div>
    </article>
  );
}
