-- ============================================
-- Karaya Marketing Suite - Phase 2: Auto-Publisher
-- Sprint 7-8
-- ============================================

-- Connected Accounts (OAuth tokens per platform)
CREATE TABLE connected_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('instagram','threads','twitter','tiktok','youtube','facebook')),
  platform_user_id TEXT NOT NULL,
  platform_username TEXT,
  platform_avatar_url TEXT,
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT,
  token_expires_at TIMESTAMPTZ,
  scopes TEXT[],
  status TEXT DEFAULT 'active' CHECK (status IN ('active','expired','needs_reconnect','disconnected')),
  metadata JSONB DEFAULT '{}',
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  last_sync_at TIMESTAMPTZ,
  UNIQUE(user_id, platform)
);

-- Publish History
CREATE TABLE publish_history (
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

CREATE INDEX idx_publish_history_user ON publish_history(user_id, created_at DESC);
CREATE INDEX idx_publish_history_status ON publish_history(status, scheduled_at);

-- Publish Queue (retry mechanism)
CREATE TABLE publish_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  publish_history_id UUID REFERENCES publish_history(id) ON DELETE CASCADE,
  next_retry_at TIMESTAMPTZ NOT NULL,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_publish_queue_retry ON publish_queue(status, next_retry_at);

-- ============================================
-- Row Level Security
-- ============================================

ALTER TABLE connected_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE publish_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE publish_queue ENABLE ROW LEVEL SECURITY;

-- Connected Accounts
CREATE POLICY "Users can view own accounts" ON connected_accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create accounts" ON connected_accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own accounts" ON connected_accounts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own accounts" ON connected_accounts FOR DELETE USING (auth.uid() = user_id);

-- Publish History
CREATE POLICY "Users can view own publish history" ON publish_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create publish history" ON publish_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own publish history" ON publish_history FOR UPDATE USING (auth.uid() = user_id);

-- Publish Queue (linked via publish_history ownership)
CREATE POLICY "Users can view own queue" ON publish_queue FOR SELECT USING (
  EXISTS (SELECT 1 FROM publish_history ph WHERE ph.id = publish_queue.publish_history_id AND ph.user_id = auth.uid())
);
CREATE POLICY "Users can create queue items" ON publish_queue FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM publish_history ph WHERE ph.id = publish_queue.publish_history_id AND ph.user_id = auth.uid())
);
CREATE POLICY "Users can update own queue" ON publish_queue FOR UPDATE USING (
  EXISTS (SELECT 1 FROM publish_history ph WHERE ph.id = publish_queue.publish_history_id AND ph.user_id = auth.uid())
);

-- ============================================
-- Helper Functions
-- ============================================

-- Get active token for a platform (used by Edge Functions)
CREATE OR REPLACE FUNCTION get_platform_token(p_user_id UUID, p_platform TEXT)
RETURNS TABLE(access_token_encrypted TEXT, platform_user_id TEXT, metadata JSONB) AS $$
BEGIN
  RETURN QUERY
  SELECT ca.access_token_encrypted, ca.platform_user_id, ca.metadata
  FROM connected_accounts ca
  WHERE ca.user_id = p_user_id
    AND ca.platform = p_platform
    AND ca.status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get scheduled content ready to publish
CREATE OR REPLACE FUNCTION get_publishable_content()
RETURNS TABLE(
  content_id UUID,
  user_id UUID,
  brand_id UUID,
  title TEXT,
  body TEXT,
  type TEXT,
  platform TEXT,
  hashtags TEXT[],
  media_urls TEXT[],
  scheduled_date DATE,
  scheduled_time TIME
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cc.id, cc.user_id, cc.brand_id, cc.title, cc.body,
    cc.type, cc.platform, cc.hashtags, cc.media_urls,
    cc.scheduled_date, cc.scheduled_time
  FROM content_calendar cc
  WHERE cc.status = 'scheduled'
    AND cc.scheduled_date = CURRENT_DATE
    AND cc.scheduled_time <= CURRENT_TIME
    AND NOT EXISTS (
      SELECT 1 FROM publish_history ph
      WHERE ph.content_id = cc.id
        AND ph.platform = cc.platform
        AND ph.status IN ('published', 'publishing')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
