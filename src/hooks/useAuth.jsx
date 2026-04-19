import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, isConfigured } from '../services/supabase'

const AuthContext = createContext(null)

const DEMO_USER = { id: 'demo-user', email: 'demo@karaya.id' }
const DEMO_PROFILE = { id: 'demo-user', full_name: 'Eko Nugroho', avatar_url: null, onboarding_completed: true, subscription_tier: 'creator' }

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isConfigured) {
      setLoading(false)
      return
    }

    // Listen for auth changes FIRST (catches OAuth redirects)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else {
        setProfile(null)
        setLoading(false)
      }
    })

    // Then check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setLoading(false)
    }).catch(() => setLoading(false))

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    setProfile(data)
    setLoading(false)
  }

  async function signInWithGoogle() {
    if (!isConfigured) {
      setUser(DEMO_USER)
      setProfile(DEMO_PROFILE)
      return
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) throw error
  }

  async function signInWithEmail(email, password) {
    if (!isConfigured) {
      setUser(DEMO_USER)
      setProfile({ ...DEMO_PROFILE, full_name: email.split('@')[0] })
      return
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function signUp(email, password, fullName) {
    if (!isConfigured) {
      setUser(DEMO_USER)
      setProfile({ ...DEMO_PROFILE, full_name: fullName, onboarding_completed: false })
      return
    }
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })
    if (error) throw error
  }

  async function signOut() {
    if (isConfigured) await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  async function updateProfile(updates) {
    if (!isConfigured) {
      const updated = { ...profile, ...updates }
      setProfile(updated)
      return updated
    }
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single()
    if (error) throw error
    setProfile(data)
    return data
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signInWithGoogle, signInWithEmail, signUp, signOut, updateProfile, fetchProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
