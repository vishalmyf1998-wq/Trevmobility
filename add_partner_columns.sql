ALTER TABLE bookings ADD COLUMN IF NOT EXISTS "partnerBookingId" text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS "partnerWebhookUrl" text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS "partnerOrgId" text;
