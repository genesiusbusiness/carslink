// src/lib/ebay/config.ts
// Configuration sécurisée pour l'API eBay (serveur uniquement)

/**
 * Configuration de l'API eBay
 * 
 * Pour obtenir vos clés API :
 * 1. Allez sur https://developer.ebay.com/
 * 2. Connectez-vous avec votre compte eBay Developer
 * 3. Allez dans "My Account" > "Keys & Tokens"
 * 4. Créez une nouvelle application ou utilisez une existante
 * 5. Copiez votre App ID (Client ID) et Client Secret
 */

// URLs de base de l'API eBay
export const EBAY_API_BASE_URL = {
  sandbox: "https://api.sandbox.ebay.com",
  production: "https://api.ebay.com",
}

// Browse API endpoints
export const EBAY_BROWSE_API = {
  search: "/buy/browse/v1/item_summary/search",
  getItem: "/buy/browse/v1/item",
  getItemByLegacyId: "/buy/browse/v1/item/get_item_by_legacy_id",
  getItems: "/buy/browse/v1/item",
  getItemsByItemGroup: "/buy/browse/v1/item/get_items_by_item_group",
  checkCompatibility: "/buy/browse/v1/item/{item_id}/check_compatibility",
}

// Lire les clés API depuis les variables d'environnement
// ⚠️ SÉCURITÉ: Les clés API DOIVENT être configurées dans les variables d'environnement
// Sur AWS Amplify: Configurez EBAY_APP_ID et EBAY_CLIENT_SECRET dans Environment Variables
// En local: Créez un fichier .env.local avec ces variables
// ⚠️ NE JAMAIS hardcoder les clés API dans le code source

export const EBAY_APP_ID = process.env.EBAY_APP_ID || process.env.EBAY_CLIENT_ID || undefined;
export const EBAY_CLIENT_SECRET = process.env.EBAY_CLIENT_SECRET || undefined;
export const EBAY_DEV_ID = process.env.EBAY_DEV_ID || undefined; // Optionnel pour certaines APIs
export const EBAY_ENVIRONMENT = (process.env.EBAY_ENVIRONMENT || "sandbox") as "sandbox" | "production";

// URL de base selon l'environnement
export const EBAY_BASE_URL = EBAY_API_BASE_URL[EBAY_ENVIRONMENT];

/**
 * Vérifie que les variables d'environnement eBay sont configurées
 * @throws {Error} Si les clés requises sont manquantes
 */
export function ensureEbayEnv() {
  if (!EBAY_APP_ID) {
    throw new Error("Missing EBAY_APP_ID. Please configure EBAY_APP_ID in environment variables (AWS Amplify or .env.local)");
  }
  
  if (!EBAY_CLIENT_SECRET) {
    throw new Error("Missing EBAY_CLIENT_SECRET. Please configure EBAY_CLIENT_SECRET in environment variables (AWS Amplify or .env.local)");
  }
  
  console.log('🔑 Configuration eBay:', {
    appIdLength: EBAY_APP_ID.length,
    appIdPrefix: `${EBAY_APP_ID.substring(0, 10)}...`,
    environment: EBAY_ENVIRONMENT,
    baseUrl: EBAY_BASE_URL,
    hasClientSecret: !!EBAY_CLIENT_SECRET,
    hasDevId: !!EBAY_DEV_ID,
  });
}

/**
 * Obtient un Application Access Token pour les appels API publics
 * @returns Le token d'accès
 */
export async function getEbayAccessToken(): Promise<string> {
  ensureEbayEnv();
  
  // Pour l'API Browse, on peut utiliser un Application Access Token
  // ou un User Access Token selon les besoins
  
  // TODO: Implémenter l'obtention du token
  // Voir: https://developer.ebay.com/api-docs/static/oauth-application-credentials.html
  
  throw new Error("getEbayAccessToken not yet implemented");
}

