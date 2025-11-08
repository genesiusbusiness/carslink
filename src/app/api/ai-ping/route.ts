import { NextRequest, NextResponse } from 'next/server'

/**
 * Endpoint de test pour vérifier la connectivité OpenRouter
 * GET /api/ai-ping
 */
export async function GET(request: NextRequest) {
  try {
    // Obtenir la configuration OpenRouter avec fallbacks
    const AI_API_KEY = process.env.OPENROUTER_API_KEY || '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'
    const AI_API_BASE_URL = process.env.OPENROUTER_BASE_URL || process.env.OPENROUTER_BASE_UR || 'https://openrouter.ai/api/v1'
    const OPENROUTER_SITE_URL = process.env.OPENROUTER_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://main.dsnxou1bmazo1.amplifyapp.com'
    const OPENROUTER_REFERER = process.env.OPENROUTER_REFERER || OPENROUTER_SITE_URL
    const OPENROUTER_APP_TITLE = process.env.OPENROUTER_APP_TITLE || 'CarsLink Assistant'
    
    // Vérifier que la clé API est présente
    if (!AI_API_KEY) {
      return NextResponse.json(
        {
          ok: false,
          error: 'SERVER_MISCONFIG',
          missing: ['OPENROUTER_API_KEY'],
        },
        { status: 400 }
      )
    }
    
    // Test de connectivité simple
    let connectivityOk = false
    let connectivityError: string | null = null
    
    try {
      const testResponse = await fetch(`${AI_API_BASE_URL}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${AI_API_KEY}`,
        },
        signal: AbortSignal.timeout(5000),
      })
      
      connectivityOk = testResponse.ok
      if (!testResponse.ok) {
        const errorText = await testResponse.text()
        connectivityError = `Status ${testResponse.status}: ${errorText}`
      }
    } catch (error: any) {
      connectivityError = error.message
    }
    
    // Test de chat simple
    let chatOk = false
    let chatError: string | null = null
    let modelUsed: string | null = null
    
    if (connectivityOk) {
      try {
        const chatResponse = await fetch(`${AI_API_BASE_URL}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${AI_API_KEY}`,
            'HTTP-Referer': OPENROUTER_REFERER,
            'Referer': OPENROUTER_REFERER,
            'X-Title': OPENROUTER_APP_TITLE,
          },
          body: JSON.stringify({
            model: 'google/gemini-flash-1.5:free',
            messages: [
              { role: 'user', content: 'Bonjour' },
            ],
            max_tokens: 10,
          }),
          signal: AbortSignal.timeout(10000),
        })
        
        if (chatResponse.ok) {
          const chatData = await chatResponse.json()
          chatOk = true
          modelUsed = chatData.model || 'google/gemini-flash-1.5:free'
        } else {
          const errorText = await chatResponse.text()
          chatError = `Status ${chatResponse.status}: ${errorText}`
        }
      } catch (error: any) {
        chatError = error.message
      }
    }
    
    return NextResponse.json({
      ok: connectivityOk && chatOk,
      connectivity: {
        ok: connectivityOk,
        error: connectivityError,
      },
      chat: {
        ok: chatOk,
        error: chatError,
        modelUsed,
      },
      config: {
        refererUsed: OPENROUTER_REFERER,
        siteUrl: OPENROUTER_SITE_URL,
        baseUrl: AI_API_BASE_URL,
        apiKeyLength: AI_API_KEY.length,
        apiKeyPrefix: AI_API_KEY.substring(0, 20),
        apiKeySuffix: AI_API_KEY.substring(AI_API_KEY.length - 10),
        apiKeyFromEnv: !!process.env.OPENROUTER_API_KEY,
        apiKeyFromEnvLength: process.env.OPENROUTER_API_KEY?.length || 0,
        apiKeyFromEnvPrefix: process.env.OPENROUTER_API_KEY ? process.env.OPENROUTER_API_KEY.substring(0, 20) : 'N/A',
        apiKeyFromEnvSuffix: process.env.OPENROUTER_API_KEY ? process.env.OPENROUTER_API_KEY.substring(process.env.OPENROUTER_API_KEY.length - 10) : 'N/A',
        apiKeyFull: AI_API_KEY, // Log complet pour débogage
      },
    })
  } catch (error: any) {
    console.error('❌ Erreur dans /api/ai-ping:', error)
    return NextResponse.json(
      {
        ok: false,
        error: 'INTERNAL_ERROR',
        message: error.message,
      },
      { status: 500 }
    )
  }
}

