import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, isConfigured } from '../../services/supabase'
import { PageLoader } from '../../components/ui/LoadingSpinner'

export default function AuthCallbackPage() {
  const navigate = useNavigate()

  useEffect(() => {
    if (!isConfigured) {
      navigate('/dashboard', { replace: true })
      return
    }

    // Supabase automatically detects tokens in the URL hash
    // We just need to wait for the session to be established
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Auth callback error:', error)
        navigate('/login', { replace: true })
      } else if (session) {
        navigate('/dashboard', { replace: true })
      } else {
        navigate('/login', { replace: true })
      }
    })
  }, [navigate])

  return <PageLoader />
}
