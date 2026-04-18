/**
 * Billing & Subscription Service
 * Sprint 13-14 | Karaya Marketing Suite
 */
import { supabase, isConfigured } from './supabase'

// ─── Constants ───────────────────────────────────────────────
export const PLANS = [
  {
    id: 'free',
    name: 'Free',
    description: 'Untuk mulai bereksperimen',
    price_monthly: 0,
    price_yearly: 0,
    badge: null,
    color: 'gray',
    limits: {
      ai_credits: 50,
      storage_gb: 1,
      leads: 100,
      connected_accounts: 2,
      team_members: 1,
      ab_tests: 2,
    },
    features: [
      { label: '50 AI Credits/bulan',         included: true  },
      { label: '1 GB storage',                included: true  },
      { label: '100 leads di CRM',            included: true  },
      { label: '2 akun sosmed terhubung',     included: true  },
      { label: 'Testimoni Collector',         included: true  },
      { label: 'Analytics Dasar',             included: true  },
      { label: 'Auto-Publisher',              included: false },
      { label: 'A/B Testing',                 included: false },
      { label: 'Ads Manager',                 included: false },
      { label: 'Competitor Spy',              included: false },
      { label: 'Advanced Analytics',          included: false },
      { label: 'Email Sequence',              included: false },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'Untuk kreator & solopreneur serius',
    price_monthly: 199000,
    price_yearly: 1990000,
    badge: 'Paling Populer',
    color: 'purple',
    limits: {
      ai_credits: 500,
      storage_gb: 5,
      leads: 1000,
      connected_accounts: 5,
      team_members: 1,
      ab_tests: 10,
    },
    features: [
      { label: '500 AI Credits/bulan',        included: true  },
      { label: '5 GB storage',                included: true  },
      { label: '1.000 leads di CRM',          included: true  },
      { label: '5 akun sosmed terhubung',     included: true  },
      { label: 'Auto-Publisher',              included: true  },
      { label: 'A/B Testing (10 tes/bln)',    included: true  },
      { label: 'Ads Manager',                 included: true  },
      { label: 'Competitor Spy',              included: true  },
      { label: 'Advanced Analytics',          included: true  },
      { label: 'Email Sequence',              included: true  },
      { label: 'Testimoni + Widget Embed',    included: true  },
      { label: 'Tim (1 anggota)',             included: false },
      { label: 'White Label',                 included: false },
    ],
  },
  {
    id: 'business',
    name: 'Business',
    description: 'Untuk tim & agensi digital',
    price_monthly: 499000,
    price_yearly: 4990000,
    badge: 'Best Value',
    color: 'blue',
    limits: {
      ai_credits: 2000,
      storage_gb: 20,
      leads: 5000,
      connected_accounts: 10,
      team_members: 5,
      ab_tests: 50,
    },
    features: [
      { label: '2.000 AI Credits/bulan',      included: true },
      { label: '20 GB storage',               included: true },
      { label: '5.000 leads di CRM',          included: true },
      { label: '10 akun sosmed terhubung',    included: true },
      { label: 'Semua fitur Pro',             included: true },
      { label: 'Tim hingga 5 anggota',        included: true },
      { label: 'White Label',                 included: true },
      { label: 'Priority Support',            included: true },
      { label: 'Advanced A/B Testing',        included: true },
      { label: 'Custom Integrations (API)',   included: true },
      { label: 'Dedicated Account Manager',   included: false },
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Solusi kustom untuk korporat',
    price_monthly: 0, // custom
    price_yearly: 0,
    badge: 'Custom',
    color: 'gold',
    limits: {
      ai_credits: null,
      storage_gb: null,
      leads: null,
      connected_accounts: null,
      team_members: null,
      ab_tests: null,
    },
    features: [
      { label: 'AI Credits tidak terbatas',    included: true },
      { label: 'Storage tidak terbatas',       included: true },
      { label: 'CRM tidak terbatas',           included: true },
      { label: 'Anggota tim tidak terbatas',   included: true },
      { label: 'Semua fitur Business',         included: true },
      { label: 'Dedicated Support 24/7',       included: true },
      { label: 'Custom Integrations',          included: true },
      { label: 'SLA Guarantee',                included: true },
      { label: 'On-premise option',            included: true },
    ],
  },
]

export const PAYMENT_METHODS = [
  { value: 'credit_card',    label: 'Kartu Kredit/Debit', icon: '💳' },
  { value: 'bank_transfer',  label: 'Transfer Bank',      icon: '🏦' },
  { value: 'gopay',          label: 'GoPay',              icon: '💚' },
  { value: 'ovo',            label: 'OVO',                icon: '💜' },
  { value: 'dana',           label: 'DANA',               icon: '💙' },
]

// ─── Demo Data ────────────────────────────────────────────────
const DEMO_SUBSCRIPTION = {
  id: 'sub1',
  plan_id: 'pro',
  billing_cycle: 'monthly',
  status: 'active',
  trial_ends_at: null,
  current_period_start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
  current_period_end:   new Date(new Date().getFullYear(), new Date().getMonth()+1, 1).toISOString(),
  cancel_at_period_end: false,
  payment_method: 'credit_card',
}

const DEMO_USAGE = {
  ai_credits:   { used: 287, limit: 500 },
  storage_mb:   { used: 1240, limit: 5120 },  // MB, limit=5GB
  leads:        { used: 73, limit: 1000 },
  content_items:{ used: 45, limit: null },
}

const DEMO_INVOICES = [
  { id: 'inv1', invoice_number: 'KRY-2026-0003', plan_id: 'pro', amount: 199000, status: 'paid',    billing_cycle: 'monthly', period_start: '2026-04-01', period_end: '2026-04-30', paid_at: '2026-04-01T00:00:00Z', payment_method: 'credit_card', created_at: '2026-04-01T00:00:00Z' },
  { id: 'inv2', invoice_number: 'KRY-2026-0002', plan_id: 'pro', amount: 199000, status: 'paid',    billing_cycle: 'monthly', period_start: '2026-03-01', period_end: '2026-03-31', paid_at: '2026-03-01T00:00:00Z', payment_method: 'credit_card', created_at: '2026-03-01T00:00:00Z' },
  { id: 'inv3', invoice_number: 'KRY-2026-0001', plan_id: 'pro', amount: 199000, status: 'paid',    billing_cycle: 'monthly', period_start: '2026-02-01', period_end: '2026-02-28', paid_at: '2026-02-01T00:00:00Z', payment_method: 'credit_card', created_at: '2026-02-01T00:00:00Z' },
  { id: 'inv4', invoice_number: 'KRY-2025-0012', plan_id: 'free', amount: 0,     status: 'void',   billing_cycle: 'monthly', period_start: '2025-01-01', period_end: '2025-01-31', paid_at: null, payment_method: null, created_at: '2025-01-01T00:00:00Z' },
]

// ─── SUBSCRIPTION ─────────────────────────────────────────────
export async function getSubscription() {
  if (!isConfigured) return { data: DEMO_SUBSCRIPTION, error: null }
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase.from('user_subscriptions').select('*, subscription_plans(*)').eq('user_id', user.id).single()
  return { data, error }
}

export async function upgradePlan(planId, billingCycle = 'monthly') {
  if (!isConfigured) {
    DEMO_SUBSCRIPTION.plan_id = planId
    DEMO_SUBSCRIPTION.billing_cycle = billingCycle
    return { data: DEMO_SUBSCRIPTION, error: null }
  }
  const { data: { user } } = await supabase.auth.getUser()
  const plan = PLANS.find(p => p.id === planId)
  const now = new Date()
  const periodEnd = new Date(now)
  billingCycle === 'yearly' ? periodEnd.setFullYear(periodEnd.getFullYear() + 1) : periodEnd.setMonth(periodEnd.getMonth() + 1)

  const { data, error } = await supabase.from('user_subscriptions').upsert({
    user_id: user.id,
    plan_id: planId,
    billing_cycle: billingCycle,
    status: 'active',
    current_period_start: now.toISOString(),
    current_period_end: periodEnd.toISOString(),
  }, { onConflict: 'user_id' }).select().single()
  return { data, error }
}

export async function cancelSubscription() {
  if (!isConfigured) {
    DEMO_SUBSCRIPTION.cancel_at_period_end = true
    return { error: null }
  }
  const { data: { user } } = await supabase.auth.getUser()
  const { error } = await supabase.from('user_subscriptions').update({ cancel_at_period_end: true }).eq('user_id', user.id)
  return { error }
}

export async function reactivateSubscription() {
  if (!isConfigured) {
    DEMO_SUBSCRIPTION.cancel_at_period_end = false
    return { error: null }
  }
  const { data: { user } } = await supabase.auth.getUser()
  const { error } = await supabase.from('user_subscriptions').update({ cancel_at_period_end: false }).eq('user_id', user.id)
  return { error }
}

// ─── USAGE ────────────────────────────────────────────────────
export async function getUsage() {
  if (!isConfigured) return { data: DEMO_USAGE, error: null }
  const { data: { user } } = await supabase.auth.getUser()
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  const { data, error } = await supabase.from('usage_records')
    .select('*').eq('user_id', user.id).eq('period_start', startOfMonth)
  return { data: data || [], error }
}

// ─── INVOICES ─────────────────────────────────────────────────
export async function getInvoices() {
  if (!isConfigured) return { data: DEMO_INVOICES, error: null }
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase.from('invoices').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
  return { data: data || [], error }
}

// ─── HELPERS ─────────────────────────────────────────────────
export function getPlanById(planId) {
  return PLANS.find(p => p.id === planId) || PLANS[0]
}

export function formatPrice(amount, cycle = 'monthly') {
  if (amount === 0) return 'Gratis'
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount) + (cycle === 'monthly' ? '/bln' : '/thn')
}

export function calcUsagePercent(used, limit) {
  if (!limit) return 0  // unlimited
  return Math.min(100, Math.round((used / limit) * 100))
}

export function getUsageColor(pct) {
  if (pct >= 90) return 'red'
  if (pct >= 70) return 'yellow'
  return 'green'
}

export function calcYearlySavings(plan) {
  if (!plan.price_monthly || !plan.price_yearly) return 0
  return (plan.price_monthly * 12) - plan.price_yearly
}
