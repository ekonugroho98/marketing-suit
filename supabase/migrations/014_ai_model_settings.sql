-- ================================
-- Migration 014: AI Model Settings
-- Multi-provider AI model support
-- Tables: ai_providers, ai_models, user_ai_configs,
--          user_custom_models, user_model_preferences
-- ============================================

-- ────────────────────────────
-- 1. ai_providers — preset provider catalog
-- ────────────────────
CREATE TABLE IF NOT EXISTS ai_providers (
  id TEXT PRIMARY KEY,                -- 'groq', 'openai', 'anthropic', 'openrouter', 'google', 'custom'
  name TEXT NOT NULL,                 -- 'Groq', 'OpenAI', 'Anthropic', etc.
  api_base_url TEXT NOT NULL,         -- 'https://api.groq.com/openai/v1'
  is_openai_compatible BOOLEAN DEFAULT true,  -- most providers use OpenAI-compatible API
  auth_header TEXT DEFAULT 'Authorization',    -- header name for API key
  auth_prefix TEXT DEFAULT 'Bearer',           -- prefix before API key
  requires_user_key BOOLEAN DEFAULT false,     -- true if user must provide their own API key
  icon TEXT,                          -- emoji icon
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0
);

-- Seed providers (idempotent)
INSERT INTO ai_providers (id, name, api_base_url, is_openai_compatible, auth_header, auth_prefix, requires_user_key, icon, description, is_active, sort_order)
VALUES
  (
    'groq', 'Groq', 'https://api.groq.com/openai/v1',
    true, 'Authorization', 'Bearer', false,
    '⚡', 'Groq — gratis & super cepat. Mengunakan built-in API key.',
    true, 0
  ),
  (
    'openai', 'OpenAI', 'https://api.openai.com/v1',
    true, 'Authorization', 'Bearer', true,
    '🤖', 'OpenAI — GPT-4o & GPT-4o Mini. Butuh API key sendiri.',
    true, 1
  ),
  (
    'anthropic', 'Anthropic', 'https://api.anthropic.com/v1',
    false, 'x-api-key', '', true,
    '🧠', 'Anthropic — Claude Sonnet & Opus. Butuh API key sendiri.',
    true, 2
  ),
  (
    'openrouter', 'OpenRouter', 'https://openrouter.ai/api/v1',
    true, 'Authorization', 'Bearer', true,
    '🔀', 'OpenRouter — akses ratusan model via satu API key.',
    true, 3
  ),
  (
    'google', 'Google AI', 'https://generativelanguage.googleapis.com/v1beta',
    false, 'x-goog-api-key', '', true,
    '🔍', 'Google AI — Gemini 2.5 Flash & Pro. Butuh API key sendiri.',
    true, 4
  ),
  (
    'custom', 'Custom Endpoint', '',
    true, 'Authorization', 'Bearer', true,
    '🔧', 'Custom — endpoint OpenAI-compatible milik sendiri atau self-hosted.',
    true, 99
  )
ON CONFLICT (id) DO NOTHING;


-- ────────────────────────
-- 2. ai_models — preset model catalog
-- ────────────────────
CREATE TABLE IF NOT EXISTS ai_models (
  id TEXT PRIMARY KEY,                         -- 'groq/llama-3.3-70b'
  provider_id TEXT NOT NULL REFERENCES ai_providers(id),
  model_id TEXT NOT NULL,                      -- actual model identifier sent to API ('llama-3.3-70b-versatile')
  name TEXT NOT NULL,                          -- display name ('Llama 3.3 70B')
  description TEXT,
  context_window INTEGER,                      -- max context tokens
  max_output_tokens INTEGER,                   -- max output tokens
  is_free BOOLEAN DEFAULT false,               -- free to use (Groq)
  speed_rating INTEGER DEFAULT 3 CHECK (speed_rating BETWEEN 1 AND 5),  -- 1=slow, 5=fast
  quality_rating INTEGER DEFAULT 3 CHECK (quality_rating BETWEEN 1 AND 5),
  supports_json_mode BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0
);

-- Index on provider for filtering
CREATE INDEX IF NOT EXISTS idx_ai_models_provider_id ON ai_models(provider_id);

-- Seed models (idempotent)
-- Columns: id, provider_id, model_id, name, description,
--          context_window, max_output_tokens, is_free,
--          speed_rating, quality_rating, supports_json_mode, is_active, sort_order
INSERT INTO ai_models (id, provider_id, model_id, name, description, context_window, max_output_tokens, is_free, speed_rating, quality_rating, supports_json_mode, is_active, sort_order)
VALUES
  -- Groq (free, built-in)
  (
    'groq/llama-3.3-70b', 'groq', 'llama-3.3-70b-versatile',
    'Llama 3.3 70B', 'Model utama Groq — gratis, cepat, kualitas tinggi.',
    128000, 4096, true,
    5, 4, true, true, 0
  ),
  (
    'groq/llama-3.1-8b', 'groq', 'llama-3.1-8b-instant',
    'Llama 3.1 8B (Fast)', 'Model fallback Groq — sangat cepat, kualitas cukup.',
    131072, 4096, true,
    5, 3, true, true, 1
  ),
  (
    'groq/llama-4-scout', 'groq', 'meta-llama/llama-4-scout-17b-16e-instruct',
    'Llama 4 Scout 17B', 'Model terbaru Llama 4 — MoE 17B, gratis di Groq.',
    131072, 8192, true,
    5, 4, true, true, 2
  ),
  -- OpenAI (requires user key)
  (
    'openai/gpt-4o-mini', 'openai', 'gpt-4o-mini',
    'GPT-4o Mini', 'Model ringan OpenAI — cepat & murah.',
    128000, 16384, false,
    4, 4, true, true, 10
  ),
  (
    'openai/gpt-4o', 'openai', 'gpt-4o',
    'GPT-4o', 'Model flagship OpenAI — kualitas terbaik.',
    128000, 16384, false,
    3, 5, true, true, 11
  ),
  -- Anthropic (requires user key)
  (
    'anthropic/claude-sonnet', 'anthropic', 'claude-sonnet-4-20250514',
    'Claude Sonnet 4', 'Model Anthropic — sangat baik untuk konten kreatif.',
    200000, 16000, false,
    3, 5, true, true, 20
  ),
  -- OpenRouter (requires user key)
  (
    'openrouter/auto', 'openrouter', 'openrouter/auto',
    'OpenRouter Auto', 'Otomatis pilih model terbaik berdasarkan prompt.',
    128000, 4096, false,
    3, 4, true, true, 30
  ),
  -- Google (requires user key)
  (
    'google/gemini-2.5-flash', 'google', 'gemini-2.5-flash-preview-05-20',
    'Gemini 2.5 Flash', 'Model Google — context window terbesar, cepat.',
    1048576, 65536, false,
    4, 4, true, true, 40
  )
ON CONFLICT (id) DO NOTHING;


-- ────────────────────────
-- 3. user_ai_configs — user's provider API keys & preferences
-- ────────────────
CREATE TABLE IF NOT EXISTS user_ai_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id TEXT NOT NULL REFERENCES ai_providers(id),
  api_key_encrypted TEXT,              -- encrypted with TOKEN_ENCRYPTION_KEY (AES-256-GCM)
  custom_base_url TEXT,                -- only for 'custom' provider
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider_id)
);

-- Indexes for user lookups
CREATE INDEX IF NOT EXISTS idx_user_ai_configs_user_id ON user_ai_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_ai_configs_provider ON user_ai_configs(user_id, provider_id);


-- ────────────────────────
-- 4. user_custom_models — user-defined custom models
-- ────────────────────
CREATE TABLE IF NOT EXISTS user_custom_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  config_id UUID NOT NULL REFERENCES user_ai_configs(id) ON DELETE CASCADE,
  model_id TEXT NOT NULL,              -- the model identifier to send to the API
  name TEXT NOT NULL,                -- display name
  description TEXT,
  context_window INTEGER DEFAULT 4096,
  max_output_tokens INTEGER DEFAULT 4096,
  supports_json_mode BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for user lookups
CREATE INDEX IF NOT EXISTS idx_user_custom_models_user_id ON user_custom_models(user_id);
CREATE INDEX IF NOT EXISTS idx_user_custom_models_config_id ON user_custom_models(config_id);


-- ────────────────────
-- 5. user_model_preferences — which model user prefers per generation type
-- ────────────────────
CREATE TABLE IF NOT EXISTS user_model_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  generation_type TEXT,                -- 'caption', 'carousel', 'ad_copy', etc. NULL = default for all
  preset_model_id TEXT REFERENCES ai_models(id),       -- preset model
  custom_model_id UUID REFERENCES user_custom_models(id) ON DELETE SET NULL,  -- OR custom model
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, generation_type)
);

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_user_model_preferences_user_id ON user_model_preferences(user_id);


-- ────────────────────
-- 6. RLS Policies
-- ────────────────

-- ai_providers: readable by all authenticated users (catalog)
ALTER TABLE ai_providers ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ai_providers_select_authenticated' AND tablename = 'ai_providers') THEN
    EXECUTE 'CREATE POLICY ai_providers_select_authenticated ON ai_providers FOR SELECT TO authenticated USING (true)';
  END IF;
END
$$;

-- ai_models: readable by all authenticated users (catalog)
ALTER TABLE ai_models ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ai_models_select_authenticated' AND tablename = 'ai_models') THEN
    EXECUTE 'CREATE POLICY ai_models_select_authenticated ON ai_models FOR SELECT TO authenticated USING (true)';
  END IF;
END
$$;

-- user_ai_configs: user can only access their own configs
ALTER TABLE user_ai_configs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_ai_configs_select_own' AND tablename = 'user_ai_configs') THEN
    EXECUTE 'CREATE POLICY user_ai_configs_select_own ON user_ai_configs FOR SELECT TO authenticated USING (auth.uid() = user_id)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_ai_configs_insert_own' AND tablename = 'user_ai_configs') THEN
    EXECUTE 'CREATE POLICY user_ai_configs_insert_own ON user_ai_configs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_ai_configs_update_own' AND tablename = 'user_ai_configs') THEN
    EXECUTE 'CREATE POLICY user_ai_configs_update_own ON user_ai_configs FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_ai_configs_delete_own' AND tablename = 'user_ai_configs') THEN
    EXECUTE 'CREATE POLICY user_ai_configs_delete_own ON user_ai_configs FOR DELETE TO authenticated USING (auth.uid() = user_id)';
  END IF;
END
$$;

-- user_custom_models: user can only access their own custom models
ALTER TABLE user_custom_models ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_custom_models_select_own' AND tablename = 'user_custom_models') THEN
    EXECUTE 'CREATE POLICY user_custom_models_select_own ON user_custom_models FOR SELECT TO authenticated USING (auth.uid() = user_id)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_custom_models_insert_own' AND tablename = 'user_custom_models') THEN
    EXECUTE 'CREATE POLICY user_custom_models_insert_own ON user_custom_models FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_custom_models_update_own' AND tablename = 'user_custom_models') THEN
    EXECUTE 'CREATE POLICY user_custom_models_update_own ON user_custom_models FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_custom_models_delete_own' AND tablename = 'user_custom_models') THEN
    EXECUTE 'CREATE POLICY user_custom_models_delete_own ON user_custom_models FOR DELETE TO authenticated USING (auth.uid() = user_id)';
  END IF;
END
$$;

-- user_model_preferences: user can only access their own preferences
ALTER TABLE user_model_preferences ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_model_preferences_select_own' AND tablename = 'user_model_preferences') THEN
    EXECUTE 'CREATE POLICY user_model_preferences_select_own ON user_model_preferences FOR SELECT TO authenticated USING (auth.uid() = user_id)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_model_preferences_insert_own' AND tablename = 'user_model_preferences') THEN
    EXECUTE 'CREATE POLICY user_model_preferences_insert_own ON user_model_preferences FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_model_preferences_update_own' AND tablename = 'user_model_preferences') THEN
    EXECUTE 'CREATE POLICY user_model_preferences_update_own ON user_model_preferences FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_model_preferences_delete_own' AND tablename = 'user_model_preferences') THEN
    EXECUTE 'CREATE POLICY user_model_preferences_delete_own ON user_model_preferences FOR DELETE TO authenticated USING (auth.uid() = user_id)';
  END IF;
END
$$;


-- ────────────────────────
-- 7. Triggers for updated_at
-- ────────────────────

-- Reusable trigger function (may already exist from prior migrations)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- user_ai_configs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_user_ai_configs_updated_at'
  ) THEN
    CREATE TRIGGER trg_user_ai_configs_updated_at
      BEFORE UPDATE ON user_ai_configs
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END
$$;

-- user_custom_models
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_user_custom_models_updated_at'
  ) THEN
    CREATE TRIGGER trg_user_custom_models_updated_at
      BEFORE UPDATE ON user_custom_models
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END
$$;

-- user_model_preferences
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_user_model_preferences_updated_at'
  ) THEN
    CREATE TRIGGER trg_user_model_preferences_updated_at
      BEFORE UPDATE ON user_model_preferences
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END
$$;


-- ────────────────────────
-- 8. Additional providers: DeepSeek & GLM (ZhipuAI)
-- ────────────────────────────

-- DeepSeek provider
INSERT INTO ai_providers (id, name, api_base_url, is_openai_compatible, auth_header, auth_prefix, requires_user_key, icon, description, is_active, sort_order)
VALUES
  (
    'deepseek', 'DeepSeek', 'https://api.deepseek.com/v1',
    true, 'Authorization', 'Bearer', true,
    '🐋', 'DeepSeek — model reasoning kuat, harga terjangkau. Butuh API key sendiri.',
    true, 5
  )
ON CONFLICT (id) DO NOTHING;

-- GLM (ZhipuAI) provider
INSERT INTO ai_providers (id, name, api_base_url, is_openai_compatible, auth_header, auth_prefix, requires_user_key, icon, description, is_active, sort_order)
VALUES
  (
    'glm', 'ZhipuAI (GLM)', 'https://open.bigmodel.cn/api/paas/v4',
    true, 'Authorization', 'Bearer', true,
    '🔮', 'ZhipuAI GLM — model bilingual CN/EN berkualitas tinggi. Butuh API key sendiri.',
    true, 6
  )
ON CONFLICT (id) DO NOTHING;

-- DeepSeek models
INSERT INTO ai_models (id, provider_id, model_id, name, description, context_window, max_output_tokens, is_free, speed_rating, quality_rating, supports_json_mode, is_active, sort_order)
VALUES
  (
    'deepseek/deepseek-chat', 'deepseek', 'deepseek-chat',
    'DeepSeek V3', 'Model utama DeepSeek — kualitas tinggi, harga sangat terjangkau.',
    65536, 8192, false,
    4, 5, true, true, 50
  ),
  (
    'deepseek/deepseek-reasoner', 'deepseek', 'deepseek-reasoner',
    'DeepSeek R1 (Reasoning)', 'Model reasoning DeepSeek — chain-of-thought, sangat baik untuk analisis.',
    65536, 8192, false,
    3, 5, true, true, 51
  )
ON CONFLICT (id) DO NOTHING;

-- GLM (ZhipuAI) models
INSERT INTO ai_models (id, provider_id, model_id, name, description, context_window, max_output_tokens, is_free, speed_rating, quality_rating, supports_json_mode, is_active, sort_order)
VALUES
  (
    'glm/glm-4-plus', 'glm', 'glm-4-plus',
    'GLM-4 Plus', 'Model flagship ZhipuAI — bilingual berkualitas tinggi.',
    128000, 4096, false,
    3, 4, true, true, 60
  ),
  (
    'glm/glm-4-flash', 'glm', 'glm-4-flash',
    'GLM-4 Flash', 'Model cepat ZhipuAI — gratis untuk penggunaan terbatas.',
    128000, 4096, false,
    5, 3, true, true, 61
  )
ON CONFLICT (id) DO NOTHING;


-- ════════════════════════
-- Migration 014 complete.
-- Tables: ai_providers, ai_models, user_ai_configs,
--          user_custom_models, user_model_preferences
-- Seded: 8 providers, 12 models
-- RLS: enabled on all tables
-- ════════════════════
