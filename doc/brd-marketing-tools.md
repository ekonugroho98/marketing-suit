# Business Requirements Document (BRD)
## Marketing & Content Tools Platform — "Karaya Marketing Suite"

**Version:** 1.0
**Author:** @digital_nomad
**Date:** 9 April 2026
**Status:** Draft

---

## 1. Executive Summary

Platform tools all-in-one berbasis web untuk mendukung kebutuhan content creation, marketing, ads management, dan analytics — khusus untuk creator/seller digital product di Indonesia. Platform ini dirancang agar bisa digunakan sendiri (internal) maupun dijual sebagai SaaS ke creator lain.

**Tujuan utama:**
- Mengotomasi workflow content strategy yang saat ini manual
- Menyediakan tools untuk membuat, menjadwalkan, dan menganalisa konten marketing
- Mengelola ads campaign dari satu dashboard
- Mempercepat proses dari ideasi → creation → publish → analisa

---

## 2. Problem Statement

### Masalah Saat Ini
1. **Content creation manual & lambat** — Membuat caption, carousel, dan copy iklan satu per satu memakan waktu 2-4 jam/hari
2. **Tidak ada sistem scheduling terpusat** — Harus buka Instagram, TikTok, Twitter satu per satu untuk posting
3. **Copywriting berulang** — Menulis variasi caption/ad copy untuk A/B testing sangat repetitif
4. **Tracking performa terpisah** — Analytics tersebar di masing-masing platform, sulit lihat gambaran besar
5. **Ads management ribet** — Mengelola Meta Ads, TikTok Ads, Google Ads dari dashboard berbeda
6. **Asset management berantakan** — Screenshot, cover image, video tersebar di folder-folder berbeda
7. **Tidak ada link antara content → sales** — Sulit tracking konten mana yang menghasilkan penjualan

---

## 3. Scope & Modules

### 3.1 Content Generator (AI-Powered)

**Deskripsi:** Modul untuk generate konten marketing menggunakan AI, disesuaikan dengan brand voice dan target audience.

**Fitur:**

| ID | Fitur | Prioritas | Deskripsi |
|----|-------|-----------|-----------|
| CG-01 | Caption Generator | P0 | Input: produk + platform + tone → Output: 3-5 variasi caption dengan hashtag |
| CG-02 | Carousel Script Generator | P0 | Input: topik → Output: 5-7 slide copywriting untuk carousel Instagram |
| CG-03 | Thread Generator | P1 | Input: topik → Output: Twitter/X thread 5-10 tweet dengan hook kuat |
| CG-04 | Ad Copy Generator | P0 | Input: produk + objective + audience → Output: headline, body, CTA untuk Meta/TikTok/Google Ads |
| CG-05 | Email Sequence Generator | P1 | Input: produk + funnel stage → Output: 3-5 email nurturing sequence |
| CG-06 | Video Script Generator | P1 | Input: topik + durasi + platform → Output: script dengan hook, body, CTA |
| CG-07 | Brand Voice Profile | P0 | Setup tone, style, kata-kata favorit, kata-kata terlarang — AI mengikuti profile ini |
| CG-08 | Content Repurpose Tool | P1 | Input: 1 konten (misal thread) → Output: versi carousel, caption, reels script |
| CG-09 | Headline Analyzer | P2 | Scoring headline berdasarkan emotional trigger, power words, length |
| CG-10 | Hashtag Research | P1 | Suggest hashtag relevan berdasarkan niche + estimasi reach |

**User Flow - Caption Generator:**
```
[Pilih Produk] → [Pilih Platform] → [Pilih Tone/Pilar] → [Generate]
     ↓                                                        ↓
[Product DB]                                        [3-5 Variasi Caption]
                                                         ↓
                                               [Edit / Regenerate / Save]
                                                         ↓
                                               [Send to Scheduler / Copy]
```

---

### 3.2 Content Calendar & Scheduler

**Deskripsi:** Kalender visual untuk merencanakan, menjadwalkan, dan auto-publish konten ke multiple platform.

**Fitur:**

| ID | Fitur | Prioritas | Deskripsi |
|----|-------|-----------|-----------|
| CS-01 | Calendar View | P0 | Tampilan kalender mingguan/bulanan, drag & drop konten |
| CS-02 | Content Pillars Tagging | P0 | Tag setiap konten ke pilar (Awareness, Showcase, Education, Social Proof) |
| CS-03 | Auto-Publish Instagram | P1 | Publish otomatis ke Instagram (via Meta API) |
| CS-04 | Auto-Publish Twitter/X | P1 | Publish otomatis ke Twitter/X |
| CS-05 | Auto-Publish TikTok | P2 | Publish otomatis ke TikTok (via API) |
| CS-11 | Auto-Publish Threads | P1 | Publish otomatis ke Threads (via Threads API) |
| CS-12 | Auto-Publish YouTube Shorts | P2 | Upload Shorts ke YouTube (via YouTube Data API v3) |
| CS-06 | Best Time Suggestion | P1 | Suggest waktu posting optimal berdasarkan historical engagement |
| CS-07 | Content Status Tracking | P0 | Status: Draft → In Review → Approved → Scheduled → Published |
| CS-08 | Bulk Scheduling | P1 | Upload CSV/spreadsheet untuk jadwalkan banyak konten sekaligus |
| CS-09 | Content Queue | P2 | Antrian konten evergreen yang auto-publish di slot kosong |
| CS-10 | Recurring Post | P2 | Jadwalkan konten yang berulang (misal: weekly tips setiap Selasa) |

---

### 3.3 Ads Manager

**Deskripsi:** Dashboard terpusat untuk membuat, mengelola, dan mengoptimasi iklan di multiple platform.

**Fitur:**

| ID | Fitur | Prioritas | Deskripsi |
|----|-------|-----------|-----------|
| AM-01 | Campaign Dashboard | P0 | Overview semua campaign aktif dari Meta, TikTok, Google dalam 1 layar |
| AM-02 | Ad Creative Builder | P0 | Buat ad creative (gambar + copy) langsung di platform |
| AM-03 | A/B Testing Setup | P1 | Buat variasi ad copy/creative untuk split test otomatis |
| AM-04 | Budget Tracker | P0 | Pantau spend harian/bulanan per platform, alert jika mendekati limit |
| AM-05 | ROAS Calculator | P0 | Hitung Return on Ad Spend real-time per campaign |
| AM-06 | Audience Builder | P1 | Buat & simpan custom audience segments untuk reuse |
| AM-07 | Ad Copy Templates | P1 | Library template ad copy per objective (awareness, conversion, retarget) |
| AM-08 | UTM Generator | P0 | Generate UTM links otomatis untuk setiap campaign |
| AM-09 | Competitor Ad Spy | P2 | Pantau iklan kompetitor (via Meta Ad Library API) |
| AM-10 | Auto Pause Low Performer | P2 | Auto-pause ads yang ROAS di bawah threshold |

**User Flow - Campaign Creation:**
```
[New Campaign] → [Pilih Platform(s)] → [Set Objective]
      ↓                                       ↓
[Select/Create Audience]              [Set Budget & Duration]
      ↓                                       ↓
[Create Ad Creative] ←→ [AI Ad Copy Generator]
      ↓
[Preview All Platforms] → [Launch] → [Monitor Dashboard]
```

---

### 3.4 Analytics & Reporting

**Deskripsi:** Dashboard analytics terpusat yang menghubungkan data konten, ads, dan sales.

**Fitur:**

| ID | Fitur | Prioritas | Deskripsi |
|----|-------|-----------|-----------|
| AN-01 | Unified Dashboard | P0 | Overview KPI: followers, engagement, reach, clicks, sales — semua platform |
| AN-02 | Content Performance | P0 | Ranking konten berdasarkan engagement rate, clicks, conversions |
| AN-03 | Funnel Visualization | P1 | Visualisasi: Impression → Click → Visit → Purchase |
| AN-04 | Revenue Attribution | P1 | Konten/ads mana yang generate paling banyak revenue |
| AN-05 | Audience Insights | P1 | Demografi, lokasi, active hours dari audience |
| AN-06 | Competitor Benchmark | P2 | Bandingkan growth metrics dengan kompetitor |
| AN-07 | Weekly Report Generator | P0 | Auto-generate laporan mingguan (PDF/email) |
| AN-08 | Custom Date Range | P0 | Filter analytics per tanggal/minggu/bulan/quarter |
| AN-09 | Goal Tracking | P1 | Set KPI targets dan track progress (misal: 50 sales/bulan) |
| AN-10 | Cohort Analysis | P2 | Analisa behaviour buyer cohort (kapan beli, repeat, churn) |

---

### 3.5 Asset Manager

**Deskripsi:** Library terpusat untuk semua asset marketing (gambar, video, template, copy).

**Fitur:**

| ID | Fitur | Prioritas | Deskripsi |
|----|-------|-----------|-----------|
| AS-01 | Media Library | P0 | Upload, organize, tag semua gambar & video marketing |
| AS-02 | Image Resizer | P0 | Auto-resize 1 gambar ke semua format (IG post, story, TikTok, Twitter) |
| AS-03 | Template Library | P1 | Simpan template carousel, ad creative, thumbnail yang bisa di-reuse |
| AS-04 | Brand Kit | P0 | Simpan logo, warna brand, font — auto-apply ke semua creative |
| AS-05 | Screenshot to Square | P1 | Convert screenshot landscape → square 1024x1024 dengan branded frame |
| AS-06 | Copy Library | P1 | Simpan caption, headline, CTA favorit untuk reuse |
| AS-07 | Watermark Tool | P2 | Auto-add watermark ke semua gambar/video |
| AS-08 | AI Image Enhancement | P2 | Auto-enhance screenshot & product images |

---

### 3.6 Link & Sales Tracker

**Deskripsi:** Tracking link pintar yang menghubungkan traffic source ke pembelian.

**Fitur:**

| ID | Fitur | Prioritas | Deskripsi |
|----|-------|-----------|-----------|
| LT-01 | Smart Link Generator | P0 | Buat short link dengan tracking per campaign/platform |
| LT-02 | Click Analytics | P0 | Real-time click tracking: sumber, device, lokasi, waktu |
| LT-03 | Conversion Tracking | P0 | Track klik → pembelian (integrasi lynk.id webhook) |
| LT-04 | Link Rotator | P1 | Rotate antara beberapa URL untuk A/B test landing page |
| LT-05 | QR Code Generator | P1 | Generate QR code branded untuk offline marketing |
| LT-06 | Retarget Pixel | P2 | Embed Meta/TikTok pixel di smart link untuk retargeting |
| LT-07 | Bio Link Builder | P2 | Custom bio link page (alternatif lynk.id / linktree) |

---

### 3.7 CRM & Lead Management (Bonus Module)

**Deskripsi:** Kelola database pembeli & leads untuk nurturing dan repeat sales.

**Fitur:**

| ID | Fitur | Prioritas | Deskripsi |
|----|-------|-----------|-----------|
| CR-01 | Contact Database | P1 | Simpan data buyer: nama, email, phone, produk dibeli, tanggal |
| CR-02 | Lead Scoring | P2 | Scoring leads berdasarkan engagement level |
| CR-03 | Email Broadcast | P1 | Kirim broadcast email ke segmen tertentu |
| CR-04 | WhatsApp Follow-up | P1 | Template WA follow-up otomatis setelah pembelian |
| CR-05 | Customer Journey Map | P2 | Visualisasi journey: first touch → purchase → repeat |
| CR-06 | Testimonial Collector | P1 | Auto-request review via email/WA setelah X hari pembelian |

---

### 3.8 AI Marketing Agents

**Deskripsi:** Autonomous AI agents yang menjalankan tugas-tugas marketing secara otomatis — dari content planning hingga ads optimization. Agents ini adalah differentiator utama platform dibanding tools sejenis.

**Fitur:**

| ID | Agent | Prioritas | Phase | Deskripsi |
|----|-------|-----------|-------|-----------|
| AG-01 | Content Strategist Agent | P0 | Phase 1 | Auto-generate content plan mingguan/bulanan berdasarkan brand profile, produk, goals. Auto-balance pilar, suggest trending topics per niche |
| AG-02 | Copywriter Batch Agent | P0 | Phase 1 | Batch generate semua konten untuk 1 minggu sekaligus (caption, carousel, thread, ad copy). Follow brand voice, auto-save ke library & calendar |
| AG-03 | Engagement Analyst Agent | P1 | Phase 2 | Analisis performa konten, kasih rekomendasi actionable (waktu posting optimal, format terbaik, pilar balance). Weekly insight report otomatis |
| AG-04 | Ads Optimizer Agent | P2 | Phase 2 | Monitor running ads, auto-pause low ROAS, suggest budget reallocation, generate ad copy variations untuk A/B test, alert spend anomaly |
| AG-05 | Competitor Intelligence Agent | P2 | Phase 2 | Monitor kompetitor via Meta Ad Library, detect strategy changes, suggest counter-strategy, track competitor content patterns |
| AG-06 | Lead Nurture Agent | P2 | Phase 2 | Auto follow-up leads via WA/email, trigger testimonial request, re-engage cold leads, segment berdasarkan behaviour |
| AG-07 | Brand Voice Guardian Agent | P1 | Phase 1 | QA semua content output pre-publish, check tone & word consistency, flag kata-kata dihindari, suggest edits jika off-brand |
| AG-08 | Repurpose Agent | P1 | Phase 1 | Input 1 konten → output multi-format (caption IG, carousel, thread, TikTok script, email newsletter). Platform-specific optimization otomatis |

**Agent Architecture:**
```
┌──────────────────────────────────────────────────────────┐
│                    Agent Orchestrator                      │
│  (manages scheduling, triggers, dan inter-agent comms)    │
├──────┬──────┬──────┬──────┬──────┬──────┬──────┬────────┤
│Strate│Copy  │Engage│Ads   │Compe │Lead  │Brand │Repur   │
│gist  │writer│Analyst│Optim │Intel │Nurtr │Voice │pose    │
│AG-01 │AG-02 │AG-03 │AG-04 │AG-05 │AG-06 │AG-07 │AG-08   │
└──┬───┴──┬───┴──┬───┴──┬───┴──┬───┴──┬───┴──┬───┴──┬─────┘
   │      │      │      │      │      │      │      │
   ▼      ▼      ▼      ▼      ▼      ▼      ▼      ▼
 Groq   Content  Analyt  Meta   Meta   Resend  Groq  Groq
  API   Calendar  ics    Ads    Ad Lib  /WA    API   API
         DB       DB     API    API    API
```

**External API Dependencies:**
- **Phase 1 Agents (AG-01, AG-02, AG-07, AG-08):** Hanya Groq API — tidak butuh social media / ads API connection
- **Phase 2 Agents (AG-03 s/d AG-06):** Butuh OAuth connection ke social media & ads platform. Data di-sync via background jobs ke database lokal, agents baca dari cache. Write-back actions (pause ads, send email) wajib melalui user approval
- **Detail API integration spec:** Lihat `doc/prd-ai-agents.md` Section "External API Dependencies per Agent"

**Trigger Types:**
- **Scheduled:** Content Strategist (senin pagi), Engagement Analyst (daily), Ads Optimizer (setiap 6 jam)
- **Event-based:** Lead Nurture (on purchase), Brand Voice Guardian (pre-publish)
- **On-demand:** Copywriter Batch, Repurpose Agent, Competitor Intel

---

## 4. Tech Stack (Rekomendasi)

| Layer | Technology | Alasan |
|-------|-----------|--------|
| Frontend | React + Vite + Tailwind CSS | Sama seperti Karaya Finance — konsistensi |
| Backend | Supabase (PostgreSQL + Auth + Storage + Edge Functions) | Gratis tier cukup, sudah familiar |
| AI Engine | Groq API (Llama 3.3 70B) | Gratis, cepat, cukup powerful untuk copywriting |
| Hosting | Vercel | Gratis tier, auto-deploy dari GitHub |
| Social API | Meta Graph API, Threads API, Twitter API v2, TikTok API, YouTube Data API v3 | Untuk auto-publish & analytics |
| Ads API | Meta Marketing API, Google Ads API | Untuk ads management |
| Link Tracking | Custom short link service (self-hosted) | Full kontrol data |
| Email | Resend / Brevo (free tier) | Untuk email broadcast & notifications |
| File Storage | Supabase Storage / Cloudflare R2 | Untuk media library |
| Charts | Recharts / Chart.js | Untuk analytics dashboard |

---

## 5. User Personas

### Persona 1: Solo Creator (Primary)
- **Nama:** Rina, 27 tahun
- **Role:** Content creator & digital product seller
- **Platform:** Instagram, TikTok, Twitter, Threads, YouTube Shorts
- **Pain:** Menghabiskan 3-4 jam/hari untuk bikin konten & manage ads
- **Need:** Tools yang bisa cut waktu jadi 1 jam/hari
- **Budget:** Rp 0-100K/bulan

### Persona 2: Small Agency (Secondary)
- **Nama:** Budi, 32 tahun
- **Role:** Pemilik agency digital marketing kecil (3-5 klien)
- **Platform:** Semua platform untuk klien berbeda
- **Pain:** Manage multiple brand/klien dari tools berbeda-beda
- **Need:** Multi-brand dashboard, client reporting
- **Budget:** Rp 200-500K/bulan

### Persona 3: Affiliate Marketer (Tertiary)
- **Nama:** Doni, 24 tahun
- **Role:** Affiliate marketer produk digital
- **Platform:** TikTok, Instagram, YouTube Shorts
- **Pain:** Butuh bikin konten cepat untuk banyak produk
- **Need:** Bulk content generation, link tracking
- **Budget:** Rp 50-150K/bulan

---

## 6. Monetization Strategy

### Pricing Tiers

| Tier | Harga | Target | Fitur |
|------|-------|--------|-------|
| **Free** | Rp 0 | Trial & hook | 50 AI generations/bulan, 1 brand, basic calendar, basic analytics |
| **Creator** | Rp 99K/bulan | Solo creator | Unlimited AI, 1 brand, full calendar, scheduler (2 platform), full analytics, asset manager |
| **Pro** | Rp 249K/bulan | Power user | Semua Creator + ads manager, 3 brands, all platform scheduler, CRM, priority support |
| **Agency** | Rp 499K/bulan | Agency | Semua Pro + unlimited brands, client reporting, team access (3 seats), white-label report |

### Revenue Projections (12 bulan)

| Bulan | Free Users | Paid Users | MRR |
|-------|-----------|-----------|-----|
| 1-3 | 100 | 10 | Rp 1.5 juta |
| 4-6 | 500 | 50 | Rp 7.5 juta |
| 7-9 | 1500 | 150 | Rp 22 juta |
| 10-12 | 3000 | 400 | Rp 60 juta |

---

## 7. MVP Scope (Phase 1 — 8 minggu)

### Sprint 1-2: Foundation & AI Content Generator (Minggu 1-4)
- [ ] Setup project (React + Supabase + Vercel)
- [ ] Auth (login/register via Google + email)
- [ ] Onboarding Wizard (brand setup, voice, produk pertama)
- [ ] Brand Voice Profile (CG-07)
- [ ] Product Database (simpan info produk untuk AI context)
- [ ] Basic UI layout (sidebar, dashboard shell)
- [ ] Caption Generator (CG-01)
- [ ] Carousel Script Generator (CG-02)
- [ ] Ad Copy Generator (CG-04)
- [ ] Thread Generator (CG-03)
- [ ] Content Repurpose Tool (CG-08)
- [ ] Video Script Generator (CG-06)
- [ ] Hashtag Research (CG-10)
- [ ] Copy Library / saved generations (AS-06)
- [ ] AI Content Strategist Agent (AG-01)
- [ ] AI Copywriter Batch Agent (AG-02)
- [ ] AI Brand Voice Guardian Agent (AG-07)

### Sprint 3-4: Content Calendar & Asset Manager (Minggu 5-6)
- [ ] Content Calendar View (CS-01)
- [ ] Content Pillars Tagging (CS-02)
- [ ] Content Status Tracking (CS-07)
- [ ] Media Library (AS-01)
- [ ] Image Resizer (AS-02)
- [ ] Screenshot to Square (AS-05)
- [ ] AI Repurpose Agent (AG-08)

### Sprint 5-6: Smart Links, Analytics & Launch (Minggu 7-8)
- [ ] Smart Link Generator (LT-01)
- [ ] Click Analytics (LT-02)
- [ ] UTM Generator (AM-08)
- [ ] Basic Unified Dashboard (AN-01)
- [ ] Content Performance Ranking (AN-02)
- [ ] Weekly Report Generator (AN-07)

### Post-MVP (Phase 2 — Bulan 3-4)
- Auto-Publish ke Instagram, Threads, Twitter, YouTube Shorts
- Ads Manager (Meta Ads integration)
- CRM & Lead Management
- A/B Testing tools
- Competitor analysis
- Email Sequence Generator (CG-05)
- AI Engagement Analyst Agent (AG-03)
- AI Ads Optimizer Agent (AG-04)
- AI Lead Nurture Agent (AG-06)
- AI Competitor Intelligence Agent (AG-05)

---

## 8. Success Metrics

| Metric | Target (3 bulan) | Target (6 bulan) |
|--------|------------------|------------------|
| Registered Users | 200 | 1000 |
| Paid Conversion Rate | 4% | 8% |
| Monthly Revenue | Rp 5 juta | Rp 20 juta |
| Content Generated / User / Bulan | 30 | 50 |
| User Retention (30-day) | 40% | 55% |
| NPS Score | 30+ | 45+ |
| Time Saved per User / Minggu | 5 jam | 8 jam |

---

## 9. Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|------------|------------|
| API rate limit Groq (free tier) | High | Medium | Implement caching, queue system, fallback ke model lebih kecil |
| Social media API changes | High | Medium | Abstraction layer, multiple provider support |
| Low paid conversion | Medium | Medium | Strong free tier hook, in-app upsell, usage limit yang tepat |
| Kompetitor (Buffer, Hootsuite) | Medium | High | Fokus niche Indonesia, harga murah, fitur AI Indonesia-first |
| Data privacy concern | High | Low | Self-hosted option, clear privacy policy, data encryption |
| AI agent hallucination / off-brand output | Medium | Medium | Brand Voice Guardian agent sebagai QA layer, human review sebelum publish |
| Agent over-automation (user kehilangan kontrol) | Medium | Low | Semua agent actions butuh approval user, transparency log, easy override |
| Kompetitor lokal (SociaBuzz, FazBz) | Medium | Medium | AI agents sebagai differentiator unik, first-mover advantage di Indonesia |

---

## 10. Competitive Advantage

1. **Indonesia-first** — Semua UI, AI output, dan template dalam Bahasa Indonesia
2. **AI-native with Autonomous Agents** — Bukan tools scheduling biasa + AI, tapi AI-first platform dengan autonomous agents yang bisa jalankan marketing tasks secara otomatis
3. **Harga terjangkau** — 5-10x lebih murah dari Buffer/Hootsuite/Jasper
4. **Integrated sales tracking** — Koneksi langsung konten → klik → pembelian (integrasi lynk.id)
5. **Self-deployable** — Bisa dijual sebagai template yang bisa di-deploy sendiri (seperti Karaya Finance)
6. **Groq-powered** — AI gratis tapi powerful, tidak perlu bayar OpenAI
7. **Agent-powered automation** — Content Strategist, Ads Optimizer, Lead Nurture agents yang tidak dimiliki kompetitor lokal maupun global di segmen harga ini

---

## 11. Appendix

### A. Integration Map

```
┌─────────────────────────────────────────────┐
│           Marketing Suite Dashboard          │
├──────┬──────┬──────┬──────┬──────┬──────────┤
│  AI  │ Cal  │ Ads  │Stats │Asset │   CRM    │
│ Gen  │ ender│ Mgr  │      │ Mgr  │          │
└──┬───┴──┬───┴──┬───┴──┬───┴──┬───┴────┬─────┘
   │      │      │      │      │        │
   ▼      ▼      ▼      ▼      ▼        ▼
 Groq   Meta   Meta   Meta  Supabase  Resend
  API    API    Ads   Insights Storage   API
         │      API    API     │
    Threads          │    Cloudflare
      API        TikTok      R2
         │       Ads API
    Twitter/X        │
      API        Google
         │       Ads API
      TikTok
       API
         │
      YouTube
     Data API
```

### B. Database Schema (High-Level)

```
users              → auth, profile, subscription tier
brands             → brand voice, colors, logo, products
products           → name, description, price, images, links
content            → type, body, platform, status, pillar, scheduled_at
campaigns          → platform, objective, budget, status, dates
ad_creatives       → headline, body, cta, image, campaign_id
smart_links        → short_url, destination, utm, campaign_id
link_clicks        → link_id, timestamp, source, device, location
assets             → file_url, type, tags, brand_id
contacts           → name, email, phone, source, products_bought
analytics_daily    → date, platform, impressions, clicks, sales, revenue
```
