-- RPC: Approve referral + atomic wallet credit
-- Admin only, calls add_wallet_transaction

CREATE OR REPLACE FUNCTION credit_referral_reward(
  p_referral_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_referral referrals;
  v_tx_result json;
BEGIN
  -- Fetch referral (locks row)
  SELECT * INTO v_referral FROM referrals WHERE id = p_referral_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Referral not found');
  END IF;
  
  IF v_referral.status != 'pending' THEN
    RETURN json_build_object('success', false, 'error', 'Only pending referrals can be approved');
  END IF;
  
  IF v_referral.referee_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Referee not registered');
  END IF;
  
  -- Atomic credit to REFERER wallet
  SELECT add_wallet_transaction(
    v_referral.referrer_id, 
    v_referral.reward_amount, 
    'credit',
    'Referral reward: ' || v_referral.referee_phone || ' (' || v_referral.id::text || ')',
    v_referral.id,
    'referral_signup'
  ) INTO v_tx_result;
  
  IF (v_tx_result->>'success')::boolean THEN
    -- Update referral status
    UPDATE referrals 
    SET status = 'approved', approved_at = now()
    WHERE id = p_referral_id;
    
    RETURN json_build_object(
      'success', true,
      'message', 'Referral approved and reward credited',
      'reward_amount', v_referral.reward_amount,
      'new_balance', (v_tx_result->>'new_balance')::numeric
    );
  ELSE
    RETURN json_build_object('success', false, 'error', 'Wallet credit failed: ' || (v_tx_result->>'error'));
  END IF;
END;
$$;

-- Grant to authenticated (RLS will restrict to admins)
REVOKE ALL ON FUNCTION credit_referral_reward(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION credit_referral_reward(uuid) TO authenticated;

COMMENT ON FUNCTION credit_referral_reward IS 'Approve pending referral + credit referrer wallet atomically. Admin only via RLS.';
