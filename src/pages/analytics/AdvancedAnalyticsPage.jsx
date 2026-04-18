import { useState } from 'react'
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { Link } from 'react-router-dom'
import { useAdvancedAnalytics } from '../../hooks/useAdvancedAnalytics'
import { DATE_RANGES, formatMetric, calcGoalProgress } from '../../services/analytics-advanced'

const PLATFORM_COLORS = {
  Instagram: '#e1306c', TikTok: '#010101', Twitter: '#1da1f2',
  Facebook: '#1877f2', Threads: '#000000', LinkedIn: '#0a66c2',
}

const METRIC_OPTIONS = [
  { key: 'impressions', label: 'Impressi',   color: '#6366f1' },
  { key: 'engagement',  label: 'Engagement', color: '#8b5cf6' },
  { key: 'clicks',      label: 'Klik',       color: '#3b82f6' },
  { key: 'leads',       label: 'Lead',       color: '#10b981' },
  { key: 'revenue',     label: 'Revenue',    color: '#f59e0b' },
]

const COLOR_SWATCHES = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899']

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200 animate-pulse">
      <div className="h-3 bg-gray-200 rounded w-2/3 mb-3" />
      <div className="h-8 bg-gray-200 rounded w-1/2" />
    </div>
  )
}

export default function AdvancedAnalyticsPage() {
  const [visibleMetrics, setVisibleMetrics] = useState(['impressions', 'leads', 'revenue'])
  const [showGoalModal, setShowGoalModal]   = useState(false)
  const [goalForm, setGoalForm] = useState({
    name: '', metric: 'leads', target_value: '', period: 'monthly',
    color: '#6366f1', period_start: '', period_end: '',
  })

  const {
    overview, dailyMetrics, platforms, topContent, attribution, goals,
    loading, dateRange, changeDateRange,
    createGoal, updateGoal, deleteGoal, exportCSV, refresh,
  } = useAdvancedAnalytics()

  // Safe overview with fallback
  const ov = overview || {}
  const roas = ov.ad_spend > 0 ? (ov.ad_revenue / ov.ad_spend) : 0
  const convRate = ov.total_leads > 0
    ? ((ov.converted_leads / ov.total_leads) * 100).toFixed(1)
    : '0.0'

  // Chart data
  const chartData = (dailyMetrics || []).map(item => ({
    ...item,
    date: new Date(item.date).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' }),
  }))

  const toggleMetric = (key) => {
    setVisibleMetrics(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )
  }

  async function handleAddGoal() {
    if (!goalForm.name || !goalForm.target_value) return
    await createGoal({
      ...goalForm,
      target_value: Number(goalForm.target_value),
      current_value: 0,
      status: 'active',
    })
    setGoalForm({ name: '', metric: 'leads', target_value: '', period: 'monthly', color: '#6366f1', period_start: '', period_end: '' })
    setShowGoalModal(false)
  }

  const isLoadingOverview = loading.overview
  const isLoadingDaily    = loading.daily

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Advanced Analytics</h1>
          <p className="text-sm text-gray-500 mt-0.5">Pantau performa konten, lead, dan revenue kamu</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 font-medium">
            📥 Export CSV
          </button>
          <button onClick={refresh} className="flex items-center gap-1.5 px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 font-medium">
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Date Range Selector */}
      <div className="flex gap-2 flex-wrap">
        {DATE_RANGES.map(range => (
          <button
            key={range.value}
            onClick={() => changeDateRange(range.value)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              dateRange === range.value
                ? 'bg-indigo-600 text-white shadow'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
            }`}
          >
            {range.label}
          </button>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {isLoadingOverview ? (
          Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Konten</p>
                <span className="text-xl">📝</span>
              </div>
              <p className="text-3xl font-bold text-gray-900">{ov.total_content ?? 0}</p>
            </div>
            <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Klik</p>
                <span className="text-xl">🖱️</span>
              </div>
              <p className="text-3xl font-bold text-gray-900">{formatMetric(ov.total_clicks ?? 0, 'number')}</p>
            </div>
            <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Lead</p>
                <span className="text-xl">👥</span>
              </div>
              <p className="text-3xl font-bold text-gray-900">{formatMetric(ov.total_leads ?? 0, 'number')}</p>
            </div>
            <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Konversi</p>
                <span className="text-xl">✅</span>
              </div>
              <p className="text-3xl font-bold text-gray-900">{convRate}%</p>
              <p className="text-xs text-gray-400 mt-1">{ov.converted_leads ?? 0} dari {ov.total_leads ?? 0} lead</p>
            </div>
            <div className={`rounded-xl p-5 border shadow-sm ${roas >= 2 ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}>
              <div className="flex items-center justify-between mb-2">
                <p className={`text-xs font-medium uppercase tracking-wide ${roas >= 2 ? 'text-green-600' : 'text-gray-500'}`}>ROAS</p>
                <span className="text-xl">💰</span>
              </div>
              <p className={`text-3xl font-bold ${roas >= 2 ? 'text-green-700' : 'text-gray-900'}`}>
                {roas.toFixed(2)}x
              </p>
              {roas >= 2 && <p className="text-xs text-green-600 mt-1">✓ Performa bagus</p>}
            </div>
          </>
        )}
      </div>

      {/* Daily Chart */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Performa Harian</h2>
          <div className="flex gap-1 flex-wrap justify-end">
            {METRIC_OPTIONS.map(m => (
              <button
                key={m.key}
                onClick={() => toggleMetric(m.key)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                  visibleMetrics.includes(m.key)
                    ? 'text-white shadow'
                    : 'bg-gray-100 text-gray-500 opacity-60'
                }`}
                style={visibleMetrics.includes(m.key) ? { backgroundColor: m.color } : {}}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
        {isLoadingDaily ? (
          <div className="h-72 bg-gray-100 rounded-lg animate-pulse" />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" stroke="#9ca3af" tick={{ fontSize: 11 }} />
              <YAxis stroke="#9ca3af" tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff', fontSize: 12 }}
                formatter={(val, name) => [formatMetric(val, name === 'Revenue' ? 'currency' : 'number'), name]}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {METRIC_OPTIONS.filter(m => visibleMetrics.includes(m.key)).map(m => (
                <Line key={m.key} type="monotone" dataKey={m.key} stroke={m.color} strokeWidth={2} dot={false} name={m.label} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Platform Breakdown + Top Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Platform Breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Platform Breakdown</h2>
          {isLoadingDaily ? (
            <div className="h-64 bg-gray-100 rounded animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={platforms || []} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" stroke="#9ca3af" tick={{ fontSize: 11 }} />
                <YAxis dataKey="platform" type="category" stroke="#9ca3af" tick={{ fontSize: 12 }} width={80} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff', fontSize: 12 }}
                  formatter={(val) => [formatMetric(val, 'number')]}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="engagement" fill="#a855f7" name="Engagement" radius={[0, 3, 3, 0]} />
                <Bar dataKey="clicks"     fill="#3b82f6" name="Klik"       radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top Content */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Top Konten</h2>
            <Link to="/analytics/funnel" className="text-xs text-indigo-600 hover:underline">Lihat Funnel →</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 uppercase border-b border-gray-100">
                  <th className="text-left pb-2 font-medium">Judul</th>
                  <th className="text-left pb-2 font-medium">Platform</th>
                  <th className="text-right pb-2 font-medium">Impressi</th>
                  <th className="text-right pb-2 font-medium">Eng%</th>
                </tr>
              </thead>
              <tbody>
                {(topContent || []).slice(0, 5).map((c, i) => {
                  const er = c.impressions > 0 ? ((c.engagement / c.impressions) * 100) : 0
                  const erColor = er > 10 ? 'text-green-600' : er > 5 ? 'text-yellow-600' : 'text-red-500'
                  return (
                    <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2 pr-2 max-w-[130px] truncate" title={c.title}>{c.title}</td>
                      <td className="py-2 pr-2">
                        <span className="inline-block px-1.5 py-0.5 rounded text-white text-xs font-medium"
                          style={{ backgroundColor: PLATFORM_COLORS[c.platform] || '#6366f1' }}>
                          {c.platform}
                        </span>
                      </td>
                      <td className="text-right py-2 text-gray-600">{formatMetric(c.impressions, 'number')}</td>
                      <td className={`text-right py-2 font-semibold ${erColor}`}>{er.toFixed(1)}%</td>
                    </tr>
                  )
                })}
                {(!topContent || topContent.length === 0) && (
                  <tr><td colSpan={4} className="py-8 text-center text-gray-400 text-sm">Belum ada data konten</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Goals */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Target & Goal</h2>
          <button
            onClick={() => setShowGoalModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
          >
            ➕ Tambah Goal
          </button>
        </div>
        {goals.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-gray-400 text-sm mb-3">Belum ada goal. Buat target pertama kamu!</p>
            <button onClick={() => setShowGoalModal(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
              ➕ Buat Goal
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {goals.map(goal => {
              const prog = calcGoalProgress(goal)
              const barColors = { green: 'bg-green-500', blue: 'bg-blue-500', yellow: 'bg-yellow-500', red: 'bg-red-400' }
              return (
                <div key={goal.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm">{goal.name}</h3>
                      <div className="flex gap-1.5 mt-1">
                        <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">{goal.metric}</span>
                        <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">{goal.period}</span>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                      prog.status === 'achieved' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {prog.status === 'achieved' ? '🏆 Tercapai' : 'Aktif'}
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 mb-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${barColors[prog.color]}`}
                      style={{ width: `${Math.min(prog.pct, 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{(goal.current_value ?? 0).toLocaleString('id-ID')} / {(goal.target_value ?? 0).toLocaleString('id-ID')}</span>
                    <span className="font-semibold" style={{ color: goal.color }}>{prog.pct}%</span>
                  </div>
                  <div className="flex gap-1.5 mt-3">
                    <button onClick={() => deleteGoal(goal.id)}
                      className="flex-1 text-xs px-2 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100">
                      🗑️ Hapus
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Source Attribution */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Dari Mana Lead Datang</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 uppercase border-b border-gray-100">
                <th className="text-left pb-2 font-medium">Sumber</th>
                <th className="text-right pb-2 font-medium">Lead</th>
                <th className="text-right pb-2 font-medium">Konversi</th>
                <th className="text-right pb-2 font-medium">Revenue</th>
                <th className="text-right pb-2 font-medium">Conv. Rate</th>
                <th className="text-right pb-2 font-medium">Rev/Lead</th>
              </tr>
            </thead>
            <tbody>
              {(attribution || [])
                .sort((a, b) => b.revenue - a.revenue)
                .map((s, i) => {
                  const rate = s.leads > 0 ? ((s.conversions / s.leads) * 100).toFixed(1) : '0'
                  const rpl  = s.leads > 0 ? Math.round(s.revenue / s.leads) : 0
                  const medals = ['🥇','🥈','🥉']
                  return (
                    <tr key={i} className={`border-b border-gray-50 hover:bg-gray-50 ${i === 0 ? 'bg-green-50' : ''}`}>
                      <td className="py-2.5 font-medium text-gray-900">{medals[i] || ''} {s.source}</td>
                      <td className="text-right py-2.5 text-gray-600">{s.leads}</td>
                      <td className="text-right py-2.5 text-gray-600">{s.conversions}</td>
                      <td className="text-right py-2.5 font-medium text-green-600">{formatMetric(s.revenue, 'currency')}</td>
                      <td className="text-right py-2.5">{rate}%</td>
                      <td className="text-right py-2.5 text-gray-600">{formatMetric(rpl, 'currency')}</td>
                    </tr>
                  )
                })}
              {(!attribution || attribution.length === 0) && (
                <tr><td colSpan={6} className="py-8 text-center text-gray-400">Belum ada data attributi</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Goal Modal */}
      {showGoalModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Tambah Goal Baru</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Nama Goal</label>
                <input type="text" value={goalForm.name}
                  onChange={e => setGoalForm(f => ({ ...f, name: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="Misal: 100 Lead Bulan Ini" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Metrik</label>
                  <select value={goalForm.metric} onChange={e => setGoalForm(f => ({ ...f, metric: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                    <option value="leads">Leads</option>
                    <option value="conversions">Konversi</option>
                    <option value="revenue">Revenue</option>
                    <option value="content_count">Konten</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Periode</label>
                  <select value={goalForm.period} onChange={e => setGoalForm(f => ({ ...f, period: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                    <option value="weekly">Mingguan</option>
                    <option value="monthly">Bulanan</option>
                    <option value="quarterly">Kuartalan</option>
                    <option value="yearly">Tahunan</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Target Value</label>
                <input type="number" value={goalForm.target_value}
                  onChange={e => setGoalForm(f => ({ ...f, target_value: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="100" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Warna</label>
                <div className="flex gap-2">
                  {COLOR_SWATCHES.map(c => (
                    <button key={c} onClick={() => setGoalForm(f => ({ ...f, color: c }))}
                      className={`w-7 h-7 rounded-full border-2 transition-transform ${goalForm.color === c ? 'border-gray-900 scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowGoalModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                Batal
              </button>
              <button onClick={handleAddGoal}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
