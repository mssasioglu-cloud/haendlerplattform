"use server";
import { randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionState } from "@/lib/types";

// Beispieldaten, damit jeder Reiter zeigt, wie die Plattform im Betrieb aussieht.
// Demo-Händler sind an ihrer E-Mail-Domain erkennbar und lassen sich mit einem Klick wieder entfernen.
const DEMO_DOMAIN = "@demo.haendlerdeal.invalid";
const DEMO_VIN = "ZZDEM"; // gültige FIN-Zeichen, damit sich Demo-Inserate bearbeiten lassen
const DEMO_VIN_OLD = "DEMO"; // Kennzeichen früherer Demodaten, wird beim Entfernen mit erfasst
const DEMO_SEARCH = "Demo: ";
const NOTE = "Beispieldaten zur Vorführung der Plattform. Dieses Fahrzeug steht nicht wirklich zum Verkauf.";

// Mängel-Checkliste aus dem Beispieltext ableiten
function demoDefects(text: string) {
  if (/^keine bekannten/i.test(text)) return [] as string[];
  const map: [RegExp, string][] = [
    [/kratzer|lack|steinschl|nachlackiert|schramm/i, "Lack / Kratzer"], [/beule|hagel|rost/i, "Karosserie / Dellen"],
    [/ölverlust|adblue/i, "Motor"], [/kupplung/i, "Getriebe / Kupplung"], [/bremsen/i, "Fahrwerk / Bremsen"],
    [/reifen|felgen/i, "Reifen / Felgen"], [/laderaum|markise|schiebetür|pritschenboden/i, "Innenraum"],
    [/service|inspektion/i, "Service / HU fällig"],
  ];
  const found = map.filter(([re]) => re.test(text)).map(([, d]) => d);
  return found.length ? found : ["Lack / Kratzer"];
}

const daysAgo = (d: number, h = 0) => new Date(Date.now() - d * 86400000 - h * 3600000).toISOString();

const DEALERS = [
  { company: "Autohaus Rheinblick (Demo)", contact: "Markus Weber", street: "Hohe Straße 12", zip: "50667", phone: "0221 5550101" },
  { company: "Nordlicht Automobile (Demo)", contact: "Jana Petersen", street: "Mönckebergstraße 7", zip: "20095", phone: "040 5550102" },
  { company: "Isar Fahrzeughandel (Demo)", contact: "Stefan Huber", street: "Marienplatz 3", zip: "80331", phone: "089 5550103" },
  { company: "Spree Mobile (Demo)", contact: "Aylin Kaya", street: "Chausseestraße 41", zip: "10115", phone: "030 5550104" },
  { company: "Neckar Nutzfahrzeuge (Demo)", contact: "Thomas Bauer", street: "Königstraße 20", zip: "70173", phone: "0711 5550105" },
  { company: "Pleiße Zweirad und Camper (Demo)", contact: "Lena Richter", street: "Grimmaische Straße 5", zip: "04109", phone: "0341 5550106" },
];

type DemoListing = {
  d: number; photo?: number; category: string; make: string; model: string; variant: string; ez: string; km: number;
  fuel: string; gear: string; kw: number; color: string; price: number; vat: "ausweisbar" | "differenz"; net?: boolean;
  urgent?: boolean; age: number; damage: string; features: string[]; extra?: Record<string, string>;
};

// d = Index des Händlers, photo = Nummer der Datei unter /public/demo
const LISTINGS: DemoListing[] = [
  { d: 0, photo: 0, category: "pkw", make: "Opel", model: "Corsa", variant: "1.2 Edition", ez: "2018-05", km: 98000, fuel: "Benzin", gear: "Schaltgetriebe", kw: 55, color: "Silber", price: 6900, vat: "differenz", urgent: true, age: 0, damage: "Steinschläge Front, Kratzer Stoßfänger hinten.", features: ["Klimaanlage", "Bluetooth", "Einparkhilfe"] },
  { d: 0, photo: 1, category: "pkw", make: "Volkswagen", model: "Passat Variant", variant: "2.0 TDI Business", ez: "2019-03", km: 142000, fuel: "Diesel", gear: "Automatik", kw: 110, color: "Blau", price: 15000, vat: "ausweisbar", net: true, age: 3, damage: "Service fällig, sonst ohne bekannte Mängel.", features: ["Klimaautomatik", "Navigationssystem", "Anhängerkupplung", "Abstandstempomat"] },
  { d: 0, category: "pkw", make: "Ford", model: "Focus", variant: "1.0 EcoBoost Titanium", ez: "2017-09", km: 121000, fuel: "Benzin", gear: "Schaltgetriebe", kw: 92, color: "Grau", price: 7400, vat: "differenz", age: 21, damage: "Kupplung rupft leicht, Beule Tür hinten links.", features: ["Klimaautomatik", "Sitzheizung"] },
  { d: 1, photo: 3, category: "pkw", make: "Skoda", model: "Kodiaq", variant: "2.0 TDI 4x4 Style", ez: "2020-02", km: 88000, fuel: "Diesel", gear: "Automatik", kw: 140, color: "Schwarz", price: 24900, vat: "ausweisbar", net: false, age: 1, damage: "Keine bekannten Mängel.", features: ["Allrad", "LED-Scheinwerfer", "Navigationssystem", "Rückfahrkamera", "Anhängerkupplung"] },
  { d: 1, photo: 4, category: "pkw", make: "Fiat", model: "500", variant: "1.2 Lounge", ez: "2016-06", km: 76000, fuel: "Benzin", gear: "Schaltgetriebe", kw: 51, color: "Rot", price: 5200, vat: "differenz", urgent: true, age: 12, damage: "Lackschäden Dach, Inspektion überfällig.", features: ["Klimaanlage", "Panoramadach"] },
  { d: 1, category: "pkw", make: "Hyundai", model: "i30", variant: "1.4 T-GDI Trend", ez: "2019-11", km: 64000, fuel: "Benzin", gear: "Schaltgetriebe", kw: 103, color: "Weiß", price: 11800, vat: "differenz", age: 6, damage: "Zwei Alufelgen mit Bordsteinschäden.", features: ["Klimaautomatik", "Apple CarPlay / Android Auto", "Rückfahrkamera"] },
  { d: 2, photo: 5, category: "pkw", make: "Audi", model: "A6", variant: "40 TDI sport", ez: "2019-09", km: 133000, fuel: "Diesel", gear: "Automatik", kw: 150, color: "Grau", price: 21000, vat: "ausweisbar", net: true, age: 9, damage: "Windschutzscheibe mit Steinschlag, Bremsen vorn fällig.", features: ["Lederausstattung", "Navigationssystem", "LED-Scheinwerfer", "Sitzheizung", "Abstandstempomat"] },
  { d: 2, photo: 9, category: "pkw", make: "Hyundai", model: "Kona Elektro", variant: "64 kWh Premium", ez: "2021-04", km: 52000, fuel: "Elektro", gear: "Automatik", kw: 150, color: "Grau", price: 19500, vat: "ausweisbar", net: false, age: 2, damage: "Keine bekannten Mängel. Batteriezertifikat liegt vor.", features: ["Klimaautomatik", "Navigationssystem", "Sitzheizung", "Head-up-Display"] },
  { d: 2, category: "pkw", make: "BMW", model: "118i", variant: "Advantage", ez: "2018-01", km: 109000, fuel: "Benzin", gear: "Automatik", kw: 100, color: "Schwarz", price: 12300, vat: "differenz", age: 33, damage: "Ölverlust am Ventildeckel, Stoßfänger vorn nachlackiert.", features: ["Klimaautomatik", "Einparkhilfe", "Sitzheizung"] },
  { d: 3, category: "pkw", make: "Renault", model: "Clio", variant: "TCe 90 Zen", ez: "2020-07", km: 58000, fuel: "Benzin", gear: "Schaltgetriebe", kw: 67, color: "Blau", price: 9600, vat: "differenz", urgent: true, age: 40, damage: "Hagelschaden Dach und Motorhaube.", features: ["Klimaanlage", "Bluetooth", "Tempomat"] },
  { d: 3, category: "pkw", make: "Mercedes-Benz", model: "C 220 d", variant: "T-Modell Avantgarde", ez: "2018-10", km: 156000, fuel: "Diesel", gear: "Automatik", kw: 143, color: "Silber", price: 17900, vat: "ausweisbar", net: true, age: 5, damage: "AdBlue-Meldung sporadisch, zwei Reifen an der Verschleißgrenze.", features: ["Navigationssystem", "LED-Scheinwerfer", "Elektr. Heckklappe", "Sitzheizung"] },
  { d: 4, photo: 2, category: "transporter", make: "Mercedes-Benz", model: "Sprinter", variant: "316 CDI Kasten L2H2", ez: "2019-11", km: 121000, fuel: "Diesel", gear: "Schaltgetriebe", kw: 120, color: "Weiß", price: 18800, vat: "ausweisbar", net: true, urgent: true, age: 0, damage: "Gebrauchsspuren Laderaum, Schiebetür schwergängig.", features: ["Klimaanlage", "Anhängerkupplung", "Einparkhilfe"], extra: { aufbau: "Kasten", nutzlast: "1250", gesamtgewicht: "3500" } },
  { d: 4, photo: 8, category: "transporter", make: "Iveco", model: "Daily", variant: "35S14 Pritsche", ez: "2018-04", km: 164000, fuel: "Diesel", gear: "Schaltgetriebe", kw: 100, color: "Weiß", price: 13500, vat: "ausweisbar", net: true, age: 15, damage: "Pritschenboden mit Abnutzung, Rost am Rahmen hinten.", features: ["Anhängerkupplung"], extra: { aufbau: "Pritsche", nutzlast: "1100", gesamtgewicht: "3500" } },
  { d: 4, category: "lkw", make: "MAN", model: "TGL 8.190", variant: "Koffer mit Ladebordwand", ez: "2017-06", km: 310000, fuel: "Diesel", gear: "Automatik", kw: 140, color: "Weiß", price: 24500, vat: "ausweisbar", net: true, age: 27, damage: "Ladebordwand geprüft, Kofferaufbau mit Schrammen.", features: ["Klimaanlage"], extra: { aufbau: "Koffer", achsen: "2", gesamtgewicht: "7490" } },
  { d: 5, photo: 6, category: "wohnmobil", make: "Knaus", model: "Sky Ti", variant: "650 MEG", ez: "2019-05", km: 61000, fuel: "Diesel", gear: "Schaltgetriebe", kw: 103, color: "Weiß", price: 46900, vat: "differenz", age: 8, damage: "Dichtigkeitsprüfung aktuell, Markise mit Stockflecken.", features: ["Klimaanlage", "Rückfahrkamera", "Tempomat"], extra: { schlafplaetze: "4", laenge: "6,99", gesamtgewicht: "3500" } },
  { d: 5, photo: 7, category: "motorrad", make: "Yamaha", model: "MT-07", variant: "ABS", ez: "2020-03", km: 18500, fuel: "Benzin", gear: "Schaltgetriebe", kw: 55, color: "Schwarz", price: 5400, vat: "differenz", age: 4, damage: "Kratzer Auspuffblende, Kettensatz neu.", features: [], extra: { hubraum: "689", typ: "Naked" } },
];

// Zwei Beispiel-Inserate für den Admin selbst, damit unter "Gebote" auch erhaltene Gebote stehen
const OWN_LISTINGS = [
  { make: "Seat", model: "Leon", variant: "1.5 TSI FR", ez: "2019-08", km: 84000, fuel: "Benzin", gear: "Schaltgetriebe", kw: 110, color: "Weiß", price: 13900, vat: "differenz" as const, age: 7, damage: "Stoßfänger hinten nachlackiert." },
  { make: "Toyota", model: "Yaris", variant: "1.5 Hybrid Comfort", ez: "2018-12", km: 97000, fuel: "Hybrid", gear: "Automatik", kw: 74, color: "Silber", price: 10400, vat: "differenz" as const, age: 18, damage: "Kratzer Tür vorn rechts, Service fällig." },
];

const WANTED = [
  { d: 3, title: "Suche VW Golf 7 Variant Diesel bis 12.000 €", category: "pkw", make: "Volkswagen", model: "Golf Variant", max_price: 12000, max_km: 160000, min_year: 2015, description: "Auch mit kleineren Mängeln. Abholung bundesweit.", age: 1 },
  { d: 4, title: "Suche Kastenwagen L2H2 für Kunden, ab 2019", category: "transporter", make: "", model: "", max_price: 22000, max_km: 150000, min_year: 2019, description: "Sprinter, Crafter oder Master. MwSt. ausweisbar.", age: 2 },
  { d: 1, title: "Suche Elektro-Kleinwagen bis 15.000 €", category: "pkw", make: "", model: "", max_price: 15000, max_km: 80000, min_year: 2019, description: "Zoe, e-Up, Corsa-e oder ähnlich. Batterie gekauft, nicht gemietet.", age: 4 },
  { d: 5, title: "Suche Teilintegrierten bis 7 m Länge", category: "wohnmobil", make: "", model: "", max_price: 45000, max_km: 90000, min_year: 2017, description: "Einzelbetten bevorzugt.", age: 6 },
  { d: 2, title: "Suche BMW 3er Touring, Automatik, Leder", category: "pkw", make: "BMW", model: "320d Touring", max_price: 20000, max_km: 140000, min_year: 2018, description: "Für festen Kundenauftrag, zahle sofort.", age: 0 },
];

const CHAT: [string, number, string, number][] = [
  ["allgemein", 0, "Moin zusammen, schön dass es hier losgeht. Wer ist noch aus NRW dabei?", 50],
  ["allgemein", 3, "Berlin ist am Start. Endlich eine Börse ohne Endkunden-Anfragen.", 46],
  ["allgemein", 1, "Hat jemand Erfahrung mit Überführungen nach Hamburg? Suche einen zuverlässigen Fahrer.", 20],
  ["allgemein", 4, "Wir fahren jede Woche Stuttgart–Hamburg, einfach anschreiben.", 18],
  ["suche-biete", 4, "Biete: Sprinter 316 Kasten, heute reingekommen, muss diese Woche weg. Steht im Bestand.", 6],
  ["suche-biete", 2, "Suche: 3er Touring Automatik mit Leder für Kundenauftrag. Zahle sofort.", 5],
  ["suche-biete", 0, "Biete: Passat Variant Business, MwSt. ausweisbar, 15.000 netto.", 3],
  ["west", 0, "Jemand Interesse an einem Paket aus drei Inzahlungnahmen? Alles Kleinwagen bis 7.000 €.", 9],
  ["sued", 2, "München: Kona Elektro mit Batteriezertifikat frisch im Bestand.", 2],
  ["nutzfahrzeuge", 4, "Daily Pritsche und MAN Koffer stehen bereit, Besichtigung jederzeit.", 12],
  ["motorraeder", 5, "MT-07 mit neuem Kettensatz, ideal für den Saisonstart.", 8],
];

function requestOrigin(h: Headers) {
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") || host?.startsWith("127.") ? "http" : "https");
  return host ? `${proto}://${host}` : null;
}

async function findDemoDealerIds(db: ReturnType<typeof createAdminClient>) {
  const { data } = await db.from("dealer_private").select("dealer_id").like("email", `%${DEMO_DOMAIN}`);
  return (data ?? []).map((r) => r.dealer_id as string);
}

export async function loadDemoData(_: ActionState): Promise<ActionState> {
  void _;
  const s = await requireAdmin();
  const db = createAdminClient();
  const me = s.userId;
  if ((await findDemoDealerIds(db)).length > 0) return { error: "Demodaten sind bereits geladen." };

  try {
    // 1. Demo-Händler
    const ids: string[] = [];
    for (let i = 0; i < DEALERS.length; i++) {
      const email = `demo-${i + 1}${DEMO_DOMAIN}`;
      const { data, error } = await db.auth.admin.createUser({
        email, password: randomBytes(24).toString("base64url"), email_confirm: true,
      });
      if (error || !data.user) throw new Error(`Händler ${i + 1}: ${error?.message}`);
      ids.push(data.user.id);
    }
    const { data: geo } = await db.from("plz_geo").select("zip, city").in("zip", DEALERS.map((d) => d.zip));
    const city = new Map((geo ?? []).map((g) => [g.zip, g.city]));
    let r = await db.from("dealers").insert(DEALERS.map((d, i) => ({
      id: ids[i], company_name: d.company, contact_name: d.contact, street: d.street, zip: d.zip, city: city.get(d.zip) ?? "",
      phone: d.phone, whatsapp: "", about: "Beispiel-Händler zur Vorführung der Plattform. Kein echtes Unternehmen.",
      status: "freigegeben", approved_at: daysAgo(60 - i * 3), created_at: daysAgo(61 - i * 3),
    })));
    if (r.error) throw new Error(r.error.message);
    r = await db.from("dealer_private").insert(ids.map((id, i) => ({ dealer_id: id, email: `demo-${i + 1}${DEMO_DOMAIN}`, vat_id: "" })));
    if (r.error) throw new Error(r.error.message);

    // 2. Inserate
    const row = (l: DemoListing | (typeof OWN_LISTINGS)[number], dealerId: string, zip: string, vin: string | null) => ({
      dealer_id: dealerId, category: "category" in l ? l.category : "pkw", make: l.make, model: l.model, variant: l.variant,
      first_registration: `${l.ez}-01`, mileage: l.km, fuel: l.fuel, transmission: l.gear, power_kw: l.kw, color: l.color,
      damage_notes: l.damage, defects: demoDefects(l.damage), no_known_defects: /^keine bekannten/i.test(l.damage),
      quality_score: "photo" in l && l.photo != null ? 88 : 62,
      expires_at: new Date(Date.now() + Math.max(2, 30 - l.age) * 86400000).toISOString(),
      accident_free: !/unfall|nachlackiert|hagel/i.test(l.damage), description: NOTE, features: "features" in l ? l.features : [], extra: ("extra" in l && l.extra) || {},
      price: l.price, vat_type: l.vat, price_is_net: ("net" in l && !!l.net) || false, urgent: ("urgent" in l && !!l.urgent) || false,
      zip, city: "", b2b_confirmed: true, vin, created_at: daysAgo(l.age, 2), roadworthy: true,
    });
    const { data: created, error: lErr } = await db.from("listings")
      .insert(LISTINGS.map((l, i) => row(l, ids[l.d], DEALERS[l.d].zip, `XDEM${String(i + 1).padStart(13, "0")}`))).select("id, make, model, dealer_id");
    if (lErr || !created) throw new Error(lErr?.message);
    const byName = (make: string, model: string) => created.find((c) => c.make === make && c.model === model)!;
    const { data: own, error: oErr } = await db.from("listings")
      .insert(OWN_LISTINGS.map((l, i) => row(l, me, s.dealer.zip, `${DEMO_VIN}${String(i + 1).padStart(12, "0")}`))).select("id, make, model");
    if (oErr || !own) throw new Error(oErr?.message);

    // Drei Fahrzeuge mit Preissenkung (der Datenbank-Trigger merkt sich den alten Preis)
    for (const [make, model, price] of [["Fiat", "500", 4900], ["Renault", "Clio", 8900], ["Iveco", "Daily", 12900]] as const) {
      await db.from("listings").update({ price }).eq("id", byName(make, model).id);
    }

    // 3. Fotos (fehlende Dateien werden übersprungen)
    const origin = requestOrigin(await headers());
    if (origin) {
      await Promise.all(LISTINGS.filter((l) => l.photo != null).map(async (l) => {
        try {
          const res = await fetch(`${origin}/demo/${l.photo}.jpg`, { cache: "no-store" });
          if (!res.ok || !res.headers.get("content-type")?.startsWith("image/")) return;
          const target = byName(l.make, l.model);
          const path = `${target.dealer_id}/demo-${l.photo}.jpg`;
          const up = await db.storage.from("fahrzeugbilder").upload(path, await res.arrayBuffer(), { contentType: "image/jpeg", upsert: true });
          if (!up.error) await db.from("listing_images").insert({ listing_id: target.id, path, position: 0 });
        } catch { /* Foto fehlt: Inserat bleibt ohne Bild */ }
      }));
    }

    // 4. Unterhaltungen (Nachrichten einzeln, damit Vorschau und Ungelesen-Status stimmen)
    const talk = async (listing: { id: string; make: string; model: string }, initiator: string, recipient: string, msgs: [string, string, number][]) => {
      const { data: c, error } = await db.from("conversations").insert({
        listing_id: listing.id, subject: `${listing.make} ${listing.model}`, initiator_id: initiator, recipient_id: recipient,
        created_at: daysAgo(0, msgs[0][2]),
      }).select("id").single();
      if (error || !c) throw new Error(error?.message);
      for (const [sender, body, hours] of msgs) {
        const m = await db.from("messages").insert({ conversation_id: c.id, sender_id: sender, body, created_at: daysAgo(0, hours) });
        if (m.error) throw new Error(m.error.message);
      }
    };
    const kodiaq = byName("Skoda", "Kodiaq"), sprinter = byName("Mercedes-Benz", "Sprinter"), a6 = byName("Audi", "A6");
    await talk(kodiaq, me, ids[1], [
      [me, "Guten Tag, ist der Kodiaq noch verfügbar? Gibt es das Serviceheft dazu?", 30],
      [ids[1], "Moin, ja, steht bereit. Serviceheft lückenlos, letzter Service bei 80.000 km.", 28],
      [me, "Sehr gut. Ich melde mich morgen wegen der Abholung.", 27],
    ]);
    await talk(sprinter, me, ids[4], [
      [me, "Hallo, was ist beim Sprinter Ihr letzter Preis bei Abholung diese Woche?", 6],
      [ids[4], "Hallo, bei Abholung bis Freitag gehen 18.200 netto. Schiebetür haben wir heute eingestellt.", 2],
    ]);
    await talk(a6, me, ids[2], [
      [me, "Guten Tag, können Sie mir Fotos vom Steinschlag in der Scheibe schicken?", 50],
      [ids[2], "Servus, klar. Er sitzt unten rechts außerhalb des Sichtfelds. Bilder kommen per WhatsApp.", 49],
    ]);
    await talk(own[0], ids[3], me, [
      [ids[3], "Hallo, ich interessiere mich für Ihren Leon FR. Ist der Wagen unfallfrei?", 4],
    ]);

    // 5. Gebote: zwei abgegeben, zwei erhalten
    r = await db.from("offers").insert([
      { listing_id: kodiaq.id, buyer_id: me, seller_id: ids[1], amount: 23500, note: "Abholung nächste Woche", status: "gegenangebot", counter_amount: 24300, created_at: daysAgo(0, 26) },
      { listing_id: a6.id, buyer_id: me, seller_id: ids[2], amount: 19800, note: "", status: "offen", created_at: daysAgo(0, 48) },
      { listing_id: own[0].id, buyer_id: ids[3], seller_id: me, amount: 13000, note: "Zahle sofort bei Abholung", status: "offen", created_at: daysAgo(0, 3) },
      { listing_id: own[1].id, buyer_id: ids[0], seller_id: me, amount: 9600, note: "", status: "offen", created_at: daysAgo(1, 5) },
    ]);
    if (r.error) throw new Error(r.error.message);

    // 6. Gesuche, Händlerchat, Merkliste, Suchaufträge, Bewertungen
    r = await db.from("wanted_ads").insert(WANTED.map((w) => ({
      dealer_id: ids[w.d], title: w.title, category: w.category, make: w.make, model: w.model, max_price: w.max_price,
      max_km: w.max_km, min_year: w.min_year, description: w.description, created_at: daysAgo(w.age, 3),
    })));
    if (r.error) throw new Error(r.error.message);
    const { data: rooms } = await db.from("chat_rooms").select("id, slug");
    const room = new Map((rooms ?? []).map((x) => [x.slug, x.id]));
    r = await db.from("chat_messages").insert(CHAT.filter(([slug]) => room.has(slug)).map(([slug, d, body, hours]) => ({
      room_id: room.get(slug), dealer_id: ids[d], body, created_at: daysAgo(0, hours),
    })));
    if (r.error) throw new Error(r.error.message);
    await db.from("favorites").upsert([kodiaq, sprinter, byName("Hyundai", "Kona Elektro")].map((l) => ({ dealer_id: me, listing_id: l.id })));
    await db.from("saved_searches").insert([
      { dealer_id: me, name: `${DEMO_SEARCH}Kombi Diesel`, filters: { kraftstoff: "Diesel", preis_bis: "20000", km_bis: "160000" } },
      { dealer_id: me, name: `${DEMO_SEARCH}Transporter`, filters: { kategorie: "transporter", mwst: "ausweisbar" } },
    ]);
    r = await db.from("reviews").insert([
      { reviewer_id: ids[1], dealer_id: ids[0], rating: 5, comment: "Fahrzeug wie beschrieben, Abwicklung in zwei Tagen." },
      { reviewer_id: ids[2], dealer_id: ids[0], rating: 4, comment: "Ehrliche Mängelangaben, gerne wieder." },
      { reviewer_id: ids[0], dealer_id: ids[1], rating: 5, comment: "Schnelle Antwort, faire Verhandlung." },
      { reviewer_id: ids[3], dealer_id: ids[4], rating: 5, comment: "Transporter top vorbereitet, Papiere vollständig." },
      { reviewer_id: ids[4], dealer_id: ids[2], rating: 4, comment: "Alles in Ordnung, Übergabe etwas verspätet." },
      { reviewer_id: ids[5], dealer_id: ids[1], rating: 4, comment: "Unkompliziert." },
    ]);
    if (r.error) throw new Error(r.error.message);
  } catch (e) {
    console.error("Demodaten laden fehlgeschlagen:", e);
    await purge(db);
    return { error: "Die Demodaten konnten nicht vollständig geladen werden. Es wurde nichts übernommen." };
  }

  revalidatePath("/", "layout");
  return { ok: `Demodaten geladen: ${DEALERS.length} Händler, ${LISTINGS.length + OWN_LISTINGS.length} Fahrzeuge, dazu Nachrichten, Gebote, Gesuche und Chatbeiträge.` };
}

// Entfernt alles, was loadDemoData angelegt hat. Echte Händler und ihre Daten bleiben unberührt.
async function purge(db: ReturnType<typeof createAdminClient>) {
  const demoIds = await findDemoDealerIds(db);
  const { data: demoOwn } = await db.from("listings").select("id").or(`vin.like.${DEMO_VIN}%,vin.like.${DEMO_VIN_OLD}%`);
  const { data: demoListings } = demoIds.length
    ? await db.from("listings").select("id").in("dealer_id", demoIds)
    : { data: [] as { id: string }[] };
  const listingIds = [...(demoOwn ?? []), ...(demoListings ?? [])].map((l) => l.id);
  if (listingIds.length) {
    const { data: imgs } = await db.from("listing_images").select("path").in("listing_id", listingIds);
    if (imgs?.length) await db.storage.from("fahrzeugbilder").remove(imgs.map((i) => i.path));
  }
  if (demoOwn?.length) await db.from("listings").delete().in("id", demoOwn.map((l) => l.id));
  await db.from("saved_searches").delete().like("name", `${DEMO_SEARCH}%`);
  for (const id of demoIds) await db.auth.admin.deleteUser(id);
  return demoIds.length;
}

export async function removeDemoData(_: ActionState): Promise<ActionState> {
  void _;
  await requireAdmin();
  const n = await purge(createAdminClient());
  revalidatePath("/", "layout");
  return { ok: n ? "Demodaten entfernt." : "Es waren keine Demodaten vorhanden." };
}
