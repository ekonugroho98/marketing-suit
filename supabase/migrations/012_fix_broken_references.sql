-- ============================================================
-- Migration 012: Fix Broken Foreign Key References & Data Mismatches
-- ============================================================
-- This migration fixes the following issues found during code audit:
-- 1. content_performance table may not exist or has broken FK to
--    non-existent generated_content(id) → recreate with generation_history(id)
-- 2. funnel_events table may not exist or has broken FK to
--    non-existent generated_content(id) and short_links(id)
--    → recreate with generation_history(id) and smart_links(id)
-- 3. leads.content_id column may not exist (safe_migration excluded it)
--    → add column if missing, with correct FK to generation_history(id)
-- 4. get_analytics_overview() references non-existent tables
--    generated_content, short_links, and column "revenue" instead of
--    "conversion_value" on ads_insights_daily
-- 5. get_funnel_stats() needs auth guard (from migration 011)
-- 6. profiles.subscription_tier CHECK constraint only allows
--    ('free','creator','pro','agency') but subscription_plans has
--    ('free','pro','business','enterprise') — need to unify all tiers
-- 7. subscription_plans is missing 'creator' and 'agency' tier rows
-- 8. Phase 1 tables missing indexes on user_id columns
-- 9. Phase 1 tables missing updated_at triggers
-- Safe to run multiple times (fully idempotent).
-- ============================================================

BEGIN;

-- ============================================================
-- 1. content_performance table
--    Original migration 007 tried to FK to generated_content(id)
--    which doesn't exist. We create the table with the correct FK.
-- ============================================================
CREATE TABLE IF NOT EXISTS content_performance (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_id      UUID REFERENCES generation_history(id) ON DELETE SET NULL,
  platform        TEXT NOT NULL,
  impressions     BIGINT DEFAULT 0,
  reach           BIGINT DEFAULT 0,
  engagement      BIGINT DEFAULT 0,
  clicks          BIGINT DEFAULT 0,
  saves           BIGINT DEFAULT 0,
  shares          BIGINT DEFAULT 0,
  comments        BIGINT DEFAULT 0,
  engagement_rate NUMERIC(6,2),
  ctr             NUMERIC(6,2),
  snapshot_date   DATE NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (content_id, platform, snapshot_date)
);

ALTER TABLE content_performance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "content_performance_owner" ON content_performance;
CREATE POLICY "content_performance_owner" ON content_performance USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_content_perf_user ON content_performance(user_id, snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_content_perf_content ON content_performance(content_id, snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_content_perf_platform ON content_performance(user_id, platform, snapshot_date DESC);

-- If the table already existed with a broken FK, fix it:
DO $$
BEGIN
  -- Drop broken FK if it points to generated_content
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'content_performance_content_id_fkey'
      AND table_name = 'content_performance'
  ) THEN
    -- Check if the FK target is wrong (points to generated_content instead of generation_history)
    IF EXISTS (
      SELECT 1 FROM pg_constraint c
      JOIN pg_class f ON c.confrelid = f.oid
      WHERE c.conname = 'content_performance_content_id_fkey'
        AND f.relname = 'generated_content'
    ) THEN
      ALTER TABLE content_performance DROP CONSTRAINT content_performance_content_id_fkey;
      ALTER TABLE content_performance
        ADD CONSTRAINT content_performance_content_id_fkey
        FOREIGN KEY (content_id) REFERENCES generation_history(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- ============================================================
-- 2. funnel_events table
--    Original migration 007 tried to FK to generated_content(id)
--    and short_links(id) — both don't exist. Recreate with correct FKs.
-- ============================================================
CREATE TABLE IF NOT EXISTS funnel_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type    TEXT NOT NULL
                CHECK (event_type IN ('content_view','link_click','form_submit','lead_created','lead_qualified','lead_converted','purchase')),
  content_id    UUID REFERENCES generation_history(id) ON DELETE SET NULL,
  link_id       UUID REFERENCES smart_links(id) ON DELETE SET NULL,
  lead_id       UUID REFERENCES leads(id) ON DELETE SET NULL,
  session_id    TEXT,
  source        TEXT,
  medium        TEXT,
  campaign      TEXT,
  revenue       NUMERIC DEFAULT 0,
  occurred_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE funnel_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "funnel_events_owner" ON funnel_events;
CREATE POLICY "funnel_events_owner" ON funnel_events USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_funnel_events_user ON funnel_events(user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_funnel_events_type ON funnel_events(user_id, event_type, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_funnel_events_session ON funnel_events(session_id);

-- If the table already existed with broken FKs, fix them:
DO $$
BEGIN
  -- Fix content_id FK if it points to generated_content
  IF EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class f ON c.confrelid = f.oid
    WHERE c.conname = 'funnel_events_content_id_fkey'
      AND f.relname = 'generated_content'
  ) THEN
    ALTER TABLE funnel_events DROP CONSTRAINT funnel_events_content_id_fkey;
    ALTER TABLE funnel_events
      ADD CONSTRAINT funnel_events_content_id_fkey
      FOREIGN KEY (content_id) REFERENCES generation_history(id) ON DELETE SET NULL;
  END IF;

  -- Fix link_id FK if it points to short_links
  IF EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class f ON c.confrelid = f.oid
    WHERE c.conname = 'funnel_events_link_id_fkey'
      AND f.relname = 'short_links'
  ) THEN
    ALTER TABLE funnel_events DROP CONSTRAINT funnel_events_link_id_fkey;
    ALTER TABLE funnel_events
      ADD CONSTRAINT funnel_events_link_id_fkey
      FOREIGN KEY (link_id) REFERENCES smart_links(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================
-- 3. leads.content_id column
--    The safe_migration removed this column because the original FK
--    was broken. Add it back with the correct FK if missing.
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'content_id'
  ) THEN
    ALTER TABLE leads ADD COLUMN content_id UUID REFERENCES generation_history(id) ON DELETE SET NULL;
  ELSE
    -- Column exists — check if FK points to wrong table
    IF EXISTS (
      SELECT 1 FROM pg_constraint c
      JOIN pg_class f ON c.confrelid = f.oid
      WHERE c.conname = 'leads_content_id_fkey'
        AND f.relname = 'generated_content'
    ) THEN
      ALTER TABLE leads DROP CONSTRAINT leads_content_id_fkey;
      ALTER TABLE leads
        ADD CONSTRAINT leads_content_id_fkey
        FOREIGN KEY (content_id) REFERENCES generation_history(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- ============================================================
-- 4. Ensure analytics_goals table exists (from migration 007)
--    May have failed if 007 failed partway through
-- ============================================================
CREATE TABLE IF NOT EXISTS analytics_goals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  metric        TEXT NOT NULL,
  target_value  NUMERIC NOT NULL,
  current_value NUMERIC DEFAULT 0,
  period        TEXT NOT NULL DEFAULT 'monthly' CHECK (period IN ('weekly','monthly','quarterly','yearly')),
  period_start  DATE NOT NULL,
  period_end    DATE NOT NULL,
  status        TEXT DEFAULT 'active' CHECK (status IN ('active','achieved','missed','cancelled')),
  color         TEXT DEFAULT '#6366f1',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE analytics_goals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "analytics_goals_owner" ON analytics_goals;
CREATE POLICY "analytics_goals_owner" ON analytics_goals USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_goals_user ON analytics_goals(user_id);

-- ============================================================
-- 5. Ensure subscription_plans table exists (from migration 007)
-- ============================================================
CREATE TABLE IF NOT EXISTS subscription_plans (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  description   TEXT,
  price_monthly NUMERIC NOT NULL,
  price_yearly  NUMERIC NOT NULL,
  currency      TEXT DEFAULT 'IDR',
  ai_credits_monthly  INTEGER,
  content_storage_gb  INTEGER,
  max_leads           INTEGER,
  max_connected_accs  INTEGER,
  max_team_members    INTEGER,
  max_ab_tests        INTEGER,
  features      JSONB DEFAULT '{}',
  is_active     BOOLEAN DEFAULT TRUE,
  sort_order    INTEGER DEFAULT 0
);

-- ============================================================
-- 6. Ensure user_subscriptions table exists (from migration 007)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  plan_id         TEXT NOT NULL REFERENCES subscription_plans(id),
  billing_cycle   TEXT DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly','yearly')),
  status          TEXT DEFAULT 'active' CHECK (status IN ('active','trialing','past_due','cancelled','paused')),
  trial_ends_at   TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ DEFAULT NOW(),
  current_period_end   TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 month'),
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  payment_method  TEXT,
  external_id     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_subscriptions_self" ON user_subscriptions;
CREATE POLICY "user_subscriptions_self" ON user_subscriptions USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user ON user_subscriptions(user_id);

-- ================================================
-- 7. Ensure usage_records table exists (from migration 007)
-- ============================================================
CREATE TABLE IF NOT EXISTS usage_records (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  metric      TEXT NOT NULL,
  value       NUMERIC NOT NULL DEFAULT 0,
  period_start DATE NOT NULL,
  period_end   DATE NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, metric, period_start)
);

ALTER TABLE usage_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "usage_records_self" ON usage_records;
CREATE POLICY "usage_records_self" ON usage_records USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_usage_records_user ON usage_records(user_id, period_start DESC);

-- ================================================
-- 8. Ensure invoices table exists (from migration 007)
-- ============================================================
CREATE TABLE IF NOT EXISTS invoices (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_number TEXT UNIQUE NOT NULL,
  plan_id       TEXT REFERENCES subscription_plans(id),
  amount        NUMERIC NOT NULL,
  currency      TEXT DEFAULT 'IDR',
  status        TEXT DEFAULT 'pending' CHECK (status IN ('pending','paid','failed','refunded','void')),
  billing_cycle TEXT,
  period_start  DATE,
  period_end    DATE,
  paid_at       TIMESTAMPTZ,
  due_date      DATE,
  payment_method TEXT,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "invoices_self" ON invoices;
CREATE POLICY "invoices_self" ON invoices USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user ON invoices(user_id, created_at DESC);

-- ================================================
-- 9. Fix get_analytics_overview() function
--    - generated_content → generation_history
--    - short_links       → smart_links
--    - i.revenue         → i.conversion_value
--    - Add auth guard (from migration 011 pattern)
-- ============================================================
CREATE OR REPLACE FUNCTION get_analytics_overview(
  p_user_id UUID,
  p_start   DATE,
  p_end     DATE
) RETURNS JSON AS $$
DECLARE v_result JSON;
BEGIN
  -- Auth guard: prevent cross-user data access
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'unauthorized: user mismatch';
  END IF;

  SELECT json_build_object(
    'total_content',    (SELECT COUNT(*) FROM generation_history WHERE user_id = p_user_id AND created_at::DATE BETWEEN p_start AND p_end),
    'total_clicks',     (SELECT COALESCE(SUM(click_count),0) FROM smart_links WHERE user_id = p_user_id),
    'total_leads',      (SELECT COUNT(*) FROM leads WHERE user_id = p_user_id AND created_at::DATE BETWEEN p_start AND p_end),
    'converted_leads',  (SELECT COUNT(*) FROM leads WHERE user_id = p_user_id AND status = 'converted' AND created_at::DATE BETWEEN p_start AND p_end),
    'testimonials',     (SELECT COUNT(*) FROM testimonials WHERE user_id = p_user_id AND status = 'approved'),
    'ad_spend',         (SELECT COALESCE(SUM(i.spend),0) FROM ads_insights_daily i JOIN ads_campaigns c ON i.campaign_id = c.id WHERE c.user_id = p_user_id AND i.date BETWEEN p_start AND p_end),
    'ad_revenue',       (SELECT COALESCE(SUM(i.conversion_value),0) FROM ads_insights_daily i JOIN ads_campaigns c ON i.campaign_id = c.id WHERE c.user_id = p_user_id AND i.date BETWEEN p_start AND p_end)
  )
  INTO v_result;
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 10. Fix get_funnel_stats() — add auth guard
-- ============================================================
CREATE OR REPLACE FUNCTION get_funnel_stats(p_user_id UUID, p_days INTEGER DEFAULT 30)
RETURNS JSON AS $$
DECLARE v_result JSON;
BEGIN
  -- Auth guard: prevent cross-user data access
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'unauthorized: user mismatch';
  END IF;

  SELECT json_build_object(
    'content_views',    COUNT(*) FILTER (WHERE event_type = 'content_view'),
    'link_clicks',      COUNT(*) FILTER (WHERE event_type = 'link_click'),
    'form_submits',     COUNT(*) FILTER (WHERE event_type = 'form_submit'),
    'leads_created',    COUNT(*) FILTER (WHERE event_type = 'lead_created'),
    'leads_qualified',  COUNT(*) FILTER (WHERE event_type = 'lead_qualified'),
    'converted',        COUNT(*) FILTER (WHERE event_type = 'lead_converted'),
    'total_revenue',    COALESCE(SUM(revenue) FILTER (WHERE event_type = 'purchase'), 0)
  )
  INTO v_result
  FROM funnel_events
  WHERE user_id = p_user_id
    AND occurred_at >= NOW() - (p_days || ' days')::INTERVAL;
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 11. Update profiles.subscription_tier CHECK constraint
--     to include all tiers: free, creator, pro, business, agency, enterprise
-- ============================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_subscription_tier_check'
  ) THEN
    ALTER TABLE profiles DROP CONSTRAINT profiles_subscription_tier_check;
  END IF;

  ALTER TABLE profiles
    ADD CONSTRAINT profiles_subscription_tier_check
    CHECK (subscription_tier IN ('free', 'creator', 'pro', 'business', 'agency', 'enterprise'));
END $$;

-- ============================================================
-- 12. Insert all subscription plan tiers (idempotent)
--     Pricing per CLAUDE.md:
--       free=Rp0, creator=Rp99K, pro=Rp249K, agency=Rp499K
--     Plus existing: business, enterprise
-- ============================================================
-- Columns (15 total):
--   1.id, 2.name, 3.description,
--   4.price_monthly, 5.price_yearly, 6.currency,
--   7.ai_credits_monthly, 8.content_storage_gb, 9.max_leads,
--   10.max_connected_accs, 11.max_team_members, 12.max_ab_tests,
--   13.features, 14.is_active, 15.sort_order
INSERT INTO subscription_plans
  (id, name, description, price_monthly, price_yearly, currency, ai_credits_monthly, content_storage_gb, max_leads, max_connected_accs, max_team_members, max_ab_tests, features, is_active, sort_order)
VALUES
  -- free: Rp 0/bulan, 50 AI credits, 1GB, 100 leads, 2 accounts, 1 member, 2 AB tests
  ('free', 'Free', 'Untuk memulai',
    0, 0, 'IDR',
    50, 1, 100, 2, 1, 2,
    '{"auto_publish":false,"ads_manager":false,"crm":false,"competitor_spy":false,"testimonials":true,"analytics_basic":true,"analytics_advanced":false}',
    true, 0),

  -- creator: Rp 99K/bulan, unlimited AI, 3GB, 500 leads, 3 accounts, 1 member, 5 AB tests
  ('creator', 'Creator', 'Untuk kreator aktif',
    99000, 990000, 'IDR',
    NULL, 3, 500, 3, 1, 5,
    '{"auto_publish":true,"ads_manager":false,"crm":false,"competitor_spy":false,"testimonials":true,"analytics_basic":true,"analytics_advanced":false}',
    true, 1),

  -- pro: Rp 249K/bulan, unlimited AI, 5GB, 1000 leads, 5 accounts, 1 member, 10 AB tests
  ('pro', 'Pro', 'Untuk kreator serius',
    249000, 2490000, 'IDR',
    NULL, 5, 1000, 5, 1, 10,
    '{"auto_publish":true,"ads_manager":true,"crm":true,"competitor_spy":true,"testimonials":true,"analytics_basic":true,"analytics_advanced":true}',
    true, 2),

  -- business: Rp 499K/bulan, unlimited AI, 20GB, 5000 leads, 10 accounts, 5 members, 50 AB tests
  ('business', 'Business', 'Untuk tim & agensi',
    499000, 4990000, 'IDR',
    NULL, 20, 5000, 10, 5, 50,
    '{"auto_publish":true,"ads_manager":true,"crm":true,"competitor_spy":true,"testimonials":true,"analytics_basic":true,"analytics_advanced":true,"white_label":true,"priority_support":true}',
    true, 3),

  -- agency: Rp 499K/bulan, unlimited AI, 50GB, unlimited leads, unlimited accounts, 3 members, unlimited AB tests
  ('agency', 'Agency', 'Multi-brand & tim besar',
    499000, 4990000, 'IDR',
    NULL, 50, NULL, NULL, 3, NULL,
    '{"auto_publish":true,"ads_manager":true,"crm":true,"competitor_spy":true,"testimonials":true,"analytics_basic":true,"analytics_advanced":true,"white_label":true,"priority_support":true,"multi_brand":true}',
    true, 4),

  -- enterprise: custom pricing, all unlimited
  -- 15 values: id, name, desc, price_monthly, price_yearly, currency, ai_credits, storage_gb, leads, connected_accs, team_members, ab_tests, features, is_active, sort_order
  ('enterprise', 'Enterprise', 'Korporat & skala besar',
    0, 0, 'IDR',
    NULL, NULL, NULL, NULL, NULL, NULL,
    '{"auto_publish":true,"ads_manager":true,"crm":true,"competitor_spy":true,"testimonials":true,"analytics_basic":true,"analytics_advanced":true,"white_label":true,"priority_support":true,"dedicated_support":true,"custom_integration":true}',
    true, 5)

ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  features = EXCLUDED.features,
  sort_order = EXCLUDED.sort_order;

-- ============================================================
-- 13. Add missing indexes on Phase 1 tables (user_id columns)
--     These were identified as missing during the audit.
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_brands_user_id ON brands(user_id);
CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id);
CREATE INDEX IF NOT EXISTS idx_products_brand_id ON products(brand_id);
CREATE INDEX IF NOT EXISTS idx_generation_history_user_id ON generation_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saved_content_user_id ON saved_content(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_content_brand_id ON saved_content(brand_id);
CREATE INDEX IF NOT EXISTS idx_assets_user_id ON assets(user_id);
CREATE INDEX IF NOT EXISTS idx_smart_links_user_id ON smart_links(user_id);
CREATE INDEX IF NOT EXISTS idx_content_calendar_user_id ON content_calendar(user_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_usage_monthly_user_id ON usage_monthly(user_id, month);

-- ============================================================
-- 14. Add updated_at triggers for Phase 1 tables
--     Phase 2 tables have touch_updated_at() triggers but Phase 1
--     tables were missing them.
-- ============================================================

-- Ensure the trigger function exists (Phase 2 migrations create it,
-- but it might not exist if only Phase 1 was run)
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

-- Create triggers only if they don't already exist
DO $$
DECLARE
  _tbl TEXT;
BEGIN
  FOREACH _tbl IN ARRAY['profiles','brands','products','content_calendar','assets','smart_links']
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger
      WHERE tgname = 'trg_' || _tbl || '_updated_at'
    ) THEN
      EXECUTE format(
        'CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION touch_updated_at()',
        _tbl, _tbl
      );
    END IF;
  END LOOP;
END $$;

-- Also ensure Phase 2 billing triggers exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_goals_updated_at') THEN
    CREATE TRIGGER trg_goals_updated_at BEFORE UPDATE ON analytics_goals
      FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_subscriptions_updated_at') THEN
    CREATE TRIGGER trg_subscriptions_updated_at BEFORE UPDATE ON user_subscriptions
      FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_usage_updated_at') THEN
    CREATE TRIGGER trg_usage_updated_at BEFORE UPDATE ON usage_records
      FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
  END IF;
END $$;

COMMIT;
