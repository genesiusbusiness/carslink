/**
 * Utilitaire serveur pour valider la présence des variables d'environnement
 * NE PAS EXPORTER CE FICHIER VERS LE CLIENT
 */

export function assertEnv(keys: string[]): { missing: string[]; allPresent: boolean } {
  const missing: string[] = []
  
  for (const key of keys) {
    if (!process.env[key]) {
      missing.push(key)
    }
  }
  
  return {
    missing,
    allPresent: missing.length === 0,
  }
}

export function getEnvOrThrow(key: string, defaultValue?: string): string {
  const value = process.env[key] || defaultValue
  
  if (!value) {
    throw new Error(`Variable d'environnement manquante: ${key}`)
  }
  
  return value
}

