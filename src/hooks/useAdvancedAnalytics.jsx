import { useState, useEffect, useCallback } from 'react'
import {
  getAnalyticsOverview, getDailyMetrics, getPlatformBreakdown,
  getTopContent, getFunnelStats, getSourceAttribution,
  getGoals, createGoal, updateGoal, deleteGoal, exportAnalyticsCSV,
} from '../services/analytics-advanced'

export function useAdvancedAnalytics() {
  const [overview,      setOverview]      = useState(null)
  const [dailyMetrics,  setDailyMetrics]  = useState([])
  const [platforms,     setPlatforms]     = useState([])
  const [topContent,    setTopContent]    = useState([])
  const [funnelStats,   setFunnelStats]   = useState(null)
  const [attribution,   setAttribution]   = useState([])
  const [goals,         setGoals]         = useState([])
  const [loading,       setLoading]       = useState({ overview: false, daily: false, funnel: false, goals: false })
  const [error,         setError]         = useState(null)
  const [dateRange,     setDateRange]     = useState('30d')
  const [customDates,   setCustomDates]   = useState({ start: null, end: null })

  const setLoad = (key, val) => setLoading(prev => ({ ...prev, [key]: val }))

  // Compute actual date range
  const getDateBounds = useCallback(() => {
    if (dateRange === 'custom' && customDates.start && customDates.end) {
      return { start: customDates.start, end: customDates.end, days: Math.round((new Date(customDates.end) - new Date(customDates.start)) / 86400000) }
    }
    const days = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 }[dateRange] || 30
    const end = new Date().toISOString().split('T')[0]
    const start = new Date(Date.now() - days * 86400000).toISOString().split('T')[0]
    return { start, end, days }
  }, [dateRange, customDates])

  const fetchAll = useCallback(async () => {
    const { start, end, days } = getDateBounds()
    setLoad('overview', true)
    setLoad('daily', true)
    setLoad('funnel', true)

    const [
      { data: ov },
      { data: daily },
      { data: plat },
      { data: top },
      { data: funnel },
      { data: attr },
    ] = await Promise.all([
      getAnalyticsOverview(start, end),
      getDailyMetrics(days),
      getPlatformBreakdown(),
      getTopContent(10),
      getFunnelStats(days),
      getSourceAttribution(),
    ])

    if (ov)     setOverview(ov)
    if (daily)  setDailyMetrics(daily)
    if (plat)   setPlatforms(plat)
    if (top)    setTopContent(top)
    if (funnel) setFunnelStats(funnel)
    if (attr)   setAttribution(attr)

    setLoad('overview', false)
    setLoad('daily', false)
    setLoad('funnel', false)
  }, [getDateBounds])

  const fetchGoals = useCallback(async () => {
    setLoad('goals', true)
    const { data, error } = await getGoals()
    if (!error) setGoals(data)
    setLoad('goals', false)
  }, [])

  const handleCreateGoal = useCallback(async (payload) => {
    const { data, error } = await createGoal(payload)
    if (!error) setGoals(prev => [data, ...prev])
    return { data, error }
  }, [])

  const handleUpdateGoal = useCallback(async (id, updates) => {
    const { data, error } = await updateGoal(id, updates)
    if (!error) setGoals(prev => prev.map(g => g.id === id ? { ...g, ...updates } : g))
    return { data, error }
  }, [])

  const handleDeleteGoal = useCallback(async (id) => {
    const { error } = await deleteGoal(id)
    if (!error) setGoals(prev => prev.filter(g => g.id !== id))
    return { error }
  }, [])

  const handleExport = useCallback(async () => {
    await exportAnalyticsCSV(dailyMetrics, `analytics-${dateRange}-${Date.now()}.csv`)
  }, [dailyMetrics, dateRange])

  const changeDateRange = useCallback((range) => {
    setDateRange(range)
  }, [])

  useEffect(() => { fetchAll() }, [dateRange, customDates]) // eslint-disable-line
  useEffect(() => { fetchGoals() }, []) // eslint-disable-line

  return {
    // Data
    overview, dailyMetrics, platforms, topContent, funnelStats, attribution, goals,
    loading, error, dateRange, customDates,
    // Actions
    changeDateRange, setCustomDates,
    createGoal: handleCreateGoal,
    updateGoal: handleUpdateGoal,
    deleteGoal: handleDeleteGoal,
    exportCSV: handleExport,
    refresh: fetchAll,
    getDateBounds,
  }
}
