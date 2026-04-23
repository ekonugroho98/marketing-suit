export default function AuthLayout({ children, title }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-base relative p-4">
      {/* Aurora Background */}
      <div className="aurora-bg">
        <div className="aurora-blob aurora-blob-1" />
        <div className="aurora-blob aurora-blob-2" />
        <div className="aurora-blob aurora-blob-3" />
        <div className="aurora-blob aurora-blob-4" />
      </div>

      {/* Noise texture overlay */}
      <div className="noise-overlay" />

      {/* Auth Card */}
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-text-primary">KARAYA</h1>
          <p className="text-text-tertiary mt-1">{title || 'Marketing Suite untuk Creator Indonesia'}</p>
        </div>

        {/* Glass card for auth content */}
        <div className="glass-card p-8">
          {children}
        </div>
      </div>
    </div>
  )
}
