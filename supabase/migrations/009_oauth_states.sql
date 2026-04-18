-- ============================================================
-- Migration 009: OAuth States Table
-- Digunakan untuk CSRF protection selama alur OAuth
-- State disimpan saat oauth-connect dipanggil dan dihapus
-- setelah oauth-callback berhasil memverifikasi.
-- ============================================================

CREATE TABLE IF NOT EXISTS oauth_states (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform      TEXT NOT NULL,
  state         TEXT NOT NULL UNIQUE,
  -- Untuk Twitter PKCE flow
  code_challenge TEXT,
  expires_at    TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Index untuk lookup cepat berdasarkan state string
CREATE INDEX IF NOT EXISTS idx_oauth_states_state ON oauth_states(state);
CREATE INDEX IF NOT EXISTS idx_oauth_states_user ON oauth_states(user_id, created_at DESC);

-- RLS: user hanya bisa lihat/insert state miliknya sendiri
ALTER TABLE oauth_states ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "oauth_states_owner" ON oauth_states;
CREATE POLICY "oauth_states_owner" ON oauth_states
  USING (auth.uid() = user_id);

-- Auto-cleanup: hapus state yang sudah kadaluarsa (opsional, via cron)
-- Bisa juga dibersihkan manual: DELETE FROM oauth_states WHERE expires_at < NOW();
