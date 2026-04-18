import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useABTest } from '../../hooks/useABTest'
import { calculateSignificance, formatConfidence } from '../../utils/statistics'
import TopBar from '../../components/layout/TopBar'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import { KPICard } from '../../components/ui/Card'

const STATUS_COLORS = {
  draft: 'gray',
  running: 'green',
  paused: 'yellow',
  completed: 'blue',
}

const STATUS_LABELS = {
  draft: 'Draft',
  running: 'Running',
  paused: 'Paused',
  completed: 'Completed',
}

const TEST_TYPE_LABELS = {
  content: 'Konten',
  ad_copy: 'Ad Copy',
  link_rotator: 'Link Rotator',
  subject_line: 'Subject Line',
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function calculateCTR(impressions, clicks) {
  if (impressions === 0) return 0
  return (clicks / impressions) * 100
}

export default function ABTestDetailPage() {
  const { testId } = useParams()
  const navigate = useNavigate()
  const { activeTest, setActiveTest, fetchTest, loading, start, pause, complete, remove } = useABTest()

  const [showWinnerDropdown, setShowWinnerDropdown] = useState(false)
  const [selectedWinner, setSelectedWinner] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState(null)

  useEffect(() => {
    if (testId) {
      fetchTest(testId)
    }
  }, [testId, fetchTest])

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-emerald-600 border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-sm text-gray-500">Memuat test detail...</p>
      </div>
    )
  }

  if (!activeTest) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">A/B test tidak ditemukan</p>
        <Button onClick={() => navigate('/ab-tests')}>Kembali ke Dashboard</Button>
      </div>
    )
  }

  const variants = activeTest.ab_test_variants || []
  const totalImpressions = variants.reduce((sum, v) => sum + (v.impressions || 0), 0)
  const totalClicks = variants.reduce((sum, v) => sum + (v.clicks || 0), 0)
  const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0

  // Calculate significance if there are at least 2 variants
  let significance = null
  if (variants.length >= 2) {
    significance = calculateSignificance(variants[0], variants[1])
  }

  const handleStart = async () => {
    setActionLoading(true)
    setActionError(null)
    try {
      await start(testId)
    } catch (err) {
      setActionError(err.message || 'Failed to start test')
    } finally {
      setActionLoading(false)
    }
  }

  const handlePause = async () => {
    setActionLoading(true)
    setActionError(null)
    try {
      await pause(testId)
    } catch (err) {
      setActionError(err.message || 'Failed to pause test')
    } finally {
      setActionLoading(false)
    }
  }

  const handlePickWinner = async () => {
    if (!selectedWinner) {
      setActionError('Pilih pemenang terlebih dahulu')
      return
    }

    setActionLoading(true)
    setActionError(null)
    try {
      await complete(testId, selectedWinner)
      setShowWinnerDropdown(false)
      setSelectedWinner(null)
    } catch (err) {
      setActionError(err.message || 'Failed to complete test')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = async () => {
    if (window.confirm('Yakin ingin menghapus test ini? Tindakan ini tidak dapat dibatalkan.')) {
      setActionLoading(true)
      setActionError(null)
      try {
        await remove(testId)
        navigate('/ab-tests')
      } catch (err) {
        setActionError(err.message || 'Failed to delete test')
      } finally {
        setActionLoading(false)
      }
    }
  }

  const winnerVariant = variants.find((v) => v.id === activeTest.winner_variant_id)

  return (
    <div>
      <TopBar
        title={activeTest.name}
        subtitle={TEST_TYPE_LABELS[activeTest.type] || activeTest.type}
        actions={
          <div className="flex gap-2">
            <Badge color={STATUS_COLORS[activeTest.status]}>
              {STATUS_LABELS[activeTest.status]}
            </Badge>

            {activeTest.status === 'draft' && (
              <Button
                size="sm"
                variant="primary"
                onClick={handleStart}
                loading={actionLoading}
              >
                Start Test
              </Button>
            )}

            {activeTest.status === 'running' && (
              <>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handlePause}
                  loading={actionLoading}
                >
                  Pause
                </Button>

                {significance?.isSignificant && (
                  <div className="relative">
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => setShowWinnerDropdown(!showWinnerDropdown)}
                    >
                      Pick Winner
                    </Button>

                    {showWinnerDropdown && (
                      <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10 w-48">
                        <div className="p-3 border-b border-gray-100">
                          <p className="text-sm font-medium text-gray-900">
                            Pilih Pemenang
                          </p>
                        </div>
                        <div className="space-y-1 p-2">
                          {variants.map((v) => (
                            <button
                              key={v.id}
                              onClick={() => setSelectedWinner(v.id)}
                              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                                selectedWinner === v.id
                                  ? 'bg-emerald-100 text-emerald-900'
                                  : 'hover:bg-gray-100 text-gray-700'
                              }`}
                            >
                              {v.name}
                            </button>
                          ))}
                        </div>
                        <div className="border-t border-gray-100 p-2 space-y-1">
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={handlePickWinner}
                            loading={actionLoading}
                            className="w-full text-center"
                          >
                            Pilih
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setShowWinnerDropdown(false)
                              setSelectedWinner(null)
                            }}
                            className="w-full text-center"
                          >
                            Batal
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            <Button
              size="sm"
              variant="secondary"
              onClick={handleDelete}
              loading={actionLoading}
            >
              Delete
            </Button>
          </div>
        }
      />

      {actionError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{actionError}</p>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <KPICard
          title="Total Impressions"
          value={totalImpressions.toLocaleString('id-ID')}
          icon="👁️"
        />
        <KPICard
          title="Total Clicks"
          value={totalClicks.toLocaleString('id-ID')}
          icon="🖱️"
        />
        <KPICard
          title="Avg CTR"
          value={`${avgCTR.toFixed(2)}%`}
          icon="📊"
        />
        <KPICard
          title="Confidence"
          value={significance ? `${(significance.confidence * 100).toFixed(1)}%` : '-'}
          subtitle={significance ? formatConfidence(significance.confidence) : ''}
          icon="✓"
        />
      </div>

      {/* Variants */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {variants.map((variant) => {
          const ctr = calculateCTR(variant.impressions, variant.clicks)
          const isWinner = activeTest.status === 'completed' && variant.id === activeTest.winner_variant_id

          return (
            <Card
              key={variant.id}
              className={`p-6 ${isWinner ? 'border-emerald-300 border-2' : ''}`}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {variant.name}
                  {isWinner && (
                    <span className="ml-2 text-2xl">🏆</span>
                  )}
                </h3>
              </div>

              <div className="space-y-3 mb-4">
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 bg-gray-50 rounded">
                    <p className="text-xs text-gray-600">Impressions</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {variant.impressions.toLocaleString('id-ID')}
                    </p>
                  </div>
                  <div className="p-2 bg-gray-50 rounded">
                    <p className="text-xs text-gray-600">Clicks</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {variant.clicks.toLocaleString('id-ID')}
                    </p>
                  </div>
                  <div className="p-2 bg-gray-50 rounded">
                    <p className="text-xs text-gray-600">CTR</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {ctr.toFixed(2)}%
                    </p>
                  </div>
                  <div className="p-2 bg-gray-50 rounded">
                    <p className="text-xs text-gray-600">Conversions</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {variant.conversions || 0}
                    </p>
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-emerald-500 h-2 rounded-full transition-all"
                    style={{
                      width: `${totalImpressions > 0 ? (variant.impressions / totalImpressions) * 100 : 0}%`,
                    }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-900 w-12 text-right">
                  {totalImpressions > 0
                    ? ((variant.impressions / totalImpressions) * 100).toFixed(0)
                    : 0}
                  %
                </span>
              </div>

              {/* Link Rotator URLs */}
              {activeTest.type === 'link_rotator' && variant.destination_url && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-xs font-medium text-gray-600 mb-1">
                    Destination URL
                  </p>
                  <a
                    href={variant.destination_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-emerald-600 hover:text-emerald-700 break-all"
                  >
                    {variant.destination_url}
                  </a>
                </div>
              )}
            </Card>
          )
        })}
      </div>

      {/* Winner Summary (for completed tests) */}
      {activeTest.status === 'completed' && winnerVariant && (
        <Card className="p-6 border-emerald-300 border-2 bg-emerald-50">
          <div className="text-center">
            <p className="text-lg font-semibold text-emerald-900 mb-2">
              🏆 {winnerVariant.name} Menang!
            </p>
            <p className="text-sm text-emerald-700 mb-4">
              Tingkat CTR: {calculateCTR(winnerVariant.impressions, winnerVariant.clicks).toFixed(2)}%
            </p>
            {significance && (
              <p className="text-xs text-emerald-600">
                Uplift: {significance.uplift > 0 ? '+' : ''}{significance.uplift.toFixed(1)}%
              </p>
            )}
          </div>
        </Card>
      )}

      {/* Test Metadata */}
      <Card className="p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Test Information</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Created</p>
            <p className="font-medium text-gray-900">
              {formatDate(activeTest.created_at)}
            </p>
          </div>
          <div>
            <p className="text-gray-600">Started</p>
            <p className="font-medium text-gray-900">
              {formatDate(activeTest.start_date)}
            </p>
          </div>
          <div>
            <p className="text-gray-600">Status</p>
            <p className="font-medium text-gray-900">
              {STATUS_LABELS[activeTest.status]}
            </p>
          </div>
          {activeTest.completed_date && (
            <div>
              <p className="text-gray-600">Completed</p>
              <p className="font-medium text-gray-900">
                {formatDate(activeTest.completed_date)}
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
