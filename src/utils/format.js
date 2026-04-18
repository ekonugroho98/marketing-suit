/**
 * Shared formatting utilities | Karaya Marketing Suite
 * Extracted from duplicated code across AdsDashboard, CRMDashboard, ABTestDashboard, BilingPage
 */

/**
 * Format number as Indonesian Rupiah
 * @param {number} value
 * @returns {string} e.g. "Rp 150.000"
 */
export function formatRupiah(value) {
  if (!value) return 'Rp 0'
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

/**
 * Format number with Indonesian locale (1.000, 2.500, etc.)
 * @param {number} value
 * @returns {string}
 */
export function formatNumber(value) {
  if (!value) return '0'
  return value.toLocaleString('id-ID')
}

/**
 * Format date in Indonesian locale
 * Default short format: "12 Jan 2025"
 * @param {string|Date} dateString
 * @param {Intl.DateTimeFormatOptions} options - override default options
 * @returns {string}
 */
export function formatDate(dateString, options = {}) {
  if (!dateString) return '-'
  const date = new Date(dateString)
  const defaultOptions = {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }
  return date.toLocaleDateString('id-ID', { ...defaultOptions, ...options })
}

/**
 * Format relative time in Indonesian ("2 jam lalu", "3 hari lalu")
 * @param {string|Date} dateString
 * @returns {string}
 */
export function formatRelativeTime(dateString) {
  if (!dateString) return '-'
  const now = Date.now()
  const then = new Date(dateString).getTime()
  const diffMs = now - then

  const seconds = Math.floor(diffMs / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  const weeks = Math.floor(days / 7)
  const months = Math.floor(days / 30)

  if (seconds < 60) return 'Baru saja'
  if (minutes < 60) return `${minutes} menit lalu`
  if (hours < 24) return `${hours} jam lalu`
  if (days < 7) return `${days} hari lalu`
  if (weeks < 5) return `${weeks} minggu lalu`
  return `${months} bulan lalu`
}

/**
 * Calculate CTR (Click-Through Rate) percentage
 * @param {number} impressions
 * @param {number} clicks
 * @returns {string} e.g. "2.50%"
 */
export function calculateCTR(impressions, clicks) {
  if (impressions === 0) return '0%'
  return `${((clicks / impressions) * 100).toFixed(2)}%`
}
