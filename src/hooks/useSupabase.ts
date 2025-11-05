import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { getCurrentFlyAccount, checkRole } from '@/lib/utils-flynesis'
import type { User } from '@supabase/supabase-js'
import type { FlyAccount } from '@/lib/supabaseClient'

// Hook pour obtenir l'utilisateur actuel
export function useUser() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Obtenir l'utilisateur initial
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      setLoading(false)
    })

    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  return { user, loading }
}

// Hook pour obtenir le compte FlyID actuel
export function useFlyAccount() {
  const [account, setAccount] = useState<FlyAccount | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAccount() {
      const acc = await getCurrentFlyAccount()
      setAccount(acc)
      setLoading(false)
    }

    fetchAccount()
  }, [])

  return { account, loading }
}

// Hook pour vérifier le rôle
export function useRole(
  requiredRoles: Array<'user' | 'business' | 'garage' | 'support' | 'admin' | 'founder' | 'mechanic'>
) {
  const [authorized, setAuthorized] = useState(false)
  const [loading, setLoading] = useState(true)
  const [account, setAccount] = useState<FlyAccount | null>(null)
  const [error, setError] = useState<string | undefined>()

  useEffect(() => {
    async function check() {
      const result = await checkRole(requiredRoles)
      setAuthorized(result.authorized)
      setAccount(result.account)
      setError(result.error)
      setLoading(false)
    }

    check()
  }, [requiredRoles.join(',')])

  return { authorized, loading, account, error }
}

