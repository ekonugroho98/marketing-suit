import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../services/supabase'
import { PLATFORM_META } from '../../services/platforms'
import TopBar from '../../components/layout/TopBar'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import EmptyState from '../../components/ui/EmptyState'

const PLATFORM_OPTIONS = [
  { value: 'all', label: 'Semua' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'twitter', label: 'Twitter' },
  { value: 'threads', label: 'Threads' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'facebook', label: 'Facebook' },
]

const STATUS_OPTIONS = [
  { value: 'all', label: 'Semua' },
  { value: 'published', label: 'Published' },
  { value: 'success', label: 'Success' },
  { value: 'pending', label: 'Pending' },
  { value: 'failed', label: 'Failed' },
]

const DATE_RANGE_OPTIONS = [
  { value: '7', label: '7 hari terakhir' },
  { value: '30', label: '30 hari terakhir' },
  { value: 'all', label: 'Semua waktu' },
]

const STATUS_COLORS = {
  published: 'green',
  success: 'green',
  pending: 'yellow',
  failed: 'red',
}

const STATUS_LABELS = {
  published: 'Published',
  success: 'Success',
  pending: 'Pending',
  failed: 'Failed',
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function truncateCaption(caption, maxLength = 100) {
  if (!caption) return 'Tanpa caption'
  if (caption.length > maxLength) {
    return caption.slice(0, maxLength) + '...'
  }
  return caption
}

export default function PublishHistoryPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [platformFilter, setPlatformFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateRange, setDateRange] = useState('30')

  const fetchHistory = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Ambil session user
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user?.id) {
        setItems([])
        setLoading(false)
        return
      }

      let query = supabase
        .from('publish_history')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(100)

      // Filter tanggal
      if (dateRange !== 'all') {
        const days = parseInt(dateRange, 10)
        const since = new Date()
        since.setDate(since.getDate() - days)
        query = query.gte('created_at', since.toISOString())
      }

      const { data, error: queryErr } = await query

      if (queryErr) {
        console.error('[history] query error:', queryErr)
        setError(queryErr.message)
        setItems([])
      } else {
        let filtered = data || []
        if (platformFilter !== 'all') filtered = filtered.filter(i => i.platform === platformFilter)
        if (statusFilter !== 'all') filtered = filtered.filter(i => i.status === statusFilter)
        setItems(filtered)
      }
    } catch (err) {
      console.error('[history] exception:', err)
      setError(err.message)
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [dateRange, platformFilter, statusFilter])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  return (
    <div>
      <TopBar
        title="Riwayat Publish"
        subtitle="Semua konten yang dipublikasikan"
      />

      {/* Filter Bar */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Platform Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Platform
            </label>
            <select
              value={platformFilter}
              onChange={(e) => {
                setPlatformFilter(e.target.value)
                setCurrentPage(0)
              }}
              className="w-full input-field text-sm"
            >
              {PLATFORM_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setCurrentPage(0)
              }}
              className="w-full input-field text-sm"
            >
              {STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Date Range Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Periode
            </label>
            <select
              value={dateRange}
              onChange={(e) => {
                setDateRange(e.target.value)
                setCurrentPage(0)
              }}
              className="w-full input-field text-sm"
            >
              {DATE_RANGE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-emerald-600 border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-sm text-gray-500">Memuat riwayat publish...</p>
        </div>
      ) : error ? (
        <Card>
          <div className="text-center py-8">
            <p className="text-red-500 font-semibold mb-2">Gagal memuat riwayat</p>
            <p className="text-sm text-gray-500 mb-4">{error}</p>
            <Button onClick={fetchHistory} variant="secondary">Coba Lagi</Button>
          </div>
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <EmptyState
            title="Belum ada konten yang di-publish"
            description={
              platformFilter !== 'all' || statusFilter !== 'all' || dateRange !== 'all'
                ? 'Tidak ada konten untuk filter ini. Coba ubah filter.'
                : 'Mulai publish konten ke platform sosial media.'
            }
            actionLabel={platformFilter !== 'all' || statusFilter !== 'all' || dateRange !== 'all' ? 'Reset Filter' : null}
            onAction={() => {
              setPlatformFilter('all')
              setStatusFilter('all')
              setDateRange('30')
              setCurrentPage(0)
            }}
          />
        </Card>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">{items.length} riwayat ditemukan</p>
          {items.map(item => {
            const platformMeta = PLATFORM_META[item.platform]
            const statusLabel = STATUS_LABELS[item.status] || item.status
            const statusColor = STATUS_COLORS[item.status] || 'gray'
            const isFailed = item.status === 'failed'

            return (
              <Card key={item.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  {/* Left: Platform, content, status */}
                  <div className="flex-1 min-w-0">
                    {/* Platform + Status row */}
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {platformMeta && (
                        <>
                          <span className="text-lg">{platformMeta.icon}</span>
                          <span className="font-medium text-sm text-gray-900">
                            {platformMeta.name}
                          </span>
                        </>
                      )}
                      <Badge color={statusColor}>
                        {statusLabel}
                      </Badge>
                    </div>

                    {/* Caption preview — disimpan di payload.caption */}
                    <p className="text-sm text-gray-600 mb-2 leading-relaxed">
                      {truncateCaption(item.payload?.caption || item.caption)}
                    </p>

                    {/* Published date */}
                    <p className="text-xs text-gray-500 mb-2">
                      {formatDate(item.published_at || item.created_at)}
                    </p>

                    {/* Published URL — kolom bernama published_url */}
                    {(item.published_url || item.post_url) && (item.status === 'published' || item.status === 'success') && (
                      <a
                        href={item.published_url || item.post_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-emerald-600 hover:text-emerald-700 underline truncate inline-block"
                      >
                        Lihat di {platformMeta?.name || item.platform} →
                      </a>
                    )}

                    {/* Error message (if status is failed) */}
                    {isFailed && item.error_message && (
                      <div className="mt-2 p-2 bg-red-50 rounded border border-red-200">
                        <p className="text-xs text-red-700">
                          <span className="font-semibold">Error: </span>
                          {item.error_message}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Refresh button */}
                  {isFailed && (
                    <span className="text-xs text-red-500 font-medium flex-shrink-0">Gagal</span>
                  )}
                </div>
              </Card>
            )
          })}

          <div className="pt-4 text-center">
            <Button variant="secondary" size="sm" onClick={fetchHistory}>↻ Refresh</Button>
          </div>
        </div>
      )}
    </div>
  )
}
