import { useCallback, useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../services/supabase'
import { useAuth } from '../../hooks/useAuth'
import { generateSlug, buildUTMUrl } from '../../utils/utm'
import TopBar from '../../components/layout/TopBar'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Modal from '../../components/ui/Modal'
import Input from '../../components/ui/Input'
import EmptyState from '../../components/ui/EmptyState'
import QRCode from 'qrcode'

function QRDisplay({ url }) {
  const canvasRef = useRef(null)
  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, url, { width: 200, margin: 2 })
    }
  }, [url])

  function handleDownload() {
    if (!canvasRef.current) return
    const link = document.createElement('a')
    link.download = 'qr-code.png'
    link.href = canvasRef.current.toDataURL()
    link.click()
  }

  return (
    <div className="text-center">
      <div className="bg-gray-100 rounded-lg p-8 mb-4 flex items-center justify-center">
        <canvas ref={canvasRef} />
      </div>
      <p className="text-sm text-gray-500 mb-3">Scan QR code untuk membuka link</p>
      <div className="flex gap-2 justify-center">
        <Button variant="secondary" size="sm" onClick={() => navigator.clipboard.writeText(url)}>Copy Link</Button>
        <Button variant="secondary" size="sm" onClick={handleDownload}>Download QR</Button>
      </div>
    </div>
  )
}

export default function LinksPage() {
  const { user } = useAuth()
  const [links, setLinks] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showQR, setShowQR] = useState(null)
  const [form, setForm] = useState({ title: '', destination_url: '', utm_source: '', utm_medium: '', utm_campaign: '' })

  const loadLinks = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data } = await supabase.from('smart_links').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    setLinks(data || [])
    setLoading(false)
  }, [user])

  useEffect(() => { loadLinks() }, [loadLinks])

  async function handleCreate() {
    const slug = generateSlug()
    let destination = form.destination_url
    if (form.utm_source || form.utm_medium || form.utm_campaign) {
      destination = buildUTMUrl(form.destination_url, { source: form.utm_source, medium: form.utm_medium, campaign: form.utm_campaign })
    }
    await supabase.from('smart_links').insert({
      user_id: user.id, slug, title: form.title || slug, destination_url: destination,
      utm_source: form.utm_source, utm_medium: form.utm_medium, utm_campaign: form.utm_campaign,
    })
    setShowModal(false)
    setForm({ title: '', destination_url: '', utm_source: '', utm_medium: '', utm_campaign: '' })
    loadLinks()
  }

  function getShortUrl(slug) {
    return `${window.location.origin}/r/${slug}`
  }

  return (
    <div>
      <TopBar title="Smart Links" subtitle="Short link + UTM tracking" actions={
        <Button onClick={() => setShowModal(true)}>+ Buat Link</Button>
      } />

      {links.length === 0 && !loading ? (
        <EmptyState icon="🔗" title="Belum ada smart link" description="Buat short link pertama untuk tracking campaign" actionLabel="Buat Link" onAction={() => setShowModal(true)} />
      ) : (
        <div className="space-y-3">
          {links.map(link => (
            <Card key={link.id} className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="font-medium">{link.title || link.slug}</p>
                <p className="text-sm text-primary-600 truncate">{getShortUrl(link.slug)}</p>
                <p className="text-xs text-gray-400 truncate mt-0.5">{link.destination_url}</p>
              </div>
              <div className="flex items-center gap-4 ml-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{link.click_count || 0}</p>
                  <p className="text-xs text-gray-400">Clicks</p>
                </div>
                <div className="flex gap-1">
                  <Link to={`/links/${link.id}`}><Button size="sm" variant="ghost">Stats</Button></Link>
                  <Button size="sm" variant="ghost" onClick={() => navigator.clipboard.writeText(getShortUrl(link.slug))}>Copy</Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowQR(link)}>QR</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Buat Smart Link">
        <div className="space-y-4">
          <Input label="Judul (opsional)" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Promo Ebook Launch" />
          <Input label="URL Tujuan" value={form.destination_url} onChange={e => setForm({ ...form, destination_url: e.target.value })} placeholder="https://lynk.id/eko/ebook-copywriting" required />
          <div className="border-t pt-4">
            <p className="text-sm font-medium text-gray-700 mb-3">UTM Parameters (auto-generate)</p>
            <div className="grid grid-cols-3 gap-3">
              <Input label="Source" value={form.utm_source} onChange={e => setForm({ ...form, utm_source: e.target.value })} placeholder="instagram" />
              <Input label="Medium" value={form.utm_medium} onChange={e => setForm({ ...form, utm_medium: e.target.value })} placeholder="bio_link" />
              <Input label="Campaign" value={form.utm_campaign} onChange={e => setForm({ ...form, utm_campaign: e.target.value })} placeholder="ebook_launch" />
            </div>
          </div>
          <Button className="w-full" onClick={handleCreate}>Buat Link</Button>
        </div>
      </Modal>

      <Modal open={!!showQR} onClose={() => setShowQR(null)} title="QR Code" size="sm">
        {showQR && <QRDisplay url={getShortUrl(showQR.slug)} />}
      </Modal>
    </div>
  )
}
