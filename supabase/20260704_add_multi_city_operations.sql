-- One-click city switching for the central Operations Superuser.
-- Existing rows are backfilled to NCR because this migration introduces Jaipur
-- to an existing Delhi-NCR fleet. New writes must always send the city tag.

do $$
declare
  table_name text;
  constraint_name text;
begin
  foreach table_name in array array['vehicles', 'cars', 'partners', 'drivers']
  loop
    if to_regclass(format('public.%I', table_name)) is null then
      continue;
    end if;

    execute format(
      'alter table public.%I add column if not exists operating_city text',
      table_name
    );
    execute format(
      'update public.%I set operating_city = ''ncr'' where operating_city is null',
      table_name
    );
    execute format(
      'alter table public.%I alter column operating_city set default ''ncr''',
      table_name
    );
    execute format(
      'alter table public.%I alter column operating_city set not null',
      table_name
    );

    constraint_name := table_name || '_operating_city_check';
    if not exists (
      select 1
      from pg_constraint
      where conname = constraint_name
        and conrelid = format('public.%I', table_name)::regclass
    ) then
      execute format(
        'alter table public.%I add constraint %I check (operating_city in (''ncr'', ''jpr''))',
        table_name,
        constraint_name
      );
    end if;

    execute format(
      'create index if not exists %I on public.%I (operating_city)',
      table_name || '_operating_city_idx',
      table_name
    );
  end loop;
end $$;

alter table public.bookings
  add column if not exists pickup_city text,
  add column if not exists operating_city text,
  add column if not exists pickup_latitude double precision,
  add column if not exists pickup_longitude double precision,
  add column if not exists drop_latitude double precision,
  add column if not exists drop_longitude double precision,
  add column if not exists fleet_assigned_at timestamptz,
  add column if not exists fleet_assigned_by uuid;

update public.bookings
set
  pickup_city = coalesce(pickup_city, 'ncr'),
  operating_city = coalesce(operating_city, pickup_city, 'ncr')
where pickup_city is null or operating_city is null;

alter table public.bookings
  alter column pickup_city set default 'ncr',
  alter column pickup_city set not null,
  alter column operating_city set default 'ncr',
  alter column operating_city set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'bookings_pickup_city_check'
      and conrelid = 'public.bookings'::regclass
  ) then
    alter table public.bookings
      add constraint bookings_pickup_city_check
      check (pickup_city in ('ncr', 'jpr'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'bookings_operating_city_check'
      and conrelid = 'public.bookings'::regclass
  ) then
    alter table public.bookings
      add constraint bookings_operating_city_check
      check (operating_city in ('ncr', 'jpr'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'bookings_pickup_latitude_check'
      and conrelid = 'public.bookings'::regclass
  ) then
    alter table public.bookings
      add constraint bookings_pickup_latitude_check
      check (pickup_latitude is null or pickup_latitude between -90 and 90);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'bookings_pickup_longitude_check'
      and conrelid = 'public.bookings'::regclass
  ) then
    alter table public.bookings
      add constraint bookings_pickup_longitude_check
      check (pickup_longitude is null or pickup_longitude between -180 and 180);
  end if;
end $$;

create index if not exists bookings_operating_city_idx
  on public.bookings (operating_city);

create index if not exists bookings_city_status_pickup_idx
  on public.bookings (operating_city, status, pickup_date);

create index if not exists bookings_pickup_city_idx
  on public.bookings (pickup_city);

comment on column public.bookings.pickup_city is
  'Geographic pickup city; immutable after trip creation except data correction.';
comment on column public.bookings.operating_city is
  'Fleet responsible for fulfillment; may be manually reassigned by Operations.';
