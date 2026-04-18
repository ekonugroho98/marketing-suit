/**
 * CRM & Lead Management Service
 * Sprint 11-12 | Karaya Marketing Suite
 */
import { supabase, isConfigured } from './supabase'

function sanitizeSearch(str) {
  // Remove PostgREST special characters that could alter filter logic
  return str.replace(/[,%()\\]/g, '').trim().substring(0, 100)
}

// ─── Constants ───────────────────────────────────────────────
export const LEAD_STATUSES = [
  { value: 'new',         label: 'Baru',        color: 'blue'   },
  { value: 'contacted',   label: 'Dihubungi',   color: 'yellow' },
  { value: 'qualified',   label: 'Qualified',   color: 'purple' },
  { value: 'negotiating', label: 'Negosiasi',   color: 'orange' },
  { value: 'converted',   label: 'Konversi',    color: 'green'  },
  { value: 'lost',        label: 'Hilang',      color: 'red'    },
]

export const LEAD_SOURCES = [
  { value: 'manual',   label: 'Manual' },
  { value: 'form',     label: 'Form Website' },
  { value: 'import',   label: 'Import CSV' },
  { value: 'social',   label: 'Social Media' },
  { value: 'ads',      label: 'Iklan' },
  { value: 'referral', label: 'Referral' },
  { value: 'organic',  label: 'Organik' },
]

export const ACTIVITY_TYPES = [
  { value: 'note',       label: 'Catatan',   icon: '📝' },
  { value: 'email',      label: 'Email',     icon: '📧' },
  { value: 'call',       label: 'Telepon',   icon: '📞' },
  { value: 'meeting',    label: 'Meeting',   icon: '🤝' },
  { value: 'status_change', label: 'Status Berubah', icon: '🔄' },
]

export const SCORE_COLORS = {
  cold: { min: 0,  max: 30,  color: 'blue',   label: 'Cold'   },
  warm: { min: 31, max: 60,  color: 'yellow', label: 'Warm'   },
  hot:  { min: 61, max: 80,  color: 'orange', label: 'Hot'    },
  fire: { min: 81, max: 100, color: 'red',    label: '🔥 Hot!' },
}

export const SEGMENT_OPERATORS = {
  text:   [{ value: 'eq', label: 'sama dengan' }, { value: 'contains', label: 'mengandung' }, { value: 'not_eq', label: 'bukan' }],
  number: [{ value: 'gt', label: '>' }, { value: 'lt', label: '<' }, { value: 'eq', label: '=' }, { value: 'gte', label: '>=' }, { value: 'lte', label: '<=' }],
  select: [{ value: 'eq', label: 'adalah' }, { value: 'not_eq', label: 'bukan' }],
  array:  [{ value: 'contains', label: 'mengandung' }, { value: 'not_contains', label: 'tidak mengandung' }],
}

export const SEGMENT_FIELDS = [
  { value: 'status',  label: 'Status',  type: 'select', options: LEAD_STATUSES },
  { value: 'source',  label: 'Sumber',  type: 'select', options: LEAD_SOURCES  },
  { value: 'score',   label: 'Score',   type: 'number' },
  { value: 'tags',    label: 'Tag',     type: 'array'  },
  { value: 'company', label: 'Perusahaan', type: 'text' },
  { value: 'created_at', label: 'Tanggal Masuk', type: 'date' },
]

// ─── Demo Data ────────────────────────────────────────────────
const DEMO_LEADS = [
  { id: 'l1', name: 'Budi Santoso',     email: 'budi@startup.id',   phone: '081234567890', company: 'Startup Indonesia', job_title: 'CEO',       status: 'qualified',   source: 'form',   score: 72, tags: ['hot','b2b'],    created_at: new Date(Date.now() - 2*24*3600*1000).toISOString(), last_activity: new Date(Date.now() - 1800000).toISOString() },
  { id: 'l2', name: 'Siti Rahayu',      email: 'siti@gmail.com',    phone: '087654321098', company: null,                job_title: 'Freelancer', status: 'contacted',  source: 'social', score: 45, tags: ['warm'],          created_at: new Date(Date.now() - 5*24*3600*1000).toISOString(), last_activity: new Date(Date.now() - 3600000).toISOString()  },
  { id: 'l3', name: 'Ahmad Fauzi',      email: 'ahmad@corp.co.id',  phone: '082111222333', company: 'Corp Indo',         job_title: 'Manager',   status: 'negotiating', source: 'ads',    score: 88, tags: ['hot','priority'], created_at: new Date(Date.now() - 1*24*3600*1000).toISOString(), last_activity: new Date(Date.now() - 900000).toISOString()   },
  { id: 'l4', name: 'Dewi Lestari',     email: 'dewi@umkm.id',      phone: '089988776655', company: 'UMKM Maju',         job_title: 'Owner',     status: 'new',         source: 'form',   score: 20, tags: ['umkm'],          created_at: new Date(Date.now() - 0.5*24*3600*1000).toISOString(), last_activity: null },
  { id: 'l5', name: 'Reza Firmansyah',  email: 'reza@agency.com',   phone: '081399887766', company: 'Agency Kreatif',   job_title: 'Director',  status: 'converted',   source: 'referral', score: 95, tags: ['vip','b2b'],  created_at: new Date(Date.now() - 14*24*3600*1000).toISOString(), last_activity: new Date(Date.now() - 7200000).toISOString(), converted_at: new Date(Date.now() - 3*24*3600*1000).toISOString() },
  { id: 'l6', name: 'Nina Kusuma',      email: 'nina@brand.id',     phone: '082233445566', company: 'Brand Lokal',      job_title: 'Marketing', status: 'lost',        source: 'organic', score: 35, tags: ['warm'],         created_at: new Date(Date.now() - 20*24*3600*1000).toISOString(), last_activity: new Date(Date.now() - 5*24*3600*1000).toISOString(), lost_reason: 'Budget tidak cukup' },
]

const DEMO_ACTIVITIES = {
  l1: [
    { id: 'a1', type: 'form_submitted', title: 'Mengisi form kontak website', description: null, occurred_at: new Date(Date.now() - 2*24*3600*1000).toISOString() },
    { id: 'a2', type: 'email', title: 'Mengirim email penawaran', description: 'Proposal paket Enterprise dikirimkan via email', occurred_at: new Date(Date.now() - 1*24*3600*1000).toISOString() },
    { id: 'a3', type: 'call', title: 'Telepon follow-up', description: 'Diskusi 30 menit, tertarik dengan paket tahunan', occurred_at: new Date(Date.now() - 1800000).toISOString() },
  ],
  l3: [
    { id: 'a4', type: 'ad_clicked', title: 'Klik iklan Facebook', description: 'Campaign: Q1 2026 Promo', occurred_at: new Date(Date.now() - 1*24*3600*1000).toISOString() },
    { id: 'a5', type: 'meeting', title: 'Demo produk via Zoom', description: 'Meeting 1 jam, sangat antusias. Butuh approval dari atasan.', occurred_at: new Date(Date.now() - 900000).toISOString() },
  ],
}

const DEMO_SEGMENTS = [
  { id: 's1', name: 'Hot Leads', description: 'Score ≥ 70 dan belum converted', filters: { conditions: [{ field: 'score', operator: 'gte', value: 70 }, { field: 'status', operator: 'not_eq', value: 'converted' }], logic: 'AND' }, lead_count: 2, is_active: true, created_at: new Date(Date.now() - 7*24*3600*1000).toISOString() },
  { id: 's2', name: 'B2B Leads', description: 'Lead dengan tag b2b', filters: { conditions: [{ field: 'tags', operator: 'contains', value: 'b2b' }], logic: 'AND' }, lead_count: 3, is_active: true, created_at: new Date(Date.now() - 14*24*3600*1000).toISOString() },
  { id: 's3', name: 'UMKM Segment', description: 'Lead dari UMKM', filters: { conditions: [{ field: 'tags', operator: 'contains', value: 'umkm' }], logic: 'AND' }, lead_count: 1, is_active: true, created_at: new Date(Date.now() - 3*24*3600*1000).toISOString() },
]

const DEMO_SEQUENCES = [
  {
    id: 'seq1',
    name: 'Onboarding Welcome',
    description: 'Urutan email selamat datang untuk lead baru',
    status: 'active',
    trigger_type: 'tag_added',
    trigger_value: 'warm',
    steps: [
      { delay_days: 0,  subject: 'Selamat datang di Karaya! 👋', body: 'Halo {name}, terima kasih telah menghubungi kami...' },
      { delay_days: 2,  subject: 'Bagaimana kami bisa membantu {company}?', body: 'Hi {name}, kami ingin mengetahui lebih lanjut tentang kebutuhan Anda...' },
      { delay_days: 5,  subject: 'Case study: Bagaimana Agency Kreatif 3x revenue', body: 'Hi {name}, kami ingin berbagi kisah sukses klien kami...' },
      { delay_days: 10, subject: 'Penawaran spesial untuk Anda 🎁', body: 'Hi {name}, sebagai tanda apresiasi kami...' },
    ],
    total_enrolled: 12,
    total_completed: 5,
    total_replied: 3,
    created_at: new Date(Date.now() - 30*24*3600*1000).toISOString(),
  },
  {
    id: 'seq2',
    name: 'Follow-up Pasca Demo',
    description: 'Nurturing setelah demo produk dilakukan',
    status: 'active',
    trigger_type: 'manual',
    steps: [
      { delay_days: 1,  subject: 'Terima kasih atas waktu Anda!', body: 'Hi {name}, senang bisa presentasi tadi...' },
      { delay_days: 3,  subject: 'Ada pertanyaan tambahan?', body: 'Hi {name}, apakah ada hal yang ingin Anda tanyakan...' },
      { delay_days: 7,  subject: 'Proposal khusus untuk {company}', body: 'Hi {name}, kami sudah menyiapkan proposal...' },
    ],
    total_enrolled: 4,
    total_completed: 1,
    total_replied: 2,
    created_at: new Date(Date.now() - 10*24*3600*1000).toISOString(),
  },
]

// ─── LEADS ────────────────────────────────────────────────────
export async function getLeads({ status, source, tag, search, page = 1, perPage = 20 } = {}) {
  if (!isConfigured) {
    let filtered = [...DEMO_LEADS]
    if (status)  filtered = filtered.filter(l => l.status === status)
    if (source)  filtered = filtered.filter(l => l.source === source)
    if (tag)     filtered = filtered.filter(l => l.tags?.includes(tag))
    if (search)  filtered = filtered.filter(l =>
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.email?.toLowerCase().includes(search.toLowerCase()) ||
      l.company?.toLowerCase().includes(search.toLowerCase())
    )
    const total = filtered.length
    const offset = (page - 1) * perPage
    return { data: filtered.slice(offset, offset + perPage), total, page, perPage, error: null }
  }

  const { data: { user } } = await supabase.auth.getUser()
  let query = supabase.from('leads').select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1)

  if (status)  query = query.eq('status', status)
  if (source)  query = query.eq('source', source)
  if (tag)     query = query.contains('tags', [tag])
  if (search) {
    const s = sanitizeSearch(search)
    if (s) query = query.or(`name.ilike.%${s}%,email.ilike.%${s}%,company.ilike.%${s}%`)
  }

  const { data, error, count } = await query
  return { data: data || [], total: count || 0, page, perPage, error }
}

export async function getLead(id) {
  if (!isConfigured) {
    const lead = DEMO_LEADS.find(l => l.id === id)
    return { data: lead || null, error: lead ? null : new Error('Not found') }
  }
  const { data, error } = await supabase.from('leads').select('*').eq('id', id).single()
  return { data, error }
}

export async function createLead(payload) {
  if (!isConfigured) {
    const newLead = { id: `l${Date.now()}`, ...payload, score: 10, tags: payload.tags || [], created_at: new Date().toISOString() }
    DEMO_LEADS.unshift(newLead)
    return { data: newLead, error: null }
  }
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase.from('leads').insert({ ...payload, user_id: user.id }).select().single()
  return { data, error }
}

export async function updateLead(id, updates) {
  if (!isConfigured) {
    const idx = DEMO_LEADS.findIndex(l => l.id === id)
    if (idx >= 0) Object.assign(DEMO_LEADS[idx], updates)
    return { data: DEMO_LEADS[idx], error: null }
  }
  const { data, error } = await supabase.from('leads').update(updates).eq('id', id).select().single()
  return { data, error }
}

export async function deleteLead(id) {
  if (!isConfigured) {
    const idx = DEMO_LEADS.findIndex(l => l.id === id)
    if (idx >= 0) DEMO_LEADS.splice(idx, 1)
    return { error: null }
  }
  const { error } = await supabase.from('leads').delete().eq('id', id)
  return { error }
}

export async function bulkUpdateLeads(ids, updates) {
  if (!isConfigured) {
    ids.forEach(id => {
      const idx = DEMO_LEADS.findIndex(l => l.id === id)
      if (idx >= 0) Object.assign(DEMO_LEADS[idx], updates)
    })
    return { error: null }
  }
  const { error } = await supabase.from('leads').update(updates).in('id', ids)
  return { error }
}

export async function importLeads(rows) {
  // rows: array of { name, email, phone, company, source, tags }
  if (!isConfigured) {
    const newLeads = rows.map((r, i) => ({
      id: `imp${Date.now()}${i}`, ...r, score: 10, status: 'new',
      tags: r.tags ? r.tags.split(',').map(t => t.trim()) : [],
      created_at: new Date().toISOString(),
    }))
    DEMO_LEADS.unshift(...newLeads)
    return { imported: newLeads.length, error: null }
  }
  const { data: { user } } = await supabase.auth.getUser()
  const payload = rows.map(r => ({
    ...r,
    user_id: user.id,
    status: 'new',
    tags: r.tags ? r.tags.split(',').map(t => t.trim()) : [],
  }))
  const { data, error } = await supabase.from('leads').insert(payload).select()
  return { imported: data?.length || 0, error }
}

// ─── LEAD OVERVIEW ────────────────────────────────────────────
export async function getCRMOverview() {
  if (!isConfigured) {
    return {
      data: {
        total_leads: DEMO_LEADS.length,
        new_leads: DEMO_LEADS.filter(l => l.status === 'new').length,
        contacted: DEMO_LEADS.filter(l => l.status === 'contacted').length,
        qualified: DEMO_LEADS.filter(l => l.status === 'qualified').length,
        converted: DEMO_LEADS.filter(l => l.status === 'converted').length,
        lost: DEMO_LEADS.filter(l => l.status === 'lost').length,
        avg_score: Math.round(DEMO_LEADS.reduce((s, l) => s + l.score, 0) / DEMO_LEADS.length),
        conversion_rate: Math.round((DEMO_LEADS.filter(l => l.status === 'converted').length / DEMO_LEADS.length) * 100 * 10) / 10,
        leads_today: 2,
        leads_this_week: 4,
      },
      error: null,
    }
  }
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase.rpc('get_crm_overview', { p_user_id: user.id })
  return { data, error }
}

// ─── ACTIVITIES ───────────────────────────────────────────────
export async function getLeadActivities(leadId) {
  if (!isConfigured) {
    return { data: DEMO_ACTIVITIES[leadId] || [], error: null }
  }
  const { data, error } = await supabase.from('lead_activities')
    .select('*').eq('lead_id', leadId).order('occurred_at', { ascending: false })
  return { data: data || [], error }
}

export async function addActivity(leadId, payload) {
  if (!isConfigured) {
    const activity = { id: `act${Date.now()}`, lead_id: leadId, ...payload, occurred_at: new Date().toISOString() }
    if (!DEMO_ACTIVITIES[leadId]) DEMO_ACTIVITIES[leadId] = []
    DEMO_ACTIVITIES[leadId].unshift(activity)
    return { data: activity, error: null }
  }
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase.from('lead_activities')
    .insert({ ...payload, lead_id: leadId, user_id: user.id }).select().single()
  return { data, error }
}

// ─── SEGMENTS ─────────────────────────────────────────────────
export async function getSegments() {
  if (!isConfigured) return { data: DEMO_SEGMENTS, error: null }
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase.from('lead_segments')
    .select('*').eq('user_id', user.id).order('created_at', { ascending: false })
  return { data: data || [], error }
}

export async function createSegment(payload) {
  if (!isConfigured) {
    const seg = { id: `s${Date.now()}`, ...payload, lead_count: 0, created_at: new Date().toISOString() }
    DEMO_SEGMENTS.unshift(seg)
    return { data: seg, error: null }
  }
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase.from('lead_segments')
    .insert({ ...payload, user_id: user.id }).select().single()
  return { data, error }
}

export async function updateSegment(id, updates) {
  if (!isConfigured) {
    const idx = DEMO_SEGMENTS.findIndex(s => s.id === id)
    if (idx >= 0) Object.assign(DEMO_SEGMENTS[idx], updates)
    return { data: DEMO_SEGMENTS[idx], error: null }
  }
  const { data, error } = await supabase.from('lead_segments').update(updates).eq('id', id).select().single()
  return { data, error }
}

export async function deleteSegment(id) {
  if (!isConfigured) {
    const idx = DEMO_SEGMENTS.findIndex(s => s.id === id)
    if (idx >= 0) DEMO_SEGMENTS.splice(idx, 1)
    return { error: null }
  }
  const { error } = await supabase.from('lead_segments').delete().eq('id', id)
  return { error }
}

// Client-side segment filtering (demo mode)
export function filterLeadsBySegment(leads, segment) {
  const { conditions, logic } = segment.filters
  return leads.filter(lead => {
    const results = conditions.map(cond => {
      const val = lead[cond.field]
      switch (cond.operator) {
        case 'eq':           return val == cond.value
        case 'not_eq':       return val != cond.value
        case 'gt':           return Number(val) > Number(cond.value)
        case 'lt':           return Number(val) < Number(cond.value)
        case 'gte':          return Number(val) >= Number(cond.value)
        case 'lte':          return Number(val) <= Number(cond.value)
        case 'contains':     return Array.isArray(val) ? val.includes(cond.value) : String(val || '').toLowerCase().includes(String(cond.value).toLowerCase())
        case 'not_contains': return Array.isArray(val) ? !val.includes(cond.value) : !String(val || '').toLowerCase().includes(String(cond.value).toLowerCase())
        default: return false
      }
    })
    return logic === 'AND' ? results.every(Boolean) : results.some(Boolean)
  })
}

// ─── SEQUENCES ────────────────────────────────────────────────
export async function getSequences() {
  if (!isConfigured) return { data: DEMO_SEQUENCES, error: null }
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase.from('email_sequences')
    .select('*').eq('user_id', user.id).order('created_at', { ascending: false })
  return { data: data || [], error }
}

export async function createSequence(payload) {
  if (!isConfigured) {
    const seq = { id: `seq${Date.now()}`, ...payload, status: 'draft', total_enrolled: 0, total_completed: 0, total_replied: 0, created_at: new Date().toISOString() }
    DEMO_SEQUENCES.unshift(seq)
    return { data: seq, error: null }
  }
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase.from('email_sequences')
    .insert({ ...payload, user_id: user.id }).select().single()
  return { data, error }
}

export async function updateSequence(id, updates) {
  if (!isConfigured) {
    const idx = DEMO_SEQUENCES.findIndex(s => s.id === id)
    if (idx >= 0) Object.assign(DEMO_SEQUENCES[idx], updates)
    return { data: DEMO_SEQUENCES[idx], error: null }
  }
  const { data, error } = await supabase.from('email_sequences').update(updates).eq('id', id).select().single()
  return { data, error }
}

export async function deleteSequence(id) {
  if (!isConfigured) {
    const idx = DEMO_SEQUENCES.findIndex(s => s.id === id)
    if (idx >= 0) DEMO_SEQUENCES.splice(idx, 1)
    return { error: null }
  }
  const { error } = await supabase.from('email_sequences').delete().eq('id', id)
  return { error }
}

export async function enrollLeadInSequence(sequenceId, leadId) {
  if (!isConfigured) {
    const seq = DEMO_SEQUENCES.find(s => s.id === sequenceId)
    if (seq) seq.total_enrolled += 1
    return { error: null }
  }
  const { data: { user } } = await supabase.auth.getUser()
  const { error } = await supabase.from('sequence_enrollments').upsert(
    { sequence_id: sequenceId, lead_id: leadId, user_id: user.id, status: 'active', current_step: 0, next_send_at: new Date().toISOString() },
    { onConflict: 'sequence_id,lead_id' }
  )
  return { error }
}

// ─── SCORE HELPER ─────────────────────────────────────────────
export function getScoreCategory(score) {
  for (const [key, cat] of Object.entries(SCORE_COLORS)) {
    if (score >= cat.min && score <= cat.max) return { key, ...cat }
  }
  return { key: 'cold', ...SCORE_COLORS.cold }
}

export function getStatusMeta(status) {
  return LEAD_STATUSES.find(s => s.value === status) || LEAD_STATUSES[0]
}

export function formatLeadSource(source) {
  return LEAD_SOURCES.find(s => s.value === source)?.label || source
}
