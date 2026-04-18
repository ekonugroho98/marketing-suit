-- ============================================
-- Migration 016: Enhanced Product Brief
-- Adds rich context columns to products table
-- for better AI content generation
-- ============================================

-- Target buyer persona
-- e.g. "Content creator pemula yang baru mulai jualan digital product, punya followers 1-5K, struggle bikin konten yang converting"
ALTER TABLE products ADD COLUMN IF NOT EXISTS target_buyer TEXT;

-- Transformation promise (before → after)
-- e.g. "Sebelum: bikin caption 2 jam, hasil mediocre. Sesudah: 15 menit, caption viral dengan framework proven"
ALTER TABLE products ADD COLUMN IF NOT EXISTS transformation TEXT;

-- Detailed outline/contents (for ebook: chapters, for course: modules, for template: what's included)
-- e.g. "Bab 1: Hook Formula - 10 template hook\nBab 2: Storytelling Framework\nBab 3: CTA yang Converting\n+ 50 Template Caption\n+ Swipe File 100 Iklan"
ALTER TABLE products ADD COLUMN IF NOT EXISTS outline TEXT;

-- Social proof / testimonials
-- e.g. "2.847 creator sudah pakai. Rating 4.9/5. 'Omzet naik 3x dalam sebulan' - @username"
ALTER TABLE products ADD COLUMN IF NOT EXISTS social_proof TEXT;

-- Competitor comparison
-- e.g. "vs Tool A (Rp 500K/bulan, English only) vs Tool B (Rp 200K, fitur terbatas). Kita: sekali bayar, Bahasa Indonesia, lifetime update"
ALTER TABLE products ADD COLUMN IF NOT EXISTS competitors TEXT;

-- Bonus/offer details
-- e.g. "Bonus: Template Canva 50 desain + Grup Telegram eksklusif + Update lifetime"
ALTER TABLE products ADD COLUMN IF NOT EXISTS bonus_offers TEXT;

-- Common objections & answers
-- e.g. "Q: Mahal? A: Lebih murah dari 1x ngopi per hari selama sebulan. Q: Bisa refund? A: Garansi 30 hari uang kembali"
ALTER TABLE products ADD COLUMN IF NOT EXISTS objections TEXT;

-- Product type for context
-- Only add if not exists; uses DO block because ADD COLUMN IF NOT EXISTS doesn't support CHECK inline gracefully with defaults on all PG versions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'product_type'
  ) THEN
    ALTER TABLE products ADD COLUMN product_type TEXT DEFAULT 'digital_ebook';
  END IF;
END $$;

-- Add CHECK constraint for product_type if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'products' AND constraint_name = 'products_product_type_check'
  ) THEN
    ALTER TABLE products ADD CONSTRAINT products_product_type_check
      CHECK (product_type IN ('digital_ebook','digital_course','digital_template','saas','physical','service','other'));
  END IF;
END $$;

-- Pricing details (discount, original price, etc.)
ALTER TABLE products ADD COLUMN IF NOT EXISTS original_price INTEGER;

-- e.g. "Early Bird 50% OFF" or "Diskon Rp 200K sampai 31 Jan"
ALTER TABLE products ADD COLUMN IF NOT EXISTS discount_label TEXT;

-- ============================================
-- Indexes for common query patterns
-- ============================================

-- Index on product_type for filtering
CREATE INDEX IF NOT EXISTS idx_products_product_type ON products(product_type);

-- Index on brand_id + is_active for fetching active products per brand
CREATE INDEX IF NOT EXISTS idx_products_brand_active ON products(brand_id, is_active);

-- Index on user_id + brand_id for RLS-filtered queries
CREATE INDEX IF NOT EXISTS idx_products_user_brand ON products(user_id, brand_id);

-- Composite index for the most common query pattern: user's active products for a brand
CREATE INDEX IF NOT EXISTS idx_products_user_brand_active ON products(user_id, brand_id, is_active);
