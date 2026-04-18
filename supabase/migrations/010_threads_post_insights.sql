-- ============================================
-- Threads: snapshot insight per postingan (Media Insights API)
-- ============================================

CREATE TABLE threads_post_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connected_account_id UUID NOT NULL REFERENCES connected_accounts(id) ON DELETE CASCADE,
  platform_post_id TEXT NOT NULL,
  post_text TEXT,
  permalink TEXT,
  link_attachment_url TEXT,
  media_type TEXT,
  metrics JSONB NOT NULL DEFAULT '{}',
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT threads_post_insights_account_post UNIQUE (connected_account_id, platform_post_id)
);

CREATE INDEX idx_threads_post_insights_user_fetched ON threads_post_insights(user_id, fetched_at DESC);

ALTER TABLE threads_post_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "threads_post_insights_select" ON threads_post_insights
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "threads_post_insights_insert" ON threads_post_insights
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "threads_post_insights_update" ON threads_post_insights
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "threads_post_insights_delete" ON threads_post_insights
  FOR DELETE USING (auth.uid() = user_id);
