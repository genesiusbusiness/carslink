// src/lib/ai/openrouter.ts
// Configuration sécurisée pour OpenRouter (serveur uniquement)

export const OPENROUTER_URL = process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1";

// Lire la clé API depuis les variables d'environnement
// ⚠️ SÉCURITÉ: La clé API DOIT être configurée dans les variables d'environnement
// Sur AWS Amplify: Configurez OPENROUTER_API_KEY dans Environment Variables
// En local: Créez un fichier .env.local avec OPENROUTER_API_KEY=votre_clé
// ⚠️ NE JAMAIS hardcoder la clé API dans le code source
export const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_KEY || undefined;

/**
 * Construit les en-têtes OpenRouter requis
 * ⚠️ IMPORTANT: Tous ces en-têtes sont requis pour éviter la désactivation de la clé API
 */
export function getOpenRouterHeaders() {
  const SITE = process.env.OPENROUTER_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || '';
  const REFERER = process.env.OPENROUTER_REFERER || SITE || '';
  
  return {
    "Authorization": `Bearer ${OPENROUTER_KEY}`,
    "Content-Type": "application/json",
    "HTTP-Referer": REFERER,
    "X-Title": "CarsLink Assistant",
    "X-Source": SITE,
    "Referer": REFERER,
  };
}

// Pour compatibilité avec l'ancien code
export const OPENROUTER_HEADERS = getOpenRouterHeaders();

// ⚠️ LISTE STRICTEMENT GRATUITE - AUCUN MODÈLE PAYANT
// Tous les modèles ci-dessous sont 100% GRATUITS (suffixe :free ou modèles gratuits d'OpenRouter)
// ⚠️ NE JAMAIS ajouter de modèles payants à cette liste
// ⚠️ Cette liste est la SEULE source de modèles autorisés - aucun autre modèle ne sera utilisé
export const FREE_MODELS = [
  "openrouter/polaris-alpha", // Modèle gratuit OpenRouter
  "deepseek/deepseek-chat-v3.1:free",
  "google/gemini-2.0-flash-exp:free",
  "google/gemini-flash-1.5:free",
  "deepseek/deepseek-r1-0528:free",
  "deepseek/deepseek-r1-0528-qwen3-8b:free",
  "google/gemma-3n-e4b-it:free",
  "google/gemma-3n-e2b-it:free",
  "nvidia/nemotron-nano-12b-v2-vl:free",
  "meituan/longcat-flash-chat:free",
  "openai/gpt-oss-20b:free",
  "z-ai/glm-4.5-air:free",
  "qwen/qwen3-coder:free",
  "cognitivecomputations/dolphin-mistral-24b-venice-edition:free",
  // Modèles de fallback supplémentaires (anciens modèles gratuits qui fonctionnent encore)
  "mistralai/mistral-7b-instruct:free",
] as const;

export type FreeModel = (typeof FREE_MODELS)[number];

/**
 * Vérifie que les variables d'environnement OpenRouter sont configurées
 * @throws {Error} Si OPENROUTER_API_KEY est manquante
 */
export function ensureServerEnv() {
  if (!OPENROUTER_KEY) {
    throw new Error("Missing OPENROUTER_API_KEY. Please configure OPENROUTER_API_KEY in environment variables (AWS Amplify or .env.local)");
  }
  
  // Vérifier si la clé vient des variables d'environnement
  const apiKeyFromEnv = !!(process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_KEY);
  
  if (!apiKeyFromEnv) {
    throw new Error("OPENROUTER_API_KEY must be set in environment variables. Never hardcode API keys in source code.");
  }
  
  // Log pour débogage (sans exposer la clé complète)
  console.log('🔑 Configuration OpenRouter:', {
    apiKeyLength: OPENROUTER_KEY.length,
    apiKeyPrefix: `${OPENROUTER_KEY.substring(0, 20)}...`,
    apiKeySuffix: `...${OPENROUTER_KEY.substring(OPENROUTER_KEY.length - 5)}`,
    apiKeyFromEnv: true,
    apiKeySource: 'ENV',
    envVarExists: !!process.env.OPENROUTER_API_KEY,
    envVarLength: process.env.OPENROUTER_API_KEY?.length || 0,
    baseUrl: OPENROUTER_URL,
    referer: process.env.OPENROUTER_REFERER || process.env.OPENROUTER_SITE_URL || '',
  });
}

/**
 * Valide qu'un modèle est dans la liste blanche des modèles gratuits
 * @param model - Le modèle à valider
 * @returns true si le modèle est autorisé, false sinon
 */
export function isValidFreeModel(model: string): model is FreeModel {
  return (FREE_MODELS as readonly string[]).includes(model);
}

/**
 * Appelle l'API OpenRouter avec un modèle spécifique
 * ⚠️ SÉCURITÉ: Valide que le modèle est dans la liste blanche avant l'appel
 * @param model - Le modèle à utiliser (doit être dans FREE_MODELS)
 * @param messages - Les messages à envoyer (system + user)
 * @param options - Options supplémentaires (temperature, max_tokens, etc.)
 * @returns La réponse de l'API OpenRouter
 */
export async function callOpenRouter(
  model: string,
  messages: Array<{ role: string; content: string }>,
  options: {
    temperature?: number;
    max_tokens?: number;
    timeout?: number;
    retries?: number;
  } = {}
) {
  // ⚠️ SÉCURITÉ: Valider que le modèle est dans la liste blanche
  // Si le modèle n'est pas gratuit, utiliser un modèle gratuit par défaut
  if (!isValidFreeModel(model)) {
    console.error(`❌ Modèle non autorisé (payant?): ${model}. Utilisation d'un modèle GRATUIT par défaut.`);
    // Utiliser le premier modèle gratuit disponible
    model = FREE_MODELS[0] || "deepseek/deepseek-chat-v3.1:free";
  }
  
  const { temperature = 0.7, max_tokens = 1500, timeout = 30000, retries = 1 } = options;
  
  // Limiter la taille des messages pour éviter des requêtes trop longues
  const maxMessageLength = 10000;
  const limitedMessages = messages.map(msg => ({
    ...msg,
    content: msg.content.substring(0, maxMessageLength)
  }));

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    // Construire les en-têtes à chaque appel pour garantir qu'ils sont à jour
    const headers = getOpenRouterHeaders();
    
    // Log pour débogage (sans exposer la clé complète)
    console.log(`📤 Appel OpenRouter - Modèle: ${model}, Clé API: ${OPENROUTER_KEY ? `${OPENROUTER_KEY.substring(0, 20)}...${OPENROUTER_KEY.substring(OPENROUTER_KEY.length - 5)}` : 'MANQUANTE'} (longueur: ${OPENROUTER_KEY?.length || 0})`)
    console.log(`📋 En-têtes OpenRouter:`, {
      hasAuthorization: !!headers.Authorization,
      hasHTTPReferer: !!headers["HTTP-Referer"],
      hasXTitle: !!headers["X-Title"],
      hasXSource: !!headers["X-Source"],
      referer: headers["HTTP-Referer"]?.substring(0, 50) || 'MANQUANT',
      site: headers["X-Source"]?.substring(0, 50) || 'MANQUANT',
    })
    
    const res = await fetch(`${OPENROUTER_URL}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        messages: limitedMessages,
        temperature,
        max_tokens,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const text = await res.text();
    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch {
      // Garder le texte pour le débogage
    }
    
    // Log détaillé pour les erreurs 401
    if (res.status === 401 || res.status === 403) {
      console.error(`❌ Erreur d'authentification OpenRouter (${res.status}):`, {
        model,
        status: res.status,
        statusText: res.statusText,
        responseText: text.substring(0, 500),
        apiKeyLength: OPENROUTER_KEY?.length || 0,
        apiKeyPrefix: OPENROUTER_KEY ? `${OPENROUTER_KEY.substring(0, 20)}...` : 'MANQUANTE',
        apiKeyFromEnv: !!process.env.OPENROUTER_API_KEY,
      })
    }

    return {
      ok: res.ok,
      status: res.status,
      json,
      text,
    };
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      return {
        ok: false,
        status: 408,
        json: null,
        text: 'Request timeout',
      };
    }
    throw error;
  }
}

