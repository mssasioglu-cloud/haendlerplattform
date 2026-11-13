"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAccess } from "@/lib/auth";
import { sendMail } from "@/lib/mail";
import { absoluteUrl, eur } from "@/lib/format";
import { CATEGORIES, FUELS, TRANSMISSIONS, FEATURES, DEFECTS } from "@/lib/vehicle";
import { quality, requiredMissing } from "@/lib/quality";
import type { ActionState } from "@/lib/types";

export type ListingInput = {
  category: string; make: string; model: string; variant: string;
  first_registration: string; mileage: string; fuel: string; transmission: string; power_kw: string;
  color: string; hu_until: string; owners: string; accident_free: string; service_history: string;
  roadworthy: boolean; vin: string; damage_notes: string; defects: string[]; no_known_defects: boolean; description: string;
  features: string[]; extra: Record<string, string>;
  price: string; vat_type: string; price_is_net: boolean; urgent: boolean; zip: string; b2b: boolean;
};

const intOrNull = (s: string) => (s.trim() === "" ? null : Number.parseInt(s.replace(/\D/g, ""), 10));
const monthOrNull = (s: string) => (/^\d{4}-\d{2}$/.test(s) ? `${s}-01` : null);
const triState = (s: string) => (s === "ja" ? true : s === "nein" ? false : null);
const MAX_IMAGES = 20;

export async function saveListing(input: ListingInput, imagePaths: string[], id?: string): Promise<ActionState> {
  const s = await requireAccess();
  const supabase = await createClient();

  if (!CATEGORIES.some((c) => c.value === input.category)) return { error: "Bitte eine Fahrzeugart wählen." };
  if (!input.make.trim() || !input.model.trim()) return { error: "Marke und Modell sind Pflichtangaben." };
  const price = intOrNull(input.price);
  if (!price || price < 1) return { error: "Bitte einen Preis angeben." };
  if (!["ausweisbar", "differenz"].includes(input.vat_type)) return { error: "Bitte die Besteuerungsart wählen." };
  if (!/^\d{5}$/.test(input.zip)) return { error: "Bitte eine gültige 5-stellige PLZ angeben." };
  if (!input.b2b) return { error: "Bitte bestätigen Sie den Verkauf ausschließlich an Gewerbetreibende." };
  const { data: geo } = await supabase.from("plz_geo").select("zip").eq("zip", input.zip).maybeSingle();
  if (!geo) return { error: "Diese PLZ ist uns nicht bekannt." };

  const allFeatures = Object.values(FEATURES).flat();
  const paths = imagePaths.filter((p) => p.startsWith(`${s.userId}/`)).slice(0, MAX_IMAGES);
  const defects = (input.defects ?? []).filter((d) => DEFECTS.includes(d));
  const q = { ...input, defects, no_known_defects: !!input.no_known_defects && defects.length === 0, photos: paths.length };
  const missing = requiredMissing(q);
  if (missing.length) return { error: `Es fehlt noch: ${missing.join(", ")}.` };
  const row = {
    category: input.category,
    make: input.make.trim().slice(0, 60),
    model: input.model.trim().slice(0, 80),
    variant: input.variant.trim().slice(0, 120),
    first_registration: monthOrNull(input.first_registration),
    mileage: intOrNull(input.mileage),
    fuel: FUELS.includes(input.fuel) ? input.fuel : null,
    transmission: TRANSMISSIONS.includes(input.transmission) ? input.transmission : null,
    power_kw: intOrNull(input.power_kw),
    color: input.color || null,
    hu_until: monthOrNull(input.hu_until),
    owners: intOrNull(input.owners),
    accident_free: triState(input.accident_free),
    service_history: triState(input.service_history),
    roadworthy: input.roadworthy,
    vin: input.vin.trim().toUpperCase().slice(0, 17) || null,
    damage_notes: input.damage_notes.trim().slice(0, 4000),
    defects,
    no_known_defects: q.no_known_defects,
    quality_score: quality(q).score,
    description: input.description.trim().slice(0, 6000),
    features: input.features.filter((f) => allFeatures.includes(f)),
    extra: Object.fromEntries(Object.entries(input.extra).filter(([, v]) => v.trim() !== "").map(([k, v]) => [k, v.trim().slice(0, 80)])),
    price,
    vat_type: input.vat_type,
    price_is_net: input.vat_type === "ausweisbar" && input.price_is_net,
    urgent: input.urgent,
    zip: input.zip,
    city: "",
    b2b_confirmed: true,
  };

  let listingId = id;
  if (id) {
    const { error } = await supabase.from("listings").update(row).eq("id", id).eq("dealer_id", s.userId);
    if (error) return { error: "Speichern fehlgeschlagen. Bitte Eingaben prüfen." };
  } else {
    const { data, error } = await supabase.from("listings").insert({ ...row, dealer_id: s.userId }).select("id").single();
    if (error || !data) return { error: "Speichern fehlgeschlagen. Bitte Eingaben prüfen." };
    listingId = data.id;
  }

  // Bilder abgleichen: entfernte löschen, Reihenfolge neu schreiben
  const { data: existing } = await supabase.from("listing_images").select("path").eq("listing_id", listingId!);
  const removed = (existing ?? []).map((e) => e.path).filter((p) => !paths.includes(p));
  if (removed.length) await supabase.storage.from("fahrzeugbilder").remove(removed);
  await supabase.from("listing_images").delete().eq("listing_id", listingId!);
  if (paths.length) {
    await supabase.from("listing_images").insert(paths.map((path, position) => ({ listing_id: listingId!, path, position })));
  }

  if (!id) await notifySavedSearches(listingId!, `${row.make} ${row.model}`, price);

  revalidatePath("/suche");
  revalidatePath("/meine-inserate");
  redirect(`/inserat/${listingId}`);
}

async function notifySavedSearches(listingId: string, title: string, price: number) {
  try {
    const { data } = await createAdminClient().rpc("match_saved_searches", { p_listing: listingId });
    const rows = (data ?? []) as { search_name: string; email: string }[];
    await Promise.all(rows.slice(0, 200).map((r) =>
      sendMail(r.email, `Neuer Treffer für „${r.search_name}“: ${title}`,
        `Zu Ihrem Suchauftrag „${r.search_name}“ wurde ein neues Fahrzeug eingestellt:\n\n${title} für ${eur(price)}\n${absoluteUrl(`/inserat/${listingId}`)}`),
    ));
  } catch (e) {
    console.error("Suchauftrag-Benachrichtigung fehlgeschlagen:", e);
  }
}

export async function setListingStatus(fd: FormData) {
  const s = await requireAccess();
  const status = String(fd.get("status"));
  if (!["aktiv", "reserviert", "verkauft", "deaktiviert"].includes(status)) return;
  const supabase = await createClient();
  let q = supabase.from("listings").update({ status }).eq("id", String(fd.get("id")));
  if (!s.dealer.is_admin) q = q.eq("dealer_id", s.userId);
  await q;
  revalidatePath("/meine-inserate");
  revalidatePath(`/inserat/${fd.get("id")}`);
}

export async function toggleUrgent(fd: FormData) {
  const s = await requireAccess();
  const supabase = await createClient();
  await supabase.from("listings").update({ urgent: fd.get("urgent") === "1" })
    .eq("id", String(fd.get("id"))).eq("dealer_id", s.userId);
  revalidatePath("/meine-inserate");
  revalidatePath(`/inserat/${fd.get("id")}`);
}

export async function deleteListing(fd: FormData) {
  const s = await requireAccess();
  const supabase = await createClient();
  const id = String(fd.get("id"));
  const { data: l } = await supabase.from("listings").select("dealer_id").eq("id", id).maybeSingle();
  if (!l || (l.dealer_id !== s.userId && !s.dealer.is_admin)) return;
  const { data: imgs } = await supabase.from("listing_images").select("path").eq("listing_id", id);
  if (imgs?.length) await createAdminClient().storage.from("fahrzeugbilder").remove(imgs.map((i) => i.path));
  await supabase.from("listings").delete().eq("id", id);
  revalidatePath("/meine-inserate");
  redirect("/meine-inserate");
}

// Gibt den neuen Zustand zurück (true = gemerkt)
export async function toggleFavorite(listingId: string): Promise<boolean | null> {
  const s = await requireAccess();
  const supabase = await createClient();
  const { data } = await supabase.from("favorites").select("listing_id").eq("dealer_id", s.userId).eq("listing_id", listingId).maybeSingle();
  if (data) {
    await supabase.from("favorites").delete().eq("dealer_id", s.userId).eq("listing_id", listingId);
    revalidatePath("/merkliste");
    return false;
  }
  const { error } = await supabase.from("favorites").insert({ dealer_id: s.userId, listing_id: listingId });
  revalidatePath("/merkliste");
  return error ? null : true;
}

export async function reportListing(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await requireAccess();
  const reason = String(fd.get("reason") ?? "").trim();
  if (reason.length < 3) return { error: "Bitte kurz beschreiben, was nicht stimmt." };
  const supabase = await createClient();
  const { error } = await supabase.from("reports").insert({ listing_id: String(fd.get("id")), reporter_id: s.userId, reason });
  return error ? { error: "Meldung konnte nicht gespeichert werden." } : { ok: "Danke, wir prüfen das Inserat." };
}

// Laufzeit um 30 Tage verlängern (auch für bereits abgelaufene Inserate)
export async function extendListing(fd: FormData) {
  const s = await requireAccess();
  const supabase = await createClient();
  await supabase.from("listings").update({ expires_at: new Date(Date.now() + 30 * 86400000).toISOString() })
    .eq("id", String(fd.get("id"))).eq("dealer_id", s.userId);
  revalidatePath("/meine-inserate");
  revalidatePath("/suche");
}
