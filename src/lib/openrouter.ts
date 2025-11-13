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

  for (const m of candidates) {
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
        continue;
      }
      if (res.status === 429) {
        // rate limit -> try next model
        lastError = new Error("RATE_LIMIT");
        continue;
      }
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`HTTP ${res.status}: ${txt.slice(0, 400)}`);
      }

      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content?.trim();
      if (!content) throw new Error("No content in OpenRouter response");

      return { model: m, content };
    } catch (e) {
      lastError = e;
      // try next fallback
      continue;
    }
  }

  throw lastError ?? new Error("All OpenRouter calls failed");
}

