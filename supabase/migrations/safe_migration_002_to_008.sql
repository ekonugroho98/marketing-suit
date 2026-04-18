-- ============================================================
-- SAFE COMBINED MIGRATION: 002 → 008
-- Aman dijalankan meski sebagian tabel/policy sudah ada.
-- Jalankan SATU FILE INI saja di SQL Editor Supabase.
-- ============================================================

-- ============================================================
-- 002: AUTO-PUBLISHER
-- ============================================================

CREATE TABLE IF NOT EXISTS connected_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('instagram','threads','twitter','tiktok','youtube','facebook')),
  platform_user_id TEXT,
  platform_username TEXT,
  platform_avatar_url TEXT,
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  token_expires_at TIMESTAMPTZ,
  scopes TEXT[],
  status TEXT DEFAULT 'active' CHECK (status IN ('active','expired','needs_reconnect','disconnected')),
  metadata JSONB DEFAULT '{}',
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  last_sync_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS publish_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content_id UUID REFERENCES content_calendar(id) ON DELETE SET NULL,
  platform TEXT NOT NULL,
  platform_post_id TEXT,
  published_url TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','publishing','published','failed')),
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  payload JSONB,
  response JSONB,
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_publish_history_user ON publish_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_publish_history_status ON publish_history(status, scheduled_at);

CREATE TABLE IF NOT EXISTS publish_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  publish_history_id UUID REFERENCES publish_history(id) ON DELETE CASCADE,
  next_retry_at TIMESTAMPTZ NOT NULL,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_publish_queue_retry ON publish_queue(status, next_retry_at);

ALTER TABLE connected_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE publish_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE publish_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own accounts" ON connected_accounts;
DROP POLICY IF EXISTS "Users can create accounts" ON connected_accounts;
DROP POLICY IF EXISTS "Users can update own accounts" ON connected_accounts;
DROP POLICY IF EXISTS "Users can delete own accounts" ON connected_accounts;
CREATE POLICY "Users can view own accounts"   ON connected_accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create accounts"     ON connected_accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own accounts" ON connected_accounts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own accounts" ON connected_accounts FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own publish history" ON publish_history;
DROP POLICY IF EXISTS "Users can create publish history" ON publish_history;
DROP POLICY IF EXISTS "Users can update own publish history" ON publish_history;
CREATE POLICY "Users can view own publish history"   ON publish_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create publish history"     ON publish_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own publish history" ON publish_history FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own queue" ON publish_queue;
DROP POLICY IF EXISTS "Users can create queue items" ON publish_queue;
DROP POLICY IF EXISTS "Users can update own queue" ON publish_queue;
CREATE POLICY "Users can view own queue" ON publish_queue FOR SELECT USING (
  EXISTS (SELECT 1 FROM publish_history ph WHERE ph.id = publish_queue.publish_history_id AND ph.user_id = auth.uid())
);
CREATE POLICY "Users can create queue items" ON publish_queue FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM publish_history ph WHERE ph.id = publish_queue.publish_history_id AND ph.user_id = auth.uid())
);
CREATE POLICY "Users can update own queue" ON publish_queue FOR UPDATE USING (
  EXISTS (SELECT 1 FROM publish_history ph WHERE ph.id = publish_queue.publish_history_id AND ph.user_id = auth.uid())
);

CREATE OR REPLACE FUNCTION get_platform_token(p_user_id UUID, p_platform TEXT)
RETURNS TABLE(access_token_encrypted TEXT, platform_user_id TEXT, metadata JSONB) AS $$
BEGIN
  RETURN QUERY
  SELECT ca.access_token_encrypted, ca.platform_user_id, ca.metadata
  FROM connected_accounts ca
  WHERE ca.user_id = p_user_id AND ca.platform = p_platform AND ca.status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_publishable_content()
RETURNS TABLE(content_id UUID, user_id UUID, brand_id UUID, title TEXT, body TEXT, type TEXT, platform TEXT, hashtags TEXT[], media_urls TEXT[], scheduled_date DATE, scheduled_time TIME) AS $$
BEGIN
  RETURN QUERY
  SELECT cc.id, cc.user_id, cc.brand_id, cc.title, cc.body, cc.type, cc.platform,
         cc.hashtags, cc.media_urls, cc.scheduled_date, cc.scheduled_time
  FROM content_calendar cc
  WHERE cc.status = 'scheduled'
    AND cc.scheduled_date = CURRENT_DATE
    AND cc.scheduled_time <= CURRENT_TIME
    AND NOT EXISTS (
      SELECT 1 FROM publish_history ph
      WHERE ph.content_id = cc.id AND ph.platform = cc.platform
        AND ph.status IN ('published', 'publishing')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 003: A/B TESTING
-- ============================================================

CREATE TABLE IF NOT EXISTS ab_tests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('content','ad_copy','link_rotator')),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','running','paused','completed')),
  winner_variant_id UUID,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  settings JSONB DEFAULT '{"auto_pick_winner": true, "min_confidence": 95, "min_sample": 100}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ab_tests_user   ON ab_tests(user_id, status);
CREATE INDEX IF NOT EXISTS idx_ab_tests_status ON ab_tests(status, end_date);

CREATE TABLE IF NOT EXISTS ab_test_variants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  test_id UUID REFERENCES ab_tests(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  content_id UUID REFERENCES content_calendar(id) ON DELETE SET NULL,
  link_id UUID REFERENCES smart_links(id) ON DELETE SET NULL,
  destination_url TEXT,
  weight INTEGER DEFAULT 50,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ab_variants_test ON ab_test_variants(test_id);

ALTER TABLE link_clicks ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES ab_test_variants(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_clicks_variant ON link_clicks(variant_id);

ALTER TABLE ab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_test_variants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own tests"   ON ab_tests;
DROP POLICY IF EXISTS "Users can create tests"     ON ab_tests;
DROP POLICY IF EXISTS "Users can update own tests" ON ab_tests;
DROP POLICY IF EXISTS "Users can delete own tests" ON ab_tests;
CREATE POLICY "Users can view own tests"   ON ab_tests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create tests"     ON ab_tests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tests" ON ab_tests FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own tests" ON ab_tests FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own variants"   ON ab_test_variants;
DROP POLICY IF EXISTS "Users can create variants"     ON ab_test_variants;
DROP POLICY IF EXISTS "Users can update own variants" ON ab_test_variants;
DROP POLICY IF EXISTS "Users can delete own variants" ON ab_test_variants;
CREATE POLICY "Users can view own variants"   ON ab_test_variants FOR SELECT USING (EXISTS (SELECT 1 FROM ab_tests t WHERE t.id = ab_test_variants.test_id AND t.user_id = auth.uid()));
CREATE POLICY "Users can create variants"     ON ab_test_variants FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM ab_tests t WHERE t.id = ab_test_variants.test_id AND t.user_id = auth.uid()));
CREATE POLICY "Users can update own variants" ON ab_test_variants FOR UPDATE USING (EXISTS (SELECT 1 FROM ab_tests t WHERE t.id = ab_test_variants.test_id AND t.user_id = auth.uid()));
CREATE POLICY "Users can delete own variants" ON ab_test_variants FOR DELETE USING (EXISTS (SELECT 1 FROM ab_tests t WHERE t.id = ab_test_variants.test_id AND t.user_id = auth.uid()));

CREATE OR REPLACE FUNCTION get_active_ab_test_for_link(p_link_id UUID)
RETURNS TABLE(test_id UUID, variant_id UUID, variant_name TEXT, destination_url TEXT, weight INTEGER) AS $$
BEGIN
  RETURN QUERY
  SELECT t.id, v.id, v.name, v.destination_url, v.weight
  FROM ab_tests t JOIN ab_test_variants v ON v.test_id = t.id
  WHERE t.status = 'running' AND v.link_id = p_link_id AND (t.end_date IS NULL OR t.end_date > NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_variant_click(p_variant_id UUID) RETURNS VOID AS $$
BEGIN UPDATE ab_test_variants SET clicks = clicks + 1 WHERE id = p_variant_id; END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_variant_impression(p_variant_id UUID) RETURNS VOID AS $$
BEGIN UPDATE ab_test_variants SET impressions = impressions + 1 WHERE id = p_variant_id; END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_variant_conversion(p_variant_id UUID) RETURNS VOID AS $$
BEGIN UPDATE ab_test_variants SET conversions = conversions + 1 WHERE id = p_variant_id; END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 004: ADS MANAGER
-- ============================================================

CREATE TABLE IF NOT EXISTS ads_campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('meta','tiktok','google')),
  platform_campaign_id TEXT,
  name TEXT NOT NULL,
  objective TEXT NOT NULL CHECK (objective IN ('awareness','traffic','conversion','retargeting')),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','pending_review','active','paused','completed','rejected')),
  daily_budget INTEGER,
  total_budget_limit INTEGER,
  start_date DATE,
  end_date DATE,
  audience JSONB DEFAULT '{}',
  saved_audience_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ads_campaigns_user ON ads_campaigns(user_id, status);

CREATE TABLE IF NOT EXISTS ad_creatives (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES ads_campaigns(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  platform_creative_id TEXT,
  primary_text TEXT,
  headline TEXT,
  description TEXT,
  cta_type TEXT DEFAULT 'LEARN_MORE',
  media_url TEXT,
  destination_url TEXT,
  utm_params JSONB DEFAULT '{}',
  generation_id UUID REFERENCES generation_history(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ads_insights_daily (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES ads_campaigns(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  spend INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  ctr DECIMAL(5,2) DEFAULT 0,
  cpc INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  conversion_value INTEGER DEFAULT 0,
  roas DECIMAL(5,2) DEFAULT 0,
  raw_data JSONB DEFAULT '{}',
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(campaign_id, date)
);

CREATE INDEX IF NOT EXISTS idx_ads_insights_campaign ON ads_insights_daily(campaign_id, date);

CREATE TABLE IF NOT EXISTS saved_audiences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  targeting JSONB NOT NULL,
  estimated_reach TEXT,
  used_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS budget_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  campaign_id UUID REFERENCES ads_campaigns(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('budget_80','budget_100','low_roas','high_cpc')),
  threshold_value DECIMAL,
  is_triggered BOOLEAN DEFAULT false,
  triggered_at TIMESTAMPTZ,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS competitor_ads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  brand_name TEXT NOT NULL,
  ad_text TEXT,
  media_url TEXT,
  platform TEXT,
  ad_library_id TEXT,
  ai_analysis JSONB,
  tags TEXT[],
  is_favorite BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ads_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_creatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE ads_insights_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_audiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_ads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own campaigns"   ON ads_campaigns;
DROP POLICY IF EXISTS "Users can create campaigns"     ON ads_campaigns;
DROP POLICY IF EXISTS "Users can update own campaigns" ON ads_campaigns;
DROP POLICY IF EXISTS "Users can delete own campaigns" ON ads_campaigns;
CREATE POLICY "Users can view own campaigns"   ON ads_campaigns FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create campaigns"     ON ads_campaigns FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own campaigns" ON ads_campaigns FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own campaigns" ON ads_campaigns FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own creatives"   ON ad_creatives;
DROP POLICY IF EXISTS "Users can create creatives"     ON ad_creatives;
DROP POLICY IF EXISTS "Users can update own creatives" ON ad_creatives;
DROP POLICY IF EXISTS "Users can delete own creatives" ON ad_creatives;
CREATE POLICY "Users can view own creatives"   ON ad_creatives FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create creatives"     ON ad_creatives FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own creatives" ON ad_creatives FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own creatives" ON ad_creatives FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own insights"  ON ads_insights_daily;
DROP POLICY IF EXISTS "Users can insert insights"    ON ads_insights_daily;
CREATE POLICY "Users can view own insights" ON ads_insights_daily FOR SELECT USING (EXISTS (SELECT 1 FROM ads_campaigns c WHERE c.id = ads_insights_daily.campaign_id AND c.user_id = auth.uid()));
CREATE POLICY "Users can insert insights"   ON ads_insights_daily FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM ads_campaigns c WHERE c.id = ads_insights_daily.campaign_id AND c.user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can view own audiences"   ON saved_audiences;
DROP POLICY IF EXISTS "Users can create audiences"     ON saved_audiences;
DROP POLICY IF EXISTS "Users can update own audiences" ON saved_audiences;
DROP POLICY IF EXISTS "Users can delete own audiences" ON saved_audiences;
CREATE POLICY "Users can view own audiences"   ON saved_audiences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create audiences"     ON saved_audiences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own audiences" ON saved_audiences FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own audiences" ON saved_audiences FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own alerts"   ON budget_alerts;
DROP POLICY IF EXISTS "Users can create alerts"     ON budget_alerts;
DROP POLICY IF EXISTS "Users can update own alerts" ON budget_alerts;
CREATE POLICY "Users can view own alerts"   ON budget_alerts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create alerts"     ON budget_alerts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own alerts" ON budget_alerts FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own competitor ads"   ON competitor_ads;
DROP POLICY IF EXISTS "Users can create competitor ads"     ON competitor_ads;
DROP POLICY IF EXISTS "Users can update own competitor ads" ON competitor_ads;
DROP POLICY IF EXISTS "Users can delete own competitor ads" ON competitor_ads;
CREATE POLICY "Users can view own competitor ads"   ON competitor_ads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create competitor ads"     ON competitor_ads FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own competitor ads" ON competitor_ads FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own competitor ads" ON competitor_ads FOR DELETE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION get_ads_overview(p_user_id UUID, p_days INTEGER DEFAULT 7)
RETURNS TABLE(total_spend BIGINT, total_impressions BIGINT, total_clicks BIGINT, avg_ctr DECIMAL, avg_cpc DECIMAL, avg_roas DECIMAL, total_conversions BIGINT, total_revenue BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(i.spend),0)::BIGINT,
    COALESCE(SUM(i.impressions),0)::BIGINT,
    COALESCE(SUM(i.clicks),0)::BIGINT,
    CASE WHEN SUM(i.impressions) > 0 THEN ROUND((SUM(i.clicks)::DECIMAL / SUM(i.impressions)) * 100, 2) ELSE 0 END,
    CASE WHEN SUM(i.clicks) > 0 THEN ROUND(SUM(i.spend)::DECIMAL / SUM(i.clicks), 0) ELSE 0 END,
    CASE WHEN SUM(i.spend) > 0 THEN ROUND(SUM(i.conversion_value)::DECIMAL / SUM(i.spend), 2) ELSE 0 END,
    COALESCE(SUM(i.conversions),0)::BIGINT,
    COALESCE(SUM(i.conversion_value),0)::BIGINT
  FROM ads_insights_daily i JOIN ads_campaigns c ON c.id = i.campaign_id
  WHERE c.user_id = p_user_id AND i.date >= CURRENT_DATE - p_days;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 005: CRM
-- ============================================================

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  job_title TEXT,
  avatar_url TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','qualified','negotiating','converted','lost')),
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','form','import','social','ads','referral','organic')),
  score INTEGER NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  tags TEXT[] DEFAULT '{}',
  custom_fields JSONB DEFAULT '{}',
  last_activity TIMESTAMPTZ,
  converted_at TIMESTAMPTZ,
  lost_reason TEXT,
  assigned_to UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "leads_owner" ON leads;
CREATE POLICY "leads_owner" ON leads USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_leads_user_id  ON leads(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_status   ON leads(user_id, status);
CREATE INDEX IF NOT EXISTS idx_leads_source   ON leads(user_id, source);
CREATE INDEX IF NOT EXISTS idx_leads_score    ON leads(user_id, score DESC);
CREATE INDEX IF NOT EXISTS idx_leads_created  ON leads(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_tags     ON leads USING gin(tags);

CREATE TABLE IF NOT EXISTS lead_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('note','email','call','meeting','status_change','score_change','tag_added','tag_removed','sequence_enrolled','sequence_completed','form_submitted','link_clicked','ad_clicked')),
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  occurred_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lead_activities_owner" ON lead_activities;
CREATE POLICY "lead_activities_owner" ON lead_activities USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_lead_activities_lead ON lead_activities(lead_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_activities_user ON lead_activities(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS lead_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  filters JSONB NOT NULL DEFAULT '{"conditions":[],"logic":"AND"}',
  lead_count INTEGER DEFAULT 0,
  last_synced TIMESTAMPTZ,
  auto_tag TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE lead_segments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lead_segments_owner" ON lead_segments;
CREATE POLICY "lead_segments_owner" ON lead_segments USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_lead_segments_user ON lead_segments(user_id);

CREATE TABLE IF NOT EXISTS email_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','paused','archived')),
  steps JSONB NOT NULL DEFAULT '[]',
  trigger_type TEXT DEFAULT 'manual',
  trigger_value TEXT,
  total_enrolled INTEGER DEFAULT 0,
  total_completed INTEGER DEFAULT 0,
  total_replied INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE email_sequences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "email_sequences_owner" ON email_sequences;
CREATE POLICY "email_sequences_owner" ON email_sequences USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_email_sequences_user ON email_sequences(user_id);

CREATE TABLE IF NOT EXISTS sequence_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID NOT NULL REFERENCES email_sequences(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','completed','unsubscribed','bounced')),
  current_step INTEGER NOT NULL DEFAULT 0,
  next_send_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (sequence_id, lead_id)
);

ALTER TABLE sequence_enrollments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sequence_enrollments_owner" ON sequence_enrollments;
CREATE POLICY "sequence_enrollments_owner" ON sequence_enrollments USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_sequence_enrollments_lead     ON sequence_enrollments(lead_id);
CREATE INDEX IF NOT EXISTS idx_sequence_enrollments_sequence ON sequence_enrollments(sequence_id);
CREATE INDEX IF NOT EXISTS idx_sequence_enrollments_next     ON sequence_enrollments(next_send_at) WHERE status = 'active';

CREATE TABLE IF NOT EXISTS lead_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  fields JSONB NOT NULL DEFAULT '[]',
  redirect_url TEXT,
  success_message TEXT DEFAULT 'Terima kasih! Kami akan segera menghubungi Anda.',
  auto_tag TEXT,
  sequence_id UUID REFERENCES email_sequences(id),
  views INTEGER DEFAULT 0,
  submissions INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE lead_forms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lead_forms_owner" ON lead_forms;
CREATE POLICY "lead_forms_owner" ON lead_forms USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_lead_forms_user ON lead_forms(user_id);

CREATE OR REPLACE FUNCTION get_crm_overview(p_user_id UUID) RETURNS JSON AS $$
DECLARE v_result JSON;
BEGIN
  SELECT json_build_object('total_leads', COUNT(*), 'new_leads', COUNT(*) FILTER (WHERE status = 'new'), 'contacted', COUNT(*) FILTER (WHERE status = 'contacted'), 'qualified', COUNT(*) FILTER (WHERE status = 'qualified'), 'converted', COUNT(*) FILTER (WHERE status = 'converted'), 'lost', COUNT(*) FILTER (WHERE status = 'lost'), 'avg_score', ROUND(AVG(score)), 'conversion_rate', ROUND((COUNT(*) FILTER (WHERE status = 'converted')::FLOAT / NULLIF(COUNT(*), 0)) * 100, 1), 'leads_today', COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE), 'leads_this_week', COUNT(*) FILTER (WHERE created_at >= date_trunc('week', NOW())))
  INTO v_result FROM leads WHERE user_id = p_user_id;
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_lead_score() RETURNS TRIGGER AS $$
DECLARE v_score INTEGER;
BEGIN
  SELECT LEAST(100, 10 + (COUNT(*) FILTER (WHERE type = 'email') * 5) + (COUNT(*) FILTER (WHERE type = 'call') * 10) + (COUNT(*) FILTER (WHERE type = 'meeting') * 15) + (COUNT(*) FILTER (WHERE type = 'form_submitted') * 20) + (COUNT(*) FILTER (WHERE type = 'link_clicked') * 3) + (COUNT(*) FILTER (WHERE type = 'ad_clicked') * 5)) INTO v_score FROM lead_activities WHERE lead_id = NEW.lead_id;
  UPDATE leads SET score = v_score, last_activity = NOW(), updated_at = NOW() WHERE id = NEW.lead_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_update_lead_score ON lead_activities;
CREATE TRIGGER trg_update_lead_score AFTER INSERT ON lead_activities FOR EACH ROW EXECUTE FUNCTION update_lead_score();

CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_leads_updated_at    ON leads;
DROP TRIGGER IF EXISTS trg_segments_updated_at ON lead_segments;
DROP TRIGGER IF EXISTS trg_sequences_updated_at ON email_sequences;
DROP TRIGGER IF EXISTS trg_forms_updated_at    ON lead_forms;
CREATE TRIGGER trg_leads_updated_at     BEFORE UPDATE ON leads           FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_segments_updated_at  BEFORE UPDATE ON lead_segments   FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_sequences_updated_at BEFORE UPDATE ON email_sequences FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_forms_updated_at     BEFORE UPDATE ON lead_forms      FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ============================================================
-- 006: TESTIMONIALS
-- ============================================================

CREATE TABLE IF NOT EXISTS testimonial_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#6366f1',
  bg_color TEXT DEFAULT '#ffffff',
  ask_rating BOOLEAN DEFAULT TRUE,
  ask_company BOOLEAN DEFAULT TRUE,
  ask_role BOOLEAN DEFAULT TRUE,
  ask_media BOOLEAN DEFAULT FALSE,
  max_chars INTEGER DEFAULT 500,
  product_options TEXT[],
  headline TEXT DEFAULT 'Bagikan Pengalamanmu!',
  subheadline TEXT DEFAULT 'Testimoni kamu sangat berarti bagi kami.',
  success_message TEXT DEFAULT 'Terima kasih! Testimoni kamu sudah kami terima.',
  cta_text TEXT DEFAULT 'Kirim Testimoni',
  redirect_url TEXT,
  auto_approve BOOLEAN DEFAULT FALSE,
  views INTEGER DEFAULT 0,
  submissions INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE testimonial_forms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "testimonial_forms_owner" ON testimonial_forms;
CREATE POLICY "testimonial_forms_owner" ON testimonial_forms USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_testimonial_forms_user ON testimonial_forms(user_id);

CREATE TABLE IF NOT EXISTS testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  company TEXT,
  role TEXT,
  avatar_url TEXT,
  content TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  media_url TEXT,
  media_type TEXT CHECK (media_type IN ('image','video')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','archived')),
  source TEXT NOT NULL DEFAULT 'form' CHECK (source IN ('form','manual','import','social','google','linkedin')),
  tags TEXT[] DEFAULT '{}',
  product TEXT,
  is_featured BOOLEAN DEFAULT FALSE,
  display_order INTEGER DEFAULT 0,
  form_id UUID REFERENCES testimonial_forms(id) ON DELETE SET NULL,
  ip_address INET,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  reject_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "testimonials_owner" ON testimonials;
CREATE POLICY "testimonials_owner" ON testimonials USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_testimonials_user     ON testimonials(user_id);
CREATE INDEX IF NOT EXISTS idx_testimonials_status   ON testimonials(user_id, status);
CREATE INDEX IF NOT EXISTS idx_testimonials_featured ON testimonials(user_id, is_featured) WHERE is_featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_testimonials_rating   ON testimonials(user_id, rating DESC);

CREATE TABLE IF NOT EXISTS testimonial_widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  layout TEXT DEFAULT 'grid' CHECK (layout IN ('grid','carousel','list','masonry','single')),
  theme TEXT DEFAULT 'light' CHECK (theme IN ('light','dark','custom')),
  primary_color TEXT DEFAULT '#6366f1',
  filter_status TEXT DEFAULT 'approved',
  filter_tags TEXT[],
  filter_rating INTEGER,
  show_featured_only BOOLEAN DEFAULT FALSE,
  max_items INTEGER DEFAULT 9,
  show_avatar BOOLEAN DEFAULT TRUE,
  show_rating BOOLEAN DEFAULT TRUE,
  show_company BOOLEAN DEFAULT TRUE,
  show_date BOOLEAN DEFAULT FALSE,
  card_shadow BOOLEAN DEFAULT TRUE,
  embed_key TEXT UNIQUE DEFAULT gen_random_uuid()::TEXT,
  allowed_domains TEXT[],
  total_views INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE testimonial_widgets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "testimonial_widgets_owner" ON testimonial_widgets;
CREATE POLICY "testimonial_widgets_owner" ON testimonial_widgets USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_testimonial_widgets_user  ON testimonial_widgets(user_id);
CREATE INDEX IF NOT EXISTS idx_testimonial_widgets_embed ON testimonial_widgets(embed_key);

CREATE TABLE IF NOT EXISTS testimonial_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  form_id UUID REFERENCES testimonial_forms(id) ON DELETE SET NULL,
  recipient_name TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  subject TEXT DEFAULT 'Kami sangat menghargai pendapatmu!',
  message TEXT,
  status TEXT DEFAULT 'sent' CHECK (status IN ('draft','sent','opened','submitted','expired')),
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  unique_token TEXT UNIQUE DEFAULT gen_random_uuid()::TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE testimonial_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "testimonial_requests_owner" ON testimonial_requests;
CREATE POLICY "testimonial_requests_owner" ON testimonial_requests USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_testimonial_requests_user ON testimonial_requests(user_id);

CREATE OR REPLACE FUNCTION get_testimonials_overview(p_user_id UUID) RETURNS JSON AS $$
DECLARE v_result JSON;
BEGIN
  SELECT json_build_object('total', COUNT(*), 'pending', COUNT(*) FILTER (WHERE status = 'pending'), 'approved', COUNT(*) FILTER (WHERE status = 'approved'), 'rejected', COUNT(*) FILTER (WHERE status = 'rejected'), 'featured', COUNT(*) FILTER (WHERE is_featured = TRUE), 'avg_rating', ROUND(AVG(rating), 1), 'five_star', COUNT(*) FILTER (WHERE rating = 5), 'with_media', COUNT(*) FILTER (WHERE media_url IS NOT NULL))
  INTO v_result FROM testimonials WHERE user_id = p_user_id;
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION touch_testimonial_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_testimonials_updated_at      ON testimonials;
DROP TRIGGER IF EXISTS trg_testimonial_forms_updated_at ON testimonial_forms;
DROP TRIGGER IF EXISTS trg_testimonial_widgets_updated_at ON testimonial_widgets;
CREATE TRIGGER trg_testimonials_updated_at        BEFORE UPDATE ON testimonials        FOR EACH ROW EXECUTE FUNCTION touch_testimonial_updated_at();
CREATE TRIGGER trg_testimonial_forms_updated_at   BEFORE UPDATE ON testimonial_forms   FOR EACH ROW EXECUTE FUNCTION touch_testimonial_updated_at();
CREATE TRIGGER trg_testimonial_widgets_updated_at BEFORE UPDATE ON testimonial_widgets FOR EACH ROW EXECUTE FUNCTION touch_testimonial_updated_at();

-- ============================================================
-- 007: ANALYTICS & BILLING
-- ============================================================

CREATE TABLE IF NOT EXISTS subscription_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price_monthly NUMERIC NOT NULL,
  price_yearly NUMERIC NOT NULL,
  currency TEXT DEFAULT 'IDR',
  ai_credits_monthly INTEGER,
  content_storage_gb INTEGER,
  max_leads INTEGER,
  max_connected_accs INTEGER,
  max_team_members INTEGER,
  max_ab_tests INTEGER,
  features JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0
);

INSERT INTO subscription_plans VALUES
  ('free',       'Free',       'Untuk memulai',         0,       0,       'IDR', 50,   1,   100,  2,  1,  2,  '{"auto_publish":false,"ads_manager":false,"crm":false,"competitor_spy":false,"testimonials":true,"analytics_basic":true}', true, 0),
  ('pro',        'Pro',        'Untuk kreator serius',  199000,  1990000, 'IDR', 500,  5,   1000, 5,  1,  10, '{"auto_publish":true,"ads_manager":true,"crm":true,"competitor_spy":true,"testimonials":true,"analytics_basic":true,"analytics_advanced":true}', true, 1),
  ('business',   'Business',   'Untuk tim & agensi',    499000,  4990000, 'IDR', 2000, 20,  5000, 10, 5,  50, '{"auto_publish":true,"ads_manager":true,"crm":true,"competitor_spy":true,"testimonials":true,"analytics_basic":true,"analytics_advanced":true,"white_label":true,"priority_support":true}', true, 2),
  ('enterprise', 'Enterprise', 'Korporat & skala besar',0,       0,       'IDR', NULL, NULL,NULL, NULL,NULL,NULL,'{"auto_publish":true,"ads_manager":true,"crm":true,"competitor_spy":true,"testimonials":true,"analytics_basic":true,"analytics_advanced":true,"white_label":true,"priority_support":true,"dedicated_support":true,"custom_integration":true}', true, 3)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  plan_id TEXT NOT NULL REFERENCES subscription_plans(id),
  billing_cycle TEXT DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly','yearly')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active','trialing','past_due','cancelled','paused')),
  trial_ends_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ DEFAULT NOW(),
  current_period_end TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 month'),
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  payment_method TEXT,
  external_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_subscriptions_self" ON user_subscriptions;
CREATE POLICY "user_subscriptions_self" ON user_subscriptions USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user ON user_subscriptions(user_id);

CREATE TABLE IF NOT EXISTS usage_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  metric TEXT NOT NULL,
  value NUMERIC NOT NULL DEFAULT 0,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, metric, period_start)
);

ALTER TABLE usage_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "usage_records_self" ON usage_records;
CREATE POLICY "usage_records_self" ON usage_records USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_usage_records_user ON usage_records(user_id, period_start DESC);

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_number TEXT UNIQUE NOT NULL,
  plan_id TEXT REFERENCES subscription_plans(id),
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'IDR',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','paid','failed','refunded','void')),
  billing_cycle TEXT,
  period_start DATE,
  period_end DATE,
  paid_at TIMESTAMPTZ,
  due_date DATE,
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "invoices_self" ON invoices;
CREATE POLICY "invoices_self" ON invoices USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user ON invoices(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS analytics_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  metric TEXT NOT NULL,
  target_value NUMERIC NOT NULL,
  current_value NUMERIC DEFAULT 0,
  period TEXT NOT NULL DEFAULT 'monthly' CHECK (period IN ('weekly','monthly','quarterly','yearly')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','achieved','missed','cancelled')),
  color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE analytics_goals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "analytics_goals_owner" ON analytics_goals;
CREATE POLICY "analytics_goals_owner" ON analytics_goals USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_goals_user ON analytics_goals(user_id);

DROP TRIGGER IF EXISTS trg_goals_updated_at         ON analytics_goals;
DROP TRIGGER IF EXISTS trg_subscriptions_updated_at ON user_subscriptions;
DROP TRIGGER IF EXISTS trg_usage_updated_at         ON usage_records;
CREATE TRIGGER trg_goals_updated_at         BEFORE UPDATE ON analytics_goals    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_subscriptions_updated_at BEFORE UPDATE ON user_subscriptions FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_usage_updated_at         BEFORE UPDATE ON usage_records      FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ============================================================
-- 008: MULTI-ACCOUNT SUPPORT
-- ============================================================

ALTER TABLE connected_accounts
  DROP CONSTRAINT IF EXISTS connected_accounts_user_id_platform_key,
  DROP CONSTRAINT IF EXISTS unique_user_platform;

ALTER TABLE connected_accounts
  ADD COLUMN IF NOT EXISTS account_label TEXT,
  ADD COLUMN IF NOT EXISTS account_order INT DEFAULT 0;

ALTER TABLE connected_accounts
  DROP CONSTRAINT IF EXISTS unique_user_platform_username;
ALTER TABLE connected_accounts
  ADD CONSTRAINT unique_user_platform_username
    UNIQUE (user_id, platform, platform_username);

CREATE INDEX IF NOT EXISTS idx_connected_accounts_user_platform
  ON connected_accounts (user_id, platform, status);

UPDATE connected_accounts
SET account_label = REPLACE(platform_username, '@', '')
WHERE account_label IS NULL AND platform_username IS NOT NULL;

ALTER TABLE publish_history
  ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES connected_accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS platform_username TEXT;

-- ============================================================
-- SELESAI ✅
-- ============================================================
