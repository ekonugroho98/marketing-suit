import { useState, useEffect, useCallback } from 'react'
import {
  getCampaigns,
  getCampaignById,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  pauseCampaign,
  resumeCampaign,
  createCreative,
  getInsights,
  getOverview,
  getSavedAudiences,
  saveAudience,
  deleteAudience,
  getAlerts,
  markAlertRead,
  searchCompetitorAds,
  saveCompetitorAd,
  getSavedCompetitorAds,
} from '../services/ads'
import { useBrand } from './useBrand'

export function useAds() {
  const { activeBrand } = useBrand()

  const [campaigns, setCampaigns] = useState([])
  const [activeCampaign, setActiveCampaign] = useState(null)
  const [overview, setOverview] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // --- Campaign functions ---

  const fetchCampaigns = useCallback(
    async (filters = {}) => {
      if (!activeBrand) return

      setLoading(true)
      setError(null)

      try {
        const data = await getCampaigns(filters)
        setCampaigns(data || [])
      } catch (err) {
        console.error('Error fetching campaigns:', err)
        setError(err.message || 'Failed to fetch campaigns')
        setCampaigns([])
      } finally {
        setLoading(false)
      }
    },
    [activeBrand]
  )

  const fetchCampaign = useCallback(
    async (id) => {
      setLoading(true)
      setError(null)

      try {
        const data = await getCampaignById(id)
        setActiveCampaign(data)
        return data
      } catch (err) {
        console.error('Error fetching campaign:', err)
        setError(err.message || 'Failed to fetch campaign')
        setActiveCampaign(null)
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const createNew = useCallback(
    async (data) => {
      if (!activeBrand) throw new Error('No active brand selected')

      setError(null)
      try {
        const newCampaign = await createCampaign({
          ...data,
          brand_id: activeBrand.id,
        })
        setCampaigns((prev) => [newCampaign, ...prev])
        return newCampaign
      } catch (err) {
        console.error('Error creating campaign:', err)
        setError(err.message || 'Failed to create campaign')
        throw err
      }
    },
    [activeBrand]
  )

  const update = useCallback(
    async (id, data) => {
      setError(null)
      try {
        const updated = await updateCampaign(id, data)
        setCampaigns((prev) => prev.map((c) => (c.id === id ? updated : c)))
        if (activeCampaign?.id === id) {
          setActiveCampaign(updated)
        }
        return updated
      } catch (err) {
        console.error('Error updating campaign:', err)
        setError(err.message || 'Failed to update campaign')
        throw err
      }
    },
    [activeCampaign]
  )

  const remove = useCallback(
    async (id) => {
      setError(null)
      try {
        await deleteCampaign(id)
        setCampaigns((prev) => prev.filter((c) => c.id !== id))
        if (activeCampaign?.id === id) {
          setActiveCampaign(null)
        }
      } catch (err) {
        console.error('Error deleting campaign:', err)
        setError(err.message || 'Failed to delete campaign')
        throw err
      }
    },
    [activeCampaign]
  )

  const pause = useCallback(async (id) => {
    setError(null)
    try {
      const updated = await pauseCampaign(id)
      setCampaigns((prev) => prev.map((c) => (c.id === id ? updated : c)))
      if (activeCampaign?.id === id) {
        setActiveCampaign(updated)
      }
      return updated
    } catch (err) {
      console.error('Error pausing campaign:', err)
      setError(err.message || 'Failed to pause campaign')
      throw err
    }
  }, [activeCampaign])

  const resume = useCallback(async (id) => {
    setError(null)
    try {
      const updated = await resumeCampaign(id)
      setCampaigns((prev) => prev.map((c) => (c.id === id ? updated : c)))
      if (activeCampaign?.id === id) {
        setActiveCampaign(updated)
      }
      return updated
    } catch (err) {
      console.error('Error resuming campaign:', err)
      setError(err.message || 'Failed to resume campaign')
      throw err
    }
  }, [activeCampaign])

  // --- Creative functions ---

  const addCreative = useCallback(
    async (data) => {
      if (!activeCampaign) throw new Error('No active campaign selected')

      setError(null)
      try {
        const newCreative = await createCreative({
          campaign_id: activeCampaign.id,
          ...data,
        })

        setActiveCampaign((prev) => ({
          ...prev,
          ad_creatives: [...(prev.ad_creatives || []), newCreative],
        }))
        return newCreative
      } catch (err) {
        console.error('Error adding creative:', err)
        setError(err.message || 'Failed to add creative')
        throw err
      }
    },
    [activeCampaign]
  )

  // --- Insights functions ---

  const fetchInsights = useCallback(
    async (campaignId, days = 30) => {
      setError(null)
      try {
        const data = await getInsights(campaignId, days)
        return data
      } catch (err) {
        console.error('Error fetching insights:', err)
        setError(err.message || 'Failed to fetch insights')
        throw err
      }
    },
    []
  )

  const fetchOverview = useCallback(async (days = 30) => {
    setError(null)
    try {
      const data = await getOverview(days)
      setOverview(data)
      return data
    } catch (err) {
      console.error('Error fetching overview:', err)
      setError(err.message || 'Failed to fetch overview')
    }
  }, [])

  // --- Audience functions ---

  const fetchAudiences = useCallback(async () => {
    setError(null)
    try {
      const data = await getSavedAudiences()
      return data
    } catch (err) {
      console.error('Error fetching audiences:', err)
      setError(err.message || 'Failed to fetch audiences')
      throw err
    }
  }, [])

  const saveNewAudience = useCallback(async (data) => {
    setError(null)
    try {
      const newAudience = await saveAudience(data)
      return newAudience
    } catch (err) {
      console.error('Error saving audience:', err)
      setError(err.message || 'Failed to save audience')
      throw err
    }
  }, [])

  const removeAudience = useCallback(async (id) => {
    setError(null)
    try {
      await deleteAudience(id)
    } catch (err) {
      console.error('Error deleting audience:', err)
      setError(err.message || 'Failed to delete audience')
      throw err
    }
  }, [])

  // --- Alert functions ---

  const fetchAlerts = useCallback(async () => {
    setError(null)
    try {
      const data = await getAlerts()
      setAlerts(data || [])
      return data
    } catch (err) {
      console.error('Error fetching alerts:', err)
      setError(err.message || 'Failed to fetch alerts')
      setAlerts([])
    }
  }, [])

  const readAlert = useCallback(async (id) => {
    setError(null)
    try {
      const updated = await markAlertRead(id)
      setAlerts((prev) => prev.map((a) => (a.id === id ? updated : a)))
      return updated
    } catch (err) {
      console.error('Error marking alert as read:', err)
      setError(err.message || 'Failed to mark alert as read')
      throw err
    }
  }, [])

  // --- Competitor analysis functions ---

  const searchCompetitors = useCallback(async (query) => {
    setError(null)
    try {
      const data = await searchCompetitorAds(query)
      return data
    } catch (err) {
      console.error('Error searching competitor ads:', err)
      setError(err.message || 'Failed to search competitor ads')
      throw err
    }
  }, [])

  const saveCompetitor = useCallback(async (data) => {
    setError(null)
    try {
      const newAd = await saveCompetitorAd(data)
      return newAd
    } catch (err) {
      console.error('Error saving competitor ad:', err)
      setError(err.message || 'Failed to save competitor ad')
      throw err
    }
  }, [])

  const fetchSavedCompetitors = useCallback(async () => {
    setError(null)
    try {
      const data = await getSavedCompetitorAds()
      return data
    } catch (err) {
      console.error('Error fetching saved competitor ads:', err)
      setError(err.message || 'Failed to fetch saved competitor ads')
      throw err
    }
  }, [])

  // --- Auto-fetch on mount and brand change ---

  useEffect(() => {
    fetchCampaigns()
    fetchAlerts()
    fetchOverview()
  }, [fetchCampaigns, fetchAlerts, fetchOverview])

  return {
    // State
    campaigns,
    activeCampaign,
    setActiveCampaign,
    overview,
    alerts,
    loading,
    error,

    // Campaign functions
    fetchCampaigns,
    fetchCampaign,
    createNew,
    update,
    remove,
    pause,
    resume,

    // Creative functions
    addCreative,

    // Insights functions
    fetchInsights,
    fetchOverview,

    // Audience functions
    fetchAudiences,
    saveNewAudience,
    removeAudience,

    // Alert functions
    fetchAlerts,
    readAlert,

    // Competitor analysis functions
    searchCompetitors,
    saveCompetitor,
    fetchSavedCompetitors,
  }
}
