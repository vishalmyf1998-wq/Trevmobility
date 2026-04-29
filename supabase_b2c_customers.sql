create table if not exists b2c_customers (
  id uuid primary key,
  "customerCode" text not null unique,
  name text not null,
  phone text not null,
  email text,
  address text,
  "createdAt" timestamp with time zone not null default now(),
  "updatedAt" timestamp with time zone
);

create unique index if not exists b2c_customers_phone_uidx
  on b2c_customers (lower(phone));

create unique index if not exists b2c_customers_email_uidx
  on b2c_customers (lower(email))
  where email is not null and email <> '';

create index if not exists b2c_customers_name_idx
  on b2c_customers (lower(name));

-- Only alter bookings if the table exists (it may not exist yet during initial setup)
do $$
begin
  if exists (select 1 from information_schema.tables where table_name = 'bookings') then
    alter table bookings
      add column if not exists "b2cCustomerId" uuid references b2c_customers(id);

    create index if not exists bookings_b2c_customer_id_idx
      on bookings("b2cCustomerId");
  end if;
end $$;
