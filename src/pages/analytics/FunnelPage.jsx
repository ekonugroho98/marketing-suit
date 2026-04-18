import { useMemo } from 'react'
import TopBar from '../../components/layout/TopBar'
import { useAdvancedAnalytics } from '../../hooks/useAdvancedAnalytics'
import { formatMetric, DATE_RANGES } from '../../services/analytics-advanced'

export default function FunnelPage() {
  const {
    funnelStats, attribution, loading, error,
    dateRange, changeDateRange,
  } = useAdvancedAnalytics()

  const stages = useMemo(() => {
    if (!funnelStats) return []
    return [
      { id: 'views',     icon: '👁️',  name: 'Content Views',   count: funnelStats.content_views   || 0, colorFrom: '#2563eb', colorTo: '#60a5fa' },
      { id: 'clicks',    icon: '🔗',  name: 'Link Clicks',     count: funnelStats.link_clicks     || 0, colorFrom: '#9333ea', colorTo: '#c084fc' },
      { id: 'forms',     icon: '📋',  name: 'Form Submit',     count: funnelStats.form_submits    || 0, colorFrom: '#4f46e5', colorTo: '#a5b4fc' },
      { id: 'leads',     icon: '👤',  name: 'Lead Created',    count: funnelStats.leads_created   || 0, colorFrom: '#0d9488', colorTo: '#2dd4bf' },
      { id: 'qualified', icon: '✅',  name: 'Lead Qualified',  count: funnelStats.leads_qualified || 0, colorFrom: '#16a34a', colorTo: '#4ade80' },
      { id: 'converted', icon: '💰',  name: 'Konversi',        count: funnelStats.converted       || 0, colorFrom: '#ea580c', colorTo: '#fb923c' },
    ]
  }, [funnelStats])

  const stageConversions = useMemo(() => {
    const result = []
    for (let i = 0; i < stages.length - 1; i++) {
      const curr = stages[i].count
      const next = stages[i + 1].count
      result.push({
        from: stages[i].name,
        to:   stages[i + 1].name,
        rate: curr > 0 ? ((next / curr) * 100).toFixed(1) : '0.0',
      })
    }
    return result
  }, [stages])

  const bottleneck = useMemo(() => {
    if (stageConversions.length === 0) return null
    const worst = stageConversions.reduce((prev, cur) =>
      parseFloat(cur.rate) < parseFloat(prev.rate) ? cur : prev
    )
    const idx = stageConversions.indexOf(worst)
    return { stage: `${stages[idx].name} → ${stages[idx + 1].name}`, rate: worst.rate, stageType: stages[idx].id }
  }, [stageConversions, stages])

  const topAttribution = useMemo(() => {
    if (!attribution?.length) return []
    return [...attribution].sort((a, b) => b.conversion_rate - a.conversion_rate).slice(0, 8)
  }, [attribution])

  const totalViews     = stages[0]?.count || 0
  const totalConverted = stages[5]?.count || 0
  const overallRate    = totalViews > 0 ? ((totalConverted / totalViews) * 100).toFixed(2) : '0.00'
  const efficiencyScore = totalViews > 0 ? Math.min(100, Math.round((totalConverted / totalViews) * 10000)) : 0
  const avgRevenue     = totalConverted > 0 ? Math.round((funnelStats?.total_revenue || 0) / totalConverted) : 0

  const BOTTLENECK_TIPS = {
    views:     ['Tingkatkan visibility konten melalui SEO dan paid ads', 'Optimalkan distribusi konten di channel yang relevan', 'A/B test thumbnail dan headline untuk CTR lebih tinggi'],
    clicks:    ['Perbaiki CTA design dan placement di konten', 'Buat urgency messaging untuk mendorong klik', 'Optimalkan landing page loading speed'],
    forms:     ['Sederhanakan form — hapus field yang tidak perlu', 'Gunakan progressive profiling untuk form lebih pendek', 'Optimalkan form design dan mobile responsiveness'],
    leads:     ['Periksa kualitas lead source yang menghasilkan volume', 'Validasi data lead saat form submission', 'Tingkatkan targeting untuk lead berkualitas lebih tinggi'],
    qualified: ['Audit lead scoring criteria — mungkin terlalu ketat', 'Koordinasi dengan sales untuk feedback lead quality', 'Buat nurture campaign untuk leads yang belum qualified'],
    converted: ['Tinjau proses closing — apakah ada friction?', 'Siapkan follow-up sequence untuk leads qualified', 'Perkuat offer/proposal dengan social proof'],
  }

  if (loading.funnel) {
    return (
      <div>
        <TopBar title="Funnel Konversi" subtitle="Analisis konversi pelanggan dari awal hingga akhir" />
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
            <p className="text-gray-500 text-sm">Memuat data funnel…</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <TopBar title="Funnel Konversi" subtitle="Analisis konversi pelanggan dari awal hingga akhir" />
        <div className="mt-6 bg-red-50 border border-red-200 rounded-xl p-6">
          <h3 className="font-semibold text-red-900 mb-2">Gagal memuat data</h3>
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <TopBar title="Funnel Konversi" subtitle="Analisis konversi pelanggan dari awal hingga akhir" />

      {/* Date Range Filter */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {DATE_RANGES.map(range => (
          <button
            key={range.value}
            onClick={() => changeDateRange(range.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              dateRange === range.value
                ? 'bg-blue-600 text-white shadow'
                : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300'
            }`}
          >
            {range.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Visual Funnel */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-8">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Visualisasi Funnel</h2>

          {stages.length === 0 ? (
            <div className="text-center py-16 text-gray-400">Tidak ada data funnel untuk periode ini</div>
          ) : (
            <div className="space-y-4">
              {stages.map((stage, idx) => {
                const widthPct = totalViews > 0 ? Math.max((stage.count / totalViews) * 100, 10) : 10
                const prevRate = idx === 0 ? '100%' : `${stageConversions[idx - 1].rate}%`

                return (
                  <div key={stage.id}>
                    <div className="flex flex-col items-center">
                      <div
                        className="flex items-center justify-between px-5 py-3 rounded-xl text-white shadow-sm transition-all"
                        style={{
                          width: `${widthPct}%`,
                          background: `linear-gradient(135deg, ${stage.colorFrom}, ${stage.colorTo})`,
                          minWidth: 220,
                        }}
                      >
                        <span className="text-xl flex-shrink-0">{stage.icon}</span>
                        <div className="flex-1 mx-3">
                          <p className="font-semibold text-sm">{stage.name}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-bold">{formatMetric(stage.count)}</p>
                          <p className="text-xs opacity-80">{prevRate}</p>
                        </div>
                      </div>
                    </div>

                    {idx < stages.length - 1 && (
                      <div className="flex flex-col items-center my-2">
                        <span className="text-gray-400 text-xl">↓</span>
                        <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-3 py-1 rounded-full">
                          {stageConversions[idx].rate}%
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Summary metrics */}
          <div className="mt-8 pt-6 border-t border-gray-100 grid grid-cols-2 gap-4">
            <div className="bg-blue-50 rounded-xl p-4">
              <p className="text-gray-500 text-xs font-medium mb-1">Conversion Rate Overall</p>
              <p className="text-2xl font-bold text-blue-600">{overallRate}%</p>
            </div>
            <div className="bg-purple-50 rounded-xl p-4">
              <p className="text-gray-500 text-xs font-medium mb-1">Avg Revenue per Konversi</p>
              <p className="text-xl font-bold text-purple-600">Rp {formatMetric(avgRevenue)}</p>
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="space-y-5">
          {/* Revenue Summary */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Revenue Summary</h3>
              <span className="text-2xl">💰</span>
            </div>
            <p className="text-gray-500 text-xs mb-1">Total Revenue</p>
            <p className="text-2xl font-bold text-gray-900 mb-4">
              Rp {formatMetric(funnelStats?.total_revenue || 0)}
            </p>
            <div className="bg-green-50 rounded-xl p-4">
              <p className="text-gray-500 text-xs font-medium mb-1">Efficiency Score</p>
              <p className="text-xl font-bold text-green-600">{efficiencyScore}/100</p>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all"
                  style={{ width: `${efficiencyScore}%` }}
                />
              </div>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="space-y-3">
            {[
              { label: 'Total Views',      value: formatMetric(totalViews),                  icon: '👁️',  color: 'blue' },
              { label: 'Total Konversi',   value: formatMetric(totalConverted),               icon: '✅',  color: 'green' },
              { label: 'Lead Qualified',   value: formatMetric(stages[4]?.count || 0),        icon: '⭐',  color: 'purple' },
            ].map((m, i) => (
              <div key={i} className={`bg-${m.color}-50 border border-${m.color}-200 rounded-xl p-4`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-${m.color}-600 text-xs font-medium`}>{m.label}</p>
                    <p className="text-lg font-bold text-gray-900 mt-0.5">{m.value}</p>
                  </div>
                  <span className="text-2xl">{m.icon}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottleneck Analysis */}
      {bottleneck && (
        <div className="mt-8 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-6">⚠️ Analisis Bottleneck</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-amber-50 border border-orange-200 rounded-xl p-5">
                <h3 className="font-semibold text-gray-900 mb-2">Bottleneck: {bottleneck.stage}</h3>
                <p className="text-gray-700 text-sm mb-2">
                  Hanya <span className="font-bold text-orange-600">{bottleneck.rate}%</span> pengunjung melanjutkan ke tahap berikutnya — ini adalah drop-off terbesar.
                </p>
                <p className="text-gray-500 text-xs">Fokuskan optimasi pada tahap ini untuk hasil terbesar.</p>
              </div>
              <div className="space-y-2">
                <p className="font-semibold text-gray-800 text-sm">💡 Saran Optimasi:</p>
                {(BOTTLENECK_TIPS[bottleneck.stageType] || []).map((tip, i) => (
                  <div key={i} className="flex items-start gap-3 bg-blue-50 rounded-lg p-3">
                    <span className="text-blue-600 font-bold text-sm flex-shrink-0">{i + 1}.</span>
                    <p className="text-gray-700 text-sm">{tip}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-xl p-5">
              <h4 className="font-semibold text-gray-900 mb-4 text-sm">Drop-off Analysis</h4>
              <div className="space-y-3">
                {stageConversions.map((conv, i) => (
                  <div key={i} className="pb-3 border-b border-red-200 last:border-0">
                    <p className="text-xs text-gray-500 mb-1">{conv.from} → {conv.to}</p>
                    <div className="flex justify-between items-end">
                      <span className="text-sm font-semibold text-gray-900">{conv.rate}% pass</span>
                      <span className="text-xs font-semibold text-red-600">-{(100 - parseFloat(conv.rate)).toFixed(1)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Source Attribution */}
      {topAttribution.length > 0 && (
        <div className="mt-8 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-6">📊 Konversi per Sumber Traffic</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Sumber</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-900">Leads</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-900">Konversi</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-900">Revenue</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-900">Conv. Rate</th>
                </tr>
              </thead>
              <tbody>
                {topAttribution.map((src, i) => (
                  <tr key={i} className={`border-b border-gray-100 ${i === 0 ? 'bg-green-50' : 'hover:bg-gray-50'}`}>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-gray-900">{src.source}</span>
                      {i === 0 && <span className="ml-2 bg-green-200 text-green-800 text-xs font-semibold px-2 py-0.5 rounded">Top</span>}
                    </td>
                    <td className="text-right py-3 px-4 font-medium text-gray-900">{formatMetric(src.leads || 0)}</td>
                    <td className="text-right py-3 px-4 font-medium text-gray-900">{formatMetric(src.conversions || 0)}</td>
                    <td className="text-right py-3 px-4 font-medium text-gray-900">Rp {formatMetric(Math.round(src.revenue || 0))}</td>
                    <td className="text-right py-3 px-4">
                      <span className={`inline-block font-bold px-2 py-0.5 rounded text-xs ${
                        src.conversion_rate > 10 ? 'bg-green-100 text-green-800' :
                        src.conversion_rate > 5  ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {(src.conversion_rate || 0).toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {topAttribution.length === 0 && !loading.funnel && (
        <div className="mt-8 bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center text-gray-400 text-sm">
          Tidak ada data source attribution tersedia
        </div>
      )}
    </div>
  )
}
