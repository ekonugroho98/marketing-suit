import { useState, useEffect, useCallback } from 'react'
import {
  getTestimonials, getTestimonialOverview,
  createTestimonial, updateTestimonial, deleteTestimonial,
  approveTestimonial, rejectTestimonial, toggleFeatured, bulkApprove,
  getForms, createForm, updateForm, deleteForm,
  getWidgets, createWidget, updateWidget, deleteWidget,
} from '../services/testimonials'

export function useTestimonials() {
  const [testimonials, setTestimonials] = useState([])
  const [overview,     setOverview]     = useState(null)
  const [forms,        setForms]        = useState([])
  const [widgets,      setWidgets]      = useState([])
  const [loading,      setLoading]      = useState({ testimonials: false, overview: false, forms: false, widgets: false })
  const [error,        setError]        = useState(null)
  const [pagination,   setPagination]   = useState({ total: 0, page: 1, perPage: 20 })
  const [filters,      setFilters]      = useState({ status: '', source: '', rating: '', tag: '', search: '', featured: false })
  const [selected,     setSelected]     = useState([])

  const setLoad = (key, val) => setLoading(prev => ({ ...prev, [key]: val }))

  // ── Overview ──────────────────────────────────────────────
  const fetchOverview = useCallback(async () => {
    setLoad('overview', true)
    const { data, error } = await getTestimonialOverview()
    if (!error) setOverview(data)
    else setError(error?.message)
    setLoad('overview', false)
  }, [])

  // ── Testimonials ──────────────────────────────────────────
  const fetchTestimonials = useCallback(async (params = {}) => {
    setLoad('testimonials', true)
    const merged = { ...filters, ...params, page: params.page || pagination.page }
    const { data, total, page, perPage, error } = await getTestimonials(merged)
    if (!error) {
      setTestimonials(data)
      setPagination({ total, page, perPage })
    } else {
      setError(error?.message)
    }
    setLoad('testimonials', false)
  }, [filters, pagination.page])

  const handleCreate = useCallback(async (payload) => {
    const { data, error } = await createTestimonial(payload)
    if (!error) { setTestimonials(prev => [data, ...prev]); fetchOverview() }
    return { data, error }
  }, [fetchOverview])

  const handleUpdate = useCallback(async (id, updates) => {
    const { data, error } = await updateTestimonial(id, updates)
    if (!error) setTestimonials(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t))
    return { data, error }
  }, [])

  const handleApprove = useCallback(async (id) => {
    const { data, error } = await approveTestimonial(id)
    if (!error) {
      setTestimonials(prev => prev.map(t => t.id === id ? { ...t, status: 'approved', approved_at: new Date().toISOString() } : t))
      fetchOverview()
    }
    return { data, error }
  }, [fetchOverview])

  const handleReject = useCallback(async (id, reason) => {
    const { data, error } = await rejectTestimonial(id, reason)
    if (!error) {
      setTestimonials(prev => prev.map(t => t.id === id ? { ...t, status: 'rejected', reject_reason: reason } : t))
      fetchOverview()
    }
    return { data, error }
  }, [fetchOverview])

  const handleToggleFeatured = useCallback(async (id, current) => {
    const { data, error } = await toggleFeatured(id, !current)
    if (!error) setTestimonials(prev => prev.map(t => t.id === id ? { ...t, is_featured: !current } : t))
    return { data, error }
  }, [])

  const handleDelete = useCallback(async (id) => {
    const { error } = await deleteTestimonial(id)
    if (!error) { setTestimonials(prev => prev.filter(t => t.id !== id)); setSelected(prev => prev.filter(s => s !== id)); fetchOverview() }
    return { error }
  }, [fetchOverview])

  const handleBulkApprove = useCallback(async (ids) => {
    const { error } = await bulkApprove(ids)
    if (!error) {
      setTestimonials(prev => prev.map(t => ids.includes(t.id) ? { ...t, status: 'approved' } : t))
      setSelected([])
      fetchOverview()
    }
    return { error }
  }, [fetchOverview])

  // ── Forms ─────────────────────────────────────────────────
  const fetchForms = useCallback(async () => {
    setLoad('forms', true)
    const { data, error } = await getForms()
    if (!error) setForms(data)
    setLoad('forms', false)
  }, [])

  const handleCreateForm = useCallback(async (payload) => {
    const { data, error } = await createForm(payload)
    if (!error) setForms(prev => [data, ...prev])
    return { data, error }
  }, [])

  const handleUpdateForm = useCallback(async (id, updates) => {
    const { data, error } = await updateForm(id, updates)
    if (!error) setForms(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f))
    return { data, error }
  }, [])

  const handleDeleteForm = useCallback(async (id) => {
    const { error } = await deleteForm(id)
    if (!error) setForms(prev => prev.filter(f => f.id !== id))
    return { error }
  }, [])

  // ── Widgets ───────────────────────────────────────────────
  const fetchWidgets = useCallback(async () => {
    setLoad('widgets', true)
    const { data, error } = await getWidgets()
    if (!error) setWidgets(data)
    setLoad('widgets', false)
  }, [])

  const handleCreateWidget = useCallback(async (payload) => {
    const { data, error } = await createWidget(payload)
    if (!error) setWidgets(prev => [data, ...prev])
    return { data, error }
  }, [])

  const handleUpdateWidget = useCallback(async (id, updates) => {
    const { data, error } = await updateWidget(id, updates)
    if (!error) setWidgets(prev => prev.map(w => w.id === id ? { ...w, ...updates } : w))
    return { data, error }
  }, [])

  const handleDeleteWidget = useCallback(async (id) => {
    const { error } = await deleteWidget(id)
    if (!error) setWidgets(prev => prev.filter(w => w.id !== id))
    return { error }
  }, [])

  // ── Selection ─────────────────────────────────────────────
  const toggleSelect = useCallback((id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])
  }, [])

  const toggleSelectAll = useCallback(() => {
    setSelected(prev => prev.length === testimonials.length ? [] : testimonials.map(t => t.id))
  }, [testimonials])

  const applyFilters = useCallback((newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
    setPagination(prev => ({ ...prev, page: 1 }))
  }, [])

  // ── Initial Load ──────────────────────────────────────────
  useEffect(() => {
    fetchOverview()
    fetchTestimonials()
    fetchForms()
    fetchWidgets()
  }, []) // eslint-disable-line

  useEffect(() => { fetchTestimonials() }, [filters]) // eslint-disable-line

  return {
    // State
    testimonials, overview, forms, widgets,
    loading, error, pagination, filters, selected,
    // Testimonials
    fetchTestimonials,
    createTestimonial: handleCreate,
    updateTestimonial: handleUpdate,
    approveTestimonial: handleApprove,
    rejectTestimonial: handleReject,
    toggleFeatured: handleToggleFeatured,
    deleteTestimonial: handleDelete,
    bulkApprove: handleBulkApprove,
    // Forms
    fetchForms,
    createForm: handleCreateForm,
    updateForm: handleUpdateForm,
    deleteForm: handleDeleteForm,
    // Widgets
    fetchWidgets,
    createWidget: handleCreateWidget,
    updateWidget: handleUpdateWidget,
    deleteWidget: handleDeleteWidget,
    // UI helpers
    toggleSelect, toggleSelectAll, applyFilters,
  }
}
