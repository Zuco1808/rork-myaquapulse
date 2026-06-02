-- Pricing module schema
-- Adds the structures the pricing screens need but the database did not yet have:
--   * pricing_packages: description + is_default columns
--   * pricing_periods: seasonal pricing windows
--   * pricing_tiers: progressive consumption blocks per package (the real tariff)
--   * package_periods / package_user_groups: many-to-many associations
--
-- Run this in the Supabase SQL editor (or via `supabase db push`).
-- Safe to re-run: all statements are guarded with IF NOT EXISTS / idempotent policies.

-- ---------------------------------------------------------------------------
-- 1. Extend pricing_packages
-- ---------------------------------------------------------------------------
alter table public.pricing_packages
  add column if not exists description text,
  add column if not exists is_default boolean not null default false;

-- ---------------------------------------------------------------------------
-- 2. pricing_periods
-- ---------------------------------------------------------------------------
create table if not exists public.pricing_periods (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  start_date  date not null,
  end_date    date not null,
  is_active   boolean not null default false,
  company_id  uuid references public.companies (id) on delete cascade,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 3. pricing_tiers (progressive consumption blocks for a package)
-- ---------------------------------------------------------------------------
create table if not exists public.pricing_tiers (
  id              uuid primary key default gen_random_uuid(),
  package_id      uuid not null references public.pricing_packages (id) on delete cascade,
  description     text,
  min_consumption numeric not null default 0,
  max_consumption numeric,            -- null = unlimited (top tier)
  price_per_unit  numeric not null,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now()
);

create index if not exists pricing_tiers_package_id_idx
  on public.pricing_tiers (package_id);

-- ---------------------------------------------------------------------------
-- 4. package_periods (package <-> period)
-- ---------------------------------------------------------------------------
create table if not exists public.package_periods (
  package_id uuid not null references public.pricing_packages (id) on delete cascade,
  period_id  uuid not null references public.pricing_periods (id) on delete cascade,
  primary key (package_id, period_id)
);

-- ---------------------------------------------------------------------------
-- 5. package_user_groups (package <-> user_group)
-- ---------------------------------------------------------------------------
create table if not exists public.package_user_groups (
  package_id    uuid not null references public.pricing_packages (id) on delete cascade,
  user_group_id uuid not null references public.user_groups (id) on delete cascade,
  primary key (package_id, user_group_id)
);

-- ---------------------------------------------------------------------------
-- 6. Row Level Security
--    The app authenticates via Supabase Auth and calls the REST API with the
--    publishable key, so policies target the `authenticated` role.
--    Adjust to company-scoping if/when stricter rules are required.
-- ---------------------------------------------------------------------------
alter table public.pricing_periods     enable row level security;
alter table public.pricing_tiers       enable row level security;
alter table public.package_periods     enable row level security;
alter table public.package_user_groups enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array[
    'pricing_periods',
    'pricing_tiers',
    'package_periods',
    'package_user_groups'
  ]
  loop
    execute format(
      'drop policy if exists %I on public.%I;',
      t || '_authenticated_all', t
    );
    execute format(
      'create policy %I on public.%I for all to authenticated using (true) with check (true);',
      t || '_authenticated_all', t
    );
  end loop;
end $$;
