# Karaya Marketing Suite

## Project Overview
Platform tools all-in-one berbasis web untuk content creation, marketing, ads management, dan analytics — khusus untuk creator/seller digital product di Indonesia. Bisa digunakan internal maupun dijual sebagai SaaS.

## Tech Stack
- **Frontend:** React + Vite + Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- **AI Engine:** Groq API (Llama 3.3 70B) — gratis, cepat
- **Hosting:** Vercel (auto-deploy dari GitHub)
- **Social API:** Meta Graph API, Threads API, Twitter API v2, TikTok API, YouTube Data API v3
- **Ads API:** Meta Marketing API, Google Ads API
- **Email:** Resend / Brevo (free tier)
- **File Storage:** Supabase Storage / Cloudflare R2
- **Charts:** Recharts / Chart.js

## Documents
- `doc/brd-marketing-tools.md` — Business Requirements Document (scope lengkap semua modul)
- `doc/prd-mvp-phase1.md` — PRD Phase 1 MVP (8 minggu, Sprint 1-6)
- `doc/prd-mvp-phase2.md` — PRD Phase 2 Post-MVP (8 minggu, Sprint 7-14)
- `doc/prd-phase3.md` — PRD Phase 3 Scale & Ecosystem (10 minggu, Sprint 15-24)
- `doc/prd-ai-agents.md` — PRD AI Marketing Agents (cross-phase, 8 agents spec)
- `doc/api-integration.md` — **Agent Integration API reference** (arsitektur, endpoint, extend guide)

## Folders
- `src/` — React web app (Vite + Tailwind), uses Supabase JWT auth
- `supabase/functions/` — Deno Edge Functions (web app backend, JWT auth)
- `supabase/migrations/` — Postgres schema (17 migrations)
- `api/` — **Standalone Fastify REST API + MCP server** untuk external agents (Hermes/n8n/MCP), pakai API key auth. Baca `api/AGENTS.md` dulu saat kerja di sini.

## Phase & Sprint Breakdown

### Phase 1 — MVP (8 Minggu)
| Sprint | Minggu | Module | Fitur Utama |
|--------|--------|--------|-------------|
| 1-2 | 1-2 | Auth & Onboarding | Google OAuth, email auth, onboarding wizard (brand setup, voice, produk pertama) |
| 1-2 | 1-2 | AI Content Generator | Caption Generator, Carousel Script, Ad Copy, Thread, Repurpose, Brand Voice integration |
| 3-4 | 3-4 | Content Calendar | Weekly/monthly view, drag & drop, pilar tagging, status tracking |
| 3-4 | 3-4 | Asset Manager | Media library, image resizer, brand kit, copy library |
| 5-6 | 5-6 | Smart Links & Tracking | Short link generator, click analytics, UTM auto-generate, QR code |
| 5-6 | 5-6 | Analytics Dashboard | Unified dashboard, content performance ranking, weekly report generator |

### Phase 2 — Post-MVP (8 Minggu)
| Sprint | Minggu | Module | Fitur Utama |
|--------|--------|--------|-------------|
| 7-8 | 1-2 | Auto-Publisher | OAuth connect Instagram/Twitter/TikTok, auto-publish, cross-post, preview |
| 8 | 2 | A/B Testing Engine | Content A/B test, ad copy test, link rotator, statistical significance |
| 9-10 | 3-4 | Ads Manager | Meta Ads dashboard, campaign creation, budget tracker, ROAS |
| 10 | 4 | Competitor Spy | Meta Ad Library integration, AI analyze competitor ads |
| 11-12 | 5-6 | CRM & Lead Management | Contact DB, email broadcast, WA follow-up, testimonial collector |
| 12 | 6 | Testimonial Collector | Auto-request review via email/WA |
| 13-14 | 7-8 | Advanced Analytics & Billing | Funnel viz, revenue attribution, Stripe/Midtrans billing |

### Phase 3 — Scale & Ecosystem (10 Minggu)
| Sprint | Minggu | Module | Fitur Utama |
|--------|--------|--------|-------------|
| 15-16 | 1-2 | Team Collaboration | Multi-user, roles (Owner/Admin/Editor/Viewer/Client), approval workflow |
| 17-18 | 3-4 | Landing Page Builder | Drag & drop builder, templates, custom domain |
| 19-20 | 5-6 | AI Creative Studio | Carousel designer (canvas editor), AI image gen, thumbnail, auto-brand |
| 21-22 | 7-8 | Integration Hub & Mobile PWA | Automations (Telegram/WA/GSheets), PWA |
| 23-24 | 9-10 | Affiliate System & Marketplace | Referral program, template marketplace, social listening |

## Database Tables (semua phase)

### Phase 1
- `profiles` — extends auth.users (nama, avatar, onboarding, subscription tier)
- `brands` — brand voice (tone[], favorite_words[], avoided_words[], colors)
- `products` — nama, deskripsi, harga, link, USP, features[]
- `generation_history` — semua AI generation (type, platform, input_params, output)
- `saved_content` — content library (favorit, tags, used_count)
- `usage_monthly` — tracking generation limit (50/bulan free)
- `content_calendar` — konten + scheduling + status + pilar
- `assets` — media files (tags, folder, soft delete)
- `smart_links` — short URL + UTM params
- `link_clicks` — click tracking (device, country, referrer)

### Phase 2
- `connected_accounts` — OAuth tokens (encrypted) per platform
- `publish_history` — log semua publish (status, error, retry)
- `publish_queue` — retry mechanism (backoff)
- `ab_tests` — A/B test config
- `ab_test_variants` — variant data + metrics
- `ads_campaigns` — campaign config (platform, objective, budget, audience)
- `ad_creatives` — headline, body, CTA, media
- `ads_insights_daily` — synced metrics (spend, CTR, CPC, ROAS)
- `saved_audiences` — reusable audience segments
- `budget_alerts` — alert rules (80% spent, low ROAS, etc)
- `contacts` — CRM database
- `contact_events` — customer journey events
- `email_campaigns` — broadcast emails
- `testimonials` — collected reviews

### Phase 3
- `workspaces` — multi-tenant workspace
- `workspace_members` — member + role + brand_access
- `workspace_invites` — pending invites
- `content_approvals` — approval workflow (pending/approved/changes_requested/rejected)
- `client_portals` — client view-only access
- `activity_log` — audit trail
- `landing_pages` — page builder data (sections JSONB)
- `page_templates` — reusable templates
- `page_visits` — landing page analytics
- `designs` — carousel/creative canvas data
- `automations` — trigger-action definitions
- `automation_logs` — execution history

## Key Architecture Decisions
- **Supabase RLS:** Row Level Security aktif — user hanya akses data miliknya
- **AI via Groq:** Free tier (14,400 req/day), fallback ke llama-3.1-8b-instant jika overloaded
- **Rate Limiting:** Max 2 concurrent AI requests per user, cache identical params 1 jam
- **Token Storage:** OAuth tokens encrypted di database, auto-refresh via cron
- **Image Processing:** Client-side resize (Canvas API), server-side via Edge Function untuk batch

## Pricing Tiers
| Tier | Harga | Limit |
|------|-------|-------|
| Free | Rp 0 | 50 AI gen/bulan, 1 brand, basic features |
| Creator | Rp 99K/bulan | Unlimited AI, 1 brand, full features |
| Pro | Rp 249K/bulan | + ads manager, 3 brands, CRM |
| Agency | Rp 499K/bulan | + unlimited brands, team (3 seats), white-label |

## User Personas
1. **Solo Creator** (Primary) — content creator & digital product seller Indonesia, ingin hemat waktu
2. **Small Agency** (Secondary) — agency kecil 3-5 klien, butuh multi-brand dashboard
3. **Affiliate Marketer** (Tertiary) — butuh bulk content generation + link tracking

## Conventions
- Bahasa UI: Bahasa Indonesia informal
- AI output: Bahasa Indonesia, mengikuti brand voice profile
- Content Pillars: Awareness, Showcase, Education, Social Proof
- Content Status: Draft → Approved → Scheduled → Published (+ Failed)
- ID prefixes in BRD: CG (Content Gen), CS (Calendar/Scheduler), AM (Ads Manager), AN (Analytics), AS (Asset), LT (Link Tracker), CR (CRM)
