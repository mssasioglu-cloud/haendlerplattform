"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAccess, requireAdmin } from "@/lib/auth";
import { sendMail } from "@/lib/mail";
import { absoluteUrl } from "@/lib/format";
import { CATEGORIES } from "@/lib/vehicle";
import { site } from "@/config/site";
import type { ActionState } from "@/lib/types";

const int = (v: FormDataEntryValue | null) => {
  const n = Number.parseInt(String(v ?? "").replace(/\D/g, ""), 10);
  return Number.isFinite(n) ? n : null;
};

// ---------- Suchgesuche ----------
export async function createWanted(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await requireAccess();
  const title = String(fd.get("title") ?? "").trim();
  if (title.length < 3) return { error: "Bitte kurz beschreiben, was Sie suchen." };
  const category = String(fd.get("category") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.from("wanted_ads").insert({
    dealer_id: s.userId, title: title.slice(0, 140),
    category: CATEGORIES.some((c) => c.value === category) ? category : null,
    make: String(fd.get("make") ?? "").trim().slice(0, 60),
    model: String(fd.get("model") ?? "").trim().slice(0, 80),
    max_price: int(fd.get("max_price")), max_km: int(fd.get("max_km")), min_year: int(fd.get("min_year")),
    description: String(fd.get("description") ?? "").trim().slice(0, 2000),
  });
  if (error) return { error: "Gesuch konnte nicht gespeichert werden." };
  revalidatePath("/gesuche");
  redirect("/gesuche");
}

export async function setWantedStatus(fd: FormData) {
  const s = await requireAccess();
  const supabase = await createClient();
  const id = String(fd.get("id"));
  if (fd.get("delete") === "1") await supabase.from("wanted_ads").delete().eq("id", id).eq("dealer_id", s.userId);
  else await supabase.from("wanted_ads").update({ status: fd.get("status") === "aktiv" ? "aktiv" : "erledigt" }).eq("id", id).eq("dealer_id", s.userId);
  revalidatePath("/gesuche");
}

// ---------- Bewertungen ----------
export async function saveReview(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await requireAccess();
  const rating = int(fd.get("rating"));
  const dealerId = String(fd.get("dealer_id"));
  if (!rating || rating < 1 || rating > 5) return { error: "Bitte 1 bis 5 Sterne vergeben." };
  const supabase = await createClient();
  const { error } = await supabase.from("reviews").upsert(
    { reviewer_id: s.userId, dealer_id: dealerId, rating, comment: String(fd.get("comment") ?? "").trim().slice(0, 1000) },
    { onConflict: "reviewer_id,dealer_id" },
  );
  if (error) return { error: "Bewerten können Sie nur Händler, mit denen Sie bereits über die Plattform in Kontakt standen." };
  revalidatePath(`/haendler/${dealerId}`);
  return { ok: "Bewertung gespeichert." };
}

// ---------- Profil ----------
export async function updateProfile(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await requireAccess();
  const g = (k: string) => String(fd.get(k) ?? "").trim();
  const zip = g("zip");
  if (g("company_name").length < 2 || g("contact_name").length < 2) return { error: "Firma und Ansprechpartner sind Pflichtangaben." };
  if (!/^\d{5}$/.test(zip)) return { error: "Bitte eine gültige PLZ angeben." };
  const supabase = await createClient();
  const { data: geo } = await supabase.from("plz_geo").select("city").eq("zip", zip).maybeSingle();
  if (!geo) return { error: "Diese PLZ ist uns nicht bekannt." };
  const { error } = await supabase.from("dealers").update({
    company_name: g("company_name").slice(0, 120), contact_name: g("contact_name").slice(0, 120),
    street: g("street").slice(0, 120), zip, city: geo.city, phone: g("phone").slice(0, 30),
    whatsapp: g("whatsapp").slice(0, 30), about: g("about").slice(0, 2000),
  }).eq("id", s.userId);
  if (error) return { error: "Speichern fehlgeschlagen." };
  revalidatePath("/konto");
  return { ok: "Profil gespeichert." };
}

// ---------- Admin ----------
export async function adminSetDealerStatus(fd: FormData) {
  await requireAdmin();
  const dealerId = String(fd.get("id"));
  const status = String(fd.get("status"));
  const reason = String(fd.get("reason") ?? "").trim() || null;
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_dealer_status", {
    p_dealer: dealerId, p_status: status, p_reason: reason, p_total: site.foundingSlots,
  });
  if (!error) {
    const admin = createAdminClient();
    const [{ data: d }, { data: p }] = await Promise.all([
      admin.from("dealers").select("company_name, is_founding, founding_number").eq("id", dealerId).single(),
      admin.from("dealer_private").select("email").eq("dealer_id", dealerId).single(),
    ]);
    if (d && p?.email) {
      if (status === "freigegeben") {
        await sendMail(p.email, `Ihr Account bei ${site.name} ist freigeschaltet`,
          `Guten Tag,\n\n${d.company_name} wurde geprüft und freigeschaltet.` +
          (d.is_founding ? `\n\nSie haben Gründerplatz Nr. ${d.founding_number} erhalten und nutzen die Plattform dauerhaft kostenlos.` : "") +
          `\n\nJetzt anmelden: ${absoluteUrl("/login")}`);
      } else if (status === "abgelehnt" || status === "gesperrt") {
        await sendMail(p.email, `Ihr Account bei ${site.name}`,
          `Guten Tag,\n\nIhr Account für ${d.company_name} wurde ${status}.${reason ? `\n\nBegründung: ${reason}` : ""}\n\nBei Fragen: ${site.supportEmail}`);
      }
    }
  }
  revalidatePath("/admin");
}

export async function adminResolveReport(fd: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("reports").update({ resolved: true }).eq("id", String(fd.get("id")));
  if (fd.get("deactivate") === "1") {
    await supabase.from("listings").update({ status: "deaktiviert" }).eq("id", String(fd.get("listing_id")));
  }
  revalidatePath("/admin");
}
