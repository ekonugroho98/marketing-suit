import { useState, useEffect } from 'react'
import TopBar from '../../components/layout/TopBar'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import { useConnectedAccounts } from '../../hooks/useConnectedAccounts'
import { PLATFORM_META } from '../../services/platforms'
import { isConfigured } from '../../services/supabase'

function Toast({ result, onClose }) {
  if (!result) return null
  const styles = { demo: 'bg-blue-50 border-blue-300 text-blue-800', success: 'bg-green-50 border-green-300 text-green-800', error: 'bg-red-50 border-red-300 text-red-800' }
  const icons  = { demo: '🎭', success: '✅', error: '❌' }
  return (
    <div className={`fixed bottom-6 right-6 z-50 max-w-sm border rounded-xl shadow-lg p-4 ${styles[result.type]}`}>
      <div className="flex items-start gap-3">
        <span className="text-xl flex-shrink-0">{icons[result.type]}</span>
        <div className="flex-1">
          <p className="font-semibold text-sm capitalize">{result.platform}</p>
          <p className="text-sm mt-0.5">{result.message}</p>
        </div>
        <button onClick={onClose} className="opacity-60 hover:opacity-100 ml-1">✕</button>
      </div>
    </div>
  )
}

function AddAccountModal({ open, platform, onClose, onAdd }) {
  const meta = platform ? PLATFORM_META[platform] : null
  const [username, setUsername] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { if (open) setUsername('') }, [open])

  async function handleSubmit(e) {
    e.preventDefault()
    const val = username.trim()
    if (!val) return
    setSubmitting(true)
    await onAdd(platform, val.startsWith('@') ? val : `@${val}`)
    setSubmitting(false)
    onClose()
  }

  if (!meta) return null
  return (
    <Modal open={open} onClose={onClose} title={`Tambah Akun ${meta.name}`} size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0"
            style={{ background: meta.color ? `${meta.color}20` : '#f3f4f6' }}>
            {meta.icon}
          </div>
          <div>
            <p className="font-semibold text-gray-900">{meta.name}</p>
            {!isConfigured && <p className="text-xs text-blue-600">Demo Mode — simulasi OAuth</p>}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Username akun</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">@</span>
            <input
              autoFocus
              type="text"
              value={username.replace(/^@/, '')}
              onChange={e => setUsername(e.target.value)}
              placeholder="contoh: brand_saya"
              className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {isConfigured
              ? `Anda akan diarahkan ke halaman login resmi ${meta.name}.`
              : `Akun akan disimulasikan terhubung dalam Demo Mode.`}
          </p>
        </div>
        <div className="flex gap-3 pt-1">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose} disabled={submitting}>Batal</Button>
          <Button type="submit" variant="primary" className="flex-1" loading={submitting}>
            {isConfigured ? `Login ${meta.name}` : 'Tambahkan'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function DisconnectModal({ open, account, onClose, onConfirm, isLoading }) {
  if (!account) return null
  const meta = PLATFORM_META[account.platform]
  return (
    <Modal open={open} onClose={onClose} title="Putuskan Akun" size="sm">
      <div className="space-y-4">
        <div className="flex items-center gap-3 bg-red-50 rounded-xl p-3">
          <span className="text-2xl flex-shrink-0">{meta?.icon}</span>
          <div>
            <p className="font-semibold text-red-800">{account.platform_username}</p>
            <p className="text-sm text-red-600">{meta?.name}</p>
          </div>
        </div>
        <p className="text-sm text-gray-600">
          Akun ini tidak bisa digunakan untuk auto-publish sampai dihubungkan kembali.
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>Batal</Button>
          <Button variant="danger" onClick={onConfirm} loading={isLoading}>Ya, Putuskan</Button>
        </div>
      </div>
    </Modal>
  )
}

export default function ConnectedAccountsPage() {
  const {
    accounts, loading,
    connect, disconnect,
    getAccountsForPlatform, isConnected,
    connectResult, clearResult,
  } = useConnectedAccounts()

  const [addModal,        setAddModal]        = useState({ open: false, platform: null })
  const [disconnectModal, setDisconnectModal] = useState({ open: false, account: null })
  const [disconnecting,   setDisconnecting]   = useState(null)
  const [showDemoModal,   setShowDemoModal]   = useState(false)

  useEffect(() => {
    if (!isConfigured && !localStorage.getItem('karaya_oauth_demo_shown')) {
      setShowDemoModal(true)
      localStorage.setItem('karaya_oauth_demo_shown', '1')
    }
  }, [])

  if (loading) {
    return (
      <div>
        <TopBar title="Akun Terhubung" subtitle="Kelola akun media sosial untuk auto-publish konten" />
        <div className="flex items-center justify-center min-h-[50vh]">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    )
  }

  const platformKeys   = Object.keys(PLATFORM_META)
  const totalActive    = accounts.filter(a => a.status === 'active').length
  const connectedPlats = platformKeys.filter(p => isConnected(p)).length

  async function handleDisconnect() {
    if (!disconnectModal.account) return
    setDisconnecting(disconnectModal.account.id)
    await disconnect(disconnectModal.account.id)
    setDisconnecting(null)
    setDisconnectModal({ open: false, account: null })
  }

  return (
    <div>
      <TopBar title="Akun Terhubung" subtitle="Kelola akun media sosial untuk auto-publish konten" />

      {!isConfigured && (
        <div className="mb-6 flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-blue-700 text-sm">
          <span className="text-xl flex-shrink-0">🎭</span>
          <div>
            <span className="font-semibold">Demo Mode aktif.</span>{' '}
            Koneksi OAuth disimulasikan.{' '}
            <button className="underline hover:no-underline font-medium" onClick={() => setShowDemoModal(true)}>
              Pelajari lebih lanjut
            </button>
          </div>
        </div>
      )}

      <div className="mb-6 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-700 font-bold text-sm">
            {totalActive}
          </span>
          <span className="text-sm text-gray-600">
            akun aktif di {connectedPlats} dari {platformKeys.length} platform
          </span>
        </div>
        <div className="flex gap-1 flex-wrap">
          {platformKeys.filter(p => isConnected(p)).map(p => {
            const cnt = getAccountsForPlatform(p).length
            return (
              <span key={p}
                title={`${PLATFORM_META[p]?.name} — ${cnt} akun`}
                className="inline-flex items-center gap-1 bg-green-50 border border-green-200 rounded-full px-2 py-0.5 text-xs font-medium text-green-700">
                {PLATFORM_META[p]?.icon}{cnt > 1 ? ` ×${cnt}` : ''}
              </span>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {platformKeys.map((platformKey) => {
          const meta             = PLATFORM_META[platformKey]
          const platformAccounts = getAccountsForPlatform(platformKey)
          const connected        = platformAccounts.length > 0

          return (
            <Card
              key={platformKey}
              className={`flex flex-col transition-all duration-200 ${connected ? 'ring-2 ring-green-200 ring-offset-1' : ''}`}
            >
              <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-100">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl shadow-sm flex-shrink-0"
                  style={{ background: meta.color ? `${meta.color}18` : '#f3f4f6' }}>
                  {meta.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900">{meta.name}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {connected ? `${platformAccounts.length} akun terhubung` : 'Belum terhubung'}
                  </p>
                </div>
                {connected
                  ? <Badge color="green" className="shrink-0 text-xs">✓ Aktif</Badge>
                  : <Badge color="gray"  className="shrink-0 text-xs">Belum</Badge>}
              </div>

              <div className="flex-1 space-y-2 mb-4 min-h-[64px]">
                {connected ? (
                  platformAccounts.map(acc => (
                    <div key={acc.id}
                      className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-lg px-3 py-2 group">
                      <div className="w-7 h-7 rounded-full bg-green-200 flex items-center justify-center text-xs font-bold text-green-800 flex-shrink-0">
                        {acc.platform_username.replace('@', '').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-green-900 truncate">{acc.platform_username}</p>
                        {acc.account_label && <p className="text-xs text-green-600 truncate">{acc.account_label}</p>}
                      </div>
                      <button
                        onClick={() => setDisconnectModal({ open: true, account: acc })}
                        className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 text-xs font-bold transition-opacity flex-shrink-0 w-5 h-5 flex items-center justify-center rounded hover:bg-red-50"
                        title="Putuskan akun ini"
                      >✕</button>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center h-full py-5 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                    <span className="text-3xl opacity-20 mb-1">{meta.icon}</span>
                    <p className="text-xs text-gray-400">Belum ada akun</p>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-gray-100">
                <Button
                  variant={connected ? 'secondary' : 'primary'}
                  size="sm"
                  className="w-full"
                  onClick={() => setAddModal({ open: true, platform: platformKey })}
                >
                  {connected ? `+ Tambah Akun ${meta.name}` : `Hubungkan ${meta.name}`}
                </Button>
              </div>
            </Card>
          )
        })}
      </div>

      {isConfigured && accounts.length === 0 && (
        <div className="mt-8 bg-amber-50 border border-amber-200 rounded-xl p-5">
          <h4 className="font-semibold text-amber-800 mb-2">⚙️ Setup OAuth Diperlukan</h4>
          <p className="text-sm text-amber-700 mb-3">
            Deploy Edge Functions <code className="bg-amber-100 px-1 rounded">oauth-connect</code> & <code className="bg-amber-100 px-1 rounded">oauth-callback</code>, dan set environment variables untuk setiap platform.
          </p>
          <div className="text-xs text-amber-600 space-y-1">
            <p>• <code>META_APP_ID / META_APP_SECRET</code> — Instagram, Facebook, Threads</p>
            <p>• <code>TWITTER_CLIENT_ID / TWITTER_CLIENT_SECRET</code> — Twitter/X</p>
            <p>• <code>TIKTOK_CLIENT_KEY / TIKTOK_CLIENT_SECRET</code> — TikTok</p>
            <p>• <code>GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET</code> — YouTube</p>
            <p>• <code>LINKEDIN_CLIENT_ID / LINKEDIN_CLIENT_SECRET</code> — LinkedIn</p>
          </div>
        </div>
      )}

      <AddAccountModal
        open={addModal.open}
        platform={addModal.platform}
        onClose={() => setAddModal({ open: false, platform: null })}
        onAdd={connect}
      />

      <DisconnectModal
        open={disconnectModal.open}
        account={disconnectModal.account}
        onClose={() => setDisconnectModal({ open: false, account: null })}
        onConfirm={handleDisconnect}
        isLoading={disconnecting === disconnectModal.account?.id}
      />

      <Modal open={showDemoModal} onClose={() => setShowDemoModal(false)} title="🎭 Mode Demo — Multi-Akun Sosial Media" size="md">
        <div className="space-y-4 text-sm text-gray-600">
          <p>Supabase belum dikonfigurasi, sehingga OAuth berjalan dalam <strong>mode simulasi</strong>. Tidak ada redirect nyata ke platform.</p>
          <div className="bg-blue-50 rounded-xl p-4 space-y-2">
            <p className="font-semibold text-blue-800">Fitur Multi-Akun (sudah aktif di demo):</p>
            <ul className="space-y-1 text-blue-700">
              <li>✅ Tambah akun sebanyak apapun per platform</li>
              <li>✅ Threads bisa 3 akun sekaligus, Instagram 2 akun, dll</li>
              <li>✅ Saat publish, pilih spesifik akun mana yang dipakai</li>
              <li>✅ Setiap akun bisa posting konten yang berbeda</li>
              <li>✅ Data tersimpan di localStorage browser</li>
            </ul>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 space-y-1">
            <p className="font-semibold text-gray-700 mb-2">Untuk koneksi nyata:</p>
            <ol className="space-y-1 list-decimal list-inside">
              <li>Setup Supabase & konfigurasi .env</li>
              <li>Deploy Edge Functions oauth-connect & oauth-callback</li>
              <li>Daftarkan OAuth App di masing-masing platform</li>
            </ol>
          </div>
          <div className="flex justify-end">
            <Button variant="primary" size="md" onClick={() => setShowDemoModal(false)}>Mengerti, Lanjutkan</Button>
          </div>
        </div>
      </Modal>

      <Toast result={connectResult} onClose={clearResult} />
    </div>
  )
}
