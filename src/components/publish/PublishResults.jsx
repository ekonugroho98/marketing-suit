import Badge from '../ui/Badge'
import Button from '../ui/Button'
import { PLATFORM_META } from '../../services/platforms'

export default function PublishResults({ results, onClose, onRetry }) {
  return (
    <div className="space-y-4">
      <div className="text-center py-2">
        <p className="text-lg font-semibold text-gray-900">Publish Selesai ✅</p>
      </div>
      <div className="space-y-2">
        {results.map((r, i) => (
          <div key={i} className={`p-3 rounded-lg border flex items-center justify-between ${r.status === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div>
              <p className="font-medium text-sm text-gray-900">
                {PLATFORM_META[r.platform]?.icon} {PLATFORM_META[r.platform]?.name} — {r.username}
              </p>
              {r.status === 'success' && r.totalParts > 1 && (
                <p className="text-xs text-green-700 mt-0.5">🧵 Thread {r.totalParts} bagian berhasil diposting</p>
              )}
              {r.postUrl && (
                <a href={r.postUrl} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-emerald-600 underline mt-0.5 block">
                  Lihat post →
                </a>
              )}
              {r.error && <p className="text-xs text-red-600 mt-0.5">{r.error}</p>}
            </div>
            <Badge color={r.status === 'success' ? 'green' : 'red'}>
              {r.status === 'success' ? 'Published' : 'Gagal'}
            </Badge>
          </div>
        ))}
      </div>
      <Button onClick={onClose} variant="primary" className="w-full mt-4">Selesai</Button>
    </div>
  )
}
