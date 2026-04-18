-- ============================================================
-- Phase 2: Sprint 13-14 — Advanced Analytics & Billing
-- ============================================================

-- 1. CONTENT PERFORMANCE SNAPSHOTS -------------------------
-- Periodic performance snapshots per content piece
CREATE TABLE IF NOT EXISTS content_performance (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_id      UUID REFERENCES generated_content(id) ON DELETE SET NULL,
  -- Platform this snapshot is for
  platform        TEXT NOT NULL,
  -- Metrics
  impressions     BIGINT DEFAULT 0,
  reach           BIGINT DEFAULT 0,
  engagement      BIGINT DEFAULT 0,   -- likes + comments + shares
  clicks          BIGINT DEFAULT 0,
  saves           BIGINT DEFAULT 0,
  shares          BIGINT DEFAULT 0,
  comments        BIGINT DEFAULT 0,
  -- Computed
  engagement_rate NUMERIC(6,2),        -- engagement / impressions * 100
  ctr             NUMERIC(6,2),        -- clicks / impressions * 100
  -- Snapshot metadata
  snapshot_date   DATE NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (content_id, platform, snapshot_date)
);

ALTER TABLE content_performance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "content_performance_owner" ON content_performance USING (auth.uid() = user_id);

CREATE INDEX idx_content_perf_user ON content_performance(user_id, snapshot_date DESC);
CREATE INDEX idx_content_perf_content ON content_performance(content_id, snapshot_date DESC);
CREATE INDEX idx_content_perf_platform ON content_performance(user_id, platform, snapshot_date DESC);

-- 2. GOAL TRACKING -----------------------------------------
CREATE TABLE IF NOT EXISTS analytics_goals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  metric        TEXT NOT NULL,   -- 'leads', 'conversions', 'revenue', 'engagement', 'content_count'
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
CREATE POLICY "analytics_goals_owner" ON analytics_goals USING (auth.uid() = user_id);

CREATE INDEX idx_analytics_goals_user ON analytics_goals(user_id);

-- 3. FUNNEL EVENTS -----------------------------------------
-- Track user journey: content view → link click → lead → conversion
CREATE TABLE IF NOT EXISTS funnel_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Event identification
  event_type    TEXT NOT NULL
                  CHECK (event_type IN ('content_view','link_click','form_submit','lead_created','lead_qualified','lead_converted','purchase')),
  -- References
  content_id    UUID REFERENCES generated_content(id) ON DELETE SET NULL,
  link_id       UUID REFERENCES short_links(id) ON DELETE SET NULL,
  lead_id       UUID REFERENCES leads(id) ON DELETE SET NULL,
  -- Visitor data
  session_id    TEXT,
  source        TEXT,     -- utm_source
  medium        TEXT,     -- utm_medium
  campaign      TEXT,     -- utm_campaign
  -- Value
  revenue       NUMERIC DEFAULT 0,
  occurred_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE funnel_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "funnel_events_owner" ON funnel_events USING (auth.uid() = user_id);

CREATE INDEX idx_funnel_events_user ON funnel_events(user_id, occurred_at DESC);
CREATE INDEX idx_funnel_events_type ON funnel_events(user_id, event_type, occurred_at DESC);
CREATE INDEX idx_funnel_events_session ON funnel_events(session_id);

-- 4. SUBSCRIPTION PLANS ------------------------------------
CREATE TABLE IF NOT EXISTS subscription_plans (
  id            TEXT PRIMARY KEY,   -- 'free', 'pro', 'business', 'enterprise'
  name          TEXT NOT NULL,
  description   TEXT,
  price_monthly NUMERIC NOT NULL,
  price_yearly  NUMERIC NOT NULL,
  currency      TEXT DEFAULT 'IDR',
  -- Feature limits
  ai_credits_monthly  INTEGER,      -- NULL = unlimited
  content_storage_gb  INTEGER,
  max_leads           INTEGER,
  max_connected_accs  INTEGER,
  max_team_members    INTEGER,
  max_ab_tests        INTEGER,
  -- Feature flags (JSONB for flexibility)
  features      JSONB DEFAULT '{}',
  is_active     BOOLEAN DEFAULT TRUE,
  sort_order    INTEGER DEFAULT 0
);

INSERT INTO subscription_plans VALUES
  ('free',       'Free',       'Untuk memulai',           0,        0,        'IDR', 50,   1,   100,  2,  1,  2,  '{"auto_publish":false,"ads_manager":false,"crm":false,"competitor_spy":false,"testimonials":true,"analytics_basic":true}', true, 0),
  ('pro',        'Pro',        'Untuk kreator serius',    199000,   1990000,  'IDR', 500,  5,   1000, 5,  1,  10, '{"auto_publish":true,"ads_manager":true,"crm":true,"competitor_spy":true,"testimonials":true,"analytics_basic":true,"analytics_advanced":true}', true, 1),
  ('business',   'Business',   'Untuk tim & agensi',      499000,   4990000,  'IDR', 2000, 20,  5000, 10, 5,  50, '{"auto_publish":true,"ads_manager":true,"crm":true,"competitor_spy":true,"testimonials":true,"analytics_basic":true,"analytics_advanced":true,"white_label":true,"priority_support":true}', true, 2),
  ('enterprise', 'Enterprise', 'Korporat & skala besar',  0,        0,        'IDR', NULL, NULL,NULL, NULL,NULL,NULL,'{"auto_publish":true,"ads_manager":true,"crm":true,"competitor_spy":true,"testimonials":true,"analytics_basic":true,"analytics_advanced":true,"white_label":true,"priority_support":true,"dedicated_support":true,"custom_integration":true}', true, 3)
ON CONFLICT (id) DO NOTHING;

-- 5. USER SUBSCRIPTIONS ------------------------------------
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
  -- Payment
  payment_method  TEXT,   -- 'credit_card','bank_transfer','gopay','ovo'
  external_id     TEXT,   -- payment gateway subscription ID
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_subscriptions_self" ON user_subscriptions USING (auth.uid() = user_id);

CREATE INDEX idx_user_subscriptions_user ON user_subscriptions(user_id);

-- 6. USAGE TRACKING ----------------------------------------
CREATE TABLE IF NOT EXISTS usage_records (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  metric      TEXT NOT NULL,    -- 'ai_credits','storage_mb','leads','content_items'
  value       NUMERIC NOT NULL DEFAULT 0,
  period_start DATE NOT NULL,
  period_end   DATE NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, metric, period_start)
);

ALTER TABLE usage_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "usage_records_self" ON usage_records USING (auth.uid() = user_id);

CREATE INDEX idx_usage_records_user ON usage_records(user_id, period_start DESC);

-- 7. INVOICES ----------------------------------------------
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
CREATE POLICY "invoices_self" ON invoices USING (auth.uid() = user_id);

CREATE INDEX idx_invoices_user ON invoices(user_id, created_at DESC);

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Aggregated analytics overview for date range
CREATE OR REPLACE FUNCTION get_analytics_overview(
  p_user_id UUID,
  p_start   DATE,
  p_end     DATE
) RETURNS JSON AS $$
DECLARE v_result JSON;
BEGIN
  SELECT json_build_object(
    -- Content
    'total_content',    (SELECT COUNT(*) FROM generated_content WHERE user_id = p_user_id AND created_at::DATE BETWEEN p_start AND p_end),
    -- Links
    'total_clicks',     (SELECT COALESCE(SUM(click_count),0) FROM short_links WHERE user_id = p_user_id),
    -- Leads
    'total_leads',      (SELECT COUNT(*) FROM leads WHERE user_id = p_user_id AND created_at::DATE BETWEEN p_start AND p_end),
    'converted_leads',  (SELECT COUNT(*) FROM leads WHERE user_id = p_user_id AND status = 'converted' AND created_at::DATE BETWEEN p_start AND p_end),
    -- Testimonials
    'testimonials',     (SELECT COUNT(*) FROM testimonials WHERE user_id = p_user_id AND status = 'approved'),
    -- Ads
    'ad_spend',         (SELECT COALESCE(SUM(i.spend),0) FROM ads_insights_daily i JOIN ads_campaigns c ON i.campaign_id = c.id WHERE c.user_id = p_user_id AND i.date BETWEEN p_start AND p_end),
    'ad_revenue',       (SELECT COALESCE(SUM(i.revenue),0) FROM ads_insights_daily i JOIN ads_campaigns c ON i.campaign_id = c.id WHERE c.user_id = p_user_id AND i.date BETWEEN p_start AND p_end)
  )
  INTO v_result;
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get funnel conversion rates
CREATE OR REPLACE FUNCTION get_funnel_stats(p_user_id UUID, p_days INTEGER DEFAULT 30)
RETURNS JSON AS $$
DECLARE v_result JSON;
BEGIN
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

-- Auto-touch updated_at
CREATE TRIGGER trg_goals_updated_at BEFORE UPDATE ON analytics_goals
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_subscriptions_updated_at BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_usage_updated_at BEFORE UPDATE ON usage_records
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
