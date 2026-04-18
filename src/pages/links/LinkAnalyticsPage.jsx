import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { format, subDays, eachDayOfInterval } from 'date-fns'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase } from '../../services/supabase'
import { useAuth } from '../../hooks/useAuth'
import TopBar from '../../components/layout/TopBar'
import Button from '../../components/ui/Button'
import Card, { KPICard } from '../../components/ui/Card'
import { PageLoader } from '../../components/ui/LoadingSpinner'

const RANGE_OPTIONS = [
  { label: '7 Hari', value: 7 },
  { label: '30 Hari', value: 30 },
]

export default function LinkAnalyticsPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const [link, setLink] = useState(null)
  const [clicks, setClicks] = useState([])
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState(7)

  const loadData = useCallback(async () => {
    if (!user || !id) return
    setLoading(true)

    const [linkRes, clicksRes] = await Promise.all([
      supabase
        .from('smart_links')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single(),
      supabase
        .from('link_clicks')
        .select('*')
        .eq('link_id', id)
        .order('clicked_at', { ascending: false }),
    ])

    setLink(linkRes.data)
    setClicks(clicksRes.data || [])
    setLoading(false)
  }, [user, id])

  useEffect(() => { loadData() }, [loadData])

  // Click trend data for chart
  const trendData = useMemo(() => {
    const now = new Date()
    const start = subDays(now, range - 1)
    const days = eachDayOfInterval({ start, end: now })

    return days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd')
      const count = clicks.filter(c => {
        const clickDay = format(new Date(c.clicked_at), 'yyyy-MM-dd')
        return clickDay === dayStr
      }).length
      return { date: format(day, 'dd MMM'), clicks: count }
    })
  }, [clicks, range])

  // Device breakdown
  const deviceBreakdown = useMemo(() => {
    const map = {}
    clicks.forEach(c => {
      const device = c.device || 'Tidak diketahui'
      map[device] = (map[device] || 0) + 1
    })
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [clicks])

  // Browser breakdown
  const browserBreakdown = useMemo(() => {
    const map = {}
    clicks.forEach(c => {
      const browser = c.browser || 'Tidak diketahui'
      map[browser] = (map[browser] || 0) + 1
    })
    return Object.entries(map)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
  }, [clicks])

  // Top referrers
  const topReferrers = useMemo(() => {
    const map = {}
    clicks.forEach(c => {
      const ref = c.referrer || 'Langsung / Tidak diketahui'
      map[ref] = (map[ref] || 0) + 1
    })
    return Object.entries(map)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }, [clicks])

  // Country/city breakdown
  const locationBreakdown = useMemo(() => {
    const map = {}
    clicks.forEach(c => {
      const loc = [c.country, c.city].filter(Boolean).join(', ') || 'Tidak diketahui'
      map[loc] = (map[loc] || 0) + 1
    })
    return Object.entries(map)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }, [clicks])

  // Recent 20 clicks
  const recentClicks = useMemo(() => clicks.slice(0, 20), [clicks])

  function getShortUrl(slug) {
    return `${window.location.origin}/r/${slug}`
  }

  if (loading) return <PageLoader />

  if (!link) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500 text-lg mb-4">Link tidak ditemukan</p>
        <Link to="/links">
          <Button variant="secondary">Kembali ke Smart Links</Button>
        </Link>
      </div>
    )
  }

  return (
    <div>
      <TopBar
        title="Analitik Link"
        subtitle={link.title || link.slug}
        actions={
          <Link to="/links">
            <Button variant="secondary">Kembali</Button>
          </Link>
        }
      />

      {/* Link info */}
      <Card className="mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-gray-900">{link.title || link.slug}</h2>
            <p className="text-sm text-primary-600 mt-1">{getShortUrl(link.slug)}</p>
            <p className="text-xs text-gray-400 truncate mt-0.5">{link.destination_url}</p>
            <div className="flex gap-3 mt-2 text-xs text-gray-500">
              {link.utm_source && <span>Source: {link.utm_source}</span>}
              {link.utm_medium && <span>Medium: {link.utm_medium}</span>}
              {link.utm_campaign && <span>Campaign: {link.utm_campaign}</span>}
            </div>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-gray-900">{link.click_count || 0}</p>
            <p className="text-sm text-gray-500">Total Klik</p>
          </div>
        </div>
      </Card>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KPICard
          title="Total Klik"
          value={link.click_count || 0}
          icon="🖱️"
          color="primary"
        />
        <KPICard
          title="Perangkat Unik"
          value={deviceBreakdown.length}
          icon="📱"
          color="accent"
        />
        <KPICard
          title="Negara/Kota"
          value={locationBreakdown.length}
          icon="🌍"
          color="purple"
        />
        <KPICard
          title="Status"
          value={link.is_active ? 'Aktif' : 'Nonaktif'}
          icon={link.is_active ? '🟢' : '🔴'}
          color={link.is_active ? 'primary' : 'danger'}
        />
      </div>

      {/* Click trend chart */}
      <Card className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Tren Klik</h3>
          <div className="flex gap-2">
            {RANGE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setRange(opt.value)}
                className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                  range === opt.value
                    ? 'bg-primary-100 text-primary-700 font-medium'
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="clicks"
                stroke="#6366f1"
                strokeWidth={2}
                dot={{ r: 4 }}
                name="Klik"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Device & Browser breakdown */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Device breakdown */}
        <Card>
          <h3 className="font-semibold text-gray-900 mb-4">Perangkat</h3>
          {deviceBreakdown.length === 0 ? (
            <p className="text-sm text-gray-400">Belum ada data</p>
          ) : (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deviceBreakdown} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={100} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} name="Klik" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* Browser breakdown */}
        <Card>
          <h3 className="font-semibold text-gray-900 mb-4">Browser</h3>
          {browserBreakdown.length === 0 ? (
            <p className="text-sm text-gray-400">Belum ada data</p>
          ) : (
            <div className="space-y-2">
              {browserBreakdown.map(item => (
                <div key={item.name} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{item.name}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary-500 rounded-full"
                        style={{ width: `${(item.count / clicks.length) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-8 text-right">{item.count}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Referrers & Location */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Top referrers */}
        <Card>
          <h3 className="font-semibold text-gray-900 mb-4">Top Referrer</h3>
          {topReferrers.length === 0 ? (
            <p className="text-sm text-gray-400">Belum ada data</p>
          ) : (
            <div className="space-y-2">
              {topReferrers.map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 truncate flex-1 mr-3">{item.name}</span>
                  <span className="text-sm font-medium text-gray-900">{item.count}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Country/city */}
        <Card>
          <h3 className="font-semibold text-gray-900 mb-4">Lokasi</h3>
          {locationBreakdown.length === 0 ? (
            <p className="text-sm text-gray-400">Belum ada data</p>
          ) : (
            <div className="space-y-2">
              {locationBreakdown.map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 truncate flex-1 mr-3">{item.name}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent-500 rounded-full"
                        style={{ width: `${(item.count / clicks.length) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-8 text-right">{item.count}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Recent clicks table */}
      <Card>
        <h3 className="font-semibold text-gray-900 mb-4">Klik Terakhir</h3>
        {recentClicks.length === 0 ? (
          <p className="text-sm text-gray-400">Belum ada klik tercatat</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-2 pr-4 font-medium">Waktu</th>
                  <th className="pb-2 pr-4 font-medium">Perangkat</th>
                  <th className="pb-2 pr-4 font-medium">Browser</th>
                  <th className="pb-2 pr-4 font-medium">OS</th>
                  <th className="pb-2 pr-4 font-medium">Lokasi</th>
                  <th className="pb-2 font-medium">Referrer</th>
                </tr>
              </thead>
              <tbody>
                {recentClicks.map(click => (
                  <tr key={click.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-2.5 pr-4 text-gray-700 whitespace-nowrap">
                      {format(new Date(click.clicked_at), 'dd MMM yyyy, HH:mm')}
                    </td>
                    <td className="py-2.5 pr-4 text-gray-600">{click.device || '-'}</td>
                    <td className="py-2.5 pr-4 text-gray-600">{click.browser || '-'}</td>
                    <td className="py-2.5 pr-4 text-gray-600">{click.os || '-'}</td>
                    <td className="py-2.5 pr-4 text-gray-600">
                      {[click.city, click.country].filter(Boolean).join(', ') || '-'}
                    </td>
                    <td className="py-2.5 text-gray-600 truncate max-w-[200px]">
                      {click.referrer || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
