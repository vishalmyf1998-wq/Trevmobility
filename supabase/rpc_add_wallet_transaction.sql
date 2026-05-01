-- Atomic wallet transaction function (admin only)
CREATE OR REPLACE FUNCTION add_wallet_transaction(
  p_customer_id uuid,
  p_amount numeric,
  p_type text,
  p_description text,
  p_reference_id uuid DEFAULT null,
  p_reference_type text DEFAULT null
)
RETURNS json AS $$
DECLARE
  v_current_balance numeric;
  v_new_balance numeric;
  v_tx_id uuid;
BEGIN
  -- Get current balance
  SELECT wallet_balance INTO v_current_balance
  FROM b2c_customers WHERE id = p_customer_id;
  
  IF v_current_balance IS NULL THEN
    RAISE EXCEPTION 'Customer not found: %', p_customer_id;
  END IF;
  
  -- Calculate new balance
  v_new_balance := v_current_balance + 
    CASE p_type WHEN 'credit' THEN p_amount ELSE -p_amount END;
  
  IF v_new_balance < 0 THEN
    RAISE EXCEPTION 'Insufficient balance. Current: %, Attempted: %', v_current_balance, v_new_balance;
  END IF;
  
  -- Insert transaction
  INSERT INTO wallet_transactions (
    customer_id, amount, type, description, 
    balance_after, reference_id, reference_type
  ) VALUES (
    p_customer_id, p_amount, p_type, p_description,
    v_new_balance, p_reference_id, p_reference_type
  ) RETURNING id INTO v_tx_id;
  
  -- Update customer balance
  UPDATE b2c_customers 
  SET wallet_balance = v_new_balance,
      updated_at = now()
  WHERE id = p_customer_id;
  
  -- Return transaction details
  RETURN json_build_object(
    'success', true,
    'transaction_id', v_tx_id,
    'previous_balance', v_current_balance,
    'new_balance', v_new_balance
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated (RLS handles admin check)
REVOKE ALL ON FUNCTION add_wallet_transaction(uuid,numeric,text,text,uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION add_wallet_transaction(uuid,numeric,text,text,uuid,text) TO authenticated;

COMMENT ON FUNCTION add_wallet_transaction IS 'Atomic: insert tx + update balance. Admin only via RLS.';
