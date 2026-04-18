/**
 * Advanced Analytics Service
 * Sprint 13-14 | Karaya Marketing Suite
 */
import { supabase, isConfigured } from './supabase'

// ─── Constants ───────────────────────────────────────────────
export const DATE_RANGES = [
  { value: '7d',  label: '7 Hari',    days: 7  },
  { value: '30d', label: '30 Hari',   days: 30 },
  { value: '90d', label: '3 Bulan',   days: 90 },
  { value: '1y',  label: '1 Tahun',   days: 365 },
  { value: 'custom', label: 'Custom', days: null },
]

export const PLATFORMS_ALL = ['Instagram','Twitter','TikTok','Facebook','Threads','LinkedIn']

export const METRICS = [
  { value: 'impressions',      label: 'Impressi',         format: 'number' },
  { value: 'engagement',       label: 'Engagement',       format: 'number' },
  { value: 'engagement_rate',  label: 'Eng. Rate',        format: 'percent' },
  { value: 'clicks',           label: 'Klik',             format: 'number' },
  { value: 'ctr',              label: 'CTR',              format: 'percent' },
  { value: 'leads',            label: 'Lead',             format: 'number' },
  { value: 'conversions',      label: 'Konversi',         format: 'number' },
  { value: 'revenue',          label: 'Revenue',          format: 'currency' },
]

// ─── Demo Data Generators ─────────────────────────────────────
function generateDailyData(days = 30) {
  const result = []
  const now = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    const dayStr = date.toISOString().split('T')[0]
    const trend = 1 + (days - i) / days * 0.5  // upward trend
    const noise = () => 0.7 + Math.random() * 0.6
    result.push({
      date: dayStr,
      impressions:     Math.round(8000  * trend * noise()),
      reach:           Math.round(5000  * trend * noise()),
      engagement:      Math.round(400   * trend * noise()),
      clicks:          Math.round(180   * trend * noise()),
      saves:           Math.round(60    * trend * noise()),
      shares:          Math.round(40    * trend * noise()),
      leads:           Math.round(8     * trend * noise()),
      conversions:     Math.round(2     * trend * noise()),
      revenue:         Math.round(250000 * trend * noise()),
      content_count:   Math.round(3     * noise()),
    })
  }
  return result
}

function generatePlatformBreakdown() {
  return [
    { platform: 'Instagram', impressions: 185000, engagement: 12400, clicks: 5200, leads: 89,  color: '#e1306c' },
    { platform: 'TikTok',    impressions: 290000, engagement: 31000, clicks: 8100, leads: 120, color: '#010101' },
    { platform: 'Twitter',   impressions:  65000, engagement:  4200, clicks: 2300, leads: 34,  color: '#1da1f2' },
    { platform: 'Facebook',  impressions:  94000, engagement:  6800, clicks: 3900, leads: 56,  color: '#1877f2' },
    { platform: 'Threads',   impressions:  32000, engagement:  2100, clicks: 890,  leads: 18,  color: '#000000' },
  ]
}

function generateTopContent() {
  return [
    { id: 'c1', title: '5 Tips Scaling Bisnis Digital...', platform: 'Instagram', impressions: 42000, engagement: 3800, engagement_rate: 9.05, clicks: 1200, content_type: 'caption' },
    { id: 'c2', title: 'Thread: Cara saya grow followers...', platform: 'Twitter', impressions: 28000, engagement: 4200, engagement_rate: 15.0, clicks: 980, content_type: 'thread' },
    { id: 'c3', title: 'Promo Ramadan: Diskon 30%...', platform: 'Facebook', impressions: 35000, engagement: 2900, engagement_rate: 8.29, clicks: 2100, content_type: 'ad_copy' },
    { id: 'c4', title: 'Tutorial menggunakan AI untuk...', platform: 'TikTok', impressions: 89000, engagement: 11200, engagement_rate: 12.58, clicks: 3400, content_type: 'video_script' },
    { id: 'c5', title: 'Behind the scenes tim kami...', platform: 'Instagram', impressions: 19000, engagement: 2100, engagement_rate: 11.05, clicks: 540, content_type: 'caption' },
  ]
}

const DEMO_GOALS = [
  { id: 'g1', name: 'Lead Bulan Ini',    metric: 'leads',         target_value: 100, current_value: 73, period: 'monthly',   period_start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0], period_end: new Date(new Date().getFullYear(), new Date().getMonth()+1, 0).toISOString().split('T')[0], status: 'active',   color: '#6366f1' },
  { id: 'g2', name: 'Konversi Q1 2026', metric: 'conversions',   target_value: 20,  current_value: 15, period: 'quarterly', period_start: '2026-01-01', period_end: '2026-03-31', status: 'active',   color: '#10b981' },
  { id: 'g3', name: 'Revenue April',    metric: 'revenue',       target_value: 10000000, current_value: 7200000, period: 'monthly', period_start: '2026-04-01', period_end: '2026-04-30', status: 'active', color: '#f59e0b' },
  { id: 'g4', name: 'Konten Maret',     metric: 'content_count', target_value: 60,  current_value: 60, period: 'monthly',   period_start: '2026-03-01', period_end: '2026-03-31', status: 'achieved', color: '#3b82f6' },
]

const DEMO_FUNNEL = {
  content_views:   12400,
  link_clicks:      3800,
  form_submits:      580,
  leads_created:     430,
  leads_qualified:   180,
  converted:          43,
  total_revenue:  5375000,
}

// ─── ANALYTICS OVERVIEW ───────────────────────────────────────
export async function getAnalyticsOverview(startDate, endDate) {
  if (!isConfigured) {
    const days = Math.round((new Date(endDate) - new Date(startDate)) / 86400000)
    const trend = days > 14 ? 1.15 : 1
    return {
      data: {
        total_content: Math.round(45 * trend),
        total_clicks:  Math.round(15200 * trend),
        total_leads:   Math.round(73 * trend),
        converted_leads: Math.round(15 * trend),
        testimonials:  5,
        ad_spend:      Math.round(3200000 * trend),
        ad_revenue:    Math.round(9600000 * trend),
      },
      error: null,
    }
  }
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase.rpc('get_analytics_overview', {
    p_user_id: user.id,
    p_start: startDate,
    p_end: endDate,
  })
  return { data, error }
}

export async function getDailyMetrics(days = 30) {
  if (!isConfigured) {
    return { data: generateDailyData(days), error: null }
  }
  // In production, would query content_performance + funnel_events aggregated by day
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('content_performance')
    .select('snapshot_date, impressions, engagement, clicks')
    .eq('user_id', user.id)
    .gte('snapshot_date', new Date(Date.now() - days*86400000).toISOString().split('T')[0])
    .order('snapshot_date')
  return { data: data || [], error }
}

export async function getPlatformBreakdown() {
  if (!isConfigured) {
    return { data: generatePlatformBreakdown(), error: null }
  }
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('content_performance')
    .select('platform, impressions, engagement, clicks')
    .eq('user_id', user.id)
  // Group by platform (would do in DB in production)
  return { data: data || [], error }
}

export async function getTopContent(limit = 10) {
  if (!isConfigured) {
    return { data: generateTopContent().slice(0, limit), error: null }
  }
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('content_performance')
    .select('*, generated_content(id, content_text, content_type)')
    .eq('user_id', user.id)
    .order('impressions', { ascending: false })
    .limit(limit)
  return { data: data || [], error }
}

// ─── FUNNEL ───────────────────────────────────────────────────
export async function getFunnelStats(days = 30) {
  if (!isConfigured) {
    // Scale slightly based on period
    const scale = days / 30
    return {
      data: Object.fromEntries(
        Object.entries(DEMO_FUNNEL).map(([k, v]) => [k, Math.round(v * scale)])
      ),
      error: null,
    }
  }
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase.rpc('get_funnel_stats', { p_user_id: user.id, p_days: days })
  return { data, error }
}

export async function getSourceAttribution() {
  if (!isConfigured) {
    return {
      data: [
        { source: 'Instagram', leads: 42, conversions: 8,  revenue: 2400000 },
        { source: 'TikTok',    leads: 89, conversions: 14, revenue: 3500000 },
        { source: 'Google Ads', leads: 34, conversions: 12, revenue: 4200000 },
        { source: 'Organic',   leads: 28, conversions: 5,  revenue: 1800000 },
        { source: 'Referral',  leads: 15, conversions: 7,  revenue: 3100000 },
        { source: 'Email',     leads: 12, conversions: 4,  revenue: 1200000 },
      ],
      error: null,
    }
  }
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('funnel_events')
    .select('source, event_type, revenue')
    .eq('user_id', user.id)
    .not('source', 'is', null)
  return { data: data || [], error }
}

// ─── GOALS ────────────────────────────────────────────────────
export async function getGoals() {
  if (!isConfigured) return { data: DEMO_GOALS, error: null }
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase.from('analytics_goals')
    .select('*').eq('user_id', user.id).order('created_at', { ascending: false })
  return { data: data || [], error }
}

export async function createGoal(payload) {
  if (!isConfigured) {
    const g = { id: `g${Date.now()}`, ...payload, current_value: 0, status: 'active', created_at: new Date().toISOString() }
    DEMO_GOALS.unshift(g)
    return { data: g, error: null }
  }
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase.from('analytics_goals').insert({ ...payload, user_id: user.id }).select().single()
  return { data, error }
}

export async function updateGoal(id, updates) {
  if (!isConfigured) {
    const idx = DEMO_GOALS.findIndex(g => g.id === id)
    if (idx >= 0) Object.assign(DEMO_GOALS[idx], updates)
    return { data: DEMO_GOALS[idx], error: null }
  }
  const { data, error } = await supabase.from('analytics_goals').update(updates).eq('id', id).select().single()
  return { data, error }
}

export async function deleteGoal(id) {
  if (!isConfigured) {
    const idx = DEMO_GOALS.findIndex(g => g.id === id)
    if (idx >= 0) DEMO_GOALS.splice(idx, 1)
    return { error: null }
  }
  const { error } = await supabase.from('analytics_goals').delete().eq('id', id)
  return { error }
}

// ─── EXPORT ───────────────────────────────────────────────────
export async function exportAnalyticsCSV(data, filename = 'analytics-export.csv') {
  const headers = Object.keys(data[0] || {}).join(',')
  const rows = data.map(row => Object.values(row).map(v => `"${v}"`).join(','))
  const csv = [headers, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ─── HELPERS ─────────────────────────────────────────────────
export function formatMetric(value, format) {
  if (value == null) return '-'
  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value)
    case 'percent':
      return `${Number(value).toFixed(1)}%`
    case 'number':
      return value >= 1000000 ? `${(value/1000000).toFixed(1)}M`
           : value >= 1000    ? `${(value/1000).toFixed(1)}K`
           : String(value)
    default:
      return String(value)
  }
}

export function calcGoalProgress(goal) {
  const pct = Math.min(100, Math.round((goal.current_value / goal.target_value) * 100))
  return {
    pct,
    color: pct >= 100 ? 'green' : pct >= 70 ? 'blue' : pct >= 40 ? 'yellow' : 'red',
    status: pct >= 100 ? 'achieved' : 'active',
  }
}

export function calcFunnelConversion(from, to) {
  if (!from || from === 0) return 0
  return ((to / from) * 100).toFixed(1)
}
