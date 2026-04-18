import LoadingSpinner from '../ui/LoadingSpinner'
import { PLATFORM_META } from '../../services/platforms'

export default function PublishProgress({ progressData, selectedAccounts, isThread, threadPartsCount, totalSelectedCount }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 space-y-6">
      <LoadingSpinner size="lg" />
      <p className="text-gray-700 font-semibold text-sm">
        {isThread ? `Publishing thread ${threadPartsCount} bagian ke Threads…` : `Publishing ke ${totalSelectedCount} akun…`}
      </p>

      {Object.entries(progressData).map(([accId, prog]) => {
        const acc = selectedAccounts.find(a => a.id === accId)
        if (!acc || !prog) return null
        const pct = Math.round((prog.current / prog.total) * 100)
        return (
          <div key={accId} className="w-full max-w-sm space-y-3">
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>{PLATFORM_META[acc.platform]?.icon} {acc.platform_username}</span>
              <span className={prog.status === 'failed' ? 'text-red-500 font-semibold' : 'text-emerald-600 font-semibold'}>
                {prog.status === 'failed'
                  ? `❌ Gagal di bagian ${prog.current}`
                  : prog.status === 'done'
                    ? `✅ ${prog.current}/${prog.total} selesai`
                    : `🔄 Mengirim ${prog.current}/${prog.total}…`}
              </span>
            </div>
            <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${prog.status === 'failed' ? 'bg-red-500' : 'bg-emerald-500'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="grid gap-1">
              {Array.from({ length: prog.total }, (_, i) => {
                const partNum = i + 1
                let icon = '⬜'
                let style = 'text-gray-400'
                if (partNum < prog.current || (partNum === prog.current && prog.status === 'done')) {
                  icon = '✅'
                  style = 'text-gray-500'
                } else if (partNum === prog.current && prog.status === 'publishing') {
                  icon = '🔄'
                  style = 'font-semibold text-gray-800'
                } else if (partNum === prog.current && prog.status === 'failed') {
                  icon = '❌'
                  style = 'font-semibold text-red-600'
                }
                return (
                  <div key={i} className={`text-xs flex items-center gap-1.5 ${style}`}>
                <span>{icon}</span>
                    <span>Bagian {partNum}/{prog.total}</span>
                {partNum === prog.current && prog.status === 'publishing' && (
                <span className="text-gray-400 ml-1">mengirim…</span>
                    )}
                    {partNum === prog.current && prog.status === 'done' && partNum < prog.total && (
                      <span className="text-gray-400 ml-1">tunggu 8 detik…</span>
                    )}
                  </div>
                )
              })}
            </div>
            {prog.error && <p className="text-xs text-red-500 mt-1">{prog.error}</p>}
          </div>
        )
      })}

      {Object.keys(progressData).length === 0 && (
        <p className="text-sm text-gray-400">Memulai proses…</p>
      )}
    </div>
  )
}
