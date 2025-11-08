#!/usr/bin/env node
/**
 * Script de health-check pour OpenRouter
 * 
 * Usage:
 *   npx ts-node scripts/openrouter-health.ts
 *   ou
 *   node scripts/openrouter-health.js (après compilation)
 * 
 * Ce script vérifie:
 * - La présence des variables d'environnement OpenRouter
 * - La validité de la clé API
 * - Les en-têtes requis (HTTP-Referer, X-Title, X-Source)
 * - Un appel test à l'API OpenRouter
 */

// Note: Les variables d'environnement sont chargées automatiquement par Next.js/AWS Amplify
// Pas besoin de dotenv pour ce script

// Variables d'environnement requises
const BASE = process.env.OPENROUTER_BASE_URL || process.env.OPENROUTER_BASE_UR || 'https://openrouter.ai/api/v1'
const API_KEY = process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_KEY || ''
const SITE = process.env.OPENROUTER_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || ''
const REFERER = process.env.OPENROUTER_REFERER || SITE || ''

// Modèle de test (gratuit)
const TEST_MODEL = 'openrouter/polaris-alpha'

async function healthCheck() {
  console.log('🔍 Health-check OpenRouter - Début\n')
  
  // 1. Vérifier les variables d'environnement
  console.log('📋 Variables d'environnement:')
  console.log(`  OPENROUTER_BASE_URL: ${BASE ? '✅' : '❌ MANQUANT'}`)
  console.log(`  OPENROUTER_API_KEY: ${API_KEY ? `✅ (longueur: ${API_KEY.length})` : '❌ MANQUANT'}`)
  console.log(`  OPENROUTER_SITE_URL: ${SITE ? `✅ ${SITE}` : '❌ MANQUANT'}`)
  console.log(`  OPENROUTER_REFERER: ${REFERER ? `✅ ${REFERER}` : '❌ MANQUANT'}`)
  console.log('')
  
  if (!API_KEY) {
    console.error('❌ ERREUR: OPENROUTER_API_KEY est manquante')
    process.exit(1)
  }
  
  // 2. Vérifier les en-têtes requis
  console.log('📋 En-têtes OpenRouter:')
  const headers = {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': REFERER,
    'X-Title': 'CarsLink Assistant',
    'X-Source': SITE,
    'Referer': REFERER,
  }
  
  console.log(`  Authorization: ${headers.Authorization ? '✅' : '❌'}`)
  console.log(`  HTTP-Referer: ${headers['HTTP-Referer'] ? `✅ ${headers['HTTP-Referer']}` : '❌ MANQUANT'}`)
  console.log(`  X-Title: ${headers['X-Title'] ? `✅ ${headers['X-Title']}` : '❌ MANQUANT'}`)
  console.log(`  X-Source: ${headers['X-Source'] ? `✅ ${headers['X-Source']}` : '❌ MANQUANT'}`)
  console.log('')
  
  // 3. Test de connectivité OpenRouter
  console.log('🔍 Test de connectivité OpenRouter...')
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30s timeout
    
    const response = await fetch(`${BASE}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: TEST_MODEL,
        messages: [
          { role: 'user', content: 'ping' }
        ],
        temperature: 0.1,
        max_tokens: 10,
      }),
      signal: controller.signal,
    })
    
    clearTimeout(timeoutId)
    
    const text = await response.text()
    let json: any = null
    try {
      json = JSON.parse(text)
    } catch {
      // Garder le texte pour le débogage
    }
    
    console.log(`📥 Réponse OpenRouter:`)
    console.log(`  Status: ${response.status} ${response.statusText}`)
    console.log(`  OK: ${response.ok ? '✅' : '❌'}`)
    
    if (response.ok && json?.choices?.[0]?.message?.content) {
      const content = json.choices[0].message.content
      console.log(`  Contenu: ${content.substring(0, 100)}`)
      console.log('')
      console.log('✅ Health-check réussi !')
      process.exit(0)
    } else {
      console.error(`❌ Réponse OpenRouter invalide:`)
      console.error(`  ${text.substring(0, 500)}`)
      console.log('')
      console.error('❌ Health-check échoué')
      process.exit(1)
    }
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error('❌ Timeout: La requête a pris plus de 30 secondes')
    } else {
      console.error(`❌ Erreur lors du test de connectivité:`)
      console.error(`  ${error.message}`)
      if (error.stack) {
        console.error(`  ${error.stack.substring(0, 500)}`)
      }
    }
    console.log('')
    console.error('❌ Health-check échoué')
    process.exit(1)
  }
}

// Exécuter le health-check
healthCheck().catch((error) => {
  console.error('❌ Erreur fatale:', error)
  process.exit(1)
})

