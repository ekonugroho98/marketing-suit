-- Migration: Support multiple accounts per platform per user
-- Sebelumnya: UNIQUE(user_id, platform) → hanya 1 akun per platform
-- Sekarang: UNIQUE(user_id, platform, platform_username) → bisa banyak akun per platform

-- 1. Hapus unique constraint lama (user_id, platform)
ALTER TABLE connected_accounts
  DROP CONSTRAINT IF EXISTS connected_accounts_user_id_platform_key,
  DROP CONSTRAINT IF EXISTS unique_user_platform;

-- 2. Tambah kolom account_label untuk nama/alias akun
ALTER TABLE connected_accounts
  ADD COLUMN IF NOT EXISTS account_label TEXT,
  ADD COLUMN IF NOT EXISTS account_order INT DEFAULT 0;

-- 3. Buat unique constraint baru: satu user tidak bisa punya username yang sama untuk platform yang sama
ALTER TABLE connected_accounts
  ADD CONSTRAINT unique_user_platform_username
    UNIQUE (user_id, platform, platform_username);

-- 4. Update RLS policy agar user bisa insert multiple rows untuk platform yang sama
-- (policy existing seharusnya sudah handle ini karena filter by user_id saja)

-- 5. Index untuk query efisien
CREATE INDEX IF NOT EXISTS idx_connected_accounts_user_platform
  ON connected_accounts (user_id, platform, status);

-- 6. Backfill account_label dari platform_username untuk data existing
UPDATE connected_accounts
SET account_label = REPLACE(platform_username, '@', '')
WHERE account_label IS NULL AND platform_username IS NOT NULL;

-- 7. Update publish_history untuk track account_id bukan hanya platform
ALTER TABLE publish_history
  ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES connected_accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS platform_username TEXT;
