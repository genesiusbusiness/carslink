/**
 * Utilitaires de chiffrement AES-256-GCM pour CarsLink
 * 
 * ⚠️ IMPORTANT : Ce fichier est UNIQUEMENT pour le serveur (API routes, server actions, edge functions)
 * Ne JAMAIS utiliser ces fonctions côté client (navigateur)
 * 
 * La clé de chiffrement est stockée dans Supabase via la fonction RPC get_app_setting
 * avec la clé 'encryption_key'. Elle est mise en cache en mémoire pour éviter trop d'appels à la DB.
 * 
 * Génération d'une clé sécurisée :
 * node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 * 
 * Pour stocker la clé dans Supabase :
 * - Utiliser la fonction RPC set_app_setting('encryption_key', 'votre_cle_hex_64_caracteres')
 * - Ou insérer directement dans la table app_settings
 */

import crypto from "crypto"
import { createClient } from "@supabase/supabase-js"

// Vérifier que nous sommes côté serveur
if (typeof window !== "undefined") {
  throw new Error(
    "encryption.ts ne peut être utilisé que côté serveur. " +
    "Ne jamais importer ce fichier dans des composants client."
  )
}

const IV_LENGTH = 12 // 96 bits pour GCM (recommandé)
const TAG_LENGTH = 16 // 128 bits pour l'authentification tag
const KEY_LENGTH = 32 // 256 bits pour AES-256

// Configuration Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yxkbvhymsvasknslhpsa.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4a2J2aHltc3Zhc2tuc2xocHNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2NzI1MjQsImV4cCI6MjA3NzI0ODUyNH0.zbE1YiXZXDEgpLkRS9XDU8yt4n4EiQItU_YSoEQveTM'

// Client Supabase pour récupérer la clé (utilise l'anon key car get_app_setting est SECURITY DEFINER)
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})

// Cache en mémoire pour la clé de chiffrement
let cachedEncryptionKey: Buffer | null = null
let cacheTimestamp: number = 0
const CACHE_TTL = 3600000 // 1 heure en millisecondes

/**
 * Récupère la clé de chiffrement depuis Supabase via la fonction RPC get_app_setting
 * La clé est mise en cache en mémoire pour éviter trop d'appels à la base de données
 * @throws Error si la clé n'est pas définie ou invalide
 */
async function getEncryptionKey(): Promise<Buffer> {
  // Vérifier le cache
  const now = Date.now()
  if (cachedEncryptionKey && (now - cacheTimestamp) < CACHE_TTL) {
    return cachedEncryptionKey
  }

  try {
    // Récupérer la clé depuis Supabase via la fonction RPC get_app_setting
    const { data, error } = await supabaseClient
      .rpc('get_app_setting', { setting_key: 'encryption_key' })

    if (error) {
      throw new Error(
        `Erreur lors de la récupération de la clé de chiffrement depuis Supabase: ${error.message}. ` +
        `Assurez-vous que la fonction RPC get_app_setting existe et que la clé 'encryption_key' est définie dans app_settings.`
      )
    }

    if (!data) {
      throw new Error(
        "La clé de chiffrement 'encryption_key' n'est pas définie dans Supabase. " +
        "Utilisez la fonction RPC set_app_setting('encryption_key', 'votre_cle_hex_64_caracteres') " +
        "ou insérez directement dans la table app_settings."
      )
    }

    const keyHex = typeof data === 'string' ? data : String(data)

    // Vérifier que la clé est en hexadécimal et de la bonne longueur
    if (!/^[0-9a-fA-F]{64}$/.test(keyHex)) {
      throw new Error(
        "La clé de chiffrement doit être une chaîne hexadécimale de 64 caractères (32 bytes). " +
        "Générer une clé avec: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
      )
    }

    // Mettre en cache
    cachedEncryptionKey = Buffer.from(keyHex, "hex")
    cacheTimestamp = now

    return cachedEncryptionKey
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error("Erreur inconnue lors de la récupération de la clé de chiffrement")
  }
}

/**
 * Invalide le cache de la clé de chiffrement
 * Utile après une rotation de clé
 */
export function invalidateEncryptionKeyCache(): void {
  cachedEncryptionKey = null
  cacheTimestamp = 0
}

/**
 * Chiffre un texte en utilisant AES-256-GCM
 * 
 * Format de sortie : hex(iv + encrypted + tag)
 * - IV : 12 bytes (96 bits)
 * - Encrypted : variable
 * - Tag : 16 bytes (128 bits)
 * 
 * @param text - Le texte à chiffrer
 * @returns Chaîne hexadécimale contenant IV + données chiffrées + tag d'authentification
 * @throws Error si la clé de chiffrement n'est pas configurée
 */
export async function encrypt(text: string): Promise<string> {
  try {
    const key = await getEncryptionKey()
    const iv = crypto.randomBytes(IV_LENGTH)
    
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv)
    
    // Chiffrer le texte
    const encrypted = Buffer.concat([
      cipher.update(text, "utf8"),
      cipher.final(),
    ])
    
    // Récupérer le tag d'authentification
    const tag = cipher.getAuthTag()
    
    // Concaténer IV + données chiffrées + tag
    const result = Buffer.concat([iv, encrypted, tag])
    
    return result.toString("hex")
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Erreur lors du chiffrement: ${error.message}`)
    }
    throw new Error("Erreur inconnue lors du chiffrement")
  }
}

/**
 * Déchiffre un texte chiffré avec AES-256-GCM
 * 
 * @param hex - Chaîne hexadécimale contenant IV + données chiffrées + tag
 * @returns Le texte déchiffré
 * @throws Error si le format est invalide ou si la clé est incorrecte
 */
export async function decrypt(hex: string): Promise<string> {
  try {
    const key = await getEncryptionKey()
    const buf = Buffer.from(hex, "hex")
    
    // Vérifier la longueur minimale (IV + tag)
    if (buf.length < IV_LENGTH + TAG_LENGTH) {
      throw new Error("Données chiffrées invalides : longueur insuffisante")
    }
    
    // Extraire les composants
    const iv = buf.slice(0, IV_LENGTH)
    const tag = buf.slice(buf.length - TAG_LENGTH)
    const encrypted = buf.slice(IV_LENGTH, buf.length - TAG_LENGTH)
    
    // Créer le déchiffreur
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv)
    decipher.setAuthTag(tag)
    
    // Déchiffrer
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ])
    
    return decrypted.toString("utf8")
  } catch (error) {
    if (error instanceof Error) {
      // Ne pas exposer les détails de l'erreur pour des raisons de sécurité
      if (error.message.includes("Unsupported state or unable to authenticate data")) {
        throw new Error("Échec de l'authentification : données chiffrées invalides ou clé incorrecte")
      }
      throw new Error(`Erreur lors du déchiffrement: ${error.message}`)
    }
    throw new Error("Erreur inconnue lors du déchiffrement")
  }
}

/**
 * Vérifie si une chaîne hexadécimale est un texte chiffré valide
 * (vérifie uniquement le format, pas l'authenticité)
 * 
 * @param hex - Chaîne hexadécimale à vérifier
 * @returns true si le format semble valide
 */
export function isValidEncryptedFormat(hex: string): boolean {
  try {
    if (!/^[0-9a-fA-F]+$/.test(hex)) {
      return false
    }
    
    const buf = Buffer.from(hex, "hex")
    return buf.length >= IV_LENGTH + TAG_LENGTH
  } catch {
    return false
  }
}

/**
 * Génère une nouvelle clé de chiffrement sécurisée
 * À utiliser uniquement pour la génération initiale ou la rotation de clé
 * 
 * @returns Clé hexadécimale de 64 caractères
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(KEY_LENGTH).toString("hex")
}

