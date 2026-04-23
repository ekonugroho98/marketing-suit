import { useBrand } from '../../hooks/useBrand'
import { useOutletContext } from 'react-router-dom'

export default function TopBar({ title, subtitle, actions, onMenuToggle: onMenuToggleProp }) {
  const { brands, activeBrand, setActiveBrand } = useBrand()

  const outletContext = useOutletContext() || {}
  const onMenuToggle = onMenuToggleProp || outletContext.onMenuToggle

  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        {/* Hamburger menu button — visible only on mobile */}
        {onMenuToggle && (
          <button
            type="button"
            onClick={onMenuToggle}
            className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-xl text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors"
            aria-label="Buka menu navigasi"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
        )}

        <div>
          <h1 className="text-2xl font-bold text-text-primary">{title}</h1>
          {subtitle && <p className="text-sm text-text-tertiary mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {brands.length > 1 && (
          <select
            value={activeBrand?.id || ''}
            onChange={(e) => setActiveBrand(brands.find(b => b.id === e.target.value))}
            className="glass-input text-sm py-2 w-auto"
          >
            {brands.map(b => (
              <option key={b.id} value={b.id} className="bg-base-100 text-text-primary">{b.name}</option>
            ))}
          </select>
        )}
        {actions}
      </div>
    </div>
  )
}
