-- Option 1: Disable Row Level Security (RLS) entirely for these tables
-- Run this in your Supabase SQL Editor if you do not have Auth set up yet and want to allow all reads/writes.

ALTER TABLE bookings DISABLE ROW LEVEL SECURITY;
ALTER TABLE b2c_customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE airports DISABLE ROW LEVEL SECURITY;
ALTER TABLE airport_terminals DISABLE ROW LEVEL SECURITY;

-- Option 2: Keep RLS enabled, but allow ALL operations (SELECT, INSERT, UPDATE, DELETE) for the "anon" role
-- (If you prefer to keep RLS on, use these instead of the ALTER TABLE statements above)

/*
CREATE POLICY "Enable all access for anon" ON bookings FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for anon" ON b2c_customers FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for anon" ON airports FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for anon" ON airport_terminals FOR ALL TO anon USING (true) WITH CHECK (true);
*/
