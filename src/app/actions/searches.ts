"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAccess } from "@/lib/auth";
import { FILTER_KEYS, type Filters } from "@/lib/filters";
import type { ActionState } from "@/lib/types";

export async function saveSearch(name: string, filters: Filters): Promise<ActionState> {
  const s = await requireAccess();
  const clean: Record<string, string> = {};
  for (const k of FILTER_KEYS) if (filters[k]) clean[k] = String(filters[k]).slice(0, 80);
  if (Object.keys(clean).length === 0) return { error: "Bitte zuerst Filter setzen." };
  const supabase = await createClient();
  const { count } = await supabase.from("saved_searches").select("id", { count: "exact", head: true }).eq("dealer_id", s.userId);
  if ((count ?? 0) >= 30) return { error: "Maximal 30 Suchaufträge möglich." };
  const { error } = await supabase.from("saved_searches").insert({
    dealer_id: s.userId, name: (name || "Suchauftrag").slice(0, 120), filters: clean,
  });
  revalidatePath("/suchauftraege");
  return error ? { error: "Speichern fehlgeschlagen." } : { ok: "gespeichert" };
}

export async function deleteSearch(fd: FormData) {
  const s = await requireAccess();
  const supabase = await createClient();
  await supabase.from("saved_searches").delete().eq("id", String(fd.get("id"))).eq("dealer_id", s.userId);
  revalidatePath("/suchauftraege");
}

export async function toggleSearchNotify(fd: FormData) {
  const s = await requireAccess();
  const supabase = await createClient();
  await supabase.from("saved_searches").update({ notify: fd.get("notify") === "1" })
    .eq("id", String(fd.get("id"))).eq("dealer_id", s.userId);
  revalidatePath("/suchauftraege");
}
