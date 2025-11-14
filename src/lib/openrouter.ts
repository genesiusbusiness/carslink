import type { ChatCompletionMessageParam } from "./types";

export type ModelId =
  | "deepseek/deepseek-chat-v3.1:free"
  | "google/gemma-3n-e2b-it:free"
  | "minimax/minimax-m2:free"
  | "openai/gpt-oss-20b:free";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// Fallback list: try in this order
export const FREE_MODELS: ModelId[] = [
  "deepseek/deepseek-chat-v3.1:free",
  "google/gemma-3n-e2b-it:free",
  "minimax/minimax-m2:free",
  "openai/gpt-oss-20b:free",
];

function headers() {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("Missing OPENROUTER_API_KEY");
  return {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    // facultatif mais recommandé:
    "HTTP-Referer": process.env.OPENROUTER_REFERER || process.env.OPENROUTER_SITE_URL || "https://carslink.flynesis.com",
    "X-Title": "CarsLink Assistant",
  };
}

export async function callOpenRouterChat({
  messages,
  model,
  temperature = 0.3,
  max_tokens = 800,
}: {
  messages: { role: "system" | "user" | "assistant"; content: string }[];
  model?: ModelId;
  temperature?: number;
  max_tokens?: number;
}) {
  const candidates = model ? [model, ...FREE_MODELS.filter(m => m !== model)] : FREE_MODELS;

  let lastError: any = null;
  let rateLimitCount = 0;
  const MAX_RATE_LIMIT_RETRIES = 2; // Nombre maximum de retries pour rate limit
  const BASE_DELAY = 2000; // 2 secondes de base

  for (const m of candidates) {
    let retryCount = 0;
    
    while (retryCount <= MAX_RATE_LIMIT_RETRIES) {
      try {
        const res = await fetch(OPENROUTER_URL, {
          method: "POST",
          headers: headers(),
          body: JSON.stringify({
            model: m,
            messages,
            temperature,
            max_tokens,
          }),
        });

        if (res.status === 401 || res.status === 403) {
          throw new Error("OPENROUTER_AUTH: unauthorized/forbidden");
        }
        if (res.status === 404) {
          // modèle non disponible -> try next model
          lastError = new Error("MODEL_NOT_AVAILABLE");
          break; // Sortir de la boucle while pour essayer le modèle suivant
        }
        if (res.status === 429) {
          // rate limit -> retry avec backoff exponentiel
          rateLimitCount++;
          if (retryCount < MAX_RATE_LIMIT_RETRIES) {
            const delay = BASE_DELAY * Math.pow(2, retryCount); // Backoff exponentiel: 2s, 4s, 8s
            console.warn(`⚠️ Rate limit détecté pour le modèle ${m}. Retry dans ${delay}ms (tentative ${retryCount + 1}/${MAX_RATE_LIMIT_RETRIES + 1})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            retryCount++;
            continue; // Réessayer avec le même modèle
          } else {
            // Tous les retries épuisés pour ce modèle, essayer le suivant
            lastError = new Error("RATE_LIMIT");
            break; // Sortir de la boucle while pour essayer le modèle suivant
          }
        }
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(`HTTP ${res.status}: ${txt.slice(0, 400)}`);
        }

        const data = await res.json();
        const content = data?.choices?.[0]?.message?.content?.trim();
        if (!content) throw new Error("No content in OpenRouter response");

        return { model: m, content };
      } catch (e: any) {
        // Si c'est une erreur réseau ou autre (pas 429), ne pas retry
        if (e?.message !== "RATE_LIMIT" && !e?.message?.includes("429")) {
          lastError = e;
          break; // Sortir de la boucle while pour essayer le modèle suivant
        }
        // Si c'est un rate limit dans le catch (erreur réseau avec rate limit)
        // et qu'on a épuisé les retries, passer au modèle suivant
        if (retryCount >= MAX_RATE_LIMIT_RETRIES) {
          lastError = new Error("RATE_LIMIT");
          break; // Sortir de la boucle while pour essayer le modèle suivant
        }
        // Sinon, retry avec backoff
        const delay = BASE_DELAY * Math.pow(2, retryCount);
        console.warn(`⚠️ Rate limit détecté (exception) pour le modèle ${m}. Retry dans ${delay}ms (tentative ${retryCount + 1}/${MAX_RATE_LIMIT_RETRIES + 1})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        retryCount++;
        // Continuer la boucle while pour réessayer
      }
    }
  }

  // Si tous les modèles ont échoué avec rate limit
  if (rateLimitCount > 0 && lastError?.message === "RATE_LIMIT") {
    throw new Error("RATE_LIMIT");
  }

  throw lastError ?? new Error("All OpenRouter calls failed");
}

