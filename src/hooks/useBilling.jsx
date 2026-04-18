import { useState, useEffect, useCallback } from 'react'
import {
  getSubscription, upgradePlan, cancelSubscription, reactivateSubscription,
  getUsage, getInvoices, getPlanById,
} from '../services/billing'

export function useBilling() {
  const [subscription, setSubscription] = useState(null)
  const [currentPlan,  setCurrentPlan]  = useState(null)
  const [usage,        setUsage]        = useState(null)
  const [invoices,     setInvoices]     = useState([])
  const [loading,      setLoading]      = useState({ subscription: false, usage: false, invoices: false, upgrading: false })
  const [error,        setError]        = useState(null)

  const setLoad = (key, val) => setLoading(prev => ({ ...prev, [key]: val }))

  const fetchSubscription = useCallback(async () => {
    setLoad('subscription', true)
    const { data, error } = await getSubscription()
    if (!error && data) {
      setSubscription(data)
      setCurrentPlan(getPlanById(data.plan_id))
    }
    if (error) setError(error?.message)
    setLoad('subscription', false)
  }, [])

  const fetchUsage = useCallback(async () => {
    setLoad('usage', true)
    const { data, error } = await getUsage()
    if (!error) setUsage(data)
    setLoad('usage', false)
  }, [])

  const fetchInvoices = useCallback(async () => {
    setLoad('invoices', true)
    const { data, error } = await getInvoices()
    if (!error) setInvoices(data)
    setLoad('invoices', false)
  }, [])

  const handleUpgrade = useCallback(async (planId, billingCycle) => {
    setLoad('upgrading', true)
    const { data, error } = await upgradePlan(planId, billingCycle)
    if (!error && data) {
      setSubscription(data)
      setCurrentPlan(getPlanById(planId))
      fetchInvoices()
    }
    setLoad('upgrading', false)
    return { data, error }
  }, [fetchInvoices])

  const handleCancel = useCallback(async () => {
    const { error } = await cancelSubscription()
    if (!error) setSubscription(prev => ({ ...prev, cancel_at_period_end: true }))
    return { error }
  }, [])

  const handleReactivate = useCallback(async () => {
    const { error } = await reactivateSubscription()
    if (!error) setSubscription(prev => ({ ...prev, cancel_at_period_end: false }))
    return { error }
  }, [])

  const isFeatureAvailable = useCallback((featureKey) => {
    if (!currentPlan) return false
    return currentPlan.features?.[featureKey] !== false
  }, [currentPlan])

  const isAtLimit = useCallback((metric) => {
    if (!usage || !currentPlan) return false
    const usageData = usage[metric]
    if (!usageData) return false
    if (!usageData.limit) return false  // unlimited
    return usageData.used >= usageData.limit
  }, [usage, currentPlan])

  useEffect(() => {
    fetchSubscription()
    fetchUsage()
    fetchInvoices()
  }, []) // eslint-disable-line

  return {
    subscription, currentPlan, usage, invoices,
    loading, error,
    upgrade: handleUpgrade,
    cancel: handleCancel,
    reactivate: handleReactivate,
    isFeatureAvailable, isAtLimit,
    refresh: fetchSubscription,
  }
}
