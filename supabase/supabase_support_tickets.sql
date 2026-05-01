-- Support Tickets System

CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number text UNIQUE NOT NULL, -- TKT-2024-001
  customer_type text NOT NULL CHECK (customer_type IN ('b2c', 'b2b')),
  b2c_customer_id uuid REFERENCES b2c_customers(id) ON DELETE SET NULL,
  b2b_client_id uuid REFERENCES b2b_clients(id) ON DELETE SET NULL,
  category text NOT NULL, -- 'lost_item', 'overcharge', 'driver_issue', 'car_condition', 'payment', 'other'
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  subject text NOT NULL,
  description text NOT NULL,
  status text DEFAULT 'open' CHECK (status IN ('open', 'assigned', 'in_progress', 'resolved', 'closed')),
  assigned_to uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  resolution_notes text,
  customer_reply text[],
  admin_notes text[],
  related_booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  screenshots text[], -- image URLs
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Indexes
CREATE INDEX support_tickets_status_idx ON support_tickets(status);
CREATE INDEX support_tickets_customer_idx ON support_tickets(b2c_customer_id, b2b_client_id);
CREATE INDEX support_tickets_category_idx ON support_tickets(category);
CREATE INDEX support_tickets_assigned_idx ON support_tickets(assigned_to);
CREATE INDEX support_tickets_priority_idx ON support_tickets(priority);
CREATE INDEX support_tickets_ticket_number_idx ON support_tickets(ticket_number);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_updated_at_support()
RETURNS TRIGGER AS $$
BEGIN
 NEW.updated_at = now();
 RETURN NEW;
END;
$$ language plpgsql;

CREATE TRIGGER update_support_updated_at BEFORE UPDATE ON support_tickets
 FOR EACH ROW EXECUTE FUNCTION update_updated_at_support();

-- View: Open tickets dashboard
CREATE OR REPLACE VIEW open_support_tickets AS
SELECT 
  st.*,
  bc.phone as customer_phone,
  bc.name as customer_name,
  bc.customer_code,
  bc2.companyName as b2b_company
FROM support_tickets st
LEFT JOIN b2c_customers bc ON st.b2c_customer_id = bc.id
LEFT JOIN b2b_clients bc2 ON st.b2b_client_id = bc2.id
WHERE st.status != 'closed'
ORDER BY st.created_at DESC;

COMMENT ON TABLE support_tickets IS 'Customer support tickets workflow. Kanban: open→assigned→resolved→closed.';
COMMENT ON COLUMN support_tickets.ticket_number IS 'Auto-generated: TKT-YYYY-XXX sequential';
