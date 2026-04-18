-- ============================================================
-- Phase 2: Sprint 11-12 — CRM & Lead Management
-- ============================================================

-- 1. LEADS -------------------------------------------------
CREATE TABLE IF NOT EXISTS leads (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Basic info
  name            TEXT NOT NULL,
  email           TEXT,
  phone           TEXT,
  company         TEXT,
  job_title       TEXT,
  avatar_url      TEXT,
  -- Classification
  status          TEXT NOT NULL DEFAULT 'new'
                    CHECK (status IN ('new','contacted','qualified','negotiating','converted','lost')),
  source          TEXT NOT NULL DEFAULT 'manual'
                    CHECK (source IN ('manual','form','import','social','ads','referral','organic')),
  score           INTEGER NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  -- Enrichment
  tags            TEXT[] DEFAULT '{}',
  custom_fields   JSONB DEFAULT '{}',
  -- Tracking
  last_activity   TIMESTAMPTZ,
  converted_at    TIMESTAMPTZ,
  lost_reason     TEXT,
  -- Relationships
  assigned_to     UUID REFERENCES auth.users(id),
  content_id      UUID REFERENCES generated_content(id),  -- from which content they came
  -- Timestamps
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leads_owner" ON leads USING (auth.uid() = user_id);

CREATE INDEX idx_leads_user_id ON leads(user_id);
CREATE INDEX idx_leads_status ON leads(user_id, status);
CREATE INDEX idx_leads_source ON leads(user_id, source);
CREATE INDEX idx_leads_score ON leads(user_id, score DESC);
CREATE INDEX idx_leads_created ON leads(user_id, created_at DESC);
CREATE INDEX idx_leads_tags ON leads USING gin(tags);

-- 2. LEAD ACTIVITIES ---------------------------------------
CREATE TABLE IF NOT EXISTS lead_activities (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id     UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL
                CHECK (type IN ('note','email','call','meeting','status_change','score_change','tag_added','tag_removed','sequence_enrolled','sequence_completed','form_submitted','link_clicked','ad_clicked')),
  title       TEXT NOT NULL,
  description TEXT,
  metadata    JSONB DEFAULT '{}',
  occurred_at TIMESTAMPTZ DEFAULT NOW(),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lead_activities_owner" ON lead_activities USING (auth.uid() = user_id);

CREATE INDEX idx_lead_activities_lead ON lead_activities(lead_id, occurred_at DESC);
CREATE INDEX idx_lead_activities_user ON lead_activities(user_id, created_at DESC);

-- 3. LEAD SEGMENTS -----------------------------------------
CREATE TABLE IF NOT EXISTS lead_segments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  -- Dynamic filter as JSONB: { conditions: [{field, operator, value}], logic: 'AND'|'OR' }
  filters     JSONB NOT NULL DEFAULT '{"conditions":[],"logic":"AND"}',
  -- Cached count (refreshed on demand)
  lead_count  INTEGER DEFAULT 0,
  last_synced TIMESTAMPTZ,
  -- Auto-tagging when lead enters segment
  auto_tag    TEXT,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE lead_segments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lead_segments_owner" ON lead_segments USING (auth.uid() = user_id);

CREATE INDEX idx_lead_segments_user ON lead_segments(user_id);

-- 4. EMAIL SEQUENCES ---------------------------------------
CREATE TABLE IF NOT EXISTS email_sequences (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  status      TEXT NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft','active','paused','archived')),
  -- Array of step objects: { delay_days, subject, body, from_name, reply_to }
  steps       JSONB NOT NULL DEFAULT '[]',
  -- Trigger: manual | tag_added | status_change | form_submitted
  trigger_type TEXT DEFAULT 'manual',
  trigger_value TEXT,  -- e.g. tag name or status value
  -- Stats
  total_enrolled  INTEGER DEFAULT 0,
  total_completed INTEGER DEFAULT 0,
  total_replied   INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE email_sequences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "email_sequences_owner" ON email_sequences USING (auth.uid() = user_id);

CREATE INDEX idx_email_sequences_user ON email_sequences(user_id);

-- 5. SEQUENCE ENROLLMENTS ----------------------------------
CREATE TABLE IF NOT EXISTS sequence_enrollments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id   UUID NOT NULL REFERENCES email_sequences(id) ON DELETE CASCADE,
  lead_id       UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active','paused','completed','unsubscribed','bounced')),
  current_step  INTEGER NOT NULL DEFAULT 0,
  next_send_at  TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (sequence_id, lead_id)
);

ALTER TABLE sequence_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sequence_enrollments_owner" ON sequence_enrollments USING (auth.uid() = user_id);

CREATE INDEX idx_sequence_enrollments_lead ON sequence_enrollments(lead_id);
CREATE INDEX idx_sequence_enrollments_sequence ON sequence_enrollments(sequence_id);
CREATE INDEX idx_sequence_enrollments_next_send ON sequence_enrollments(next_send_at) WHERE status = 'active';

-- 6. LEAD FORMS (embed on website) -------------------------
CREATE TABLE IF NOT EXISTS lead_forms (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  -- Fields config: [{ name, label, type, required, options }]
  fields        JSONB NOT NULL DEFAULT '[]',
  -- Actions on submit
  redirect_url  TEXT,
  success_message TEXT DEFAULT 'Terima kasih! Kami akan segera menghubungi Anda.',
  auto_tag      TEXT,
  sequence_id   UUID REFERENCES email_sequences(id),
  -- Stats
  views         INTEGER DEFAULT 0,
  submissions   INTEGER DEFAULT 0,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE lead_forms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lead_forms_owner" ON lead_forms USING (auth.uid() = user_id);

CREATE INDEX idx_lead_forms_user ON lead_forms(user_id);

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Get CRM overview stats
CREATE OR REPLACE FUNCTION get_crm_overview(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
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

-- Auto-update lead score based on activities
CREATE OR REPLACE FUNCTION update_lead_score()
RETURNS TRIGGER AS $$
DECLARE
  v_score INTEGER;
BEGIN
  SELECT
    LEAST(100,
      -- Base score
      10
      -- Activity bonuses
      + (COUNT(*) FILTER (WHERE type = 'email') * 5)
      + (COUNT(*) FILTER (WHERE type = 'call') * 10)
      + (COUNT(*) FILTER (WHERE type = 'meeting') * 15)
      + (COUNT(*) FILTER (WHERE type = 'form_submitted') * 20)
      + (COUNT(*) FILTER (WHERE type = 'link_clicked') * 3)
      + (COUNT(*) FILTER (WHERE type = 'ad_clicked') * 5)
    )
  INTO v_score
  FROM lead_activities
  WHERE lead_id = NEW.lead_id;

  UPDATE leads SET score = v_score, last_activity = NOW(), updated_at = NOW()
  WHERE id = NEW.lead_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_update_lead_score
  AFTER INSERT ON lead_activities
  FOR EACH ROW EXECUTE FUNCTION update_lead_score();

-- Update updated_at timestamps
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_leads_updated_at BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_segments_updated_at BEFORE UPDATE ON lead_segments
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_sequences_updated_at BEFORE UPDATE ON email_sequences
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_forms_updated_at BEFORE UPDATE ON lead_forms
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
