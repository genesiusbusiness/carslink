import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"

// Configuration Supabase directement dans le code (identique à supabaseClient.ts)
const supabaseUrl = 'https://yxkbvhymsvasknslhpsa.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4a2J2aHltc3Zhc2tuc2xocHNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2NzI1MjQsImV4cCI6MjA3NzI0ODUyNH0.zbE1YiXZXDEgpLkRS9XDU8yt4n4EiQItU_YSoEQveTM'

// Client Supabase pour le côté serveur (Next.js Server Components et API Routes)
// Utilisé pour les opérations qui nécessitent l'accès aux cookies de session
export async function createClient() {
  const cookieStore = await cookies()
  
  return createSupabaseClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false, // Pas de persistance côté serveur
      autoRefreshToken: false,
      detectSessionInUrl: false,
      // @ts-ignore - getSession n'est pas dans les types mais fonctionne en runtime
      getSession: async () => {
        const accessToken = cookieStore.get('sb-access-token')?.value
        const refreshToken = cookieStore.get('sb-refresh-token')?.value
        
        if (!accessToken || !refreshToken) {
          return { data: { session: null }, error: null }
        }

        // Utiliser le client pour obtenir la session
        const tempClient = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        })
        const { data, error } = await tempClient.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
        return { data, error }
      },
    },
  })
}

