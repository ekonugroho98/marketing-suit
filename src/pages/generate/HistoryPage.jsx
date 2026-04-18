import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../services/supabase'
import { useAuth } from '../../hooks/useAuth'
import TopBar from '../../components/layout/TopBar'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import EmptyState from '../../components/ui/EmptyState'

const GENERATION_TYPES = [
  { value: 'all', label: 'Semua' },
  { value: 'caption', label: 'Caption' },
  { value: 'thread', label: 'Thread' },
  { value: 'carousel', label: 'Carousel' },
  { value: 'ad_copy', label: 'Ad Copy' },
  { value: 'video_script', label: 'Video Script' },
  { value: 'hashtags', label: 'Hashtags' },
  { value: 'repurpose', label: 'Repurpose' },
]

const TYPE_COLORS = {
  caption: 'blue',
  thread: 'purple',
  carousel: 'green',
  ad_copy: 'red',
  video_script: 'yellow',
  hashtags: 'pink',
  repurpose: 'gray',
}

const TYPE_LABELS = {
  caption: 'Caption',
  thread: 'Thread',
  carousel: 'Carousel',
  ad_copy: 'Ad Copy',
  video_script: 'Video Script',
  hashtags: 'Hashtags',
  repurpose: 'Repurpose',
}

const PAGE_SIZE = 20

function truncateOutput(output) {
  if (!output) return ''
  if (typeof output === 'string') {
    return output.length > 150 ? output.slice(0, 150) + '...' : output
  }
  if (output.text) {
    const text = output.text
    return text.length > 150 ? text.slice(0, 150) + '...' : text
  }
  if (output.content) {
    const text = output.content
    return typeof text === 'string'
      ? text.length > 150 ? text.slice(0, 150) + '...' : text
      : ''
  }
  if (Array.isArray(output)) {
    const preview = output.map((item, i) => {
      if (typeof item === 'string') return item
      if (item?.text) return item.text
      if (item?.content) return item.content
      return ''
    }).filter(Boolean).join(' | ')
    return preview.length > 150 ? preview.slice(0, 150) + '...' : preview
  }
  const json = JSON.stringify(output)
  return json.length > 150 ? json.slice(0, 150) + '...' : json
}

function formatFullOutput(output) {
  if (!output) return 'Tidak ada output'
  if (typeof output === 'string') return output
  if (output.text) return output.text
  if (output.content && typeof output.content === 'string') return output.content
  if (Array.isArray(output)) {
    return output.map((item, i) => {
      if (typeof item === 'string') return `${i + 1}. ${item}`
      if (item?.text) return `${i + 1}. ${item.text}`
      if (item?.content) return `${i + 1}. ${item.content}`
      return `${i + 1}. ${JSON.stringify(item, null, 2)}`
    }).join('\n\n')
  }
  return JSON.stringify(output, null, 2)
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function HistoryPage() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [typeFilter, setTypeFilter] = useState('all')
  const [expandedId, setExpandedId] = useState(null)
  const [savingId, setSavingId] = useState(null)
  const [savedIds, setSavedIds] = useState(new Set())
  const [hasMore, setHasMore] = useState(true)

  const fetchHistory = useCallback(async (append = false) => {
    if (!user) return

    if (append) {
      setLoadingMore(true)
    } else {
      setLoading(true)
      setExpandedId(null)
    }

    const offset = append ? items.length : 0

    let query = supabase
      .from('generation_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1)

    if (typeFilter !== 'all') {
      query = query.eq('type', typeFilter)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching generation history:', error)
      if (!append) setItems([])
    } else {
      const newItems = data || []
      if (append) {
        setItems(prev => [...prev, ...newItems])
      } else {
        setItems(newItems)
        // Track which items are already saved
        const saved = new Set(newItems.filter(i => i.is_saved).map(i => i.id))
        setSavedIds(saved)
      }
      setHasMore(newItems.length === PAGE_SIZE)

      if (append && newItems.length > 0) {
        const newSaved = new Set([...savedIds, ...newItems.filter(i => i.is_saved).map(i => i.id)])
        setSavedIds(newSaved)
      }
    }

    setLoading(false)
    setLoadingMore(false)
  }, [user, typeFilter, items.length, savedIds])

  useEffect(() => {
    fetchHistory(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, typeFilter])

  function toggleExpand(id) {
    setExpandedId(prev => prev === id ? null : id)
  }

  async function saveToLibrary(item) {
    if (savedIds.has(item.id)) return
    setSavingId(item.id)

    const outputText = formatFullOutput(item.output)
    const title = item.input_params?.topic || item.input_params?.product_name || TYPE_LABELS[item.type] || 'Untitled'

    const { error } = await supabase
      .from('saved_content')
      .insert({
        user_id: user.id,
        brand_id: item.brand_id,
        type: item.type,
        title: title,
        content: outputText,
        platform: item.platform,
        tags: [item.type, item.platform, item.pillar].filter(Boolean),
      })

    if (!error) {
      // Mark as saved in generation_history
      await supabase
        .from('generation_history')
        .update({ is_saved: true })
        .eq('id', item.id)

      setSavedIds(prev => new Set([...prev, item.id]))
    } else {
      console.error('Error saving to library:', error)
    }

    setSavingId(null)
  }

  return (
    <div>
      <TopBar
        title="Riwayat Generasi"
        subtitle="Semua hasil AI generation kamu"
      />

      {/* Type Filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {GENERATION_TYPES.map(t => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTypeFilter(t.value)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              typeFilter === t.value
                ? 'bg-primary-600 text-white border-primary-600'
                : 'bg-white text-gray-600 border-gray-300 hover:border-primary-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-sm text-gray-500">Memuat riwayat...</p>
        </div>
      ) : items.length === 0 ? (
        <Card>
          <EmptyState
            title="Belum ada riwayat generasi"
            description={
              typeFilter !== 'all'
                ? 'Tidak ada generasi untuk tipe ini. Coba filter lain.'
                : 'Mulai buat konten dengan AI Generator dan riwayatnya akan tampil di sini.'
            }
            actionLabel={typeFilter !== 'all' ? 'Reset Filter' : null}
            onAction={typeFilter !== 'all' ? () => setTypeFilter('all') : null}
          />
        </Card>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">{items.length} generasi ditampilkan</p>

          {items.map(item => {
            const isExpanded = expandedId === item.id
            const isSaved = savedIds.has(item.id)
            const isSaving = savingId === item.id

            return (
              <Card key={item.id} className="p-4">
                {/* Header row */}
                <div
                  className="flex items-start justify-between gap-4 cursor-pointer"
                  onClick={() => toggleExpand(item.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge color={TYPE_COLORS[item.type] || 'gray'}>
                        {TYPE_LABELS[item.type] || item.type}
                      </Badge>
                      {item.platform && (
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                          {item.platform}
                        </span>
                      )}
                      {item.pillar && (
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full capitalize">
                          {item.pillar}
                        </span>
                      )}
                      {isSaved && (
                        <span className="text-xs text-green-600 font-medium">Tersimpan</span>
                      )}
                      <span className="text-xs text-gray-400 ml-auto flex-shrink-0">
                        {formatDate(item.created_at)}
                      </span>
                    </div>

                    {/* Preview */}
                    {!isExpanded && (
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {truncateOutput(item.output)}
                      </p>
                    )}
                  </div>

                  {/* Expand/collapse icon */}
                  <div className="flex-shrink-0 mt-1">
                    <svg
                      className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                  </div>
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    {/* Input params */}
                    {item.input_params && Object.keys(item.input_params).length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Input</p>
                        <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700">
                          {Object.entries(item.input_params).map(([key, val]) => (
                            <div key={key} className="flex gap-2 mb-1 last:mb-0">
                              <span className="font-medium text-gray-500 capitalize min-w-[100px]">
                                {key.replace(/_/g, ' ')}:
                              </span>
                              <span className="text-gray-800">
                                {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Full output */}
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Output</p>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">
                          {formatFullOutput(item.output)}
                        </pre>
                      </div>
                    </div>

                    {/* Meta info */}
                    <div className="flex items-center gap-4 text-xs text-gray-400 mb-3">
                      {item.model && <span>Model: {item.model}</span>}
                      {item.tokens_used != null && <span>Token: {item.tokens_used}</span>}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant={isSaved ? 'ghost' : 'secondary'}
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          saveToLibrary(item)
                        }}
                        disabled={isSaved || isSaving}
                      >
                        {isSaving ? (
                          <>
                            <svg className="animate-spin w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Menyimpan...
                          </>
                        ) : isSaved ? (
                          <>
                            <svg className="w-4 h-4 mr-1.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                            Sudah Tersimpan
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
                            </svg>
                            Simpan ke Library
                          </>
                        )}
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async (e) => {
                          e.stopPropagation()
                          try {
                            await navigator.clipboard.writeText(formatFullOutput(item.output))
                          } catch (err) {
                            console.error('Failed to copy:', err)
                          }
                        }}
                      >
                        <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                        </svg>
                        Salin
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            )
          })}

          {/* Load More */}
          {hasMore && (
            <div className="text-center pt-4">
              <Button
                variant="secondary"
                onClick={() => fetchHistory(true)}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <>
                    <svg className="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Memuat...
                  </>
                ) : (
                  'Muat Lebih Banyak'
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
