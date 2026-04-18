-- ============================================
-- Karaya Marketing Suite - Phase 2: Ads Manager + Competitor Spy
-- Sprint 9-10
-- ============================================

-- Ads Campaigns
CREATE TABLE ads_campaigns (
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

CREATE INDEX idx_ads_campaigns_user ON ads_campaigns(user_id, status);

-- Ad Creatives
CREATE TABLE ad_creatives (
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

-- Ads Insights (synced daily)
CREATE TABLE ads_insights_daily (
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

CREATE INDEX idx_ads_insights_campaign ON ads_insights_daily(campaign_id, date);

-- Saved Audiences
CREATE TABLE saved_audiences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  targeting JSONB NOT NULL,
  estimated_reach TEXT,
  used_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Budget Alerts
CREATE TABLE budget_alerts (
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

-- Competitor Swipe File
CREATE TABLE competitor_ads (
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

-- ============================================
-- Row Level Security
-- ============================================

ALTER TABLE ads_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_creatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE ads_insights_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_audiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_ads ENABLE ROW LEVEL SECURITY;

-- Campaigns
CREATE POLICY "Users can view own campaigns" ON ads_campaigns FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create campaigns" ON ads_campaigns FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own campaigns" ON ads_campaigns FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own campaigns" ON ads_campaigns FOR DELETE USING (auth.uid() = user_id);

-- Creatives
CREATE POLICY "Users can view own creatives" ON ad_creatives FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create creatives" ON ad_creatives FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own creatives" ON ad_creatives FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own creatives" ON ad_creatives FOR DELETE USING (auth.uid() = user_id);

-- Insights (read via campaign ownership)
CREATE POLICY "Users can view own insights" ON ads_insights_daily FOR SELECT USING (
  EXISTS (SELECT 1 FROM ads_campaigns c WHERE c.id = ads_insights_daily.campaign_id AND c.user_id = auth.uid())
);
CREATE POLICY "Users can insert insights" ON ads_insights_daily FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM ads_campaigns c WHERE c.id = ads_insights_daily.campaign_id AND c.user_id = auth.uid())
);

-- Saved Audiences
CREATE POLICY "Users can view own audiences" ON saved_audiences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create audiences" ON saved_audiences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own audiences" ON saved_audiences FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own audiences" ON saved_audiences FOR DELETE USING (auth.uid() = user_id);

-- Budget Alerts
CREATE POLICY "Users can view own alerts" ON budget_alerts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create alerts" ON budget_alerts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own alerts" ON budget_alerts FOR UPDATE USING (auth.uid() = user_id);

-- Competitor Ads
CREATE POLICY "Users can view own competitor ads" ON competitor_ads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create competitor ads" ON competitor_ads FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own competitor ads" ON competitor_ads FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own competitor ads" ON competitor_ads FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- Helper: Get campaign overview stats
-- ============================================
CREATE OR REPLACE FUNCTION get_ads_overview(p_user_id UUID, p_days INTEGER DEFAULT 7)
RETURNS TABLE(
  total_spend BIGINT,
  total_impressions BIGINT,
  total_clicks BIGINT,
  avg_ctr DECIMAL,
  avg_cpc DECIMAL,
  avg_roas DECIMAL,
  total_conversions BIGINT,
  total_revenue BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(i.spend), 0)::BIGINT,
    COALESCE(SUM(i.impressions), 0)::BIGINT,
    COALESCE(SUM(i.clicks), 0)::BIGINT,
    CASE WHEN SUM(i.impressions) > 0 THEN ROUND((SUM(i.clicks)::DECIMAL / SUM(i.impressions)) * 100, 2) ELSE 0 END,
    CASE WHEN SUM(i.clicks) > 0 THEN ROUND(SUM(i.spend)::DECIMAL / SUM(i.clicks), 0) ELSE 0 END,
    CASE WHEN SUM(i.spend) > 0 THEN ROUND(SUM(i.conversion_value)::DECIMAL / SUM(i.spend), 2) ELSE 0 END,
    COALESCE(SUM(i.conversions), 0)::BIGINT,
    COALESCE(SUM(i.conversion_value), 0)::BIGINT
  FROM ads_insights_daily i
  JOIN ads_campaigns c ON c.id = i.campaign_id
  WHERE c.user_id = p_user_id
    AND i.date >= CURRENT_DATE - p_days;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
