import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Dealer, DealerPrivate } from "@/lib/types";

export type Session = {
  userId: string;
  email: string;
  dealer: Dealer | null;
  priv: DealerPrivate | null;
  hasAccess: boolean;
};

// Lädt Nutzer, Händlerprofil und Zugangsstatus (einmal pro Anfrage).
export const getSession = cache(async (): Promise<Session | null> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const [{ data: dealer }, { data: priv }] = await Promise.all([
    supabase.from("dealers").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("dealer_private").select("*").eq("dealer_id", user.id).maybeSingle(),
  ]);
  const d = dealer as Dealer | null;
  const p = priv as DealerPrivate | null;
  const paid = p?.subscription_status === "active" || p?.subscription_status === "trialing";
  const hasAccess = !!d && d.status === "freigegeben" && (d.is_founding || d.is_admin || paid);
  return { userId: user.id, email: user.email ?? "", dealer: d, priv: p, hasAccess };
});

// Für alle Seiten im Händlerbereich: leitet je nach Status an die richtige Stelle weiter.
export async function requireAccess(): Promise<Session & { dealer: Dealer }> {
  const s = await getSession();
  if (!s) redirect("/login");
  if (!s.dealer) redirect("/onboarding");
  if (s.dealer.status !== "freigegeben") redirect("/status");
  if (!s.hasAccess) redirect("/abo");
  return s as Session & { dealer: Dealer };
}

export async function requireAdmin() {
  const s = await requireAccess();
  if (!s.dealer.is_admin) redirect("/suche");
  return s;
}
