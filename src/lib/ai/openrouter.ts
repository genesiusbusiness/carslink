// src/lib/ai/openrouter.ts
// Configuration sécurisée pour OpenRouter (serveur uniquement)

export const OPENROUTER_URL = process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1";

// Lire la clé API depuis les variables d'environnement
// Sur AWS Amplify, utilise process.env.OPENROUTER_API_KEY
// En local, utilise le fallback pour le développement
export const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || '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';

export const OPENROUTER_HEADERS = {
  Authorization: `Bearer ${OPENROUTER_KEY}`,
  "Content-Type": "application/json",
  "HTTP-Referer": process.env.OPENROUTER_REFERER ?? "",
  "X-Title": "CarsLink Assistant",
  "X-Source": process.env.OPENROUTER_SITE_URL ?? "",
  "Referer": process.env.OPENROUTER_REFERER ?? process.env.OPENROUTER_SITE_URL ?? "",
};

// Liste **strictement gratuite** de modèles OpenRouter
export const FREE_MODELS = [
  "minimax/minimax-m2:free",
  "openrouter/polaris-alpha",
  "nvidia/nemotron-nano-12b-v2-vl:free",
  "meituan/longcat-flash-chat:free",
  "deepseek/deepseek-chat-v3.1:free",
  "openai/gpt-oss-20b:free",
  "z-ai/glm-4.5-air:free",
  "qwen/qwen3-coder:free",
  "google/gemma-3n-e2b-it:free",
  "cognitivecomputations/dolphin-mistral-24b-venice-edition:free",
  "deepseek/deepseek-r1-0528-qwen3-8b:free",
  "deepseek/deepseek-r1-0528:free",
  "google/gemma-3n-e4b-it:free",
  "google/gemini-2.0-flash-exp:free",
  // Modèles de fallback supplémentaires (anciens modèles qui fonctionnent encore)
  "google/gemini-flash-1.5:free",
  "mistralai/mistral-7b-instruct:free",
] as const;

export type FreeModel = (typeof FREE_MODELS)[number];

/**
 * Vérifie que les variables d'environnement OpenRouter sont configurées
 * @throws {Error} Si OPENROUTER_API_KEY est manquante
 */
export function ensureServerEnv() {
  if (!OPENROUTER_KEY) {
    throw new Error("Missing OPENROUTER_API_KEY");
  }
  
  // Log pour débogage (sans exposer la clé complète)
  console.log('🔑 Configuration OpenRouter:', {
    apiKeyLength: OPENROUTER_KEY.length,
    apiKeyPrefix: `${OPENROUTER_KEY.substring(0, 20)}...`,
    apiKeySuffix: `...${OPENROUTER_KEY.substring(OPENROUTER_KEY.length - 5)}`,
    apiKeyFromEnv: !!process.env.OPENROUTER_API_KEY,
    baseUrl: OPENROUTER_URL,
    referer: process.env.OPENROUTER_REFERER || process.env.OPENROUTER_SITE_URL || '',
  });
}

/**
 * Appelle l'API OpenRouter avec un modèle spécifique
 * @param model - Le modèle à utiliser
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
  } = {}
) {
  const { temperature = 0.7, max_tokens = 1500, timeout = 15000 } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    // Log pour débogage (sans exposer la clé complète)
    console.log(`📤 Appel OpenRouter - Modèle: ${model}, Clé API: ${OPENROUTER_KEY ? `${OPENROUTER_KEY.substring(0, 20)}...${OPENROUTER_KEY.substring(OPENROUTER_KEY.length - 5)}` : 'MANQUANTE'} (longueur: ${OPENROUTER_KEY?.length || 0})`)
    
    const res = await fetch(`${OPENROUTER_URL}/chat/completions`, {
      method: "POST",
      headers: OPENROUTER_HEADERS,
      body: JSON.stringify({
        model,
        messages,
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

