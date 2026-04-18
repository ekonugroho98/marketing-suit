# Product Requirements Document (PRD)
## Marketing Suite — Phase 3 (Scale & Ecosystem)

**Version:** 1.0
**Date:** 9 April 2026
**Timeline:** 10 Minggu (5 Sprint x 2 Minggu), dimulai setelah Phase 2 stabil
**Prerequisite:** Phase 1 & 2 live, min 50 paying users, core metrics healthy

---

## Phase 3 Overview

| Sprint | Minggu | Module | Fokus |
|--------|--------|--------|-------|
| Sprint 15-16 | 1-2 | Team Collaboration | Multi-user, roles, approval workflow, client workspace |
| Sprint 17-18 | 3-4 | Landing Page Builder | Drag & drop page builder, templates, custom domain |
| Sprint 19-20 | 5-6 | AI Creative Studio | AI image generation, video thumbnail, carousel designer |
| Sprint 21-22 | 7-8 | Integration Hub & Mobile PWA | Zapier-like automations, WA bot, PWA |
| Sprint 23-24 | 9-10 | Affiliate System & Marketplace | Referral program, template marketplace, social listening |

---

# Sprint 15-16: Team Collaboration (Minggu 1-2)

---

## Module 14: Team & Workspace Management

### 14.1 User Stories

| ID | Story | Priority |
|----|-------|----------|
| TM-01 | Sebagai agency owner, saya ingin invite team member ke workspace saya | P0 |
| TM-02 | Sebagai agency owner, saya ingin assign role berbeda (Admin, Editor, Viewer) ke setiap member | P0 |
| TM-03 | Sebagai agency owner, saya ingin membuat workspace terpisah per client/brand | P0 |
| TM-04 | Sebagai editor, saya ingin submit konten untuk approval sebelum publish | P0 |
| TM-05 | Sebagai admin, saya ingin approve/reject konten yang disubmit editor | P0 |
| TM-06 | Sebagai agency owner, saya ingin melihat activity log semua member | P1 |
| TM-07 | Sebagai agency owner, saya ingin generate client-facing report (white-label, tanpa branding suite) | P1 |
| TM-08 | Sebagai team member, saya ingin menerima notifikasi ketika ada konten yang perlu di-review | P1 |
| TM-09 | Sebagai agency owner, saya ingin set content quota per editor (max X konten/minggu) | P2 |
| TM-10 | Sebagai client, saya ingin login ke portal view-only untuk lihat calendar & report brand saya | P2 |

### 14.2 Role & Permission Matrix

```
┌──────────────────────────────────────────────────────────────┐
│ Permission              │ Owner │ Admin │ Editor │ Viewer │ Client │
├─────────────────────────┼───────┼───────┼────────┼────────┼────────┤
│ Manage team & billing   │  ✅   │  ❌   │   ❌   │   ❌   │   ❌   │
│ Manage brands           │  ✅   │  ✅   │   ❌   │   ❌   │   ❌   │
│ Connect social accounts │  ✅   │  ✅   │   ❌   │   ❌   │   ❌   │
│ Create & edit content   │  ✅   │  ✅   │   ✅   │   ❌   │   ❌   │
│ Publish directly        │  ✅   │  ✅   │   ❌   │   ❌   │   ❌   │
│ Submit for approval     │  ✅   │  ✅   │   ✅   │   ❌   │   ❌   │
│ Approve/reject content  │  ✅   │  ✅   │   ❌   │   ❌   │   ❌   │
│ Manage ads campaigns    │  ✅   │  ✅   │   ❌   │   ❌   │   ❌   │
│ View analytics          │  ✅   │  ✅   │   ✅   │   ✅   │   ✅*  │
│ Export reports          │  ✅   │  ✅   │   ❌   │   ❌   │   ❌   │
│ Use AI generator        │  ✅   │  ✅   │   ✅   │   ❌   │   ❌   │
│ Manage CRM/contacts     │  ✅   │  ✅   │   ❌   │   ❌   │   ❌   │
│ View content calendar   │  ✅   │  ✅   │   ✅   │   ✅   │   ✅*  │
│ Upload assets           │  ✅   │  ✅   │   ✅   │   ❌   │   ❌   │
└──────────────────────────────────────────────────────────────┘
* Client hanya lihat data brand yang di-assign ke mereka
```

### 14.3 Approval Workflow

```
[Editor creates content]
       ↓
[Status: "Draft"]
       ↓
[Editor clicks "Submit for Review"]
       ↓
[Status: "Pending Approval"]
  → Notification sent to Admin(s)
  → Content locked from editing by Editor
       ↓
[Admin reviews content]
  ├── [✅ Approve]
  │    → Status: "Approved"
  │    → Editor notified
  │    → Content can be scheduled/published
  │
  ├── [✏️ Request Changes]
  │    → Status: "Changes Requested"
  │    → Admin leaves comment/feedback
  │    → Editor notified + can edit again
  │    → Editor re-submits → back to "Pending Approval"
  │
  └── [❌ Reject]
       → Status: "Rejected"
       → Admin leaves reason
       → Editor notified
```

### 14.4 UI Screen: Team Management (`/settings/team`)

```
┌──────────────────────────────────────────────────────────────┐
│                  │ 👥 Team Management          [+ Invite]    │
│  SIDEBAR         │                                           │
│                  │ Workspace: @digital_nomad Agency           │
│                  │ Plan: Agency (3/5 seats used)             │
│                  │                                           │
│                  │ ┌─ Team Members ───────────────────────┐  │
│                  │ │                                       │  │
│                  │ │ 👤 Eko N. (you)         Owner         │  │
│                  │ │    eko@digital-nomad.com               │  │
│                  │ │    All brands · Last active: now       │  │
│                  │ │                                       │  │
│                  │ │ 👤 Rina S.              Admin         │  │
│                  │ │    rina@team.com                       │  │
│                  │ │    Brands: Karaya, Client A            │  │
│                  │ │    Last active: 2h ago                 │  │
│                  │ │    [Change Role ▼] [Remove]            │  │
│                  │ │                                       │  │
│                  │ │ 👤 Budi P.              Editor        │  │
│                  │ │    budi@team.com                       │  │
│                  │ │    Brands: Client A only               │  │
│                  │ │    Last active: 1d ago                 │  │
│                  │ │    [Change Role ▼] [Remove]            │  │
│                  │ │                                       │  │
│                  │ └─────────────────────────────────────┘  │
│                  │                                           │
│                  │ ┌─ Pending Invites ────────────────────┐  │
│                  │ │ doni@freelancer.com · Editor · 2d ago │  │
│                  │ │ [Resend] [Cancel]                      │  │
│                  │ └─────────────────────────────────────┘  │
│                  │                                           │
│                  │ ┌─ Client Portals ────────────────────┐  │
│                  │ │ [+ Create Client Portal]              │  │
│                  │ │                                       │  │
│                  │ │ 🏢 PT Maju Jaya (Client A)            │  │
│                  │ │    Portal: suite.app/client/maju-jaya  │  │
│                  │ │    Access: Calendar + Reports only     │  │
│                  │ │    [📋 Copy Link] [⚙️ Edit]          │  │
│                  │ └─────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

### 14.5 UI Screen: Content Approval Queue (`/approvals`)

```
┌──────────────────────────────────────────────────────────────┐
│                  │ ✅ Approval Queue              3 pending   │
│  SIDEBAR         │                                           │
│                  │ Filter: [All ▼] [Pending] [Approved]      │
│                  │                                           │
│                  │ ┌─ Pending Approval ───────────────────┐  │
│                  │ │                                       │  │
│                  │ │ 📝 IG Caption: "App Keuangan Gratis"  │  │
│                  │ │ By: Budi P. · Submitted: 2h ago       │  │
│                  │ │ Brand: Karaya Finance · Pillar: Aware  │  │
│                  │ │ Scheduled: Apr 12, 12:00 WIB           │  │
│                  │ │                                       │  │
│                  │ │ ┌── Preview ──────────────────────┐   │  │
│                  │ │ │ 🔥 Punya App Keuangan Pribadi  │   │  │
│                  │ │ │ Sendiri — GRATIS Selamanya!     │   │  │
│                  │ │ │ ...                              │   │  │
│                  │ │ └─────────────────────────────────┘   │  │
│                  │ │                                       │  │
│                  │ │ Comment: [________________________]   │  │
│                  │ │                                       │  │
│                  │ │ [✅ Approve] [✏️ Changes] [❌ Reject]│  │
│                  │ │                                       │  │
│                  │ └─────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

### 14.6 White-Label Client Report

```
┌─ Client Report (White-Label) ────────────────────────────────┐
│                                                              │
│  [Client Logo]                                               │
│  Monthly Marketing Report                                    │
│  Brand: PT Maju Jaya                                         │
│  Period: April 2026                                          │
│  Prepared by: Digital Nomad Agency                           │
│                                                              │
│  ── Executive Summary ──                                     │
│  Content published: 28                                        │
│  Total reach: 45,200                                          │
│  Total clicks: 1,890                                          │
│  New followers: +342                                          │
│  Revenue attributed: Rp 8,500,000                             │
│                                                              │
│  ── Detailed Metrics ──                                      │
│  [Charts, tables, breakdown — same data as analytics]        │
│  [No Marketing Suite branding visible]                        │
│                                                              │
│  ── Recommendations ──                                       │
│  [AI-generated insights]                                      │
│                                                              │
│  [Download PDF] [Share Link]                                 │
└──────────────────────────────────────────────────────────────┘
```

### 14.7 Database Schema

```sql
-- WORKSPACES
CREATE TABLE workspaces (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  logo_url TEXT,
  max_seats INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- WORKSPACE MEMBERS
CREATE TABLE workspace_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner','admin','editor','viewer')),
  brand_access UUID[], -- array of brand_ids they can access, NULL = all
  invited_by UUID REFERENCES auth.users(id),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);

-- WORKSPACE INVITES
CREATE TABLE workspace_invites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  brand_access UUID[],
  invited_by UUID REFERENCES auth.users(id),
  token TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','accepted','expired','cancelled')),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CONTENT APPROVALS
CREATE TABLE content_approvals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content_id UUID REFERENCES content_calendar(id) ON DELETE CASCADE NOT NULL,
  submitted_by UUID REFERENCES auth.users(id) NOT NULL,
  reviewed_by UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','changes_requested','rejected')),
  comment TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);

-- CLIENT PORTALS
CREATE TABLE client_portals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE NOT NULL,
  client_name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  access_token TEXT UNIQUE NOT NULL,
  permissions JSONB DEFAULT '{"calendar":true,"reports":true,"analytics":false}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ACTIVITY LOG
CREATE TABLE activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- 'content.created','content.approved','ads.launched', etc
  resource_type TEXT, -- 'content','campaign','contact','brand'
  resource_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activity_workspace ON activity_log(workspace_id, created_at DESC);
```

---

# Sprint 17-18: Landing Page Builder (Minggu 3-4)

---

## Module 15: Landing Page Builder

### 15.1 User Stories

| ID | Story | Priority |
|----|-------|----------|
| LP-01 | Sebagai creator, saya ingin membuat landing page tanpa coding untuk setiap produk/campaign | P0 |
| LP-02 | Sebagai creator, saya ingin memilih dari template landing page yang sudah ada | P0 |
| LP-03 | Sebagai creator, saya ingin drag & drop section untuk menyusun halaman | P0 |
| LP-04 | Sebagai creator, saya ingin menghubungkan custom domain ke landing page saya | P1 |
| LP-05 | Sebagai creator, saya ingin embed form checkout / link produk di landing page | P0 |
| LP-06 | Sebagai creator, saya ingin melihat analytics per landing page (visitors, conversion rate) | P1 |
| LP-07 | Sebagai creator, saya ingin A/B test 2 versi landing page | P2 |
| LP-08 | Sebagai creator, saya ingin AI generate copy untuk setiap section landing page | P1 |
| LP-09 | Sebagai creator, saya ingin landing page responsive (mobile + desktop) | P0 |
| LP-10 | Sebagai creator, saya ingin duplicate landing page sebagai starting point untuk yang baru | P1 |

### 15.2 Available Section Blocks

```
┌─ Section Library ────────────────────────────────────────────┐
│                                                              │
│  HERO SECTIONS                                               │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐          │
│  │Hero +   │ │Hero +   │ │Hero     │ │Hero +   │          │
│  │Image R  │ │Video BG │ │Centered │ │Form     │          │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘          │
│                                                              │
│  FEATURE SECTIONS                                            │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐                       │
│  │3 Column │ │Features │ │Features │                       │
│  │Features │ │+ Icons  │ │+ Images │                       │
│  └─────────┘ └─────────┘ └─────────┘                       │
│                                                              │
│  SOCIAL PROOF                                                │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐                       │
│  │Testimoni│ │Logo     │ │Stats    │                       │
│  │Carousel │ │Wall     │ │Counter  │                       │
│  └─────────┘ └─────────┘ └─────────┘                       │
│                                                              │
│  CTA / PRICING                                               │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐                       │
│  │CTA      │ │Pricing  │ │Checkout │                       │
│  │Banner   │ │Table    │ │Embed    │                       │
│  └─────────┘ └─────────┘ └─────────┘                       │
│                                                              │
│  CONTENT                                                     │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐          │
│  │FAQ      │ │Image    │ │Video    │ │Countdown│          │
│  │Accordion│ │Gallery  │ │Embed    │ │Timer    │          │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘          │
│                                                              │
│  FOOTER                                                      │
│  ┌─────────┐ ┌─────────┐                                   │
│  │Simple   │ │Footer + │                                   │
│  │Footer   │ │Social   │                                   │
│  └─────────┘ └─────────┘                                   │
└──────────────────────────────────────────────────────────────┘
```

### 15.3 UI Screen: Page Builder (`/pages/:id/edit`)

```
┌──────────────────────────────────────────────────────────────┐
│ [← Back] Page: Karaya Finance Launch    [Preview] [Publish]  │
├──────────┬───────────────────────────────────┬───────────────┤
│          │                                   │               │
│ Sections │   ┌─ HERO ──────────────────┐    │  Properties   │
│          │   │                          │    │               │
│ [+ Add]  │   │  Headline:               │    │ Section: Hero │
│          │   │  "Punya App Keuangan     │    │               │
│ ┌──────┐ │   │   Pribadi — GRATIS!"     │    │ Headline:     │
│ │ Hero │ │   │                          │    │ [__________]  │
│ │ ████ │ │   │  Sub: "Setup 15 menit,   │    │               │
│ └──────┘ │   │   tanpa coding"          │    │ Sub-headline: │
│ ┌──────┐ │   │                          │    │ [__________]  │
│ │Featur│ │   │  [CTA: Beli Sekarang 99K]│    │               │
│ │ ████ │ │   │                          │    │ CTA Text:     │
│ └──────┘ │   │  [Product Image →]       │    │ [__________]  │
│ ┌──────┐ │   └──────────────────────────┘    │               │
│ │Testi │ │                                   │ CTA Link:     │
│ │ ████ │ │   ┌─ FEATURES ─────────────┐     │ [__________]  │
│ └──────┘ │   │ ✅ 13+ fitur lengkap    │     │               │
│ ┌──────┐ │   │ ✅ AI Coach gratis      │     │ BG Color:     │
│ │ CTA  │ │   │ ✅ Harga live saham     │     │ [🎨 #0d1117] │
│ │ ████ │ │   └─────────────────────────┘     │               │
│ └──────┘ │                                   │ Image:        │
│ ┌──────┐ │   ┌─ TESTIMONIALS ──────────┐     │ [📁 Upload]  │
│ │Footer│ │   │ ⭐⭐⭐⭐⭐ "Setup lancar..."│     │               │
│ │ ████ │ │   └─────────────────────────┘     │ [🤖 AI Copy] │
│ └──────┘ │                                   │               │
│          │   ┌─ CTA BANNER ────────────┐     │ Padding:      │
│ [Drag to │   │ "Harga naik kapan saja" │     │ [40]px        │
│  reorder]│   │ [Beli Sekarang →]       │     │               │
│          │   └─────────────────────────┘     │               │
└──────────┴───────────────────────────────────┴───────────────┘
```

### 15.4 Landing Page Data Model

```javascript
// Page structure stored as JSON in database
const PAGE_SCHEMA = {
  id: "uuid",
  title: "Karaya Finance Launch",
  slug: "karaya-finance",
  custom_domain: "buy.karaya.app", // optional
  meta: {
    title: "App Keuangan Pribadi — GRATIS",
    description: "Setup 15 menit, tanpa coding",
    og_image: "https://..."
  },
  global_styles: {
    font_family: "Inter",
    primary_color: "#10b981",
    secondary_color: "#0d1117",
    background_color: "#ffffff"
  },
  sections: [
    {
      id: "section-1",
      type: "hero_image_right",
      order: 1,
      props: {
        headline: "Punya App Keuangan Pribadi — GRATIS!",
        sub_headline: "Setup 15 menit, tanpa coding, gratis selamanya",
        cta_text: "Beli Sekarang Rp 99K",
        cta_link: "https://lynk.id/digital_nomad/n9k79nzyy673",
        image_url: "https://...",
        bg_color: "#0d1117",
        text_color: "#ffffff"
      }
    },
    {
      id: "section-2",
      type: "features_3col",
      order: 2,
      props: {
        title: "Fitur Lengkap",
        features: [
          { icon: "chart", title: "Dashboard", desc: "Total saldo semua rekening" },
          { icon: "trending", title: "Investasi Live", desc: "Harga saham & emas real-time" },
          { icon: "brain", title: "AI Coach", desc: "Saran keuangan personal gratis" }
        ]
      }
    }
    // ... more sections
  ]
};
```

### 15.5 Database Schema

```sql
-- LANDING PAGES
CREATE TABLE landing_pages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  custom_domain TEXT,
  meta JSONB DEFAULT '{}',
  global_styles JSONB DEFAULT '{}',
  sections JSONB NOT NULL DEFAULT '[]',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  template_id UUID REFERENCES page_templates(id),
  visit_count INTEGER DEFAULT 0,
  conversion_count INTEGER DEFAULT 0,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, slug)
);

-- PAGE TEMPLATES
CREATE TABLE page_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT, -- 'product_launch','webinar','lead_magnet','coming_soon'
  thumbnail_url TEXT,
  sections JSONB NOT NULL,
  global_styles JSONB DEFAULT '{}',
  is_premium BOOLEAN DEFAULT false,
  used_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PAGE ANALYTICS
CREATE TABLE page_visits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  page_id UUID REFERENCES landing_pages(id) ON DELETE CASCADE NOT NULL,
  visitor_hash TEXT, -- anonymized visitor ID
  source TEXT, -- utm_source or referrer
  device TEXT,
  country TEXT,
  converted BOOLEAN DEFAULT false,
  visited_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

# Sprint 19-20: AI Creative Studio (Minggu 5-6)

---

## Module 16: AI Creative Studio

### 16.1 User Stories

| ID | Story | Priority |
|----|-------|----------|
| AC-01 | Sebagai creator, saya ingin generate image untuk ad creative / social post menggunakan AI | P1 |
| AC-02 | Sebagai creator, saya ingin membuat carousel visual langsung di platform (bukan hanya script) | P0 |
| AC-03 | Sebagai creator, saya ingin generate thumbnail YouTube/TikTok dengan template | P1 |
| AC-04 | Sebagai creator, saya ingin auto-resize & brand kreasi saya ke semua platform sekaligus | P0 |
| AC-05 | Sebagai creator, saya ingin AI suggest warna, layout, dan visual style berdasarkan brand kit | P1 |
| AC-06 | Sebagai creator, saya ingin export carousel sebagai image per slide (PNG/JPG) | P0 |
| AC-07 | Sebagai creator, saya ingin simpan design sebagai template untuk reuse | P1 |

### 16.2 Carousel Designer — Canvas Editor

```
┌──────────────────────────────────────────────────────────────┐
│ 🎨 Carousel Designer        [Preview] [Export All] [Save]   │
├──────────┬───────────────────────────────────┬───────────────┤
│          │                                   │               │
│ Slides   │   ┌─ Canvas (1080x1080) ───────┐ │  Properties   │
│          │   │                              │ │               │
│ [1]█████ │   │   "5 Tanda Kamu Butuh       │ │  Background:  │
│ [2]░░░░░ │   │    App Keuangan Sendiri"    │ │  [🎨 #0d1117]│
│ [3]░░░░░ │   │                              │ │               │
│ [4]░░░░░ │   │           👇                 │ │  Elements:    │
│ [5]░░░░░ │   │    "Swipe untuk cek →"      │ │  ┌──────────┐│
│ [6]░░░░░ │   │                              │ │  │📝 Text 1 ││
│ [7]░░░░░ │   │                              │ │  │📝 Text 2 ││
│          │   │    [@digital_nomad]          │ │  │🖼️ Image  ││
│ [+ Slide]│   │                              │ │  │🔲 Shape  ││
│          │   └──────────────────────────────┘ │  └──────────┘│
│          │                                   │               │
│ Tools:   │   Add: [📝 Text] [🖼️ Image]     │  Text Props:  │
│ [Import  │        [🔲 Shape] [😀 Emoji]     │  Font: [Inter]│
│  from AI │        [🏷️ Brand Logo]           │  Size: [48]   │
│  Script] │                                   │  Weight: [700]│
│          │                                   │  Color: [#fff]│
│          │                                   │  Align: [C]   │
└──────────┴───────────────────────────────────┴───────────────┘
```

### 16.3 AI Script → Carousel Auto-Layout

```javascript
// Flow: AI carousel script → auto-generate visual slides
async function scriptToCarousel(carouselScript, brandKit) {
  const slides = carouselScript.slides.map((slide, i) => {
    const isHook = i === 0;
    const isCTA = i === carouselScript.slides.length - 1;

    return {
      id: generateId(),
      background: isHook ? brandKit.primary_color : brandKit.secondary_color,
      elements: [
        // Headline
        {
          type: 'text',
          content: slide.headline,
          style: {
            fontSize: isHook ? 56 : 44,
            fontWeight: 700,
            color: '#ffffff',
            textAlign: 'center',
            x: 540, y: isHook ? 400 : 350,
            maxWidth: 900
          }
        },
        // Sub-text (if exists)
        ...(slide.sub_text ? [{
          type: 'text',
          content: slide.sub_text,
          style: {
            fontSize: 24,
            fontWeight: 400,
            color: 'rgba(255,255,255,0.7)',
            textAlign: 'center',
            x: 540, y: 550,
            maxWidth: 800
          }
        }] : []),
        // Slide number indicator
        {
          type: 'text',
          content: `${i + 1}/${carouselScript.slides.length}`,
          style: {
            fontSize: 16, color: 'rgba(255,255,255,0.4)',
            x: 540, y: 1020, textAlign: 'center'
          }
        },
        // Brand handle (bottom)
        {
          type: 'text',
          content: `@${brandKit.handle}`,
          style: {
            fontSize: 18, color: 'rgba(255,255,255,0.5)',
            x: 540, y: 1050, textAlign: 'center'
          }
        }
      ]
    };
  });

  return slides;
}
```

### 16.4 Export Options

```javascript
const EXPORT_FORMATS = {
  ig_carousel: {
    width: 1080, height: 1080,
    format: 'png', quality: 0.95,
    output: 'individual_slides' // separate files per slide
  },
  ig_story: {
    width: 1080, height: 1920,
    format: 'png', quality: 0.95,
    output: 'individual_slides'
  },
  tiktok_cover: {
    width: 1080, height: 1920,
    format: 'jpg', quality: 0.9,
    output: 'single_image'
  },
  youtube_thumbnail: {
    width: 1280, height: 720,
    format: 'jpg', quality: 0.9,
    output: 'single_image'
  },
  twitter_image: {
    width: 1200, height: 675,
    format: 'png', quality: 0.95,
    output: 'single_image'
  },
  ad_creative: {
    width: 1080, height: 1080,
    format: 'png', quality: 0.95,
    output: 'single_image'
  }
};
```

### 16.5 Database Schema

```sql
-- DESIGNS
CREATE TABLE designs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('carousel','single_image','thumbnail','ad_creative','story')),
  canvas_width INTEGER NOT NULL,
  canvas_height INTEGER NOT NULL,
  slides JSONB NOT NULL, -- array of slide objects with elements
  generation_id UUID REFERENCES generation_history(id), -- linked AI script
  is_template BOOLEAN DEFAULT false,
  exported_urls TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

# Sprint 21-22: Integration Hub & Mobile PWA (Minggu 7-8)

---

## Module 17: Integration Hub (Automations)

### 17.1 User Stories

| ID | Story | Priority |
|----|-------|----------|
| IH-01 | Sebagai creator, saya ingin auto-send WA broadcast ketika ada produk baru | P1 |
| IH-02 | Sebagai creator, saya ingin export data analytics ke Google Sheets otomatis | P1 |
| IH-03 | Sebagai creator, saya ingin menerima notifikasi penjualan di WA/Discord | P1 |
| IH-05 | Sebagai creator, saya ingin trigger automation custom saat event tertentu terjadi | P2 |
| IH-06 | Sebagai creator, saya ingin connect ke Notion untuk sync content calendar | P2 |

### 17.2 Automation Builder

```
┌─ Create Automation ──────────────────────────────────────────┐
│                                                              │
│  WHEN (Trigger):                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ ○ Content Published                                    │   │
│  │ ○ New Sale / Order Completed                          │   │
│  │ ○ New Contact Added                                    │   │
│  │ ○ Weekly Report Generated                              │   │
│  │ ○ Ad Budget 80% Spent                                  │   │
│  │ ○ Campaign ROAS Below Threshold                        │   │
│  │ ○ Schedule (Cron: every day at 9am)                    │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  FILTER (Optional):                                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Platform = [Instagram ▼]                               │   │
│  │ AND Pillar = [Showcase ▼]                              │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  THEN (Action):                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ ○ Send WhatsApp Message to [Number / Group]           │   │
│  │ ○ Send Email to [Address]                              │   │
│  │ ○ Add Row to Google Sheet [Sheet URL]                  │   │
│  │ ○ Send Discord Webhook                                │   │
│  │ ○ Send Slack Message                                   │   │
│  │ ○ Call Webhook URL [Custom URL]                        │   │
│  │ ○ Create Notion Page                                   │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  Message Template:                                           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 🎉 New sale!                                          │   │
│  │ Product: {{product_name}}                              │   │
│  │ Buyer: {{buyer_name}}                                  │   │
│  │ Revenue: Rp {{amount}}                                │   │
│  │ Total today: Rp {{today_revenue}}                     │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  [Test Automation] [Save & Activate]                        │
└──────────────────────────────────────────────────────────────┘
```

### 17.3 Database Schema

```sql
-- AUTOMATIONS
CREATE TABLE automations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL,
  trigger_config JSONB DEFAULT '{}', -- filters, conditions
  action_type TEXT NOT NULL,
  action_config JSONB NOT NULL, -- channel, template, webhook URL, etc
  message_template TEXT,
  is_active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  trigger_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AUTOMATION LOGS
CREATE TABLE automation_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  automation_id UUID REFERENCES automations(id) ON DELETE CASCADE NOT NULL,
  trigger_event JSONB,
  action_result JSONB,
  status TEXT CHECK (status IN ('success','failed')),
  error_message TEXT,
  executed_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Module 18: Progressive Web App (PWA)

### 18.1 User Stories

| ID | Story | Priority |
|----|-------|----------|
| PW-01 | Sebagai creator, saya ingin mengakses Marketing Suite dari HP seperti native app | P1 |
| PW-02 | Sebagai creator, saya ingin menerima push notification untuk approval, sales, alerts | P1 |
| PW-03 | Sebagai creator, saya ingin quick-create caption dari HP dalam 30 detik | P1 |
| PW-04 | Sebagai creator, saya ingin cek analytics dashboard dari HP | P1 |
| PW-05 | Sebagai creator, saya ingin approve/reject konten dari HP notification | P2 |

### 18.2 PWA Configuration

```javascript
// public/manifest.json
{
  "name": "Marketing Suite",
  "short_name": "MktSuite",
  "description": "AI-Powered Marketing Tools",
  "start_url": "/dashboard",
  "display": "standalone",
  "background_color": "#0d1117",
  "theme_color": "#10b981",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### 18.3 Mobile-Optimized Views

```
┌─ Mobile Dashboard ──────┐    ┌─ Mobile Quick Create ───┐
│ ┌─────────────────────┐ │    │                          │
│ │  Marketing Suite ☰  │ │    │ Quick Caption            │
│ └─────────────────────┘ │    │                          │
│                          │    │ Product:                 │
│  📊 1,247   📦 26       │    │ [Karaya Finance ▼]      │
│  Clicks    Sales         │    │                          │
│                          │    │ Platform:                │
│  📈 +23% vs last week   │    │ [IG] [TT] [TW]          │
│                          │    │                          │
│ ┌─ Today's Tasks ──────┐│    │ Angle (optional):        │
│ │ ✅ Approve: Caption  ││    │ [________________]      │
│ │ 📅 Scheduled: 2 posts││    │                          │
│ │ ⚠️ Ad budget 80%     ││    │ [✨ Generate]            │
│ └──────────────────────┘│    │                          │
│                          │    │ ── Output ──             │
│ ┌─ Quick Actions ──────┐│    │ 🔥 Punya App Keuangan   │
│ │ [✨ Create] [📅 Cal] ││    │ Pribadi Sendiri...       │
│ │ [📊 Stats] [👥 CRM] ││    │                          │
│ └──────────────────────┘│    │ [📋 Copy] [📅 Schedule] │
│                          │    │ [🔄 Retry]              │
│ 🏠  📝  📊  👥  ⚙️    │    │                          │
└──────────────────────────┘    └──────────────────────────┘
```

---

# Sprint 23-24: Affiliate System & Marketplace (Minggu 9-10)

---

## Module 19: Affiliate / Referral Program

### 19.1 User Stories

| ID | Story | Priority |
|----|-------|----------|
| AF-01 | Sebagai platform owner, saya ingin user bisa invite orang lain dan dapat komisi 20% recurring | P1 |
| AF-02 | Sebagai affiliate, saya ingin melihat dashboard referral saya (clicks, signups, revenue) | P1 |
| AF-03 | Sebagai affiliate, saya ingin mendapatkan unique referral link | P0 |
| AF-04 | Sebagai affiliate, saya ingin withdraw komisi ketika sudah mencapai minimum Rp 100K | P1 |
| AF-05 | Sebagai platform owner, saya ingin melihat semua affiliates dan total komisi yang dibayar | P1 |

### 19.2 Affiliate Dashboard (`/affiliate`)

```
┌──────────────────────────────────────────────────────────────┐
│                  │ 🤝 Affiliate Program                      │
│  SIDEBAR         │                                           │
│                  │ Your Referral Link:                        │
│                  │ ┌─────────────────────────────────────┐   │
│                  │ │ suite.app/?ref=digital_nomad    [📋] │   │
│                  │ └─────────────────────────────────────┘   │
│                  │                                           │
│                  │ ┌────────┐ ┌────────┐ ┌────────┐         │
│                  │ │  124   │ │   18   │ │Rp 891K │         │
│                  │ │ Clicks │ │Signups │ │Earned  │         │
│                  │ │        │ │ 7 paid │ │ total  │         │
│                  │ └────────┘ └────────┘ └────────┘         │
│                  │                                           │
│                  │ Commission: 20% recurring                 │
│                  │ Cookie duration: 30 days                   │
│                  │                                           │
│                  │ ┌─ Referrals ─────────────────────────┐   │
│                  │ │ 👤 rina@... · Creator Rp99K/mo      │   │
│                  │ │    Signed up: 5 Apr · Commission/mo: │   │
│                  │ │    Rp 19,800 · Status: ✅ Active     │   │
│                  │ │                                       │   │
│                  │ │ 👤 budi@... · Pro Rp249K/mo          │   │
│                  │ │    Commission/mo: Rp 49,800           │   │
│                  │ └─────────────────────────────────────┘   │
│                  │                                           │
│                  │ Available Balance: Rp 356,400              │
│                  │ Min Withdrawal: Rp 100,000                │
│                  │ [💸 Request Withdrawal]                   │
└──────────────────────────────────────────────────────────────┘
```

### 19.3 Database Schema

```sql
-- AFFILIATES
CREATE TABLE affiliates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  referral_code TEXT UNIQUE NOT NULL,
  commission_rate DECIMAL(3,2) DEFAULT 0.20, -- 20%
  total_clicks INTEGER DEFAULT 0,
  total_signups INTEGER DEFAULT 0,
  total_earned INTEGER DEFAULT 0, -- IDR
  available_balance INTEGER DEFAULT 0,
  min_withdrawal INTEGER DEFAULT 100000,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- REFERRALS
CREATE TABLE referrals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  affiliate_id UUID REFERENCES affiliates(id) ON DELETE CASCADE NOT NULL,
  referred_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'clicked' CHECK (status IN ('clicked','signed_up','subscribed','churned')),
  subscription_tier TEXT,
  monthly_commission INTEGER DEFAULT 0,
  first_click_at TIMESTAMPTZ DEFAULT NOW(),
  signed_up_at TIMESTAMPTZ,
  subscribed_at TIMESTAMPTZ
);

-- AFFILIATE PAYOUTS
CREATE TABLE affiliate_payouts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  affiliate_id UUID REFERENCES affiliates(id) ON DELETE CASCADE NOT NULL,
  amount INTEGER NOT NULL,
  method TEXT, -- 'bank_transfer','ewallet'
  account_details JSONB,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed')),
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- AFFILIATE COMMISSIONS (monthly)
CREATE TABLE affiliate_commissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  affiliate_id UUID REFERENCES affiliates(id) ON DELETE CASCADE NOT NULL,
  referral_id UUID REFERENCES referrals(id) ON DELETE CASCADE NOT NULL,
  month DATE NOT NULL,
  subscription_amount INTEGER NOT NULL,
  commission_amount INTEGER NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','confirmed','paid')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(affiliate_id, referral_id, month)
);
```

---

## Module 20: Social Listening (Lite)

### 20.1 User Stories

| ID | Story | Priority |
|----|-------|----------|
| SL-01 | Sebagai creator, saya ingin tahu ketika orang mention brand saya di Twitter | P2 |
| SL-02 | Sebagai creator, saya ingin track keyword tertentu (misal: "app keuangan gratis") | P2 |
| SL-03 | Sebagai creator, saya ingin melihat sentiment dari mentions (positive/negative/neutral) | P2 |
| SL-04 | Sebagai creator, saya ingin menerima alert ketika ada mention negatif | P2 |

### 20.2 Database Schema

```sql
-- TRACKED KEYWORDS
CREATE TABLE tracked_keywords (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  platform TEXT DEFAULT 'twitter',
  is_active BOOLEAN DEFAULT true,
  last_checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- MENTIONS
CREATE TABLE mentions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  keyword_id UUID REFERENCES tracked_keywords(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  platform TEXT NOT NULL,
  platform_post_id TEXT,
  author_username TEXT,
  author_name TEXT,
  content TEXT NOT NULL,
  post_url TEXT,
  sentiment TEXT CHECK (sentiment IN ('positive','negative','neutral')),
  engagement JSONB, -- { likes, retweets, replies }
  posted_at TIMESTAMPTZ,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Phase 3 — Complete Background Jobs

| Job | Frequency | Module | Purpose |
|-----|-----------|--------|---------|
| automation_processor | Every 1 min | Integration Hub | Process triggered automations |
| social_listening_scan | Every 15 min | Social Listening | Scan Twitter for keyword mentions |
| sentiment_analyzer | Every 30 min | Social Listening | AI analyze sentiment of new mentions |
| affiliate_commission_calc | 1st of month | Affiliate | Calculate monthly commissions |
| page_analytics_aggregate | Daily 02:00 | Landing Pages | Aggregate page visit data |
| design_cleanup | Weekly | Creative Studio | Remove orphaned exports older than 30 days |
| client_report_generate | Monthly 1st | Team | Auto-generate client reports |

---

## Phase 3 — Complete API Endpoints

```
── Team & Workspace ──
POST   /api/workspaces
GET    /api/workspaces
POST   /api/workspaces/:id/invite
GET    /api/workspaces/:id/members
PATCH  /api/workspaces/:id/members/:userId  (change role)
DELETE /api/workspaces/:id/members/:userId  (remove)
POST   /api/invites/:token/accept
GET    /api/approvals                      (pending queue)
POST   /api/approvals/:id/approve
POST   /api/approvals/:id/reject
POST   /api/approvals/:id/request-changes
GET    /api/activity-log
POST   /api/client-portals
GET    /api/client-portals/:slug           (public, token-auth)

── Landing Pages ──
POST   /api/pages
GET    /api/pages
GET    /api/pages/:id
PATCH  /api/pages/:id
DELETE /api/pages/:id
POST   /api/pages/:id/publish
POST   /api/pages/:id/duplicate
GET    /api/pages/:id/analytics
GET    /api/page-templates

── Creative Studio ──
POST   /api/designs
GET    /api/designs
GET    /api/designs/:id
PATCH  /api/designs/:id
DELETE /api/designs/:id
POST   /api/designs/:id/export
POST   /api/designs/from-script          (AI script → visual)

── Integration Hub ──
POST   /api/automations
GET    /api/automations
PATCH  /api/automations/:id
DELETE /api/automations/:id
POST   /api/automations/:id/test
GET    /api/automations/:id/logs

── Affiliate ──
POST   /api/affiliate/join
GET    /api/affiliate/dashboard
GET    /api/affiliate/referrals
POST   /api/affiliate/withdraw
GET    /api/affiliate/payouts
GET    /api/admin/affiliates             (platform owner)

── Social Listening ──
POST   /api/listening/keywords
GET    /api/listening/keywords
DELETE /api/listening/keywords/:id
GET    /api/listening/mentions
PATCH  /api/listening/mentions/:id/read
```

---

## Phase 3 — Updated Pricing Tiers

| Feature | Free | Creator Rp99K | Pro Rp249K | Agency Rp499K |
|---------|------|---------------|------------|---------------|
| AI Generations | 50/mo | Unlimited | Unlimited | Unlimited |
| Brands | 1 | 1 | 3 | Unlimited |
| Team Seats | 1 | 1 | 3 | 10 |
| Connected Accounts | 0 | 2 | 5 | Unlimited |
| Smart Links | 5 | 50 | Unlimited | Unlimited |
| Contacts (CRM) | 50 | 500 | 5,000 | Unlimited |
| Email Broadcasts | 0 | 4/mo | Unlimited | Unlimited |
| Landing Pages | 0 | 1 | 5 | Unlimited |
| Carousel Designer | 3/mo | Unlimited | Unlimited | Unlimited |
| Auto-Publish | ❌ | ✅ 2 platform | ✅ All | ✅ All |
| Ads Manager | ❌ | ❌ | ✅ | ✅ |
| A/B Testing | ❌ | ✅ | ✅ | ✅ |
| Approval Workflow | ❌ | ❌ | ❌ | ✅ |
| Client Portal | ❌ | ❌ | ❌ | ✅ |
| White-Label Report | ❌ | ❌ | ❌ | ✅ |
| Automations | 0 | 3 | 10 | Unlimited |
| Social Listening | ❌ | ❌ | 3 keywords | 10 keywords |
| Custom Domain (Pages) | ❌ | ❌ | ✅ | ✅ |
| Affiliate Access | ✅ | ✅ | ✅ | ✅ |

---

## Full Platform — Complete Module Summary

| Phase | Module | Sprint | Status |
|-------|--------|--------|--------|
| **1** | Auth & Onboarding | 1-2 | MVP |
| **1** | AI Content Generator | 3-4 | MVP |
| **1** | Content Calendar | 5-6 | MVP |
| **1** | Asset Manager | 5-6 | MVP |
| **1** | Smart Links & Tracking | 7-8 | MVP |
| **1** | Analytics Dashboard | 7-8 | MVP |
| **2** | Auto-Publisher | 9-10 | Growth |
| **2** | A/B Testing Engine | 9-10 | Growth |
| **2** | Ads Manager | 11-12 | Growth |
| **2** | Competitor Spy | 11-12 | Growth |
| **2** | CRM & Lead Management | 13-14 | Growth |
| **2** | Testimonial Collector | 13-14 | Growth |
| **2** | Advanced Analytics | 15-16 | Growth |
| **2** | Billing & Subscription | 15-16 | Growth |
| **3** | Team Collaboration | 17-18 | Scale |
| **3** | Landing Page Builder | 19-20 | Scale |
| **3** | AI Creative Studio | 21-22 | Scale |
| **3** | Integration Hub | 23-24 | Scale |
| **3** | Mobile PWA | 23-24 | Scale |
| **3** | Affiliate System | 25-26 | Ecosystem |
| **3** | Social Listening | 25-26 | Ecosystem |

**Total: 21 Modules · 3 Phases · 26 Minggu (~6.5 bulan)**
