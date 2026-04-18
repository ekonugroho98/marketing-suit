import { useCallback, useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { format, startOfWeek, endOfWeek, subWeeks } from 'date-fns'
import { id as localeID } from 'date-fns/locale'
import { supabase } from '../../services/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useBrand } from '../../hooks/useBrand'
import TopBar from '../../components/layout/TopBar'
import Button from '../../components/ui/Button'
import Card, { KPICard } from '../../components/ui/Card'
import { PageLoader } from '../../components/ui/LoadingSpinner'

const PILLAR_LABELS = {
  awareness: 'Awareness',
  showcase: 'Showcase',
  education: 'Education',
  social_proof: 'Social Proof',
}

const PILLAR_COLORS = {
  awareness: '#2a95ff',
  showcase: '#22c55e',
  education: '#f59e0b',
  social_proof: '#a855f7',
}

const PLATFORM_COLORS = {
  instagram: '#E1306C',
  twitter: '#1DA1F2',
  tiktok: '#010101',
  youtube: '#FF0000',
  threads: '#000000',
  facebook: '#1877F2',
}

export default function WeeklyReportPage() {
  const { user } = useAuth()
  const { activeBrand } = useBrand()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [weekOffset, setWeekOffset] = useState(0)
  const [reportData, setReportData] = useState(null)
  const [publishedContent, setPublishedContent] = useState([])
  const [pastReports, setPastReports] = useState([])
  const [selectedReport, setSelectedReport] = useState(null)

  const weekStart = startOfWeek(subWeeks(new Date(), weekOffset), { weekStartsOn: 1 })
  const weekEnd = endOfWeek(subWeeks(new Date(), weekOffset), { weekStartsOn: 1 })
  const weekStartStr = format(weekStart, 'yyyy-MM-dd')
  const weekEndStr = format(weekEnd, 'yyyy-MM-dd')

  const loadWeekData = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setSelectedReport(null)

    const brandFilter = activeBrand?.id

    const [contentRes, genRes, linksRes] = await Promise.all([
      supabase
        .from('content_calendar')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'published')
        .gte('published_at', weekStartStr)
        .lte('published_at', weekEndStr + 'T23:59:59')
        .order('published_at', { ascending: false })
        .then(res => {
          if (brandFilter) {
            return { ...res, data: (res.data || []).filter(c => c.brand_id === brandFilter) }
          }
          return res
        }),
      supabase
        .from('generation_history')
        .select('id, type, platform, created_at', { count: 'exact' })
        .eq('user_id', user.id)
        .gte('created_at', weekStartStr)
        .lte('created_at', weekEndStr + 'T23:59:59')
        .then(res => {
          if (brandFilter) {
            return { ...res, data: (res.data || []).filter(g => g.brand_id === brandFilter) }
          }
          return res
        }),
      supabase
        .from('smart_links')
        .select('click_count')
        .eq('user_id', user.id),
    ])

    const content = contentRes.data || []
    const generations = genRes.data || []
    const totalClicks = (linksRes.data || []).reduce((s, l) => s + (l.click_count || 0), 0)

    const contentByPillar = {}
    const contentByPlatform = {}
    content.forEach(c => {
      const pillar = (c.pillar || 'lainnya').toLowerCase()
      contentByPillar[pillar] = (contentByPillar[pillar] || 0) + 1
      const platform = (c.platform || 'lainnya').toLowerCase()
      contentByPlatform[platform] = (contentByPlatform[platform] || 0) + 1
    })

    const topContent = content.slice(0, 10).map(c => ({
      title: c.title,
      platform: c.platform,
      status: c.status,
      pillar: c.pillar,
      published_at: c.published_at,
    }))

    const data = {
      kpis: {
        published: content.length,
        generations: generations.length,
        clicks: totalClicks,
      },
      content_by_pillar: contentByPillar,
      content_by_platform: contentByPlatform,
      top_content: topContent,
    }

    setReportData(data)
    setPublishedContent(content)
    setLoading(false)
  }, [user, activeBrand, weekStartStr, weekEndStr])

  const loadPastReports = useCallback(async () => {
    if (!user) return
    const query = supabase
      .from('weekly_reports')
      .select('*')
      .eq('user_id', user.id)
      .order('week_start', { ascending: false })
      .limit(20)

    if (activeBrand?.id) {
      query.eq('brand_id', activeBrand.id)
    }

    const { data } = await query
    setPastReports(data || [])
  }, [user, activeBrand])

  useEffect(() => { loadWeekData() }, [loadWeekData])
  useEffect(() => { loadPastReports() }, [loadPastReports])

  const handleGenerateReport = async () => {
    if (!user || !reportData) return
    setSaving(true)

    const { error } = await supabase.from('weekly_reports').upsert({
      user_id: user.id,
      brand_id: activeBrand?.id || null,
      week_start: weekStartStr,
      week_end: weekEndStr,
      report_data: reportData,
    }, { onConflict: 'user_id,brand_id,week_start' })

    if (!error) {
      await loadPastReports()
    }
    setSaving(false)
  }

  const handleSelectReport = (report) => {
    setSelectedReport(report)
  }

  const handleBackToLive = () => {
    setSelectedReport(null)
  }

  if (loading) return <PageLoader />

  const displayData = selectedReport ? selectedReport.report_data : reportData
  const displayContent = selectedReport ? (selectedReport.report_data?.top_content || []) : publishedContent

  const pillarChartData = Object.entries(displayData?.content_by_pillar || {}).map(([key, value]) => ({
    name: PILLAR_LABELS[key] || key,
    jumlah: value,
    fill: PILLAR_COLORS[key] || '#94a3b8',
  }))

  const platformChartData = Object.entries(displayData?.content_by_platform || {}).map(([key, value]) => ({
    name: key.charAt(0).toUpperCase() + key.slice(1),
    jumlah: value,
    fill: PLATFORM_COLORS[key] || '#94a3b8',
  }))

  const dateLabel = selectedReport
    ? `${format(new Date(selectedReport.week_start), 'd MMM', { locale: localeID })} - ${format(new Date(selectedReport.week_end), 'd MMM yyyy', { locale: localeID })}`
    : `${format(weekStart, 'd MMM', { locale: localeID })} - ${format(weekEnd, 'd MMM yyyy', { locale: localeID })}`

  return (
    <div>
      <TopBar
        title="Laporan Mingguan"
        subtitle="Ringkasan performa marketing kamu per minggu"
        actions={
          <div className="flex items-center gap-2">
            {!selectedReport && (
              <>
                <Button size="sm" variant="ghost" onClick={() => setWeekOffset(w => w + 1)}>
                  &larr; Minggu Lalu
                </Button>
                {weekOffset > 0 && (
                  <Button size="sm" variant="ghost" onClick={() => setWeekOffset(w => w - 1)}>
                    Minggu Depan &rarr;
                  </Button>
                )}
              </>
            )}
            {selectedReport && (
              <Button size="sm" variant="secondary" onClick={handleBackToLive}>
                Kembali ke Minggu Ini
              </Button>
            )}
          </div>
        }
      />

      {/* Week indicator */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm text-gray-500">Periode</p>
          <p className="text-lg font-semibold text-gray-900">{dateLabel}</p>
          {selectedReport && (
            <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full">
              Laporan Tersimpan
            </span>
          )}
        </div>
        {!selectedReport && (
          <Button onClick={handleGenerateReport} loading={saving}>
            Simpan Laporan
          </Button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <KPICard
          title="Konten Dipublish"
          value={displayData?.kpis?.published || 0}
          icon="📝"
          color="primary"
        />
        <KPICard
          title="AI Generations"
          value={displayData?.kpis?.generations || 0}
          icon="🤖"
          color="purple"
        />
        <KPICard
          title="Total Clicks"
          value={(displayData?.kpis?.clicks || 0).toLocaleString('id-ID')}
          icon="🔗"
          color="accent"
        />
        <KPICard
          title="Pilar Konten"
          value={Object.keys(displayData?.content_by_pillar || {}).length}
          subtitle={`dari ${Object.keys(PILLAR_LABELS).length} pilar`}
          icon="📊"
          color="warning"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <h3 className="font-semibold mb-4">Konten per Pilar</h3>
          {pillarChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={pillarChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="jumlah" radius={[4, 4, 0, 0]}>
                  {pillarChartData.map((entry, index) => (
                    <rect key={index} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-sm text-center py-12">Belum ada data pilar minggu ini</p>
          )}
        </Card>

        <Card>
          <h3 className="font-semibold mb-4">Distribusi Platform</h3>
          {platformChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={platformChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="jumlah" radius={[4, 4, 0, 0]}>
                  {platformChartData.map((entry, index) => (
                    <rect key={index} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-sm text-center py-12">Belum ada data platform minggu ini</p>
          )}
        </Card>
      </div>

      {/* Published Content List */}
      <Card className="mb-6">
        <h3 className="font-semibold mb-4">Konten Dipublish Minggu Ini</h3>
        {displayContent.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">Belum ada konten yang dipublish minggu ini</p>
        ) : (
          <div className="space-y-3">
            {displayContent.map((item, i) => (
              <div key={item.id || i} className="flex items-center gap-4 py-2 border-b border-gray-50 last:border-0">
                <span className="text-lg font-bold text-gray-300 w-6 shrink-0">#{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{item.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-400 capitalize">{item.platform || '-'}</span>
                    {item.pillar && (
                      <>
                        <span className="text-gray-300">&middot;</span>
                        <span className="text-xs text-gray-400 capitalize">{item.pillar}</span>
                      </>
                    )}
                    {item.published_at && (
                      <>
                        <span className="text-gray-300">&middot;</span>
                        <span className="text-xs text-gray-400">
                          {format(new Date(item.published_at), 'd MMM yyyy', { locale: localeID })}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                  item.status === 'published' ? 'bg-green-100 text-green-700' :
                  item.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {item.status || 'published'}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Past Reports */}
      <Card>
        <h3 className="font-semibold mb-4">Laporan Sebelumnya</h3>
        {pastReports.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">
            Belum ada laporan tersimpan. Klik "Simpan Laporan" untuk menyimpan laporan minggu ini.
          </p>
        ) : (
          <div className="space-y-2">
            {pastReports.map((report) => {
              const isActive = selectedReport?.id === report.id
              const rKpis = report.report_data?.kpis || {}
              return (
                <button
                  key={report.id}
                  onClick={() => handleSelectReport(report)}
                  className={`w-full text-left flex items-center justify-between p-3 rounded-lg border transition-colors ${
                    isActive
                      ? 'border-primary-300 bg-primary-50'
                      : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div>
                    <p className="font-medium text-sm text-gray-900">
                      {format(new Date(report.week_start), 'd MMM', { locale: localeID })} -{' '}
                      {format(new Date(report.week_end), 'd MMM yyyy', { locale: localeID })}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Disimpan {format(new Date(report.created_at), 'd MMM yyyy, HH:mm', { locale: localeID })}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>{rKpis.published || 0} konten</span>
                    <span>{rKpis.generations || 0} gen</span>
                    <span>{(rKpis.clicks || 0).toLocaleString('id-ID')} clicks</span>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}
