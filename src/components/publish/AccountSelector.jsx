import { PLATFORM_META } from '../../services/platforms'

export default function AccountSelector({ accounts, selectedIds, onToggle, onSelectAll, onDeselectAll, platformGroups }) {
  if (accounts.length === 0) {
    return (
      <div className="text-center py-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
        <p className="text-gray-400 text-sm">Belum ada akun terhubung.</p>
        <p className="text-gray-400 text-xs mt-1">Hubungkan dulu di menu Akun Terhubung.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {Object.entries(platformGroups).map(([platform, platAccounts]) => (
        <div key={platform}>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            {PLATFORM_META[platform]?.icon} {PLATFORM_META[platform]?.name}
          </p>
          <div className="space-y-2">
            {platAccounts.map(acc => (
              <label key={acc.id}
                className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${
                  selectedIds.has(acc.id)
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(acc.id)}
                  onChange={() => onToggle(acc.id)}
                  className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-700 flex-shrink-0">
                    {acc.platform_username.replace('@', '').slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">{acc.platform_username}</p>
                </div>
                {selectedIds.has(acc.id) && (
                  <span className="text-emerald-600 text-xs font-semibold">✓ Dipilih</span>
                )}
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
