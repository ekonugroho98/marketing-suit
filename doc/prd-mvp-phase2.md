# Product Requirements Document (PRD)
## Marketing Suite — Phase 2 (Post-MVP)

**Version:** 1.0
**Date:** 9 April 2026
**Timeline:** 8 Minggu (4 Sprint x 2 Minggu), dimulai setelah Phase 1 selesai
**Prerequisite:** Semua Module Phase 1 sudah live & stabil
**Tech Stack:** Sama dengan Phase 1 + Meta Graph API, Twitter API v2, TikTok API, Resend

---

## Phase 2 Overview

| Sprint | Minggu | Module | Fokus |
|--------|--------|--------|-------|
| Sprint 7-8 | 1-2 | Auto-Publisher | Connect & auto-publish ke Instagram, Twitter/X |
| Sprint 8 | 2 | A/B Testing Engine | Split test konten & ad copy |
| Sprint 9-10 | 3-4 | Ads Manager | Meta Ads dashboard, campaign creation, budget tracking |
| Sprint 10 | 4 | Competitor Spy | Monitor iklan & konten kompetitor |
| Sprint 11-12 | 5-6 | CRM & Lead Management | Contact database, email broadcast, WA follow-up |
| Sprint 12 | 6 | Testimonial Collector | Auto-request & display review |
| Sprint 13-14 | 7-8 | Advanced Analytics & Billing | Funnel viz, revenue attribution, Stripe/Midtrans billing |

---

# Sprint 7-8: Auto-Publisher (Minggu 1-2)

---

## Module 7: Social Media Auto-Publisher

### 7.1 User Stories

| ID | Story | Priority |
|----|-------|----------|
| AP-01 | Sebagai creator, saya ingin menghubungkan akun Instagram saya agar bisa auto-publish dari calendar | P0 |
| AP-02 | Sebagai creator, saya ingin menghubungkan akun Twitter/X saya agar bisa auto-publish threads & tweets | P0 |
| AP-03 | Sebagai creator, saya ingin menghubungkan akun TikTok saya untuk auto-publish video | P1 |
| AP-11 | Sebagai creator, saya ingin menghubungkan akun Threads saya agar bisa auto-publish text posts | P1 |
| AP-04 | Sebagai creator, saya ingin preview konten di setiap platform sebelum publish | P0 |
| AP-05 | Sebagai creator, saya ingin menjadwalkan waktu publish yang spesifik (tanggal + jam) | P0 |
| AP-06 | Sebagai creator, saya ingin publish ke multiple platform sekaligus (cross-post) | P1 |
| AP-07 | Sebagai creator, saya ingin menerima notifikasi jika publish gagal | P0 |
| AP-08 | Sebagai creator, saya ingin melihat history semua post yang sudah di-publish | P1 |
| AP-09 | Sebagai creator, saya ingin AI menyesuaikan caption otomatis per platform (panjang, format, hashtag) | P1 |
| AP-10 | Sebagai creator, saya ingin suggestion waktu posting optimal berdasarkan data engagement sebelumnya | P2 |

### 7.2 Platform Connection Flow

```
┌─ Settings > Connected Accounts ──────────────────────────────┐
│                                                              │
│  Connected Accounts                                          │
│                                                              │
│  ┌─ Instagram ──────────────────────────────────────────┐   │
│  │  📷 Status: ✅ Connected                              │   │
│  │  Account: @digital_nomad                              │   │
│  │  Type: Business/Creator Account (required)            │   │
│  │  Connected via: Meta Graph API                        │   │
│  │  Permissions: publish_content, read_insights          │   │
│  │  Last sync: 2 minutes ago                             │   │
│  │  [🔄 Reconnect] [❌ Disconnect]                      │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─ Twitter/X ──────────────────────────────────────────┐   │
│  │  🐦 Status: ✅ Connected                              │   │
│  │  Account: @digital_nomad_id                           │   │
│  │  Connected via: Twitter OAuth 2.0                     │   │
│  │  Permissions: tweet.write, tweet.read, users.read     │   │
│  │  [🔄 Reconnect] [❌ Disconnect]                      │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─ TikTok ────────────────────────────────────────────┐   │
│  │  🎵 Status: ⚪ Not Connected                          │   │
│  │  [🔗 Connect TikTok Account]                         │   │
│  │  Note: Requires TikTok Business Account               │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─ Threads ───────────────────────────────────────────┐   │
│  │  🧵 Status: ⚪ Not Connected                          │   │
│  │  [🔗 Connect Threads Account]                        │   │
│  │  Note: Requires Instagram account linked to Threads   │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─ Facebook Page ──────────────────────────────────────┐   │
│  │  📘 Status: ⚪ Not Connected                          │   │
│  │  [🔗 Connect Facebook Page]                          │   │
│  │  Note: Requires Facebook Page (not personal profile)  │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 7.3 OAuth Connection Flow (per platform)

```
[User clicks "Connect Instagram"]
       ↓
[Redirect to Meta OAuth]
  - App requests permissions:
    pages_show_list, instagram_basic,
    instagram_content_publish,
    instagram_manage_insights
       ↓
[User authorizes on Meta]
       ↓
[Callback to /api/auth/callback/instagram]
  - Exchange code for long-lived token (60 days)
  - Store encrypted token in connected_accounts table
  - Fetch account info (username, profile pic, follower count)
       ↓
[Redirect back to Settings page with ✅ Connected]

--- Token Refresh (Background Job) ---
[Supabase Edge Function cron: daily]
  - Check all tokens expiring within 7 days
  - Auto-refresh long-lived tokens
  - If refresh fails → mark account as "needs_reconnect"
  - Send email notification to user
```

### 7.4 Schedule & Publish Flow

```
[Content in Calendar with status "Scheduled"]
       ↓
[Supabase Edge Function: runs every minute]
  - Query: content WHERE status = 'scheduled'
    AND scheduled_date = today AND scheduled_time <= now()
       ↓
[For each content item:]
  1. Fetch platform credentials from connected_accounts
  2. Check token validity
  3. Prepare platform-specific payload:
     ├── Instagram: image + caption (max 2200 chars)
     ├── Threads: text post (max 500 chars) + optional image/link
     ├── Twitter: text (max 280 chars) or thread (multiple tweets)
     ├── TikTok: video + description (max 2200 chars)
     ├── YouTube Shorts: video (max 60s) + title + description
     └── Facebook: text + image/link
  4. Upload media (if any) via platform API
  5. Publish via platform API
       ↓
[On Success:]
  - Update content status → "published"
  - Store published_url, published_at
  - Log to publish_history
       ↓
[On Failure:]
  - Update content status → "failed"
  - Store error message
  - Send notification to user (in-app + email)
  - Auto-retry up to 3 times with exponential backoff
```

### 7.5 UI Screen: Publish Preview Modal

```
┌─ Preview & Publish ──────────────────────────────────────────┐
│                                                              │
│  Publish to: ☑ Instagram  ☑ Twitter  ☑ Threads               │
│              ☐ TikTok  ☐ YouTube Shorts  ☐ Facebook          │
│                                                              │
│  ┌─ Instagram Preview ────┐  ┌─ Twitter Preview ──────────┐│
│  │ ┌──────────────────┐   │  │                             ││
│  │ │  [Product Image]  │   │  │ @digital_nomad_id          ││
│  │ │                   │   │  │                             ││
│  │ └──────────────────┘   │  │ 🔥 Punya App Keuangan      ││
│  │                         │  │ Pribadi Sendiri — GRATIS!   ││
│  │ ❤️ 💬 📤 🔖            │  │                             ││
│  │                         │  │ Setup cuma 15 menit,       ││
│  │ digital_nomad           │  │ tanpa coding sama sekali.  ││
│  │ 🔥 Punya App Keuangan  │  │                             ││
│  │ Pribadi Sendiri —       │  │ Link: mkt.link/karaya-tw   ││
│  │ GRATIS Selamanya!       │  │                             ││
│  │                         │  │ 🧵 1/1                     ││
│  │ Bayangkan punya app...  │  │                             ││
│  │                         │  │ Char: 247/280 ✅           ││
│  │ #keuanganpribadi #free  │  └─────────────────────────────┘│
│  │                         │                                 │
│  │ Char: 1,847/2,200 ✅   │  ⚠️ Twitter version is auto-  │
│  └─────────────────────────┘  shortened. [Edit manually]     │
│                                                              │
│  Schedule: [📅 Apr 10, 2026] [🕐 12:00 WIB]                │
│  OR: [Publish Now]                                           │
│                                                              │
│  [Cancel]                         [✅ Schedule Publishing]   │
└──────────────────────────────────────────────────────────────┘
```

### 7.6 Cross-Post Content Adaptation (AI-Powered)

```javascript
// Ketika user pilih cross-post ke multiple platforms
// AI auto-adapts content per platform

const PLATFORM_RULES = {
  instagram: {
    max_caption: 2200,
    hashtags: true,       // append hashtags
    link_in_caption: false, // IG doesn't support clickable links
    cta: "Link di bio 👆",
    media_required: true,
    format: "full_caption"
  },
  twitter: {
    max_caption: 280,
    hashtags: false,      // save chars, skip hashtags
    link_in_caption: true,
    cta: null,            // link IS the CTA
    media_required: false,
    format: "thread_if_long" // auto-split to thread if > 280
  },
  tiktok: {
    max_caption: 2200,
    hashtags: true,
    link_in_caption: false,
    cta: "Link di bio!",
    media_required: true, // video only
    format: "short_punchy"
  },
  threads: {
    max_caption: 500,
    hashtags: true,       // Threads supports hashtags
    link_in_caption: true,
    cta: null,            // link in post body
    media_required: false,
    format: "conversational_short"
  },
  youtube_shorts: {
    max_caption: 100,     // title max 100 chars
    max_description: 5000,
    hashtags: true,
    link_in_caption: true, // link in description
    cta: "Subscribe & like!",
    media_required: true, // video only, max 60 seconds
    format: "short_punchy"
  },
  facebook: {
    max_caption: 63206,
    hashtags: false,      // minimal hashtags on FB
    link_in_caption: true,
    cta: null,
    media_required: false,
    format: "conversational"
  }
};

// AI Prompt for cross-post adaptation
const ADAPT_PROMPT = `
Adapt konten berikut untuk {{platform}}.
Rules: max {{max_chars}} karakter, {{hashtag_rule}}, {{link_rule}}.
Tone tetap sama. Jangan ubah pesan utama.

Original:
{{original_caption}}

Output hanya caption yang sudah diadaptasi, tanpa penjelasan.
`;
```

### 7.7 Acceptance Criteria

| ID | Criteria |
|----|----------|
| AC-AP-01 | OAuth flow berhasil connect Instagram Business/Creator account via Meta Graph API |
| AC-AP-02 | OAuth flow berhasil connect Twitter/X via OAuth 2.0 PKCE |
| AC-AP-11 | OAuth flow berhasil connect Threads via Threads API (Meta OAuth scope: threads_basic, threads_content_publish, threads_manage_insights) |
| AC-AP-12 | OAuth flow berhasil connect YouTube via Google OAuth (scope: youtube.upload, youtube.readonly) — untuk YouTube Shorts upload |
| AC-AP-03 | Token disimpan encrypted di database, auto-refresh sebelum expired |
| AC-AP-04 | Preview menampilkan mock-up akurat per platform (char count, layout) |
| AC-AP-05 | Scheduled content auto-publish pada waktu yang ditentukan (toleransi ±1 menit) |
| AC-AP-06 | Cross-post mengadaptasi caption per platform rules (panjang, hashtag, link) |
| AC-AP-07 | Publish gagal → status "failed" + error message + notifikasi user |
| AC-AP-08 | Auto-retry 3x dengan backoff: 1 min, 5 min, 15 min |
| AC-AP-09 | Publish history menampilkan: tanggal, platform, status, link post, error (jika ada) |
| AC-AP-10 | Disconnect account menghapus token dan menghentikan scheduled posts untuk platform itu |

### 7.8 Database Schema

```sql
-- CONNECTED ACCOUNTS
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
  metadata JSONB, -- follower count, page id, etc
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  last_sync_at TIMESTAMPTZ,
  UNIQUE(user_id, platform)
);

-- PUBLISH HISTORY
CREATE TABLE publish_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content_id UUID REFERENCES content_calendar(id) ON DELETE SET NULL,
  platform TEXT NOT NULL,
  platform_post_id TEXT, -- ID dari platform (untuk fetch engagement nanti)
  published_url TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','publishing','published','failed')),
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  payload JSONB, -- apa yang dikirim ke API
  response JSONB, -- response dari API
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PUBLISH QUEUE (for retry mechanism)
CREATE TABLE publish_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  publish_history_id UUID REFERENCES publish_history(id) ON DELETE CASCADE,
  next_retry_at TIMESTAMPTZ NOT NULL,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 7.9 API Endpoints

```
-- OAuth
GET    /api/connect/:platform          → Redirect to OAuth provider
GET    /api/connect/:platform/callback → Handle OAuth callback
DELETE /api/connect/:platform          → Disconnect account

-- Connected Accounts
GET    /api/connected-accounts         → List all connected accounts
GET    /api/connected-accounts/:platform → Get specific account status

-- Publishing
POST   /api/publish                    → Publish content now
POST   /api/publish/schedule           → Schedule content for later
GET    /api/publish/history            → List publish history (paginated)
POST   /api/publish/:id/retry         → Manual retry failed publish

-- Preview
POST   /api/publish/preview            → Generate platform-specific preview
POST   /api/publish/adapt              → AI-adapt content for target platform
```

---

## Module 8: A/B Testing Engine

### 8.1 User Stories

| ID | Story | Priority |
|----|-------|----------|
| AB-01 | Sebagai creator, saya ingin membuat 2-3 variasi caption dan test mana yang perform lebih baik | P1 |
| AB-02 | Sebagai creator, saya ingin A/B test headline ad copy sebelum scaling budget | P1 |
| AB-03 | Sebagai creator, saya ingin melihat hasil A/B test (clicks, engagement) secara side-by-side | P1 |
| AB-04 | Sebagai creator, saya ingin AI merekomendasikan pemenang berdasarkan data | P2 |
| AB-05 | Sebagai creator, saya ingin A/B test landing page link (link rotator) | P1 |

### 8.2 A/B Test Types

```
TYPE 1: Content A/B Test
─────────────────────────
- Buat 2-3 variasi caption/carousel untuk topik yang sama
- Post variasi berbeda di waktu berbeda (atau hari berbeda)
- Track: clicks (via smart link), saves, comments (manual input)
- Winner: variasi dengan CTR tertinggi

TYPE 2: Ad Copy A/B Test
─────────────────────────
- Buat 2-3 variasi ad copy (headline + body)
- Kirim ke Meta/TikTok Ads sebagai ad set berbeda
- Track: CTR, CPC, conversions (via Ads API)
- Winner: variasi dengan ROAS tertinggi

TYPE 3: Link A/B Test (Rotator)
─────────────────────────
- 1 short link → rotate antara 2-3 destination URLs
- Contoh: mkt.link/karaya → 50% ke lynk.id, 50% ke landing page
- Track: clicks + conversions per destination
- Winner: URL dengan conversion rate tertinggi
```

### 8.3 UI Screen: A/B Test Dashboard (`/ab-tests`)

```
┌─────────────────────────────────────────────────────────────┐
│                  │  🧪 A/B Tests                [+ New Test] │
│  SIDEBAR         │                                           │
│                  │  ┌─ Active Tests ─────────────────────┐  │
│                  │  │                                     │  │
│                  │  │  🧪 Caption Test: App Keuangan      │  │
│                  │  │  Type: Content · Status: Running     │  │
│                  │  │  Started: 3 days ago · Ends: 4 days  │  │
│                  │  │                                     │  │
│                  │  │  ┌─────────┐  VS  ┌─────────┐      │  │
│                  │  │  │ VAR A   │      │ VAR B   │      │  │
│                  │  │  │ 487     │      │ 312     │      │  │
│                  │  │  │ clicks  │      │ clicks  │      │  │
│                  │  │  │ CTR 3.2%│      │ CTR 2.1%│      │  │
│                  │  │  │ ████████│      │ █████░░░│      │  │
│                  │  │  └─────────┘      └─────────┘      │  │
│                  │  │                                     │  │
│                  │  │  🏆 Leader: Variasi A (+52% clicks) │  │
│                  │  │  Confidence: 87%                     │  │
│                  │  │  [📊 Details] [🏆 Pick Winner]      │  │
│                  │  │                                     │  │
│                  │  └─────────────────────────────────────┘  │
│                  │                                           │
│                  │  ┌─ Link Rotator Test ─────────────────┐  │
│                  │  │  🔗 Link: mkt.link/karaya            │  │
│                  │  │  Split: 50/50                         │  │
│                  │  │                                       │  │
│                  │  │  URL A: lynk.id/digital_nomad/...     │  │
│                  │  │  → 234 clicks · 12 purchases          │  │
│                  │  │                                       │  │
│                  │  │  URL B: karaya-landing.vercel.app     │  │
│                  │  │  → 201 clicks · 18 purchases          │  │
│                  │  │                                       │  │
│                  │  │  🏆 URL B wins on conversions (+50%)  │  │
│                  │  │  [Apply Winner] [Stop Test]           │  │
│                  │  └─────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 8.4 Link Rotator Logic

```javascript
// Edge Function: /r/:slug (updated from Phase 1)
export async function handleRedirect(slug) {
  const link = await getSmartLink(slug);

  // Check if link has active A/B test
  const abTest = await getActiveABTest(link.id);

  if (abTest) {
    // Weighted random selection
    const variant = selectVariant(abTest.variants);
    // variant = { id, destination_url, weight }

    // Log click with variant info
    await logClick(link.id, {
      variant_id: variant.id,
      ...parseUserAgent(),
      ...geoLookup()
    });

    return redirect(variant.destination_url);
  }

  // Normal redirect (no A/B test)
  await logClick(link.id, { ...parseUserAgent(), ...geoLookup() });
  return redirect(link.destination_url);
}

function selectVariant(variants) {
  // variants = [{ id, url, weight: 50 }, { id, url, weight: 50 }]
  const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0);
  let random = Math.random() * totalWeight;
  for (const v of variants) {
    random -= v.weight;
    if (random <= 0) return v;
  }
  return variants[0];
}
```

### 8.5 Statistical Significance Calculator

```javascript
// Calculate if A/B test result is statistically significant
function calculateSignificance(varA, varB) {
  // varA = { impressions: 1000, clicks: 50 }
  // varB = { impressions: 1000, clicks: 35 }

  const rateA = varA.clicks / varA.impressions;
  const rateB = varB.clicks / varB.impressions;

  const pooledRate = (varA.clicks + varB.clicks) / (varA.impressions + varB.impressions);
  const se = Math.sqrt(pooledRate * (1 - pooledRate) * (1/varA.impressions + 1/varB.impressions));
  const zScore = (rateA - rateB) / se;

  // Two-tailed test
  const pValue = 2 * (1 - normalCDF(Math.abs(zScore)));
  const confidence = (1 - pValue) * 100;

  return {
    winner: rateA > rateB ? 'A' : 'B',
    confidence: Math.round(confidence),
    isSignificant: confidence >= 95, // 95% confidence threshold
    uplift: Math.round(((Math.max(rateA, rateB) / Math.min(rateA, rateB)) - 1) * 100)
  };
}
```

### 8.6 Database Schema

```sql
-- A/B TESTS
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
  settings JSONB, -- { auto_pick_winner: true, min_confidence: 95, min_sample: 100 }
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- A/B TEST VARIANTS
CREATE TABLE ab_test_variants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  test_id UUID REFERENCES ab_tests(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL, -- "Variasi A", "Variasi B"
  content_id UUID REFERENCES content_calendar(id) ON DELETE SET NULL,
  link_id UUID REFERENCES smart_links(id) ON DELETE SET NULL,
  destination_url TEXT, -- for link rotator
  weight INTEGER DEFAULT 50, -- percentage
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

# Sprint 9-10: Ads Manager (Minggu 3-4)

---

## Module 9: Ads Manager

### 9.1 User Stories

| ID | Story | Priority |
|----|-------|----------|
| AD-01 | Sebagai creator, saya ingin melihat semua campaign Meta Ads saya di satu dashboard | P0 |
| AD-02 | Sebagai creator, saya ingin membuat campaign Meta Ads baru langsung dari platform | P0 |
| AD-03 | Sebagai creator, saya ingin menggunakan ad copy yang sudah di-generate AI sebagai creative ads | P0 |
| AD-04 | Sebagai creator, saya ingin melihat spend, CTR, CPC, dan ROAS per campaign | P0 |
| AD-05 | Sebagai creator, saya ingin set budget harian dan menerima alert jika mendekati limit | P0 |
| AD-06 | Sebagai creator, saya ingin pause/resume campaign dari dashboard | P1 |
| AD-07 | Sebagai creator, saya ingin menyimpan audience segments untuk reuse | P1 |
| AD-08 | Sebagai creator, saya ingin melihat iklan kompetitor via Meta Ad Library | P2 |
| AD-09 | Sebagai creator, saya ingin auto-generate UTM untuk setiap ad | P0 |
| AD-10 | Sebagai creator, saya ingin notifikasi jika ada campaign dengan ROAS di bawah threshold | P1 |

### 9.2 UI Screen: Ads Dashboard (`/ads`)

```
┌──────────────────────────────────────────────────────────────┐
│                  │ 📢 Ads Manager         [+ New Campaign]   │
│  SIDEBAR         │                                           │
│                  │ Overview (Last 7 days)                     │
│                  │ ┌────────┐ ┌────────┐ ┌────────┐ ┌──────┐│
│                  │ │Rp 850K │ │  2.1%  │ │ Rp 402 │ │ 3.2x ││
│                  │ │ Spent  │ │  CTR   │ │  CPC   │ │ ROAS ││
│                  │ │+12% ↑  │ │+0.3% ↑ │ │-8% ↓  │ │+0.5 ↑││
│                  │ └────────┘ └────────┘ └────────┘ └──────┘│
│                  │                                           │
│                  │ ┌─ Spend Trend ────────────────────────┐  │
│                  │ │ [Line chart: daily spend vs revenue]  │  │
│                  │ │  ─── Spend  ─── Revenue               │  │
│                  │ └──────────────────────────────────────┘  │
│                  │                                           │
│                  │ ┌─ Active Campaigns ───────────────────┐  │
│                  │ │                                       │  │
│                  │ │ 📢 Karaya Finance - Awareness         │  │
│                  │ │ Meta Ads · Running · Budget Rp 50K/d  │  │
│                  │ │ Spent: Rp 350K · Reach: 15,200        │  │
│                  │ │ Clicks: 487 · CTR: 3.2% · ROAS: 4.1x │  │
│                  │ │ ████████████████████░░░░ 70% budget    │  │
│                  │ │ [⏸ Pause] [📊 Details] [✏️ Edit]     │  │
│                  │ │                                       │  │
│                  │ │ 📢 Karaya Finance - Retarget           │  │
│                  │ │ Meta Ads · Running · Budget Rp 30K/d  │  │
│                  │ │ Spent: Rp 180K · Reach: 3,400          │  │
│                  │ │ Clicks: 156 · CTR: 4.6% · ROAS: 5.8x │  │
│                  │ │ ████████████████░░░░░░░░ 60% budget    │  │
│                  │ │ [⏸ Pause] [📊 Details] [✏️ Edit]     │  │
│                  │ │                                       │  │
│                  │ │ ⚠️ Karaya - Broad Audience             │  │
│                  │ │ Meta Ads · Running · Budget Rp 50K/d  │  │
│                  │ │ ⚠️ ROAS: 0.8x — below 1.0 threshold  │  │
│                  │ │ [⏸ Pause] [📊 Details] [🗑️ Stop]     │  │
│                  │ │                                       │  │
│                  │ └─────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

### 9.3 Campaign Creation Flow

```
Step 1: Campaign Setup
├── Campaign Name: [________________________]
├── Platform: ○ Meta (Instagram + Facebook)  ○ TikTok  ○ Google
├── Objective:
│   ├── 🔍 Awareness (reach, impressions)
│   ├── 🖱️ Traffic (link clicks)
│   ├── 💰 Conversion (purchases)
│   └── 🔄 Retargeting (past visitors)
└── [Next →]

Step 2: Audience
├── ┌─ Saved Audiences ─────────────────────────┐
│   │ [Indo Males 25-34 Tech] [Indo Females 20-30] │
│   └──────────────────────────────────────────────┘
├── Location: [Indonesia ▼] [Jakarta, Bandung, Surabaya]
├── Age: [20] to [35]
├── Gender: ○ All ○ Male ○ Female
├── Interests: [+ Add Interest]
│   ├── 💰 Personal Finance
│   ├── 💻 Technology
│   ├── 📱 Mobile Apps
│   └── 🏠 No-Code/Low-Code
├── [Save Audience] for reuse
└── [Next →]

Step 3: Budget & Schedule
├── Daily Budget: [Rp 50,000]
├── Duration: ○ Ongoing  ○ Set end date [________]
├── Total Budget Limit: [Rp 500,000] (optional)
├── Bid Strategy: ○ Lowest Cost (auto) ○ Cost Cap [Rp ___]
└── [Next →]

Step 4: Creative
├── ┌─ From AI Generator ────────────────────────┐
│   │ Import ad copy from Content Generator?       │
│   │ [📂 Browse Generated Ad Copies]              │
│   └──────────────────────────────────────────────┘
├── OR create manually:
├── Primary Text: [________________________________]
├── Headline: [________________________________]
├── Description: [________________________________]
├── CTA Button: [Pelajari Selengkapnya ▼]
├── Media: [Upload Image/Video] or [Pick from Assets]
├── Destination URL: [________________________________]
├── UTM: (auto-generated) ✅
│   utm_source=meta&utm_medium=paid&utm_campaign={{name}}
├── [+ Add Variation] (for A/B test)
└── [Next →]

Step 5: Review & Launch
├── Campaign summary card
├── Estimated reach: 5,000 - 15,000 / day
├── Estimated clicks: 150 - 450 / day
├── [← Back] [Save as Draft] [🚀 Launch Campaign]
└── ⚠️ "Campaign will be submitted to Meta for review"
```

### 9.4 Meta Marketing API Integration

```javascript
// services/meta-ads.js

const META_API_VERSION = 'v19.0';
const META_BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

// Create Campaign
async function createCampaign(accessToken, adAccountId, params) {
  const response = await fetch(
    `${META_BASE_URL}/act_${adAccountId}/campaigns`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: params.name,
        objective: params.objective, // OUTCOME_AWARENESS, OUTCOME_TRAFFIC, OUTCOME_SALES
        status: 'PAUSED', // start paused, user activates
        special_ad_categories: [],
        access_token: accessToken
      })
    }
  );
  return response.json();
}

// Create Ad Set (audience + budget)
async function createAdSet(accessToken, adAccountId, campaignId, params) {
  const response = await fetch(
    `${META_BASE_URL}/act_${adAccountId}/adsets`,
    {
      method: 'POST',
      body: JSON.stringify({
        campaign_id: campaignId,
        name: params.name,
        daily_budget: params.daily_budget * 100, // in cents
        billing_event: 'IMPRESSIONS',
        optimization_goal: params.optimization_goal,
        targeting: {
          geo_locations: { countries: params.countries },
          age_min: params.age_min,
          age_max: params.age_max,
          genders: params.genders,
          interests: params.interests.map(i => ({ id: i.id, name: i.name }))
        },
        status: 'PAUSED',
        access_token: accessToken
      })
    }
  );
  return response.json();
}

// Fetch Campaign Insights
async function getCampaignInsights(accessToken, campaignId, dateRange) {
  const response = await fetch(
    `${META_BASE_URL}/${campaignId}/insights?` +
    `fields=spend,impressions,clicks,ctr,cpc,actions,cost_per_action_type` +
    `&time_range=${JSON.stringify(dateRange)}` +
    `&access_token=${accessToken}`
  );
  return response.json();
}
```

### 9.5 Database Schema

```sql
-- ADS CAMPAIGNS
CREATE TABLE ads_campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('meta','tiktok','google')),
  platform_campaign_id TEXT, -- ID dari platform ads
  name TEXT NOT NULL,
  objective TEXT NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','pending_review','active','paused','completed','rejected')),
  daily_budget INTEGER, -- in IDR
  total_budget_limit INTEGER,
  start_date DATE,
  end_date DATE,
  audience JSONB, -- full targeting config
  saved_audience_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AD CREATIVES
CREATE TABLE ad_creatives (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES ads_campaigns(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  platform_creative_id TEXT,
  primary_text TEXT,
  headline TEXT,
  description TEXT,
  cta_type TEXT,
  media_url TEXT,
  destination_url TEXT,
  utm_params JSONB,
  generation_id UUID REFERENCES generation_history(id), -- link to AI-generated copy
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ADS INSIGHTS (synced daily)
CREATE TABLE ads_insights_daily (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES ads_campaigns(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  spend INTEGER DEFAULT 0, -- IDR
  impressions INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  ctr DECIMAL(5,2) DEFAULT 0,
  cpc INTEGER DEFAULT 0, -- IDR
  conversions INTEGER DEFAULT 0,
  conversion_value INTEGER DEFAULT 0, -- IDR
  roas DECIMAL(5,2) DEFAULT 0,
  raw_data JSONB, -- full API response
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(campaign_id, date)
);

-- SAVED AUDIENCES
CREATE TABLE saved_audiences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  targeting JSONB NOT NULL, -- { countries, age_min, age_max, genders, interests }
  estimated_reach TEXT,
  used_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- BUDGET ALERTS
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
```

---

## Module 10: Competitor Spy

### 10.1 User Stories

| ID | Story | Priority |
|----|-------|----------|
| CS-01 | Sebagai creator, saya ingin melihat iklan yang dijalankan kompetitor di Meta Ad Library | P2 |
| CS-02 | Sebagai creator, saya ingin save inspirasi iklan kompetitor ke swipe file | P2 |
| CS-03 | Sebagai creator, saya ingin AI menganalisa ad copy kompetitor dan suggest improvement | P2 |

### 10.2 UI Screen: Competitor Spy (`/ads/competitor`)

```
┌─────────────────────────────────────────────────────────────┐
│                  │ 🔍 Competitor Ad Spy                      │
│  SIDEBAR         │                                           │
│                  │ Search: [nama brand/page ___________] [🔍]│
│                  │                                           │
│                  │ Results for "aplikasi keuangan"            │
│                  │                                           │
│                  │ ┌─────────────────────────────────────┐   │
│                  │ │ 📢 Brand: KeuanganKu App             │   │
│                  │ │ Active Ads: 5 · Running since: Mar 26│   │
│                  │ │                                       │   │
│                  │ │ ┌─ Ad 1 ──────────────────────────┐  │   │
│                  │ │ │ [Ad Image Preview]                │  │   │
│                  │ │ │ "Atur keuanganmu lebih mudah..."  │  │   │
│                  │ │ │ Platform: IG + FB                 │  │   │
│                  │ │ │ [💾 Save] [🤖 AI Analyze]        │  │   │
│                  │ │ └──────────────────────────────────┘  │   │
│                  │ │                                       │   │
│                  │ │ ┌─ Ad 2 ──────────────────────────┐  │   │
│                  │ │ │ [Ad Image Preview]                │  │   │
│                  │ │ │ "Gratis 30 hari trial..."         │  │   │
│                  │ │ │ [💾 Save] [🤖 AI Analyze]        │  │   │
│                  │ │ └──────────────────────────────────┘  │   │
│                  │ └─────────────────────────────────────┘   │
│                  │                                           │
│                  │ ── Swipe File (Saved) ──                  │
│                  │ 12 saved ads · [View All →]               │
└─────────────────────────────────────────────────────────────┘
```

### 10.3 AI Analyze Competitor Ad Prompt

```
Analisa ad copy kompetitor berikut:

AD COPY:
"{{competitor_ad_text}}"

PLATFORM: {{platform}}
INDUSTRY: {{niche}}

Berikan analisa:
1. Hook strength (1-10): seberapa kuat kalimat pembuka
2. Value proposition: apa yang mereka tawarkan
3. CTA clarity (1-10): seberapa jelas ajakan bertindak
4. Emotional triggers: emosi apa yang digunakan
5. Weaknesses: kelemahan ad copy ini
6. Suggestion: bagaimana kamu bisa buat versi yang lebih baik untuk brand {{brand.name}}

Output JSON format.
```

---

# Sprint 11-12: CRM & Lead Management (Minggu 5-6)

---

## Module 11: CRM & Contact Management

### 11.1 User Stories

| ID | Story | Priority |
|----|-------|----------|
| CR-01 | Sebagai seller, saya ingin menyimpan database semua pembeli (nama, email, phone, produk dibeli) | P1 |
| CR-02 | Sebagai seller, saya ingin mengirim email broadcast ke semua pembeli atau segmen tertentu | P1 |
| CR-03 | Sebagai seller, saya ingin template WA follow-up otomatis setelah pembelian | P1 |
| CR-04 | Sebagai seller, saya ingin melihat customer journey: kapan pertama klik, kapan beli, repeat? | P2 |
| CR-05 | Sebagai seller, saya ingin auto-import buyer data dari lynk.id webhook | P1 |
| CR-06 | Sebagai seller, saya ingin tag/segment contacts (buyer, lead, VIP, churned) | P1 |
| CR-07 | Sebagai seller, saya ingin auto-send request review setelah 3 hari pembelian | P1 |
| CR-08 | Sebagai seller, saya ingin generate email sequence (3-5 email nurturing) untuk produk tertentu menggunakan AI | P1 |
| CR-09 | Sebagai seller, saya ingin setup automated email sequence yang terkirim otomatis berdasarkan trigger (purchase, signup, inactivity) | P1 |

### 11.2 UI Screen: CRM Dashboard (`/crm`)

```
┌──────────────────────────────────────────────────────────────┐
│                  │ 👥 CRM                    [+ Add Contact]  │
│  SIDEBAR         │                                           │
│                  │ ┌────────┐ ┌────────┐ ┌────────┐ ┌──────┐│
│                  │ │   47   │ │   32   │ │  Rp3.1M│ │  12  ││
│                  │ │Contacts│ │ Buyers │ │Revenue │ │Leads ││
│                  │ └────────┘ └────────┘ └────────┘ └──────┘│
│                  │                                           │
│                  │ Segments: [All ▼] [Buyers] [Leads] [VIP]  │
│                  │ Search: [🔍 ________________________________]│
│                  │                                           │
│                  │ ┌─ Contact List ───────────────────────┐  │
│                  │ │ ☐  Name          Email       Tags    │  │
│                  │ │ ──────────────────────────────────── │  │
│                  │ │ ☐  Rina S.      rina@...    🟢buyer │  │
│                  │ │     Karaya Finance · 5 Apr 2026      │  │
│                  │ │     Last activity: 2 days ago        │  │
│                  │ │                                       │  │
│                  │ │ ☐  Budi P.      budi@...    🟡lead  │  │
│                  │ │     Clicked link 3x · No purchase     │  │
│                  │ │     Last activity: 1 day ago          │  │
│                  │ │                                       │  │
│                  │ │ ☐  Doni A.      doni@...    🟣VIP   │  │
│                  │ │     2 products bought · Rp 148K       │  │
│                  │ │     Last activity: today               │  │
│                  │ └─────────────────────────────────────┘  │
│                  │                                           │
│                  │ Selected: 3  [📧 Email] [📱 WA] [🏷 Tag] │
└──────────────────────────────────────────────────────────────┘
```

### 11.3 Lynk.id Webhook Integration

```javascript
// Supabase Edge Function: /api/webhook/lynkid
// Called when a purchase is made on lynk.id

export async function handleLynkidWebhook(request) {
  const payload = await request.json();

  // Expected payload from lynk.id:
  // {
  //   event: "order.completed",
  //   order_id: "...",
  //   buyer_name: "Rina",
  //   buyer_email: "rina@example.com",
  //   buyer_phone: "+628123456789",
  //   product_name: "Panduan Karaya Finance",
  //   product_price: 99000,
  //   paid_at: "2026-04-05T12:30:00Z"
  // }

  // 1. Upsert contact
  const contact = await upsertContact({
    email: payload.buyer_email,
    name: payload.buyer_name,
    phone: payload.buyer_phone,
    source: 'lynkid',
    tags: ['buyer']
  });

  // 2. Log purchase
  await createPurchaseRecord({
    contact_id: contact.id,
    product_name: payload.product_name,
    amount: payload.product_price,
    order_id: payload.order_id,
    purchased_at: payload.paid_at
  });

  // 3. Schedule follow-up
  await scheduleFollowUp({
    contact_id: contact.id,
    type: 'thank_you_email',
    send_at: new Date() // immediately
  });

  // 4. Schedule review request (3 days later)
  await scheduleFollowUp({
    contact_id: contact.id,
    type: 'review_request',
    send_at: addDays(new Date(), 3)
  });

  return { success: true };
}
```

### 11.4 Email Broadcast System

```
┌─ Compose Email Broadcast ────────────────────────────────────┐
│                                                              │
│ To: [All Buyers ▼]  (32 contacts)                           │
│     ○ All Contacts (47)                                      │
│     ○ All Buyers (32)                                        │
│     ○ Leads only (12)                                        │
│     ○ VIP (3)                                                │
│     ○ Custom filter...                                       │
│                                                              │
│ From: digital_nomad@email.com                                │
│ Subject: [________________________________]                  │
│ [🤖 AI Suggest Subject Line]                                │
│                                                              │
│ ┌─ Email Body (Rich Text Editor) ────────────────────────┐  │
│ │ B I U  🔗 📷                                            │  │
│ │                                                          │  │
│ │ Hai {{name}},                                            │  │
│ │                                                          │  │
│ │ Terima kasih sudah membeli {{product_name}}!             │  │
│ │                                                          │  │
│ │ Saya baru saja update beberapa fitur baru...            │  │
│ │                                                          │  │
│ │ Variables: {{name}} {{email}} {{product_name}} {{date}}  │  │
│ └──────────────────────────────────────────────────────────┘  │
│                                                              │
│ [Preview] [Send Test to Me] [📧 Send to 32 contacts]       │
└──────────────────────────────────────────────────────────────┘
```

### 11.5 Automated Follow-Up Templates

```javascript
const FOLLOW_UP_TEMPLATES = {
  thank_you_email: {
    delay: 0, // immediate
    subject: "Terima kasih sudah beli {{product_name}}! 🎉",
    body: `Hai {{name}},

Terima kasih sudah membeli {{product_name}}!

Berikut beberapa tips agar kamu bisa langsung mulai:
1. Download file PDF dari email konfirmasi lynk.id
2. Siapkan akun Google untuk sign up ke GitHub, Supabase, dan Vercel
3. Ikuti panduan step by step — estimasi 15-30 menit

Kalau ada pertanyaan, langsung reply email ini ya!

Salam,
@digital_nomad`
  },

  review_request: {
    delay: 3, // 3 days after purchase
    subject: "Gimana pengalamanmu dengan {{product_name}}? ⭐",
    body: `Hai {{name}},

Sudah 3 hari sejak kamu beli {{product_name}}.
Gimana, sudah berhasil setup?

Kalau sudah, boleh minta tolong kasih review singkat?
Cukup reply email ini dengan:
⭐ Rating (1-5)
💬 Pengalaman kamu (1-2 kalimat)

Review kamu sangat membantu creator lain yang masih ragu!

Terima kasih 🙏
@digital_nomad`
  },

  upsell: {
    delay: 7, // 7 days after purchase
    subject: "Ada produk baru yang cocok buat kamu, {{name}}",
    body: `... (promote related product)`
  }
};
```

### 11.6 Database Schema

```sql
-- CONTACTS
CREATE TABLE contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  email TEXT,
  name TEXT,
  phone TEXT,
  source TEXT, -- 'lynkid', 'manual', 'email_signup', 'import'
  tags TEXT[] DEFAULT '{}',
  segment TEXT DEFAULT 'lead' CHECK (segment IN ('lead','buyer','vip','churned')),
  total_spent INTEGER DEFAULT 0,
  purchase_count INTEGER DEFAULT 0,
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, email)
);

-- PURCHASES
CREATE TABLE purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_name TEXT NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT DEFAULT 'IDR',
  order_id TEXT, -- from lynk.id
  source TEXT DEFAULT 'lynkid',
  purchased_at TIMESTAMPTZ DEFAULT NOW()
);

-- FOLLOW-UPS
CREATE TABLE follow_ups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL, -- 'thank_you_email', 'review_request', 'upsell', 'custom'
  channel TEXT NOT NULL CHECK (channel IN ('email','whatsapp')),
  subject TEXT,
  body TEXT,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled','sent','failed','cancelled')),
  send_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- EMAIL BROADCASTS
CREATE TABLE email_broadcasts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  segment_filter JSONB, -- { tags: ['buyer'], segment: 'vip' }
  recipient_count INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  open_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','sending','sent','failed')),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- EMAIL SEQUENCES (AI-generated nurturing)
CREATE TABLE email_sequences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('purchase','signup','inactivity','manual')),
  emails JSONB NOT NULL, -- array of { subject, body, delay_days, order }
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','active','paused')),
  total_enrolled INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TESTIMONIALS (collected via follow-up)
CREATE TABLE testimonials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  reviewer_name TEXT NOT NULL,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  content TEXT NOT NULL,
  product_name TEXT,
  source TEXT DEFAULT 'email', -- 'email', 'manual', 'lynkid'
  is_approved BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 11.7 Email Service Integration (Resend)

```javascript
// services/email.js
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail({ to, subject, body, from }) {
  const response = await resend.emails.send({
    from: from || 'Digital Nomad <noreply@yourdomain.com>',
    to: [to],
    subject: subject,
    html: body,
    tags: [{ name: 'source', value: 'marketing-suite' }]
  });
  return response;
}

export async function sendBroadcast(broadcast, contacts) {
  const results = [];
  for (const contact of contacts) {
    const personalizedBody = broadcast.body
      .replace(/\{\{name\}\}/g, contact.name || 'there')
      .replace(/\{\{email\}\}/g, contact.email)
      .replace(/\{\{product_name\}\}/g, contact.last_product || '');

    const personalizedSubject = broadcast.subject
      .replace(/\{\{name\}\}/g, contact.name || 'there');

    const result = await sendEmail({
      to: contact.email,
      subject: personalizedSubject,
      body: personalizedBody
    });
    results.push(result);

    // Rate limit: 2 emails/second (Resend free tier)
    await sleep(500);
  }
  return results;
}
```

---

# Sprint 13-14: Advanced Analytics & Billing (Minggu 7-8)

---

## Module 12: Advanced Analytics

### 12.1 User Stories

| ID | Story | Priority |
|----|-------|----------|
| AA-01 | Sebagai creator, saya ingin melihat funnel visualization: Impression → Click → Visit → Purchase | P1 |
| AA-02 | Sebagai creator, saya ingin tahu konten/ads mana yang paling banyak generate revenue (attribution) | P1 |
| AA-03 | Sebagai creator, saya ingin melihat audience insights (demografi, device, lokasi) | P1 |
| AA-04 | Sebagai creator, saya ingin set KPI goals dan track progress | P1 |
| AA-05 | Sebagai creator, saya ingin export analytics data ke CSV | P1 |
| AA-06 | Sebagai creator, saya ingin AI memberikan insights & recommendations dari data saya | P2 |

### 12.2 UI Screen: Advanced Analytics (`/analytics`)

```
┌──────────────────────────────────────────────────────────────┐
│                  │ 📊 Analytics         [7d ▼] [Export CSV]  │
│  SIDEBAR         │                                           │
│                  │ Tabs: [Overview] [Funnel] [Attribution]   │
│                  │       [Audience] [Goals]                   │
│                  │                                           │
│                  │ ── Funnel Tab ──                           │
│                  │ ┌─ Conversion Funnel ──────────────────┐  │
│                  │ │                                       │  │
│                  │ │ Impressions    ████████████████ 15,200│  │
│                  │ │                     ↓ 3.2% CTR        │  │
│                  │ │ Link Clicks    █████████░░░░░░    487 │  │
│                  │ │                     ↓ 62% visit       │  │
│                  │ │ Page Visits    ██████░░░░░░░░░    302 │  │
│                  │ │                     ↓ 8.6% buy        │  │
│                  │ │ Purchases      ██░░░░░░░░░░░░░     26 │  │
│                  │ │                                       │  │
│                  │ │ Revenue: Rp 2,574,000                 │  │
│                  │ │ Cost: Rp 850,000                      │  │
│                  │ │ ROAS: 3.03x                           │  │
│                  │ └─────────────────────────────────────┘  │
│                  │                                           │
│                  │ ── Attribution Tab ──                      │
│                  │ ┌─ Revenue by Source ──────────────────┐  │
│                  │ │                                       │  │
│                  │ │  Source          Revenue    %    Conv │  │
│                  │ │  ──────────────────────────────────── │  │
│                  │ │  IG Caption #12  Rp 891K   35%   9   │  │
│                  │ │  Meta Ad Aware   Rp 693K   27%   7   │  │
│                  │ │  Twitter Thread  Rp 495K   19%   5   │  │
│                  │ │  TikTok Reels    Rp 297K   12%   3   │  │
│                  │ │  Direct/Other    Rp 198K    7%   2   │  │
│                  │ └─────────────────────────────────────┘  │
│                  │                                           │
│                  │ ── Goals Tab ──                            │
│                  │ ┌─ Monthly Goals (April 2026) ─────────┐  │
│                  │ │                                       │  │
│                  │ │ 💰 Revenue: Rp 2.5M / Rp 5M  (50%)  │  │
│                  │ │ ████████████░░░░░░░░░░░░░░            │  │
│                  │ │                                       │  │
│                  │ │ 📦 Sales: 26 / 50  (52%)              │  │
│                  │ │ █████████████░░░░░░░░░░░░░            │  │
│                  │ │                                       │  │
│                  │ │ 👥 New Contacts: 47 / 100  (47%)      │  │
│                  │ │ ██████████░░░░░░░░░░░░░░░░            │  │
│                  │ │                                       │  │
│                  │ │ 📝 Content Published: 18 / 30 (60%)   │  │
│                  │ │ ███████████████░░░░░░░░░░░            │  │
│                  │ └─────────────────────────────────────┘  │
│                  │                                           │
│                  │ ── AI Insights ──                          │
│                  │ ┌─────────────────────────────────────┐  │
│                  │ │ 🤖 Weekly Insights (auto-generated)  │  │
│                  │ │                                       │  │
│                  │ │ 1. Caption IG #12 tentang "App Gratis"│  │
│                  │ │    adalah top performer. Buat lebih    │  │
│                  │ │    banyak konten dengan angle serupa.  │  │
│                  │ │                                       │  │
│                  │ │ 2. Meta Ads "Awareness" campaign punya│  │
│                  │ │    ROAS 3x — consider increase budget. │  │
│                  │ │                                       │  │
│                  │ │ 3. Posting jam 12:00 WIB consistently  │  │
│                  │ │    mendapat 2.3x lebih banyak clicks.  │  │
│                  │ └─────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

### 12.3 AI Weekly Insights Prompt

```
Analisa data marketing berikut dan berikan 3-5 actionable insights:

DATA MINGGU INI:
- Total clicks: {{total_clicks}} (vs minggu lalu: {{prev_clicks}})
- Top content: {{top_content_title}} ({{top_clicks}} clicks)
- Worst content: {{worst_content_title}} ({{worst_clicks}} clicks)
- Best platform: {{best_platform}} ({{platform_share}}% traffic)
- Best posting time: {{best_hour}}:00 WIB
- Ad spend: Rp {{ad_spend}} · ROAS: {{roas}}x
- New contacts: {{new_contacts}}
- Purchases: {{purchases}} · Revenue: Rp {{revenue}}
- Content published: {{content_count}} (Pillars: {{pillar_distribution}})

BRAND CONTEXT:
- Monthly goals: Revenue Rp {{goal_revenue}}, Sales {{goal_sales}}
- Progress: {{goal_progress}}%

Berikan insights dalam format:
1. [INSIGHT] — penjelasan singkat + rekomendasi aksi spesifik
Gunakan data nyata dari di atas. Jangan generik.
Output JSON array.
```

### 12.4 Database Schema

```sql
-- GOALS
CREATE TABLE goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  month DATE NOT NULL, -- first day of month
  metric TEXT NOT NULL CHECK (metric IN ('revenue','sales','contacts','content','clicks','followers')),
  target_value INTEGER NOT NULL,
  current_value INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, brand_id, month, metric)
);

-- AI INSIGHTS LOG
CREATE TABLE ai_insights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  insights JSONB NOT NULL, -- array of insight objects
  input_data JSONB, -- data yang dipakai AI untuk generate
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Module 13: Billing & Subscription

### 13.1 User Stories

| ID | Story | Priority |
|----|-------|----------|
| BL-01 | Sebagai user, saya ingin upgrade dari Free ke Creator/Pro/Agency plan | P0 |
| BL-02 | Sebagai user, saya ingin bayar via transfer bank / e-wallet (Midtrans) | P0 |
| BL-03 | Sebagai user, saya ingin melihat invoice & riwayat pembayaran | P1 |
| BL-04 | Sebagai user, saya ingin downgrade / cancel subscription | P1 |
| BL-05 | Sebagai user, saya ingin menerima reminder sebelum subscription diperpanjang | P1 |

### 13.2 Payment Flow (Midtrans)

```
[User clicks "Upgrade to Creator Rp 99K/bulan"]
       ↓
[Frontend creates order via /api/billing/subscribe]
       ↓
[Backend calls Midtrans Snap API]
  - Create transaction:
    order_id: "SUB-{user_id}-{timestamp}"
    gross_amount: 99000
    payment_type: available methods
       ↓
[Return Snap Token to frontend]
       ↓
[Frontend opens Midtrans Snap payment popup]
  - User selects: BCA VA / GoPay / OVO / ShopeePay / etc
  - User completes payment
       ↓
[Midtrans sends webhook to /api/webhook/midtrans]
  - Verify signature
  - If status = "settlement":
    → Update user subscription_tier
    → Set subscription_expires_at = +30 days
    → Create invoice record
    → Send confirmation email
       ↓
[User redirected back to dashboard with new tier active]
```

### 13.3 Feature Gate Logic

```javascript
// hooks/useFeatureGate.js
const TIER_LIMITS = {
  free: {
    ai_generations: 50,
    brands: 1,
    connected_accounts: 0,
    smart_links: 5,
    contacts: 50,
    email_broadcasts: 0,
    ads_manager: false,
    ab_testing: false,
    export_csv: false,
    auto_publish: false,
    weekly_report: false
  },
  creator: {
    ai_generations: -1, // unlimited
    brands: 1,
    connected_accounts: 2, // IG + Twitter
    smart_links: 50,
    contacts: 500,
    email_broadcasts: 4, // per month
    ads_manager: false,
    ab_testing: true,
    export_csv: true,
    auto_publish: true,
    weekly_report: true
  },
  pro: {
    ai_generations: -1,
    brands: 3,
    connected_accounts: 5,
    smart_links: -1, // unlimited
    contacts: 5000,
    email_broadcasts: -1,
    ads_manager: true,
    ab_testing: true,
    export_csv: true,
    auto_publish: true,
    weekly_report: true
  },
  agency: {
    ai_generations: -1,
    brands: -1, // unlimited
    connected_accounts: -1,
    smart_links: -1,
    contacts: -1,
    email_broadcasts: -1,
    ads_manager: true,
    ab_testing: true,
    export_csv: true,
    auto_publish: true,
    weekly_report: true,
    team_seats: 3,
    white_label_report: true
  }
};

export function useFeatureGate(feature) {
  const { user } = useAuth();
  const tier = user.subscription_tier;
  const limit = TIER_LIMITS[tier][feature];

  return {
    hasAccess: limit !== false && limit !== 0,
    limit: limit,
    isUnlimited: limit === -1,
    tier: tier
  };
}
```

### 13.4 Database Schema

```sql
-- SUBSCRIPTIONS
CREATE TABLE subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('free','creator','pro','agency')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active','past_due','cancelled','expired')),
  price INTEGER NOT NULL, -- IDR per month
  started_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  midtrans_subscription_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- INVOICES
CREATE TABLE invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subscription_id UUID REFERENCES subscriptions(id),
  midtrans_order_id TEXT UNIQUE,
  midtrans_transaction_id TEXT,
  amount INTEGER NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','paid','failed','refunded')),
  payment_method TEXT,
  paid_at TIMESTAMPTZ,
  invoice_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Phase 2 — Non-Functional Requirements

### API Rate Limits per Platform

| Platform | Limit | Strategy |
|----------|-------|----------|
| Meta Graph API | 200 calls/user/hour | Queue + batch requests |
| Meta Marketing API | 300 calls/hour/ad account | Cache insights, sync daily |
| Twitter API v2 (Free) | 1,500 tweets/month | Queue + count tracking |
| Twitter API v2 (Basic $100/mo) | 3,000 tweets/month | Upgrade when needed |
| TikTok API | 1,000 calls/day | Queue + daily limit tracking |
| Threads API | 250 posts/user/24h | Queue + count tracking |
| YouTube Data API v3 | 10,000 units/day | Upload = 1600 units, batch sparingly |
| Groq API | 14,400 requests/day | Same as Phase 1 |
| Resend (Free) | 100 emails/day | Batch + queue for broadcasts |
| Resend (Pro $20/mo) | 50,000 emails/month | Upgrade for scale |
| Midtrans | No hard limit | Webhook verification |

### Background Jobs (Supabase Edge Functions / Cron)

| Job | Frequency | Purpose |
|-----|-----------|---------|
| publish_scheduler | Every 1 minute | Check & publish scheduled content |
| token_refresh | Daily 03:00 | Refresh expiring OAuth tokens |
| ads_sync | Daily 06:00 | Sync ad insights from Meta/TikTok |
| analytics_aggregate | Daily 01:00 | Aggregate daily analytics from raw clicks |
| weekly_report | Monday 08:00 | Generate weekly reports |
| ai_insights | Monday 09:00 | Generate AI weekly insights |
| follow_up_sender | Every 5 minutes | Send scheduled follow-ups |
| budget_alert_check | Every 1 hour | Check ad budget thresholds |
| subscription_reminder | Daily 10:00 | Remind users 3 days before expiry |

---

## Phase 2 — Complete API Endpoints Summary

```
── Auto-Publisher ──
GET    /api/connect/:platform
GET    /api/connect/:platform/callback
DELETE /api/connect/:platform
GET    /api/connected-accounts
POST   /api/publish
POST   /api/publish/schedule
POST   /api/publish/preview
POST   /api/publish/adapt
GET    /api/publish/history
POST   /api/publish/:id/retry

── A/B Testing ──
POST   /api/ab-tests
GET    /api/ab-tests
GET    /api/ab-tests/:id
PATCH  /api/ab-tests/:id          (start/pause/complete)
POST   /api/ab-tests/:id/winner   (pick winner)
DELETE /api/ab-tests/:id

── Ads Manager ──
POST   /api/ads/campaigns
GET    /api/ads/campaigns
GET    /api/ads/campaigns/:id
PATCH  /api/ads/campaigns/:id     (pause/resume/update)
DELETE /api/ads/campaigns/:id
GET    /api/ads/campaigns/:id/insights
GET    /api/ads/insights/overview
POST   /api/ads/audiences
GET    /api/ads/audiences
GET    /api/ads/competitor/search

── CRM ──
POST   /api/contacts
GET    /api/contacts
GET    /api/contacts/:id
PATCH  /api/contacts/:id
DELETE /api/contacts/:id
POST   /api/contacts/import       (CSV import)
POST   /api/contacts/tag          (bulk tag)
POST   /api/email/broadcast
GET    /api/email/broadcasts
GET    /api/testimonials
PATCH  /api/testimonials/:id      (approve/feature)

── Webhooks (incoming) ──
POST   /api/webhook/lynkid
POST   /api/webhook/midtrans
POST   /api/webhook/meta          (ad status updates)

── Analytics ──
GET    /api/analytics/funnel
GET    /api/analytics/attribution
GET    /api/analytics/audience
GET    /api/analytics/insights     (AI-generated)
POST   /api/goals
GET    /api/goals
PATCH  /api/goals/:id
GET    /api/reports/weekly
GET    /api/reports/weekly/:id/pdf

── Billing ──
POST   /api/billing/subscribe
POST   /api/billing/cancel
GET    /api/billing/subscription
GET    /api/billing/invoices
GET    /api/billing/invoices/:id
```

---

## Phase 2 — Definition of Done

Semua kriteria Phase 1 PLUS:
- [ ] OAuth flow tested end-to-end (connect, publish, disconnect)
- [ ] Auto-publish tested dengan akun real (sandbox mode for ads)
- [ ] Webhook endpoints tested dengan mock payloads
- [ ] Background jobs tested: schedule → execute → verify
- [ ] Rate limiting implemented per platform API
- [ ] Feature gate tested: free user blocked, paid user allowed
- [ ] Payment flow tested end-to-end via Midtrans sandbox
- [ ] Email deliverability tested (not landing in spam)
- [ ] Data privacy: semua token encrypted, IP hashed, PII handled properly
