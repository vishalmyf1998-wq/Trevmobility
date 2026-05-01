-- Referrals table for Refer & Earn program
-- Links to wallet_transactions via reference_id + reference_type='referral_signup'

CREATE TABLE IF NOT EXISTS referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES b2c_customers(id) ON DELETE CASCADE,
  referee_id uuid REFERENCES b2c_customers(id) ON DELETE SET NULL, -- NULL until signup
  referral_code text UNIQUE NOT NULL, -- Unique code for sharing e.g. USER123ABC
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'expired', 'cancelled')),
  reward_amount numeric NOT NULL DEFAULT 50 CHECK (reward_amount > 0), -- INR reward
  approved_at timestamp with time zone,
  referee_phone text, -- Phone used for signup (before referee_id known)
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS referrals_referrer_idx ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS referrals_referee_idx ON referrals(referee_id);
CREATE INDEX IF NOT EXISTS referrals_code_idx ON referrals(referral_code);
CREATE INDEX IF NOT EXISTS referrals_status_idx ON referrals(status);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_referrals()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language plpgsql;

CREATE TRIGGER update_referrals_updated_at BEFORE UPDATE ON referrals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_referrals();

COMMENT ON TABLE referrals IS 'Refer & Earn tracking. On approve: auto-credit reward via RPC.';
COMMENT ON COLUMN referrals.referee_phone IS 'Phone from signup form (before customer created).';

-- View: Referral summary per customer
CREATE OR REPLACE VIEW customer_referral_summary AS
SELECT 
  c.id,
  c.customer_code,
  c.phone,
  COUNT(r.id) as total_referrals,
  COUNT(CASE WHEN r.status = 'approved' THEN 1 END)::int as approved_referrals,
  COUNT(CASE WHEN r.status = 'pending' THEN 1 END)::int as pending_referrals,
  COALESCE(SUM(CASE WHEN r.status = 'approved' THEN r.reward_amount ELSE 0 END), 0) as total_earned,
  MAX(r.created_at) as last_referral_at
FROM b2c_customers c
LEFT JOIN referrals r ON c.id = r.referrer_id
GROUP BY c.id, c.customer_code, c.phone;
