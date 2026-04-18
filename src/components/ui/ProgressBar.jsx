/**
 * ProgressBar | Karaya Marketing Suite
 * Shared progress bar component extracted from:
 * - SimpleProgressBar in AdsDashboard.jsx
 * - SimpleBarChart in ABTestDashboard.jsx
 */

const SIZE_CLASSES = {
  sm: 'h-1.5',
  md: 'h-2',
  lg: 'h-3',
}

const COLOR_CLASSES = {
  primary: 'bg-emerald-500',
  blue: 'bg-blue-500',
  yellow: 'bg-yellow-500',
  red: 'bg-red-500',
  purple: 'bg-purple-500',
  orange: 'bg-orange-500',
  green: 'bg-green-500',
  gray: 'bg-gray-500',
}

export default function ProgressBar({ value, total, color = 'primary', size = 'md', showLabel = true }) {
  const percent = total > 0 ? (value / total) * 100 : 0
  const barHeight = SIZE_CLASSES[size] || SIZE_CLASSES.md
  const barColor = COLOR_CLASSES[color] || COLOR_CLASSES.primary

  return (
    <div className="flex items-center gap-2">
      <div className={`flex-1 bg-gray-200 rounded-full ${barHeight}`}>
        <div
          className={`${barColor} ${barHeight} rounded-full transition-all`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-sm font-medium text-gray-900 w-12 text-right">
          {percent.toFixed(0)}%
        </span>
      )}
    </div>
  )
}
