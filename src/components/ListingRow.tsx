import Link from "next/link";
import type { ListingCard as Card } from "@/lib/types";
import { eur, km, monthYear, prices, imageUrl, standzeit, standDays, priceDrop } from "@/lib/format";
import { QuickOffer } from "@/components/QuickOffer";
import { COMPLETE_FROM } from "@/lib/quality";
import { FavoriteButton } from "@/components/FavoriteButton";

// Tabellenansicht der Suche: viele Fahrzeuge auf einen Blick vergleichen.
// Auf schmalen Bildschirmen bleiben Foto, Fahrzeug und Preis; die übrigen Angaben rücken unter den Titel.
export function ListingTable({ rows, favorites, myId }: { rows: Card[]; favorites: Set<string>; myId?: string }) {
  return (
    <div className="card overflow-hidden">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-brand-800 text-left text-brand-200">
          <tr className="font-mono text-[11px] uppercase tracking-wider">
            <th scope="col" className="w-20 py-2.5 pl-3 font-medium sm:w-28"><span className="sr-only">Foto</span></th>
            <th scope="col" className="w-full px-3 py-2.5 font-medium">Fahrzeug</th>
            <th scope="col" className="hidden px-3 py-2.5 font-medium md:table-cell">EZ</th>
            <th scope="col" className="hidden px-3 py-2.5 text-right font-medium md:table-cell">km</th>
            <th scope="col" className="hidden px-3 py-2.5 font-medium xl:table-cell">Standort</th>
            <th scope="col" className="hidden px-3 py-2.5 font-medium md:table-cell lg:hidden xl:table-cell">Online</th>
            <th scope="col" className="px-3 py-2.5 text-right font-medium">Preis</th>
            <th scope="col" className="w-10 py-2.5 pr-2"><span className="sr-only">Merken</span></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((l) => {
            const p = prices(l);
            const img = imageUrl(l.cover_path);
            const title = `${l.make} ${l.model}`;
            const fresh = standDays(l.created_at) <= 2;
            const drop = priceDrop(l);
            return (
              <tr key={l.id} className="group border-t border-line align-middle hover:bg-accent-50">
                <td className="py-2 pl-3">
                  <Link href={`/inserat/${l.id}`} tabIndex={-1} aria-hidden className="block aspect-[4/3] w-16 overflow-hidden rounded bg-brand-100 sm:w-24">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {img && <img src={img} alt="" className="h-full w-full object-cover" loading="lazy" />}
                  </Link>
                </td>
                <td className="w-full max-w-0 px-3 py-2">
                  <Link href={`/inserat/${l.id}`} className="block truncate font-display text-lg font-semibold uppercase leading-tight tracking-wide group-hover:underline">
                    {title}
                  </Link>
                  <p className="truncate text-xs text-muted">{[l.variant, l.fuel, l.transmission, l.power_kw ? `${l.power_kw} kW` : null].filter(Boolean).join(" · ")}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                    {l.urgent && <span className="badge bg-urgent text-white">Muss schnell weg</span>}
                    {l.status === "reserviert" && <span className="badge bg-ink text-white">Reserviert</span>}
                    {(l.quality_score ?? 0) >= COMPLETE_FROM && <span className="badge bg-emerald-100 text-emerald-800">Vollständig</span>}
                    <span className="num md:hidden">{monthYear(l.first_registration)} · {km(l.mileage)}</span>
                    <span className="xl:hidden">
                      {l.zip} {l.city}{l.distance != null && ` · ${Math.round(l.distance)} km entfernt`}
                    </span>
                  </p>
                </td>
                <td className="num hidden whitespace-nowrap px-3 py-2 md:table-cell">{monthYear(l.first_registration)}</td>
                <td className="num hidden whitespace-nowrap px-3 py-2 text-right md:table-cell">{km(l.mileage)}</td>
                <td className="hidden max-w-44 px-3 py-2 xl:table-cell">
                  <span className="block truncate">
                    {l.zip} {l.city}{l.distance != null && ` · ${Math.round(l.distance)} km entfernt`}
                  </span>
                  <span className="block truncate text-xs text-muted">{l.company_name}</span>
                </td>
                <td className="hidden whitespace-nowrap px-3 py-2 md:table-cell lg:hidden xl:table-cell">
                  <span className={`num text-xs ${fresh ? "badge bg-accent text-ink" : "text-muted"}`}>{standzeit(l.created_at)}</span>
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right">
                  <span className="price block text-2xl">{eur(p.gross)}</span>
                  {drop != null && <span className="num block text-[11px] font-semibold text-emerald-700">▼ −{eur(drop)}</span>}
                  <span className="num block text-[11px] text-muted">{p.net != null ? `${eur(p.net)} netto` : "§ 25a"}</span>
                  {myId && l.dealer_id !== myId && <QuickOffer listingId={l.id} />}
                </td>
                <td className="py-2 pr-2 text-right"><FavoriteButton listingId={l.id} initial={favorites.has(l.id)} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
