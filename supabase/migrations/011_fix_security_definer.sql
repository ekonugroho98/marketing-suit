-- ============================================================
-- Migration 011: Fix SECURITY DEFINER functions + missing RLS policies
-- Problem: Several SECURITY DEFINER functions accept p_user_id as a
--          parameter but never verify it matches auth.uid(). Because
--          SECURITY DEFINER runs with the *definer's* privileges and
--          bypasses RLS, any authenticated user can pass another
--          user's ID and read/mutate their data.
--
-- Fix:     Add an authorization guard as the first statement in every
--          affected function's BEGIN block:
--
--            IF p_user_id != auth.uid() THEN
--              RAISE EXCEPTION 'unauthorized: user mismatch';
--            END IF;
--
-- Also adds two missing RLS policies discovered during audit:
--   • ads_insights_daily — UPDATE policy
--   • budget_alerts      — DELETE policy
--
-- All statements use CREATE OR REPLACE / DROP … IF EXISTS so the
-- migration is fully idempotent.
-- ============================================================

-- ============================================================
-- 1. increment_usage  (001_phase1_schema.sql)
--    Params: p_user_id UUID, p_month DATE
-- ============================================================
CREATE OR REPLACE FUNCTION increment_usage(p_user_id UUID, p_month DATE)
RETURNS VOID AS $$
BEGIN
  -- == AUTH GUARD ==
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'unauthorized: user mismatch';
  END IF;

  INSERT INTO usage_monthly (user_id, month, generation_count, generation_limit)
  VALUES (p_user_id, p_month, 1, 50)
  ON CONFLICT (user_id, month)
  DO UPDATE SET generation_count = usage_monthly.generation_count + 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- 2. get_platform_token  (002_phase2_auto_publisher.sql)
--    Params: p_user_id UUID, p_platform TEXT
-- ================================================
CREATE OR REPLACE FUNCTION get_platform_token(p_user_id UUID, p_platform TEXT)
RETURNS TABLE(access_token_encrypted TEXT, platform_user_id TEXT, metadata JSONB) AS $$
BEGIN
  -- == AUTH GUARD ==
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'unauthorized: user mismatch';
  END IF;

  RETURN QUERY
  SELECT ca.access_token_encrypted, ca.platform_user_id, ca.metadata
  FROM connected_accounts ca
  WHERE ca.user_id = p_user_id
    AND ca.platform = p_platform
    AND ca.status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- 3. get_ads_overview  (004_phase2_ads_manager.sql)
--    Params: p_user_id UUID, p_days INTEGER DEFAULT 7
-- ============================================================
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
  -- == AUTH GUARD ==
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'unauthorized: user mismatch';
  END IF;

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


-- ============================================================
-- 4. get_crm_overview  (005_phase2_crm.sql)
--    Params: p_user_id UUID
-- ============================================================
CREATE OR REPLACE FUNCTION get_crm_overview(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  -- == AUTH GUARD ==
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'unauthorized: user mismatch';
  END IF;

  SELECT json_build_object(
    'total_leads', COUNT(*),
    'new_leads', COUNT(*) FILTER (WHERE status = 'new'),
    'contacted', COUNT(*) FILTER (WHERE status = 'contacted'),
    'qualified', COUNT(*) FILTER (WHERE status = 'qualified'),
    'converted', COUNT(*) FILTER (WHERE status = 'converted'),
    'lost', COUNT(*) FILTER (WHERE status = 'lost'),
    'avg_score', ROUND(AVG(score)),
    'conversion_rate', ROUND(
      (COUNT(*) FILTER (WHERE status = 'converted')::FLOAT / NULLIF(COUNT(*), 0)) * 100, 1
    ),
    'leads_today', COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE),
    'leads_this_week', COUNT(*) FILTER (WHERE created_at >= date_trunc('week', NOW()))
  )
  INTO v_result
  FROM leads
  WHERE user_id = p_user_id;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- 5. get_testimonials_overview  (006_phase2_testimonials.sql)
--    Params: p_user_id UUID
-- ============================================================
CREATE OR REPLACE FUNCTION get_testimonials_overview(p_user_id UUID)
RETURNS JSON AS $$
DECLARE v_result JSON;
BEGIN
  -- == AUTH GUARD ==
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'unauthorized: user mismatch';
  END IF;

  SELECT json_build_object(
    'total',     COUNT(*),
    'pending',   COUNT(*) FILTER (WHERE status = 'pending'),
    'approved',  COUNT(*) FILTER (WHERE status = 'approved'),
    'rejected',  COUNT(*) FILTER (WHERE status = 'rejected'),
    'featured',  COUNT(*) FILTER (WHERE is_featured = TRUE),
    'avg_rating', ROUND(AVG(rating), 1),
    'five_star', COUNT(*) FILTER (WHERE rating = 5),
    'with_media', COUNT(*) FILTER (WHERE media_url IS NOT NULL)
  )
  INTO v_result
  FROM testimonials WHERE user_id = p_user_id;
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- 6. get_analytics_overview  (007_phase2_analytics_billing.sql)
--    Params: p_user_id UUID, p_start DATE, p_end DATE
-- ============================================================
CREATE OR REPLACE FUNCTION get_analytics_overview(
  p_user_id UUID,
  p_start   DATE,
  p_end     DATE
) RETURNS JSON AS $$
DECLARE v_result JSON;
BEGIN
  -- == AUTH GUARD ==
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'unauthorized: user mismatch';
  END IF;

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


-- ================================================
-- 7. get_funnel_stats  (007_phase2_analytics_billing.sql)
--    Params: p_user_id UUID, p_days INTEGER DEFAULT 30
-- ============================================================
CREATE OR REPLACE FUNCTION get_funnel_stats(p_user_id UUID, p_days INTEGER DEFAULT 30)
RETURNS JSON AS $$
DECLARE v_result JSON;
BEGIN
  -- == AUTH GUARD ==
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
-- 8. Missing RLS policies (found during security audit)
-- ============================================================

-- 8a. ads_insights_daily — missing UPDATE policy
--     Needed by the daily sync Edge Function to upsert insight rows.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'ads_insights_daily'
      AND policyname = 'Users can update own insights'
  ) THEN
    CREATE POLICY "Users can update own insights" ON ads_insights_daily
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM ads_campaigns c
          WHERE c.id = ads_insights_daily.campaign_id
            AND c.user_id = auth.uid()
        )
      );
  END IF;
END
$$;

-- 8b. budget_alerts — missing DELETE policy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'budget_alerts'
      AND policyname = 'Users can delete own alerts'
  ) THEN
    CREATE POLICY "Users can delete own alerts" ON budget_alerts
      FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END
$$;
