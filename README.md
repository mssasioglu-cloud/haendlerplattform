# HändlerDeal – B2B-Fahrzeugbörse für Händler

Marktplatz, auf dem geprüfte Gewerbetreibende Fahrzeuge an andere Händler vermitteln.
Flatrate statt Kosten pro Inserat, die ersten 100 Händler sind dauerhaft kostenlos.

Name, Preis und Anzahl der Gratisplätze stehen in `src/config/site.ts`.

## Funktionen

- Registrierung mit Gewerbenachweis, manuelle Freigabe im Admin-Bereich
- Inserate nur für freigeschaltete Händler sichtbar (Row Level Security in der Datenbank)
- Schnell-Formular mit Foto-Upload, optionale Ausstattung, alle Fahrzeugarten
- Suche mit Filtern, PLZ-Umkreis, Sortierung, „Muss schnell weg“
- Direktchat und Gruppenchats in Echtzeit, Telefon- und WhatsApp-Button
- Gebote mit Gegenangebot, Suchgesuche-Board, Merkliste, Suchaufträge mit E-Mail
- Händlerprofile mit Bewertungen
- Stripe-Abo ab Händler 101, Kundenportal für Rechnungen und Kündigung
- Pflichtangaben und Mängel-Checkliste, Vollständigkeitsanzeige, bevorzugte Anzeige vollständiger Inserate
- Inserate laufen nach 30 Tagen ab (Verlängern mit einem Klick, Erinnerung per E-Mail über Vercel Cron, `CRON_SECRET`)
- Preisänderung mit Filter „Preis gesenkt“, Schnellgebot aus der Liste, Antwortzeit am Händlerprofil
- Einladungslinks, öffentliche Vorschauseite zum Teilen (ohne Preis und Händler), Ersparnisrechner
- Demodaten im Admin-Bereich laden und entfernen

## Technik

Next.js (App Router) · Tailwind CSS · Supabase (Postgres, Auth, Storage, Realtime) · Stripe · Resend

## Lokal starten

Voraussetzung: Node 20+, Docker.

```bash
npm install
```

```bash
npx supabase start
```

`npx supabase status -o env` zeigt URL und Schlüssel. Diese in `.env.local` eintragen (Vorlage: `.env.example`).

```bash
npm run dev
```

### Ersten Administrator anlegen

Normal registrieren, Firmendaten ausfüllen, dann einmalig in der Datenbank (Supabase → SQL Editor):

```sql
update public.dealers set is_admin = true, status = 'freigegeben'
where id = (select id from auth.users where email = 'IHRE-EMAIL');
```

Danach erscheint der Menüpunkt „Admin“.

## Livegang

1. **Supabase**: Projekt in Region Frankfurt anlegen. `npx supabase link` und `npx supabase db push`
   spielen Schema und PLZ-Daten ein. Unter Authentication → URL Configuration die eigene Domain als
   Site URL und `https://DOMAIN/auth/confirm` als Redirect-URL eintragen.
2. **Stripe**: Produkt „Händler-Flatrate“ mit monatlichem Preis anlegen (Preis-ID → `STRIPE_PRICE_ID`),
   SEPA-Lastschrift in den Zahlungsmethoden aktivieren, Kundenportal aktivieren. Webhook auf
   `https://DOMAIN/api/stripe/webhook` mit den Ereignissen `checkout.session.completed` und
   `customer.subscription.created/updated/deleted` (Signaturgeheimnis → `STRIPE_WEBHOOK_SECRET`).
3. **Resend**: Domain verifizieren, API-Schlüssel und Absender (`MAIL_FROM`) setzen.
4. **Vercel**: Repository importieren und alle Variablen aus `.env.example` eintragen.
5. **Rechtstexte**: AGB, Datenschutz und Impressum sind Entwürfe. Vor dem Start anwaltlich prüfen
   lassen und die Firmendaten in `src/config/site.ts` ergänzen.

## Tests

```bash
node tests/e2e.mjs
```

Der Test läuft im Browser gegen `localhost:3000` und die lokale Supabase-Instanz und legt Testhändler an.
Für die Stripe-Prüfungen muss die App mit `STRIPE_SECRET_KEY=sk_test_dummy STRIPE_PRICE_ID=price_dummy
STRIPE_WEBHOOK_SECRET=whsec_testsecret` gestartet sein. Screenshots landen in `tests/screenshots/`.

## Datenquellen

PLZ-Koordinaten: WZB `plz_geocoord` (Apache-2.0). Ortsnamen: OpenStreetMap-Mitwirkende (ODbL).
