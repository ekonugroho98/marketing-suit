-- ============================================
-- Karaya Marketing Suite - API Keys for Agent Integration
-- ============================================
-- Agents (Hermes / n8n / MCP / custom) authenticate to the external
-- Fastify API using bearer tokens. Tokens are SHA-256 hashed before
-- storage. Only the prefix (first 12 chars) is kept plaintext for UX.
-- ============================================

CREATE TABLE IF NOT EXISTS api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  key_prefix TEXT NOT NULL,           -- e.g. "kry_live_abc"
  key_hash TEXT NOT NULL UNIQUE,      -- sha256 hex of full token
  scopes TEXT[] NOT NULL DEFAULT ARRAY[
    'content:read','content:write',
    'publish:read','publish:write',
    'ads:read','ads:write',
    'analytics:read','accounts:read'
  ],
  rate_limit_per_minute INTEGER NOT NULL DEFAULT 60,
  last_used_at TIMESTAMPTZ,
  last_used_ip TEXT,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id, created_at DESC);

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Users can manage their own API keys via the web app
CREATE POLICY "Users can view own api keys" ON api_keys
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create api keys" ON api_keys
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own api keys" ON api_keys
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own api keys" ON api_keys
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- verify_api_key(p_key_hash)
-- Service-role RPC called by the Fastify API on every request.
-- Returns the key row (if valid & active & not expired) and touches
-- last_used_at / last_used_ip in a single round-trip.
-- ============================================
CREATE OR REPLACE FUNCTION verify_api_key(p_key_hash TEXT, p_ip TEXT DEFAULT NULL)
RETURNS TABLE(
  id UUID,
  user_id UUID,
  scopes TEXT[],
  rate_limit_per_minute INTEGER
) AS $$
BEGIN
  RETURN QUERY
  UPDATE api_keys
     SET last_used_at = NOW(),
         last_used_ip = COALESCE(p_ip, last_used_ip)
   WHERE api_keys.key_hash = p_key_hash
     AND is_active = true
     AND (expires_at IS NULL OR expires_at > NOW())
     AND revoked_at IS NULL
  RETURNING api_keys.id, api_keys.user_id, api_keys.scopes,
            api_keys.rate_limit_per_minute;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Only service_role should be able to call the verify function
REVOKE ALL ON FUNCTION verify_api_key(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION verify_api_key(TEXT, TEXT) TO service_role;
