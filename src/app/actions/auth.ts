"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { absoluteUrl } from "@/lib/format";
import type { ActionState } from "@/lib/types";

export async function signIn(_: ActionState, fd: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(fd.get("email") ?? "").trim(),
    password: String(fd.get("password") ?? ""),
  });
  if (error) {
    return { error: error.message.includes("confirmed")
      ? "Bitte bestätigen Sie zuerst Ihre E-Mail-Adresse über den Link in der Bestätigungsmail."
      : "E-Mail oder Passwort ist falsch." };
  }
  redirect("/suche");
}

export async function signUp(_: ActionState, fd: FormData): Promise<ActionState> {
  const email = String(fd.get("email") ?? "").trim();
  const password = String(fd.get("password") ?? "");
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "Bitte eine gültige E-Mail-Adresse eingeben." };
  if (password.length < 8) return { error: "Das Passwort muss mindestens 8 Zeichen lang sein." };
  if (fd.get("b2b") !== "on") return { error: "Die Plattform steht nur Gewerbetreibenden offen. Bitte bestätigen Sie dies." };
  if (fd.get("agb") !== "on") return { error: "Bitte stimmen Sie den AGB zu." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email, password, options: { emailRedirectTo: absoluteUrl("/auth/confirm") },
  });
  if (error) {
    return { error: error.message.includes("already") ? "Für diese E-Mail-Adresse gibt es bereits einen Account." : "Registrierung fehlgeschlagen. Bitte erneut versuchen." };
  }
  if (data.session) redirect("/onboarding");
  return { ok: "Fast geschafft: Wir haben Ihnen einen Bestätigungslink per E-Mail geschickt." };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

export async function completeOnboarding(input: {
  company_name: string; contact_name: string; street: string; zip: string;
  phone: string; whatsapp: string; vat_id: string; license_path: string;
}): Promise<ActionState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Bitte melden Sie sich erneut an." };

  const v = Object.fromEntries(Object.entries(input).map(([k, x]) => [k, String(x ?? "").trim()])) as typeof input;
  if (v.company_name.length < 2) return { error: "Bitte den Firmennamen angeben." };
  if (v.contact_name.length < 2) return { error: "Bitte einen Ansprechpartner angeben." };
  if (!/^\d{5}$/.test(v.zip)) return { error: "Bitte eine gültige 5-stellige PLZ angeben." };
  if (v.phone.length < 5) return { error: "Bitte eine Telefonnummer angeben." };
  if (!v.license_path.startsWith(`${user.id}/`)) return { error: "Bitte den Gewerbenachweis hochladen." };

  const { data: geo } = await supabase.from("plz_geo").select("city").eq("zip", v.zip).maybeSingle();
  if (!geo) return { error: "Diese PLZ ist uns nicht bekannt." };

  const { error } = await supabase.from("dealers").insert({
    id: user.id, company_name: v.company_name, contact_name: v.contact_name, street: v.street,
    zip: v.zip, city: geo.city, phone: v.phone, whatsapp: v.whatsapp,
  });
  if (error && error.code !== "23505") return { error: "Speichern fehlgeschlagen. Bitte erneut versuchen." };
  const { error: e2 } = await supabase.from("dealer_private").insert({
    dealer_id: user.id, email: user.email ?? "", vat_id: v.vat_id, license_path: v.license_path,
  });
  if (e2 && e2.code !== "23505") return { error: "Speichern fehlgeschlagen. Bitte erneut versuchen." };
  redirect("/status");
}
