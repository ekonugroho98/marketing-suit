import { useCallback, useEffect, useState } from 'react'
import { format, startOfWeek, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths } from 'date-fns'
import { id as localeID } from 'date-fns/locale'
import { DndContext, DragOverlay, useDraggable, useDroppable, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { supabase } from '../../services/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useBrand } from '../../hooks/useBrand'
import { useConnectedAccounts } from '../../hooks/useConnectedAccounts'
import TopBar from '../../components/layout/TopBar'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Modal from '../../components/ui/Modal'
import Input, { Textarea, Select } from '../../components/ui/Input'
import { PublishPreviewModal } from '../../components/publish/PublishPreviewModal'

const PLATFORMS = ['instagram', 'threads', 'tiktok', 'twitter', 'youtube', 'facebook']
const PILLARS = ['awareness', 'showcase', 'education', 'social_proof']
const TYPES = ['caption', 'carousel', 'thread', 'ad_copy', 'reels', 'story', 'video']
const STATUSES = ['draft', 'approved', 'scheduled', 'published', 'failed']

const pillarColors = { awareness: 'bg-blue-100 border-blue-300', showcase: 'bg-purple-100 border-purple-300', education: 'bg-green-100 border-green-300', social_proof: 'bg-yellow-100 border-yellow-300' }

function DraggableItem({ item, onClick }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: item.id, data: item })
  return (
    <button ref={setNodeRef} {...listeners} {...attributes} onClick={onClick}
      className={`w-full text-left p-2 rounded-lg border text-xs ${pillarColors[item.pillar] || 'bg-gray-50 border-gray-200'} hover:shadow-sm transition-all cursor-grab active:cursor-grabbing ${isDragging ? 'opacity-30' : ''}`}>
      <p className="font-medium truncate">{item.title}</p>
      <p className="text-gray-500 mt-0.5">{item.platform}</p>
    </button>
  )
}

function DroppableDay({ date, children }) {
  const dateStr = format(date, 'yyyy-MM-dd')
  const { isOver, setNodeRef } = useDroppable({ id: dateStr })
  return (
    <div ref={setNodeRef} className={`min-h-[200px] ${isOver ? 'bg-primary-50 rounded-lg' : ''} transition-colors`}>
      {children}
    </div>
  )
}

function DroppableDayMonth({ date, children, className }) {
  const dateStr = format(date, 'yyyy-MM-dd')
  const { isOver, setNodeRef } = useDroppable({ id: dateStr })
  return (
    <div ref={setNodeRef} className={`${className} ${isOver ? 'bg-primary-50 border-primary-400' : ''} transition-colors`}>
      {children}
    </div>
  )
}

export default function CalendarPage() {
  const { user } = useAuth()
  const { activeBrand } = useBrand()
  const { accounts } = useConnectedAccounts()
  const [view, setView] = useState('week')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [items, setItems] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState({ title: '', body: '', type: 'caption', platform: 'instagram', pillar: 'awareness', scheduled_date: '', scheduled_time: '09:00', status: 'draft' })
  const [draggedItem, setDraggedItem] = useState(null)
  const [publishItem, setPublishItem] = useState(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const loadItems = useCallback(async () => {
    if (!user || !activeBrand) return
    let start, end
    if (view === 'week') {
      start = startOfWeek(currentDate, { weekStartsOn: 1 })
      end = addDays(start, 6)
    } else {
      start = startOfMonth(currentDate)
      end = endOfMonth(currentDate)
    }
    const { data } = await supabase.from('content_calendar').select('*')
      .eq('user_id', user.id).eq('brand_id', activeBrand.id)
      .gte('scheduled_date', format(start, 'yyyy-MM-dd'))
      .lte('scheduled_date', format(end, 'yyyy-MM-dd'))
      .order('scheduled_date')
    setItems(data || [])
  }, [user, activeBrand, currentDate, view])

  useEffect(() => { loadItems() }, [loadItems])

  function openCreate(date) {
    setEditItem(null)
    setForm({ title: '', body: '', type: 'caption', platform: 'instagram', pillar: 'awareness', scheduled_date: format(date, 'yyyy-MM-dd'), scheduled_time: '09:00', status: 'draft' })
    setShowModal(true)
  }

  function openEdit(item) {
    setEditItem(item)
    setForm({ title: item.title, body: item.body || '', type: item.type, platform: item.platform, pillar: item.pillar || 'awareness', scheduled_date: item.scheduled_date || '', scheduled_time: item.scheduled_time || '09:00', status: item.status })
    setShowModal(true)
  }

  async function handleSave() {
    const payload = { ...form, user_id: user.id, brand_id: activeBrand.id }
    if (editItem) {
      await supabase.from('content_calendar').update(payload).eq('id', editItem.id)
    } else {
      await supabase.from('content_calendar').insert(payload)
    }
    setShowModal(false)
    loadItems()
  }

  async function handleDelete() {
    if (!editItem) return
    await supabase.from('content_calendar').delete().eq('id', editItem.id)
    setShowModal(false)
    loadItems()
  }

  async function handleDragEnd(event) {
    setDraggedItem(null)
    const { active, over } = event
    if (!over || !active) return
    const newDate = over.id
    const item = items.find(i => i.id === active.id)
    if (!item || item.scheduled_date === newDate) return
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, scheduled_date: newDate } : i))
    await supabase.from('content_calendar').update({ scheduled_date: newDate }).eq('id', item.id)
  }

  function handleDragStart(event) {
    setDraggedItem(items.find(i => i.id === event.active.id) || null)
  }

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const monthDays = eachDayOfInterval({ start: startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 }), end: addDays(endOfMonth(currentDate), 6 - endOfMonth(currentDate).getDay()) })

  const pillarStats = PILLARS.map(p => ({ pillar: p, count: items.filter(i => i.pillar === p).length }))
  const total = items.length || 1

  return (
    <div>
      <TopBar title="Content Calendar" subtitle={format(currentDate, 'MMMM yyyy', { locale: localeID })} actions={
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setCurrentDate(view === 'week' ? addDays(currentDate, -7) : subMonths(currentDate, 1))}>&#8592;</Button>
          <Button variant="secondary" size="sm" onClick={() => setCurrentDate(new Date())}>Hari ini</Button>
          <Button variant="secondary" size="sm" onClick={() => setCurrentDate(view === 'week' ? addDays(currentDate, 7) : addMonths(currentDate, 1))}>&#8594;</Button>
          <Button variant={view === 'week' ? 'primary' : 'secondary'} size="sm" onClick={() => setView('week')}>Minggu</Button>
          <Button variant={view === 'month' ? 'primary' : 'secondary'} size="sm" onClick={() => setView('month')}>Bulan</Button>
        </div>
      } />

      <div className="flex gap-1 mb-4 h-3 rounded-full overflow-hidden bg-gray-100">
        {pillarStats.map(p => (
          <div key={p.pillar} className={`${pillarColors[p.pillar]?.split(' ')[0]} transition-all`} style={{ width: `${(p.count / total) * 100}%` }} title={`${p.pillar}: ${p.count}`} />
        ))}
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        {view === 'week' ? (
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map(day => (
              <DroppableDay key={day.toISOString()} date={day}>
                <div className="text-sm font-medium text-gray-700 mb-2 text-center">
                  <div>{format(day, 'EEE', { locale: localeID })}</div>
                  <div className={`text-lg ${isSameDay(day, new Date()) ? 'text-primary-600 font-bold' : ''}`}>{format(day, 'd')}</div>
                </div>
                <div className="space-y-1">
                  {items.filter(i => i.scheduled_date === format(day, 'yyyy-MM-dd')).map(item => (
                    <DraggableItem key={item.id} item={item} onClick={() => openEdit(item)} />
                  ))}
                  <button onClick={() => openCreate(day)} className="w-full text-center text-xs text-gray-400 hover:text-primary-600 py-1">+ Tambah</button>
                </div>
              </DroppableDay>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map(d => (
              <div key={d} className="text-center text-xs font-medium text-gray-500 py-2">{d}</div>
            ))}
            {monthDays.map(day => (
              <DroppableDayMonth key={day.toISOString()} date={day} className={`min-h-[80px] p-1 border rounded ${isSameMonth(day, currentDate) ? 'bg-white' : 'bg-gray-50'} ${isSameDay(day, new Date()) ? 'border-primary-400' : 'border-gray-100'}`}>
                <div className="text-xs text-gray-400 mb-1">{format(day, 'd')}</div>
                {items.filter(i => i.scheduled_date === format(day, 'yyyy-MM-dd')).slice(0, 2).map(item => (
                  <DraggableItem key={item.id} item={item} onClick={() => openEdit(item)} />
                ))}
              </DroppableDayMonth>
            ))}
          </div>
        )}

        <DragOverlay>
          {draggedItem ? (
            <div className={`p-2 rounded-lg border text-xs shadow-lg ${pillarColors[draggedItem.pillar] || 'bg-gray-50 border-gray-200'}`}>
              <p className="font-medium">{draggedItem.title}</p>
              <p className="text-gray-500 mt-0.5">{draggedItem.platform}</p>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editItem ? 'Edit Konten' : 'Tambah Konten'} size="lg">
        <div className="space-y-4">
          <Input label="Judul" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
          <Textarea label="Body / Caption" value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} rows={4} />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Tipe" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} options={TYPES.map(t => ({ value: t, label: t }))} />
            <Select label="Platform" value={form.platform} onChange={e => setForm({ ...form, platform: e.target.value })} options={PLATFORMS.map(p => ({ value: p, label: p }))} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Select label="Pilar" value={form.pillar} onChange={e => setForm({ ...form, pillar: e.target.value })} options={PILLARS.map(p => ({ value: p, label: p.replace('_', ' ') }))} />
            <Input label="Tanggal" type="date" value={form.scheduled_date} onChange={e => setForm({ ...form, scheduled_date: e.target.value })} />
            <Input label="Jam" type="time" value={form.scheduled_time} onChange={e => setForm({ ...form, scheduled_time: e.target.value })} />
          </div>
          <Select label="Status" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} options={STATUSES.map(s => ({ value: s, label: s }))} />
          <div className="flex gap-3 pt-2">
            {editItem && <Button variant="danger" onClick={handleDelete}>Hapus</Button>}
            {editItem && accounts.length > 0 && (
              <Button variant="secondary" onClick={() => { setShowModal(false); setPublishItem(editItem) }}>
                📤 Publish
              </Button>
            )}
            <div className="flex-1" />
            <Button variant="secondary" onClick={() => setShowModal(false)}>Batal</Button>
            <Button onClick={handleSave}>Simpan</Button>
          </div>
        </div>
      </Modal>

      <PublishPreviewModal
        isOpen={!!publishItem}
        onClose={() => setPublishItem(null)}
        content={publishItem}
        onPublish={async (params) => {
          setPublishItem(null)
          loadItems()
        }}
      />
    </div>
  )
}
