"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    try {
      
      // Nettoyer le localStorage et sessionStorage avant la déconnexion
      if (typeof window !== 'undefined') {
        localStorage.clear()
        sessionStorage.clear()
      }
      
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error("[useAuth] Erreur lors de la déconnexion:", error)
        throw error
      }
      
      
      // Forcer le refresh et la redirection
      router.push("/login")
      router.refresh()
      
      // S'assurer que la session est bien supprimée avec un délai
      setTimeout(() => {
        // Nettoyer à nouveau au cas où
        if (typeof window !== 'undefined') {
          localStorage.clear()
          sessionStorage.clear()
        }
        window.location.href = "/login"
      }, 100)
    } catch (error) {
      console.error("[useAuth] Erreur lors de la déconnexion:", error)
      // Nettoyer quand même
      if (typeof window !== 'undefined') {
        localStorage.clear()
        sessionStorage.clear()
      }
      // Même en cas d'erreur, rediriger vers login
      router.push("/login")
      router.refresh()
      window.location.href = "/login"
    }
  }

  return { user, loading, signOut }
}

