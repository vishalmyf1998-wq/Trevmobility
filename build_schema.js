const fs = require('fs');

const setup = fs.readFileSync('setup_all_tables.sql', 'utf8');
let b2c = fs.readFileSync('supabase_b2c_customers.sql', 'utf8');
let airports = fs.readFileSync('supabase_airports.sql', 'utf8');
const bookings = fs.readFileSync('supabase_bookings.sql', 'utf8');
const migrations = fs.readFileSync('all_supabase_migrations.sql', 'utf8');

let cleanSetup = setup;

// Strip out existing tables safely without deleting intermediate tables
const tablesToRemove = [
  'b2c_customers',
  'airports',
  'airport_terminals',
  'bookings'
];

for (const table of tablesToRemove) {
  // Just match the CREATE TABLE block itself
  const regex = new RegExp(`CREATE TABLE ${table} \\([\\s\\S]*?\\);`, 'ig');
  cleanSetup = cleanSetup.replace(regex, `/* Removed ${table} */`);
}

// Extract dependent tables safely
const dependentTables = ['booking_event_logs', 'duty_slips', 'invoices'];
let extractedDependentTables = '';

for (const table of dependentTables) {
  const regex = new RegExp(`CREATE TABLE ${table} \\([\\s\\S]*?\\);`, 'ig');
  const match = cleanSetup.match(regex);
  if (match) {
    // Also try to get the comment line right before it if exists
    for (const m of match) {
      extractedDependentTables += m + '\n\n';
    }
    cleanSetup = cleanSetup.replace(regex, `/* Moved ${table} */`);
  }
}

// Strip out the "do $$ ... end $$;" blocks from b2c and airports 
b2c = b2c.replace(/do \$\$[\s\S]*?end \$\$;/gi, '/* Alter table bookings block removed */');
airports = airports.replace(/do \$\$[\s\S]*?end \$\$;/gi, '/* Alter table bookings block removed */');

// Ensure all drops are present
const additionalDrops = `
-- Drop newly added tables
DROP TABLE IF EXISTS referrals CASCADE;
DROP TABLE IF EXISTS support_tickets CASCADE;
DROP TABLE IF EXISTS trip_reviews CASCADE;
DROP TABLE IF EXISTS wallet_transactions CASCADE;
DROP TABLE IF EXISTS route_tolls CASCADE;
DROP TABLE IF EXISTS state_taxes CASCADE;
DROP TABLE IF EXISTS parking_fees CASCADE;
DROP TABLE IF EXISTS peak_hours CASCADE;
DROP TABLE IF EXISTS weather_triggers CASCADE;
`;

cleanSetup = cleanSetup.replace('DROP TABLE IF EXISTS b2c_customers CASCADE;', 'DROP TABLE IF EXISTS b2c_customers CASCADE;' + additionalDrops);

let finalSQL = `
${cleanSetup}

-- ==============================================
-- UPDATED TABLES (b2c_customers, airports, bookings)
-- ==============================================

${b2c}

${airports}

${bookings}

-- ==============================================
-- DEPENDENT TABLES (booking_event_logs, etc.)
-- ==============================================

${extractedDependentTables}

-- ==============================================
-- ALL MIGRATIONS & NEW TABLES
-- ==============================================

${migrations}
`;

// Strip BOM
finalSQL = finalSQL.replace(/^\uFEFF/gm, '').replace(/\uFEFF/g, '');

fs.writeFileSync('CLEAN_DB_SCHEMA.sql', finalSQL);
console.log('CLEAN_DB_SCHEMA.sql created correctly!');
