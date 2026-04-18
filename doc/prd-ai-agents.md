# Product Requirements Document (PRD)
## AI Marketing Agents — Cross-Phase Specification

**Version:** 1.0
**Date:** 10 April 2026
**Timeline:** Cross-phase (Phase 1, 2, 3)
**Prerequisite:** Groq API integration (Phase 1 Sprint 1-2)
**Reference:** BRD Section 3.8 — AI Marketing Agents

---

## Overview

AI Marketing Agents adalah fitur autonomous yang menjalankan tugas marketing secara otomatis. Setiap agent memiliki spesialisasi, trigger, dan output yang jelas. Agents berjalan di atas **Supabase Edge Functions** dan menggunakan **Groq API (Llama 3.3 70B)** sebagai AI engine.

### Prinsip Desain Agent

1. **Transparency** — Setiap action agent harus visible di activity log
2. **Human-in-the-loop** — Agent menghasilkan draft/rekomendasi, user approve sebelum eksekusi final (publish, send, pause ads)
3. **Composable** — Agent bisa dipanggil satu per satu atau chained (Strategist → Copywriter → Guardian)
4. **Graceful degradation** — Jika Groq API down, agent queue task dan retry. Tidak ada data loss
5. **Rate-limit aware** — Agent menghormati Groq free tier limit (14,400 req/day) dan user subscription limit

### Agent Tiers & Pricing

| Agent | Free | Creator | Pro | Agency |
|-------|------|---------|-----|--------|
| Content Strategist (AG-01) | 2x/bulan | Unlimited | Unlimited | Unlimited |
| Copywriter Batch (AG-02) | 2x/bulan (termasuk 50 gen limit) | Unlimited | Unlimited | Unlimited |
| Brand Voice Guardian (AG-07) | Semua output | Semua output | Semua output | Semua output |
| Repurpose Agent (AG-08) | Termasuk gen limit | Unlimited | Unlimited | Unlimited |
| Engagement Analyst (AG-03) | Basic (weekly) | Daily insights | Daily + custom | Daily + custom + team |
| Ads Optimizer (AG-04) | — | — | ✅ | ✅ |
| Competitor Intel (AG-05) | — | — | ✅ | ✅ |
| Lead Nurture (AG-06) | — | — | ✅ | ✅ |

---

## Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                         │
│  Agent Dashboard  │  Agent Output Review  │  Agent Settings  │
└────────┬──────────┴───────────┬───────────┴──────────────────┘
         │                      │
         ▼                      ▼
┌─────────────────────────────────────────────────────────────┐
│                  Supabase Edge Functions                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Agent Orchestrator                        │   │
│  │  - Schedule management (cron triggers)                 │   │
│  │  - Event listener (database triggers)                  │   │
│  │  - Queue management (rate limiting)                    │   │
│  │  - Inter-agent communication                           │   │
│  │  - Error handling & retry logic                        │   │
│  └──┬───┬───┬───┬───┬───┬───┬───┬────────────────────────┘   │
│     │   │   │   │   │   │   │   │                            │
│     ▼   ▼   ▼   ▼   ▼   ▼   ▼   ▼                            │
│   AG01 AG02 AG03 AG04 AG05 AG06 AG07 AG08                    │
│                                                               │
└───────────────────────┬──────────────────────────────────────┘
                        │
         ┌──────────────┼──────────────┐
         ▼              ▼              ▼
    ┌─────────┐   ┌──────────┐   ┌──────────┐
    │ Groq API│   │ Supabase │   │ External │
    │ (LLM)   │   │ Database │   │ APIs     │
    └─────────┘   └──────────┘   └──────────┘
                                  (Meta, Twitter,
                                   TikTok, Resend)
```

### Database Schema (Agent Infrastructure)

```sql
-- AGENT RUNS — Log setiap kali agent dijalankan
CREATE TABLE agent_runs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL CHECK (agent_type IN (
    'content_strategist','copywriter_batch','engagement_analyst',
    'ads_optimizer','competitor_intel','lead_nurture',
    'brand_voice_guardian','repurpose'
  )),
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('scheduled','event','manual')),
  status TEXT DEFAULT 'running' CHECK (status IN ('running','completed','failed','cancelled')),
  input_params JSONB,
  output JSONB,
  items_generated INTEGER DEFAULT 0,
  tokens_used INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_agent_runs_user ON agent_runs(user_id, agent_type, started_at DESC);

-- AGENT CONFIGS — Settings per user per agent
CREATE TABLE agent_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  schedule TEXT, -- cron expression: '0 7 * * 1' (senin jam 7)
  settings JSONB DEFAULT '{}', -- agent-specific settings
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, brand_id, agent_type)
);

-- AGENT QUEUE — Queue untuk rate limiting
CREATE TABLE agent_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_run_id UUID REFERENCES agent_runs(id) ON DELETE CASCADE,
  priority INTEGER DEFAULT 5, -- 1 = highest, 10 = lowest
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed')),
  next_attempt_at TIMESTAMPTZ DEFAULT NOW(),
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AGENT OUTPUTS — Individual items yang dihasilkan agent
CREATE TABLE agent_outputs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_run_id UUID REFERENCES agent_runs(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  output_type TEXT NOT NULL, -- 'content_plan','caption','carousel','insight','recommendation','alert'
  title TEXT,
  content JSONB NOT NULL,
  status TEXT DEFAULT 'pending_review' CHECK (status IN ('pending_review','approved','rejected','applied','expired')),
  reviewed_at TIMESTAMPTZ,
  applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### API Endpoints (Agent Infrastructure)

```
-- Agent Management
GET    /api/agents                    → List available agents + status per user
GET    /api/agents/:type/config       → Get agent config & settings
PATCH  /api/agents/:type/config       → Update agent settings (schedule, enabled, params)

-- Agent Execution
POST   /api/agents/:type/run          → Trigger agent run manually
GET    /api/agents/:type/runs         → List agent run history (paginated)
GET    /api/agents/:type/runs/:id     → Get specific run detail + outputs
POST   /api/agents/:type/runs/:id/cancel → Cancel running agent

-- Agent Outputs
GET    /api/agent-outputs             → List pending outputs for review (filter by type, status)
PATCH  /api/agent-outputs/:id         → Update output status (approve/reject)
POST   /api/agent-outputs/:id/apply   → Apply output (save to calendar, send email, etc)
POST   /api/agent-outputs/bulk-apply  → Bulk approve & apply multiple outputs
```

### UI Screen: Agent Dashboard (`/agents`)

```
┌──────────────────────────────────────────────────────────────┐
│                  │ 🤖 AI Agents                               │
│  SIDEBAR         │                                           │
│                  │ ┌─ Quick Actions ──────────────────────┐  │
│                  │ │ [📋 Generate Weekly Plan]              │  │
│                  │ │ [✍️ Batch Write All Content]           │  │
│                  │ │ [🔄 Repurpose Last Post]               │  │
│                  │ └─────────────────────────────────────┘  │
│                  │                                           │
│                  │ ┌─ Pending Review (5 items) ───────────┐  │
│                  │ │                                       │  │
│                  │ │ 📋 Weekly Content Plan                 │  │
│                  │ │ by Content Strategist · 2h ago         │  │
│                  │ │ 7 konten direncanakan                  │  │
│                  │ │ [👀 Review] [✅ Approve All]           │  │
│                  │ │                                       │  │
│                  │ │ ✍️ 5 Captions Generated                │  │
│                  │ │ by Copywriter Agent · 1h ago           │  │
│                  │ │ [👀 Review] [✅ Approve All]           │  │
│                  │ │                                       │  │
│                  │ │ ⚠️ Brand Voice Alert                   │  │
│                  │ │ by Voice Guardian · 30m ago            │  │
│                  │ │ 2 konten mengandung kata dihindari     │  │
│                  │ │ [👀 Review] [🔧 Auto-Fix]             │  │
│                  │ │                                       │  │
│                  │ └─────────────────────────────────────┘  │
│                  │                                           │
│                  │ ┌─ Agent Status ───────────────────────┐  │
│                  │ │                                       │  │
│                  │ │ 📋 Content Strategist     ✅ Active    │  │
│                  │ │    Next run: Senin 07:00 WIB          │  │
│                  │ │    Last: 7 konten planned              │  │
│                  │ │                                       │  │
│                  │ │ ✍️ Copywriter Batch       ✅ Active    │  │
│                  │ │    Trigger: After Strategist           │  │
│                  │ │    Last: 12 captions generated         │  │
│                  │ │                                       │  │
│                  │ │ 🛡️ Brand Voice Guardian   ✅ Always On │  │
│                  │ │    Checked: 45 outputs this week       │  │
│                  │ │                                       │  │
│                  │ │ 📊 Engagement Analyst     ✅ Active    │  │
│                  │ │    Next run: Besok 08:00 WIB           │  │
│                  │ │    Last insight: "Carousel 3x better"  │  │
│                  │ │                                       │  │
│                  │ │ 📢 Ads Optimizer          🔒 Pro Only  │  │
│                  │ │ 🕵️ Competitor Intel       🔒 Pro Only  │  │
│                  │ │ 💌 Lead Nurture           🔒 Pro Only  │  │
│                  │ │ 🔄 Repurpose              ✅ On-demand │  │
│                  │ │                                       │  │
│                  │ │ [⚙️ Agent Settings]                   │  │
│                  │ └─────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

---

# Agent 1: Content Strategist (AG-01)

**Phase:** Phase 1 (Sprint 1-2)
**Trigger:** Scheduled (default: Senin 07:00 WIB) + On-demand
**Priority:** P0

---

## 1.1 User Stories

| ID | Story | Priority |
|----|-------|----------|
| AG01-01 | Sebagai creator, saya ingin AI otomatis bikin content plan mingguan berdasarkan brand & produk saya | P0 |
| AG01-02 | Sebagai creator, saya ingin content plan sudah balance antar pilar (Awareness, Showcase, Education, Social Proof) | P0 |
| AG01-03 | Sebagai creator, saya ingin memilih berapa konten per minggu yang direncanakan (3, 5, 7, atau custom) | P0 |
| AG01-04 | Sebagai creator, saya ingin AI suggest topik berdasarkan trending di niche saya | P1 |
| AG01-05 | Sebagai creator, saya ingin review & edit plan sebelum di-apply ke calendar | P0 |
| AG01-06 | Sebagai creator, saya ingin plan otomatis include waktu posting optimal per platform | P1 |

## 1.2 Agent Flow

```
[Trigger: Scheduled/Manual]
       ↓
[Load Context]
  - Brand profile (name, niche, target_audience, tone)
  - Products (active products)
  - Recent content (last 2 weeks dari calendar)
  - Performance data (top performing content types & topics)
  - Current pilar distribution
       ↓
[AI Planning — Groq API]
  System: "Kamu adalah content strategist untuk brand Indonesia."
  User: context + preferences + "Buat content plan untuk minggu ini"
       ↓
[Output: Weekly Content Plan]
  {
    week: "14-20 April 2026",
    theme: "Launch Week: Karaya Finance",
    contents: [
      {
        day: "Senin",
        date: "2026-04-14",
        type: "carousel",
        platform: "instagram",
        pillar: "education",
        topic: "5 Tanda Kamu Butuh App Keuangan Sendiri",
        angle: "Problem awareness → product as solution",
        suggested_time: "12:00 WIB",
        reasoning: "Education carousel performs 3x better on Monday lunch"
      },
      ...
    ],
    pillar_distribution: { awareness: 2, showcase: 1, education: 2, social_proof: 2 },
    notes: "Minggu ini fokus launch, tambahkan 1 social proof extra"
  }
       ↓
[Save to agent_outputs — status: pending_review]
       ↓
[Notify user: "Content plan minggu ini sudah siap. Review yuk!"]
       ↓
[User reviews & approves]
       ↓
[Apply: Create entries di content_calendar]
  - Optional: Auto-trigger Copywriter Batch Agent
```

## 1.3 AI Prompt

```
{{SYSTEM_PROMPT — brand context}}

TASK: Buat content plan untuk minggu {{week_date}}.

CONTEXT:
- Jumlah konten yang diinginkan: {{content_count}} per minggu
- Platform aktif: {{platforms}}
- Produk yang dipromosikan: {{products}}
- Konten 2 minggu terakhir: {{recent_content_summary}}
- Top performing: {{top_content_types}}
- Current pilar balance: {{pillar_stats}}

RULES:
1. Balance pilar: minimum 1 konten per pilar per minggu
2. Variasi format: jangan semua caption, campurkan carousel, thread, dll
3. Setiap konten harus punya angle yang jelas dan berbeda
4. Suggest waktu posting berdasarkan platform best practices Indonesia
5. Jika ada momen/hari penting minggu itu, manfaatkan (payday, hari libur, dll)
6. Reasoning: jelaskan kenapa topik & format ini dipilih

FORMAT OUTPUT (JSON):
{
  "week": "...",
  "theme": "...",
  "contents": [
    {
      "day": "...",
      "date": "YYYY-MM-DD",
      "type": "caption|carousel|thread|ad_copy|video_script",
      "platform": "instagram|tiktok|twitter|facebook",
      "pillar": "awareness|showcase|education|social_proof",
      "topic": "...",
      "angle": "...",
      "suggested_time": "HH:MM WIB",
      "reasoning": "..."
    }
  ],
  "pillar_distribution": { "awareness": N, "showcase": N, "education": N, "social_proof": N },
  "notes": "..."
}
```

## 1.4 Acceptance Criteria

| ID | Criteria |
|----|----------|
| AC-AG01-01 | Agent menghasilkan plan dengan jumlah konten sesuai setting user (default 5/minggu) |
| AC-AG01-02 | Setiap pilar minimal 1 konten per minggu (balance check) |
| AC-AG01-03 | Plan muncul di Agent Dashboard sebagai "Pending Review" |
| AC-AG01-04 | User bisa edit individual items sebelum approve |
| AC-AG01-05 | Approve → otomatis buat entries di content_calendar dengan status "Draft" |
| AC-AG01-06 | Optional: approve → auto-trigger Copywriter Batch Agent |
| AC-AG01-07 | Agent run log tersimpan di agent_runs dengan input/output lengkap |

---

# Agent 2: Copywriter Batch (AG-02)

**Phase:** Phase 1 (Sprint 1-2)
**Trigger:** After Content Strategist (chained) + On-demand
**Priority:** P0

---

## 2.1 User Stories

| ID | Story | Priority |
|----|-------|----------|
| AG02-01 | Sebagai creator, saya ingin AI otomatis bikin semua copy untuk content plan minggu ini sekaligus | P0 |
| AG02-02 | Sebagai creator, saya ingin hasil copy langsung tersimpan di calendar entries yang sudah ada | P0 |
| AG02-03 | Sebagai creator, saya ingin review setiap copy sebelum di-finalize | P0 |
| AG02-04 | Sebagai creator, saya ingin regenerate individual copy yang kurang bagus | P1 |
| AG02-05 | Sebagai creator, saya ingin AI generate multiple variasi per konten untuk A/B testing | P1 |

## 2.2 Agent Flow

```
[Trigger: After Strategist approve / Manual]
       ↓
[Load Context]
  - Content plan items (dari calendar entries status "Draft" tanpa body)
  - Brand voice profile
  - Product info
  - Copy library (past best performers)
       ↓
[Batch Generate — Groq API]
  For each content plan item:
    - Build prompt sesuai type (caption/carousel/thread/ad_copy/video_script)
    - Include brand context + product context
    - Generate 1-3 variasi per item
       ↓
[Output: Batch Content]
  {
    plan_week: "14-20 April 2026",
    items: [
      {
        calendar_id: "uuid",
        type: "carousel",
        topic: "5 Tanda Kamu Butuh App Keuangan Sendiri",
        variations: [
          {
            variation: "A",
            content: { slides: [...], caption: "...", hashtags: [...] },
            brand_voice_score: 92
          },
          {
            variation: "B",
            content: { slides: [...], caption: "...", hashtags: [...] },
            brand_voice_score: 88
          }
        ]
      },
      ...
    ],
    total_generations: 12,
    tokens_used: 8400
  }
       ↓
[Auto-run Brand Voice Guardian check]
       ↓
[Save to agent_outputs — status: pending_review]
       ↓
[Notify user: "12 konten sudah siap. Review & pilih variasi terbaik!"]
       ↓
[User reviews, picks variations, edits]
       ↓
[Apply: Update content_calendar entries dengan body + save to generation_history]
```

## 2.3 Acceptance Criteria

| ID | Criteria |
|----|----------|
| AC-AG02-01 | Agent generate copy untuk semua draft items di calendar yang belum punya body |
| AC-AG02-02 | Setiap item punya minimal 1 variasi, Pro/Agency user bisa generate 2-3 variasi |
| AC-AG02-03 | Output mengikuti brand voice — setiap variasi punya brand_voice_score |
| AC-AG02-04 | User bisa review side-by-side dan pilih variasi winner |
| AC-AG02-05 | Approve → update content_calendar.body dengan selected variation |
| AC-AG02-06 | Semua generation ter-track di generation_history & usage_monthly |
| AC-AG02-07 | Rate limiting: max 2 concurrent Groq requests, queue sisanya |

---

# Agent 3: Engagement Analyst (AG-03)

**Phase:** Phase 2 (Sprint 13-14)
**Trigger:** Scheduled (daily 08:00 WIB) + Weekly digest (Senin 09:00)
**Priority:** P1

---

## 3.1 User Stories

| ID | Story | Priority |
|----|-------|----------|
| AG03-01 | Sebagai creator, saya ingin AI analisis konten mana yang perform terbaik minggu ini dan kenapa | P1 |
| AG03-02 | Sebagai creator, saya ingin rekomendasi waktu posting optimal berdasarkan data saya sendiri | P1 |
| AG03-03 | Sebagai creator, saya ingin tahu pilar mana yang underperforming | P1 |
| AG03-04 | Sebagai creator, saya ingin weekly insight report yang actionable (bukan cuma angka) | P0 |
| AG03-05 | Sebagai creator, saya ingin notifikasi kalau ada konten yang viral (engagement spike) | P2 |

## 3.2 Agent Flow

```
[Trigger: Daily scheduled / Weekly digest]
       ↓
[Collect Data]
  - Content performance (last 7/30 days)
    → engagement rate, clicks, saves per content
  - Platform metrics (followers, reach)
  - Smart link clicks & conversions
  - Pilar distribution & performance
  - Posting time vs engagement correlation
       ↓
[AI Analysis — Groq API]
  System: "Kamu adalah data analyst marketing untuk brand Indonesia."
  User: raw metrics + "Analisis dan berikan insight actionable"
       ↓
[Output: Engagement Report]
  {
    period: "7-13 April 2026",
    highlights: [
      {
        type: "top_content",
        title: "Carousel '5 Tanda...' perform 3x above average",
        metric: { engagement_rate: 8.2, avg: 2.7 },
        insight: "Education carousel dengan problem-awareness angle resonate kuat",
        action: "Buat lebih banyak carousel problem-awareness minggu depan"
      },
      {
        type: "optimal_time",
        title: "Posting jam 12:00-13:00 WIB engagement 40% lebih tinggi",
        data: { best_hours: ["12:00","19:00"], worst_hours: ["06:00","22:00"] },
        action: "Pindahkan jadwal posting ke jam 12 atau 19 WIB"
      },
      {
        type: "pilar_gap",
        title: "Social Proof pilar 0 konten minggu ini",
        action: "Tambah 2 testimonial/case study konten minggu depan"
      },
      {
        type: "platform_comparison",
        title: "Instagram reach turun 15%, TikTok naik 22%",
        action: "Pertimbangkan alokasi lebih banyak konten ke TikTok"
      }
    ],
    recommendations: [
      "Buat 2 carousel education minggu depan (format terbaik)",
      "Post di jam 12:00 WIB (sweet spot audience kamu)",
      "Tambah 1 social proof: screenshot testimonial buyer"
    ],
    weekly_score: 72, // 0-100 marketing health score
    trend: "up" // dibanding minggu lalu
  }
       ↓
[Save to agent_outputs]
       ↓
[Notify: Push notification + in-app card]
       ↓
[Optional: Feed insights ke Content Strategist untuk plan minggu depan]
```

## 3.3 Acceptance Criteria

| ID | Criteria |
|----|----------|
| AC-AG03-01 | Daily insight berisi minimal 2 actionable recommendations |
| AC-AG03-02 | Weekly digest berisi full report dengan highlights, recommendations, dan score |
| AC-AG03-03 | Insights feed ke Content Strategist agent sebagai context tambahan |
| AC-AG03-04 | Marketing health score 0-100 dengan trend indicator |
| AC-AG03-05 | Spike detection: alert jika konten engagement 3x above average |

---

# Agent 4: Ads Optimizer (AG-04)

**Phase:** Phase 2 (Sprint 9-10, setelah Ads Manager live)
**Trigger:** Scheduled (setiap 6 jam) + Event-based (budget threshold)
**Priority:** P2
**Tier:** Pro & Agency only

---

## 4.1 User Stories

| ID | Story | Priority |
|----|-------|----------|
| AG04-01 | Sebagai creator, saya ingin AI monitor semua running ads dan alert jika ROAS turun di bawah threshold | P0 |
| AG04-02 | Sebagai creator, saya ingin AI auto-suggest pause untuk ads yang underperform | P1 |
| AG04-03 | Sebagai creator, saya ingin AI suggest realokasi budget dari underperformer ke winner | P1 |
| AG04-04 | Sebagai creator, saya ingin AI generate ad copy variations baru untuk refresh creative | P1 |
| AG04-05 | Sebagai creator, saya ingin alert jika daily spend mendekati budget limit | P0 |

## 4.2 Agent Flow

```
[Trigger: Every 6 hours / Budget threshold event]
       ↓
[Collect Ads Data]
  - Active campaigns (via Meta Marketing API sync)
  - Spend, impressions, clicks, CTR, CPC, conversions, ROAS per campaign
  - Budget utilization percentage
  - Historical performance trend (7-day rolling)
       ↓
[AI Analysis — Groq API]
  System: "Kamu adalah performance marketing specialist."
  User: campaign metrics + rules + "Analisis dan optimasi"
       ↓
[Output: Optimization Recommendations]
  {
    checked_at: "2026-04-10T12:00:00Z",
    campaigns_analyzed: 3,
    alerts: [
      {
        type: "low_roas",
        severity: "high",
        campaign: "Karaya - Broad Audience",
        current_roas: 0.8,
        threshold: 1.0,
        recommendation: "Pause campaign — ROAS 0.8x sudah 3 hari berturut-turut",
        action: { type: "pause_campaign", campaign_id: "uuid" }
      },
      {
        type: "budget_warning",
        severity: "medium",
        campaign: "Karaya Finance - Awareness",
        budget_used: 85,
        recommendation: "Budget 85% terpakai, estimated habis dalam 2 hari",
        action: null
      }
    ],
    optimizations: [
      {
        type: "budget_reallocation",
        from: "Karaya - Broad Audience (ROAS 0.8x)",
        to: "Karaya - Retarget (ROAS 5.8x)",
        amount: "Rp 30K/hari",
        expected_impact: "+Rp 174K revenue/hari",
        action: { type: "reallocate", from_id: "uuid", to_id: "uuid", amount: 30000 }
      },
      {
        type: "creative_refresh",
        campaign: "Karaya Finance - Awareness",
        reason: "CTR turun 20% dalam 5 hari — creative fatigue",
        action: { type: "generate_new_copy", campaign_id: "uuid" }
      }
    ]
  }
       ↓
[Save alerts & recommendations to agent_outputs]
       ↓
[Notify user — high severity alerts get push notification]
       ↓
[User reviews & approves actions]
  - Pause campaign → call Meta Ads API
  - Reallocate budget → update campaign budgets via API
  - Refresh creative → trigger Copywriter Agent for ad copy
```

## 4.3 Acceptance Criteria

| ID | Criteria |
|----|----------|
| AC-AG04-01 | Agent check running ads setiap 6 jam, alert jika ROAS < user-defined threshold (default 1.0x) |
| AC-AG04-02 | Budget warning saat spend > 80% of daily/total budget |
| AC-AG04-03 | Pause recommendation butuh user approval sebelum execute |
| AC-AG04-04 | Budget reallocation butuh user approval sebelum execute |
| AC-AG04-05 | Creative refresh auto-trigger Copywriter Agent untuk generate new ad copy |
| AC-AG04-06 | Semua actions logged di activity_log untuk audit trail |

---

# Agent 5: Competitor Intelligence (AG-05)

**Phase:** Phase 2 (Sprint 10)
**Trigger:** Scheduled (daily) + On-demand
**Priority:** P2
**Tier:** Pro & Agency only

---

## 5.1 User Stories

| ID | Story | Priority |
|----|-------|----------|
| AG05-01 | Sebagai creator, saya ingin monitor iklan kompetitor di Meta Ad Library | P2 |
| AG05-02 | Sebagai creator, saya ingin tahu jika kompetitor launch campaign baru | P2 |
| AG05-03 | Sebagai creator, saya ingin AI analisis strategi kompetitor dan suggest counter-strategy | P2 |
| AG05-04 | Sebagai creator, saya ingin track perubahan kompetitor over time (spend increase, new creative) | P2 |

## 5.2 Agent Flow

```
[Trigger: Daily scheduled / Manual]
       ↓
[Configure Competitors]
  - User setup: 3-5 competitor brand/page names
  - Agent tracks their Meta Ad Library data
       ↓
[Scrape/Fetch Data]
  - Meta Ad Library API: active ads, creative type, running time
  - (Optional) Competitor social media stats if public API available
       ↓
[AI Analysis — Groq API]
  Compare competitor activity vs last scan:
  - New ads launched
  - Ads stopped
  - Creative patterns (video vs image, copy angles)
  - Estimated spend changes
       ↓
[Output: Competitor Intel Report]
  {
    scan_date: "2026-04-10",
    competitors: [
      {
        name: "CompetitorX",
        new_ads: 3,
        stopped_ads: 1,
        active_ads_total: 8,
        notable_changes: [
          "Launched 3 video ads focusing on 'diskon 50%' angle",
          "Stopped text-heavy image ad (likely underperform)"
        ],
        creative_analysis: "Shifting from educational to promotional — likely sales push",
        counter_strategy: "Counter dengan education content yang highlight value, bukan harga"
      }
    ],
    overall_insight: "Kompetitor sedang agresif di paid ads. Fokus ke organic content quality sebagai differentiator."
  }
       ↓
[Save to agent_outputs]
[Notify user: weekly competitor digest]
```

## 5.3 Acceptance Criteria

| ID | Criteria |
|----|----------|
| AC-AG05-01 | User bisa setup sampai 5 kompetitor untuk di-monitor |
| AC-AG05-02 | Daily scan mendeteksi new/stopped ads |
| AC-AG05-03 | AI memberikan counter-strategy yang actionable |
| AC-AG05-04 | Weekly digest summary ke email / in-app notification |

---

# Agent 6: Lead Nurture (AG-06)

**Phase:** Phase 2 (Sprint 11-12, setelah CRM live)
**Trigger:** Event-based (purchase, signup, inactivity) + Scheduled
**Priority:** P2
**Tier:** Pro & Agency only

---

## 6.1 User Stories

| ID | Story | Priority |
|----|-------|----------|
| AG06-01 | Sebagai seller, saya ingin AI auto-send WA/email follow-up setelah purchase | P1 |
| AG06-02 | Sebagai seller, saya ingin AI auto-request testimonial setelah 7 hari purchase | P1 |
| AG06-03 | Sebagai seller, saya ingin AI re-engage leads yang inactive 30+ hari | P2 |
| AG06-04 | Sebagai seller, saya ingin AI personalize follow-up message berdasarkan produk yang dibeli | P1 |
| AG06-05 | Sebagai seller, saya ingin melihat conversion funnel: follow-up sent → opened → replied → converted | P2 |

## 6.2 Agent Flow

```
[Trigger: Database trigger on new purchase / Scheduled scan for inactive leads]
       ↓
[Determine Action]
  Event: new_purchase
  → Day 0: Thank you message (WA/email)
  → Day 3: Tips penggunaan produk
  → Day 7: Request testimonial
  → Day 14: Upsell related product (jika ada)

  Event: lead_inactive_30d
  → Re-engagement message dengan konten edukasi
  → Jika masih inactive setelah 7 hari → mark as "cold"

  Event: lead_signup (belum beli)
  → Day 0: Welcome + value proposition
  → Day 3: Social proof / testimonial
  → Day 7: Limited offer / urgency
       ↓
[AI Personalization — Groq API]
  Generate personalized message berdasarkan:
  - Contact name
  - Product purchased
  - Brand voice
  - Channel (WA template vs email)
       ↓
[Output: Follow-up Message]
  {
    contact_id: "uuid",
    channel: "whatsapp",
    template: "post_purchase_day0",
    message: "Hai Rina! 🎉 Terima kasih sudah beli Panduan Karaya Finance...",
    scheduled_at: "2026-04-10T10:00:00Z",
    status: "pending_approval"
  }
       ↓
[If auto-send enabled → send via Resend/WA API]
[If manual → save to agent_outputs for review]
       ↓
[Track: sent, opened, replied, converted]
```

## 6.3 Acceptance Criteria

| ID | Criteria |
|----|----------|
| AC-AG06-01 | Post-purchase sequence (day 0, 3, 7, 14) jalan otomatis |
| AC-AG06-02 | Messages personalized per contact (nama, produk, brand voice) |
| AC-AG06-03 | User bisa pilih auto-send atau manual review per sequence |
| AC-AG06-04 | Tracking metrics: sent, opened, replied per message |
| AC-AG06-05 | Inactive lead detection scan daily, re-engagement auto-trigger |
| AC-AG06-06 | WA messages menggunakan template yang sudah approved (WhatsApp Business API compliance) |

---

# Agent 7: Brand Voice Guardian (AG-07)

**Phase:** Phase 1 (Sprint 1-2)
**Trigger:** Event-based (pre-publish, post-generate) — Always active
**Priority:** P1

---

## 7.1 User Stories

| ID | Story | Priority |
|----|-------|----------|
| AG07-01 | Sebagai creator, saya ingin setiap output AI otomatis dicek kesesuaian brand voice-nya | P0 |
| AG07-02 | Sebagai creator, saya ingin di-alert jika ada kata-kata yang dihindari di konten | P0 |
| AG07-03 | Sebagai creator, saya ingin AI suggest perbaikan jika tone tidak sesuai | P1 |
| AG07-04 | Sebagai creator, saya ingin melihat brand voice score untuk setiap konten | P1 |
| AG07-05 | Sebagai creator, saya ingin auto-fix minor issues tanpa harus review manual | P2 |

## 7.2 Agent Flow

```
[Trigger: After any content generation / Before publish]
       ↓
[Load Brand Profile]
  - Tone settings (casual, profesional, etc)
  - Favorite words list
  - Avoided words list
  - Brand description & target audience
       ↓
[Check Content — Groq API]
  System: "Kamu adalah brand voice QA specialist."
  User: brand profile + content + "Evaluasi kesesuaian brand voice"
       ↓
[Output: Voice Check Report]
  {
    content_id: "uuid",
    overall_score: 92, // 0-100
    tone_match: true,
    issues: [
      {
        type: "avoided_word",
        severity: "high",
        word: "murah",
        location: "caption line 3",
        suggestion: "Ganti 'murah' dengan 'terjangkau' atau 'hemat'"
      },
      {
        type: "tone_drift",
        severity: "low",
        detail: "Paragraf terakhir terlalu formal untuk tone casual",
        suggestion: "Ubah 'Silakan kunjungi' menjadi 'Cek langsung di'"
      }
    ],
    favorite_words_used: ["gratis", "tanpa coding"],
    auto_fixable: true // jika semua issues bisa di-auto-fix
  }
       ↓
[If score >= 80 && no high severity → Auto-pass]
[If score < 80 || high severity issues → Alert user]
       ↓
[Optional: Auto-fix]
  - Replace avoided words dengan alternatives
  - Adjust tone per suggestion
  - Re-check setelah fix
```

## 7.3 Integration Points

```
1. Post-Generate Hook:
   Setiap kali user generate content (caption, carousel, dll),
   Guardian otomatis check output SEBELUM ditampilkan ke user.
   → Score ditampilkan di output card: "Brand Voice: 92/100 ✅"

2. Pre-Publish Hook:
   Sebelum konten di-publish (manual atau scheduled),
   Guardian melakukan final check.
   → Jika score < 70, block publish dan notify user.

3. Batch Check:
   Setelah Copywriter Batch Agent selesai,
   Guardian check semua output sekaligus.
   → Flag konten yang perlu revision.
```

## 7.4 Acceptance Criteria

| ID | Criteria |
|----|----------|
| AC-AG07-01 | Setiap AI generation otomatis di-check, score ditampilkan (0-100) |
| AC-AG07-02 | Avoided words terdeteksi 100% (rule-based, tidak bergantung AI saja) |
| AC-AG07-03 | Suggestion untuk fix disediakan untuk setiap issue |
| AC-AG07-04 | Auto-fix mode tersedia (replace avoided words + minor tone adjustments) |
| AC-AG07-05 | Score < 70 di pre-publish → block publish, notify user |
| AC-AG07-06 | Tidak menambah latency signifikan (< 2 detik tambahan per check via Groq) |

---

# Agent 8: Repurpose Agent (AG-08)

**Phase:** Phase 1 (Sprint 3-4)
**Trigger:** On-demand
**Priority:** P1

---

## 8.1 User Stories

| ID | Story | Priority |
|----|-------|----------|
| AG08-01 | Sebagai creator, saya ingin ubah 1 thread jadi carousel script, caption IG, TikTok script sekaligus | P1 |
| AG08-02 | Sebagai creator, saya ingin repurpose dari blog post / long-form ke multi-format | P1 |
| AG08-03 | Sebagai creator, saya ingin setiap format otomatis optimized untuk platform target | P0 |
| AG08-04 | Sebagai creator, saya ingin preview semua format side-by-side sebelum save | P1 |
| AG08-05 | Sebagai creator, saya ingin repurpose dari konten yang sudah di-publish (dari calendar history) | P1 |

## 8.2 Agent Flow

```
[Trigger: User clicks "Repurpose" on any content]
       ↓
[Input]
  - Source content (text/thread/carousel script/blog post)
  - Source format (thread, caption, carousel, blog, video_script)
  - Target formats (multi-select: caption_ig, carousel, thread, tiktok_script, email, ad_copy)
  - Brand voice profile
       ↓
[AI Repurpose — Groq API]
  For each target format:
    - Adapt content to format requirements
    - Optimize for platform (char limit, style, hashtags)
    - Maintain core message while changing structure
       ↓
[Output: Multi-Format Content]
  {
    source: { type: "thread", content: "..." },
    repurposed: [
      {
        format: "carousel",
        platform: "instagram",
        content: { slides: [...], caption: "...", hashtags: [...] },
        brand_voice_score: 90
      },
      {
        format: "caption",
        platform: "tiktok",
        content: { text: "...", hashtags: [...] },
        brand_voice_score: 88
      },
      {
        format: "email_newsletter",
        content: { subject: "...", body: "..." },
        brand_voice_score: 95
      }
    ],
    total_formats: 3
  }
       ↓
[Brand Voice Guardian check semua output]
       ↓
[Save to agent_outputs — status: pending_review]
       ↓
[User reviews side-by-side, edits, approves]
       ↓
[Apply: Save to library / Add to calendar per format]
```

## 8.3 Supported Repurpose Matrix

```
FROM ↓ / TO →      │ Caption │ Carousel │ Thread │ TikTok │ Email │ Ad Copy │
────────────────────┼─────────┼──────────┼────────┼────────┼───────┼─────────┤
Caption             │   —     │    ✅    │   ✅   │   ✅   │  ✅   │   ✅    │
Carousel Script     │   ✅    │    —     │   ✅   │   ✅   │  ✅   │   ✅    │
Thread              │   ✅    │    ✅    │   —    │   ✅   │  ✅   │   ✅    │
Video Script        │   ✅    │    ✅    │   ✅   │   —    │  ✅   │   ✅    │
Blog Post           │   ✅    │    ✅    │   ✅   │   ✅   │  ✅   │   ✅    │
Ad Copy             │   ✅    │    ✅    │   ✅   │   ✅   │  ✅   │   —     │
Email               │   ✅    │    ✅    │   ✅   │   ✅   │  —    │   ✅    │
```

## 8.4 Acceptance Criteria

| ID | Criteria |
|----|----------|
| AC-AG08-01 | Input 1 konten → output ke semua target format yang dipilih (min 2, max 6) |
| AC-AG08-02 | Setiap format mengikuti platform-specific rules (char limit, style) |
| AC-AG08-03 | Brand Voice Guardian auto-check semua output |
| AC-AG08-04 | Side-by-side preview tersedia sebelum save |
| AC-AG08-05 | User bisa save individual formats ke library atau calendar |
| AC-AG08-06 | Repurpose dari calendar history: user bisa klik konten yang sudah published → repurpose |

---

# Agent Orchestrator Specification

## Orchestrator Responsibilities

```
1. SCHEDULING
   - Manage cron schedules per agent per user
   - Execute agents on time, handle timezone (WIB default)
   - Stagger execution to avoid Groq API rate limit

2. CHAINING
   - Content Strategist → Copywriter Batch → Brand Voice Guardian
   - Support configurable chains (user bisa disable auto-chain)

3. RATE LIMITING
   - Global: max 50 Groq API calls per agent run
   - Per user: max 5 concurrent agent operations
   - Queue overflow: delay, don't drop

4. ERROR HANDLING
   - Groq API timeout → retry 3x with exponential backoff
   - Groq API down → queue task, notify user, retry in 30 min
   - Partial failure → save successful outputs, flag failed ones

5. NOTIFICATIONS
   - In-app: badge count on Agent sidebar menu
   - Email: daily digest of pending reviews (configurable)
   - Push: high-severity alerts only (ads ROAS drop, publish fail)
```

## Agent Chaining Flow

```
[Senin 07:00 WIB — Weekly Automation]

Step 1: Content Strategist Agent
  → Generate weekly content plan (7 items)
  → Status: pending_review
       ↓
[User approves plan — or auto-approve if configured]
       ↓
Step 2: Copywriter Batch Agent (auto-triggered)
  → Generate copy for all 7 items
  → Include 2 variasi per item (Pro/Agency)
       ↓
Step 3: Brand Voice Guardian (auto-triggered)
  → Check semua 14 copies
  → Auto-fix minor issues
  → Flag major issues
       ↓
Step 4: User Review
  → Review pending items di Agent Dashboard
  → Pick variasi, edit jika perlu
  → Approve → items move to "Scheduled" di calendar
       ↓
[Automation complete — 1 minggu konten siap dalam ~30 menit review]
```

## Edge Function: Agent Scheduler

```javascript
// supabase/functions/agent-scheduler/index.ts
// Runs every minute via Supabase cron

export async function handleScheduledAgents() {
  const now = new Date();

  // Find all agent configs where schedule matches current time
  const dueAgents = await supabase
    .from('agent_configs')
    .select('*, brands(*), profiles(*)')
    .eq('is_enabled', true)
    .lte('next_run_at', now.toISOString());

  for (const config of dueAgents) {
    // Check user subscription tier allows this agent
    if (!isAgentAllowed(config.agent_type, config.profiles.subscription_tier)) {
      continue;
    }

    // Check rate limits
    if (await isRateLimited(config.user_id)) {
      await queueAgent(config);
      continue;
    }

    // Create agent run
    const run = await createAgentRun({
      user_id: config.user_id,
      brand_id: config.brand_id,
      agent_type: config.agent_type,
      trigger_type: 'scheduled',
      input_params: config.settings
    });

    // Execute agent (non-blocking)
    executeAgent(run.id, config).catch(err => {
      updateAgentRun(run.id, { status: 'failed', error_message: err.message });
      notifyUser(config.user_id, {
        type: 'agent_error',
        agent: config.agent_type,
        message: `Agent ${config.agent_type} gagal: ${err.message}`
      });
    });

    // Update next run time
    await updateNextRunTime(config);
  }
}
```

---

## Implementation Timeline

| Agent | Phase | Sprint | Dependencies |
|-------|-------|--------|-------------|
| Agent Orchestrator (infrastructure) | Phase 1 | Sprint 1-2 | Supabase Edge Functions |
| AG-01 Content Strategist | Phase 1 | Sprint 1-2 | Orchestrator, brands, products tables |
| AG-02 Copywriter Batch | Phase 1 | Sprint 1-2 | AG-01, content generator module |
| AG-07 Brand Voice Guardian | Phase 1 | Sprint 1-2 | brands table (voice profile) |
| AG-08 Repurpose Agent | Phase 1 | Sprint 3-4 | Content generator module, AG-07 |
| AG-03 Engagement Analyst | Phase 2 | Sprint 13-14 | Analytics module, content performance data |
| AG-04 Ads Optimizer | Phase 2 | Sprint 9-10 | Ads Manager module, Meta Ads API |
| AG-05 Competitor Intel | Phase 2 | Sprint 10 | Meta Ad Library API access |
| AG-06 Lead Nurture | Phase 2 | Sprint 11-12 | CRM module, Resend/WA API |

---

## External API Dependencies per Agent

Agents yang berjalan di Phase 2+ membutuhkan koneksi ke external API (social media & ads platform). Section ini mendefinisikan mapping agent ↔ API, data sync flow, dan rate limit strategy khusus untuk agent consumption.

### Agent ↔ API Dependency Matrix

```
Agent                    │ Groq │ Meta   │ Threads │ Meta     │ Meta Ad │ Twitter │ TikTok │ YouTube  │ Resend │ WA
                         │ API  │ Graph  │ API     │ Marketing│ Library │ API v2  │ API    │ Data API │ API    │ Business
─────────────────────────┼──────┼────────┼─────────┼──────────┼─────────┼─────────┼────────┼──────────┼────────┼────────
AG-01 Content Strategist │  ✅  │   —    │    —    │    —     │    —    │    —    │   —    │    —     │   —    │   —
AG-02 Copywriter Batch   │  ✅  │   —    │    —    │    —     │    —    │    —    │   —    │    —     │   —    │   —
AG-03 Engagement Analyst │  ✅  │  ✅*   │   ✅*   │   ✅*    │    —    │   ✅*   │  ✅*   │   ✅*    │   —    │   —
AG-04 Ads Optimizer      │  ✅  │   —    │    —    │   ✅     │    —    │    —    │   —    │    —     │   —    │   —
AG-05 Competitor Intel   │  ✅  │   —    │    —    │    —     │   ✅    │    —    │   —    │    —     │   —    │   —
AG-06 Lead Nurture       │  ✅  │   —    │    —    │    —     │    —    │    —    │   —    │    —     │  ✅    │  ✅
AG-07 Brand Voice Guard  │  ✅  │   —    │    —    │    —     │    —    │    —    │   —    │    —     │   —    │   —
AG-08 Repurpose Agent    │  ✅  │   —    │    —    │    —     │    —    │    —    │   —    │    —     │   —    │   —

* = read-only (fetch metrics/insights), bukan write/publish
```

### Data Sync Flow: Social Media → Agents

Agents tidak langsung call external API real-time. Sebaliknya, data di-sync ke database terlebih dahulu oleh background jobs, lalu agents membaca dari database lokal. Ini untuk:
1. Mengurangi API rate limit pressure
2. Agent bisa jalan bahkan jika external API temporarily down
3. Data consistency — semua agent pakai snapshot yang sama

```
┌─────────────────────────────────────────────────────────────────┐
│                   Background Sync Jobs                           │
│         (Supabase Edge Functions / Cron)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─ Social Metrics Sync ─────────────────────────────────────┐  │
│  │ Cron: Every 6 hours                                        │  │
│  │                                                             │  │
│  │ Instagram (Meta Graph API)                                  │  │
│  │   GET /{media-id}/insights                                  │  │
│  │   → impressions, reach, engagement, saves, shares           │  │
│  │   → sync ke: content_calendar.metrics (JSONB)               │  │
│  │                                                             │  │
│  │ Twitter (Twitter API v2)                                    │  │
│  │   GET /tweets/:id?tweet.fields=public_metrics               │  │
│  │   → impressions, likes, retweets, replies, url_link_clicks  │  │
│  │   → sync ke: content_calendar.metrics (JSONB)               │  │
│  │                                                             │  │
│  │ Threads (Threads API)                                        │  │
│  │   GET /{threads-media-id}/insights                           │  │
│  │   → views, likes, replies, reposts, quotes                   │  │
│  │   → sync ke: content_calendar.metrics (JSONB)               │  │
│  │                                                             │  │
│  │ TikTok (TikTok API)                                         │  │
│  │   GET /video/query/                                         │  │
│  │   → views, likes, comments, shares                          │  │
│  │   → sync ke: content_calendar.metrics (JSONB)               │  │
│  │                                                             │  │
│  │ YouTube (YouTube Data API v3)                                │  │
│  │   GET /videos?part=statistics&id={video_id}                  │  │
│  │   → views, likes, comments, favorites                        │  │
│  │   → sync ke: content_calendar.metrics (JSONB)               │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌─ Ads Insights Sync ───────────────────────────────────────┐  │
│  │ Cron: Daily 06:00 WIB + on-demand (post agent trigger)    │  │
│  │                                                             │  │
│  │ Meta Marketing API                                          │  │
│  │   GET /act_{ad_account_id}/insights                         │  │
│  │   fields: spend, impressions, clicks, ctr, cpc, actions,   │  │
│  │           cost_per_action_type, conversions, purchase_roas  │  │
│  │   → sync ke: ads_insights_daily                             │  │
│  │                                                             │  │
│  │ (Future: TikTok Ads API, Google Ads API)                    │  │
│  │   → same pattern, sync ke ads_insights_daily                │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌─ Competitor Ads Sync ─────────────────────────────────────┐  │
│  │ Cron: Daily 04:00 WIB                                      │  │
│  │                                                             │  │
│  │ Meta Ad Library API                                         │  │
│  │   GET /ads_archive                                          │  │
│  │   params: search_terms, ad_reached_countries=ID             │  │
│  │   → sync ke: competitor_ads_cache (new table)               │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                  │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                 Supabase Database (Local Cache)                   │
│                                                                  │
│  content_calendar.metrics   ← social media post metrics          │
│  ads_insights_daily         ← ads campaign performance           │
│  competitor_ads_cache       ← competitor ad library snapshots    │
│  publish_history            ← published post IDs per platform    │
│                                                                  │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                      AI Agents (Read from DB)                    │
│                                                                  │
│  AG-03 Engagement Analyst                                        │
│    → SELECT from content_calendar WHERE published_at > 7d ago    │
│    → Aggregate metrics, feed ke Groq for insight generation      │
│                                                                  │
│  AG-04 Ads Optimizer                                             │
│    → SELECT from ads_insights_daily WHERE campaign status=active │
│    → Compare ROAS vs threshold, feed ke Groq for recommendations │
│    → OUTPUT: recommendations (pause/reallocate/refresh)          │
│    → On user approve → WRITE back ke Meta Marketing API          │
│                                                                  │
│  AG-05 Competitor Intel                                          │
│    → SELECT from competitor_ads_cache                            │
│    → Diff vs yesterday snapshot, feed ke Groq for analysis       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Agent Write-Back Actions (Requires User Approval)

Beberapa agent tidak hanya baca data tapi juga perlu **menulis balik** ke external API. Semua write-back actions WAJIB melalui user approval.

```
┌─────────────────────────────────────────────────────────────────┐
│ Agent           │ Write Action              │ Target API         │
├─────────────────┼───────────────────────────┼────────────────────┤
│ AG-04 Ads Opt   │ Pause campaign            │ Meta Marketing API │
│                 │ POST /{campaign-id}       │ status=PAUSED      │
│                 │                           │                    │
│ AG-04 Ads Opt   │ Update budget             │ Meta Marketing API │
│                 │ POST /{adset-id}          │ daily_budget=X     │
│                 │                           │                    │
│ AG-06 Lead Nurt │ Send follow-up email      │ Resend API         │
│                 │ POST /emails              │ to, subject, html  │
│                 │                           │                    │
│ AG-06 Lead Nurt │ Send WA message           │ WA Business API    │
│                 │ POST /messages            │ template + params  │
└─────────────────┴───────────────────────────┴────────────────────┘

Flow:
  Agent generates recommendation
    → Save to agent_outputs (status: pending_review)
    → User approves
    → Orchestrator executes write-back API call
    → Log result to activity_log
    → Update agent_outputs (status: applied)
```

### Rate Limit Budget Allocation (Agent vs User)

Agents berbagi rate limit dengan user actions. Untuk menghindari agent menghabiskan quota, alokasi dibagi:

| API | Total Limit | User Actions | Agent Reserved | Strategy |
|-----|-------------|-------------|----------------|----------|
| Groq API | 14,400 req/day | 70% (10,080) | 30% (4,320) | Agent runs di off-peak hours (malam/pagi) |
| Meta Graph API | 200 calls/user/hour | 80% (160) | 20% (40) | Agent sync batched, 1 call per content |
| Meta Marketing API | 300 calls/hour/ad account | 70% (210) | 30% (90) | Agent sync max 1x per 6 jam |
| Meta Ad Library | 200 calls/hour (no auth) | 50% (100) | 50% (100) | Agent daily scan, batch by competitor |
| Threads API | 250 posts/user/24h | 80% (200) | 20% (50) | Agent reads only, metrics sync batched |
| Twitter API v2 | 1,500 tweets/month (free) | 90% (1,350) | 10% (150) | Agent only reads, minimal write |
| TikTok API | 1,000 calls/day | 80% (800) | 20% (200) | Agent sync batched |
| YouTube Data API v3 | 10,000 units/day | 80% (8,000) | 20% (2,000) | Agent reads only (1 unit per read), sync batched |
| Resend | 100 emails/day (free) | 70% (70) | 30% (30) | Agent auto-send capped |
| WA Business | Varies by plan | 60% | 40% | Agent respect template approval |

### Database Schema: Sync Cache Tables

```sql
-- SOCIAL MEDIA METRICS CACHE (extends content_calendar)
-- Ditambahkan sebagai kolom JSONB di content_calendar table
-- ALTER TABLE content_calendar ADD COLUMN platform_metrics JSONB DEFAULT '{}';
-- ALTER TABLE content_calendar ADD COLUMN metrics_synced_at TIMESTAMPTZ;

-- Contoh platform_metrics:
-- {
--   "instagram": { "impressions": 1200, "reach": 980, "engagement": 45, "saves": 12 },
--   "twitter": { "impressions": 3400, "likes": 23, "retweets": 5, "link_clicks": 87 }
-- }

-- COMPETITOR ADS CACHE
CREATE TABLE competitor_ads_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  competitor_name TEXT NOT NULL,
  competitor_page_id TEXT,
  platform TEXT DEFAULT 'meta',
  ad_id TEXT NOT NULL, -- platform ad ID
  ad_creative JSONB, -- { image_url, video_url, body_text, link_title, cta }
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  metadata JSONB, -- { estimated_reach, running_days, platforms }
  UNIQUE(user_id, ad_id)
);

CREATE INDEX idx_competitor_ads_user ON competitor_ads_cache(user_id, competitor_name, is_active);

-- SYNC LOG — Track sync job health
CREATE TABLE sync_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_type TEXT NOT NULL, -- 'social_metrics','ads_insights','competitor_ads'
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT,
  status TEXT DEFAULT 'completed' CHECK (status IN ('running','completed','failed')),
  items_synced INTEGER DEFAULT 0,
  api_calls_used INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
```

### Background Jobs Update (tambahan dari Phase 2)

| Job | Frequency | Purpose | Agent Consumer |
|-----|-----------|---------|----------------|
| social_metrics_sync | Every 6 hours | Sync post metrics dari IG/Twitter/TikTok | AG-03 Engagement Analyst |
| ads_insights_sync | Daily 06:00 WIB | Sync campaign insights dari Meta Ads | AG-04 Ads Optimizer |
| ads_insights_urgent_sync | Every 6 hours | Quick sync untuk active campaigns only | AG-04 Ads Optimizer |
| competitor_ads_scan | Daily 04:00 WIB | Scan Meta Ad Library per competitor | AG-05 Competitor Intel |
| agent_scheduler | Every 1 minute | Check & trigger scheduled agent runs | All agents |
| agent_queue_processor | Every 30 seconds | Process queued agent tasks | All agents |

### OAuth Token Access by Agents

Agents memerlukan access ke OAuth tokens yang tersimpan di `connected_accounts` table (Phase 2 Module 7). Flow:

```
[Agent needs to read/write to external API]
       ↓
[Load token from connected_accounts]
  - Decrypt access_token_encrypted
  - Check token_expires_at
       ↓
[If expired → auto-refresh]
  - Use refresh_token to get new access_token
  - Update connected_accounts
       ↓
[If refresh fails → mark needs_reconnect]
  - Agent run status → "failed"
  - Error: "Reconnect your {platform} account"
  - Notify user
       ↓
[If valid → proceed with API call]
  - Include access_token in request header
  - Log API call to sync_log
```

**Security:**
- Agent NEVER memiliki direct access ke raw tokens — selalu melalui token service layer
- Token decryption hanya terjadi di Edge Function runtime (server-side)
- Agent runs di-log lengkap di agent_runs — siapa, kapan, pakai API apa, berapa calls

---

## Success Metrics (Agents)

| Metric | Target (3 bulan) | Target (6 bulan) |
|--------|------------------|------------------|
| Agent adoption rate (% users yang aktifkan min 1 agent) | 60% | 80% |
| Avg time saved per user per week (via agents) | 3 jam | 6 jam |
| Content plan approval rate (Strategist output accepted) | 70% | 85% |
| Brand voice score avg (Guardian checks) | 82/100 | 90/100 |
| Agent-generated content publish rate | 50% | 70% |
| Ads Optimizer action acceptance rate | 40% | 60% |
