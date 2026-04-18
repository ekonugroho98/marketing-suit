import { useState, useEffect, useCallback } from 'react'
import {
  getCRMOverview, getLeads, getLead, createLead, updateLead, deleteLead,
  bulkUpdateLeads, importLeads, getLeadActivities, addActivity,
  getSegments, createSegment, updateSegment, deleteSegment, filterLeadsBySegment,
  getSequences, createSequence, updateSequence, deleteSequence, enrollLeadInSequence,
} from '../services/crm'

export function useCRM() {
  const [leads,       setLeads]       = useState([])
  const [overview,    setOverview]    = useState(null)
  const [activeLead,  setActiveLead]  = useState(null)
  const [activities,  setActivities]  = useState([])
  const [segments,    setSegments]    = useState([])
  const [sequences,   setSequences]   = useState([])
  const [loading,     setLoading]     = useState({ leads: false, overview: false, detail: false, activities: false, segments: false, sequences: false })
  const [error,       setError]       = useState(null)
  const [pagination,  setPagination]  = useState({ total: 0, page: 1, perPage: 20 })
  const [filters,     setFilters]     = useState({ status: '', source: '', tag: '', search: '' })
  const [selected,    setSelected]    = useState([])

  const setLoad = (key, val) => setLoading(prev => ({ ...prev, [key]: val }))

  // ── Overview ──────────────────────────────────────────────
  const fetchOverview = useCallback(async () => {
    setLoad('overview', true)
    const { data, error } = await getCRMOverview()
    if (!error) setOverview(data)
    else setError(error.message)
    setLoad('overview', false)
  }, [])

  // ── Leads ─────────────────────────────────────────────────
  const fetchLeads = useCallback(async (params = {}) => {
    setLoad('leads', true)
    const merged = { ...filters, ...params, page: params.page || pagination.page }
    const { data, total, page, perPage, error } = await getLeads(merged)
    if (!error) {
      setLeads(data)
      setPagination({ total, page, perPage })
    } else {
      setError(error.message)
    }
    setLoad('leads', false)
  }, [filters, pagination.page])

  const handleCreateLead = useCallback(async (payload) => {
    const { data, error } = await createLead(payload)
    if (!error) {
      setLeads(prev => [data, ...prev])
      fetchOverview()
    }
    return { data, error }
  }, [fetchOverview])

  const handleUpdateLead = useCallback(async (id, updates) => {
    const { data, error } = await updateLead(id, updates)
    if (!error) {
      setLeads(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l))
      if (activeLead?.id === id) setActiveLead(prev => ({ ...prev, ...updates }))
      fetchOverview()
    }
    return { data, error }
  }, [activeLead, fetchOverview])

  const handleDeleteLead = useCallback(async (id) => {
    const { error } = await deleteLead(id)
    if (!error) {
      setLeads(prev => prev.filter(l => l.id !== id))
      setSelected(prev => prev.filter(s => s !== id))
      fetchOverview()
    }
    return { error }
  }, [fetchOverview])

  const handleBulkUpdate = useCallback(async (ids, updates) => {
    const { error } = await bulkUpdateLeads(ids, updates)
    if (!error) {
      setLeads(prev => prev.map(l => ids.includes(l.id) ? { ...l, ...updates } : l))
      setSelected([])
      fetchOverview()
    }
    return { error }
  }, [fetchOverview])

  const handleImport = useCallback(async (rows) => {
    const { imported, error } = await importLeads(rows)
    if (!error) {
      fetchLeads()
      fetchOverview()
    }
    return { imported, error }
  }, [fetchLeads, fetchOverview])

  // ── Lead Detail ───────────────────────────────────────────
  const fetchLeadDetail = useCallback(async (id) => {
    setLoad('detail', true)
    setLoad('activities', true)
    const [{ data: lead, error: le }, { data: acts, error: ae }] = await Promise.all([
      getLead(id),
      getLeadActivities(id),
    ])
    if (!le) setActiveLead(lead)
    if (!ae) setActivities(acts)
    if (le) setError(le.message)
    setLoad('detail', false)
    setLoad('activities', false)
  }, [])

  const handleAddActivity = useCallback(async (leadId, payload) => {
    const { data, error } = await addActivity(leadId, payload)
    if (!error) setActivities(prev => [data, ...prev])
    return { data, error }
  }, [])

  // ── Segments ──────────────────────────────────────────────
  const fetchSegments = useCallback(async () => {
    setLoad('segments', true)
    const { data, error } = await getSegments()
    if (!error) setSegments(data)
    setLoad('segments', false)
  }, [])

  const handleCreateSegment = useCallback(async (payload) => {
    const { data, error } = await createSegment(payload)
    if (!error) setSegments(prev => [data, ...prev])
    return { data, error }
  }, [])

  const handleUpdateSegment = useCallback(async (id, updates) => {
    const { data, error } = await updateSegment(id, updates)
    if (!error) setSegments(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s))
    return { data, error }
  }, [])

  const handleDeleteSegment = useCallback(async (id) => {
    const { error } = await deleteSegment(id)
    if (!error) setSegments(prev => prev.filter(s => s.id !== id))
    return { error }
  }, [])

  const previewSegment = useCallback((segment) => {
    return filterLeadsBySegment(leads, segment)
  }, [leads])

  // ── Sequences ─────────────────────────────────────────────
  const fetchSequences = useCallback(async () => {
    setLoad('sequences', true)
    const { data, error } = await getSequences()
    if (!error) setSequences(data)
    setLoad('sequences', false)
  }, [])

  const handleCreateSequence = useCallback(async (payload) => {
    const { data, error } = await createSequence(payload)
    if (!error) setSequences(prev => [data, ...prev])
    return { data, error }
  }, [])

  const handleUpdateSequence = useCallback(async (id, updates) => {
    const { data, error } = await updateSequence(id, updates)
    if (!error) setSequences(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s))
    return { data, error }
  }, [])

  const handleDeleteSequence = useCallback(async (id) => {
    const { error } = await deleteSequence(id)
    if (!error) setSequences(prev => prev.filter(s => s.id !== id))
    return { error }
  }, [])

  const handleEnrollInSequence = useCallback(async (sequenceId, leadId) => {
    const { error } = await enrollLeadInSequence(sequenceId, leadId)
    if (!error) setSequences(prev => prev.map(s => s.id === sequenceId ? { ...s, total_enrolled: (s.total_enrolled || 0) + 1 } : s))
    return { error }
  }, [])

  // ── Selection ─────────────────────────────────────────────
  const toggleSelect = useCallback((id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])
  }, [])

  const toggleSelectAll = useCallback(() => {
    setSelected(prev => prev.length === leads.length ? [] : leads.map(l => l.id))
  }, [leads])

  const applyFilters = useCallback((newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
    setPagination(prev => ({ ...prev, page: 1 }))
  }, [])

  // ── Initial Load ──────────────────────────────────────────
  useEffect(() => {
    fetchOverview()
    fetchLeads()
    fetchSegments()
    fetchSequences()
  }, []) // eslint-disable-line

  useEffect(() => {
    fetchLeads()
  }, [filters]) // eslint-disable-line

  return {
    // State
    leads, overview, activeLead, activities, segments, sequences,
    loading, error, pagination, filters, selected,
    // Leads
    fetchLeads, fetchLeadDetail,
    createLead: handleCreateLead,
    updateLead: handleUpdateLead,
    deleteLead: handleDeleteLead,
    bulkUpdate: handleBulkUpdate,
    importLeads: handleImport,
    // Activities
    addActivity: handleAddActivity,
    // Segments
    fetchSegments,
    createSegment: handleCreateSegment,
    updateSegment: handleUpdateSegment,
    deleteSegment: handleDeleteSegment,
    previewSegment,
    // Sequences
    fetchSequences,
    createSequence: handleCreateSequence,
    updateSequence: handleUpdateSequence,
    deleteSequence: handleDeleteSequence,
    enrollInSequence: handleEnrollInSequence,
    // Selection & filters
    toggleSelect, toggleSelectAll, applyFilters,
    setActiveLead,
  }
}
