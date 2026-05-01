-- ==========================================
-- POINT 1: B2C EXTENSIONS
-- ==========================================

-- 1. Customer Wallets
CREATE TABLE IF NOT EXISTS customer_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES b2c_customers(id) ON DELETE CASCADE,
    balance DECIMAL(10,2) DEFAULT 0.00,
    currency VARCHAR(10) DEFAULT 'INR',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Wallet Transactions (History)
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID REFERENCES customer_wallets(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    transaction_type VARCHAR(50) CHECK (transaction_type IN ('credit', 'debit')),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- 2. Customer Saved Addresses (Favorites like Home, Work)
CREATE TABLE IF NOT EXISTS customer_saved_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES b2c_customers(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL, -- e.g., 'Home', 'Office'
    address TEXT NOT NULL,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- 3. Trip Reviews & Ratings
CREATE TABLE IF NOT EXISTS trip_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES b2c_customers(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);


-- ==========================================
-- POINT 2: B2B APPROVAL WORKFLOWS
-- ==========================================

-- Add Approval Status to Bookings table
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50) DEFAULT 'not_required' CHECK (approval_status IN ('not_required', 'pending_approval', 'approved', 'rejected'));
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES b2b_employees(id) ON DELETE SET NULL;

-- B2B Approval Hierarchy/Rules
CREATE TABLE IF NOT EXISTS b2b_approval_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES b2b_clients(id) ON DELETE CASCADE,
    approver_employee_id UUID REFERENCES b2b_employees(id) ON DELETE CASCADE,
    max_approval_amount DECIMAL(10,2), -- NULL means unlimited
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);


-- ==========================================
-- POINT 3: OPERATIONS & DISPATCH
-- ==========================================

-- 1. Surge Pricing / Demand Multipliers
CREATE TABLE IF NOT EXISTS surge_pricing_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    city_id UUID REFERENCES cities(id) ON DELETE CASCADE,
    polygon_id UUID REFERENCES city_polygons(id) ON DELETE SET NULL,
    multiplier DECIMAL(3,2) NOT NULL DEFAULT 1.00, -- e.g. 1.5x
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    reason VARCHAR(255), -- e.g., 'Heavy Rain', 'Festival', 'Rush Hour'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- 2. Customer Support / Ticketing System
CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    user_id UUID NOT NULL, -- Could be b2c_customer_id, b2b_employee_id, or driver_id
    user_type VARCHAR(50) CHECK (user_type IN ('b2c_customer', 'b2b_employee', 'driver')),
    issue_type VARCHAR(100) NOT NULL, -- e.g., 'Driver Late', 'Payment Issue', 'Accident'
    description TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    priority VARCHAR(50) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- 3. Tolls, State Taxes & Parking (Trip Additional Charges)
CREATE TABLE IF NOT EXISTS trip_additional_charges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    duty_slip_id UUID REFERENCES duty_slips(id) ON DELETE CASCADE,
    charge_type VARCHAR(50) CHECK (charge_type IN ('toll', 'parking', 'state_tax', 'other')),
    amount DECIMAL(10,2) NOT NULL,
    receipt_url TEXT, -- Optional URL for the uploaded receipt image
    description TEXT,
    is_verified BOOLEAN DEFAULT false, -- To be verified by admin
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);
