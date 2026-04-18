-- ============================================
-- Karaya Marketing Suite - Phase 2: A/B Testing Engine
-- Sprint 8
-- ============================================

-- A/B Tests
CREATE TABLE ab_tests (
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

CREATE INDEX idx_ab_tests_user ON ab_tests(user_id, status);
CREATE INDEX idx_ab_tests_status ON ab_tests(status, end_date);

-- A/B Test Variants
CREATE TABLE ab_test_variants (
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

CREATE INDEX idx_ab_variants_test ON ab_test_variants(test_id);

-- Add variant_id to link_clicks for A/B tracking
ALTER TABLE link_clicks ADD COLUMN variant_id UUID REFERENCES ab_test_variants(id) ON DELETE SET NULL;
CREATE INDEX idx_clicks_variant ON link_clicks(variant_id);

-- ============================================
-- Row Level Security
-- ============================================

ALTER TABLE ab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_test_variants ENABLE ROW LEVEL SECURITY;

-- A/B Tests
CREATE POLICY "Users can view own tests" ON ab_tests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create tests" ON ab_tests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tests" ON ab_tests FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own tests" ON ab_tests FOR DELETE USING (auth.uid() = user_id);

-- A/B Test Variants (linked through test ownership)
CREATE POLICY "Users can view own variants" ON ab_test_variants FOR SELECT USING (
  EXISTS (SELECT 1 FROM ab_tests t WHERE t.id = ab_test_variants.test_id AND t.user_id = auth.uid())
);
CREATE POLICY "Users can create variants" ON ab_test_variants FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM ab_tests t WHERE t.id = ab_test_variants.test_id AND t.user_id = auth.uid())
);
CREATE POLICY "Users can update own variants" ON ab_test_variants FOR UPDATE USING (
  EXISTS (SELECT 1 FROM ab_tests t WHERE t.id = ab_test_variants.test_id AND t.user_id = auth.uid())
);
CREATE POLICY "Users can delete own variants" ON ab_test_variants FOR DELETE USING (
  EXISTS (SELECT 1 FROM ab_tests t WHERE t.id = ab_test_variants.test_id AND t.user_id = auth.uid())
);

-- ============================================
-- Helper Functions
-- ============================================

-- Get active A/B test for a smart link (used by redirect Edge Function)
CREATE OR REPLACE FUNCTION get_active_ab_test_for_link(p_link_id UUID)
RETURNS TABLE(
  test_id UUID,
  variant_id UUID,
  variant_name TEXT,
  destination_url TEXT,
  weight INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT t.id, v.id, v.name, v.destination_url, v.weight
  FROM ab_tests t
  JOIN ab_test_variants v ON v.test_id = t.id
  WHERE t.status = 'running'
    AND v.link_id = p_link_id
    AND (t.end_date IS NULL OR t.end_date > NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Increment variant metrics
CREATE OR REPLACE FUNCTION increment_variant_click(p_variant_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE ab_test_variants
  SET clicks = clicks + 1
  WHERE id = p_variant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_variant_impression(p_variant_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE ab_test_variants
  SET impressions = impressions + 1
  WHERE id = p_variant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_variant_conversion(p_variant_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE ab_test_variants
  SET conversions = conversions + 1
  WHERE id = p_variant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
