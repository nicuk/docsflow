-- =====================================================
-- REFERRAL SYSTEM TABLES
-- =====================================================

-- Add referral_code to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);

-- Referrals tracking table
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  referrer_tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  referee_email TEXT NOT NULL,
  referee_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  referee_tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  referral_code TEXT NOT NULL,
  
  -- Status tracking
  status TEXT DEFAULT 'pending', -- pending, signed_up, converted, annual, enterprise
  
  -- Reward tracking
  reward_type TEXT, -- credit, free_months, cash, upgrade
  reward_amount NUMERIC,
  reward_paid BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  signed_up_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  
  CONSTRAINT valid_status CHECK (status IN ('pending', 'signed_up', 'converted', 'annual', 'enterprise'))
);

CREATE INDEX idx_referrals_code ON referrals(referral_code);
CREATE INDEX idx_referrals_referrer_user ON referrals(referrer_user_id);
CREATE INDEX idx_referrals_referrer_tenant ON referrals(referrer_tenant_id);
CREATE INDEX idx_referrals_referee_email ON referrals(referee_email);
CREATE INDEX idx_referrals_status ON referrals(status);

-- Account credits for referral rewards
CREATE TABLE IF NOT EXISTS account_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  balance NUMERIC DEFAULT 0,
  total_earned NUMERIC DEFAULT 0,
  total_spent NUMERIC DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(tenant_id)
);

CREATE INDEX idx_account_credits_tenant ON account_credits(tenant_id);

-- Credit transactions log
CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  type TEXT NOT NULL, -- credit, debit, expired
  description TEXT,
  referral_id UUID REFERENCES referrals(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_type CHECK (type IN ('credit', 'debit', 'expired'))
);

CREATE INDEX idx_credit_transactions_tenant ON credit_transactions(tenant_id);
CREATE INDEX idx_credit_transactions_created ON credit_transactions(created_at DESC);

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Referrals: Users can view their own referrals
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own referrals"
ON referrals FOR SELECT
USING (
  referrer_user_id = auth.uid() OR
  referee_user_id = auth.uid()
);

-- Service role can manage all referrals
CREATE POLICY "Service role can manage referrals"
ON referrals FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role')
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Account credits: Users can view their tenant's credits
ALTER TABLE account_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tenant credits"
ON account_credits FOR SELECT
USING (
  tenant_id IN (
    SELECT tenant_id FROM users WHERE id = auth.uid()
  )
);

CREATE POLICY "Service role can manage credits"
ON account_credits FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role')
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Credit transactions: Users can view their tenant's transactions
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tenant transactions"
ON credit_transactions FOR SELECT
USING (
  tenant_id IN (
    SELECT tenant_id FROM users WHERE id = auth.uid()
  )
);

CREATE POLICY "Service role can manage transactions"
ON credit_transactions FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role')
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to generate referral code for existing users
CREATE OR REPLACE FUNCTION generate_referral_codes()
RETURNS void AS $$
DECLARE
  user_record RECORD;
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  FOR user_record IN SELECT id, email FROM users WHERE referral_code IS NULL LOOP
    -- Generate code based on email prefix
    LOOP
      new_code := UPPER(SUBSTRING(SPLIT_PART(user_record.email, '@', 1) FROM 1 FOR 6)) || 
                  '-' || 
                  UPPER(SUBSTRING(MD5(RANDOM()::TEXT || user_record.id::TEXT) FROM 1 FOR 4));
      
      -- Check if code exists
      SELECT EXISTS(SELECT 1 FROM users WHERE referral_code = new_code) INTO code_exists;
      
      EXIT WHEN NOT code_exists;
    END LOOP;
    
    -- Update user with referral code
    UPDATE users SET referral_code = new_code WHERE id = user_record.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Run for existing users
SELECT generate_referral_codes();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE referrals IS 'Tracks referral relationships and rewards';
COMMENT ON TABLE account_credits IS 'Stores account credit balances for referral rewards';
COMMENT ON TABLE credit_transactions IS 'Logs all credit transactions (earned, spent, expired)';

COMMENT ON COLUMN referrals.status IS 'Referral progression: pending → signed_up → converted → annual/enterprise';
COMMENT ON COLUMN referrals.reward_type IS 'Type of reward: credit, free_months, cash, upgrade';
COMMENT ON COLUMN referrals.reward_amount IS 'Dollar amount or number of months for reward';

