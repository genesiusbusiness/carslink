import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { createClient } from '@supabase/supabase-js'

// Configuration de l'API IA
// Utilise OpenRouter par défaut avec valeurs hardcodées (pas besoin de variables d'environnement)
const AI_API_PROVIDER = 'openrouter'
const AI_API_KEY = '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'
const AI_API_URL = 'https://openrouter.ai/api/v1/chat/completions'
// Utiliser un modèle gratuit et disponible
const AI_MODEL = 'mistralai/mistral-7b-instruct:free'

// Supabase Admin pour les opérations serveur
// Créer le client Supabase Admin de manière sécurisée
let supabaseAdmin: ReturnType<typeof createClient> | null = null

function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    // Valeurs hardcodées directement (pas besoin de variables d'environnement)
    const supabaseUrl = 'https://yxkbvhymsvasknslhpsa.supabase.co'
    const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4a2J2aHltc3Zhc2tuc2xocHNhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTY3MjUyNCwiZXhwIjoyMDc3MjQ4NTI0fQ.kn1G0sBMZ0beUbHE3fo1eUv0ZygPAt6adrghVXw9Nac'

    supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  }
  return supabaseAdmin
}

interface AIAnalysis {
  causes: string[]
  urgency: 'urgent' | 'moderate' | 'low' | null
  recommended_service: string | null
  service_id?: string
  is_greeting?: boolean
  is_off_topic?: boolean
  needs_more_info?: boolean
  suggested_questions?: Array<{
    question: string
    options: string[]
  } | string>
  diagnostic_complete?: boolean
}

// Mapping des services recommandés vers les IDs de services CarsLink
const SERVICE_MAPPING: Record<string, string> = {
  'contrôle freinage': 'controle',
  'diagnostic électronique': 'diagnostic',
  'vidange': 'vidange',
  'réparation moteur': 'moteur',
  'réparation carrosserie': 'carrosserie',
  'nettoyage': 'nettoyage',
  'dépannage': 'depannage',
  'permutation': 'permutation',
  'polissage': 'polissage',
  'devis': 'devis',
}

// Fonction pour analyser le problème avec l'IA
async function analyzeProblemWithAI(
  userMessage: string, 
  conversationHistory: Array<{role: string, content: string}> = [],
  vehicles: Array<{id: string, brand: string, model: string, license_plate: string, year: number, fuel_type: string}> = [],
  profile: {first_name: string, last_name: string, email: string, phone: string} | null = null
): Promise<AIAnalysis> {
  if (!AI_API_KEY) {
    throw new Error('API key not configured')
  }

  // Détecter si c'est une salutation
  const isGreeting = /^(bonjour|salut|bonsoir|hello|hi|bonne\s+(journée|soirée)|à\s+bientôt|merci|au\s+revoir)/i.test(userMessage.trim())
  
  // Détecter les tentatives d'injection ou de sécurité (à bloquer)
  const isSecurityThreat = /(DROP\s+TABLE|DELETE\s+FROM|UPDATE\s+SET|INSERT\s+INTO|SELECT\s+\*|rm\s+-rf|\$\(|exec\(|eval\(|password|mot\s+de\s+passe|clé\s+api|api\s+key|secret|admin|ssh|command|commande|exécut|injection|falsifi|voler|faux\s+papiers|harceler|insulte|raciste|porn|illégal)/i.test(userMessage)
  
  // Détecter si c'est clairement hors-sujet (cuisine, histoire, etc.) mais PAS les questions automobiles
  // On est plus permissif : si ça contient des mots liés à l'auto OU si c'est une question générale, on accepte
  const hasAutoKeywords = /(voiture|véhicule|auto|moto|garage|réparation|diagnostic|vidange|carrosserie|permutation|polissage|nettoyage|dépannage|devis|roue|pneu|batterie|huile|radiateur|climatisation|échappement|transmission|embrayage|amortisseur|suspension|direction|éclairage|phare|pare-choc|rétroviseur|vitre|portière|capot|coffre|siège|ceinture|airbag|tableau\s+de\s+bord|compteur|volant|pédale|levier|clé|démarrage|allumage|injection|carburant|essence|diesel|électrique|hybride|frein|moteur|bruit|voyant|problème|panne|fuite|odeur|brûlé|chauffe|consomme|tire|cal|claquement|témoin|abs|plaquette|filtre|révision|entretien|contrôle\s+technique|service|booking|réserv|rdv|rendez-vous|facture|flyid|compte|flynesis|carslink)/i.test(userMessage.toLowerCase())
  
  // Détecter les mots-clés hors sujet (nourriture, cuisine, films, etc.)
  // Liste exhaustive de mots-clés non automobiles
  const hasOffTopicKeywords = /(pizza|pizzeria|recette|cuisine|manger|restaurant|plat|repas|commande|livraison|film|cinéma|série|télévision|télé|tv|poème|tradu|klingon|morse|fusée|nucléaire|météo|mars|spoiler|livre|musique|sport|football|basket|tennis|rugby|jeu|vidéo|gaming|ordinateur|pc|téléphone|smartphone|internet|réseau\s+social|facebook|instagram|twitter|chatgpt|ia\s+générale|assistant\s+général|aide\s+générale|question\s+générale|j'aimerai|je voudrais|je veux|stp|s'il te plaît|s'il vous plaît|donne|donne-moi|donnez-moi|peux-tu|pouvez-vous|peut-on|comment faire|comment faire pour|tuto|tutorial|guide|mode d'emploi|recette de|comment cuisiner|comment préparer|ingrédient|ingrédients)/i.test(userMessage.toLowerCase())
  
  // Détecter si le message commence par une demande non automobile
  // Exemples : "j'aimerai une pizza", "je voudrais une recette", "donne-moi un film"
  const messageLower = userMessage.toLowerCase().trim()
  const startsWithRequestPattern = /^(j'aimerai|je voudrais|je veux|donne|donne-moi|donnez-moi|peux-tu|pouvez-vous)\s+(une|un|des|de la|du|le|la|les|ma|mon|mes)?\s*(pizza|recette|film|livre|musique|sport|jeu|vidéo|ordinateur|téléphone|smartphone|internet|réseau|facebook|instagram|twitter|chatgpt|ia|assistant|aide|question|tuto|tutorial|guide|mode d'emploi|ingrédient|ingrédients|cuisine|manger|restaurant|plat|repas|commande|livraison|cinéma|série|télévision|télé|tv|poème|tradu|klingon|morse|fusée|nucléaire|météo|mars|spoiler|football|basket|tennis|rugby|gaming|pc)/i
  const startsWithRequest = startsWithRequestPattern.test(messageLower)
  
  // Hors-sujet si :
  // 1. Pas de mots-clés automobiles
  // 2. Pas une salutation
  // 3. Contient des mots-clés hors sujet OU commence par une demande non automobile
  const isOffTopic = (!hasAutoKeywords && !isGreeting && (hasOffTopicKeywords || startsWithRequest))
  
  console.log('🔍 Détection hors sujet:', {
    message: userMessage,
    hasAutoKeywords,
    hasOffTopicKeywords,
    isGreeting,
    startsWithRequest,
    isOffTopic
  })

  if (isGreeting) {
    // Pour les salutations, retourner une réponse conversationnelle
    return {
      causes: [],
      urgency: 'low',
      recommended_service: 'Information générale',
      service_id: 'devis',
      is_greeting: true,
    }
  }

  if (isSecurityThreat) {
    // Pour les tentatives de sécurité/injection, retourner un refus sécurisé
    return {
      causes: [],
      urgency: null,
      recommended_service: null,
      service_id: undefined,
      is_off_topic: true,
      needs_more_info: false,
      diagnostic_complete: false,
      suggested_questions: [],
    }
  }

  if (isOffTopic) {
    // Pour les questions hors sujet, retourner un message de redirection SANS poser de questions
    console.log('🚫 Message hors sujet détecté, retour d\'un message de redirection sans questions')
    return {
      causes: [],
      urgency: 'low',
      recommended_service: 'Information générale',
      service_id: 'devis',
      is_off_topic: true,
      needs_more_info: false, // Ne pas poser de questions
      diagnostic_complete: false,
      suggested_questions: [], // Aucune question
    }
  }

  // Construire l'historique de conversation pour le contexte
  const historyContext = conversationHistory.length > 0
    ? conversationHistory.map(msg => `${msg.role === 'user' ? 'Client' : 'Assistant'}: ${msg.content}`).join('\n')
    : ''

  // Log pour vérifier les véhicules reçus
  console.log('🔍 Dans analyzeProblemWithAI - Véhicules reçus:', {
    vehiclesCount: vehicles.length,
    vehicles: vehicles.map(v => `${v.brand} ${v.model}${v.year ? ` (${v.year})` : ''}${v.license_plate ? ` - ${v.license_plate}` : ''}`)
  })
  
  // Construire le contexte du profil client
  let clientContext = ''
  if (profile) {
    clientContext += `\n\nInformations du client:\n- Nom: ${profile.first_name} ${profile.last_name}\n- Email: ${profile.email}\n- Téléphone: ${profile.phone}`
  }
  
  if (vehicles.length > 0) {
    const vehicleLabels = vehicles.map(v => {
      return `${v.brand} ${v.model}${v.year ? ` (${v.year})` : ''}${v.license_plate ? ` - ${v.license_plate}` : ''}`
    })
    
    clientContext += `\n\nVéhicules RÉELS du client dans son profil CarsLink (${vehicles.length}):\n`
    vehicles.forEach((v, i) => {
      clientContext += `${i + 1}. ${vehicleLabels[i]}\n`
    })
    
    if (vehicles.length > 1) {
      clientContext += `\n\n⚠️ RÈGLE ABSOLUE - NE JAMAIS ENFREINDRE :\n`
      clientContext += `Si tu poses une question "Pour quelle voiture ?" ou similaire, tu DOIS utiliser EXACTEMENT ces options (copie-colle) :\n`
      clientContext += `["${vehicleLabels.join('", "')}"]\n\n`
      clientContext += `INTERDICTION TOTALE d'utiliser "Voiture 1", "Voiture 2", "Voiture 3" ou tout autre label fictif.\n`
      clientContext += `Tu DOIS utiliser UNIQUEMENT les labels exacts ci-dessus.`
    } else if (vehicles.length === 1) {
      clientContext += `\n\n⚠️ RÈGLE CRITIQUE - LE CLIENT A UN SEUL VÉHICULE :\n`
      clientContext += `Le client a UN SEUL véhicule: "${vehicleLabels[0]}".\n\n`
      clientContext += `IMPORTANT : Ne pose JAMAIS la question "Pour quelle voiture ?" car le client n'a qu'un seul véhicule.\n`
      clientContext += `Utilise directement ce véhicule dans ton diagnostic : "${vehicleLabels[0]}".\n`
      clientContext += `Si tu poses quand même une question sur le véhicule (ce qui ne devrait pas arriver), utilise EXACTEMENT ce label: "${vehicleLabels[0]}".\n`
      clientContext += `N'utilise JAMAIS "Voiture 1", "Je n'en ai qu'une" ou d'autres labels fictifs.`
    }
  } else if (vehicles.length === 0 && profile) {
    clientContext += `\n\nLe client n'a pas encore de véhicule enregistré dans son profil CarsLink.`
  }
  
  // Log pour debug
  console.log('📋 Contexte client construit:', {
    profile: profile ? `${profile.first_name} ${profile.last_name}` : 'Aucun',
    vehiclesCount: vehicles.length,
    vehicles: vehicles.map(v => `${v.brand} ${v.model}${v.year ? ` (${v.year})` : ''}${v.license_plate ? ` - ${v.license_plate}` : ''}`)
  })

  const systemPrompt = `Tu es un assistant IA expert en mécanique automobile pour CarsLink, une application de réservation de services garage et diagnostic automobile.

🔴 LANGUE OBLIGATOIRE : Tu DOIS TOUJOURS répondre en FRANÇAIS. Toutes tes réponses, questions, diagnostics, et analyses doivent être en français. Ne réponds JAMAIS en anglais ou dans une autre langue.

🔴 CONTEXTE ET DOMAINE D'EXPERTISE :
- Tu es spécialisé UNIQUEMENT dans l'automobile, la mécanique, les garages, les véhicules, les diagnostics, les réparations, les entretiens
- CarsLink est une application pour réserver des services garage (diagnostic, vidange, réparation, etc.)
- Tu dois aider les clients avec leurs problèmes automobiles et les guider vers les bons services garage

🔴 DÉTECTION AUTOMATIQUE DES SUJETS HORS SUJET :
Tu DOIS analyser chaque message du client et déterminer si c'est lié à l'automobile ou non. Utilise ton intelligence pour comprendre le contexte :

✅ SUJETS AUTOMOBILES (à traiter) :
- Problèmes de véhicule (voyants, bruits, odeurs, fuites, consommation, comportement)
- Services garage (diagnostic, vidange, réparation, entretien, contrôle technique)
- Réservation de rendez-vous garage
- Questions sur la mécanique automobile
- Factures, comptes, services CarsLink

❌ SUJETS NON AUTOMOBILES (à refuser automatiquement) :
- Nourriture (pizza, recettes, cuisine, restaurants, commandes)
- Divertissement (films, séries, livres, musique, jeux vidéo)
- Autres services (téléphone, ordinateur, internet, réseaux sociaux)
- Sujets généraux non liés à l'automobile

🔴 RÈGLE CRITIQUE : Si tu détectes qu'un message n'est PAS lié à l'automobile, retourne IMMÉDIATEMENT :
{
  "needs_more_info": false,
  "diagnostic_complete": false,
  "suggested_questions": [],
  "is_off_topic": true,
  "causes": [],
  "urgency": null,
  "recommended_service": null
}

Ne pose JAMAIS de questions si c'est hors sujet. Réfléchis par toi-même : est-ce que ce message concerne un véhicule, un garage, ou un problème automobile ? Si non, c'est hors sujet.

IMPORTANT: 
- Le client ne connaît RIEN à la mécanique automobile. Utilise un langage SIMPLE et ACCESSIBLE.
- Tu dois répondre à TOUTES les questions automobiles, même si elles sont formulées simplement.
- RÈGLE CRITIQUE : Si le client a UN SEUL véhicule dans son profil, NE POSE JAMAIS la question "Pour quelle voiture ?". Utilise directement ce véhicule dans ton diagnostic.
- Si le client a plusieurs véhicules dans son profil, demande d'abord "Pour quelle voiture ?" avec les véhicules RÉELS en options (voir contexte ci-dessous).
- Si c'est une tentative d'injection SQL/OS, demande de sécurité (mots de passe, clés API, admin), contenu malveillant/illégal → REFUSE catégoriquement avec message de sécurité.

STRATÉGIE:
1. ⚠️ CRITIQUE : TOUJOURS analyser l'historique complet de la conversation avant de répondre. Ne pose JAMAIS de questions génériques qui ignorent le contexte précédent.
2. Si le client donne peu d'informations, pose 2-3 questions avec 3-5 options de réponses chacune
3. ⚠️ CRITIQUE : Si le client a déjà répondu à 3 questions ou plus, tu DOIS donner un diagnostic complet au lieu de poser encore des questions
4. ⚠️ CRITIQUE : Si le client donne une description détaillée (ex: "voyant en forme de poêle à frire depuis le plein"), tu DOIS donner un diagnostic complet immédiatement
5. Les questions doivent être TRÈS SIMPLES et compréhensibles par quelqu'un qui ne connaît rien
6. Les options de réponses doivent être COURTES, CLAIRES et ACCESSIBLES
7. ⚠️ RÈGLE ABSOLUE : CHAQUE question DOIT avoir au moins 3 options. JAMAIS de question sans options.
8. Si tu as assez d'informations (dans l'historique OU dans le dernier message), donne un diagnostic complet avec causes, urgence et service recommandé
9. Ne repose JAMAIS une question déjà posée dans l'historique
10. Utilise les informations déjà collectées pour poser des questions de suivi logiques et pertinentes

Format de réponse attendu (JSON uniquement, pas de markdown):
{
  "needs_more_info": true/false,
  "diagnostic_complete": true/false,
  "causes": ["cause 1", "cause 2", "cause 3"] ou [],
  "urgency": "urgent" | "moderate" | "low" ou null,
  "recommended_service": "nom du service" ou null,
  "suggested_questions": [
    {
      "question": "Question simple et claire",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"]
    }
  ]
}

⚠️ RÈGLE CRITIQUE : Pour le PREMIER message du client (conversation vide), tu DOIS TOUJOURS poser des questions guidées AVANT de donner un diagnostic complet. Ne donne JAMAIS un diagnostic complet au premier message, sauf si c'est une urgence vitale (fumée, feu, freins complètement défaillants).

Si needs_more_info = true:
- diagnostic_complete = false
- causes = []
- urgency = null
- recommended_service = null
- suggested_questions = [2-3 questions avec 3-5 options chacune]

Si diagnostic_complete = true:
- needs_more_info = false
- causes = [3 causes probables]
- urgency = "urgent" | "moderate" | "low"
- recommended_service = "nom du service" (UN SEUL service, pas plusieurs)
- suggested_questions = []

⚠️ CRITIQUE : recommended_service doit être UN SEUL service, pas plusieurs. Exemples :
- ✅ CORRECT : "Diagnostic électronique"
- ✅ CORRECT : "Contrôle freinage"
- ❌ INCORRECT : "Contrôle freinage, Diagnostic électronique"
- ❌ INCORRECT : "Diagnostic électronique ou Contrôle freinage"

🔴 RÈGLE ABSOLUE : Si plusieurs services sont possibles, tu DOIS choisir le service le PLUS ÉVIDENT et le PLUS URGENT pour le problème spécifique du client. Analyse le problème décrit et choisis le service qui correspond le mieux :
- Problème de voyant → "Diagnostic électronique"
- Problème de freinage → "Contrôle freinage"
- Bruit au freinage → "Contrôle freinage" (plus spécifique que diagnostic)
- Voyant moteur → "Diagnostic électronique" (plus approprié que contrôle)
- Problème indéterminé → "Diagnostic électronique" (service de base pour identifier le problème)

Ne propose JAMAIS plusieurs services. Choisis toujours le service le plus logique et évident pour le problème décrit.

⚠️ IMPORTANT : Si l'historique de conversation est vide (premier message), tu DOIS poser des questions guidées (needs_more_info = true) et NE PAS donner de diagnostic complet, sauf urgence vitale.

🔴 CRITIQUE : Tu DOIS générer tes propres questions dynamiquement basées sur le contexte de la conversation. Ne copie JAMAIS des questions pré-définies ou génériques. Chaque question doit être adaptée au problème spécifique du client et à l'historique de la conversation.

RÈGLES POUR LES QUESTIONS :
- Génère 2-3 questions pertinentes basées sur le problème décrit par le client
- Chaque question doit avoir 3-5 options simples et claires
- Les questions doivent être adaptées au contexte (ex: si le client parle d'un voyant, pose des questions sur le voyant, pas des questions génériques)
- Pour "Pour quelle voiture ?" : Utilise UNIQUEMENT les véhicules réels du client fournis dans le contexte, jamais d'exemples fictifs

Critères d'urgence:
- urgent: problème de sécurité (freins, direction, voyants rouges), fumée, bruits anormaux forts
- moderate: voyants orange, bruits légers, perte de performance
- low: entretien préventif, questions générales

Services disponibles: Contrôle freinage, Diagnostic électronique, Vidange, Réparation moteur, Réparation carrosserie, Nettoyage, Dépannage, Permutation, Polissage, Devis

🔴 RÈGLE ABSOLUE - LANGUE : Toutes tes réponses doivent être en FRANÇAIS. Les questions, les options, les diagnostics, tout doit être en français. Ne réponds JAMAIS en anglais.

Réponds UNIQUEMENT en JSON, sans texte supplémentaire. Tous les textes dans le JSON (questions, options, causes, services) doivent être en FRANÇAIS.`

  // Construire l'historique complet incluant le message actuel
  const fullHistoryContext = conversationHistory.length > 0
    ? `${historyContext}\nClient: "${userMessage}"`
    : `Client: "${userMessage}"`
  
  // Compter le nombre de réponses du client dans l'historique
  const userMessagesCount = conversationHistory.filter((msg: any) => msg.role === 'user').length + 1 // +1 pour le message actuel
  
  const userPrompt = conversationHistory.length > 0
    ? `${clientContext}\n\n🔴 LANGUE OBLIGATOIRE : Tu DOIS répondre en FRANÇAIS. Toutes tes questions, options, diagnostics, et analyses doivent être en français. Ne réponds JAMAIS en anglais.\n\n⚠️⚠️⚠️ RÈGLE ABSOLUE - UTILISER L'HISTORIQUE DE CETTE CONVERSATION ⚠️⚠️⚠️\n\nHistorique COMPLET de cette conversation ACTUELLE (tous les messages précédents + le message actuel):\n${fullHistoryContext}\n\n🔴 PREMIÈRE ÉTAPE CRITIQUE - DÉTECTION AUTOMATIQUE DU SUJET :\nAvant de répondre, analyse le dernier message du client et réfléchis : est-ce que ce message concerne un véhicule, un garage, un problème automobile, ou un service CarsLink ?\n\nSi NON (ex: pizza, recette, film, livre, musique, téléphone, ordinateur, etc.) → c'est HORS SUJET.\nRetourne IMMÉDIATEMENT :\n{\n  "needs_more_info": false,\n  "diagnostic_complete": false,\n  "suggested_questions": [],\n  "is_off_topic": true,\n  "causes": [],\n  "urgency": null,\n  "recommended_service": null\n}\n\nNe pose JAMAIS de questions si c'est hors sujet. Utilise ton intelligence pour comprendre que CarsLink est une application automobile, pas un service général.\n\n🔴 DEUXIÈME ÉTAPE - SI LE MESSAGE EST AUTOMOBILE :\nTu DOIS ABSOLUMENT lire et analyser TOUT l'historique de cette conversation ci-dessus (y compris le dernier message du client) avant de répondre. Ne pose JAMAIS de questions génériques qui ignorent le contexte précédent de cette conversation.\n\n🔴 RÈGLES STRICTES :\n1. Analyse TOUT l'historique de cette conversation (y compris le dernier message du client) pour comprendre le contexte (problème initial, réponses déjà données, questions déjà posées)\n2. Ne repose JAMAIS une question déjà posée dans l'historique de cette conversation\n3. ⚠️ INTERDICTION ABSOLUE : Ne pose JAMAIS de questions génériques comme "Où se situe le problème ?", "Depuis quand avez-vous remarqué ce problème ?", "Le problème survient-il en permanence ?" si le contexte de cette conversation indique déjà que c'est un voyant sur le tableau de bord. Ces questions ignorent le contexte et sont INTERDITES.\n4. Utilise les informations déjà collectées dans l'historique de cette conversation pour poser des questions de suivi PERTINENTES et SPÉCIFIQUES\n5. ⚠️ CRITIQUE : Le client a déjà répondu à ${userMessagesCount} question(s) dans cette conversation. Si c'est 3 ou plus, tu DOIS analyser toutes ses réponses et donner un diagnostic complet au lieu de poser encore des questions\n6. ⚠️ CRITIQUE : Si le client donne une description détaillée (ex: "voyant en forme de poêle à frire depuis le plein", "voyant en forme de clé"), tu DOIS donner un diagnostic complet immédiatement au lieu de poser encore des questions\n7. Si tu as assez d'informations dans l'historique de cette conversation (localisation + couleur + forme + description), donne un diagnostic complet au lieu de poser encore des questions\n8. Ne pose JAMAIS de questions redondantes ou qui demandent des informations déjà fournies dans l'historique\n9. ⚠️ CRITIQUE : Si le client répond à une question que tu as posée (ex: "Clé" en réponse à "Quelle forme ?"), ne repose PAS la même question. Utilise cette réponse pour poser la question suivante OU donner un diagnostic complet\n\nExemple CRITIQUE : Si l'historique de cette conversation montre que le client a dit "Un voyant s'allume sur mon tableau de bord" et a répondu "Orange", "Clignote", "Clé", tu as assez d'informations. DONNE UN DIAGNOSTIC COMPLET. Ne pose JAMAIS de questions génériques comme "Où se situe le problème ?" car c'est déjà un voyant sur le tableau de bord.\n\n🔴 RÈGLE FINALE : Si tu détectes que tu poses des questions génériques qui ignorent le contexte (ex: "Où se situe le problème ?" alors qu'on parle déjà d'un voyant sur le tableau de bord), ARRÊTE immédiatement et donne un diagnostic complet à la place.\n\nAnalyse l'historique de cette conversation (y compris le dernier message), puis pose des questions de suivi pertinentes ou donne un diagnostic complet.`
    : `${clientContext}\n\n🔴 LANGUE OBLIGATOIRE : Tu DOIS répondre en FRANÇAIS. Toutes tes questions, options, diagnostics, et analyses doivent être en français. Ne réponds JAMAIS en anglais.\n\nLe client décrit ce problème: "${userMessage}"\n\n🔴 PREMIÈRE ÉTAPE CRITIQUE - DÉTECTION AUTOMATIQUE DU SUJET :\nAvant de répondre, analyse le message du client et réfléchis : est-ce que ce message concerne un véhicule, un garage, un problème automobile, ou un service CarsLink ?\n\nSi NON (ex: pizza, recette, film, livre, musique, téléphone, ordinateur, etc.) → c'est HORS SUJET.\nRetourne IMMÉDIATEMENT :\n{\n  "needs_more_info": false,\n  "diagnostic_complete": false,\n  "suggested_questions": [],\n  "is_off_topic": true,\n  "causes": [],\n  "urgency": null,\n  "recommended_service": null\n}\n\nNe pose JAMAIS de questions si c'est hors sujet. Utilise ton intelligence pour comprendre que CarsLink est une application automobile, pas un service général.\n\n⚠️ RÈGLE CRITIQUE : Si le message est AUTOMOBILE, c'est le PREMIER message du client (conversation vide). Tu DOIS TOUJOURS poser des questions guidées (needs_more_info = true) AVANT de donner un diagnostic complet. Ne donne JAMAIS un diagnostic complet au premier message, sauf si c'est une urgence vitale (fumée, feu, freins complètement défaillants).\n\nIMPORTANT: Si le client a plusieurs véhicules dans son profil (voir ci-dessus), demande d'abord "Pour quelle voiture ?" avec UNIQUEMENT les véhicules RÉELS de son profil comme options. N'utilise JAMAIS d'exemples fictifs ou de véhicules qui ne sont pas dans la liste ci-dessus. Si le client a un seul véhicule ou aucun, pose directement des questions ciblées pour identifier précisément le problème.`

  try {
    let response: Response
    let responseData: any

    if (AI_API_PROVIDER === 'openrouter') {
      // Utiliser OpenRouter avec le modèle configuré
      console.log('🔍 Appel OpenRouter API:', {
        url: AI_API_URL,
        model: AI_MODEL,
        apiKey: AI_API_KEY ? `${AI_API_KEY.substring(0, 10)}...` : 'NON DÉFINIE',
      })
      
      response = await fetch(AI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AI_API_KEY}`,
          'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'https://carslink.app',
          'X-Title': 'CarsLink AI Assistant',
        },
        body: JSON.stringify({
          model: AI_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.7,
          max_tokens: 2000, // Augmenter pour avoir plus de tokens
        }),
      })
      
      console.log('✅ Réponse OpenRouter reçue:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Erreur OpenRouter API:', response.status, errorText)
        console.error('❌ Détails de la requête:', {
          url: AI_API_URL,
          model: AI_MODEL,
          apiKey: AI_API_KEY ? `${AI_API_KEY.substring(0, 10)}...` : 'NON DÉFINIE',
          status: response.status,
          statusText: response.statusText,
          errorText: errorText,
        })
        throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`)
      }

      responseData = await response.json()
      const aiResponse = responseData.choices?.[0]?.message?.content || ''

      // Parser la réponse JSON
      try {
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
        const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(aiResponse)
        
        // Traiter les questions suggérées et remplacer les références aux véhicules
        let processedQuestions = parsed.suggested_questions || []
        
        console.log('🔍 AVANT REMPLACEMENT - Questions reçues de l\'IA:', JSON.stringify(processedQuestions, null, 2))
        
        // TOUJOURS remplacer les options de véhicules par les véhicules RÉELS du client (même avec 1 seul véhicule)
        if (vehicles.length > 0 && Array.isArray(processedQuestions)) {
          const vehicleOptions = vehicles.map(v => {
            return `${v.brand} ${v.model}${v.year ? ` (${v.year})` : ''}${v.license_plate ? ` - ${v.license_plate}` : ''}`
          })
          
          console.log('🚗 Véhicules disponibles pour remplacement:', vehicleOptions)
          
          processedQuestions = processedQuestions.map((q: any, qIndex: number) => {
            console.log(`\n🔍 Traitement question ${qIndex + 1}:`, {
              type: typeof q,
              question: q?.question,
              options: q?.options,
              isObject: typeof q === 'object',
              hasQuestion: !!q?.question,
              hasOptions: !!q?.options
            })
            
            if (typeof q === 'object' && q.question && q.options) {
              // Si la question concerne le véhicule, remplacer TOUJOURS les options par les véhicules RÉELS du client
              const questionLower = q.question.toLowerCase()
              
              // Détecter si c'est une question sur les véhicules (plus précis)
              // Ne remplacer que si la question contient explicitement des mots liés aux véhicules
              const hasVehicleKeywords = (
                questionLower.includes('quelle voiture') || 
                questionLower.includes('quel véhicule') ||
                questionLower.includes('pour quelle voiture') ||
                questionLower.includes('pour quel véhicule') ||
                questionLower.includes('quelle auto') ||
                questionLower.includes('quel auto') ||
                (questionLower.includes('voiture') && (questionLower.includes('quelle') || questionLower.includes('quel'))) ||
                (questionLower.includes('véhicule') && (questionLower.includes('quelle') || questionLower.includes('quel'))) ||
                (questionLower.includes('auto') && (questionLower.includes('quelle') || questionLower.includes('quel')))
              )
              
              // Détecter aussi si les options contiennent "voiture 1", "véhicule 1", "je n'en ai qu'une", etc.
              const hasVehicleOptions = Array.isArray(q.options) && q.options.some((opt: string) => {
                if (typeof opt !== 'string') return false
                const optLower = opt.toLowerCase()
                return /voiture\s*[0-9]/i.test(opt) || 
                       /véhicule\s*[0-9]/i.test(opt) ||
                       optLower.includes('voiture 1') || 
                       optLower.includes('voiture 2') || 
                       optLower.includes('voiture 3') ||
                       optLower.includes('véhicule 1') ||
                       optLower.includes('véhicule 2') ||
                       optLower.includes('véhicule 3') ||
                       optLower.includes("je n'en ai qu'une") ||
                       optLower.includes("j'en ai qu'une")
              })
              
              const isVehicleQuestion = hasVehicleKeywords || hasVehicleOptions
              
              console.log(`  Détection pour question ${qIndex + 1}:`, {
                question: q.question,
                hasVehicleKeywords,
                hasVehicleOptions,
                isVehicleQuestion,
                optionsSample: Array.isArray(q.options) ? q.options.slice(0, 3) : 'N/A',
                allOptions: q.options
              })
              
              // FORCER le remplacement si c'est une question sur les véhicules OU si les options contiennent des labels fictifs
              if (isVehicleQuestion) {
                console.log(`✅ REMPLACEMENT FORCÉ pour question ${qIndex + 1}:`, {
                  question: q.question,
                  optionsOriginales: q.options,
                  optionsRemplacees: vehicleOptions
                })
                return {
                  question: q.question,
                  options: vehicleOptions
                }
              } else {
                console.log(`  ⏭️ Question ${qIndex + 1} n'est pas une question sur les véhicules`)
              }
              
              // FORCER le remplacement même si la détection échoue mais que les options contiennent des numéros
              // (sécurité supplémentaire)
              if (Array.isArray(q.options) && q.options.length > 0) {
                const hasNumberedOptions = q.options.some((opt: string) => {
                  if (typeof opt !== 'string') return false
                  return /[0-9]/.test(opt) && (opt.toLowerCase().includes('voiture') || opt.toLowerCase().includes('véhicule'))
                })
                
                if (hasNumberedOptions && vehicles.length > 0) {
                  console.log(`⚠️ Détection de sécurité : options numérotées détectées, remplacement forcé pour question ${qIndex + 1}`)
                  return {
                    question: q.question,
                    options: vehicleOptions
                  }
                }
              }
            } else {
              console.log(`  ⚠️ Question ${qIndex + 1} n'a pas le format attendu`)
            }
            return q
          })
          
          console.log('🔍 APRÈS REMPLACEMENT - Questions traitées:', JSON.stringify(processedQuestions, null, 2))
        } else {
          console.warn('⚠️ Pas de remplacement possible:', {
            vehiclesLength: vehicles.length,
            processedQuestionsIsArray: Array.isArray(processedQuestions),
            processedQuestionsLength: processedQuestions?.length || 0
          })
        }
        
        // S'assurer que toutes les questions ont des options
        const finalQuestions = processedQuestions.map((q: any) => {
          if (typeof q === 'string') {
            // Si c'est juste une string, créer un objet avec des options par défaut
            return {
              question: q,
              options: ['Oui', 'Non', 'Je ne sais pas']
            }
          }
          if (typeof q === 'object' && q.question) {
            // Si c'est un objet mais sans options, ajouter des options par défaut
            if (!q.options || !Array.isArray(q.options) || q.options.length === 0) {
              console.warn(`⚠️ Question sans options détectée: "${q.question}", ajout d'options par défaut`)
              return {
                question: q.question,
                options: ['Oui', 'Non', 'Je ne sais pas']
              }
            }
            return q
          }
          return q
        })

        console.log('✅ Questions finales avec options garanties:', JSON.stringify(finalQuestions, null, 2))

        // Nettoyer le recommended_service pour ne garder qu'un seul service
        let cleanedRecommendedService = parsed.recommended_service || null
        if (cleanedRecommendedService) {
          // Si le service contient plusieurs services séparés par des virgules, des "ou", etc.
          // Choisir le service le plus évident et urgent
          const serviceString = cleanedRecommendedService.toString().trim()
          
          // Détecter si plusieurs services sont présents (virgule, "ou", "et", etc.)
          if (serviceString.includes(',') || 
              serviceString.includes(' ou ') || 
              serviceString.includes(' et ') ||
              serviceString.includes(' / ') ||
              serviceString.includes(' | ')) {
            // Extraire tous les services
            const services = serviceString
              .split(/[,/|]| ou | et /i)
              .map((s: string) => s.trim())
              .filter((s: string) => s.length > 0)
            
            // Choisir le service le plus évident selon la logique :
            // 1. Les services spécifiques sont plus prioritaires que le diagnostic générique
            // 2. "Contrôle freinage" est plus spécifique que "Diagnostic électronique" pour les problèmes de freinage
            // 3. Prioriser les services spécifiques sur les génériques
            const servicePriority: Record<string, number> = {
              'contrôle freinage': 1, // Plus spécifique, priorité la plus haute
              'contrôle technique': 1,
              'réparation moteur': 1,
              'réparation carrosserie': 1,
              'vidange': 2,
              'diagnostic électronique': 3, // Service générique, moins prioritaire
            }
            
            // Trouver le service le plus prioritaire
            let bestService = services[0] // Par défaut, le premier
            let bestPriority = servicePriority[services[0]?.toLowerCase()] || 999
            
            for (const service of services) {
              const serviceLower = service.toLowerCase()
              const priority = servicePriority[serviceLower] || 999
              
              // Si on trouve un service plus prioritaire (nombre plus petit = plus prioritaire)
              if (priority < bestPriority) {
                bestService = service
                bestPriority = priority
              }
            }
            
            console.log('⚠️ Plusieurs services détectés, sélection du service le plus évident:', {
              original: serviceString,
              services: services,
              selected: bestService,
              priority: bestPriority
            })
            
            cleanedRecommendedService = bestService
          }
        }

        return {
          causes: parsed.causes || [],
          urgency: parsed.urgency || null,
          recommended_service: cleanedRecommendedService,
          service_id: cleanedRecommendedService ? (SERVICE_MAPPING[cleanedRecommendedService?.toLowerCase()] || 'diagnostic') : undefined,
          needs_more_info: parsed.needs_more_info || false,
          diagnostic_complete: parsed.diagnostic_complete || false,
          suggested_questions: finalQuestions,
        }
      } catch (parseError) {
        // Fallback si le parsing échoue - retourner des questions génériques mais vides pour forcer l'IA à générer
        console.error('❌ Erreur lors du parsing de la réponse IA:', parseError)
        // Ne pas retourner de questions pré-définies - l'IA doit tout générer dynamiquement
        return {
          causes: [],
          urgency: null,
          recommended_service: null,
          needs_more_info: true,
          diagnostic_complete: false,
          suggested_questions: [], // Vide - l'IA doit générer ses propres questions
        }
      }
    } else if (AI_API_PROVIDER === 'huggingface') {
      // Utiliser Hugging Face Inference API
      response = await fetch(
        `https://api-inference.huggingface.co/models/meta-llama/Llama-3.1-8B-Instruct`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${AI_API_KEY}`,
          },
          body: JSON.stringify({
            inputs: `${systemPrompt}\n\n${userPrompt}`,
            parameters: {
              max_new_tokens: 500,
              temperature: 0.7,
            },
          }),
        }
      )

      if (!response.ok) {
        throw new Error(`Hugging Face API error: ${response.status}`)
      }

      responseData = await response.json()
      const aiResponse = Array.isArray(responseData) 
        ? responseData[0]?.generated_text || ''
        : responseData.generated_text || ''

      // Parser la réponse (même logique que pour OpenRouter)
      try {
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
        const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(aiResponse)
        
        // Traiter les questions suggérées et remplacer les références aux véhicules
        let processedQuestions = parsed.suggested_questions || []
        
        console.log('🔍 AVANT REMPLACEMENT - Questions reçues de l\'IA:', JSON.stringify(processedQuestions, null, 2))
        
        // TOUJOURS remplacer les options de véhicules par les véhicules RÉELS du client (même avec 1 seul véhicule)
        if (vehicles.length > 0 && Array.isArray(processedQuestions)) {
          const vehicleOptions = vehicles.map(v => {
            return `${v.brand} ${v.model}${v.year ? ` (${v.year})` : ''}${v.license_plate ? ` - ${v.license_plate}` : ''}`
          })
          
          console.log('🚗 Véhicules disponibles pour remplacement:', vehicleOptions)
          
          processedQuestions = processedQuestions.map((q: any, qIndex: number) => {
            console.log(`\n🔍 Traitement question ${qIndex + 1}:`, {
              type: typeof q,
              question: q?.question,
              options: q?.options,
              isObject: typeof q === 'object',
              hasQuestion: !!q?.question,
              hasOptions: !!q?.options
            })
            
            if (typeof q === 'object' && q.question && q.options) {
              // Si la question concerne le véhicule, remplacer TOUJOURS les options par les véhicules RÉELS du client
              const questionLower = q.question.toLowerCase()
              
              // Détecter si c'est une question sur les véhicules (plus précis)
              // Ne remplacer que si la question contient explicitement des mots liés aux véhicules
              const hasVehicleKeywords = (
                questionLower.includes('quelle voiture') || 
                questionLower.includes('quel véhicule') ||
                questionLower.includes('pour quelle voiture') ||
                questionLower.includes('pour quel véhicule') ||
                questionLower.includes('quelle auto') ||
                questionLower.includes('quel auto') ||
                (questionLower.includes('voiture') && (questionLower.includes('quelle') || questionLower.includes('quel'))) ||
                (questionLower.includes('véhicule') && (questionLower.includes('quelle') || questionLower.includes('quel'))) ||
                (questionLower.includes('auto') && (questionLower.includes('quelle') || questionLower.includes('quel')))
              )
              
              // Détecter aussi si les options contiennent "voiture 1", "véhicule 1", "je n'en ai qu'une", etc.
              const hasVehicleOptions = Array.isArray(q.options) && q.options.some((opt: string) => {
                if (typeof opt !== 'string') return false
                const optLower = opt.toLowerCase()
                return /voiture\s*[0-9]/i.test(opt) || 
                       /véhicule\s*[0-9]/i.test(opt) ||
                       optLower.includes('voiture 1') || 
                       optLower.includes('voiture 2') || 
                       optLower.includes('voiture 3') ||
                       optLower.includes('véhicule 1') ||
                       optLower.includes('véhicule 2') ||
                       optLower.includes('véhicule 3') ||
                       optLower.includes("je n'en ai qu'une") ||
                       optLower.includes("j'en ai qu'une")
              })
              
              const isVehicleQuestion = hasVehicleKeywords || hasVehicleOptions
              
              console.log(`  Détection pour question ${qIndex + 1}:`, {
                question: q.question,
                hasVehicleKeywords,
                hasVehicleOptions,
                isVehicleQuestion,
                optionsSample: Array.isArray(q.options) ? q.options.slice(0, 3) : 'N/A',
                allOptions: q.options
              })
              
              // FORCER le remplacement si c'est une question sur les véhicules OU si les options contiennent des labels fictifs
              if (isVehicleQuestion) {
                console.log(`✅ REMPLACEMENT FORCÉ pour question ${qIndex + 1}:`, {
                  question: q.question,
                  optionsOriginales: q.options,
                  optionsRemplacees: vehicleOptions
                })
                return {
                  question: q.question,
                  options: vehicleOptions
                }
              } else {
                console.log(`  ⏭️ Question ${qIndex + 1} n'est pas une question sur les véhicules`)
              }
              
              // FORCER le remplacement même si la détection échoue mais que les options contiennent des numéros
              // (sécurité supplémentaire)
              if (Array.isArray(q.options) && q.options.length > 0) {
                const hasNumberedOptions = q.options.some((opt: string) => {
                  if (typeof opt !== 'string') return false
                  return /[0-9]/.test(opt) && (opt.toLowerCase().includes('voiture') || opt.toLowerCase().includes('véhicule'))
                })
                
                if (hasNumberedOptions && vehicles.length > 0) {
                  console.log(`⚠️ Détection de sécurité : options numérotées détectées, remplacement forcé pour question ${qIndex + 1}`)
                  return {
                    question: q.question,
                    options: vehicleOptions
                  }
                }
              }
            } else {
              console.log(`  ⚠️ Question ${qIndex + 1} n'a pas le format attendu`)
            }
            return q
          })
          
          console.log('🔍 APRÈS REMPLACEMENT - Questions traitées:', JSON.stringify(processedQuestions, null, 2))
        } else {
          console.warn('⚠️ Pas de remplacement possible:', {
            vehiclesLength: vehicles.length,
            processedQuestionsIsArray: Array.isArray(processedQuestions),
            processedQuestionsLength: processedQuestions?.length || 0
          })
        }
        
        // S'assurer que toutes les questions ont des options
        const finalQuestions = processedQuestions.map((q: any) => {
          if (typeof q === 'string') {
            // Si c'est juste une string, créer un objet avec des options par défaut
            return {
              question: q,
              options: ['Oui', 'Non', 'Je ne sais pas']
            }
          }
          if (typeof q === 'object' && q.question) {
            // Si c'est un objet mais sans options, ajouter des options par défaut
            if (!q.options || !Array.isArray(q.options) || q.options.length === 0) {
              console.warn(`⚠️ Question sans options détectée: "${q.question}", ajout d'options par défaut`)
              return {
                question: q.question,
                options: ['Oui', 'Non', 'Je ne sais pas']
              }
            }
            return q
          }
          return q
        })

        console.log('✅ Questions finales avec options garanties:', JSON.stringify(finalQuestions, null, 2))

        // Nettoyer le recommended_service pour ne garder qu'un seul service
        let cleanedRecommendedService = parsed.recommended_service || null
        if (cleanedRecommendedService) {
          // Si le service contient plusieurs services séparés par des virgules, des "ou", etc.
          // Extraire seulement le premier service
          const serviceString = cleanedRecommendedService.toString().trim()
          
          // Détecter si plusieurs services sont présents (virgule, "ou", "et", etc.)
          if (serviceString.includes(',') || 
              serviceString.includes(' ou ') || 
              serviceString.includes(' et ') ||
              serviceString.includes(' / ') ||
              serviceString.includes(' | ')) {
            // Extraire tous les services
            const services = serviceString
              .split(/[,/|]| ou | et /i)
              .map((s: string) => s.trim())
              .filter((s: string) => s.length > 0)
            
            // Choisir le service le plus évident selon la logique :
            // 1. Les services spécifiques sont plus prioritaires que le diagnostic générique
            // 2. "Contrôle freinage" est plus spécifique que "Diagnostic électronique" pour les problèmes de freinage
            // 3. Prioriser les services spécifiques sur les génériques
            const servicePriority: Record<string, number> = {
              'contrôle freinage': 1, // Plus spécifique, priorité la plus haute
              'contrôle technique': 1,
              'réparation moteur': 1,
              'réparation carrosserie': 1,
              'vidange': 2,
              'diagnostic électronique': 3, // Service générique, moins prioritaire
            }
            
            // Trouver le service le plus prioritaire
            let bestService = services[0] // Par défaut, le premier
            let bestPriority = servicePriority[services[0]?.toLowerCase()] || 999
            
            for (const service of services) {
              const serviceLower = service.toLowerCase()
              const priority = servicePriority[serviceLower] || 999
              
              // Si on trouve un service plus prioritaire (nombre plus petit = plus prioritaire)
              if (priority < bestPriority) {
                bestService = service
                bestPriority = priority
              }
            }
            
            console.log('⚠️ Plusieurs services détectés, sélection du service le plus évident (Hugging Face):', {
              original: serviceString,
              services: services,
              selected: bestService,
              priority: bestPriority
            })
            
            cleanedRecommendedService = bestService
          }
        }

        return {
          causes: parsed.causes || [],
          urgency: parsed.urgency || null,
          recommended_service: cleanedRecommendedService,
          service_id: cleanedRecommendedService ? (SERVICE_MAPPING[cleanedRecommendedService?.toLowerCase()] || 'diagnostic') : undefined,
          needs_more_info: parsed.needs_more_info || false,
          diagnostic_complete: parsed.diagnostic_complete || false,
          suggested_questions: finalQuestions,
        }
      } catch (parseError) {
        // Fallback si le parsing échoue - retourner des questions vides pour forcer l'IA à générer
        console.error('❌ Erreur lors du parsing de la réponse IA (Hugging Face):', parseError)
        // Ne pas retourner de questions pré-définies - l'IA doit tout générer dynamiquement
        return {
          causes: [],
          urgency: null,
          recommended_service: null,
          needs_more_info: true,
          diagnostic_complete: false,
          suggested_questions: [], // Vide - l'IA doit générer ses propres questions
        }
      }
    } else {
      throw new Error(`Unsupported AI provider: ${AI_API_PROVIDER}`)
    }
  } catch (error: any) {
    console.error('❌ Erreur lors de l\'analyse IA:', error)
    // Propager l'erreur pour qu'elle soit gérée par l'appelant
    throw error
  }
}

// POST : Créer un message et obtenir la réponse de l'IA
export async function POST(request: NextRequest) {
  try {
    let body
    try {
      body = await request.json()
    } catch (e) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    const { conversationId, message, userId, vehicleId, vehicles, profile } = body

    if (!message || !userId) {
      return NextResponse.json(
        { error: 'Message and userId are required' },
        { status: 400 }
      )
    }

    // Log détaillé des véhicules reçus
    console.log('📥 Véhicules reçus dans l\'API:', {
      count: vehicles?.length || 0,
      vehicles: vehicles || [],
      profile: profile ? `${profile.first_name} ${profile.last_name}` : 'Aucun'
    })
    
    if (!vehicles || vehicles.length === 0) {
      console.warn('⚠️ ATTENTION: Aucun véhicule reçu dans l\'API ! Vérifiez que les véhicules sont bien chargés côté client.')
    } else {
      vehicles.forEach((v: any, i: number) => {
        console.log(`  Véhicule ${i + 1}:`, {
          id: v.id,
          brand: v.brand,
          model: v.model,
          year: v.year,
          license_plate: v.license_plate,
          fuel_type: v.fuel_type
        })
      })
    }

    // Obtenir le client Supabase Admin (avec fallback pour le développement local)
    let supabaseAdminClient
    try {
      supabaseAdminClient = getSupabaseAdmin()
    } catch (error: any) {
      console.error('❌ Erreur lors de l\'initialisation du client Supabase Admin:', error)
      return NextResponse.json(
        { error: 'Server configuration error', details: error.message || 'Supabase environment variables are missing' },
        { status: 500 }
      )
    }

    // Vérifier que l'utilisateur existe
    const { data: flyAccount, error: accountError } = await supabaseAdminClient
      .from('fly_accounts')
      .select('id')
      .eq('auth_user_id', userId)
      .single()

    if (accountError || !flyAccount) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 401 }
      )
    }

    let conversationIdToUse = conversationId

    // Créer une nouvelle conversation si nécessaire
    if (!conversationIdToUse) {
      // Vérifier que la table existe
      const { data: newConversation, error: convError } = await (supabaseAdminClient as any)
        .from('ai_chat_conversations')
        .insert({
          flynesis_user_id: (flyAccount as any).id,
          vehicle_id: vehicleId || null,
          status: 'active',
        })
        .select()
        .single()

      if (convError) {
        console.error('❌ Erreur lors de la création de la conversation:', convError)
        
        // Vérifier si c'est une erreur de table inexistante
        if (convError.code === '42P01' || convError.message?.includes('does not exist')) {
          return NextResponse.json(
            { 
              error: 'Database table not found', 
              details: 'The ai_chat_conversations table does not exist. Please apply the migration SQL first.',
              code: 'TABLE_NOT_FOUND'
            },
            { status: 500 }
          )
        }
        
        return NextResponse.json(
          { error: 'Failed to create conversation', details: convError.message },
          { status: 500 }
        )
      }

      if (!newConversation) {
        return NextResponse.json(
          { error: 'Failed to create conversation', details: 'No conversation returned' },
          { status: 500 }
        )
      }

      conversationIdToUse = (newConversation as any).id
    }

    // Récupérer l'historique de la conversation pour le contexte
    const { data: previousMessages } = await (supabaseAdminClient as any)
      .from('ai_chat_messages')
      .select('role, content')
      .eq('conversation_id', conversationIdToUse)
      .order('created_at', { ascending: true })

    const conversationHistory = (previousMessages || []).map((msg: any) => ({
      role: msg.role,
      content: msg.content,
    }))
    
    // Log de l'historique pour debug
    console.log('📜 Historique de la conversation:', {
      messagesCount: conversationHistory.length,
      history: conversationHistory.map((m: {role: string, content: string}) => `${m.role}: ${m.content.substring(0, 100)}...`).join('\n')
    })

    // Enregistrer le message de l'utilisateur
    const { data: userMessageRecord, error: messageError } = await (supabaseAdminClient as any)
      .from('ai_chat_messages')
      .insert({
        conversation_id: conversationIdToUse,
        role: 'user',
        content: message,
      })
      .select()
      .single()

    if (messageError) {
      return NextResponse.json(
        { error: 'Failed to save user message', details: messageError.message },
        { status: 500 }
      )
    }

    // Sauvegarder le message de l'utilisateur pour le retourner dans la réponse
    const savedUserMessage = userMessageRecord

    // Analyser le problème avec l'IA (avec l'historique de conversation)
    let aiAnalysis: AIAnalysis
    let aiResponse = ''

    // Normaliser les véhicules pour s'assurer qu'ils sont bien formatés
    const normalizedVehicles = (vehicles || []).map((v: any) => ({
      id: v.id || '',
      brand: v.brand || 'Marque inconnue',
      model: v.model || 'Modèle inconnu',
      license_plate: v.license_plate || null,
      year: v.year || null,
      fuel_type: v.fuel_type || null,
    }))

    console.log('🔍 Avant analyse IA:', {
      vehiclesCount: normalizedVehicles.length,
      vehicles: normalizedVehicles,
      profile: profile ? `${profile.first_name} ${profile.last_name}` : 'Aucun',
      vehiclesRaw: vehicles
    })

    if (normalizedVehicles.length === 0) {
      console.warn('⚠️ ATTENTION: Aucun véhicule normalisé à passer à l\'IA !')
    } else {
      normalizedVehicles.forEach((v: any, i: number) => {
        const vehicleLabel = `${v.brand} ${v.model}${v.year ? ` (${v.year})` : ''}${v.license_plate ? ` - ${v.license_plate}` : ''}`
        console.log(`  ✅ Véhicule ${i + 1} normalisé: ${vehicleLabel}`)
      })
    }

    try {
      aiAnalysis = await analyzeProblemWithAI(message, conversationHistory, normalizedVehicles, profile || null)
      
      console.log('📊 Résultat analyse IA:', {
        needs_more_info: aiAnalysis.needs_more_info,
        suggested_questions_count: aiAnalysis.suggested_questions?.length || 0,
        suggested_questions: aiAnalysis.suggested_questions
      })
      
      // Détection automatique : forcer un diagnostic complet si le client a répondu à 3+ questions
      const userMessagesCount = conversationHistory.filter((msg: any) => msg.role === 'user').length + 1
      if (userMessagesCount >= 3 && aiAnalysis.needs_more_info) {
        console.log('⚠️ DÉTECTION AUTOMATIQUE : Le client a répondu à 3+ questions, forçage d\'un diagnostic complet')
        
        // Analyser l'historique pour extraire les informations collectées
        const allUserMessages = [...conversationHistory.filter((msg: any) => msg.role === 'user'), { role: 'user', content: message }]
        const allAssistantMessages = conversationHistory.filter((msg: any) => msg.role === 'assistant')
        
        // Détecter si l'IA pose des questions génériques qui ignorent le contexte
        const hasGenericQuestions = aiAnalysis.suggested_questions?.some((q: any) => {
          const questionText = typeof q === 'string' ? q : q.question || ''
          const questionLower = questionText.toLowerCase()
          
          // Détecter les questions génériques qui ignorent le contexte
          const genericPatterns = [
            /où se situe.*problème/i,
            /où se trouve.*problème/i,
            /où.*problème/i,
            /depuis quand.*problème/i,
            /le problème survient/i,
            /en permanence ou seulement/i
          ]
          
          // Si on parle déjà d'un voyant sur le tableau de bord, ces questions sont génériques
          const isAboutDashboardLight = allUserMessages.some((msg: any) => 
            msg.content.toLowerCase().includes('voyant') && 
            (msg.content.toLowerCase().includes('tableau') || msg.content.toLowerCase().includes('tableau de bord'))
          )
          
          if (isAboutDashboardLight && genericPatterns.some(pattern => pattern.test(questionLower))) {
            return true
          }
          
          return false
        })
        
        if (hasGenericQuestions || userMessagesCount >= 4) {
          console.log('⚠️ DÉTECTION : Questions génériques détectées OU 4+ réponses, génération d\'un diagnostic complet')
          
          // Appeler l'IA à nouveau avec un message spécial pour générer le diagnostic
          try {
            const diagnosticAnalysis = await analyzeProblemWithAI(
              `DIAGNOSTIC REQUIS: Le client a déjà répondu à ${userMessagesCount} question(s). Analyse TOUTES les réponses du client dans l'historique de cette conversation et donne un diagnostic complet avec causes, urgence et service recommandé. Ne pose plus de questions.`,
              conversationHistory,
              normalizedVehicles,
              profile || null
            )
            
            // Utiliser le diagnostic généré si l'IA a généré des causes
            if (diagnosticAnalysis.causes && diagnosticAnalysis.causes.length > 0) {
              aiAnalysis = {
                ...diagnosticAnalysis,
                needs_more_info: false,
                diagnostic_complete: true,
                suggested_questions: [],
              }
            } else {
              // Fallback : forcer un diagnostic même sans causes détaillées
              aiAnalysis = {
                ...aiAnalysis,
                needs_more_info: false,
                diagnostic_complete: true,
                suggested_questions: [],
                causes: aiAnalysis.causes.length > 0 ? aiAnalysis.causes : ['Problème détecté nécessitant un diagnostic professionnel'],
                urgency: aiAnalysis.urgency || 'moderate',
                recommended_service: aiAnalysis.recommended_service || 'Diagnostic électronique',
              }
            }
            
            console.log('✅ Diagnostic complet généré:', {
              causes: aiAnalysis.causes,
              urgency: aiAnalysis.urgency,
              recommended_service: aiAnalysis.recommended_service
            })
          } catch (diagnosticError) {
            console.error('❌ Erreur lors de la génération du diagnostic:', diagnosticError)
            // Fallback : forcer un diagnostic même sans causes détaillées
            aiAnalysis = {
              ...aiAnalysis,
              needs_more_info: false,
              diagnostic_complete: true,
              suggested_questions: [],
              causes: aiAnalysis.causes.length > 0 ? aiAnalysis.causes : ['Problème détecté nécessitant un diagnostic professionnel'],
              urgency: aiAnalysis.urgency || 'moderate',
              recommended_service: aiAnalysis.recommended_service || 'Diagnostic électronique',
            }
          }
        }
      }
      
      // Log détaillé des questions pour vérifier le remplacement
      if (aiAnalysis.suggested_questions && aiAnalysis.suggested_questions.length > 0) {
        aiAnalysis.suggested_questions.forEach((q: any, i: number) => {
          if (typeof q === 'object' && q.question && q.options) {
            console.log(`  Question ${i + 1}: "${q.question}"`, {
              options: q.options,
              optionsCount: q.options.length,
              hasVehicleOptions: q.options.some((opt: string) => /voiture\s*[0-9]/i.test(opt))
            })
          }
        })
      }
      
      // Vérifier si c'est une salutation
      if (aiAnalysis.is_greeting) {
        // Réponse conversationnelle pour les salutations
        aiResponse = `Bonjour ! 👋 Je suis l'assistant IA de CarsLink, spécialisé en diagnostic automobile.

Je vais vous poser quelques questions pour identifier précisément le problème de votre véhicule. Décrivez-moi simplement ce qui ne va pas, par exemple :
- "J'ai un bruit au freinage"
- "Un voyant s'allume sur mon tableau de bord"
- "Ma voiture fait des à-coups"

Comment puis-je vous aider aujourd'hui ?`
      } else if (aiAnalysis.is_off_topic) {
        // Vérifier si c'est une menace de sécurité
        const isSecurityThreat = /(DROP\s+TABLE|DELETE\s+FROM|UPDATE\s+SET|INSERT\s+INTO|SELECT\s+\*|rm\s+-rf|\$\(|exec\(|eval\(|password|mot\s+de\s+passe|clé\s+api|api\s+key|secret|admin|ssh|command|commande|exécut|injection|falsifi|voler|faux\s+papiers|harceler|insulte|raciste|porn|illégal)/i.test(message)
        
        if (isSecurityThreat) {
          // Réponse pour les menaces de sécurité
          aiResponse = `Désolé, je ne peux pas vous aider pour cette demande. Si vous pensez que c'est nécessaire, contactez l'équipe sécurité ou l'administrateur via CarsLinkSupport.`
        } else {
          // Réponse pour les questions hors sujet
          aiResponse = `Désolé, je suis spécialisé uniquement dans le diagnostic automobile et les services de garage CarsLink. 🚗

Je peux vous aider avec :
- Les problèmes techniques de votre véhicule
- Les diagnostics de panne
- Les recommandations de services garage
- Les questions sur la mécanique automobile

Pouvez-vous me décrire un problème lié à votre véhicule ?`
        }
      } else if (aiAnalysis.needs_more_info && aiAnalysis.suggested_questions && aiAnalysis.suggested_questions.length > 0) {
        // Mode Akinator : poser des questions guidées avec options
        const questionsText = aiAnalysis.suggested_questions.map((qObj, i) => {
          if (typeof qObj === 'string') {
            // Ancien format (rétrocompatibilité)
            return `${i + 1}. ${qObj}`
          } else {
            // Nouveau format avec options
            return `${i + 1}. ${qObj.question}`
          }
        }).join('\n')
        
        aiResponse = `Pour mieux identifier votre problème, j'aimerais vous poser quelques questions simples :\n\n${questionsText}\n\nCliquez sur les options ci-dessous pour répondre facilement.`
      } else if (aiAnalysis.diagnostic_complete && aiAnalysis.causes.length > 0) {
        // Diagnostic complet
        const urgencyEmoji = {
          urgent: '🔴',
          moderate: '🟡',
          low: '🟢',
        }[aiAnalysis.urgency || 'moderate'] || '🟡'

        const urgencyText = {
          urgent: 'Urgent',
          moderate: 'Modéré',
          low: 'Faible',
        }[aiAnalysis.urgency || 'moderate'] || 'Modéré'

        aiResponse = `J'ai analysé votre problème. Voici mon diagnostic :

**Causes probables :**
${aiAnalysis.causes.map((cause, i) => `${i + 1}. ${cause}`).join('\n')}

**Niveau d'urgence :** ${urgencyEmoji} ${urgencyText}

**Service recommandé :** ${aiAnalysis.recommended_service}

Souhaitez-vous réserver un rendez-vous pour ce service ?`
      } else {
        // Fallback : l'IA doit générer ses propres questions dynamiquement
        // Si on arrive ici, c'est que l'IA n'a pas généré de questions, donc on affiche un message générique
        aiResponse = `Pour mieux identifier votre problème, j'aimerais vous poser quelques questions. Pouvez-vous me donner plus de détails sur ce qui ne va pas avec votre véhicule ?`
      }
    } catch (aiError: any) {
      console.error('❌ Erreur lors de l\'analyse IA:', aiError)
      console.error('❌ Détails de l\'erreur:', {
        message: aiError.message,
        stack: aiError.stack,
        name: aiError.name,
        response: aiError.response,
        status: aiError.status,
        AI_API_KEY: AI_API_KEY ? `${AI_API_KEY.substring(0, 10)}...` : 'NON DÉFINIE',
        AI_API_URL: AI_API_URL,
        AI_MODEL: AI_MODEL,
        AI_API_PROVIDER: AI_API_PROVIDER,
      })
      
      // En cas d'erreur, retourner le message d'indisponibilité demandé
      aiAnalysis = {
        causes: ['Service temporairement indisponible'],
        urgency: 'moderate',
        recommended_service: 'Diagnostic électronique',
        service_id: 'diagnostic',
      }
      aiResponse = '🚧 Le service CarsLink Assistant est temporairement indisponible. Réessayez plus tard.'
    }

    // Enregistrer la réponse de l'IA
    const { data: aiMessage, error: aiMessageError } = await (supabaseAdminClient as any)
      .from('ai_chat_messages')
      .insert({
        conversation_id: conversationIdToUse,
        role: 'assistant',
        content: aiResponse,
        ai_analysis: aiAnalysis,
      })
      .select()
      .single()

    if (aiMessageError) {
      return NextResponse.json(
        { error: 'Failed to save AI message', details: aiMessageError.message },
        { status: 500 }
      )
    }

    // Mettre à jour la conversation
    await (supabaseAdminClient as any)
      .from('ai_chat_conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationIdToUse)

    // Log final avant envoi de la réponse
    console.log('📤 Envoi de la réponse finale:', {
      suggestedQuestionsCount: aiAnalysis.suggested_questions?.length || 0,
      suggestedQuestions: aiAnalysis.suggested_questions
    })

    return NextResponse.json({
      success: true,
      conversationId: conversationIdToUse,
      userMessage: savedUserMessage, // Retourner le message de l'utilisateur enregistré dans la base
      message: aiMessage,
      analysis: aiAnalysis,
      suggestedQuestions: aiAnalysis.suggested_questions || [],
    })
  } catch (error: any) {
    console.error('❌ Erreur dans /api/ai-chat POST:', error)
    
    // S'assurer de toujours retourner du JSON
    try {
      return NextResponse.json(
        { 
          error: 'Internal server error', 
          details: process.env.NODE_ENV === 'development' ? error.message : 'Une erreur est survenue'
        },
        { status: 500 }
      )
    } catch (e) {
      // En cas d'erreur lors de la création de la réponse JSON, retourner une réponse simple
      return new NextResponse(
        JSON.stringify({ error: 'Internal server error' }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }
  }
}

// GET : Récupérer les messages d'une conversation
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const conversationId = searchParams.get('conversationId')
    const userId = searchParams.get('userId')

    if (!conversationId || !userId) {
      return NextResponse.json(
        { error: 'conversationId and userId are required' },
        { status: 400 }
      )
    }

    // Obtenir le client Supabase Admin (avec fallback pour le développement local)
    let supabaseAdminClient
    try {
      supabaseAdminClient = getSupabaseAdmin()
    } catch (error: any) {
      console.error('❌ Erreur lors de l\'initialisation du client Supabase Admin:', error)
      return NextResponse.json(
        { error: 'Server configuration error', details: error.message || 'Supabase environment variables are missing' },
        { status: 500 }
      )
    }

    // Vérifier que l'utilisateur existe
    const { data: flyAccount, error: accountError } = await supabaseAdminClient
      .from('fly_accounts')
      .select('id')
      .eq('auth_user_id', userId)
      .single()

    if (accountError || !flyAccount) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 401 }
      )
    }

    // Récupérer les messages de la conversation
    const { data: messages, error: messagesError } = await (supabaseAdminClient as any)
      .from('ai_chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (messagesError) {
      return NextResponse.json(
        { error: 'Failed to fetch messages', details: messagesError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      messages,
    })
  } catch (error: any) {
    console.error('❌ Erreur dans GET /api/ai-chat:', error)
    
    // S'assurer de toujours retourner du JSON
    try {
      return NextResponse.json(
        { 
          error: 'Internal server error', 
          details: process.env.NODE_ENV === 'development' ? error.message : 'Une erreur est survenue'
        },
        { status: 500 }
      )
    } catch (e) {
      // En cas d'erreur lors de la création de la réponse JSON, retourner une réponse simple
      return new NextResponse(
        JSON.stringify({ error: 'Internal server error' }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }
  }
}

// DELETE : Supprimer une conversation
export async function DELETE(request: NextRequest) {
  try {
    let body
    try {
      body = await request.json()
    } catch (e) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    const { conversationId, userId } = body

    if (!conversationId || !userId) {
      return NextResponse.json(
        { error: 'conversationId and userId are required' },
        { status: 400 }
      )
    }

    // Obtenir le client Supabase Admin
    let supabaseAdminClient
    try {
      supabaseAdminClient = getSupabaseAdmin()
    } catch (error: any) {
      console.error('❌ Erreur lors de l\'initialisation du client Supabase Admin:', error)
      return NextResponse.json(
        { error: 'Server configuration error', details: error.message || 'Supabase environment variables are missing' },
        { status: 500 }
      )
    }

    // Vérifier que l'utilisateur existe
    const { data: flyAccount, error: accountError } = await supabaseAdminClient
      .from('fly_accounts')
      .select('id')
      .eq('auth_user_id', userId)
      .single()

    if (accountError || !flyAccount) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 401 }
      )
    }

    // Vérifier que la conversation appartient à l'utilisateur
    const { data: conversation, error: convError } = await (supabaseAdminClient as any)
      .from('ai_chat_conversations')
      .select('id, flynesis_user_id')
      .eq('id', conversationId)
      .single()

    if (convError || !conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    if (conversation.flynesis_user_id !== (flyAccount as any).id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Supprimer tous les messages de la conversation
    const { error: messagesError } = await (supabaseAdminClient as any)
      .from('ai_chat_messages')
      .delete()
      .eq('conversation_id', conversationId)

    if (messagesError) {
      console.error('❌ Erreur lors de la suppression des messages:', messagesError)
      return NextResponse.json(
        { error: 'Failed to delete messages', details: messagesError.message },
        { status: 500 }
      )
    }

    // Supprimer la conversation
    const { error: deleteError } = await (supabaseAdminClient as any)
      .from('ai_chat_conversations')
      .delete()
      .eq('id', conversationId)

    if (deleteError) {
      console.error('❌ Erreur lors de la suppression de la conversation:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete conversation', details: deleteError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Conversation deleted successfully',
    })
  } catch (error: any) {
    console.error('❌ Erreur dans DELETE /api/ai-chat:', error)
    
    try {
      return NextResponse.json(
        { 
          error: 'Internal server error', 
          details: process.env.NODE_ENV === 'development' ? error.message : 'Une erreur est survenue'
        },
        { status: 500 }
      )
    } catch (e) {
      return new NextResponse(
        JSON.stringify({ error: 'Internal server error' }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }
  }
}
