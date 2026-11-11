-- ============================================================
-- Händlerplattform: Schema, Zugriffsregeln (RLS), Funktionen
-- ============================================================

-- ---------- PLZ-Koordinaten ----------
create table public.plz_geo (
  zip text primary key,
  city text not null default '',
  lat double precision not null,
  lng double precision not null
);
alter table public.plz_geo enable row level security;
create policy "plz lesen" on public.plz_geo for select using (true);

-- ---------- Händler ----------
create table public.dealers (
  id uuid primary key references auth.users (id) on delete cascade,
  company_name text not null check (char_length(company_name) between 2 and 120),
  contact_name text not null check (char_length(contact_name) between 2 and 120),
  street text not null default '',
  zip text not null check (zip ~ '^[0-9]{5}$'),
  city text not null default '',
  phone text not null default '',
  whatsapp text not null default '',
  about text not null default '',
  status text not null default 'ausstehend'
    check (status in ('ausstehend', 'freigegeben', 'abgelehnt', 'gesperrt')),
  rejection_reason text,
  is_admin boolean not null default false,
  is_founding boolean not null default false,
  founding_number int unique,
  b2b_confirmed_at timestamptz not null default now(),
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

-- Vertrauliche Händlerdaten: nur für den Händler selbst und Admins lesbar
create table public.dealer_private (
  dealer_id uuid primary key references public.dealers (id) on delete cascade,
  email text not null,
  vat_id text not null default '',
  license_path text,
  stripe_customer_id text unique,
  stripe_subscription_id text,
  subscription_status text,
  current_period_end timestamptz
);

create function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from dealers where id = auth.uid() and is_admin);
$$;

-- Zugang = freigegeben UND (Gründerplatz ODER laufendes Abo ODER Admin)
create function public.has_access() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from dealers d
    left join dealer_private p on p.dealer_id = d.id
    where d.id = auth.uid()
      and d.status = 'freigegeben'
      and (d.is_founding or d.is_admin or p.subscription_status in ('active', 'trialing'))
  );
$$;

alter table public.dealers enable row level security;
alter table public.dealer_private enable row level security;

create policy "eigenes profil oder freigegebene haendler lesen" on public.dealers for select
  using (id = auth.uid() or public.is_admin() or (public.has_access() and status = 'freigegeben'));
create policy "eigenes profil anlegen" on public.dealers for insert with check (id = auth.uid());
create policy "eigenes profil aendern" on public.dealers for update
  using (id = auth.uid()) with check (id = auth.uid());

create policy "eigene privatdaten lesen" on public.dealer_private for select
  using (dealer_id = auth.uid() or public.is_admin());
create policy "eigene privatdaten anlegen" on public.dealer_private for insert
  with check (dealer_id = auth.uid());
create policy "eigene privatdaten aendern" on public.dealer_private for update
  using (dealer_id = auth.uid()) with check (dealer_id = auth.uid());

-- Spaltenrechte: Status, Admin-Flag, Gründerplatz und Abo-Daten kann ein Händler nie selbst setzen
revoke insert, update on public.dealers from anon, authenticated;
grant insert (id, company_name, contact_name, street, zip, city, phone, whatsapp, about)
  on public.dealers to authenticated;
grant update (company_name, contact_name, street, zip, city, phone, whatsapp, about)
  on public.dealers to authenticated;
revoke insert, update on public.dealer_private from anon, authenticated;
grant insert (dealer_id, email, vat_id, license_path) on public.dealer_private to authenticated;
grant update (vat_id, license_path) on public.dealer_private to authenticated;

-- Freie Gründerplätze (für die öffentliche Startseite)
create function public.founding_slots_left(p_total int default 100) returns int
language sql stable security definer set search_path = public as $$
  select greatest(p_total - (select count(*)::int from dealers where is_founding), 0);
$$;
grant execute on function public.founding_slots_left(int) to anon, authenticated;

-- Admin: Händler freigeben / ablehnen / sperren. Vergibt Gründerplätze ohne Doppelvergabe.
create function public.admin_set_dealer_status(
  p_dealer uuid, p_status text, p_reason text default null, p_total int default 100
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_count int;
  v_cur record;
begin
  if not is_admin() then raise exception 'Nur für Administratoren'; end if;
  if p_status not in ('freigegeben', 'abgelehnt', 'gesperrt', 'ausstehend') then
    raise exception 'Ungültiger Status';
  end if;
  perform pg_advisory_xact_lock(471100);
  select * into v_cur from dealers where id = p_dealer for update;
  if not found then raise exception 'Händler nicht gefunden'; end if;

  if p_status = 'freigegeben' then
    if not v_cur.is_founding then
      select count(*) into v_count from dealers where is_founding;
      if v_count < p_total then
        update dealers set is_founding = true,
          founding_number = (select coalesce(max(founding_number), 0) + 1 from dealers)
        where id = p_dealer;
      end if;
    end if;
    update dealers set status = 'freigegeben', rejection_reason = null,
      approved_at = coalesce(approved_at, now()) where id = p_dealer;
  else
    update dealers set status = p_status, rejection_reason = p_reason where id = p_dealer;
  end if;
end;
$$;

-- ---------- Inserate ----------
create table public.listings (
  id uuid primary key default gen_random_uuid(),
  dealer_id uuid not null references public.dealers (id) on delete cascade,
  category text not null
    check (category in ('pkw', 'transporter', 'motorrad', 'wohnmobil', 'lkw', 'sonstiges')),
  make text not null check (char_length(make) between 1 and 60),
  model text not null check (char_length(model) between 1 and 80),
  variant text not null default '',
  first_registration date,
  mileage int check (mileage is null or mileage between 0 and 5000000),
  fuel text,
  transmission text,
  power_kw int check (power_kw is null or power_kw between 0 and 2000),
  color text,
  hu_until date,
  owners int check (owners is null or owners between 0 and 50),
  accident_free boolean,
  service_history boolean,
  roadworthy boolean not null default true,
  vin text,
  damage_notes text not null default '',
  description text not null default '',
  features text[] not null default '{}',
  extra jsonb not null default '{}',
  price int not null check (price between 1 and 100000000),
  vat_type text not null check (vat_type in ('ausweisbar', 'differenz')),
  price_is_net boolean not null default false,
  price_gross int generated always as (
    case when vat_type = 'ausweisbar' and price_is_net then round(price * 1.19)::int else price end
  ) stored,
  urgent boolean not null default false,
  status text not null default 'aktiv'
    check (status in ('aktiv', 'reserviert', 'verkauft', 'deaktiviert')),
  zip text not null check (zip ~ '^[0-9]{5}$'),
  city text not null default '',
  lat double precision,
  lng double precision,
  b2b_confirmed boolean not null check (b2b_confirmed),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index listings_search_idx on public.listings (status, category, make, created_at desc);
create index listings_dealer_idx on public.listings (dealer_id);

create function public.listings_before_write() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  select g.lat, g.lng, g.city into new.lat, new.lng, new.city from plz_geo g where g.zip = new.zip;
  return new;
end;
$$;
create trigger listings_before_write before insert or update on public.listings
  for each row execute function public.listings_before_write();

alter table public.listings enable row level security;
create policy "inserate lesen" on public.listings for select using (
  public.has_access()
  and (status in ('aktiv', 'reserviert') or dealer_id = auth.uid() or public.is_admin())
);
create policy "inserate anlegen" on public.listings for insert
  with check (public.has_access() and dealer_id = auth.uid());
create policy "inserate aendern" on public.listings for update
  using (public.has_access() and (dealer_id = auth.uid() or public.is_admin()))
  with check (dealer_id = auth.uid() or public.is_admin());
create policy "inserate loeschen" on public.listings for delete
  using (dealer_id = auth.uid() or public.is_admin());

create table public.listing_images (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  path text not null,
  position int not null default 0
);
create index listing_images_listing_idx on public.listing_images (listing_id, position);
alter table public.listing_images enable row level security;
create policy "bilder lesen" on public.listing_images for select using (public.has_access());
create policy "bilder schreiben" on public.listing_images for all
  using (exists (select 1 from public.listings l where l.id = listing_id and l.dealer_id = auth.uid()))
  with check (exists (select 1 from public.listings l where l.id = listing_id and l.dealer_id = auth.uid()));

-- Entfernung in km (Haversine)
create function public.distance_km(lat1 double precision, lng1 double precision,
                                   lat2 double precision, lng2 double precision)
returns double precision language sql immutable as $$
  select 6371 * 2 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2)
    + cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)
  ));
$$;

-- Suche: läuft mit den Rechten des Aufrufers, RLS greift also weiterhin
create function public.search_listings(
  p_category text default null, p_make text default null, p_model text default null,
  p_price_min int default null, p_price_max int default null,
  p_km_max int default null, p_year_min int default null, p_year_max int default null,
  p_fuel text default null, p_transmission text default null, p_vat_type text default null,
  p_urgent boolean default null, p_zip text default null, p_radius_km int default null,
  p_q text default null, p_sort text default 'neu', p_limit int default 24, p_offset int default 0
) returns table (
  id uuid, dealer_id uuid, category text, make text, model text, variant text,
  first_registration date, mileage int, fuel text, transmission text, power_kw int,
  price int, price_gross int, vat_type text, price_is_net boolean, urgent boolean, status text,
  zip text, city text, created_at timestamptz, cover_path text, image_count int,
  company_name text, distance double precision, total_count bigint
) language sql stable set search_path = public as $$
  with origin as (select lat, lng from plz_geo where zip = p_zip),
  base as (
    select l.*, case when o.lat is null or l.lat is null then null
                     else distance_km(o.lat, o.lng, l.lat, l.lng) end as dist
    from listings l left join origin o on true
    where l.status in ('aktiv', 'reserviert')
      and (p_category is null or l.category = p_category)
      and (p_make is null or lower(l.make) = lower(p_make))
      and (p_model is null or l.model ilike '%' || p_model || '%')
      and (p_price_min is null or l.price_gross >= p_price_min)
      and (p_price_max is null or l.price_gross <= p_price_max)
      and (p_km_max is null or l.mileage <= p_km_max)
      and (p_year_min is null or extract(year from l.first_registration) >= p_year_min)
      and (p_year_max is null or extract(year from l.first_registration) <= p_year_max)
      and (p_fuel is null or l.fuel = p_fuel)
      and (p_transmission is null or l.transmission = p_transmission)
      and (p_vat_type is null or l.vat_type = p_vat_type)
      and (p_urgent is not true or l.urgent)
      and (p_q is null or (l.make || ' ' || l.model || ' ' || l.variant || ' ' || l.description)
           ilike '%' || p_q || '%')
  ),
  filtered as (
    select * from base
    where p_radius_km is null or p_zip is null or (dist is not null and dist <= p_radius_km)
  )
  select f.id, f.dealer_id, f.category, f.make, f.model, f.variant, f.first_registration,
    f.mileage, f.fuel, f.transmission, f.power_kw, f.price, f.price_gross, f.vat_type,
    f.price_is_net, f.urgent, f.status, f.zip, f.city, f.created_at,
    (select i.path from listing_images i where i.listing_id = f.id order by i.position limit 1),
    (select count(*)::int from listing_images i where i.listing_id = f.id),
    d.company_name, f.dist, count(*) over ()
  from filtered f join dealers d on d.id = f.dealer_id
  order by
    case when p_sort = 'preis_auf' then f.price_gross end asc,
    case when p_sort = 'preis_ab' then f.price_gross end desc,
    case when p_sort = 'km' then f.mileage end asc nulls last,
    case when p_sort = 'naehe' then f.dist end asc nulls last,
    case when p_sort = 'neu' then f.urgent end desc,
    f.created_at desc
  limit least(greatest(p_limit, 1), 60) offset greatest(p_offset, 0);
$$;

-- ---------- Merkliste ----------
create table public.favorites (
  dealer_id uuid not null references public.dealers (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (dealer_id, listing_id)
);
alter table public.favorites enable row level security;
create policy "eigene merkliste" on public.favorites for all
  using (dealer_id = auth.uid()) with check (dealer_id = auth.uid() and public.has_access());

-- ---------- Suchaufträge ----------
create table public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  dealer_id uuid not null references public.dealers (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  filters jsonb not null default '{}',
  notify boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.saved_searches enable row level security;
create policy "eigene suchauftraege" on public.saved_searches for all
  using (dealer_id = auth.uid()) with check (dealer_id = auth.uid() and public.has_access());

-- Welche Suchaufträge passen zu einem neuen Inserat? (nur für den Server mit Service-Schlüssel)
create function public.match_saved_searches(p_listing uuid)
returns table (search_id uuid, search_name text, dealer_id uuid, email text, company_name text)
language sql stable security definer set search_path = public as $$
  select s.id, s.name, s.dealer_id, p.email, d.company_name
  from listings l
  join saved_searches s on s.notify and s.dealer_id <> l.dealer_id
  join dealers d on d.id = s.dealer_id and d.status = 'freigegeben'
  join dealer_private p on p.dealer_id = d.id
  left join plz_geo o on o.zip = s.filters ->> 'plz'
  where l.id = p_listing and l.status = 'aktiv'
    and (coalesce(s.filters ->> 'kategorie', '') = '' or l.category = s.filters ->> 'kategorie')
    and (coalesce(s.filters ->> 'marke', '') = '' or lower(l.make) = lower(s.filters ->> 'marke'))
    and (coalesce(s.filters ->> 'modell', '') = '' or l.model ilike '%' || (s.filters ->> 'modell') || '%')
    and (coalesce(s.filters ->> 'preis_bis', '') = '' or l.price_gross <= (s.filters ->> 'preis_bis')::int)
    and (coalesce(s.filters ->> 'preis_von', '') = '' or l.price_gross >= (s.filters ->> 'preis_von')::int)
    and (coalesce(s.filters ->> 'km_bis', '') = '' or l.mileage <= (s.filters ->> 'km_bis')::int)
    and (coalesce(s.filters ->> 'ez_von', '') = ''
         or extract(year from l.first_registration) >= (s.filters ->> 'ez_von')::int)
    and (coalesce(s.filters ->> 'ez_bis', '') = ''
         or extract(year from l.first_registration) <= (s.filters ->> 'ez_bis')::int)
    and (coalesce(s.filters ->> 'kraftstoff', '') = '' or l.fuel = s.filters ->> 'kraftstoff')
    and (coalesce(s.filters ->> 'getriebe', '') = '' or l.transmission = s.filters ->> 'getriebe')
    and (coalesce(s.filters ->> 'mwst', '') = '' or l.vat_type = s.filters ->> 'mwst')
    and (coalesce(s.filters ->> 'dringend', '') = '' or l.urgent)
    and (coalesce(s.filters ->> 'q', '') = ''
         or (l.make || ' ' || l.model || ' ' || l.variant || ' ' || l.description)
            ilike '%' || (s.filters ->> 'q') || '%')
    and (coalesce(s.filters ->> 'umkreis', '') = '' or o.lat is null or l.lat is null
         or distance_km(o.lat, o.lng, l.lat, l.lng) <= (s.filters ->> 'umkreis')::int);
$$;
revoke execute on function public.match_saved_searches(uuid) from public, anon, authenticated;

-- ---------- Suchgesuche ----------
create table public.wanted_ads (
  id uuid primary key default gen_random_uuid(),
  dealer_id uuid not null references public.dealers (id) on delete cascade,
  title text not null check (char_length(title) between 3 and 140),
  category text check (category in ('pkw', 'transporter', 'motorrad', 'wohnmobil', 'lkw', 'sonstiges')),
  make text not null default '',
  model text not null default '',
  max_price int,
  max_km int,
  min_year int,
  description text not null default '',
  status text not null default 'aktiv' check (status in ('aktiv', 'erledigt')),
  created_at timestamptz not null default now()
);
alter table public.wanted_ads enable row level security;
create policy "gesuche lesen" on public.wanted_ads for select using (public.has_access());
create policy "gesuche anlegen" on public.wanted_ads for insert
  with check (public.has_access() and dealer_id = auth.uid());
create policy "gesuche aendern" on public.wanted_ads for update
  using (dealer_id = auth.uid() or public.is_admin()) with check (dealer_id = auth.uid() or public.is_admin());
create policy "gesuche loeschen" on public.wanted_ads for delete
  using (dealer_id = auth.uid() or public.is_admin());

-- ---------- Direktnachrichten ----------
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.listings (id) on delete set null,
  wanted_id uuid references public.wanted_ads (id) on delete set null,
  subject text not null default '',
  initiator_id uuid not null references public.dealers (id) on delete cascade,
  recipient_id uuid not null references public.dealers (id) on delete cascade,
  last_message_at timestamptz not null default now(),
  last_sender_id uuid,
  last_preview text not null default '',
  initiator_read_at timestamptz not null default now(),
  recipient_read_at timestamptz not null default 'epoch',
  created_at timestamptz not null default now(),
  check (initiator_id <> recipient_id)
);
create unique index conversations_listing_uniq on public.conversations (listing_id, initiator_id)
  where listing_id is not null;
create unique index conversations_wanted_uniq on public.conversations (wanted_id, initiator_id)
  where wanted_id is not null;
create index conversations_participants_idx on public.conversations (initiator_id, recipient_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.dealers (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index messages_conversation_idx on public.messages (conversation_id, created_at);

alter table public.conversations enable row level security;
alter table public.messages enable row level security;
create policy "eigene unterhaltungen lesen" on public.conversations for select
  using (public.has_access() and auth.uid() in (initiator_id, recipient_id));
create policy "eigene nachrichten lesen" on public.messages for select using (
  public.has_access() and exists (
    select 1 from public.conversations c
    where c.id = conversation_id and auth.uid() in (c.initiator_id, c.recipient_id))
);
create policy "nachricht senden" on public.messages for insert with check (
  public.has_access() and sender_id = auth.uid() and exists (
    select 1 from public.conversations c
    where c.id = conversation_id and auth.uid() in (c.initiator_id, c.recipient_id))
);

create function public.messages_after_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update conversations set
    last_message_at = new.created_at,
    last_sender_id = new.sender_id,
    last_preview = left(new.body, 140),
    initiator_read_at = case when initiator_id = new.sender_id then new.created_at else initiator_read_at end,
    recipient_read_at = case when recipient_id = new.sender_id then new.created_at else recipient_read_at end
  where id = new.conversation_id;
  return new;
end;
$$;
create trigger messages_after_insert after insert on public.messages
  for each row execute function public.messages_after_insert();

-- Unterhaltung zu Inserat oder Gesuch beginnen (oder bestehende fortsetzen)
create function public.start_conversation(p_listing uuid, p_wanted uuid, p_body text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := auth.uid();
  v_other uuid;
  v_subject text;
  v_id uuid;
begin
  if not has_access() then raise exception 'Kein Zugang'; end if;
  if p_listing is not null then
    select dealer_id, make || ' ' || model into v_other, v_subject from listings where id = p_listing;
    select id into v_id from conversations where listing_id = p_listing and initiator_id = v_me;
  elsif p_wanted is not null then
    select dealer_id, 'Gesuch: ' || title into v_other, v_subject from wanted_ads where id = p_wanted;
    select id into v_id from conversations where wanted_id = p_wanted and initiator_id = v_me;
  else
    raise exception 'Inserat oder Gesuch fehlt';
  end if;
  if v_other is null then raise exception 'Nicht gefunden'; end if;
  if v_other = v_me then raise exception 'Das ist Ihr eigener Eintrag'; end if;
  if v_id is null then
    insert into conversations (listing_id, wanted_id, subject, initiator_id, recipient_id)
    values (p_listing, p_wanted, v_subject, v_me, v_other) returning id into v_id;
  end if;
  if coalesce(trim(p_body), '') <> '' then
    insert into messages (conversation_id, sender_id, body) values (v_id, v_me, trim(p_body));
  end if;
  return v_id;
end;
$$;

create function public.mark_conversation_read(p_conversation uuid) returns void
language sql security definer set search_path = public as $$
  update conversations set
    initiator_read_at = case when initiator_id = auth.uid() then now() else initiator_read_at end,
    recipient_read_at = case when recipient_id = auth.uid() then now() else recipient_read_at end
  where id = p_conversation and auth.uid() in (initiator_id, recipient_id);
$$;

create function public.unread_conversations() returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from conversations
  where last_sender_id is not null and last_sender_id <> auth.uid()
    and ((initiator_id = auth.uid() and last_message_at > initiator_read_at)
      or (recipient_id = auth.uid() and last_message_at > recipient_read_at));
$$;

-- ---------- Gebote ----------
create table public.offers (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  buyer_id uuid not null references public.dealers (id) on delete cascade,
  seller_id uuid not null references public.dealers (id) on delete cascade,
  amount int not null check (amount between 1 and 100000000),
  counter_amount int check (counter_amount is null or counter_amount between 1 and 100000000),
  note text not null default '',
  status text not null default 'offen'
    check (status in ('offen', 'gegenangebot', 'angenommen', 'abgelehnt', 'zurueckgezogen')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index offers_parties_idx on public.offers (seller_id, buyer_id);
alter table public.offers enable row level security;
create policy "eigene gebote lesen" on public.offers for select
  using (public.has_access() and auth.uid() in (buyer_id, seller_id));

create function public.make_offer(p_listing uuid, p_amount int, p_note text default '')
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_seller uuid;
  v_id uuid;
begin
  if not has_access() then raise exception 'Kein Zugang'; end if;
  select dealer_id into v_seller from listings where id = p_listing and status in ('aktiv', 'reserviert');
  if v_seller is null then raise exception 'Inserat nicht verfügbar'; end if;
  if v_seller = auth.uid() then raise exception 'Auf eigene Inserate kann nicht geboten werden'; end if;
  update offers set status = 'zurueckgezogen', updated_at = now()
    where listing_id = p_listing and buyer_id = auth.uid() and status in ('offen', 'gegenangebot');
  insert into offers (listing_id, buyer_id, seller_id, amount, note)
    values (p_listing, auth.uid(), v_seller, p_amount, coalesce(p_note, '')) returning id into v_id;
  return v_id;
end;
$$;

-- Aktionen: annehmen | ablehnen | gegenangebot (Verkäufer), zurueckziehen (Käufer),
-- annehmen/ablehnen eines Gegenangebots (Käufer)
create function public.offer_action(p_offer uuid, p_action text, p_amount int default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  o offers%rowtype;
  v_me uuid := auth.uid();
begin
  if not has_access() then raise exception 'Kein Zugang'; end if;
  select * into o from offers where id = p_offer for update;
  if not found or v_me not in (o.buyer_id, o.seller_id) then raise exception 'Gebot nicht gefunden'; end if;

  if o.status = 'offen' and v_me = o.seller_id and p_action in ('annehmen', 'ablehnen') then
    update offers set status = case p_action when 'annehmen' then 'angenommen' else 'abgelehnt' end,
      updated_at = now() where id = p_offer;
  elsif o.status = 'offen' and v_me = o.seller_id and p_action = 'gegenangebot' and p_amount > 0 then
    update offers set status = 'gegenangebot', counter_amount = p_amount, updated_at = now() where id = p_offer;
  elsif o.status = 'gegenangebot' and v_me = o.buyer_id and p_action in ('annehmen', 'ablehnen') then
    update offers set status = case p_action when 'annehmen' then 'angenommen' else 'abgelehnt' end,
      updated_at = now() where id = p_offer;
  elsif o.status in ('offen', 'gegenangebot') and v_me = o.buyer_id and p_action = 'zurueckziehen' then
    update offers set status = 'zurueckgezogen', updated_at = now() where id = p_offer;
  else
    raise exception 'Diese Aktion ist nicht möglich';
  end if;
end;
$$;

-- ---------- Gruppenchat ----------
create table public.chat_rooms (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  sort int not null default 0
);
create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.chat_rooms (id) on delete cascade,
  dealer_id uuid not null references public.dealers (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index chat_messages_room_idx on public.chat_messages (room_id, created_at desc);
alter table public.chat_rooms enable row level security;
alter table public.chat_messages enable row level security;
create policy "raeume lesen" on public.chat_rooms for select using (public.has_access());
create policy "chat lesen" on public.chat_messages for select using (public.has_access());
create policy "chat schreiben" on public.chat_messages for insert
  with check (public.has_access() and dealer_id = auth.uid());
create policy "chat loeschen" on public.chat_messages for delete
  using (dealer_id = auth.uid() or public.is_admin());

insert into public.chat_rooms (slug, name, description, sort) values
  ('allgemein', 'Allgemein', 'Alles rund um den Handel', 1),
  ('suche-biete', 'Suche / Biete', 'Schnelle Anfragen: Wer hat was, wer sucht was?', 2),
  ('nord', 'Region Nord', 'SH, HH, HB, NI, MV', 3),
  ('west', 'Region West', 'NRW, RP, SL, HE', 4),
  ('sued', 'Region Süd', 'BW, BY', 5),
  ('ost', 'Region Ost', 'BE, BB, SN, ST, TH', 6),
  ('nutzfahrzeuge', 'Nutzfahrzeuge', 'Transporter, Lkw, Wohnmobile', 7),
  ('motorraeder', 'Motorräder', 'Zweiräder aller Art', 8);

-- ---------- Bewertungen ----------
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  reviewer_id uuid not null references public.dealers (id) on delete cascade,
  dealer_id uuid not null references public.dealers (id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text not null default '' check (char_length(comment) <= 1000),
  created_at timestamptz not null default now(),
  unique (reviewer_id, dealer_id),
  check (reviewer_id <> dealer_id)
);
alter table public.reviews enable row level security;
create policy "bewertungen lesen" on public.reviews for select using (public.has_access());
-- Bewerten darf nur, wer mit dem Händler bereits in Kontakt stand
create policy "bewertung abgeben" on public.reviews for insert with check (
  public.has_access() and reviewer_id = auth.uid() and exists (
    select 1 from public.conversations c
    where (c.initiator_id = auth.uid() and c.recipient_id = dealer_id)
       or (c.recipient_id = auth.uid() and c.initiator_id = dealer_id))
);
create policy "bewertung aendern" on public.reviews for update
  using (reviewer_id = auth.uid()) with check (reviewer_id = auth.uid());
create policy "bewertung loeschen" on public.reviews for delete
  using (reviewer_id = auth.uid() or public.is_admin());

-- ---------- Meldungen ----------
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  reporter_id uuid not null references public.dealers (id) on delete cascade,
  reason text not null check (char_length(reason) between 3 and 1000),
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.reports enable row level security;
create policy "meldung abgeben" on public.reports for insert
  with check (public.has_access() and reporter_id = auth.uid());
create policy "meldungen lesen" on public.reports for select using (public.is_admin());
create policy "meldungen bearbeiten" on public.reports for update
  using (public.is_admin()) with check (public.is_admin());

-- ---------- Echtzeit ----------
alter publication supabase_realtime add table public.messages, public.chat_messages;

-- ---------- Dateiablage ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('fahrzeugbilder', 'fahrzeugbilder', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('gewerbescheine', 'gewerbescheine', false, 10485760,
   array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);

create policy "fahrzeugbilder hochladen" on storage.objects for insert to authenticated with check (
  bucket_id = 'fahrzeugbilder' and public.has_access()
  and (storage.foldername(name))[1] = auth.uid()::text
);
create policy "fahrzeugbilder loeschen" on storage.objects for delete to authenticated using (
  bucket_id = 'fahrzeugbilder' and (storage.foldername(name))[1] = auth.uid()::text
);
create policy "gewerbeschein hochladen" on storage.objects for insert to authenticated with check (
  bucket_id = 'gewerbescheine' and (storage.foldername(name))[1] = auth.uid()::text
);
create policy "gewerbeschein lesen" on storage.objects for select to authenticated using (
  bucket_id = 'gewerbescheine'
  and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
);
