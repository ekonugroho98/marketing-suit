export default function AuthLayout({ children, title }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">KARAYA</h1>
          <p className="text-gray-500 mt-1">{title || 'Marketing Suite untuk Creator Indonesia'}</p>
        </div>
        {children}
      </div>
    </div>
  )
}
