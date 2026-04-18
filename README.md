# Karaya Marketing Suite

Platform tools all-in-one berbasis web untuk content creation, marketing, ads management, dan analytics — khusus untuk creator/seller digital product di Indonesia.

## 🚀 Tech Stack

- **Frontend:** React + Vite + Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- **AI Engine:** Groq API (Llama 3.3 70B)
- **Hosting:** Vercel
- **Charts:** Recharts
- **API Server:** Fastify (standalone REST API + MCP server)

## 📁 Project Structure

```
├── src/                # React web app (Vite + Tailwind)
│   ├── components/         # UI components (auth, calendar, generator, etc.)
│   ├── hooks/              # Custom React hooks
│   ├── pages/              # Route pages
│   ├── services/           # API & business logic services
│   └── utils/              # Utility functions
├── api/                    # Standalone Fastify REST API + MCP server
│   ├── src/                # Server source code
│   ├── mcp/               # MCP server for AI agents
│   └── scripts/           # Helper scripts
├── supabase/
│   ├── functions/          # Deno Edge Functions
│   └── migrations/         # PostgreSQL schema migrations
├── doc/                    # Documentation (BRD, PRD, API docs)
└── public/                 # Static assets
```

## 🛠️ Setup

### Prerequisites

- Node.js 18+
- Supabase account
- Groq API key

### Installation

```bash
# Clone repository
git clone https://github.com/rayan-kareem/marketing-suit.git
cd marketing-suit

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your Supabase & Groq credentials

# Run development server
npm run dev
```

### Environment Variables

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GROQ_API_KEY=your_groq_api_key
```

### API Server (optional)

```bash
cd api
npm install
cp .env.example .env
npm run dev
```

## 📦 Modules

### Phase 1 — MVP
- ✅ Auth & Onboarding (Google OAuth, email auth, brand setup)
- ✅ AI Content Generator (Caption, Carousel, Ad Copy, Thread, Repurpose)
- ✅ Content Calendar (weekly/monthly view, drag & drop, status tracking)
- ✅ Asset Manager (media library, image resizer, brand kit)
- ✅ Smart Links & Tracking (short URL, click analytics, UTM, QR code)
- ✅ Analytics Dashboard (unified dashboard, content performance, weekly report)

### Phase 2 — Post-MVP
- ✅ Auto-Publisher (Instagram, Twitter/X, TikTok, Threads)
- ✅ A/B Testing Engine
- ✅ Ads Manager (Meta Ads dashboard, campaign creation, ROAS)
- ✅ Competitor Spy
- ✅ CRM & Lead Management
- ✅ Testimonial Collector
- ✅ Advanced Analytics & Billing

### Phase 3 — Scale & Ecosystem (planned)
- Team Collaboration & Roles
- Landing Page Builder
- AI Creative Studio
- Integration Hub & Mobile PWA
- Affiliate System & Marketplace

## 💰 Pricing

| Tier | Harga | Highlights |
|------|-------|----------|
| Free | Rp 0 | 50 AI gen/bulan, 1 brand |
| Creator | Rp 99K/bulan | Unlimited AI, full features |
| Pro | Rp 249K/bulan | + Ads Manager, 3 brands, CRM |
| Agency | Rp 499K/bulan | + Unlimited brands, team, white-label |

## 📄 Documentation

- [Business Requirements Document](doc/brd-marketing-tools.md)
- [PRD Phase 1 MVP](doc/prd-mvp-phase1.md)
- [PRD Phase 2 Post-MVP](doc/prd-mvp-phase2.md)
- [PRD Phase 3 Scale](doc/prd-phase3.md)
- [AI Agents PRD](doc/prd-ai-agents.md)
- [API Integration Guide](doc/api-integration.md)

## 📝 License

Private — All rights reserved.