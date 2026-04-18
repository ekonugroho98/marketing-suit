-- ============================================================
-- Phase 2: Sprint 12 — Testimonial Collector
-- ============================================================

-- 1. TESTIMONIALS ------------------------------------------
CREATE TABLE IF NOT EXISTS testimonials (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Submitter info
  name          TEXT NOT NULL,
  email         TEXT,
  company       TEXT,
  role          TEXT,            -- e.g. "CEO", "Marketing Manager"
  avatar_url    TEXT,
  -- Content
  content       TEXT NOT NULL,
  rating        INTEGER CHECK (rating >= 1 AND rating <= 5),
  -- Media (optional image/video uploaded by submitter)
  media_url     TEXT,
  media_type    TEXT CHECK (media_type IN ('image','video')),
  -- Classification
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','approved','rejected','archived')),
  source        TEXT NOT NULL DEFAULT 'form'
                  CHECK (source IN ('form','manual','import','social','google','linkedin')),
  tags          TEXT[] DEFAULT '{}',
  product       TEXT,            -- which product/service this is about
  -- Display
  is_featured   BOOLEAN DEFAULT FALSE,
  display_order INTEGER DEFAULT 0,
  -- Meta
  form_id       UUID,            -- which form was used to collect (FK added below)
  ip_address    INET,
  submitted_at  TIMESTAMPTZ DEFAULT NOW(),
  approved_at   TIMESTAMPTZ,
  rejected_at   TIMESTAMPTZ,
  reject_reason TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "testimonials_owner" ON testimonials USING (auth.uid() = user_id);

CREATE INDEX idx_testimonials_user ON testimonials(user_id);
CREATE INDEX idx_testimonials_status ON testimonials(user_id, status);
CREATE INDEX idx_testimonials_featured ON testimonials(user_id, is_featured) WHERE is_featured = TRUE;
CREATE INDEX idx_testimonials_rating ON testimonials(user_id, rating DESC);

-- 2. TESTIMONIAL COLLECTION FORMS --------------------------
CREATE TABLE IF NOT EXISTS testimonial_forms (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  -- Branding
  logo_url        TEXT,
  primary_color   TEXT DEFAULT '#6366f1',
  bg_color        TEXT DEFAULT '#ffffff',
  -- Form config
  ask_rating      BOOLEAN DEFAULT TRUE,
  ask_company     BOOLEAN DEFAULT TRUE,
  ask_role        BOOLEAN DEFAULT TRUE,
  ask_media       BOOLEAN DEFAULT FALSE,
  max_chars       INTEGER DEFAULT 500,
  product_options TEXT[],       -- dropdown options for "which product"
  -- Messaging
  headline        TEXT DEFAULT 'Bagikan Pengalamanmu!',
  subheadline     TEXT DEFAULT 'Testimoni kamu sangat berarti bagi kami.',
  success_message TEXT DEFAULT 'Terima kasih! Testimoni kamu sudah kami terima.',
  cta_text        TEXT DEFAULT 'Kirim Testimoni',
  -- Post-submit
  redirect_url    TEXT,
  auto_approve    BOOLEAN DEFAULT FALSE,
  -- Stats
  views           INTEGER DEFAULT 0,
  submissions     INTEGER DEFAULT 0,
  -- Status
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE testimonial_forms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "testimonial_forms_owner" ON testimonial_forms USING (auth.uid() = user_id);

CREATE INDEX idx_testimonial_forms_user ON testimonial_forms(user_id);

-- Add FK now that both tables exist
ALTER TABLE testimonials ADD CONSTRAINT fk_testimonial_form
  FOREIGN KEY (form_id) REFERENCES testimonial_forms(id) ON DELETE SET NULL;

-- 3. TESTIMONIAL WIDGETS -----------------------------------
CREATE TABLE IF NOT EXISTS testimonial_widgets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  -- Display config
  layout        TEXT DEFAULT 'grid'
                  CHECK (layout IN ('grid','carousel','list','masonry','single')),
  theme         TEXT DEFAULT 'light' CHECK (theme IN ('light','dark','custom')),
  primary_color TEXT DEFAULT '#6366f1',
  -- Filter config (which testimonials to show)
  filter_status TEXT DEFAULT 'approved',
  filter_tags   TEXT[],
  filter_rating INTEGER,        -- minimum rating
  show_featured_only BOOLEAN DEFAULT FALSE,
  max_items     INTEGER DEFAULT 9,
  -- Style options
  show_avatar   BOOLEAN DEFAULT TRUE,
  show_rating   BOOLEAN DEFAULT TRUE,
  show_company  BOOLEAN DEFAULT TRUE,
  show_date     BOOLEAN DEFAULT FALSE,
  card_shadow   BOOLEAN DEFAULT TRUE,
  -- Embed
  embed_key     TEXT UNIQUE DEFAULT gen_random_uuid()::TEXT,
  allowed_domains TEXT[],
  total_views   INTEGER DEFAULT 0,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE testimonial_widgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "testimonial_widgets_owner" ON testimonial_widgets USING (auth.uid() = user_id);

CREATE INDEX idx_testimonial_widgets_user ON testimonial_widgets(user_id);
CREATE INDEX idx_testimonial_widgets_embed ON testimonial_widgets(embed_key);

-- 4. TESTIMONIAL REQUESTS (ask via email) ------------------
CREATE TABLE IF NOT EXISTS testimonial_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  form_id       UUID REFERENCES testimonial_forms(id) ON DELETE SET NULL,
  -- Recipient
  recipient_name  TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  -- Message
  subject       TEXT DEFAULT 'Kami sangat menghargai pendapatmu!',
  message       TEXT,
  -- Status tracking
  status        TEXT DEFAULT 'sent' CHECK (status IN ('draft','sent','opened','submitted','expired')),
  sent_at       TIMESTAMPTZ,
  opened_at     TIMESTAMPTZ,
  submitted_at  TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ,
  -- Link
  unique_token  TEXT UNIQUE DEFAULT gen_random_uuid()::TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE testimonial_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "testimonial_requests_owner" ON testimonial_requests USING (auth.uid() = user_id);

CREATE INDEX idx_testimonial_requests_user ON testimonial_requests(user_id);

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Overview stats
CREATE OR REPLACE FUNCTION get_testimonials_overview(p_user_id UUID)
RETURNS JSON AS $$
DECLARE v_result JSON;
BEGIN
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

-- Auto touch updated_at
CREATE OR REPLACE FUNCTION touch_testimonial_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_testimonials_updated_at BEFORE UPDATE ON testimonials
  FOR EACH ROW EXECUTE FUNCTION touch_testimonial_updated_at();
CREATE TRIGGER trg_testimonial_forms_updated_at BEFORE UPDATE ON testimonial_forms
  FOR EACH ROW EXECUTE FUNCTION touch_testimonial_updated_at();
CREATE TRIGGER trg_testimonial_widgets_updated_at BEFORE UPDATE ON testimonial_widgets
  FOR EACH ROW EXECUTE FUNCTION touch_testimonial_updated_at();
