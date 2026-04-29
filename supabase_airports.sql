create table if not exists airports (
  id uuid primary key,
  city_id uuid not null,
  name text not null,
  code text not null,
  address text,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default now()
);

create table if not exists airport_terminals (
  id uuid primary key,
  airport_id uuid not null references airports(id) on delete cascade,
  name text not null,
  code text not null,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default now()
);

-- Only alter bookings if the table exists (it may not exist yet during initial setup)
do $$
begin
  if exists (select 1 from information_schema.tables where table_name = 'bookings') then
    alter table bookings
      add column if not exists "airportId" uuid references airports(id),
      add column if not exists "airportTerminalId" uuid references airport_terminals(id);

    create index if not exists bookings_airport_id_idx on bookings("airportId");
    create index if not exists bookings_airport_terminal_id_idx on bookings("airportTerminalId");
  end if;
end $$;

create index if not exists airports_city_id_idx on airports(city_id);
create index if not exists airport_terminals_airport_id_idx on airport_terminals(airport_id);

/*
insert into airports (id, city_id, name, code, address)
values
  ('1', '1', 'Chhatrapati Shivaji Maharaj International Airport', 'BOM', 'Mumbai, Maharashtra'),
  ('2', '2', 'Indira Gandhi International Airport', 'DEL', 'New Delhi, Delhi')
on conflict (id) do nothing;

insert into airport_terminals (id, airport_id, name, code)
values
  ('1', '1', 'Terminal 1', 'T1'),
  ('2', '1', 'Terminal 2', 'T2'),
  ('3', '2', 'Terminal 1', 'T1'),
  ('4', '2', 'Terminal 2', 'T2'),
  ('5', '2', 'Terminal 3', 'T3')
on conflict (id) do nothing;
*/
