import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendMail } from "@/lib/mail";
import { absoluteUrl } from "@/lib/format";

// Täglicher Lauf (Vercel Cron): erinnert Händler an Inserate, die in drei Tagen ablaufen.
// Das Zeitfenster ist genau einen Tag breit, damit jedes Inserat nur einmal gemeldet wird.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "nicht erlaubt" }, { status: 401 });
  }
  const db = createAdminClient();
  const from = new Date(Date.now() + 2 * 86400000).toISOString();
  const to = new Date(Date.now() + 3 * 86400000).toISOString();
  const { data: rows, error } = await db.from("listings")
    .select("dealer_id, make, model").eq("status", "aktiv").gt("expires_at", from).lte("expires_at", to);
  if (error) return NextResponse.json({ error: "Abfrage fehlgeschlagen" }, { status: 500 });

  const byDealer = new Map<string, string[]>();
  for (const r of rows ?? []) byDealer.set(r.dealer_id, [...(byDealer.get(r.dealer_id) ?? []), `${r.make} ${r.model}`]);
  const ids = [...byDealer.keys()];
  const { data: priv } = ids.length
    ? await db.from("dealer_private").select("dealer_id, email").in("dealer_id", ids)
    : { data: [] as { dealer_id: string; email: string }[] };

  let sent = 0;
  for (const p of priv ?? []) {
    if (p.email.endsWith(".invalid")) continue;
    const cars = byDealer.get(p.dealer_id) ?? [];
    await sendMail(p.email, `${cars.length} ${cars.length === 1 ? "Inserat läuft" : "Inserate laufen"} in drei Tagen ab`,
      `Diese Fahrzeuge sind nur noch drei Tage sichtbar:\n\n${cars.map((c) => `- ${c}`).join("\n")}\n\n` +
      `Noch im Bestand? Mit einem Klick um 30 Tage verlängern: ${absoluteUrl("/meine-inserate")}\n` +
      `Bereits verkauft? Dann müssen Sie nichts tun.`);
    sent++;
  }
  return NextResponse.json({ listings: rows?.length ?? 0, mails: sent });
}
