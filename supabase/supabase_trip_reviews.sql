-- Trip Reviews & Ratings table
-- Customer feedback for drivers/cars post-trip

CREATE TABLE IF NOT EXISTS trip_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES b2c_customers(id) ON DELETE CASCADE,
  driver_id uuid REFERENCES drivers(id) ON DELETE SET NULL,
  car_id uuid REFERENCES cars(id) ON DELETE SET NULL,
  driver_rating integer CHECK (driver_rating BETWEEN 1 AND 5),
  car_rating integer CHECK (car_rating BETWEEN 1 AND 5),
  comment text,
  photos text[], -- JSON array of image URLs
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS trip_reviews_booking_idx ON trip_reviews(booking_id);
CREATE INDEX IF NOT EXISTS trip_reviews_driver_idx ON trip_reviews(driver_id);
CREATE INDEX IF NOT EXISTS trip_reviews_car_idx ON trip_reviews(car_id);
CREATE INDEX IF NOT EXISTS trip_reviews_customer_idx ON trip_reviews(customer_id);
CREATE INDEX IF NOT EXISTS trip_reviews_driver_rating_idx ON trip_reviews(driver_rating);
CREATE INDEX IF NOT EXISTS trip_reviews_car_rating_idx ON trip_reviews(car_rating);

-- Views for admin dashboard
CREATE OR REPLACE VIEW driver_ratings_summary AS
SELECT 
  d.id,
  d.driverId,
  d.name,
  d.phone,
  AVG(tr.driver_rating)::numeric(3,2) as avg_rating,
  COUNT(tr.id) as total_reviews,
  COUNT(CASE WHEN tr.driver_rating <= 3 THEN 1 END) as low_ratings,
  MAX(tr.created_at) as last_review
FROM drivers d
LEFT JOIN trip_reviews tr ON d.id = tr.driver_id
GROUP BY d.id, d.driverId, d.name, d.phone;

CREATE OR REPLACE VIEW car_ratings_summary AS
SELECT 
  c.id,
  c.registrationNumber,
  c.make || ' ' || c.model as car_model,
  AVG(tr.car_rating)::numeric(3,2) as avg_rating,
  COUNT(tr.id) as total_reviews,
  COUNT(CASE WHEN tr.car_rating <= 3 THEN 1 END) as low_ratings,
  MAX(tr.created_at) as last_review
FROM cars c
LEFT JOIN trip_reviews tr ON c.id = tr.car_id
GROUP BY c.id, c.registrationNumber, c.make, c.model;

COMMENT ON TABLE trip_reviews IS 'Customer ratings for drivers/cars post-trip. Monitor quality.';
COMMENT ON COLUMN trip_reviews.driver_rating IS '1-5 stars for driver service.';
COMMENT ON COLUMN trip_reviews.car_rating IS '1-5 stars for vehicle condition/cleanliness.';
