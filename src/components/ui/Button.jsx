const variants = {
  primary: 'glass-btn-primary',
  secondary: 'glass-btn',
  danger: 'bg-danger-500/20 text-danger border border-danger-500/30 hover:bg-danger-500/30 hover:border-danger-500/50',
  ghost: 'text-text-secondary hover:text-text-primary hover:bg-white/5',
  accent: 'bg-success/20 text-success border border-success/30 hover:bg-success/30 hover:border-success/50',
}

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
}

export default function Button({ children, variant = 'primary', size = 'md', className = '', loading, disabled, ...props }) {
  return (
    <button
      className={`inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  )
}
