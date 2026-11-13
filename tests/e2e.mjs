// End-to-End-Test der Händlerplattform gegen eine lokale Instanz.
// Aufruf: node tests/e2e.mjs   (App auf :3000, lokales Supabase laufend)
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const SHOTS = process.env.SHOTS_DIR || path.resolve("tests/screenshots");
const DB = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const run = Date.now();
fs.mkdirSync(SHOTS, { recursive: true });

const sql = (q) => execSync(`psql "${DB}" -At -c "${q.replace(/"/g, '\\"')}"`).toString().trim();
let passed = 0;
const failures = [];
function check(name, cond, detail = "") {
  if (cond) { passed++; console.log(`  ok   ${name}`); }
  else { failures.push(name); console.log(`  FAIL ${name} ${detail}`); }
}

const browser = await chromium.launch();
const licence = path.join(SHOTS, "_gewerbeschein.png");
const photo1 = path.join(SHOTS, "_foto1.png");
const photo2 = path.join(SHOTS, "_foto2.png");
const photo3 = path.join(SHOTS, "_foto3.png");
{
  const p = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  for (const [file, color, label] of [[licence, "#fff", "Gewerbeanmeldung (Test)"], [photo1, "#3b6ea5", "Testfoto 1"], [photo2, "#7a8b99", "Testfoto 2"], [photo3, "#8a7a5c", "Testfoto 3"]]) {
    await p.setContent(`<body style="margin:0;background:${color};display:flex;align-items:center;justify-content:center;height:100vh;font:60px sans-serif;color:#111">${label}</body>`);
    await p.screenshot({ path: file });
  }
  await p.close();
}

async function register(name, company, zip, { mobile = false, invite = null } = {}) {
  const ctx = await browser.newContext(mobile
    ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
    : { viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const email = `${name}-${run}@test.example`;
  if (invite) {
    await page.goto(`${BASE}/einladung/${invite}`);
    await page.waitForURL(/registrieren/);
  } else {
    await page.goto(`${BASE}/registrieren`);
  }
  await page.fill("#email", email);
  await page.fill("#password", "Geheim1234!");
  await page.check('input[name="b2b"]');
  await page.check('input[name="agb"]');
  await page.click('button[type="submit"]');
  await page.waitForURL("**/onboarding");
  await page.fill("#company_name", company);
  await page.fill("#contact_name", `Kontakt ${name}`);
  await page.fill("#vat_id", "DE123456789");
  await page.fill("#street", "Teststraße 1");
  await page.fill("#zip", zip);
  await page.fill("#phone", "0221 1234567");
  await page.fill("#whatsapp", "0171 1234567");
  await page.setInputFiles("#license", licence);
  await page.click('button:has-text("Zur Prüfung einreichen")');
  await page.waitForURL("**/status");
  const id = sql(`select id from auth.users where email='${email}'`);
  return { ctx, page, email, id, company };
}

let vinCounter = 0;
const nextVin = () => `WVWZZZ1KZ${String(run % 100000).padStart(5, "0")}${String(++vinCounter).padStart(3, "0")}`;

async function createListing(page, o) {
  await page.goto(`${BASE}/inserieren`);
  await page.fill("#l-make", o.make);
  await page.fill("#l-model", o.model);
  await page.fill("#l-variant", o.variant ?? "");
  await page.fill("#l-vin", o.vin ?? nextVin());
  await page.fill("#l-first_registration", o.ez ?? "2018-05");
  await page.fill("#l-mileage", String(o.km ?? 98000));
  await page.selectOption("#l-fuel", o.fuel ?? "Diesel");
  await page.selectOption("#l-transmission", "Schaltgetriebe");
  await page.fill("#l-power_kw", "110");
  await page.fill("#l-price", String(o.price));
  await page.selectOption("#l-vat_type", o.vat ?? "differenz");
  if (o.net) await page.check('input[name="net"] >> nth=1');
  if (o.urgent) await page.getByLabel(/Muss schnell weg/).check();
  const photos = o.photos ?? [photo1, photo2, photo3];
  await page.setInputFiles('input[type="file"]', photos);
  await page.waitForFunction((n) => document.querySelectorAll('img[alt^="Foto "]').length === n, photos.length);
  await page.selectOption("#l-accident_free", "ja");
  await page.getByLabel("Lack / Kratzer", { exact: true }).check();
  await page.fill("#l-damage", o.damage ?? "Kratzer am Stoßfänger hinten");
  if (o.features) {
    await page.click("summary:has-text('Weitere Angaben')");
    for (const f of o.features) await page.getByLabel(f, { exact: true }).check();
  }
  await page.getByLabel(/Pflichtbestätigung/).check();
  await page.click('button:has-text("Inserat veröffentlichen")');
  await page.waitForURL(/\/inserat\/[0-9a-f-]{36}$/);
  return page.url().split("/").pop();
}

async function approve(adminPage, user) {
  await adminPage.goto(`${BASE}/admin`);
  await adminPage.locator("div.card", { hasText: user.email }).getByRole("button", { name: "Freigeben" }).click();
  for (let i = 0; i < 40; i++) {
    if (sql(`select status from public.dealers where id='${user.id}'`) === "freigegeben") return;
    await adminPage.waitForTimeout(250);
  }
  throw new Error("Freigabe nicht durchgeführt");
}

const shot = (page, name, full = false) => page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: full });

try {
  console.log("\n1. Öffentliche Seiten");
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
    const p = await ctx.newPage();
    await p.goto(BASE);
    check("Startseite zeigt freie Gründerplätze", await p.getByText("Gründerplätze frei").first().isVisible());
    await shot(p, "01-startseite", true);
    await p.goto(`${BASE}/preise`);
    await shot(p, "02-preise");
    await p.setViewportSize({ width: 390, height: 844 });
    await p.goto(BASE);
    check("Startseite mobil ohne horizontales Scrollen", !(await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)));
    await shot(p, "01b-startseite-mobil", true);
    await p.setViewportSize({ width: 1280, height: 900 });
    await p.goto(`${BASE}/suche`);
    check("Suche ohne Login leitet zum Login", p.url().endsWith("/login"));
    for (const u of ["/agb", "/datenschutz", "/impressum"]) {
      const r = await p.goto(BASE + u);
      check(`${u} erreichbar und als Entwurf markiert`, r.status() === 200 && await p.getByText("Entwurf.").first().isVisible());
    }
    await ctx.close();
  }

  console.log("\n2. Registrierung, Sperre bis Freigabe");
  const admin = await register("admin", "Plattform Betreiber GmbH", "50667");
  sql(`update public.dealers set is_admin=true, status='freigegeben' where id='${admin.id}'`);
  const a = await register("haendler-a", "Autohaus Alpha GmbH", "50667");
  await shot(a.page, "03-status-wartend");
  check("Wartender Händler sieht Prüfhinweis", await a.page.getByText("Ihre Angaben werden geprüft").first().isVisible());
  await a.page.goto(`${BASE}/suche`);
  check("Wartender Händler kommt nicht in die Suche", a.page.url().endsWith("/status"));
  await a.page.goto(`${BASE}/admin`);
  check("Wartender Händler kommt nicht in den Admin-Bereich", a.page.url().endsWith("/status"));

  console.log("\n3. Admin-Freigabe");
  await admin.page.goto(`${BASE}/admin`);
  check("Admin sieht Freigabe-Warteschlange", await admin.page.getByText("Autohaus Alpha GmbH").first().isVisible());
  const licHref = await admin.page.getByRole("link", { name: "Gewerbenachweis öffnen" }).first().getAttribute("href");
  const licRes = await admin.page.request.get(licHref);
  check("Admin kann Gewerbenachweis öffnen", licRes.status() === 200);
  await shot(admin.page, "04-admin-freigaben");
  await approve(admin.page, a);
  check("Händler A ist freigegeben mit Gründerplatz Nr. 1",
    sql(`select status||'|'||is_founding||'|'||founding_number from public.dealers where id='${a.id}'`) === "freigegeben|true|1");
  await a.page.goto(`${BASE}/suche`);
  check("Freigegebener Händler erreicht die Suche", a.page.url().includes("/suche"));

  console.log("\n4. Inserieren");
  const l1 = await createListing(a.page, { make: "Volkswagen", model: "Golf", variant: "2.0 TDI Highline", price: 11900, urgent: true,
    features: ["Klimaautomatik", "Navigationssystem", "Anhängerkupplung"] });
  check("Inserat angelegt und Detailseite sichtbar", await a.page.getByRole("heading", { name: /Volkswagen Golf/ }).first().isVisible());
  check("B2B-Hinweis auf dem Inserat", await a.page.getByText("unter Ausschluss der Sachmängelhaftung").first().isVisible());
  check("Drei Fotos gespeichert", sql(`select count(*) from public.listing_images where listing_id='${l1}'`) === "3");
  check("Standort aus PLZ ermittelt", sql(`select city from public.listings where id='${l1}'`) === "Köln");
  await shot(a.page, "05-inserat-eigene-ansicht", true);
  await createListing(a.page, { make: "BMW", model: "320d", variant: "Touring", price: 15000, vat: "ausweisbar", net: true, km: 142000, ez: "2017-03" });
  check("Nettopreis wird in Brutto umgerechnet", await a.page.getByText("17.850").first().isVisible());

  console.log("\n5. Zweiter Händler: Suche, Filter, Umkreis");
  const b = await register("haendler-b", "Beta Automobile e.K.", "40213");
  await approve(admin.page, b);
  await b.page.goto(`${BASE}/suche`);
  check("Händler B sieht beide Fahrzeuge", await b.page.getByRole("heading", { name: "2 Fahrzeuge" }).first().isVisible());
  await shot(b.page, "06-suche", true);
  await b.page.goto(`${BASE}/suche?marke=Volkswagen&plz=40213&umkreis=50&sort=naehe`);
  check("Filter Marke + 50 km um Düsseldorf findet den Golf in Köln", await b.page.getByRole("heading", { name: "1 Fahrzeug" }).first().isVisible()
    && await b.page.locator("text=/km entfernt/ >> visible=true").first().isVisible());
  await b.page.goto(`${BASE}/suche?plz=80331&umkreis=50`);
  check("50 km um München findet nichts", await b.page.getByRole("heading", { name: "0 Fahrzeuge" }).first().isVisible());
  await b.page.goto(`${BASE}/suche?preis_bis=12000&mwst=differenz&dringend=1`);
  check("Filter Preis/Besteuerung/dringend", await b.page.getByRole("heading", { name: "1 Fahrzeug" }).first().isVisible());

  await b.page.goto(`${BASE}/suche`);
  check("Suche zeigt standardmäßig die Tabelle mit Standzeit",
    await b.page.locator("table").first().isVisible() && await b.page.getByText("heute neu").first().isVisible());
  await b.page.getByRole("link", { name: "Fotos", exact: true }).click();
  await b.page.waitForURL(/ansicht=karten/);
  check("Umschalter zeigt die Fotoansicht", (await b.page.locator("article").count()) === 2 && (await b.page.locator("table").count()) === 0);
  await shot(b.page, "06b-suche-fotos", true);

  console.log("\n6. Suchauftrag und Merkliste");
  await b.page.goto(`${BASE}/suche?marke=Audi&preis_bis=30000`);
  await b.page.getByRole("button", { name: "Suche speichern" }).click();
  await b.page.getByText("Suchauftrag gespeichert").first().waitFor();
  await b.page.goto(`${BASE}/suchauftraege`);
  check("Suchauftrag gelistet", await b.page.getByText("Audi, bis 30.000 €").first().isVisible());
  await shot(b.page, "07-suchauftraege");
  await b.page.goto(`${BASE}/suche`);
  await b.page.getByRole("button", { name: "Auf die Merkliste setzen" }).first().click();
  await b.page.getByRole("button", { name: "Von der Merkliste entfernen" }).first().waitFor();
  await b.page.goto(`${BASE}/merkliste`);
  check("Fahrzeug auf der Merkliste", (await b.page.locator("article").count()) === 1);

  console.log("\n7. Direktchat in Echtzeit");
  await b.page.goto(`${BASE}/inserat/${l1}`);
  await shot(b.page, "08-inserat-kaeufer-ansicht", true);
  check("Telefon- und WhatsApp-Button vorhanden",
    await b.page.getByRole("link", { name: "Anrufen" }).first().isVisible()
    && (await b.page.getByRole("link", { name: "WhatsApp", exact: true }).getAttribute("href")).startsWith("https://wa.me/491711234567"));
  await b.page.fill('textarea[name="body"]', "Guten Tag, ist der Golf noch da? Letzter Preis?");
  await b.page.getByRole("button", { name: "Nachricht senden" }).click();
  await b.page.waitForURL(/\/nachrichten\/[0-9a-f-]{36}$/);
  const convUrl = b.page.url();
  await a.page.goto(`${BASE}/suche`);
  check("Händler A sieht Ungelesen-Zähler", await a.page.locator("nav .badge", { hasText: "1" }).first().isVisible());
  await a.page.goto(convUrl);
  check("Händler A sieht die Nachricht", await a.page.getByText("ist der Golf noch da").first().isVisible());
  await a.page.waitForTimeout(1500);
  await a.page.fill("#chat-input", "Ja, steht bereit. 11.500 wären machbar.");
  await a.page.getByRole("button", { name: "Senden" }).click();
  let realtime = true;
  try { await b.page.getByText("11.500 wären machbar").first().waitFor({ timeout: 8000 }); } catch { realtime = false; }
  check("Antwort erscheint bei Händler B ohne Neuladen (Echtzeit)", realtime);
  await shot(b.page, "09-direktchat");
  const strangerRes = await admin.page.goto(convUrl);
  check("Dritte können fremde Unterhaltung nicht öffnen", strangerRes.status() === 404);

  console.log("\n8. Gebot, Gegenangebot, Annahme");
  await b.page.goto(`${BASE}/inserat/${l1}`);
  await b.page.fill("#offer-amount", "10500");
  await b.page.fill("#offer-note", "Abholung Freitag");
  await b.page.getByRole("button", { name: "Gebot abgeben" }).click();
  await b.page.getByText("Ihr Gebot über 10.500").first().waitFor();
  await a.page.goto(`${BASE}/gebote`);
  check("Verkäufer sieht Gebot", await a.page.getByText("10.500").first().isVisible());
  await a.page.fill('input[name="amount"]', "11200");
  await a.page.getByRole("button", { name: "Kontern" }).click();
  await a.page.getByText("Gegenangebot 11.200").first().waitFor();
  await shot(a.page, "10-gebote-verkaeufer", true);
  await b.page.goto(`${BASE}/gebote`);
  await b.page.getByRole("button", { name: /Gegenangebot .* annehmen/ }).click();
  await b.page.getByText("Preiseinigung erzielt").first().waitFor();
  check("Gebot ist angenommen", sql(`select status||'|'||counter_amount from public.offers where listing_id='${l1}'`) === "angenommen|11200");
  await shot(b.page, "11-gebote-kaeufer", true);

  console.log("\n9. Bewertung und Händlerprofil");
  await b.page.goto(`${BASE}/haendler/${a.id}`);
  await b.page.selectOption("#r-rating", "4");
  await b.page.fill("#r-comment", "Schnelle, ehrliche Abwicklung.");
  await b.page.getByRole("button", { name: "Bewertung speichern" }).click();
  await b.page.getByText("Bewertung gespeichert.").first().waitFor();
  await b.page.reload();
  check("Bewertung erscheint im Profil", await b.page.getByText("Schnelle, ehrliche Abwicklung.").first().isVisible());
  await shot(b.page, "12-haendlerprofil", true);
  await admin.page.goto(`${BASE}/haendler/${a.id}`);
  check("Ohne Kontakt keine Bewertung möglich", await admin.page.getByText("Bewerten können Sie, sobald").first().isVisible());

  console.log("\n9b. Qualität: Pflichtangaben und Vollständigkeit");
  {
    await a.page.goto(`${BASE}/inserieren`);
    await a.page.fill("#l-make", "Test");
    await a.page.fill("#l-model", "Pflicht");
    await a.page.fill("#l-vin", "wvwzzz1kz0000");
    check("Zu kurze FIN wird im Formular markiert", await a.page.getByText("13 von 17 Zeichen").first().isVisible());
    await a.page.fill("#l-vin", nextVin());
    await a.page.fill("#l-first_registration", "2020-01");
    await a.page.fill("#l-mileage", "50000");
    await a.page.fill("#l-price", "5000");
    const before = await a.page.getByTestId("quality-score").innerText();
    await a.page.setInputFiles('input[type="file"]', [photo1, photo2]);
    await a.page.waitForFunction(() => document.querySelectorAll('img[alt^="Foto "]').length === 2);
    await a.page.getByLabel(/Pflichtbestätigung/).check();
    await a.page.click('button:has-text("Inserat veröffentlichen")');
    check("Inserat mit zwei Fotos und ohne Mängelangabe wird abgelehnt",
      await a.page.getByText(/Es fehlt noch: mindestens 3 Fotos/).first().isVisible() && a.page.url().endsWith("/inserieren"));
    await a.page.getByLabel("Keine bekannten Mängel", { exact: true }).check();
    await a.page.selectOption("#l-accident_free", "ja");
    const after = await a.page.getByTestId("quality-score").innerText();
    check("Vollständigkeitsanzeige steigt mit den Angaben", parseInt(after) > parseInt(before), `${before} -> ${after}`);
    const vinL1 = sql(`select vin from public.listings where id='${l1}'`);
    await a.page.setInputFiles('input[type="file"]', [photo3]);
    await a.page.waitForFunction(() => document.querySelectorAll('img[alt^="Foto "]').length === 3);
    await a.page.fill("#l-vin", vinL1);
    await a.page.click('button:has-text("Inserat veröffentlichen")');
    check("Dieselbe FIN kann nicht zweimal inseriert werden", await a.page.getByText("bereits inseriert").first().waitFor({ timeout: 10000 }).then(() => true, () => false));
    check("Kein Pflicht-Inserat gespeichert", sql("select count(*) from public.listings where make='Test'") === "0");
    await b.page.goto(`${BASE}/inserat/${l1}`);
    check("Käufer sieht die FIN mit Verweis zu carVertical",
      (await b.page.getByTestId("vin").innerText()) === vinL1
      && (await b.page.getByRole("link", { name: /carVertical/ }).getAttribute("href")).endsWith(`vin=${vinL1}`));
    await shot(b.page, "25-inserat-fin", true);
    await a.page.goto(`${BASE}/inserat/${l1}`);
    check("Mängel-Checkliste auf dem Inserat sichtbar", await a.page.getByText("Lack / Kratzer").first().isVisible());
    check("Qualitätswert gespeichert", Number(sql(`select quality_score from public.listings where id='${l1}'`)) >= 60);
  }

  console.log("\n9c. Handel: Ablauf, Preisänderung, Schnellgebot");
  {
    sql(`alter table public.listings disable trigger listings_before_write`);
    sql(`update public.listings set expires_at = now() - interval '1 day' where id='${l1}'`);
    sql(`alter table public.listings enable trigger listings_before_write`);
    await b.page.goto(`${BASE}/suche`);
    check("Abgelaufenes Inserat ist für andere nicht mehr in der Suche", await b.page.getByRole("heading", { name: "1 Fahrzeug" }).first().isVisible());
    const gone = await b.page.goto(`${BASE}/inserat/${l1}`);
    check("Abgelaufenes Inserat für andere nicht aufrufbar", gone.status() === 404);
    await a.page.goto(`${BASE}/meine-inserate`);
    check("Eigentümer sieht den Hinweis Abgelaufen", await a.page.getByText("Abgelaufen").first().isVisible());
    await shot(a.page, "20-meine-inserate-ablauf", true);
    await a.page.locator("div.card", { hasText: "Volkswagen Golf" }).getByRole("button", { name: "30 Tage verlängern" }).click();
    await a.page.getByText(/läuft in (29|30) Tagen ab/).first().waitFor();
    await b.page.goto(`${BASE}/suche`);
    check("Nach dem Verlängern wieder sichtbar", await b.page.getByRole("heading", { name: "2 Fahrzeuge" }).first().isVisible());

    const bmw = sql("select id from public.listings where make='BMW'");
    await a.page.goto(`${BASE}/inserat/${bmw}/bearbeiten`);
    await a.page.fill("#l-price", "14000");
    await a.page.click('button:has-text("Änderungen speichern")');
    await a.page.waitForURL(new RegExp(`/inserat/${bmw}$`));
    check("Preisänderung in der Datenbank vermerkt", sql(`select previous_price_gross||'>'||price_gross from public.listings where id='${bmw}'`) === "17850>16660");
    await b.page.goto(`${BASE}/suche?preis_gesenkt=1`);
    check("Filter „Preis gesenkt“ findet das Fahrzeug mit Hinweis",
      await b.page.getByRole("heading", { name: "1 Fahrzeug" }).first().isVisible() && await b.page.locator("text=/▼ −1\\.190/ >> visible=true").first().isVisible());
    await shot(b.page, "21-suche-preis-gesenkt", true);
    const offersBefore = Number(sql("select count(*) from public.offers"));
    await b.page.getByRole("button", { name: "Bieten" }).first().click();
    await b.page.locator(`#qo-${bmw}`).fill("15500");
    await b.page.getByRole("button", { name: "OK" }).click();
    await b.page.getByText("Gebot gesendet").first().waitFor();
    check("Schnellgebot aus der Liste erzeugt ein Gebot",
      Number(sql("select count(*) from public.offers")) === offersBefore + 1 && sql(`select amount from public.offers where listing_id='${bmw}'`) === "15500");
  }

  console.log("\n9d. Wachstum: Einladung, Vorschauseite, Rechner");
  {
    const code = sql(`select invite_code from public.dealers where id='${a.id}'`);
    const d = await register("haendler-d", "Delta Mobile GmbH", "44135", { invite: code });
    check("Einladungslink trägt den Werber ein", sql(`select invited_by from public.dealers where id='${d.id}'`) === a.id);
    await a.page.goto(`${BASE}/konto`);
    check("Konto zeigt Einladungslink und Zähler",
      (await a.page.locator("#copy-field").inputValue()).endsWith(`/einladung/${code}`) && (await a.page.getByTestId("invited-count").innerText()) === "1");
    await shot(a.page, "22-konto-einladung", true);
    sql(`delete from auth.users where id='${d.id}'`);
    await d.ctx.close();

    const anon = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
    const tp = await anon.newPage();
    const res = await tp.goto(`${BASE}/a/${l1}`);
    const html = await tp.content();
    check("Vorschauseite ohne Login erreichbar", res.status() === 200 && await tp.getByRole("heading", { name: /Volkswagen Golf/ }).first().isVisible());
    check("Vorschauseite verrät weder Preis noch Händler (auch nicht im Quelltext)",
      !html.includes("11.900") && !html.includes("11900") && !html.includes("Autohaus Alpha") && !html.includes("0221 1234567")
      && !html.includes(sql(`select vin from public.listings where id='${l1}'`)));
    check("Vorschauseite hat Vorschaubild für WhatsApp und ist für Suchmaschinen gesperrt",
      (await tp.locator('meta[property="og:image"]').count()) === 1 && (await tp.locator('meta[name="robots"]').getAttribute("content")).includes("noindex"));
    await shot(tp, "23-vorschauseite", true);
    await tp.goto(BASE);
    await tp.fill("#calc-current", "4000");
    check("Ersparnisrechner rechnet", await tp.getByText("47.761 €").first().isVisible());
    await shot(tp, "24-startseite-rechner", true);
    const noAuth = await fetch(`${BASE}/api/cron/ablauf`);
    const withAuth = await fetch(`${BASE}/api/cron/ablauf`, { headers: { Authorization: "Bearer testcron" } });
    check("Erinnerungslauf nur mit Geheimnis aufrufbar", noAuth.status === 401 && withAuth.status === 200);
    await anon.close();
  }

  console.log("\n10. Suchgesuche");
  await b.page.goto(`${BASE}/gesuche/neu`);
  await b.page.fill("#w-title", "Suche Audi A4 Avant Diesel bis 18.000 €");
  await b.page.selectOption("#w-cat", "pkw");
  await b.page.fill("#w-make", "Audi");
  await b.page.fill("#w-model", "A4 Avant");
  await b.page.fill("#w-price", "18000");
  await b.page.getByRole("button", { name: "Gesuch veröffentlichen" }).click();
  await b.page.waitForURL("**/gesuche");
  await a.page.goto(`${BASE}/gesuche`);
  check("Händler A sieht das Gesuch", await a.page.getByText("Suche Audi A4 Avant").first().isVisible());
  await shot(a.page, "13-gesuche");
  await a.page.click("summary:has-text('Fahrzeug anbieten')");
  await a.page.fill('textarea[name="body"]', "Habe einen A4 Avant 2.0 TDI, EZ 2019, 17.500 €.");
  await a.page.getByRole("button", { name: "Nachricht senden" }).click();
  await a.page.waitForURL(/\/nachrichten\/[0-9a-f-]{36}$/);
  await b.page.goto(`${BASE}/nachrichten`);
  check("Antwort aufs Gesuch landet in den Nachrichten", await b.page.getByText("Gesuch: Suche Audi A4").first().isVisible());
  await shot(b.page, "14-nachrichten");

  console.log("\n11. Gruppenchat in Echtzeit");
  await a.page.goto(`${BASE}/chat/allgemein`);
  await b.page.goto(`${BASE}/chat/allgemein`);
  await b.page.waitForTimeout(1500);
  await a.page.fill("#chat-input", "Moin zusammen, hat jemand einen Sprinter Kasten?");
  await a.page.getByRole("button", { name: "Senden" }).click();
  let room = true;
  try { await b.page.getByText("Sprinter Kasten").first().waitFor({ timeout: 8000 }); } catch { room = false; }
  check("Gruppennachricht erscheint in Echtzeit", room);
  let sender = true;
  try { await b.page.getByText("Autohaus Alpha GmbH").first().waitFor({ timeout: 5000 }); } catch { sender = false; }
  check("Gruppennachricht zeigt den Absender", sender);
  await shot(b.page, "15-gruppenchat");

  console.log("\n12. Suchauftrag löst E-Mail aus");
  const logFile = process.env.SERVER_LOG;
  const before = logFile ? fs.readFileSync(logFile, "utf8").length : 0;
  await createListing(a.page, { make: "Audi", model: "A6", variant: "Avant", price: 24900, km: 88000, ez: "2019-09" });
  if (logFile) {
    const log = fs.readFileSync(logFile, "utf8").slice(before);
    check("E-Mail an Händler B für Suchauftrag erzeugt", log.includes(b.email) && log.includes("Neuer Treffer"));
  }
  await createListing(a.page, { make: "Audi", model: "Q7", price: 45000 });
  if (logFile) {
    const log = fs.readFileSync(logFile, "utf8").slice(before);
    check("Kein Treffer über der Preisgrenze", !log.includes("Audi Q7"));
  }

  console.log("\n13. Gratisplätze ausgeschöpft, Abo und Stripe-Webhook");
  const c = await register("haendler-c", "Gamma Cars UG", "20095");
  // Gründerplätze für den Test auf "voll" stellen (2 vergeben, Limit 2)
  const env = Object.fromEntries(fs.readFileSync(".env.local", "utf8").split("\n").filter((l) => l.includes("=")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]));
  const api = env.NEXT_PUBLIC_SUPABASE_URL, anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const tokenOf = async (u) => {
    const r = await fetch(`${api}/auth/v1/token?grant_type=password`, {
      method: "POST", headers: { apikey: anon, "Content-Type": "application/json" },
      body: JSON.stringify({ email: u.email, password: "Geheim1234!" }) });
    return (await r.json()).access_token;
  };
  const session = { access_token: await tokenOf(admin) };
  const rpc = await fetch(`${api}/rest/v1/rpc/admin_set_dealer_status`, {
    method: "POST", headers: { apikey: anon, Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ p_dealer: c.id, p_status: "freigegeben", p_total: 2 }),
  });
  check("Freigabe ohne freien Gründerplatz", rpc.ok && sql(`select status||'|'||is_founding from public.dealers where id='${c.id}'`) === "freigegeben|false");
  await c.page.goto(`${BASE}/suche`);
  check("Händler ohne Gratisplatz landet auf der Abo-Seite", c.page.url().endsWith("/abo"));
  await shot(c.page, "16-abo");

  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe("sk_test_dummy");
  const send = async (type, status) => {
    const payload = JSON.stringify({ id: `evt_${Date.now()}`, object: "event", type,
      data: { object: { id: "sub_test1", object: "subscription", customer: "cus_test1", status, metadata: { dealer_id: c.id },
        items: { data: [{ current_period_end: Math.floor(Date.now() / 1000) + 2592000 }] } } } });
    const header = stripe.webhooks.generateTestHeaderString({ payload, secret: "whsec_testsecret" });
    return fetch(`${BASE}/api/stripe/webhook`, { method: "POST", headers: { "stripe-signature": header }, body: payload });
  };
  const bad = await fetch(`${BASE}/api/stripe/webhook`, { method: "POST", headers: { "stripe-signature": "t=1,v1=falsch" }, body: "{}" });
  check("Webhook lehnt falsche Signatur ab", bad.status === 400);
  check("Webhook nimmt signiertes Ereignis an", (await send("customer.subscription.updated", "active")).status === 200);
  await c.page.goto(`${BASE}/suche`);
  check("Nach Zahlung hat Händler C Zugang", c.page.url().includes("/suche") && await c.page.getByRole("heading", { name: /Fahrzeuge/ }).first().isVisible());
  await send("customer.subscription.deleted", "canceled");
  await c.page.goto(`${BASE}/suche`);
  check("Nach Kündigung ist der Zugang wieder gesperrt", c.page.url().endsWith("/abo"));

  console.log("\n14. Zugriffsschutz direkt an der Datenbank-Schnittstelle (RLS)");
  const rest = async (pathname, bearer) => {
    const r = await fetch(`${api}/rest/v1/${pathname}`, { headers: { apikey: anon, Authorization: `Bearer ${bearer ?? anon}` } });
    return { status: r.status, body: await r.json() };
  };
  let r = await rest("listings?select=id");
  check("Anonym: keine Inserate", Array.isArray(r.body) && r.body.length === 0);
  r = await rest("dealers?select=id");
  check("Anonym: keine Händlerdaten", Array.isArray(r.body) && r.body.length === 0);
  const tc = await tokenOf(c);
  r = await rest("listings?select=id", tc);
  check("Ohne Abo: keine Inserate per API", Array.isArray(r.body) && r.body.length === 0);
  r = await rest("messages?select=id", tc);
  check("Ohne Abo: keine Nachrichten per API", Array.isArray(r.body) && r.body.length === 0);
  const tb = await tokenOf(b);
  r = await rest("listings?select=id", tb);
  check("Freigegebener Händler: Inserate per API lesbar", Array.isArray(r.body) && r.body.length === 4);
  r = await rest("dealer_private?select=dealer_id", tb);
  check("Händler sieht nur eigene vertrauliche Daten", Array.isArray(r.body) && r.body.length === 1 && r.body[0].dealer_id === b.id);
  const patch = async (table, query, body, bearer) => fetch(`${api}/rest/v1/${table}?${query}`, {
    method: "PATCH", headers: { apikey: anon, Authorization: `Bearer ${bearer}`, "Content-Type": "application/json", Prefer: "return=representation" }, body: JSON.stringify(body) });
  let pr = await patch("dealers", `id=eq.${b.id}`, { is_admin: true }, tb);
  check("Händler kann sich nicht selbst zum Admin machen", pr.status >= 400 && sql(`select is_admin from public.dealers where id='${b.id}'`) === "f");
  pr = await patch("dealers", `id=eq.${c.id}`, { is_founding: true }, tc);
  check("Händler kann sich keinen Gründerplatz geben", pr.status >= 400);
  pr = await patch("dealer_private", `dealer_id=eq.${c.id}`, { subscription_status: "active" }, tc);
  check("Händler kann Abo-Status nicht fälschen", pr.status >= 400 && sql(`select coalesce(subscription_status,'') from public.dealer_private where dealer_id='${c.id}'`) === "canceled");
  pr = await patch("dealers", `id=eq.${b.id}`, { invited_by: a.id }, tb);
  check("Händler kann den Werber nicht selbst setzen", pr.status >= 400);
  pr = await patch("listings", `id=eq.${l1}`, { price: 1 }, tb);
  check("Fremdes Inserat nicht änderbar", sql(`select price from public.listings where id='${l1}'`) === "11900");
  const lic = await fetch(`${api}/storage/v1/object/authenticated/gewerbescheine/${sql(`select license_path from public.dealer_private where dealer_id='${a.id}'`)}`, { headers: { apikey: anon, Authorization: `Bearer ${tb}` } });
  check("Fremder Gewerbenachweis nicht abrufbar", lic.status >= 400);

  console.log("\n14b. Demodaten laden und entfernen");
  {
    const before = sql("select count(*) from public.listings");
    const slotsBefore = sql("select public.founding_slots_left(100)");
    await admin.page.goto(`${BASE}/admin`);
    await admin.page.getByRole("button", { name: "Demodaten laden" }).click();
    await admin.page.getByText(/Demodaten geladen: 6 Händler/).first().waitFor({ timeout: 60000 });
    check("Demodaten angelegt (16 + 2 Fahrzeuge, 6 Händler)",
      sql("select count(*) from public.listings") === String(Number(before) + 18)
      && sql("select count(*) from public.dealer_private where email like '%@demo.haendlerdeal.invalid'") === "6");
    check("Demo-Fotos hochgeladen", sql("select count(*) from public.listing_images where path like '%/demo-%'") === "10");
    check("Gründerplätze bleiben unverändert", sql("select public.founding_slots_left(100)") === slotsBefore);
    for (const [name, url] of [["suche", "/suche"], ["suche-fotos", "/suche?ansicht=karten"], ["nachrichten", "/nachrichten"], ["gebote", "/gebote"],
      ["gesuche", "/gesuche"], ["chat", "/chat/allgemein"], ["merkliste", "/merkliste"], ["suchauftraege", "/suchauftraege"], ["meine-inserate", "/meine-inserate"]]) {
      await admin.page.goto(BASE + url);
      await admin.page.waitForTimeout(400);
      await shot(admin.page, `demo-${name}`, true);
    }
    await admin.page.goto(`${BASE}/suche`);
    check("Suche zeigt Demo-Fahrzeuge mit Fotos", (await admin.page.locator('table img[src*="/demo-"]').count()) >= 8);
    await admin.page.goto(`${BASE}/gebote`);
    check("Gebote: erhalten und abgegeben gefüllt",
      await admin.page.getByRole("heading", { name: "Erhalten (2)" }).first().isVisible() && await admin.page.getByRole("heading", { name: "Abgegeben (2)" }).first().isVisible());
    await admin.page.goto(`${BASE}/inserat/${sql("select id from public.listings where make='Skoda' and model='Kodiaq'")}`);
    await shot(admin.page, "demo-inserat", true);
    await admin.page.goto(`${BASE}/haendler/${sql("select dealer_id from public.listings where make='Skoda' and model='Kodiaq'")}`);
    await shot(admin.page, "demo-haendler", true);
    await admin.page.goto(`${BASE}/admin`);
    check("Zweites Laden ist gesperrt", await admin.page.getByRole("button", { name: "Demodaten laden" }).isDisabled());
    await shot(admin.page, "demo-admin");
    await b.page.goto(`${BASE}/admin`);
    check("Nicht-Admin erreicht den Demodaten-Knopf nicht", !b.page.url().endsWith("/admin"));
    await admin.page.getByRole("button", { name: "Demodaten entfernen" }).click();
    await admin.page.getByText("Demodaten entfernt.").first().waitFor({ timeout: 60000 });
    check("Demodaten vollständig entfernt, echte Daten unberührt",
      sql("select count(*) from public.listings") === before
      && sql("select count(*) from public.dealer_private where email like '%@demo.haendlerdeal.invalid'") === "0"
      && sql("select count(*) from auth.users where email like '%@demo.haendlerdeal.invalid'") === "0"
      && sql("select count(*) from storage.objects where name like '%/demo-%'") === "0"
      && sql("select count(*) from public.saved_searches where name like 'Demo: %'") === "0");
  }

  console.log("\n15. Mobile Ansicht");
  {
    const m = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await m.addCookies(await b.ctx.cookies());
    const p = await m.newPage();
    const pub = await m.newPage();
    await pub.goto(`${BASE}/preise`);
    check("Öffentliche Seite mobil ohne horizontales Scrollen", !(await pub.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)));
    await pub.close();
    await p.goto(`${BASE}/suche`);
    const overflow = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    check("Suche mobil ohne horizontales Scrollen", !overflow);
    await shot(p, "17-mobil-suche", true);
    await p.goto(`${BASE}/inserat/${l1}`);
    check("Inserat mobil ohne horizontales Scrollen", !(await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)));
    await shot(p, "18-mobil-inserat", true);
    await p.goto(`${BASE}/inserieren`);
    check("Formular mobil ohne horizontales Scrollen", !(await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)));
    await shot(p, "19-mobil-inserieren", true);
    await m.close();
  }
} catch (e) {
  failures.push(`Abbruch: ${e.message.split("\n")[0]}`);
  console.error(e);
} finally {
  await browser.close();
}

console.log(`\n${passed} bestanden, ${failures.length} fehlgeschlagen`);
if (failures.length) { console.log(failures.map((f) => ` - ${f}`).join("\n")); process.exit(1); }
