import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"

// Configuration Supabase via variables d'environnement
// ⚠️ IMPORTANT : Ne jamais hardcoder les clés dans le code source
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yxkbvhymsvasknslhpsa.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4a2J2aHltc3Zhc2tuc2xocHNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2NzI1MjQsImV4cCI6MjA3NzI0ODUyNH0.zbE1YiXZXDEgpLkRS9XDU8yt4n4EiQItU_YSoEQveTM'

// Client Supabase pour le côté serveur (Next.js Server Components et API Routes)
// Utilisé pour les opérations qui nécessitent l'accès aux cookies de session
export async function createClient() {
  const cookieStore = await cookies()
  
  return createSupabaseClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false, // Pas de persistance côté serveur
    },
  })
}

