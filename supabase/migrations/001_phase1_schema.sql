-- ============================================
-- Karaya Marketing Suite - Phase 1 MVP Schema
-- ============================================

-- Profiles (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  onboarding_completed BOOLEAN DEFAULT false,
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free','creator','pro','agency')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Brands
CREATE TABLE brands (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  niche TEXT,
  description TEXT,
  target_audience TEXT,
  tone TEXT[],
  favorite_words TEXT[],
  avoided_words TEXT[],
  logo_url TEXT,
  primary_color TEXT DEFAULT '#10b981',
  secondary_color TEXT DEFAULT '#0d1117',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products
CREATE TABLE products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price INTEGER DEFAULT 0,
  currency TEXT DEFAULT 'IDR',
  link TEXT,
  usp TEXT,
  features TEXT[],
  images TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Generation History
CREATE TABLE generation_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('caption','carousel','ad_copy','thread','repurpose','video_script','hashtags')),
  platform TEXT,
  pillar TEXT,
  input_params JSONB NOT NULL,
  output JSONB NOT NULL,
  model TEXT DEFAULT 'llama-3.3-70b-versatile',
  tokens_used INTEGER,
  is_saved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Saved Content Library
CREATE TABLE saved_content (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  generation_id UUID REFERENCES generation_history(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  metadata JSONB,
  tags TEXT[],
  is_favorite BOOLEAN DEFAULT false,
  used_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Usage Tracking
CREATE TABLE usage_monthly (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  month DATE NOT NULL,
  generation_count INTEGER DEFAULT 0,
  generation_limit INTEGER DEFAULT 50,
  UNIQUE(user_id, month)
);

-- Increment usage function
CREATE OR REPLACE FUNCTION increment_usage(p_user_id UUID, p_month DATE)
RETURNS VOID AS $$
BEGIN
  INSERT INTO usage_monthly (user_id, month, generation_count, generation_limit)
  VALUES (p_user_id, p_month, 1, 50)
  ON CONFLICT (user_id, month)
  DO UPDATE SET generation_count = usage_monthly.generation_count + 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Content Calendar
CREATE TABLE content_calendar (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE NOT NULL,
  generation_id UUID REFERENCES generation_history(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  body TEXT,
  type TEXT NOT NULL CHECK (type IN ('caption','carousel','thread','ad_copy','reels','story','video')),
  platform TEXT NOT NULL CHECK (platform IN ('instagram','threads','tiktok','twitter','youtube','facebook')),
  pillar TEXT CHECK (pillar IN ('awareness','showcase','education','social_proof')),
  scheduled_date DATE,
  scheduled_time TIME,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','approved','scheduled','published','failed')),
  hashtags TEXT[],
  media_urls TEXT[],
  notes TEXT,
  published_at TIMESTAMPTZ,
  published_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_calendar_date ON content_calendar(user_id, scheduled_date);
CREATE INDEX idx_calendar_status ON content_calendar(user_id, status);

-- Assets
CREATE TABLE assets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  width INTEGER,
  height INTEGER,
  tags TEXT[],
  folder TEXT DEFAULT 'root',
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Smart Links
CREATE TABLE smart_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  slug TEXT UNIQUE NOT NULL,
  destination_url TEXT NOT NULL,
  title TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,
  utm_content TEXT,
  click_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Link Clicks
CREATE TABLE link_clicks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  link_id UUID REFERENCES smart_links(id) ON DELETE CASCADE NOT NULL,
  clicked_at TIMESTAMPTZ DEFAULT NOW(),
  ip_hash TEXT,
  country TEXT,
  city TEXT,
  device TEXT,
  browser TEXT,
  os TEXT,
  referrer TEXT
);

CREATE INDEX idx_clicks_link ON link_clicks(link_id, clicked_at);
CREATE INDEX idx_clicks_date ON link_clicks(clicked_at);

-- Analytics Daily
CREATE TABLE analytics_daily (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_clicks INTEGER DEFAULT 0,
  total_content_published INTEGER DEFAULT 0,
  total_generations INTEGER DEFAULT 0,
  clicks_by_platform JSONB DEFAULT '{}',
  clicks_by_device JSONB DEFAULT '{}',
  top_content_id UUID,
  top_link_id UUID,
  UNIQUE(user_id, brand_id, date)
);

-- Weekly Reports
CREATE TABLE weekly_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  report_data JSONB NOT NULL,
  pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, brand_id, week_start)
);

-- ============================================
-- Row Level Security (RLS) Policies
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_monthly ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE smart_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE link_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_reports ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read/update their own
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Brands: users can CRUD their own
CREATE POLICY "Users can view own brands" ON brands FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create brands" ON brands FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own brands" ON brands FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own brands" ON brands FOR DELETE USING (auth.uid() = user_id);

-- Products: users can CRUD their own
CREATE POLICY "Users can view own products" ON products FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create products" ON products FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own products" ON products FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own products" ON products FOR DELETE USING (auth.uid() = user_id);

-- Generation History
CREATE POLICY "Users can view own generations" ON generation_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create generations" ON generation_history FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Saved Content
CREATE POLICY "Users can view own saved" ON saved_content FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create saved" ON saved_content FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own saved" ON saved_content FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own saved" ON saved_content FOR DELETE USING (auth.uid() = user_id);

-- Usage
CREATE POLICY "Users can view own usage" ON usage_monthly FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own usage" ON usage_monthly FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own usage" ON usage_monthly FOR UPDATE USING (auth.uid() = user_id);

-- Calendar
CREATE POLICY "Users can view own calendar" ON content_calendar FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create calendar" ON content_calendar FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own calendar" ON content_calendar FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own calendar" ON content_calendar FOR DELETE USING (auth.uid() = user_id);

-- Assets
CREATE POLICY "Users can view own assets" ON assets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create assets" ON assets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own assets" ON assets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own assets" ON assets FOR DELETE USING (auth.uid() = user_id);

-- Smart Links
CREATE POLICY "Users can view own links" ON smart_links FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create links" ON smart_links FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own links" ON smart_links FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own links" ON smart_links FOR DELETE USING (auth.uid() = user_id);

-- Link Clicks: anyone can insert (tracking), owner can read
CREATE POLICY "Anyone can insert clicks" ON link_clicks FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can view own link clicks" ON link_clicks FOR SELECT USING (
  EXISTS (SELECT 1 FROM smart_links WHERE smart_links.id = link_clicks.link_id AND smart_links.user_id = auth.uid())
);

-- Analytics Daily
CREATE POLICY "Users can view own analytics" ON analytics_daily FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert analytics" ON analytics_daily FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update analytics" ON analytics_daily FOR UPDATE USING (auth.uid() = user_id);

-- Weekly Reports
CREATE POLICY "Users can view own reports" ON weekly_reports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create reports" ON weekly_reports FOR INSERT WITH CHECK (auth.uid() = user_id);
