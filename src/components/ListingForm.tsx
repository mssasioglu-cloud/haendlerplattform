"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { saveListing, type ListingInput } from "@/app/actions/listings";
import { CATEGORIES, FUELS, TRANSMISSIONS, COLORS, MAKES, ALL_MAKES, FEATURES, EXTRA_FIELDS, B2B_NOTICE } from "@/lib/vehicle";
import { imageUrl } from "@/lib/format";

const MAX_IMAGES = 20;

const empty: ListingInput = {
  category: "pkw", make: "", model: "", variant: "", first_registration: "", mileage: "", fuel: "", transmission: "",
  power_kw: "", color: "", hu_until: "", owners: "", accident_free: "", service_history: "", roadworthy: true, vin: "",
  damage_notes: "", description: "", features: [], extra: {}, price: "", vat_type: "differenz", price_is_net: false,
  urgent: false, zip: "", b2b: false,
};

// Verkleinert ein Foto im Browser auf max. 1600 px Kantenlänge (JPEG), damit der Upload auch mobil schnell geht.
async function shrink(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Bild konnte nicht verarbeitet werden"))), "image/jpeg", 0.82));
}

export function ListingForm({ userId, id, initial, initialImages = [], defaultZip = "" }: {
  userId: string; id?: string; initial?: Partial<ListingInput>; initialImages?: string[]; defaultZip?: string;
}) {
  const [v, setV] = useState<ListingInput>({ ...empty, zip: defaultZip, ...initial });
  const [images, setImages] = useState<string[]>(initialImages);
  const [uploading, setUploading] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof ListingInput>(k: K, val: ListingInput[K]) => setV((o) => ({ ...o, [k]: val }));
  const makes = MAKES[v.category]?.length ? MAKES[v.category] : ALL_MAKES;

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    const list = Array.from(files).slice(0, MAX_IMAGES - images.length);
    if (list.length < files.length) setError(`Maximal ${MAX_IMAGES} Fotos pro Inserat.`);
    setUploading(list.length);
    const supabase = createClient();
    for (const file of list) {
      try {
        const blob = await shrink(file);
        const path = `${userId}/${crypto.randomUUID()}.jpg`;
        const { error: upErr } = await supabase.storage.from("fahrzeugbilder").upload(path, blob, { contentType: "image/jpeg" });
        if (upErr) throw upErr;
        setImages((o) => [...o, path]);
      } catch {
        setError("Mindestens ein Foto konnte nicht hochgeladen werden.");
      }
      setUploading((n) => n - 1);
    }
  }

  function move(i: number, dir: -1 | 1) {
    setImages((o) => {
      const n = [...o];
      const j = i + dir;
      if (j < 0 || j >= n.length) return o;
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await saveListing(v, images, id);
      if (res?.error) {
        setError(res.error);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } finally {
      setBusy(false);
    }
  }

  const text = (k: keyof ListingInput, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label className="label" htmlFor={`l-${k}`}>{label}</label>
      <input className="input" id={`l-${k}`} value={v[k] as string} onChange={(e) => set(k, e.target.value as never)} {...props} />
    </div>
  );
  const select = (k: keyof ListingInput, label: string, options: (string | [string, string])[], placeholder = "Bitte wählen") => (
    <div>
      <label className="label" htmlFor={`l-${k}`}>{label}</label>
      <select className="input" id={`l-${k}`} value={v[k] as string} onChange={(e) => set(k, e.target.value as never)}>
        <option value="">{placeholder}</option>
        {options.map((o) => Array.isArray(o) ? <option key={o[0]} value={o[0]}>{o[1]}</option> : <option key={o}>{o}</option>)}
      </select>
    </div>
  );

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {error && <p className="notice notice-error" role="alert">{error}</p>}

      <section className="card p-5">
        <h2 className="mb-4 font-semibold">Fahrzeug</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="label" htmlFor="l-category">Fahrzeugart</label>
            <select className="input" id="l-category" value={v.category} onChange={(e) => setV((o) => ({ ...o, category: e.target.value, extra: {} }))}>
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="l-make">Marke *</label>
            <input className="input" id="l-make" list="l-makes" value={v.make} onChange={(e) => set("make", e.target.value)} required maxLength={60} />
            <datalist id="l-makes">{makes.map((m) => <option key={m} value={m} />)}</datalist>
          </div>
          {text("model", "Modell *", { required: true, maxLength: 80, placeholder: "z. B. Golf" })}
          {text("variant", "Variante / Ausführung", { maxLength: 120, placeholder: "z. B. 2.0 TDI Highline" })}
          {text("first_registration", "Erstzulassung", { type: "month" })}
          {text("mileage", "Kilometerstand", { inputMode: "numeric", placeholder: "km" })}
          {select("fuel", "Kraftstoff", FUELS)}
          {select("transmission", "Getriebe", TRANSMISSIONS)}
          {text("power_kw", "Leistung (kW)", { inputMode: "numeric" })}
        </div>
      </section>

      <section className="card p-5">
        <h2 className="mb-4 font-semibold">Preis und Standort</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {text("price", "Händlerpreis (€) *", { inputMode: "numeric", required: true })}
          {select("vat_type", "Besteuerung *", [["differenz", "Differenzbesteuert (§ 25a UStG)"], ["ausweisbar", "MwSt. ausweisbar"]], "Bitte wählen")}
          {v.vat_type === "ausweisbar" ? (
            <div>
              <span className="label">Preisangabe ist</span>
              <div className="flex gap-4 py-2.5 text-sm">
                <label className="flex items-center gap-1.5"><input type="radio" name="net" checked={!v.price_is_net} onChange={() => set("price_is_net", false)} /> brutto</label>
                <label className="flex items-center gap-1.5"><input type="radio" name="net" checked={v.price_is_net} onChange={() => set("price_is_net", true)} /> netto</label>
              </div>
            </div>
          ) : <div className="hidden lg:block" />}
          {text("zip", "Standort (PLZ) *", { inputMode: "numeric", pattern: "[0-9]{5}", maxLength: 5, required: true })}
          <label className="flex items-center gap-2 self-end rounded-lg border border-line bg-urgent-bg px-3 py-2.5 text-sm font-semibold text-urgent sm:col-span-1 lg:col-span-2">
            <input type="checkbox" checked={v.urgent} onChange={(e) => set("urgent", e.target.checked)} />
            Muss schnell weg (wird in der Suche hervorgehoben)
          </label>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="mb-1 font-semibold">Fotos</h2>
        <p className="mb-4 text-xs text-muted">Bis zu {MAX_IMAGES} Fotos. Das erste Foto ist das Titelbild.</p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {images.map((p, i) => (
            <div key={p} className="relative overflow-hidden rounded-lg border border-line">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl(p)!} alt={`Foto ${i + 1}`} className="aspect-[4/3] w-full object-cover" />
              <div className="flex justify-between bg-white text-xs">
                <button type="button" className="cursor-pointer px-2 py-1 disabled:opacity-30" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Foto ${i + 1} nach vorn`}>←</button>
                <button type="button" className="cursor-pointer px-2 py-1 text-red-700" onClick={() => setImages((o) => o.filter((x) => x !== p))} aria-label={`Foto ${i + 1} entfernen`}>Entfernen</button>
                <button type="button" className="cursor-pointer px-2 py-1 disabled:opacity-30" disabled={i === images.length - 1} onClick={() => move(i, 1)} aria-label={`Foto ${i + 1} nach hinten`}>→</button>
              </div>
            </div>
          ))}
          {images.length < MAX_IMAGES && (
            <label className="flex aspect-[4/3] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-brand-200 bg-brand-50 text-center text-xs font-semibold text-brand-700 hover:bg-brand-100">
              {uploading > 0 ? `Lädt … (${uploading})` : "+ Fotos hinzufügen"}
              <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => { onFiles(e.target.files); e.target.value = ""; }} />
            </label>
          )}
        </div>
      </section>

      <section className="card p-5">
        <h2 className="mb-4 font-semibold">Zustand</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {select("accident_free", "Unfallfrei", [["ja", "Ja"], ["nein", "Nein"]], "Keine Angabe")}
          {select("service_history", "Scheckheftgepflegt", [["ja", "Ja"], ["nein", "Nein"]], "Keine Angabe")}
          <label className="flex items-center gap-2 self-end py-2.5 text-sm">
            <input type="checkbox" checked={v.roadworthy} onChange={(e) => set("roadworthy", e.target.checked)} /> Fahrbereit
          </label>
        </div>
        <div className="mt-4">
          <label className="label" htmlFor="l-damage">Bekannte Mängel und Schäden</label>
          <textarea className="input min-h-24" id="l-damage" value={v.damage_notes} onChange={(e) => set("damage_notes", e.target.value)} placeholder="z. B. Kratzer Stoßfänger hinten, Kupplung rupft, Service fällig" maxLength={4000} />
        </div>
      </section>

      <details className="card" open={!!id}>
        <summary className="cursor-pointer px-5 py-4 font-semibold">Weitere Angaben und Ausstattung (optional)</summary>
        <div className="space-y-5 border-t border-line p-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {select("color", "Farbe", COLORS)}
            {text("hu_until", "HU bis", { type: "month" })}
            {text("owners", "Anzahl Vorbesitzer", { inputMode: "numeric" })}
            {text("vin", "FIN (nur für Händler sichtbar)", { maxLength: 17 })}
            {(EXTRA_FIELDS[v.category] ?? []).map((f) => (
              <div key={f.key}>
                <label className="label" htmlFor={`x-${f.key}`}>{f.label}{f.unit ? ` (${f.unit})` : ""}</label>
                <input className="input" id={`x-${f.key}`} value={v.extra[f.key] ?? ""} onChange={(e) => set("extra", { ...v.extra, [f.key]: e.target.value })} maxLength={80} />
              </div>
            ))}
          </div>
          {Object.entries(FEATURES).map(([group, list]) => (
            <fieldset key={group}>
              <legend className="label">{group}</legend>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-3 lg:grid-cols-4">
                {list.map((f) => (
                  <label key={f} className="flex items-center gap-2">
                    <input type="checkbox" checked={v.features.includes(f)}
                      onChange={(e) => set("features", e.target.checked ? [...v.features, f] : v.features.filter((x) => x !== f))} />
                    {f}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
          <div>
            <label className="label" htmlFor="l-desc">Beschreibung</label>
            <textarea className="input min-h-28" id="l-desc" value={v.description} onChange={(e) => set("description", e.target.value)} maxLength={6000} />
          </div>
        </div>
      </details>

      <section className="card p-5">
        <label className="flex gap-2 text-sm">
          <input type="checkbox" className="mt-0.5" checked={v.b2b} onChange={(e) => set("b2b", e.target.checked)} required />
          <span><strong>Pflichtbestätigung:</strong> {B2B_NOTICE} Die Angaben zum Fahrzeug sind nach bestem Wissen vollständig und richtig.</span>
        </label>
        <button className="btn btn-primary mt-4 px-6 py-3" disabled={busy || uploading > 0}>
          {busy ? "Wird gespeichert …" : id ? "Änderungen speichern" : "Inserat veröffentlichen"}
        </button>
      </section>
    </form>
  );
}
