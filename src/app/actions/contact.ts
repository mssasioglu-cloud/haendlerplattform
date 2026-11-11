"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAccess } from "@/lib/auth";
import { sendMail } from "@/lib/mail";
import { absoluteUrl, eur } from "@/lib/format";
import type { ActionState } from "@/lib/types";

async function emailOf(dealerId: string) {
  const { data } = await createAdminClient().from("dealer_private").select("email").eq("dealer_id", dealerId).maybeSingle();
  return data?.email as string | undefined;
}

// Nachricht zu einem Inserat oder Gesuch senden; öffnet danach die Unterhaltung.
export async function startConversation(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await requireAccess();
  const body = String(fd.get("body") ?? "").trim();
  if (!body) return { error: "Bitte eine Nachricht eingeben." };
  const supabase = await createClient();
  const { data: id, error } = await supabase.rpc("start_conversation", {
    p_listing: (fd.get("listing_id") as string) || null,
    p_wanted: (fd.get("wanted_id") as string) || null,
    p_body: body.slice(0, 4000),
  });
  if (error || !id) return { error: error?.message?.includes("eigener") ? "Das ist Ihr eigener Eintrag." : "Nachricht konnte nicht gesendet werden." };

  const { data: conv } = await supabase.from("conversations").select("recipient_id, initiator_id, subject").eq("id", id).single();
  if (conv) {
    const other = conv.initiator_id === s.userId ? conv.recipient_id : conv.initiator_id;
    const to = await emailOf(other);
    if (to) {
      await sendMail(to, `Neue Nachricht von ${s.dealer.company_name}: ${conv.subject}`,
        `${s.dealer.company_name} schreibt:\n\n${body.slice(0, 500)}\n\nAntworten: ${absoluteUrl(`/nachrichten/${id}`)}`);
    }
  }
  redirect(`/nachrichten/${id}`);
}

export async function makeOffer(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await requireAccess();
  const amount = Number.parseInt(String(fd.get("amount") ?? "").replace(/\D/g, ""), 10);
  if (!amount || amount < 1) return { error: "Bitte einen Betrag angeben." };
  const listingId = String(fd.get("listing_id"));
  const supabase = await createClient();
  const { error } = await supabase.rpc("make_offer", {
    p_listing: listingId, p_amount: amount, p_note: String(fd.get("note") ?? "").trim().slice(0, 500),
  });
  if (error) return { error: "Gebot konnte nicht abgegeben werden." };

  const { data: l } = await supabase.from("listings").select("dealer_id, make, model").eq("id", listingId).single();
  if (l) {
    const to = await emailOf(l.dealer_id);
    if (to) {
      await sendMail(to, `Neues Gebot über ${eur(amount)} für ${l.make} ${l.model}`,
        `${s.dealer.company_name} bietet ${eur(amount)} für Ihr Fahrzeug ${l.make} ${l.model}.\n\nGebot ansehen: ${absoluteUrl("/gebote")}`);
    }
  }
  revalidatePath("/gebote");
  revalidatePath(`/inserat/${listingId}`);
  return { ok: `Ihr Gebot über ${eur(amount)} wurde übermittelt.` };
}

export async function offerAction(fd: FormData) {
  const s = await requireAccess();
  const action = String(fd.get("action"));
  const counter = Number.parseInt(String(fd.get("amount") ?? "").replace(/\D/g, ""), 10) || null;
  const offerId = String(fd.get("id"));
  const supabase = await createClient();
  const { error } = await supabase.rpc("offer_action", { p_offer: offerId, p_action: action, p_amount: counter });
  if (!error) {
    const { data: o } = await supabase.from("offers").select("buyer_id, seller_id, amount, counter_amount, status, listings(make, model)").eq("id", offerId).single();
    if (o) {
      const other = o.buyer_id === s.userId ? o.seller_id : o.buyer_id;
      const to = await emailOf(other);
      const car = o.listings as unknown as { make: string; model: string } | null;
      const label: Record<string, string> = {
        angenommen: "angenommen", abgelehnt: "abgelehnt", zurueckgezogen: "zurückgezogen",
        gegenangebot: `mit einem Gegenangebot über ${eur(o.counter_amount)} beantwortet`,
      };
      if (to && label[o.status]) {
        await sendMail(to, `Gebot ${label[o.status].split(" ")[0]}: ${car?.make ?? ""} ${car?.model ?? ""}`,
          `${s.dealer.company_name} hat das Gebot über ${eur(o.amount)} für ${car?.make ?? ""} ${car?.model ?? ""} ${label[o.status]}.\n\n${absoluteUrl("/gebote")}`);
      }
    }
  }
  revalidatePath("/gebote");
}
