/**
 * Route API pour le géocodage via OpenCage
 * Récupère la clé API depuis la base de données et géocode une adresse
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Configuration Supabase via variables d'environnement
// ⚠️ IMPORTANT : Ne jamais hardcoder les clés dans le code source
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yxkbvhymsvasknslhpsa.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4a2J2aHltc3Zhc2tuc2xocHNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2NzI1MjQsImV4cCI6MjA3NzI0ODUyNH0.zbE1YiXZXDEgpLkRS9XDU8yt4n4EiQItU_YSoEQveTM'

if (!supabaseAnonKey) {
  throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is not set in environment variables')
}

// Client pour les appels serveur
// Utilise l'anon key - get_app_setting est SECURITY DEFINER donc ça fonctionne
const supabaseServer = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

interface OpenCageResponse {
  results: Array<{
    geometry: {
      lat: number
      lng: number
    }
  }>
  status?: {
    code: number
    message: string
  }
}

async function getOpenCageApiKey(): Promise<string | null> {
  try {
    const { data, error } = await supabaseServer
      .rpc('get_app_setting', { setting_key: 'opencage_api_key' })

    if (error) {
      return null
    }

    return data || null
  } catch (error) {
    return null
  }
}

/**
 * POST /api/geocode
 * Géocode une adresse via OpenCage API
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { address, city, postalCode, country = "France" } = body

    if (!address && !city) {
      return NextResponse.json(
        { error: "Address or city is required" },
        { status: 400 }
      )
    }

    // Récupérer la clé API depuis la base de données
    const apiKey = await getOpenCageApiKey()

    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenCage API key not configured in database" },
        { status: 500 }
      )
    }

    // Construire l'adresse complète
    const addressParts: string[] = []
    if (address) addressParts.push(address)
    if (city) addressParts.push(city)
    if (postalCode) addressParts.push(postalCode)
    if (country) addressParts.push(country)

    const query = addressParts.join(", ")

    // Appeler l'API OpenCage
    const encodedQuery = encodeURIComponent(query)
    const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodedQuery}&key=${apiKey}&limit=1&no_annotations=1&countrycode=fr`

    const response = await fetch(url, {
      method: "GET",
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: `OpenCage API error: ${response.status}` },
        { status: response.status }
      )
    }

    const data: OpenCageResponse = await response.json()

    // Vérifier le statut de la réponse
    if (data.status && data.status.code !== 200) {
      return NextResponse.json(
        { error: data.status.message },
        { status: 500 }
      )
    }

    // Vérifier qu'on a des résultats
    if (!data.results || data.results.length === 0) {
      return NextResponse.json(
        { error: `No results found for address: ${query}` },
        { status: 404 }
      )
    }

    const result = data.results[0]
    const { lat, lng } = result.geometry

    if (typeof lat !== "number" || typeof lng !== "number") {
      return NextResponse.json(
        { error: "Invalid coordinates in OpenCage response" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      latitude: lat,
      longitude: lng,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

