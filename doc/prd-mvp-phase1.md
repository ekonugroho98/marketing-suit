# Product Requirements Document (PRD)
## Marketing Suite — MVP Phase 1

**Version:** 1.0
**Date:** 9 April 2026
**Timeline:** 8 Minggu (4 Sprint x 2 Minggu)
**Tech Stack:** React + Vite + Tailwind CSS + Supabase + Groq API + Vercel

---

# Sprint 1-2: Foundation & AI Content Generator (Minggu 1-4)

---

## Module 1: Authentication & Onboarding

### 1.1 User Stories

| ID | Story | Priority |
|----|-------|----------|
| AUTH-01 | Sebagai user baru, saya ingin mendaftar pakai Google agar proses cepat tanpa isi form | P0 |
| AUTH-02 | Sebagai user, saya ingin login dengan email & password sebagai alternatif | P0 |
| AUTH-03 | Sebagai user baru, saya ingin melalui onboarding wizard agar platform langsung siap pakai | P0 |
| AUTH-04 | Sebagai user, saya ingin reset password via email jika lupa | P1 |
| AUTH-05 | Sebagai user, saya ingin logout dari semua device | P2 |

### 1.2 Onboarding Wizard Flow

```
Step 1: Welcome
├── "Selamat datang! Yuk setup profilemu dalam 2 menit"
├── Input: Nama lengkap
└── [Lanjut →]

Step 2: Brand Setup
├── "Ceritakan brand / bisnis kamu"
├── Input: Brand Name (text)
├── Input: Brand Niche (dropdown: Finance, Tech, Lifestyle, Education, Lainnya)
├── Input: Brand Description (textarea, max 200 char)
├── Input: Target Audience (textarea, placeholder: "Freelancer usia 20-35 yang...")
└── [Lanjut →]

Step 3: Brand Voice
├── "Pilih gaya komunikasi brand kamu"
├── Select: Tone (multi-select chips)
│   ├── Casual & Friendly
│   ├── Profesional
│   ├── Humoris
│   ├── Inspiratif
│   ├── Edgy / Bold
│   └── Edukatif
├── Input: Kata/frasa favorit (tags, misal: "gratis", "tanpa coding", "gampang banget")
├── Input: Kata/frasa yang dihindari (tags, misal: "murah", "diskon besar")
└── [Lanjut →]

Step 4: Produk Pertama
├── "Tambahkan produk pertama yang mau kamu promosikan"
├── Input: Nama Produk (text)
├── Input: Deskripsi Singkat (textarea)
├── Input: Harga (number + currency IDR)
├── Input: Link Produk (URL)
├── Input: USP / Keunggulan (textarea, placeholder: "100% gratis, tanpa coding...")
├── [Skip untuk nanti] (text link)
└── [Selesai & Masuk Dashboard →]
```

### 1.3 Acceptance Criteria

| ID | Criteria |
|----|----------|
| AC-AUTH-01 | User bisa sign up via Google OAuth — redirect ke dashboard setelah sukses |
| AC-AUTH-02 | User bisa sign up via email + password (min 8 karakter) — verifikasi email terkirim |
| AC-AUTH-03 | Onboarding wizard muncul otomatis untuk user baru (belum punya brand) |
| AC-AUTH-04 | Onboarding bisa di-skip di step 4 — brand tetap tersimpan dari step 2-3 |
| AC-AUTH-05 | Semua data onboarding tersimpan ke tabel `brands` dan `products` di Supabase |
| AC-AUTH-06 | User yang sudah onboarding langsung masuk dashboard (tidak muncul wizard lagi) |
| AC-AUTH-07 | RLS (Row Level Security) aktif — user hanya akses data miliknya sendiri |

### 1.4 Database Schema

```sql
-- USERS (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  onboarding_completed BOOLEAN DEFAULT false,
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free','creator','pro','agency')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- BRANDS
CREATE TABLE brands (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  niche TEXT,
  description TEXT,
  target_audience TEXT,
  tone TEXT[], -- array: ['casual','edukatif']
  favorite_words TEXT[], -- array: ['gratis','tanpa coding']
  avoided_words TEXT[], -- array: ['murah','diskon']
  logo_url TEXT,
  primary_color TEXT DEFAULT '#10b981',
  secondary_color TEXT DEFAULT '#0d1117',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PRODUCTS
CREATE TABLE products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price INTEGER DEFAULT 0, -- dalam Rupiah
  currency TEXT DEFAULT 'IDR',
  link TEXT,
  usp TEXT, -- unique selling proposition
  features TEXT[], -- array fitur utama
  images TEXT[], -- array URL gambar produk
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 1.5 API Endpoints

```
POST   /auth/signup          → Supabase Auth (email/password)
POST   /auth/signup/google   → Supabase Auth (Google OAuth)
POST   /auth/login           → Supabase Auth
POST   /auth/logout          → Supabase Auth
POST   /auth/reset-password  → Supabase Auth

GET    /api/profile          → Get current user profile
PATCH  /api/profile          → Update profile

POST   /api/brands           → Create brand (onboarding step 2-3)
GET    /api/brands           → List user's brands
GET    /api/brands/:id       → Get brand detail
PATCH  /api/brands/:id       → Update brand
DELETE /api/brands/:id       → Delete brand

POST   /api/products         → Create product (onboarding step 4)
GET    /api/products          → List products (filter by brand_id)
GET    /api/products/:id     → Get product detail
PATCH  /api/products/:id     → Update product
DELETE /api/products/:id     → Delete product
```

---

## Module 2: AI Content Generator

### 2.1 User Stories

| ID | Story | Priority |
|----|-------|----------|
| CG-01 | Sebagai creator, saya ingin generate caption Instagram/TikTok dari info produk saya agar tidak perlu menulis dari nol | P0 |
| CG-02 | Sebagai creator, saya ingin generate script carousel 5-7 slide agar bisa langsung desain | P0 |
| CG-03 | Sebagai creator, saya ingin generate ad copy (headline + body + CTA) untuk Meta/TikTok Ads | P0 |
| CG-04 | Sebagai creator, saya ingin generate Twitter/X thread dari satu topik | P1 |
| CG-05 | Sebagai creator, saya ingin repurpose 1 konten ke format lain (thread → carousel, dll) | P1 |
| CG-06 | Sebagai creator, saya ingin AI mengikuti brand voice yang sudah saya setup | P0 |
| CG-07 | Sebagai creator, saya ingin menyimpan hasil generate yang bagus ke library | P0 |
| CG-08 | Sebagai creator, saya ingin regenerate / edit hasil output AI | P0 |
| CG-09 | Sebagai creator, saya ingin melihat history semua konten yang pernah di-generate | P1 |
| CG-10 | Sebagai free user, saya dibatasi 50 generations/bulan dan melihat counter usage | P0 |
| CG-11 | Sebagai creator, saya ingin generate video script (hook, body, CTA) untuk Reels/TikTok/YouTube Shorts | P1 |
| CG-12 | Sebagai creator, saya ingin mendapat suggest hashtag relevan berdasarkan niche + estimasi reach | P1 |

### 2.2 UI Screens & Wireframe Description

#### Screen: Content Generator Hub (`/generate`)

```
┌─────────────────────────────────────────────────────────────┐
│ SIDEBAR          │  AI Content Generator                    │
│                  │                                          │
│ 📝 Generate      │  Mau bikin konten apa hari ini?          │
│ 📅 Calendar      │                                          │
│ 📊 Analytics     │  ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│ 🔗 Links         │  │ 📱       │ │ 🎠       │ │ 📢       │ │
│ 📁 Assets        │  │ Caption  │ │ Carousel │ │ Ad Copy  │ │
│ 📚 Library       │  │          │ │ Script   │ │          │ │
│                  │  └──────────┘ └──────────┘ └──────────┘ │
│ ─────────────    │  ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│ ⚙️ Settings      │  │ 🧵       │ │ 🔄       │ │ 🎬       │ │
│ 👤 Profile       │  │ Thread   │ │ Repurpose│ │ Video    │ │
│                  │  │          │ │          │ │ Script   │ │
│ Usage: 12/50     │  └──────────┘ └──────────┘ └──────────┘ │
│ ████████░░ 24%   │                                          │
│ [Upgrade →]      │  Recent Generations                      │
│                  │  ┌─────────────────────────────────────┐ │
│                  │  │ "🔥 Punya App Keuangan..."  Caption │ │
│                  │  │ 2 jam lalu · Instagram · ⭐ Saved   │ │
│                  │  ├─────────────────────────────────────┤ │
│                  │  │ "5 Tanda Kamu Butuh..."    Carousel │ │
│                  │  │ Kemarin · Instagram                 │ │
│                  │  └─────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

#### Screen: Caption Generator (`/generate/caption`)

```
┌─────────────────────────────────────────────────────────────┐
│                  │  📱 Caption Generator                     │
│  SIDEBAR         │                                          │
│                  │  ┌─ Input ─────────────────────────────┐ │
│                  │  │ Produk:  [Panduan Karaya Finance ▼]  │ │
│                  │  │ Platform: ○ Instagram ○ TikTok       │ │
│                  │  │           ○ Twitter   ○ Facebook     │ │
│                  │  │ Pilar:   [Problem Awareness ▼]       │ │
│                  │  │ Angle:   [________________________]  │ │
│                  │  │          "apa sudut pandang konten?"  │ │
│                  │  │ Tone:    Casual & Friendly (auto)    │ │
│                  │  │ Include: ☑ Hashtags ☑ CTA ☐ Emoji   │ │
│                  │  │                                      │ │
│                  │  │ [✨ Generate 3 Variasi]              │ │
│                  │  └─────────────────────────────────────┘ │
│                  │                                          │
│                  │  ┌─ Output ────────────────────────────┐ │
│                  │  │ Variasi 1                    ⭐ 📋  │ │
│                  │  │ ─────────────────────────────────── │ │
│                  │  │ 🔥 Punya Aplikasi Keuangan Pribadi │ │
│                  │  │ Sendiri — GRATIS Selamanya!         │ │
│                  │  │                                      │ │
│                  │  │ Bayangkan punya dashboard yang...    │ │
│                  │  │ #keuanganpribadi #nocode #gratis    │ │
│                  │  │                                      │ │
│                  │  │ [📋 Copy] [📅 Add to Calendar]      │ │
│                  │  │ [✏️ Edit] [🔄 Regenerate]           │ │
│                  │  ├────────────────────────────────────┤ │
│                  │  │ Variasi 2                    ⭐ 📋  │ │
│                  │  │ ...                                  │ │
│                  │  ├────────────────────────────────────┤ │
│                  │  │ Variasi 3                    ⭐ 📋  │ │
│                  │  │ ...                                  │ │
│                  │  └────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

#### Screen: Carousel Script Generator (`/generate/carousel`)

```
┌─────────────────────────────────────────────────────────────┐
│                  │  🎠 Carousel Script Generator             │
│  SIDEBAR         │                                          │
│                  │  ┌─ Input ─────────────────────────────┐ │
│                  │  │ Produk:    [Panduan Karaya Finance ▼]│ │
│                  │  │ Topik:     [________________________]│ │
│                  │  │ Jumlah Slide: [5] [6] [7]            │ │
│                  │  │ Style:     ○ Tips  ○ Listicle        │ │
│                  │  │            ○ Story ○ Before/After    │ │
│                  │  │ [✨ Generate Script]                 │ │
│                  │  └─────────────────────────────────────┘ │
│                  │                                          │
│                  │  ┌─ Output: Slide-by-Slide ───────────┐ │
│                  │  │                                      │ │
│                  │  │  [1] [2] [3] [4] [5] [6] [7]  tabs │ │
│                  │  │  ═══                                 │ │
│                  │  │  SLIDE 1 — Hook                      │ │
│                  │  │  ┌──────────────────────────────┐   │ │
│                  │  │  │ Headline:                     │   │ │
│                  │  │  │ "Kamu Masih Bayar Rp 100rb/  │   │ │
│                  │  │  │  bulan untuk App Keuangan?"   │   │ │
│                  │  │  │                               │   │ │
│                  │  │  │ Sub-text:                     │   │ │
│                  │  │  │ "Swipe untuk lihat solusinya  │   │ │
│                  │  │  │  yang 100% GRATIS →"          │   │ │
│                  │  │  │                               │   │ │
│                  │  │  │ Visual Notes:                 │   │ │
│                  │  │  │ "Background merah, teks putih │   │ │
│                  │  │  │  bold, emoji 💸"              │   │ │
│                  │  │  └──────────────────────────────┘   │ │
│                  │  │                                      │ │
│                  │  │  [📋 Copy All] [📅 Add to Calendar] │ │
│                  │  │  [🔄 Regenerate Slide]               │ │
│                  │  └─────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

#### Screen: Ad Copy Generator (`/generate/ad-copy`)

```
┌─────────────────────────────────────────────────────────────┐
│                  │  📢 Ad Copy Generator                     │
│  SIDEBAR         │                                          │
│                  │  ┌─ Input ─────────────────────────────┐ │
│                  │  │ Produk:     [Panduan Karaya Finance▼]│ │
│                  │  │ Platform:   ○ Meta ○ TikTok ○ Google│ │
│                  │  │ Objective:  ○ Awareness              │ │
│                  │  │             ○ Traffic                 │ │
│                  │  │             ○ Conversion              │ │
│                  │  │ Audience:   [________________________]│ │
│                  │  │             "deskripsikan target"     │ │
│                  │  │ Budget:     [Rp ______/hari]          │ │
│                  │  │ Variasi:    [3] buah                  │ │
│                  │  │ [✨ Generate Ad Copy]                │ │
│                  │  └─────────────────────────────────────┘ │
│                  │                                          │
│                  │  ┌─ Output ────────────────────────────┐ │
│                  │  │ Ad Variasi 1              ⭐ 📋     │ │
│                  │  │ ──────────────────────────────────  │ │
│                  │  │ PRIMARY TEXT:                        │ │
│                  │  │ "Capek bayar app keuangan tiap      │ │
│                  │  │  bulan? Sekarang kamu bisa punya    │ │
│                  │  │  app SENDIRI — gratis selamanya."   │ │
│                  │  │                                      │ │
│                  │  │ HEADLINE:                            │ │
│                  │  │ "App Keuangan Pribadi — Gratis"     │ │
│                  │  │                                      │ │
│                  │  │ DESCRIPTION:                         │ │
│                  │  │ "Setup 15 menit. Tanpa coding."     │ │
│                  │  │                                      │ │
│                  │  │ CTA: [Pelajari Selengkapnya ▼]      │ │
│                  │  │                                      │ │
│                  │  │ ┌─ Preview ──────────────────┐      │ │
│                  │  │ │ [Mock Meta Ad Card]         │      │ │
│                  │  │ └────────────────────────────┘      │ │
│                  │  │                                      │ │
│                  │  │ [📋 Copy] [📅 Schedule] [A/B Test]  │ │
│                  │  └────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 2.3 AI Prompt Engineering

#### System Prompt Template (base)

```
Kamu adalah AI copywriter profesional untuk brand Indonesia.

BRAND CONTEXT:
- Nama Brand: {{brand.name}}
- Niche: {{brand.niche}}
- Target Audience: {{brand.target_audience}}
- Tone: {{brand.tone}}
- Kata favorit: {{brand.favorite_words}}
- Kata dihindari: {{brand.avoided_words}}

PRODUCT CONTEXT:
- Nama Produk: {{product.name}}
- Deskripsi: {{product.description}}
- Harga: {{product.price}}
- USP: {{product.usp}}
- Fitur Utama: {{product.features}}

RULES:
1. Selalu gunakan Bahasa Indonesia informal (gue/lu boleh jika tone casual)
2. Ikuti tone yang sudah ditentukan
3. Gunakan kata-kata favorit secara natural
4. JANGAN gunakan kata-kata yang dihindari
5. Setiap output harus actionable dan siap posting
```

#### Caption Generator Prompt

```
{{SYSTEM_PROMPT}}

TASK: Buat {{count}} variasi caption untuk {{platform}}.

PARAMETERS:
- Content Pillar: {{pillar}}
- Angle/Sudut Pandang: {{angle}}
- Include Hashtags: {{include_hashtags}}
- Include CTA: {{include_cta}}
- Max Length: {{platform === 'twitter' ? '280 chars' : '2200 chars'}}

FORMAT OUTPUT (JSON):
{
  "variations": [
    {
      "caption": "...",
      "hashtags": ["#tag1", "#tag2"],
      "cta": "Link di bio 👆",
      "hook_first_line": "...",
      "estimated_engagement": "high/medium/low",
      "best_posting_time": "12:00-13:00 WIB"
    }
  ]
}
```

#### Carousel Script Prompt

```
{{SYSTEM_PROMPT}}

TASK: Buat script carousel Instagram {{slide_count}} slide.

PARAMETERS:
- Topik: {{topic}}
- Style: {{style}}

FORMAT OUTPUT (JSON):
{
  "title": "...",
  "slides": [
    {
      "slide_number": 1,
      "type": "hook",
      "headline": "...",
      "sub_text": "...",
      "visual_notes": "...",
      "design_suggestion": "..."
    }
  ],
  "caption": "...",
  "hashtags": ["..."]
}
```

#### Ad Copy Prompt

```
{{SYSTEM_PROMPT}}

TASK: Buat {{count}} variasi ad copy untuk {{platform}} Ads.

PARAMETERS:
- Objective: {{objective}}
- Target Audience Detail: {{audience}}
- Daily Budget: {{budget}}

FORMAT OUTPUT (JSON):
{
  "variations": [
    {
      "primary_text": "... (max 125 chars for Meta)",
      "headline": "... (max 40 chars)",
      "description": "... (max 30 chars)",
      "cta_button": "Pelajari Selengkapnya",
      "target_audience_suggestion": "...",
      "estimated_ctr": "1.5-2.5%"
    }
  ]
}
```

### 2.4 Acceptance Criteria

| ID | Criteria |
|----|----------|
| AC-CG-01 | Caption Generator menghasilkan 3-5 variasi sesuai platform yang dipilih |
| AC-CG-02 | Output mengikuti brand voice (tone, kata favorit, kata dihindari) |
| AC-CG-03 | Carousel Script menghasilkan slide-by-slide dengan headline, sub-text, dan visual notes |
| AC-CG-04 | Ad Copy menghasilkan format yang benar per platform (char limit Meta vs TikTok vs Google) |
| AC-CG-05 | User bisa regenerate individual variasi tanpa regenerate semua |
| AC-CG-06 | User bisa edit output langsung di textarea sebelum save/copy |
| AC-CG-07 | Tombol "Copy" menyalin teks ke clipboard dengan notifikasi sukses |
| AC-CG-08 | Tombol "Save to Library" menyimpan ke tabel `saved_content` |
| AC-CG-09 | Tombol "Add to Calendar" membuka modal date picker lalu simpan ke calendar |
| AC-CG-10 | Free user dibatasi 50 generations/bulan — counter terlihat di sidebar |
| AC-CG-11 | Jika free limit tercapai, tampilkan modal upgrade dengan comparison table |
| AC-CG-12 | Loading state: skeleton/spinner saat AI processing (avg 2-5 detik via Groq) |
| AC-CG-13 | Error handling: jika Groq API gagal, tampilkan pesan retry + fallback |
| AC-CG-14 | Setiap generation tersimpan di `generation_history` untuk tracking |

### 2.5 Database Schema (Content Generator)

```sql
-- GENERATION HISTORY
CREATE TABLE generation_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('caption','carousel','ad_copy','thread','repurpose','video_script')),
  platform TEXT, -- 'instagram','tiktok','twitter','facebook','meta_ads','tiktok_ads','google_ads'
  pillar TEXT, -- 'awareness','showcase','education','social_proof'
  input_params JSONB NOT NULL, -- semua parameter input
  output JSONB NOT NULL, -- full AI output
  model TEXT DEFAULT 'llama-3.3-70b-versatile',
  tokens_used INTEGER,
  is_saved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SAVED CONTENT LIBRARY
CREATE TABLE saved_content (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  generation_id UUID REFERENCES generation_history(id) ON DELETE SET NULL,
  type TEXT NOT NULL, -- 'caption','carousel','ad_copy','headline','cta','custom'
  title TEXT,
  content TEXT NOT NULL,
  metadata JSONB, -- platform, hashtags, dll
  tags TEXT[],
  is_favorite BOOLEAN DEFAULT false,
  used_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- USAGE TRACKING
CREATE TABLE usage_monthly (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  month DATE NOT NULL, -- first day of month
  generation_count INTEGER DEFAULT 0,
  generation_limit INTEGER DEFAULT 50,
  UNIQUE(user_id, month)
);
```

### 2.6 API Endpoints (Content Generator)

```
POST   /api/generate/caption      → Generate caption variasi
POST   /api/generate/carousel     → Generate carousel script
POST   /api/generate/ad-copy      → Generate ad copy
POST   /api/generate/thread       → Generate Twitter thread
POST   /api/generate/repurpose    → Repurpose content
POST   /api/generate/video-script → Generate video script
POST   /api/generate/hashtags     → Research & suggest hashtag relevan per niche

GET    /api/generations            → List history (paginated, filter by type)
GET    /api/generations/:id        → Get single generation detail

POST   /api/library               → Save content to library
GET    /api/library                → List saved content (filter by type, tags)
PATCH  /api/library/:id           → Update saved content
DELETE /api/library/:id           → Delete from library

GET    /api/usage                  → Get current month usage count & limit
```

### 2.7 Groq API Integration

```javascript
// services/ai.js
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

export async function generateContent({ systemPrompt, userPrompt, maxTokens = 2000 }) {
  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: maxTokens,
      temperature: 0.8,
      response_format: { type: 'json_object' }
    })
  });

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}
```

**Rate Limiting Strategy:**
- Free Groq: 14,400 requests/day, 6,000 tokens/minute
- Implement queue system: max 2 concurrent requests per user
- Cache identical requests (same params) for 1 jam
- Fallback ke `llama-3.1-8b-instant` jika 70B overloaded

---

# Sprint 3-4: Content Calendar & Asset Manager (Minggu 5-6)

---

## Module 3: Content Calendar

### 3.1 User Stories

| ID | Story | Priority |
|----|-------|----------|
| CAL-01 | Sebagai creator, saya ingin melihat kalender mingguan/bulanan dari semua konten yang direncanakan | P0 |
| CAL-02 | Sebagai creator, saya ingin drag & drop konten ke tanggal tertentu untuk menjadwalkan | P0 |
| CAL-03 | Sebagai creator, saya ingin menandai setiap konten dengan pilar (Awareness/Showcase/Education/Social Proof) | P0 |
| CAL-04 | Sebagai creator, saya ingin melihat status konten (Draft/Approved/Scheduled/Published) | P0 |
| CAL-05 | Sebagai creator, saya ingin membuat konten baru langsung dari kalender | P1 |
| CAL-06 | Sebagai creator, saya ingin filter kalender per platform | P1 |
| CAL-07 | Sebagai creator, saya ingin filter kalender per pilar | P1 |
| CAL-08 | Sebagai creator, saya ingin lihat distribusi pilar per minggu (balance check) | P1 |

### 3.2 UI Screen: Calendar View (`/calendar`)

```
┌─────────────────────────────────────────────────────────────┐
│                  │  📅 Content Calendar         April 2026  │
│  SIDEBAR         │  [◀ Prev] [Weekly ▼] [Next ▶]          │
│                  │                                          │
│                  │  Filter: [All Platforms ▼] [All Pillars▼]│
│                  │                                          │
│                  │  ┌─ Pillar Balance This Week ──────────┐ │
│                  │  │ 🔥 Awareness ████░░ 3  │ 💡 Show █░ 1│
│                  │  │ 🎓 Education ██░░░░ 2  │ 🚀 Proof ░ 0│
│                  │  └────────────────────────────────────┘ │
│                  │                                          │
│                  │  MON 7    TUE 8    WED 9    THU 10  ... │
│                  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐   │
│                  │  │🔥 IG │ │💡 TT │ │      │ │🎓 TW │   │
│                  │  │Caption│ │Reels │ │      │ │Thread│   │
│                  │  │12:00  │ │19:00 │ │ [+]  │ │09:00 │   │
│                  │  │▓▓▓▓▓ │ │░░░░░ │ │      │ │▓▓▓▓▓ │   │
│                  │  │Publis │ │Draft │ │      │ │Sched │   │
│                  │  └──────┘ └──────┘ └──────┘ └──────┘   │
│                  │           ┌──────┐                       │
│                  │           │🔥 IG │                       │
│                  │           │Carous│                       │
│                  │           │12:00 │                       │
│                  │           │░░░░░ │                       │
│                  │           │Draft │                       │
│                  │           └──────┘                       │
│                  │                                          │
│                  │  [+ New Content]                         │
└─────────────────────────────────────────────────────────────┘

WARNA STATUS:
▓▓▓▓▓ Published (hijau)
░░░░░ Draft (abu-abu)
▒▒▒▒▒ Scheduled (biru)
█████ Approved (kuning)

WARNA PILAR:
🔥 Awareness = merah/orange
💡 Showcase = biru
🎓 Education = hijau
🚀 Social Proof = ungu
```

### 3.3 Acceptance Criteria

| ID | Criteria |
|----|----------|
| AC-CAL-01 | Kalender menampilkan view mingguan (default) dan bulanan |
| AC-CAL-02 | Konten bisa di-drag & drop antar tanggal di weekly view |
| AC-CAL-03 | Klik [+] di tanggal kosong membuka modal "New Content" |
| AC-CAL-04 | Setiap card konten menunjukkan: pilar icon, platform, waktu, judul pendek, status |
| AC-CAL-05 | Klik card konten membuka detail panel di kanan (slide-over) |
| AC-CAL-06 | Filter platform dan pilar bekerja real-time tanpa reload |
| AC-CAL-07 | Pillar Balance bar menghitung distribusi konten di minggu aktif |
| AC-CAL-08 | Status flow: Draft → Approved → Scheduled → Published (click to change) |
| AC-CAL-09 | Konten dari AI Generator bisa langsung masuk kalender via "Add to Calendar" button |

### 3.4 Database Schema

```sql
-- CONTENT CALENDAR
CREATE TABLE content_calendar (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE NOT NULL,
  generation_id UUID REFERENCES generation_history(id) ON DELETE SET NULL,

  -- Content
  title TEXT NOT NULL,
  body TEXT, -- full caption/script/copy
  type TEXT NOT NULL CHECK (type IN ('caption','carousel','thread','ad_copy','reels','story','video')),
  platform TEXT NOT NULL CHECK (platform IN ('instagram','threads','tiktok','twitter','youtube','facebook')),
  pillar TEXT CHECK (pillar IN ('awareness','showcase','education','social_proof')),

  -- Scheduling
  scheduled_date DATE,
  scheduled_time TIME,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','approved','scheduled','published','failed')),

  -- Metadata
  hashtags TEXT[],
  media_urls TEXT[], -- linked assets
  notes TEXT,

  -- Tracking
  published_at TIMESTAMPTZ,
  published_url TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEX for calendar queries
CREATE INDEX idx_calendar_date ON content_calendar(user_id, scheduled_date);
CREATE INDEX idx_calendar_status ON content_calendar(user_id, status);
```

---

## Module 4: Asset Manager

### 4.1 User Stories

| ID | Story | Priority |
|----|-------|----------|
| AS-01 | Sebagai creator, saya ingin upload dan organize gambar/video marketing di satu tempat | P0 |
| AS-02 | Sebagai creator, saya ingin auto-resize 1 gambar ke semua format platform | P0 |
| AS-03 | Sebagai creator, saya ingin convert screenshot landscape jadi square 1024x1024 | P1 |
| AS-04 | Sebagai creator, saya ingin simpan brand kit (logo, warna, font) untuk consistency | P0 |
| AS-05 | Sebagai creator, saya ingin search & filter asset by tags dan type | P1 |
| AS-06 | Sebagai creator, saya ingin copy saved caption/headline dari library dengan 1 klik | P1 |

### 4.2 UI Screen: Asset Manager (`/assets`)

```
┌─────────────────────────────────────────────────────────────┐
│                  │  📁 Asset Manager                        │
│  SIDEBAR         │                                          │
│                  │  [Upload] [New Folder] [🔍 Search...]    │
│                  │                                          │
│                  │  Tabs: [Media] [Copy Library] [Brand Kit]│
│                  │                                          │
│                  │  ── Media Tab ──                         │
│                  │  Filter: [All ▼] [Images ▼] [Video ▼]   │
│                  │                                          │
│                  │  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐    │
│                  │  │ 📷 │ │ 📷 │ │ 📷 │ │ 📷 │ │ 📷 │    │
│                  │  │    │ │    │ │    │ │    │ │    │    │
│                  │  │dash│ │inv │ │ai  │ │lap │ │cov │    │
│                  │  └────┘ └────┘ └────┘ └────┘ └────┘    │
│                  │  Tags: product, screenshot               │
│                  │                                          │
│                  │  ── Image Resizer Tool ──                │
│                  │  ┌─────────────────────────────────────┐ │
│                  │  │ Drop image here or [Browse]          │ │
│                  │  │                                      │ │
│                  │  │ Output formats:                      │ │
│                  │  │ ☑ IG Post (1080x1080)               │ │
│                  │  │ ☑ IG Story (1080x1920)              │ │
│                  │  │ ☑ TikTok (1080x1920)                │ │
│                  │  │ ☑ Twitter (1200x675)                │ │
│                  │  │ ☑ Lynk.id (1024x1024)               │ │
│                  │  │ ☑ OG Image (1200x630)               │ │
│                  │  │                                      │ │
│                  │  │ [🔄 Resize & Download All]           │ │
│                  │  └─────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 4.3 Image Resizer — Preset Dimensions

```javascript
const RESIZE_PRESETS = {
  ig_post:    { w: 1080, h: 1080, label: 'Instagram Post' },
  ig_story:   { w: 1080, h: 1920, label: 'Instagram Story' },
  ig_landscape: { w: 1080, h: 566, label: 'Instagram Landscape' },
  tiktok:     { w: 1080, h: 1920, label: 'TikTok' },
  twitter:    { w: 1200, h: 675, label: 'Twitter/X' },
  facebook:   { w: 1200, h: 630, label: 'Facebook' },
  threads:    { w: 1080, h: 1080, label: 'Threads Post' },
  yt_shorts:  { w: 1080, h: 1920, label: 'YouTube Shorts' },
  yt_thumb:   { w: 1280, h: 720, label: 'YouTube Thumbnail' },
  lynkid:     { w: 1024, h: 1024, label: 'Lynk.id Product' },
  og_image:   { w: 1200, h: 630, label: 'OG Image' },
};
```

### 4.4 Acceptance Criteria

| ID | Criteria |
|----|----------|
| AC-AS-01 | Upload via drag & drop dan file picker, max 10MB per file, format: jpg/png/webp/gif/mp4 |
| AC-AS-02 | Semua upload disimpan ke Supabase Storage bucket `assets` |
| AC-AS-03 | Image Resizer menghasilkan semua format yang dicentang, download sebagai zip |
| AC-AS-04 | Screenshot-to-Square: input gambar landscape → output 1024x1024 dengan background gelap + padding |
| AC-AS-05 | Brand Kit menyimpan: logo (upload), primary color, secondary color — ditampilkan sebagai preview |
| AC-AS-06 | Copy Library: list semua saved content dengan search, filter by type, 1-click copy |
| AC-AS-07 | Asset bisa di-tag, search by tag/filename |
| AC-AS-08 | Asset bisa dihapus (soft delete, bisa restore dalam 30 hari) |

### 4.5 Database Schema

```sql
-- ASSETS
CREATE TABLE assets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'image/jpeg', 'image/png', 'video/mp4'
  file_size INTEGER, -- bytes
  width INTEGER,
  height INTEGER,
  tags TEXT[],
  folder TEXT DEFAULT 'root',
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

# Sprint 5-6: Analytics & Link Tracker (Minggu 7-8)

---

## Module 5: Smart Links & Tracking

### 5.1 User Stories

| ID | Story | Priority |
|----|-------|----------|
| LT-01 | Sebagai creator, saya ingin membuat short link dengan tracking untuk setiap campaign | P0 |
| LT-02 | Sebagai creator, saya ingin melihat berapa klik per link secara real-time | P0 |
| LT-03 | Sebagai creator, saya ingin generate UTM parameters otomatis | P0 |
| LT-04 | Sebagai creator, saya ingin melihat detail klik: device, lokasi, waktu, sumber | P1 |
| LT-05 | Sebagai creator, saya ingin generate QR code dari setiap link | P1 |

### 5.2 UI Screen: Smart Links (`/links`)

```
┌─────────────────────────────────────────────────────────────┐
│                  │  🔗 Smart Links                          │
│  SIDEBAR         │                                          │
│                  │  [+ New Link]                            │
│                  │                                          │
│                  │  Total Clicks: 1,247  Links: 8           │
│                  │                                          │
│                  │  ┌─ Link List ─────────────────────────┐ │
│                  │  │                                      │ │
│                  │  │ 🔗 karaya-ig-bio                     │ │
│                  │  │ mkt.link/karaya-ig → lynk.id/digi.. │ │
│                  │  │ 📊 487 clicks · Created 3 days ago  │ │
│                  │  │ [📋 Copy] [📱 QR] [📊 Stats]       │ │
│                  │  │                                      │ │
│                  │  │ 🔗 karaya-tiktok-bio                 │ │
│                  │  │ mkt.link/karaya-tt → lynk.id/digi.. │ │
│                  │  │ 📊 312 clicks · Created 3 days ago  │ │
│                  │  │ [📋 Copy] [📱 QR] [📊 Stats]       │ │
│                  │  │                                      │ │
│                  │  └────────────────────────────────────┘ │
│                  │                                          │
│                  │  ┌─ Create New Link Modal ─────────────┐ │
│                  │  │ Destination URL: [________________]  │ │
│                  │  │ Custom Slug:     [________________]  │ │
│                  │  │ Campaign:        [Instagram Bio ▼]   │ │
│                  │  │                                      │ │
│                  │  │ UTM (auto-generated):                │ │
│                  │  │ Source:  [instagram]                  │ │
│                  │  │ Medium:  [bio_link]                   │ │
│                  │  │ Campaign:[karaya_launch_apr26]        │ │
│                  │  │                                      │ │
│                  │  │ [Create Link]                        │ │
│                  │  └────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 5.3 Database Schema

```sql
-- SMART LINKS
CREATE TABLE smart_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  slug TEXT UNIQUE NOT NULL, -- short URL path
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

-- LINK CLICKS
CREATE TABLE link_clicks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  link_id UUID REFERENCES smart_links(id) ON DELETE CASCADE NOT NULL,
  clicked_at TIMESTAMPTZ DEFAULT NOW(),
  ip_hash TEXT, -- hashed IP for privacy
  country TEXT,
  city TEXT,
  device TEXT, -- mobile/desktop/tablet
  browser TEXT,
  os TEXT,
  referrer TEXT
);

-- INDEX for analytics
CREATE INDEX idx_clicks_link ON link_clicks(link_id, clicked_at);
CREATE INDEX idx_clicks_date ON link_clicks(clicked_at);
```

### 5.4 Link Redirect Flow

```
User clicks: mkt.link/karaya-ig
       ↓
[Edge Function: /r/:slug]
       ↓
1. Lookup slug in smart_links table
2. Insert row into link_clicks (async, non-blocking)
   - Parse User-Agent → device, browser, os
   - GeoIP lookup → country, city
   - Hash IP for privacy
3. 302 Redirect → destination_url (with UTM params appended)
       ↓
User arrives at: lynk.id/digital_nomad/n9k79nzyy673?utm_source=instagram&...
```

---

## Module 6: Analytics Dashboard

### 6.1 User Stories

| ID | Story | Priority |
|----|-------|----------|
| AN-01 | Sebagai creator, saya ingin melihat overview KPI (clicks, content count, top performer) di satu dashboard | P0 |
| AN-02 | Sebagai creator, saya ingin melihat ranking konten berdasarkan engagement/clicks | P0 |
| AN-03 | Sebagai creator, saya ingin filter analytics per tanggal (7d, 30d, 90d, custom) | P0 |
| AN-04 | Sebagai creator, saya ingin auto-generate laporan mingguan | P0 |
| AN-05 | Sebagai creator, saya ingin melihat dari platform mana traffic terbanyak berasal | P1 |
| AN-06 | Sebagai creator, saya ingin melihat trend clicks per hari dalam grafik | P1 |

### 6.2 UI Screen: Dashboard (`/dashboard`)

```
┌──────────────────────────────────────────────────────────────┐
│                  │ 📊 Dashboard           [7d ▼] [Export 📄] │
│  SIDEBAR         │                                           │
│                  │ ┌────────┐ ┌────────┐ ┌────────┐ ┌──────┐│
│                  │ │  1,247 │ │   28   │ │   12   │ │  4   ││
│                  │ │ Clicks │ │Content │ │ Links  │ │Sales ││
│                  │ │ +23%↑  │ │Created │ │ Active │ │ Est  ││
│                  │ └────────┘ └────────┘ └────────┘ └──────┘│
│                  │                                           │
│                  │ ┌─ Clicks Trend (7 days) ───────────────┐│
│                  │ │  200│      ╱\                          ││
│                  │ │  150│   ╱╱   \\                        ││
│                  │ │  100│ ╱╱       \\    ╱\                ││
│                  │ │   50│╱           \\╱╱  \\              ││
│                  │ │    0└─────────────────────             ││
│                  │ │     Mon Tue Wed Thu Fri Sat Sun        ││
│                  │ └───────────────────────────────────────┘│
│                  │                                           │
│                  │ ┌─ Top Content ──────┐ ┌─ Traffic Source┐│
│                  │ │ 1. Caption IG      │ │ Instagram  62% ││
│                  │ │    487 clicks      │ │ TikTok     24% ││
│                  │ │ 2. Thread Twitter  │ │ Twitter     9% ││
│                  │ │    312 clicks      │ │ Direct      5% ││
│                  │ │ 3. TikTok Reels    │ │                 ││
│                  │ │    203 clicks      │ │                 ││
│                  │ └───────────────────┘ └─────────────────┘│
│                  │                                           │
│                  │ ┌─ Weekly Report ──────────────────────┐ │
│                  │ │ 📄 Report Minggu 7-13 Apr 2026       │ │
│                  │ │ Generated: auto setiap Senin 08:00    │ │
│                  │ │ [📥 Download PDF] [📧 Email Report]  │ │
│                  │ └─────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

### 6.3 Weekly Report Content (Auto-Generated)

```
📊 Weekly Marketing Report
Brand: @digital_nomad
Period: 7 - 13 April 2026

HIGHLIGHTS:
• Total clicks: 1,247 (+23% vs minggu lalu)
• Content published: 7 pieces
• Best performer: "Caption IG - App Keuangan Gratis" (487 clicks)
• Top traffic source: Instagram (62%)
• Estimated sales: 4 (Rp 396,000)

CONTENT BREAKDOWN:
| Type      | Published | Clicks | Avg Click |
|-----------|-----------|--------|-----------|
| Caption   | 3         | 702    | 234       |
| Carousel  | 1         | 203    | 203       |
| Thread    | 2         | 312    | 156       |
| Ad Copy   | 1         | 30     | 30        |

PILAR DISTRIBUTION:
🔥 Awareness: 3 (43%)
💡 Showcase: 2 (29%)
🎓 Education: 1 (14%)
🚀 Social Proof: 1 (14%)

RECOMMENDATIONS (AI-generated):
1. Caption IG perform paling baik — buat lebih banyak konten IG
2. Social Proof masih kurang — tambah testimoni content minggu depan
3. Best posting time: 12:00-13:00 WIB (berdasarkan click data)
```

### 6.4 Acceptance Criteria

| ID | Criteria |
|----|----------|
| AC-AN-01 | Dashboard menampilkan 4 KPI cards: total clicks, content count, active links, estimated sales |
| AC-AN-02 | Clicks trend chart menampilkan line chart per hari sesuai date range filter |
| AC-AN-03 | Top Content ranking diurutkan berdasarkan click count dari smart links |
| AC-AN-04 | Traffic Source breakdown dari referrer data link clicks |
| AC-AN-05 | Date range filter: 7d, 30d, 90d, custom range — chart & KPI update real-time |
| AC-AN-06 | Weekly Report auto-generate setiap Senin 08:00 WIB via Supabase cron/edge function |
| AC-AN-07 | Report bisa di-download sebagai PDF |
| AC-AN-08 | Dashboard load time < 2 detik (query optimization dengan proper indexes) |

### 6.5 Database Schema

```sql
-- ANALYTICS DAILY (aggregated for fast queries)
CREATE TABLE analytics_daily (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_clicks INTEGER DEFAULT 0,
  total_content_published INTEGER DEFAULT 0,
  total_generations INTEGER DEFAULT 0,
  clicks_by_platform JSONB DEFAULT '{}', -- {"instagram":100,"tiktok":50}
  clicks_by_device JSONB DEFAULT '{}', -- {"mobile":120,"desktop":30}
  top_content_id UUID,
  top_link_id UUID,
  UNIQUE(user_id, brand_id, date)
);

-- WEEKLY REPORTS
CREATE TABLE weekly_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  report_data JSONB NOT NULL, -- full report JSON
  pdf_url TEXT, -- generated PDF link
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, brand_id, week_start)
);
```

---

## Non-Functional Requirements

### Performance
| Metric | Target |
|--------|--------|
| Page Load (initial) | < 2 seconds |
| AI Generation Response | < 5 seconds (Groq avg 1-3s) |
| Dashboard Query | < 500ms |
| Link Redirect | < 100ms |
| Image Resize (client-side) | < 3 seconds per image |

### Security
| Requirement | Implementation |
|------------|---------------|
| Authentication | Supabase Auth + JWT |
| Authorization | RLS on all tables — user sees only their data |
| API Keys | Groq API key stored as Supabase secret, never exposed to client |
| Link Tracking | IP addresses hashed (SHA-256), no PII stored |
| File Upload | Max 10MB, allowed types whitelist, virus scan via Supabase |
| HTTPS | Enforced via Vercel |

### Scalability
| Component | Strategy |
|-----------|----------|
| Database | Supabase PostgreSQL with proper indexes, partitioning for link_clicks |
| File Storage | Supabase Storage (S3-compatible), CDN for assets |
| AI Requests | Queue system, request deduplication, model fallback |
| Analytics | Daily aggregation table to avoid scanning raw clicks |

---

## Project Structure

```
src/
├── components/
│   ├── ui/               # Shared UI (Button, Card, Modal, Input, etc.)
│   ├── layout/           # Sidebar, TopBar, PageWrapper
│   ├── auth/             # LoginForm, SignupForm, OnboardingWizard
│   ├── generator/        # CaptionForm, CarouselForm, AdCopyForm, OutputCard
│   ├── calendar/         # CalendarGrid, ContentCard, DragDropProvider
│   ├── assets/           # MediaGrid, ImageResizer, BrandKit, CopyLibrary
│   ├── links/            # LinkList, CreateLinkModal, QRGenerator
│   └── analytics/        # KPICards, ClicksChart, TopContent, TrafficSource
├── pages/
│   ├── auth/             # /login, /signup, /onboarding
│   ├── dashboard/        # /dashboard
│   ├── generate/         # /generate, /generate/caption, /carousel, /ad-copy
│   ├── calendar/         # /calendar
│   ├── assets/           # /assets
│   ├── links/            # /links
│   └── settings/         # /settings
├── services/
│   ├── ai.js             # Groq API wrapper
│   ├── supabase.js       # Supabase client
│   ├── storage.js        # File upload helpers
│   └── analytics.js      # Analytics query helpers
├── hooks/
│   ├── useAuth.js
│   ├── useBrand.js
│   ├── useGenerator.js
│   ├── useCalendar.js
│   └── useAnalytics.js
├── utils/
│   ├── prompts.js        # AI prompt templates
│   ├── image-resize.js   # Client-side image processing
│   ├── utm.js            # UTM generator
│   └── report.js         # Report generation helpers
└── App.jsx
```

---

## Definition of Done (per feature)

- [ ] User story implemented sesuai acceptance criteria
- [ ] UI responsive (mobile + desktop)
- [ ] Loading states & error handling implemented
- [ ] RLS policies active & tested
- [ ] Edge cases handled (empty state, max limit, invalid input)
- [ ] Tested di Chrome, Safari, Firefox
- [ ] No console errors
- [ ] Deployed ke Vercel preview branch — QA pass
