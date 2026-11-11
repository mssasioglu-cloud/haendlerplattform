import Link from "next/link";
import { CATEGORIES, FUELS, TRANSMISSIONS, ALL_MAKES } from "@/lib/vehicle";
import type { Filters } from "@/lib/filters";

// Filterformular ohne JavaScript: schickt die Werte als URL-Parameter an /suche.
export function SearchFilters({ filters: f, sort }: { filters: Filters; sort: string }) {
  const active = Object.keys(f).length;
  return (
    <div className="card">
      <input type="checkbox" id="filter-toggle" className="peer sr-only" />
      <label htmlFor="filter-toggle" className="flex cursor-pointer items-center justify-between px-4 py-3 font-semibold peer-focus-visible:outline-2 lg:cursor-default">
        <span>Filter {active > 0 && <span className="badge ml-1 bg-brand-600 text-white">{active}</span>}</span>
        <span className="text-xs font-medium text-brand-600 lg:hidden">anzeigen / ausblenden</span>
      </label>
      <form action="/suche" className="hidden gap-3 border-t border-line p-4 peer-checked:grid lg:grid">
        <input type="hidden" name="sort" value={sort} />
        <div>
          <label className="label" htmlFor="f-q">Suchbegriff</label>
          <input className="input" id="f-q" name="q" defaultValue={f.q} placeholder="z. B. GTI, Sprinter" />
        </div>
        <div>
          <label className="label" htmlFor="f-kat">Fahrzeugart</label>
          <select className="input" id="f-kat" name="kategorie" defaultValue={f.kategorie ?? ""}>
            <option value="">Alle</option>
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label" htmlFor="f-marke">Marke</label>
            <input className="input" id="f-marke" name="marke" list="marken" defaultValue={f.marke} />
            <datalist id="marken">{ALL_MAKES.map((m) => <option key={m} value={m} />)}</datalist>
          </div>
          <div>
            <label className="label" htmlFor="f-modell">Modell</label>
            <input className="input" id="f-modell" name="modell" defaultValue={f.modell} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label" htmlFor="f-pv">Preis von (€)</label>
            <input className="input" id="f-pv" name="preis_von" inputMode="numeric" defaultValue={f.preis_von} />
          </div>
          <div>
            <label className="label" htmlFor="f-pb">Preis bis (€)</label>
            <input className="input" id="f-pb" name="preis_bis" inputMode="numeric" defaultValue={f.preis_bis} />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="f-km">Kilometer bis</label>
          <input className="input" id="f-km" name="km_bis" inputMode="numeric" defaultValue={f.km_bis} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label" htmlFor="f-ev">EZ ab (Jahr)</label>
            <input className="input" id="f-ev" name="ez_von" inputMode="numeric" maxLength={4} defaultValue={f.ez_von} />
          </div>
          <div>
            <label className="label" htmlFor="f-eb">EZ bis (Jahr)</label>
            <input className="input" id="f-eb" name="ez_bis" inputMode="numeric" maxLength={4} defaultValue={f.ez_bis} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label" htmlFor="f-kr">Kraftstoff</label>
            <select className="input" id="f-kr" name="kraftstoff" defaultValue={f.kraftstoff ?? ""}>
              <option value="">Alle</option>
              {FUELS.map((x) => <option key={x}>{x}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="f-ge">Getriebe</label>
            <select className="input" id="f-ge" name="getriebe" defaultValue={f.getriebe ?? ""}>
              <option value="">Alle</option>
              {TRANSMISSIONS.map((x) => <option key={x}>{x}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="f-mw">Besteuerung</label>
          <select className="input" id="f-mw" name="mwst" defaultValue={f.mwst ?? ""}>
            <option value="">Alle</option>
            <option value="ausweisbar">MwSt. ausweisbar</option>
            <option value="differenz">Differenzbesteuert (§ 25a)</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label" htmlFor="f-plz">PLZ</label>
            <input className="input" id="f-plz" name="plz" inputMode="numeric" maxLength={5} defaultValue={f.plz} />
          </div>
          <div>
            <label className="label" htmlFor="f-um">Umkreis</label>
            <select className="input" id="f-um" name="umkreis" defaultValue={f.umkreis ?? ""}>
              <option value="">Bundesweit</option>
              {[25, 50, 100, 200, 300].map((x) => <option key={x} value={x}>{x} km</option>)}
            </select>
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" name="dringend" value="1" defaultChecked={!!f.dringend} />
          Nur „Muss schnell weg“
        </label>
        <div className="flex gap-2">
          <button className="btn btn-primary flex-1">Suchen</button>
          <Link href="/suche" className="btn btn-secondary">Zurücksetzen</Link>
        </div>
      </form>
    </div>
  );
}
