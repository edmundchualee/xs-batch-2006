-- Xavier School Batch 2006 · batch site database
-- Run ONCE in Supabase → SQL Editor. The last result shows the first committee code.

create extension if not exists pgcrypto;

-- ── Committee accounts ─────────────────────────────────────────────
create table public.committee (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null default '',
  full_name text not null default '',
  created_at timestamptz not null default now()
);

create table public.committee_codes (
  code text primary key check (code = upper(code)),
  max_uses int not null default 5 check (max_uses > 0),
  uses int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create function public.is_committee() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.committee where id = auth.uid())
$$;

-- Committee sign-up needs a code; nobody else can create an account
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_code text := upper(trim(coalesce(new.raw_user_meta_data->>'code', ''))); c public.committee_codes;
begin
  select * into c from public.committee_codes where code = v_code for update;
  if not found or not c.active or c.uses >= c.max_uses then raise exception 'INVALID_CODE'; end if;
  update public.committee_codes set uses = uses + 1 where code = v_code;
  insert into public.committee (id, email, full_name)
  values (new.id, coalesce(new.email, ''), left(trim(coalesce(new.raw_user_meta_data->>'full_name', '')), 120));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Events ─────────────────────────────────────────────────────────
-- fields: extra questions for this event, e.g.
--   [{"key":"handicap","label":"Handicap","type":"text","required":false},
--    {"key":"shirt","label":"Shirt size","type":"select","options":["S","M","L","XL"],"required":true}]
create table public.events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (length(trim(title)) > 0),
  tagline text not null default '',
  starts_at timestamptz,
  venue text not null default '',
  venue_map_url text not null default '',
  description text not null default '',
  fee text not null default '',
  payment_info text not null default '',
  capacity int check (capacity is null or capacity > 0),
  registration_deadline timestamptz,
  registration_open boolean not null default true,
  published boolean not null default false,
  fields jsonb not null default '[]' check (jsonb_typeof(fields) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  full_name text not null,
  email text not null,
  mobile text not null default '',
  answers jsonb not null default '{}',
  status text not null default 'registered' check (status in ('registered','waitlist','cancelled')),
  paid boolean not null default false,
  notes text not null default '',
  created_at timestamptz not null default now()
);
create unique index registrations_one_per_email on public.registrations (event_id, lower(email));

-- ── Public actions ─────────────────────────────────────────────────
-- Headcount per published event (no names)
create function public.event_counts()
returns table (event_id uuid, registered int, waitlist int)
language sql stable security definer set search_path = public as $$
  select e.id,
         count(*) filter (where r.status = 'registered')::int,
         count(*) filter (where r.status = 'waitlist')::int
  from public.events e left join public.registrations r on r.event_id = e.id
  where e.published
  group by e.id
$$;

create function public.register(p_event uuid, p_name text, p_email text, p_mobile text, p_answers jsonb)
returns text
language plpgsql security definer set search_path = public as $$
declare ev public.events; f jsonb; v text; taken int; st text := 'registered';
begin
  select * into ev from public.events where id = p_event and published for update;
  if not found then raise exception 'EVENT_NOT_FOUND'; end if;
  if not ev.registration_open or (ev.registration_deadline is not null and ev.registration_deadline < now()) then
    raise exception 'REGISTRATION_CLOSED';
  end if;
  if length(trim(coalesce(p_name, ''))) < 2 then raise exception 'NAME_REQUIRED'; end if;
  if trim(coalesce(p_email, '')) !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'EMAIL_INVALID'; end if;
  if jsonb_typeof(coalesce(p_answers, '{}')) <> 'object' then raise exception 'BAD_ANSWERS'; end if;

  for f in select * from jsonb_array_elements(ev.fields) loop
    v := trim(coalesce(p_answers->>(f->>'key'), ''));
    if coalesce((f->>'required')::boolean, false) and v = '' then
      raise exception 'FIELD_REQUIRED:%', f->>'label';
    end if;
  end loop;

  if exists (select 1 from public.registrations where event_id = p_event and lower(email) = lower(trim(p_email)) and status <> 'cancelled') then
    raise exception 'ALREADY_REGISTERED';
  end if;

  if ev.capacity is not null then
    select count(*) into taken from public.registrations where event_id = p_event and status = 'registered';
    if taken >= ev.capacity then st := 'waitlist'; end if;
  end if;

  insert into public.registrations (event_id, full_name, email, mobile, answers, status)
  values (p_event, left(trim(p_name), 120), lower(left(trim(p_email), 200)), left(trim(coalesce(p_mobile, '')), 40),
          coalesce(p_answers, '{}'), st)
  on conflict (event_id, lower(email)) do update
    set full_name = excluded.full_name, mobile = excluded.mobile, answers = excluded.answers,
        status = excluded.status, created_at = now();
  return st;
end $$;

-- ── Security ───────────────────────────────────────────────────────
alter table public.committee enable row level security;
alter table public.committee_codes enable row level security;
alter table public.events enable row level security;
alter table public.registrations enable row level security;

revoke all on all tables in schema public from anon, authenticated;

grant select on public.events to anon, authenticated;
create policy events_public_read on public.events for select to anon, authenticated
  using (published or public.is_committee());
grant insert, update, delete on public.events to authenticated;
create policy events_committee_ins on public.events for insert to authenticated with check (public.is_committee());
create policy events_committee_upd on public.events for update to authenticated using (public.is_committee()) with check (public.is_committee());
create policy events_committee_del on public.events for delete to authenticated using (public.is_committee());

grant select, update, delete on public.registrations to authenticated;
create policy regs_committee_read on public.registrations for select to authenticated using (public.is_committee());
create policy regs_committee_upd on public.registrations for update to authenticated using (public.is_committee()) with check (public.is_committee());
create policy regs_committee_del on public.registrations for delete to authenticated using (public.is_committee());

grant select on public.committee to authenticated;
create policy committee_read on public.committee for select to authenticated using (public.is_committee());

grant select, insert, update on public.committee_codes to authenticated;
create policy codes_committee on public.committee_codes for all to authenticated
  using (public.is_committee()) with check (public.is_committee());

revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.event_counts(), public.register(uuid, text, text, text, jsonb) to anon, authenticated;
grant execute on function public.is_committee() to anon, authenticated;

-- ── First committee code ───────────────────────────────────────────
insert into public.committee_codes (code, max_uses)
values ('XS06-' || upper(substr(md5(random()::text), 1, 8)), 5);
select code as "Your committee sign-up code" from public.committee_codes order by created_at desc limit 1;
