import { useCallback, useEffect, useState } from 'react'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Link } from 'react-router-dom'
import { format, subDays } from 'date-fns'
import { supabase } from '../../services/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useBrand } from '../../hooks/useBrand'
import TopBar from '../../components/layout/TopBar'
import Button from '../../components/ui/Button'
import { KPICard } from '../../components/ui/Card'
import Card from '../../components/ui/Card'
import { PageLoader } from '../../components/ui/LoadingSpinner'

export default function AnalyticsPage() {
  const { user } = useAuth()
  const { activeBrand } = useBrand()
  const [range, setRange] = useState(7)
  const [stats, setStats] = useState(null)
  const [clickTrend, setClickTrend] = useState([])
  const [topContent, setTopContent] = useState([])
  const [topLinks, setTopLinks] = useState([])
  const [pillarBreakdown, setPillarBreakdown] = useState([])
  const [loading, setLoading] = useState(true)

  const PILLAR_COLORS = { awareness: '#3B82F6', showcase: '#A855F7', education: '#22C55E', social_proof: '#EAB308' }

  const loadAnalytics = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const startDate = format(subDays(new Date(), range), 'yyyy-MM-dd')

    const [clicksRes, contentRes, genRes, dailyRes, linksRes] = await Promise.all([
      supabase.from('smart_links').select('click_count').eq('user_id', user.id),
      supabase.from('content_calendar').select('*').eq('user_id', user.id).eq('status', 'published').gte('published_at', startDate).order('engagement_score', { ascending: false, nullsFirst: false }).limit(10),
      supabase.from('generation_history').select('id', { count: 'exact' }).eq('user_id', user.id).gte('created_at', startDate),
      supabase.from('analytics_daily').select('*').eq('user_id', user.id).gte('date', startDate).order('date'),
      supabase.from('smart_links').select('id, slug, title, click_count').eq('user_id', user.id).order('click_count', { ascending: false }).limit(5),
    ])

    const totalClicks = (clicksRes.data || []).reduce((s, l) => s + (l.click_count || 0), 0)

    setStats({
      totalClicks,
      publishedCount: (contentRes.data || []).length,
      generationCount: genRes.count || 0,
    })

    setClickTrend((dailyRes.data || []).map(d => ({
      date: format(new Date(d.date), 'dd/MM'),
      clicks: d.total_clicks || 0,
      published: d.total_content_published || 0,
    })))

    setTopContent(contentRes.data || [])
    setTopLinks((linksRes.data || []).filter(l => l.click_count > 0))

    // Calculate pillar breakdown from published content
    const allContent = contentRes.data || []
    const pillarCounts = {}
    allContent.forEach(c => {
      const p = c.pillar || 'awareness'
      pillarCounts[p] = (pillarCounts[p] || 0) + 1
    })
    setPillarBreakdown(Object.entries(pillarCounts).map(([name, value]) => ({ name: name.replace('_', ' '), value, fill: PILLAR_COLORS[name] || '#9CA3AF' })))

    setLoading(false)
  }, [user, range])

  useEffect(() => { loadAnalytics() }, [loadAnalytics])

  if (loading) return <PageLoader />

  return (
    <div>
      <TopBar title="Analytics" subtitle="Performa konten & link kamu" actions={
        <div className="flex gap-1">
          {[7, 30, 90].map(d => (
            <Button key={d} size="sm" variant={range === d ? 'primary' : 'secondary'} onClick={() => setRange(d)}>{d}d</Button>
          ))}
        </div>
      } />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <KPICard title="Total Clicks" value={(stats?.totalClicks || 0).toLocaleString('id-ID')} color="primary" />
        <KPICard title="Content Published" value={stats?.publishedCount || 0} color="accent" />
        <KPICard title="AI Generations" value={stats?.generationCount || 0} color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <h3 className="font-semibold mb-4">Click Trend</h3>
          {clickTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={clickTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Line type="monotone" dataKey="clicks" stroke="#2a95ff" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-sm text-center py-12">Belum ada data</p>
          )}
        </Card>

        <Card>
          <h3 className="font-semibold mb-4">Content Published</h3>
          {clickTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={clickTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="published" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-sm text-center py-12">Belum ada data</p>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Top Content Performance</h3>
          </div>
          {topContent.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">Belum ada konten yang dipublish</p>
          ) : (
            <div className="space-y-3">
              {topContent.map((item, i) => (
                <div key={item.id} className="flex items-center gap-4 py-2 border-b border-gray-50 last:border-0">
                  <span className={`text-lg font-bold w-6 ${i < 3 ? 'text-primary-600' : 'text-gray-300'}`}>#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.title}</p>
                    <p className="text-xs text-gray-400">
                      <span className="capitalize">{item.platform}</span> &middot; <span className="capitalize">{item.type}</span> &middot; <span className="capitalize">{(item.pillar || '').replace('_', ' ')}</span>
                      {item.published_at && <> &middot; {format(new Date(item.published_at), 'dd MMM yyyy')}</>}
                    </p>
                  </div>
                  {item.engagement_score != null && (
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">{item.engagement_score}</p>
                      <p className="text-xs text-gray-400">score</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h3 className="font-semibold mb-4">Content Pillar Mix</h3>
          {pillarBreakdown.length > 0 ? (
            <div>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={pillarBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={40}>
                    {pillarBreakdown.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1 mt-2">
                {pillarBreakdown.map(p => (
                  <div key={p.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.fill }} />
                      <span className="capitalize">{p.name}</span>
                    </div>
                    <span className="font-medium">{p.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-gray-400 text-sm text-center py-8">Belum ada data</p>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Top Links</h3>
            <Link to="/links" className="text-sm text-primary-600 hover:underline">Lihat semua</Link>
          </div>
          {topLinks.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">Belum ada link dengan clicks</p>
          ) : (
            <div className="space-y-3">
              {topLinks.map((link, i) => (
                <Link key={link.id} to={`/links/${link.id}`} className="flex items-center gap-4 py-2 border-b border-gray-50 last:border-0 hover:bg-gray-50 -mx-2 px-2 rounded transition-colors">
                  <span className={`text-lg font-bold w-6 ${i < 3 ? 'text-primary-600' : 'text-gray-300'}`}>#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{link.title || link.slug}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">{(link.click_count || 0).toLocaleString('id-ID')}</p>
                    <p className="text-xs text-gray-400">clicks</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Weekly Report</h3>
            <Link to="/analytics/reports" className="text-sm text-primary-600 hover:underline">Lihat semua</Link>
          </div>
          <p className="text-gray-400 text-sm text-center py-8">Buka halaman report untuk generate laporan mingguan otomatis.</p>
        </Card>
      </div>
    </div>
  )
}
