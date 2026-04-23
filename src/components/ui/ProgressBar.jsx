const SIZE_CLASSES = {
  sm: 'h-1.5',
  md: 'h-2',
  lg: 'h-3',
}

const COLOR_CLASSES = {
  primary: 'from-primary-500 to-purple-500',
  blue: 'from-blue-500 to-cyan-500',
  yellow: 'from-yellow-500 to-orange-500',
  red: 'from-red-500 to-pink-500',
  purple: 'from-purple-500 to-pink-500',
  orange: 'from-orange-500 to-red-500',
  green: 'from-green-500 to-emerald-500',
  gray: 'from-gray-400 to-gray-500',
  cyan: 'from-cyan-500 to-blue-500',
}

export default function ProgressBar({ value, total, color = 'primary', size = 'md', showLabel = true }) {
  const percent = total > 0 ? (value / total) * 100 : 0
  const barHeight = SIZE_CLASSES[size] || SIZE_CLASSES.md
  const gradientClass = COLOR_CLASSES[color] || COLOR_CLASSES.primary

  return (
    <div className="flex items-center gap-2">
      <div className={`flex-1 bg-white/5 rounded-full overflow-hidden ${barHeight}`}>
        <div
          className={`bg-gradient-to-r ${gradientClass} ${barHeight} rounded-full transition-all duration-500`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-sm font-medium text-text-secondary w-12 text-right">
          {percent.toFixed(0)}%
        </span>
      )}
    </div>
  )
}
