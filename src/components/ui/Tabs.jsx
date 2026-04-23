export function Tabs({ tabs, activeTab, onChange, variant = 'pills', size = 'md', className = '' }) {
  if (variant === 'underline') {
    return (
      <div className={`flex gap-1 border-b border-white/10 overflow-x-auto pb-px ${className}`}>
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => onChange(tab.value)}
            className={`px-3 py-2 text-xs font-medium border-b-2 whitespace-nowrap transition-all flex items-center gap-1 ${
              activeTab === tab.value
                ? 'border-primary-500 text-primary-400'
                : 'border-transparent text-text-tertiary hover:text-text-secondary'
            }`}
          >
            {tab.icon && <span>{tab.icon}</span>}
            {tab.label}
          </button>
        ))}
      </div>
    )
  }

  // Default: pills variant with glass styling
  const sizeClasses = size === 'sm'
    ? 'px-3 py-1.5 text-xs'
    : 'px-4 py-2 text-sm'

  return (
    <div className={`flex gap-2 overflow-x-auto ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={`${sizeClasses} rounded-xl font-medium transition-all whitespace-nowrap flex items-center gap-1 ${
            activeTab === tab.value
              ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
              : 'bg-white/5 text-text-secondary border border-white/8 hover:bg-white/8 hover:text-text-primary'
          }`}
        >
          {tab.icon && <span>{tab.icon}</span>}
          {tab.label}
        </button>
      ))}
    </div>
  )
}

export function TabPanel({ children, isActive }) {
  if (!isActive) return null
  return <div>{children}</div>
}
