export default function Card({ children, className = '', ...props }) {
  return (
    <div className={`card ${className}`} {...props}>
      {children}
    </div>
  )
}

export function KPICard({ title, value, subtitle, icon, color = 'primary' }) {
  const bgColors = {
    primary: 'bg-primary-50 border-primary-200',
    accent: 'bg-accent-50 border-accent-200',
    warning: 'bg-warning-50 border-warning-200',
    danger: 'bg-danger-50 border-danger-200',
    purple: 'bg-purple-50 border-purple-200',
  }

  return (
    <div className={`rounded-xl border p-5 ${bgColors[color] || bgColors.primary}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-600">{title}</span>
        {icon && <span className="text-lg">{icon}</span>}
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
    </div>
  )
}
