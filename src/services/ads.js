import { supabase, isConfigured } from './supabase'

// Sanitize search input to prevent PostgREST filter injection
function sanitizeSearch(str) {
  // Remove PostgREST special characters that could alter filter logic
  return str.replace(/[,%()\\]/g, '').trim().substring(0, 100)
}

// ============================================
// Ads Manager Services
// ============================================
// Handles ad campaign management, creative assets, audience targeting, and performance insights.
// All database operations use Supabase.
// Falls back to mock data in demo mode when Supabase is not configured.
// ============================================

// --- Constants ---

export const OBJECTIVES = [
  {
    value: 'awareness',
    label: 'Awareness',
    icon: '🔍',
    desc: 'Jangkau audience baru',
  },
  {
    value: 'traffic',
    label: 'Traffic',
    icon: '🖱️',
    desc: 'Arahkan ke website',
  },
  {
    value: 'conversion',
    label: 'Conversion',
    icon: '💰',
    desc: 'Tingkatkan pembelian',
  },
  {
    value: 'retargeting',
    label: 'Retargeting',
    icon: '🔄',
    desc: 'Target ulang pengunjung',
  },
]

export const CTA_TYPES = [
  { value: 'learn_more', label: 'Pelajari' },
  { value: 'shop_now', label: 'Beli Sekarang' },
  { value: 'sign_up', label: 'Daftar' },
  { value: 'download', label: 'Download' },
  { value: 'contact_us', label: 'Hubungi Kami' },
]

export const AD_PLATFORMS = [
  { value: 'meta', label: 'Meta (IG + FB)', icon: '📘' },
  { value: 'tiktok', label: 'TikTok Ads', icon: '🎵' },
  { value: 'google', label: 'Google Ads', icon: '🔎' },
]

// --- Demo mode data ---

const DEMO_CAMPAIGNS = [
  {
    id: 'demo-camp-1',
    name: 'Summer Product Awareness',
    brand_id: 'brand-demo',
    objective: 'awareness',
    platforms: ['meta', 'tiktok'],
    status: 'active',
    budget: 5000,
    spend: 3200,
    created_at: new Date(Date.now() - 604800000).toISOString(),
    start_date: new Date(Date.now() - 432000000).toISOString(),
    end_date: new Date(Date.now() + 1728000000).toISOString(),
    audience_id: 'aud-1',
    settings: {
      targeting: 'broad',
      age_range: '18-35',
      interests: ['fashion', 'lifestyle'],
    },
    ad_creatives: [
      {
        id: 'creative-1a',
        campaign_id: 'demo-camp-1',
        name: 'Summer Banner v1',
        platform: 'meta',
        type: 'image',
        status: 'active',
        impressions: 45000,
        clicks: 1850,
        conversions: 125,
        ctr: 4.1,
        cpc: 1.73,
      },
      {
        id: 'creative-1b',
        campaign_id: 'demo-camp-1',
        name: 'Video Teaser 15s',
        platform: 'tiktok',
        type: 'video',
        status: 'active',
        impressions: 52000,
        clicks: 2340,
        conversions: 185,
        ctr: 4.5,
        cpc: 1.37,
      },
    ],
  },
  {
    id: 'demo-camp-2',
    name: 'Website Retargeting',
    brand_id: 'brand-demo',
    objective: 'retargeting',
    platforms: ['meta'],
    status: 'active',
    budget: 2000,
    spend: 1850,
    created_at: new Date(Date.now() - 432000000).toISOString(),
    start_date: new Date(Date.now() - 345600000).toISOString(),
    end_date: new Date(Date.now() + 864000000).toISOString(),
    audience_id: 'aud-2',
    settings: {
      targeting: 'pixel_based',
      pixel_id: 'px-2024',
    },
    ad_creatives: [],
  },
  {
    id: 'demo-camp-3',
    name: 'Q1 Conversion Push',
    brand_id: 'brand-demo',
    objective: 'conversion',
    platforms: ['google'],
    status: 'paused',
    budget: 3500,
    spend: 1200,
    created_at: new Date(Date.now() - 1209600000).toISOString(),
    start_date: new Date(Date.now() - 864000000).toISOString(),
    end_date: new Date(Date.now() + 259200000).toISOString(),
    audience_id: 'aud-3',
    settings: {
      targeting: 'search',
      keywords: ['buy online', 'discount'],
    },
    ad_creatives: [],
  },
]

const DEMO_INSIGHTS = [
  {
    date: new Date(Date.now() - 604800000).toISOString().split('T')[0],
    impressions: 8200,
    clicks: 380,
    spend: 420,
    conversions: 28,
  },
  {
    date: new Date(Date.now() - 518400000).toISOString().split('T')[0],
    impressions: 9100,
    clicks: 410,
    spend: 445,
    conversions: 31,
  },
  {
    date: new Date(Date.now() - 432000000).toISOString().split('T')[0],
    impressions: 8900,
    clicks: 398,
    spend: 435,
    conversions: 30,
  },
  {
    date: new Date(Date.now() - 345600000).toISOString().split('T')[0],
    impressions: 9500,
    clicks: 428,
    spend: 460,
    conversions: 33,
  },
  {
    date: new Date(Date.now() - 259200000).toISOString().split('T')[0],
    impressions: 8800,
    clicks: 395,
    spend: 448,
    conversions: 29,
  },
  {
    date: new Date(Date.now() - 172800000).toISOString().split('T')[0],
    impressions: 9200,
    clicks: 415,
    spend: 455,
    conversions: 32,
  },
  {
    date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    impressions: 9600,
    clicks: 435,
    spend: 468,
    conversions: 35,
  },
]

const DEMO_AUDIENCES = [
  {
    id: 'aud-1',
    name: 'Fashion Enthusiasts 18-35',
    platform: 'meta',
    size_estimate: 2500000,
    created_at: new Date(Date.now() - 1209600000).toISOString(),
    targeting: {
      ages: '18-35',
      interests: ['fashion', 'shopping'],
      locations: ['ID'],
    },
  },
  {
    id: 'aud-2',
    name: 'Website Visitors',
    platform: 'meta',
    size_estimate: 125000,
    created_at: new Date(Date.now() - 604800000).toISOString(),
    targeting: {
      pixel_based: true,
    },
  },
]

const DEMO_ALERTS = [
  {
    id: 'alert-1',
    type: 'budget_approaching',
    campaign_id: 'demo-camp-1',
    message: 'Campaign "Summer Product Awareness" is at 64% of budget',
    read: false,
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
]

const DEMO_COMPETITOR_ADS = [
  {
    id: 'comp-1',
    brand_id: 'brand-demo',
    competitor_name: 'Competitor Brand A',
    platform: 'meta',
    headline: 'New Collection Summer 2024',
    description: 'Up to 50% off on all items',
    image_url: 'https://via.placeholder.com/300x300',
    cta: 'Shop Now',
    landing_url: 'https://example.com/summer',
    saved_at: new Date(Date.now() - 172800000).toISOString(),
  },
]

// --- Helper function: Generate UTM parameters ---

function generateUTM(campaignId, creativeName) {
  return {
    utm_source: 'ads',
    utm_medium: 'paid',
    utm_campaign: campaignId,
    utm_content: creativeName.toLowerCase().replace(/\s+/g, '-'),
  }
}

// --- Campaign functions ---

/**
 * Get all campaigns with optional status filter.
 * @param {Object} params - Query parameters
 * @param {string} [params.status] - Filter by status ('active', 'paused', 'completed', 'draft')
 * @returns {Promise<Array>} Array of campaigns with creative counts
 */
export async function getCampaigns({ status } = {}) {
  if (!isConfigured) {
    // Demo mode
    let campaigns = DEMO_CAMPAIGNS
    if (status) campaigns = campaigns.filter((c) => c.status === status)
    return campaigns
  }

  try {
    let query = supabase
      .from('ads_campaigns')
      .select('*, ad_creatives(id)')
      .order('created_at', { ascending: false })

    if (status) query = query.eq('status', status)

    const { data, error } = await query

    if (error) throw error
    return data || []
  } catch (err) {
    console.error('[Ads Manager] Get campaigns error:', err.message)
    throw err
  }
}

/**
 * Get a single campaign with its creatives and insights.
 * @param {string} id - Campaign ID
 * @returns {Promise<Object>} Campaign record with creatives and 30-day insights
 */
export async function getCampaignById(id) {
  if (!isConfigured) {
    // Demo mode
    return DEMO_CAMPAIGNS.find((c) => c.id === id)
  }

  try {
    const { data, error } = await supabase
      .from('ads_campaigns')
      .select('*, ad_creatives(*)')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  } catch (err) {
    console.error('[Ads Manager] Get campaign by ID error:', err.message)
    throw err
  }
}

/**
 * Create a new ad campaign.
 * @param {Object} data - Campaign creation parameters
 * @returns {Promise<Object>} Created campaign record
 */
export async function createCampaign(data) {
  if (!isConfigured) {
    // Demo mode
    return {
      id: `demo-camp-${Date.now()}`,
      ...data,
      status: 'draft',
      spend: 0,
      created_at: new Date().toISOString(),
      ad_creatives: [],
    }
  }

  try {
    const { data: created, error } = await supabase
      .from('ads_campaigns')
      .insert({
        ...data,
        status: 'draft',
      })
      .select()
      .single()

    if (error) throw error
    return created
  } catch (err) {
    console.error('[Ads Manager] Create campaign error:', err.message)
    throw err
  }
}

/**
 * Update an existing campaign.
 * @param {string} id - Campaign ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated campaign record
 */
export async function updateCampaign(id, updates) {
  if (!isConfigured) {
    // Demo mode
    const campaign = DEMO_CAMPAIGNS.find((c) => c.id === id)
    if (campaign) {
      return { ...campaign, ...updates }
    }
    return updates
  }

  try {
    const { data, error } = await supabase
      .from('ads_campaigns')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (err) {
    console.error('[Ads Manager] Update campaign error:', err.message)
    throw err
  }
}

/**
 * Delete a campaign.
 * @param {string} id - Campaign ID
 * @returns {Promise<void>}
 */
export async function deleteCampaign(id) {
  if (!isConfigured) {
    // Demo mode
    console.log(`[Demo] Deleted campaign ${id}`)
    return
  }

  try {
    // Delete creatives first (due to foreign key constraint)
    await supabase.from('ad_creatives').delete().eq('campaign_id', id)

    // Then delete the campaign
    const { error } = await supabase.from('ads_campaigns').delete().eq('id', id)

    if (error) throw error
  } catch (err) {
    console.error('[Ads Manager] Delete campaign error:', err.message)
    throw err
  }
}

/**
 * Pause an active campaign.
 * @param {string} id - Campaign ID
 * @returns {Promise<Object>} Updated campaign record
 */
export async function pauseCampaign(id) {
  if (!isConfigured) {
    // Demo mode
    const campaign = DEMO_CAMPAIGNS.find((c) => c.id === id)
    if (campaign) {
      campaign.status = 'paused'
      return campaign
    }
  }

  try {
    const { data, error } = await supabase
      .from('ads_campaigns')
      .update({ status: 'paused' })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (err) {
    console.error('[Ads Manager] Pause campaign error:', err.message)
    throw err
  }
}

/**
 * Resume a paused campaign.
 * @param {string} id - Campaign ID
 * @returns {Promise<Object>} Updated campaign record
 */
export async function resumeCampaign(id) {
  if (!isConfigured) {
    // Demo mode
    const campaign = DEMO_CAMPAIGNS.find((c) => c.id === id)
    if (campaign) {
      campaign.status = 'active'
      return campaign
    }
  }

  try {
    const { data, error } = await supabase
      .from('ads_campaigns')
      .update({ status: 'active' })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (err) {
    console.error('[Ads Manager] Resume campaign error:', err.message)
    throw err
  }
}

// --- Creative functions ---

/**
 * Create an ad creative with auto-generated UTM parameters.
 * @param {Object} data - Creative creation parameters
 * @returns {Promise<Object>} Created creative record
 */
export async function createCreative(data) {
  if (!isConfigured) {
    // Demo mode
    return {
      id: `demo-creative-${Date.now()}`,
      ...data,
      status: 'draft',
      impressions: 0,
      clicks: 0,
      conversions: 0,
      utm_params: generateUTM(data.campaign_id, data.name),
      created_at: new Date().toISOString(),
    }
  }

  try {
    const utm = generateUTM(data.campaign_id, data.name)
    const { data: created, error } = await supabase
      .from('ad_creatives')
      .insert({
        ...data,
        utm_params: utm,
        status: 'draft',
      })
      .select()
      .single()

    if (error) throw error
    return created
  } catch (err) {
    console.error('[Ads Manager] Create creative error:', err.message)
    throw err
  }
}

// --- Insights functions ---

/**
 * Get performance insights for a campaign over specified days.
 * @param {string} campaignId - Campaign ID
 * @param {number} days - Number of days to retrieve (default 30)
 * @returns {Promise<Array>} Array of daily insight records
 */
export async function getInsights(campaignId, days = 30) {
  if (!isConfigured) {
    // Demo mode
    return DEMO_INSIGHTS.slice(-days)
  }

  try {
    const { data, error } = await supabase
      .from('ads_insights_daily')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('date', { ascending: false })
      .limit(days)

    if (error) throw error
    return data || []
  } catch (err) {
    console.error('[Ads Manager] Get insights error:', err.message)
    throw err
  }
}

/**
 * Get overview metrics across all campaigns.
 * @param {number} days - Number of days to calculate (default 30)
 * @returns {Promise<Object>} Aggregated overview metrics
 */
export async function getOverview(days = 30) {
  if (!isConfigured) {
    // Demo mode
    const insights = DEMO_INSIGHTS.slice(-days)
    return {
      total_impressions: insights.reduce((sum, i) => sum + i.impressions, 0),
      total_clicks: insights.reduce((sum, i) => sum + i.clicks, 0),
      total_spend: insights.reduce((sum, i) => sum + i.spend, 0),
      total_conversions: insights.reduce((sum, i) => sum + i.conversions, 0),
      avg_ctr:
        insights.reduce((sum, i) => sum + (i.clicks / i.impressions) * 100, 0) / insights.length,
      avg_cpc: insights.reduce((sum, i) => sum + i.spend / i.clicks, 0) / insights.length,
    }
  }

  try {
    const { data, error } = await supabase.rpc('get_ads_overview', {
      days_back: days,
    })

    if (error) throw error
    return data
  } catch (err) {
    console.error('[Ads Manager] Get overview error:', err.message)
    throw err
  }
}

// --- Audience functions ---

/**
 * Get all saved audience segments.
 * @returns {Promise<Array>} Array of audience records
 */
export async function getSavedAudiences() {
  if (!isConfigured) {
    // Demo mode
    return DEMO_AUDIENCES
  }

  try {
    const { data, error } = await supabase
      .from('saved_audiences')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (err) {
    console.error('[Ads Manager] Get saved audiences error:', err.message)
    throw err
  }
}

/**
 * Save an audience segment.
 * @param {Object} data - Audience creation parameters
 * @returns {Promise<Object>} Created audience record
 */
export async function saveAudience(data) {
  if (!isConfigured) {
    // Demo mode
    return {
      id: `demo-aud-${Date.now()}`,
      ...data,
      created_at: new Date().toISOString(),
    }
  }

  try {
    const { data: created, error } = await supabase
      .from('saved_audiences')
      .insert(data)
      .select()
      .single()

    if (error) throw error
    return created
  } catch (err) {
    console.error('[Ads Manager] Save audience error:', err.message)
    throw err
  }
}

/**
 * Delete a saved audience.
 * @param {string} id - Audience ID
 * @returns {Promise<void>}
 */
export async function deleteAudience(id) {
  if (!isConfigured) {
    // Demo mode
    console.log(`[Demo] Deleted audience ${id}`)
    return
  }

  try {
    const { error } = await supabase.from('saved_audiences').delete().eq('id', id)

    if (error) throw error
  } catch (err) {
    console.error('[Ads Manager] Delete audience error:', err.message)
    throw err
  }
}

// --- Alert functions ---

/**
 * Get all budget and performance alerts.
 * @returns {Promise<Array>} Array of alert records
 */
export async function getAlerts() {
  if (!isConfigured) {
    // Demo mode
    return DEMO_ALERTS
  }

  try {
    const { data, error } = await supabase
      .from('ads_alerts')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (err) {
    console.error('[Ads Manager] Get alerts error:', err.message)
    throw err
  }
}

/**
 * Mark an alert as read.
 * @param {string} id - Alert ID
 * @returns {Promise<Object>} Updated alert record
 */
export async function markAlertRead(id) {
  if (!isConfigured) {
    // Demo mode
    const alert = DEMO_ALERTS.find((a) => a.id === id)
    if (alert) {
      alert.read = true
      return alert
    }
  }

  try {
    const { data, error } = await supabase
      .from('ads_alerts')
      .update({ read: true })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (err) {
    console.error('[Ads Manager] Mark alert read error:', err.message)
    throw err
  }
}

// --- Competitor analysis functions ---

/**
 * Search for competitor ads (mock implementation with demo data).
 * @param {string} query - Search query
 * @returns {Promise<Array>} Array of competitor ad records
 */
export async function searchCompetitorAds(query) {
  if (!isConfigured) {
    // Demo mode - return mock results
    return DEMO_COMPETITOR_ADS.filter(
      (ad) =>
        ad.competitor_name.toLowerCase().includes(query.toLowerCase()) ||
        ad.headline.toLowerCase().includes(query.toLowerCase())
    )
  }

  try {
    const { data, error } = await supabase
      .from('competitor_ads')
      .select('*')
      .or(
        `competitor_name.ilike.%${sanitizeSearch(query)}%,headline.ilike.%${sanitizeSearch(query)}%,description.ilike.%${sanitizeSearch(query)}%`
      )
      .order('saved_at', { ascending: false })
      .limit(20)

    if (error) throw error
    return data || []
  } catch (err) {
    console.error('[Ads Manager] Search competitor ads error:', err.message)
    throw err
  }
}

/**
 * Save a competitor ad for later reference.
 * @param {Object} data - Competitor ad data
 * @returns {Promise<Object>} Created competitor ad record
 */
export async function saveCompetitorAd(data) {
  if (!isConfigured) {
    // Demo mode
    return {
      id: `demo-comp-${Date.now()}`,
      ...data,
      saved_at: new Date().toISOString(),
    }
  }

  try {
    const { data: created, error } = await supabase
      .from('competitor_ads')
      .insert(data)
      .select()
      .single()

    if (error) throw error
    return created
  } catch (err) {
    console.error('[Ads Manager] Save competitor ad error:', err.message)
    throw err
  }
}

/**
 * Get all saved competitor ads.
 * @returns {Promise<Array>} Array of saved competitor ad records
 */
export async function getSavedCompetitorAds() {
  if (!isConfigured) {
    // Demo mode
    return DEMO_COMPETITOR_ADS
  }

  try {
    const { data, error } = await supabase
      .from('competitor_ads')
      .select('*')
      .order('saved_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (err) {
    console.error('[Ads Manager] Get saved competitor ads error:', err.message)
    throw err
  }
}
