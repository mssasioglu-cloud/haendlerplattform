-- ============================================================
-- Qualität (Mängel-Checkliste, Vollständigkeit), Handel (Ablauf, Preisänderung,
-- Antwortzeit) und Wachstum (Einladungslinks)
-- ============================================================

-- ---------- Inserate: neue Spalten ----------
alter table public.listings
  add column if not exists defects text[] not null default '{}',
  add column if not exists no_known_defects boolean not null default false,
  add column if not exists quality_score int not null default 0 check (quality_score between 0 and 100),
  add column if not exists expires_at timestamptz not null default (now() + interval '30 days'),
  add column if not exists previous_price_gross int,
  add column if not exists price_changed_at timestamptz;

-- Trigger: Ort aus PLZ, Preisänderung merken, Laufzeit auf höchstens 31 Tage begrenzen
create or replace function public.listings_before_write() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_new_gross int;
begin
  new.updated_at := now();
  select g.lat, g.lng, g.city into new.lat, new.lng, new.city from plz_geo g where g.zip = new.zip;

  -- price_gross ist eine berechnete Spalte und steht hier noch nicht fest, deshalb selbst rechnen
  v_new_gross := case when new.vat_type = 'ausweisbar' and new.price_is_net
                      then round(new.price * 1.19)::int else new.price end;
  if tg_op = 'UPDATE' then
    if v_new_gross is distinct from old.price_gross then
      new.previous_price_gross := old.price_gross;
      new.price_changed_at := now();
    else
      new.previous_price_gross := old.previous_price_gross;
      new.price_changed_at := old.price_changed_at;
    end if;
  else
    new.previous_price_gross := null;
    new.price_changed_at := null;
  end if;

  if new.expires_at is null or new.expires_at > now() + interval '31 days' then
    new.expires_at := now() + interval '30 days';
  end if;
  return new;
end;
$$;

-- Fremde sehen nur laufende Inserate; der Eigentümer sieht auch abgelaufene
drop policy if exists "inserate lesen" on public.listings;
create policy "inserate lesen" on public.listings for select using (
  public.has_access()
  and (
    dealer_id = auth.uid() or public.is_admin()
    or (status in ('aktiv', 'reserviert') and expires_at > now())
  )
);

-- ---------- Suche neu (Rückgabe ändert sich, daher erst entfernen) ----------
drop function if exists public.search_listings(text, text, text, int, int, int, int, int, text, text, text, boolean, text, int, text, text, int, int);
drop function if exists public.search_listings(text, text, text, int, int, int, int, int, text, text, text, boolean, text, int, text, text, int, int, boolean);

create function public.search_listings(
  p_category text default null, p_make text default null, p_model text default null,
  p_price_min int default null, p_price_max int default null,
  p_km_max int default null, p_year_min int default null, p_year_max int default null,
  p_fuel text default null, p_transmission text default null, p_vat_type text default null,
  p_urgent boolean default null, p_zip text default null, p_radius_km int default null,
  p_q text default null, p_sort text default 'neu', p_limit int default 24, p_offset int default 0,
  p_price_dropped boolean default null
) returns table (
  id uuid, dealer_id uuid, category text, make text, model text, variant text,
  first_registration date, mileage int, fuel text, transmission text, power_kw int,
  price int, price_gross int, vat_type text, price_is_net boolean, urgent boolean, status text,
  zip text, city text, created_at timestamptz, cover_path text, image_count int,
  company_name text, distance double precision, total_count bigint,
  quality_score int, previous_price_gross int, price_changed_at timestamptz, expires_at timestamptz
) language sql stable set search_path = public as $$
  with origin as (select lat, lng from plz_geo where zip = p_zip),
  base as (
    select l.*, case when o.lat is null or l.lat is null then null
                     else distance_km(o.lat, o.lng, l.lat, l.lng) end as dist
    from listings l left join origin o on true
    where l.status in ('aktiv', 'reserviert')
      and l.expires_at > now()
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
      and (p_price_dropped is not true or (l.previous_price_gross > l.price_gross
           and l.price_changed_at > now() - interval '30 days'))
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
    d.company_name, f.dist, count(*) over (),
    f.quality_score, f.previous_price_gross, f.price_changed_at, f.expires_at
  from filtered f join dealers d on d.id = f.dealer_id
  order by
    case when p_sort = 'preis_auf' then f.price_gross end asc,
    case when p_sort = 'preis_ab' then f.price_gross end desc,
    case when p_sort = 'km' then f.mileage end asc nulls last,
    case when p_sort = 'naehe' then f.dist end asc nulls last,
    case when p_sort = 'empfohlen' then f.urgent end desc,
    case when p_sort = 'empfohlen' then (f.quality_score >= 80) end desc,
    f.created_at desc
  limit least(greatest(p_limit, 1), 60) offset greatest(p_offset, 0);
$$;

-- ---------- Einladungen ----------
alter table public.dealers
  add column if not exists invite_code text unique
    default substr(md5(random()::text || clock_timestamp()::text), 1, 8),
  add column if not exists invited_by uuid references public.dealers (id) on delete set null;
update public.dealers set invite_code = substr(md5(random()::text || id::text), 1, 8) where invite_code is null;
-- (Händler dürfen diese Spalten nicht schreiben: Die Spaltenrechte aus dem Grundschema nennen sie nicht.)

-- Einladungscode auflösen, ohne Händlerdaten offenzulegen (auch ohne Login nutzbar)
create or replace function public.inviter_name(p_code text) returns text
language sql stable security definer set search_path = public as $$
  select company_name from dealers where invite_code = p_code and status = 'freigegeben';
$$;
grant execute on function public.inviter_name(text) to anon, authenticated;

-- ---------- Antwortzeit ----------
-- Mittlere Zeit in Stunden bis zur ersten Antwort auf neue Anfragen; null bei weniger als drei Antworten
create or replace function public.dealer_response_hours(p_dealer uuid) returns numeric
language sql stable security definer set search_path = public as $$
  with firsts as (
    select c.id,
      (select min(m.created_at) from messages m where m.conversation_id = c.id and m.sender_id = c.initiator_id) as asked,
      (select min(m.created_at) from messages m where m.conversation_id = c.id and m.sender_id = c.recipient_id) as answered
    from conversations c where c.recipient_id = p_dealer
  )
  select case when count(*) >= 3
    then round((extract(epoch from avg(answered - asked)) / 3600)::numeric, 1) end
  from firsts where asked is not null and answered is not null and answered > asked;
$$;
grant execute on function public.dealer_response_hours(uuid) to authenticated;

-- ---------- Suchaufträge: Ablauf und "Preis gesenkt" berücksichtigen ----------
create or replace function public.match_saved_searches(p_listing uuid)
returns table (search_id uuid, search_name text, dealer_id uuid, email text, company_name text)
language sql stable security definer set search_path = public as $$
  select s.id, s.name, s.dealer_id, p.email, d.company_name
  from listings l
  join saved_searches s on s.notify and s.dealer_id <> l.dealer_id
  join dealers d on d.id = s.dealer_id and d.status = 'freigegeben'
  join dealer_private p on p.dealer_id = d.id
  left join plz_geo o on o.zip = s.filters ->> 'plz'
  where l.id = p_listing and l.status = 'aktiv' and l.expires_at > now()
    -- Suchaufträge auf "Preis gesenkt" passen nie zu einem neu eingestellten Fahrzeug
    and coalesce(s.filters ->> 'preis_gesenkt', '') = ''
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
