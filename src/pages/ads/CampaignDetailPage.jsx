import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAds } from '../../hooks/useAds'
import Card, { KPICard } from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

const STATUS_COLORS = {
  active: 'green',
  paused: 'yellow',
  draft: 'gray',
  completed: 'blue',
}

const STATUS_LABELS = {
  active: 'Active',
  paused: 'Paused',
  draft: 'Draft',
  completed: 'Completed',
}

const OBJECTIVE_LABELS = {
  awareness: 'Awareness',
  traffic: 'Traffic',
  conversion: 'Conversion',
  retargeting: 'Retargeting',
}

function formatRupiah(value) {
  if (!value) return 'Rp 0'
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatNumber(value) {
  if (!value) return '0'
  return value.toLocaleString('id-ID')
}

function SimpleProgressBar({ value, total }) {
  const percent = total > 0 ? (value / total) * 100 : 0
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-200 rounded-full h-2">
        <div
          className="bg-emerald-500 h-2 rounded-full transition-all"
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
      <span className="text-sm font-medium text-gray-900 w-12 text-right">
        {percent.toFixed(0)}%
      </span>
    </div>
  )
}

export default function CampaignDetailPage() {
  const { campaignId } = useParams()
  const navigate = useNavigate()
  const { activeCampaign, loading, fetchCampaign, fetchInsights, pause, resume } = useAds()
  const [insightsData, setInsightsData] = useState([])

  // Load campaign data
  useEffect(() => {
    if (campaignId) {
      fetchCampaign(campaignId)
    }
  }, [campaignId, fetchCampaign])

  // Load insights data for the performance chart
  useEffect(() => {
    const loadInsights = async () => {
      if (campaignId) {
        try {
          const insights = await fetchInsights(campaignId, 30)
          if (insights) {
            setInsightsData(insights.reverse())
          }
        } catch (err) {
          console.error('Error loading insights:', err)
        }
      }
    }
    loadInsights()
  }, [campaignId, fetchInsights])

  const handlePauseResume = async () => {
    if (!activeCampaign) return
    try {
      if (activeCampaign.status === 'active') {
        await pause(activeCampaign.id)
      } else if (activeCampaign.status === 'paused') {
        await resume(activeCampaign.id)
      }
    } catch (err) {
      console.error('Error updating campaign status:', err)
    }
  }

  const handleDelete = async () => {
    if (
      window.confirm(
        'Are you sure you want to delete this campaign? This action cannot be undone.'
      )
    ) {
      // Implementation deferred to campaigns hook
      console.log('Delete campaign:', activeCampaign.id)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-emerald-600 border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-sm text-gray-500">Loading campaign details...</p>
      </div>
    )
  }

  if (!activeCampaign) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">Campaign not found</p>
        <Button onClick={() => navigate('/ads')} variant="primary">
          Back to Ads Manager
        </Button>
      </div>
    )
  }

  const creatives = activeCampaign.ad_creatives || []
  const totalImpressions = creatives.reduce((sum, c) => sum + (c.impressions || 0), 0)
  const totalClicks = creatives.reduce((sum, c) => sum + (c.clicks || 0), 0)
  const totalConversions = creatives.reduce((sum, c) => sum + (c.conversions || 0), 0)

  const kpiMetrics = useMemo(() => {
    return {
      spend: activeCampaign.spend || 0,
      impressions: totalImpressions,
      reach: totalImpressions,
      clicks: totalClicks,
      ctr: totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '0',
      cpc: totalClicks > 0 ? (activeCampaign.spend / totalClicks).toFixed(0) : 0,
      conversions: totalConversions,
      roas: activeCampaign.spend > 0 ? ((totalConversions * 100000) / activeCampaign.spend).toFixed(2) : '0',
    }
  }, [activeCampaign, totalImpressions, totalClicks, totalConversions])

  const budgetRemaining = activeCampaign.budget - (activeCampaign.spend || 0)
  const budgetPercent =
    activeCampaign.budget > 0
      ? ((activeCampaign.spend || 0) / activeCampaign.budget) * 100
      : 0

  return (
    <div>
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={() => navigate('/ads')}
              className="text-emerald-600 hover:text-emerald-700 font-semibold text-sm"
            >
              ← Back
            </button>
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">
              {activeCampaign.name}
            </h1>
            <Badge color={STATUS_COLORS[activeCampaign.status]}>
              {STATUS_LABELS[activeCampaign.status]}
            </Badge>
          </div>
        </div>
        <div className="flex gap-2">
          {activeCampaign.status === 'active' && (
            <Button
              size="sm"
              variant="secondary"
              onClick={handlePauseResume}
            >
              Pause
            </Button>
          )}
          {activeCampaign.status === 'paused' && (
            <Button
              size="sm"
              variant="secondary"
              onClick={handlePauseResume}
            >
              Resume
            </Button>
          )}
          <Button
            size="sm"
            variant="secondary"
            onClick={() => navigate(`/ads/${activeCampaign.id}/edit`)}
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={handleDelete}
          >
            Delete
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
        <KPICard
          title="Spend"
          value={formatRupiah(kpiMetrics.spend)}
          color="primary"
        />
        <KPICard
          title="Impressions"
          value={formatNumber(kpiMetrics.impressions)}
          color="accent"
        />
        <KPICard
          title="Reach"
          value={formatNumber(kpiMetrics.reach)}
          color="purple"
        />
        <KPICard
          title="Clicks"
          value={formatNumber(kpiMetrics.clicks)}
          color="primary"
        />
        <KPICard
          title="CTR"
          value={`${kpiMetrics.ctr}%`}
          color="accent"
        />
        <KPICard
          title="CPC"
          value={formatRupiah(kpiMetrics.cpc)}
          color="purple"
        />
        <KPICard
          title="Conversions"
          value={formatNumber(kpiMetrics.conversions)}
          color="primary"
        />
        <KPICard
          title="ROAS"
          value={`${kpiMetrics.roas}x`}
          color="accent"
        />
      </div>

      {/* Daily Performance Chart */}
      {insightsData.length > 0 && (
        <Card className="mb-6">
          <div className="p-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Daily Performance (Last 30 Days)
            </h3>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={insightsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(date) => {
                    const d = new Date(date)
                    return `${d.getDate()}/${d.getMonth() + 1}`
                  }}
                  interval={Math.floor(insightsData.length / 7) || 0}
                />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip
                  formatter={(value, name) => {
                    if (name === 'spend') {
                      return [formatRupiah(value), 'Spend']
                    }
                    return [formatNumber(value), name.charAt(0).toUpperCase() + name.slice(1)]
                  }}
                  labelFormatter={(label) => new Date(label).toLocaleDateString('id-ID')}
                />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="clicks"
                  stroke="#3b82f6"
                  dot={false}
                  name="Clicks"
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="impressions"
                  stroke="#8b5cf6"
                  dot={false}
                  name="Impressions"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="spend"
                  stroke="#10b981"
                  dot={false}
                  name="Spend"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Creative Cards */}
      {creatives.length > 0 && (
        <Card className="mb-6">
          <div className="p-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Ad Creatives ({creatives.length})
            </h3>
            <div className="space-y-4">
              {creatives.map((creative) => {
                const utm = creative.utm_params || {}
                const ctaUrl = new URL(
                  creative.destination_url || 'https://example.com'
                )
                Object.entries(utm).forEach(([key, value]) => {
                  ctaUrl.searchParams.append(key, value)
                })

                return (
                  <div
                    key={creative.id}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex gap-4">
                      {/* Media Preview */}
                      {creative.media_url && (
                        <div className="flex-shrink-0 w-24 h-24">
                          <img
                            src={creative.media_url}
                            alt={creative.name}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        </div>
                      )}

                      {/* Content */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-gray-900">
                            {creative.name}
                          </h4>
                          <div className="flex gap-2">
                            <Badge color="blue">
                              {creative.type || 'Image'}
                            </Badge>
                            <Badge
                              color={
                                creative.status === 'active'
                                  ? 'green'
                                  : 'gray'
                              }
                            >
                              {creative.status || 'Draft'}
                            </Badge>
                          </div>
                        </div>

                        {/* Creative Text */}
                        {creative.headline && (
                          <p className="text-sm font-semibold text-gray-900 mb-1">
                            {creative.headline}
                          </p>
                        )}
                        {creative.primary_text && (
                          <p className="text-sm text-gray-700 mb-2">
                            {creative.primary_text}
                          </p>
                        )}
                        {creative.description && (
                          <p className="text-sm text-gray-600 mb-3">
                            {creative.description}
                          </p>
                        )}

                        {/* Metrics */}
                        <div className="grid grid-cols-5 gap-3 mb-3">
                          <div>
                            <p className="text-xs text-gray-500 mb-0.5">
                              Impressions
                            </p>
                            <p className="text-sm font-semibold text-gray-900">
                              {formatNumber(creative.impressions)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-0.5">
                              Clicks
                            </p>
                            <p className="text-sm font-semibold text-gray-900">
                              {formatNumber(creative.clicks)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-0.5">
                              CTR
                            </p>
                            <p className="text-sm font-semibold text-gray-900">
                              {creative.ctr?.toFixed(2) || '0'}%
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-0.5">
                              CPC
                            </p>
                            <p className="text-sm font-semibold text-gray-900">
                              {formatRupiah(creative.cpc)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-0.5">
                              Conversions
                            </p>
                            <p className="text-sm font-semibold text-gray-900">
                              {formatNumber(creative.conversions)}
                            </p>
                          </div>
                        </div>

                        {/* CTA & URL */}
                        {creative.cta_text && (
                          <div className="flex items-center gap-2 mb-2">
                            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-lg">
                              {creative.cta_text}
                            </span>
                          </div>
                        )}
                        {creative.destination_url && (
                          <p className="text-xs text-gray-500 break-all font-mono">
                            {ctaUrl.toString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </Card>
      )}

      {/* Budget Section */}
      <Card>
        <div className="p-5">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Budget Status
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div>
              <p className="text-sm text-gray-600 mb-1">Daily Budget</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatRupiah(activeCampaign.budget / 30)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Budget</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatRupiah(activeCampaign.budget)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Spent</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatRupiah(activeCampaign.spend)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Remaining</p>
              <p
                className={`text-2xl font-bold ${
                  budgetRemaining > 0 ? 'text-emerald-600' : 'text-red-600'
                }`}
              >
                {formatRupiah(budgetRemaining)}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-gray-600">
                Budget Used
              </p>
              <p className="text-sm text-gray-500">
                {budgetPercent.toFixed(1)}%
              </p>
            </div>
            <SimpleProgressBar
              value={activeCampaign.spend}
              total={activeCampaign.budget}
            />
          </div>
        </div>
      </Card>
    </div>
  )
}
