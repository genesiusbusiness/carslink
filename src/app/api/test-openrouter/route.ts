import { NextRequest, NextResponse } from 'next/server'

// Utiliser les variables d'environnement AWS Amplify, avec fallback pour le développement local
// Supporte aussi OPENROUTER_BASE_UR (sans L) pour compatibilité avec AWS configuré
const AI_API_KEY = process.env.OPENROUTER_API_KEY || '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'
const AI_API_BASE_URL = process.env.OPENROUTER_BASE_URL || process.env.OPENROUTER_BASE_UR || 'https://openrouter.ai/api/v1'
const AI_API_URL = `${AI_API_BASE_URL}/chat/completions`
const OPENROUTER_REFERER = process.env.OPENROUTER_REFERER || process.env.OPENROUTER_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://main.dsnxou1bmazo1.amplifyapp.com'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Test OpenRouter - Début')
    
    // Test 1: Test de connectivité simple
    console.log('🔍 Test 1: Connectivité OpenRouter...')
    let test1Success = false
    let test1Error: any = null
    
    try {
      const testResponse = await fetch(`${AI_API_BASE_URL}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${AI_API_KEY}`,
        },
        signal: AbortSignal.timeout(10000), // 10 secondes
      })
      
      const testData = await testResponse.json()
      console.log('✅ Test 1 réussi:', {
        status: testResponse.status,
        ok: testResponse.ok,
        hasData: !!testData,
      })
      test1Success = true
    } catch (error: any) {
      console.error('❌ Test 1 échoué:', error.message)
      test1Error = {
        message: error.message,
        name: error.name,
        stack: error.stack?.substring(0, 500),
      }
    }
    
    // Test 2: Test avec un modèle simple
    console.log('🔍 Test 2: Requête chat simple...')
    let test2Success = false
    let test2Error: any = null
    let test2Response: any = null
    
    try {
      const startTime = Date.now()
      const response = await fetch(AI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AI_API_KEY}`,
          'HTTP-Referer': OPENROUTER_REFERER,
          'X-Title': 'CarsLink AI Assistant',
        },
        body: JSON.stringify({
          model: 'google/gemini-flash-1.5:free',
          messages: [
            { role: 'user', content: 'Bonjour' },
          ],
          max_tokens: 50,
        }),
        signal: AbortSignal.timeout(15000), // 15 secondes
      })
      
      const duration = Date.now() - startTime
      const data = await response.json()
      
      console.log('✅ Test 2 réussi:', {
        status: response.status,
        ok: response.ok,
        duration: `${duration}ms`,
        hasData: !!data,
        hasChoices: !!data.choices,
      })
      test2Success = true
      test2Response = {
        status: response.status,
        ok: response.ok,
        duration: `${duration}ms`,
        hasContent: !!data.choices?.[0]?.message?.content,
        content: data.choices?.[0]?.message?.content?.substring(0, 100),
      }
    } catch (error: any) {
      console.error('❌ Test 2 échoué:', error.message)
      test2Error = {
        message: error.message,
        name: error.name,
        stack: error.stack?.substring(0, 500),
      }
    }
    
    return NextResponse.json({
      success: test1Success || test2Success,
      tests: {
        test1_connectivity: {
          success: test1Success,
          error: test1Error,
        },
        test2_chat: {
          success: test2Success,
          error: test2Error,
          response: test2Response,
        },
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasApiKey: !!AI_API_KEY,
        apiKeyPrefix: AI_API_KEY ? AI_API_KEY.substring(0, 10) : 'N/A',
      },
    })
  } catch (error: any) {
    console.error('❌ Erreur dans le test OpenRouter:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          message: error.message,
          name: error.name,
          stack: error.stack?.substring(0, 500),
        },
      },
      { status: 500 }
    )
  }
}

