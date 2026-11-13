import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth";
import { km, monthYear, imageUrl, absoluteUrl } from "@/lib/format";
import { categoryLabel } from "@/lib/vehicle";
import { site } from "@/config/site";

// Öffentliche Vorschau eines geteilten Inserats. Bewusst ohne Preis, Händler und Kontakt:
// Es werden nur die hier genannten Felder gelesen, alles andere bleibt hinter dem Login.
async function loadTeaser(id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const db = createAdminClient();
  const { data: l } = await db.from("listings")
    .select("id, dealer_id, category, make, model, variant, first_registration, mileage, fuel, transmission, city, urgent")
    .eq("id", id).eq("status", "aktiv").gt("expires_at", new Date().toISOString()).maybeSingle();
  if (!l) return null;
  const [{ data: img }, { data: dealer }] = await Promise.all([
    db.from("listing_images").select("path").eq("listing_id", id).order("position").limit(1).maybeSingle(),
    db.from("dealers").select("invite_code").eq("id", l.dealer_id).maybeSingle(),
  ]);
  return { ...l, cover: img?.path ?? null, invite: dealer?.invite_code ?? null };
}

function publicImage(path: string | null) {
  const u = imageUrl(path);
  return u ? (u.startsWith("http") ? u : absoluteUrl(u)) : null;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const t = await loadTeaser(id);
  if (!t) return { title: "Inserat", robots: { index: false } };
  const title = `${t.make} ${t.model}${t.variant ? " " + t.variant : ""}`;
  const description = `EZ ${monthYear(t.first_registration)} · ${km(t.mileage)} · ${t.city}. Preis und Händler nur für angemeldete Händler auf ${site.name}.`;
  const image = publicImage(t.cover);
  return {
    title, description, robots: { index: false, follow: false },
    openGraph: { title: `${title} – ${site.name}`, description, images: image ? [{ url: image }] : [] },
  };
}

export default async function Teaser({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (session?.hasAccess) redirect(`/inserat/${id}`);
  const t = await loadTeaser(id);
  if (!t) notFound();
  const title = `${t.make} ${t.model}${t.variant ? " " + t.variant : ""}`;
  const img = imageUrl(t.cover);
  const register = t.invite ? `/einladung/${t.invite}` : "/registrieren";

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <p className="eyebrow">{categoryLabel(t.category)} · {t.city}</p>
      <h1 className="mt-1 font-display text-4xl font-extrabold uppercase leading-none tracking-wide sm:text-5xl">{title}</h1>
      <div className="card mt-5 overflow-hidden">
        <div className="relative aspect-[4/3] bg-brand-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {img && <img src={img} alt={title} className="h-full w-full object-cover" />}
          {t.urgent && <span className="badge absolute left-3 top-3 bg-urgent text-white">Muss schnell weg</span>}
        </div>
        <dl className="grid grid-cols-2 bg-brand-800 text-white sm:grid-cols-4">
          {([
            ["Erstzulassung", monthYear(t.first_registration)], ["Kilometer", km(t.mileage)],
            ["Kraftstoff", t.fuel ?? "–"], ["Getriebe", t.transmission ?? "–"],
          ] as const).map(([k, v]) => (
            <div key={k} className="border-b border-r border-white/10 px-4 py-3 sm:border-b-0">
              <dt className="eyebrow text-brand-200">{k}</dt>
              <dd className="price mt-1 text-xl">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="hatch h-1.5" aria-hidden />
        <div className="p-5">
          <p className="h2">Preis und Händler nur für Händler</p>
          <p className="mt-1 text-sm text-muted">
            {site.name} ist eine Fahrzeugbörse ausschließlich für Gewerbetreibende. Händlerpreis, Mängelangaben
            und Kontakt sehen Sie nach der kostenlosen Registrierung und Freischaltung.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href={register} className="btn btn-primary px-5 py-3">Als Händler registrieren</Link>
            <Link href="/login" className="btn btn-secondary px-5 py-3">Anmelden</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
