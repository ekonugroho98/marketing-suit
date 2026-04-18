/**
 * Tabs & TabPanel | Karaya Marketing Suite
 * Reusable tab components extracted from:
 * - CaptionGenerator.jsx (pill-style tabs)
 * - PublishPreviewModal.jsx (underline-style tabs)
 * Supports two variants:
 * - "pills" (default): rounded background tabs (like CaptionGenerator)
 * - "underline": border-bottom tabs (like PublishPreviewModal)
 */

/**
 * @param {Object} props
 * @param {Array<{ label: string, value: string|number, icon?: string }>} props.tabs
 * @param {string|number} props.activeTab - currently active tab value
 * @param {(value: string|number) => void} props.onChange
 * @param {"pills"|"underline"} [props.variant="pills"]
 * @param {"sm"|"md"} [props.size="md"]
 * @param {string} [props.className]
 */
export function Tabs({ tabs, activeTab, onChange, variant = 'pills', size = 'md', className = '' }) {
  if (variant === 'underline') {
    return (
      <div className={`flex gap-1 border-b border-gray-200 overflow-x-auto pb-px ${className}`}>
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => onChange(tab.value)}
            className={`px-3 py-2 text-xs font-medium border-b-2 whitespace-nowrap transition-colors flex items-center gap-1 ${
              activeTab === tab.value
                ? 'border-emerald-500 text-emerald-700'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {tab.icon && <span>{tab.icon}</span>}
            {tab.label}
          </button>
        ))}
      </div>
    )
  }

  // Default: pills variant
  const sizeClasses = size === 'sm'
    ? 'px-3 py-1.5 text-xs'
    : 'px-4 py-2 text-sm'

  return (
    <div className={`flex gap-2 overflow-x-auto ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={`${sizeClasses} rounded-lg font-medium transition-colors whitespace-nowrap flex items-center gap-1 ${
            activeTab === tab.value
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {tab.icon && <span>{tab.icon}</span>}
          {tab.label}
        </button>
      ))}
    </div>
  )
}

/**
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @param {boolean} props.isActive
 */
export function TabPanel({ children, isActive }) {
  if (!isActive) return null
  return <div>{children}</div>
}
