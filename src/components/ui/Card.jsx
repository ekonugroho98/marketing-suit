export default function Card({ children, className = '', hover = false, ...props }) {
  return (
    <div
      className={`glass-card p-6 ${hover ? 'glass-card-hover cursor-pointer' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

export function KPICard({ title, value, subtitle, icon, color = 'primary', trend, trendValue }) {
  const accentColors = {
    primary: {
      bg: 'rgba(129, 140, 248, 0.1)',
      border: 'rgba(129, 140, 248, 0.2)',
      text: '#818cf8',
      glow: 'rgba(129, 140, 248, 0.15)',
    },
    accent: {
      bg: 'rgba(52, 211, 153, 0.1)',
      border: 'rgba(52, 211, 153, 0.2)',
      text: '#34d399',
      glow: 'rgba(52, 211, 153, 0.15)',
    },
    warning: {
      bg: 'rgba(251, 191, 36, 0.1)',
      border: 'rgba(251, 191, 36, 0.2)',
      text: '#fbbf24',
      glow: 'rgba(251, 191, 36, 0.15)',
    },
    danger: {
      bg: 'rgba(248, 113, 113, 0.1)',
      border: 'rgba(248, 113, 113, 0.2)',
      text: '#f87171',
      glow: 'rgba(248, 113, 113, 0.15)',
    },
    purple: {
      bg: 'rgba(167, 139, 250, 0.1)',
      border: 'rgba(167, 139, 250, 0.2)',
      text: '#a78bfa',
      glow: 'rgba(167, 139, 250, 0.15)',
    },
    cyan: {
      bg: 'rgba(34, 211, 238, 0.1)',
      border: 'rgba(34, 211, 238, 0.2)',
      text: '#22d3ee',
      glow: 'rgba(34, 211, 238, 0.15)',
    },
  }

  const colors = accentColors[color] || accentColors.primary

  return (
    <div
      className="glass-card glass-card-hover p-5 relative overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${colors.bg} 0%, rgba(255, 255, 255, 0.04) 100%)`,
        borderColor: colors.border,
      }}
    >
      {/* Subtle glow effect */}
      <div
        className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-30"
        style={{ background: colors.glow }}
      />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-text-secondary">{title}</span>
          {icon && <span className="text-xl opacity-80">{icon}</span>}
        </div>
        <p className="text-3xl font-bold text-text-primary">{value}</p>
        <div className="flex items-center gap-2 mt-2">
          {subtitle && <p className="text-sm text-text-tertiary">{subtitle}</p>}
          {trend && (
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                trend === 'up'
                  ? 'bg-success/10 text-success'
                  : 'bg-danger/10 text-danger'
              }`}
            >
              {trend === 'up' ? '↑' : '↓'} {trendValue}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export function GlassCard({ children, className = '', glow = false, glowColor = 'indigo' }) {
  const glowColors = {
    indigo: 'hover:shadow-glow-indigo',
    cyan: 'hover:shadow-glow-cyan',
    purple: 'hover:shadow-glow-purple',
  }

  return (
    <div
      className={`glass-card glass-card-hover p-6 ${glow ? glowColors[glowColor] || '' : ''} ${className}`}
    >
      {children}
    </div>
  )
}

export function BentoCard({ children, className = '', size = 'sm', hover = true }) {
  const sizeClasses = {
    sm: 'bento-item-sm',
    md: 'bento-item-md',
    lg: 'bento-item-lg',
    xl: 'bento-item-xl',
    full: 'bento-item-full',
  }

  return (
    <div className={`${sizeClasses[size]} ${className}`}>
      <div className={`glass-card h-full p-6 ${hover ? 'glass-card-hover' : ''}`}>
        {children}
      </div>
    </div>
  )
}
