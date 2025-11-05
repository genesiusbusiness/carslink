import { NextRequest, NextResponse } from "next/server"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"

// Configuration Supabase directement dans le code
const supabaseUrl = 'https://yxkbvhymsvasknslhpsa.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4a2J2aHltc3Zhc2tuc2xocHNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2NzI1MjQsImV4cCI6MjA3NzI0ODUyNH0.zbE1YiXZXDEgpLkRS9XDU8yt4n4EiQItU_YSoEQveTM'

export async function POST(request: NextRequest) {
  try {
    // Récupérer le token d'authentification depuis le header Authorization
    const authHeader = request.headers.get("authorization")
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const accessToken = authHeader.replace("Bearer ", "")
    
    // Créer un client Supabase avec le token
    const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })

    // Vérifier l'authentification
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const body = await request.json()
    const { subject, message, category = "other" } = body || {}

    if (!subject || !message) {
      return NextResponse.json({ error: "Le sujet et le message sont requis" }, { status: 400 })
    }

    // Récupérer le fly_account_id de l'utilisateur
    const { data: flyAccount, error: flyAccountError } = await supabase
      .from("fly_accounts")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle()

    if (flyAccountError) {
      console.error("Error fetching fly_account:", flyAccountError)
      return NextResponse.json({ error: "Erreur lors de la récupération du compte" }, { status: 500 })
    }

    if (!flyAccount) {
      return NextResponse.json({ error: "Compte utilisateur non trouvé" }, { status: 404 })
    }

    // Créer le ticket dans la table carslink_tickets (utilisée par CarsLinkSupport)
    // Structure: title, description, priority, category, author_id
    const { data: ticket, error: ticketError } = await supabase
      .from("carslink_tickets")
      .insert([
        {
          author_id: flyAccount.id,
          title: subject,
          description: message,
          category: category || "general",
          priority: "medium",
        },
      ])
      .select("*")
      .single()

    if (ticketError) {
      console.error("Error creating ticket:", ticketError)
      return NextResponse.json({ error: ticketError.message || "Erreur lors de la création du ticket" }, { status: 500 })
    }

    return NextResponse.json({ ticket }, { status: 201 })
  } catch (error: any) {
    console.error("POST /api/support/tickets error:", error)
    return NextResponse.json({ error: error.message || "Erreur serveur" }, { status: 500 })
  }
}

