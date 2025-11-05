import { supabase } from './supabaseClient'
import type { FlyAccount } from './supabaseClient'

// ============================================================================
// GESTION DES ERREURS ET SUCCÈS
// ============================================================================

export interface FeedbackMessage {
  type: 'success' | 'error' | 'info' | 'warning'
  message: string
}

export function showError(msg: string): FeedbackMessage {
  return { type: 'error', message: msg }
}

export function showSuccess(msg: string): FeedbackMessage {
  return { type: 'success', message: msg }
}

export function showInfo(msg: string): FeedbackMessage {
  return { type: 'info', message: msg }
}

export function showWarning(msg: string): FeedbackMessage {
  return { type: 'warning', message: msg }
}

// ============================================================================
// VÉRIFICATION DE RÔLE
// ============================================================================

export async function checkRole(
  requiredRoles: Array<'user' | 'business' | 'garage' | 'support' | 'admin' | 'founder' | 'mechanic'>
): Promise<{ authorized: boolean; account: FlyAccount | null; error?: string }> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { authorized: false, account: null, error: 'Non authentifié' }
    }

    const { data: account, error: accountError } = await supabase
      .from('fly_accounts')
      .select('*')
      .eq('auth_user_id', user.id)
      .single()

    if (accountError || !account) {
      return { authorized: false, account: null, error: 'Compte FlyID introuvable' }
    }

    // Gérer les rôles mécaniciens (CarsLinkPro)
    if (requiredRoles.includes('mechanic')) {
      // Vérifier si l'utilisateur est un mécanicien dans carslink_pro_users
      const { data: proUser } = await supabase
        .from('carslink_pro_users')
        .select('*')
        .eq('email', account.email)
        .single()

      if (proUser) {
        return { authorized: true, account }
      }
    }

    const isAuthorized = requiredRoles.includes(account.role)

    return {
      authorized: isAuthorized,
      account,
      error: isAuthorized ? undefined : `Accès refusé. Rôle requis: ${requiredRoles.join(', ')}`
    }
  } catch (error) {
    return {
      authorized: false,
      account: null,
      error: `Erreur de vérification: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
    }
  }
}

// ============================================================================
// OBTENIR LE FLYID DE L'UTILISATEUR ACTUEL
// ============================================================================

export async function getCurrentFlyId(): Promise<string | null> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return null
    }

    const { data: account } = await supabase
      .from('fly_accounts')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    return account?.id || null
  } catch (error) {
    console.error('Erreur lors de la récupération du FlyID:', error)
    return null
  }
}

// ============================================================================
// OBTENIR LE COMPTE FLYID DE L'UTILISATEUR ACTUEL
// ============================================================================

export async function getCurrentFlyAccount(): Promise<FlyAccount | null> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return null
    }

    const { data: account } = await supabase
      .from('fly_accounts')
      .select('*')
      .eq('auth_user_id', user.id)
      .single()

    return account
  } catch (error) {
    console.error('Erreur lors de la récupération du compte FlyID:', error)
    return null
  }
}

// ============================================================================
// JOURNALISATION (LOGS)
// ============================================================================

export async function logAction(
  flyid: string,
  action: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('fly_logs')
      .insert({
        flyid,
        action,
        created_at: new Date().toISOString()
      })

    if (error) {
      console.error('Erreur lors du logging:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Erreur lors du logging:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }
  }
}

// ============================================================================
// SYNCHRONISATION FLYID
// ============================================================================

export async function syncFlyAccount(
  email: string,
  role: 'user' | 'business' | 'garage' | 'support' | 'admin' | 'founder' = 'user'
): Promise<{ success: boolean; account?: FlyAccount; error?: string }> {
  try {
    // Vérifier si le compte existe déjà
    const { data: existing } = await supabase
      .from('fly_accounts')
      .select('*')
      .eq('email', email)
      .maybeSingle()

    if (existing) {
      return { success: true, account: existing }
    }

    // Obtenir l'utilisateur auth
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Utilisateur non authentifié' }
    }

    // Créer le compte FlyID
    const { data: account, error: insertError } = await supabase
      .from('fly_accounts')
      .insert({
        auth_user_id: user.id,
        email,
        role
      })
      .select()
      .single()

    if (insertError || !account) {
      return {
        success: false,
        error: insertError?.message || 'Erreur lors de la création du compte'
      }
    }

    // Créer les permissions par défaut
    await supabase
      .from('fly_permissions')
      .insert({ flyid: account.id })

    // Logger la création
    await logAction(account.id, `Compte FlyID créé avec le rôle: ${role}`)

    return { success: true, account }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }
  }
}

