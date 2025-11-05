"use client"

import { useState } from 'react'
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Info, AlertCircle, Mail, Shield, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ToastAction } from '@/components/ui/toast'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/use-toast'
import { elegantToasts, showElegantToast } from '@/components/ui/elegant-toast'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendingConfirmation, setResendingConfirmation] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const checkEmailExists = async (email: string): Promise<boolean> => {
    const normalizedEmail = email.toLowerCase().trim()
    
    try {
      // ✅ VÉRIFICATION INTERNE UNIQUEMENT
      // La fonction RPC 'check_email_exists' vérifie UNIQUEMENT dans votre base de données Supabase Flynesis
      // Elle cherche dans auth.users et public.fly_accounts de VOTRE projet Supabase uniquement
      // (celle configurée via NEXT_PUBLIC_SUPABASE_URL dans .env.local)
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('check_email_exists', { email_to_check: normalizedEmail })
      
      // Si la fonction RPC fonctionne et retourne true, l'email existe DANS VOTRE BASE FLYNESIS
      if (!rpcError && rpcData === true) {
        console.log('[checkEmailExists] ✅ Email trouvé dans la base Flynesis via RPC:', normalizedEmail)
        return true
      }
      
      // Si la fonction RPC retourne false explicitement, l'email n'existe PAS dans votre base Flynesis
      if (!rpcError && rpcData === false) {
        console.log('[checkEmailExists] ❌ Email NON TROUVÉ dans la base Flynesis via RPC:', normalizedEmail)
        return false
      }
      
      // Si la fonction RPC échoue (peut-être pas encore déployée ou erreur)
      // On ne peut pas vérifier directement auth.users, donc on considère que l'email n'existe pas
      // C'est plus sûr que de retourner true par erreur
      console.warn('[checkEmailExists] ⚠️ RPC a échoué ou n\'existe pas:', rpcError)
      console.log('[checkEmailExists] Mode sécurité : considérant que l\'email n\'existe PAS dans la base Flynesis')
      
      // Ne PAS vérifier dans fly_accounts car :
      // 1. RLS peut bloquer la requête
      // 2. Un compte peut exister sans compte auth.users
      // 3. La source de vérité pour l'auth est auth.users, pas fly_accounts
      // 4. On veut vérifier UNIQUEMENT via la fonction RPC qui interroge VOTRE base Flynesis
      
      return false
    } catch (err) {
      // En cas d'erreur, considérer que l'email n'existe pas dans votre base Flynesis (par sécurité)
      console.error('[checkEmailExists] ❌ Erreur lors de la vérification dans la base Flynesis:', err)
      return false
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Valider le format de l'email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      toast({
        title: "Email invalide",
        description: "Veuillez entrer une adresse email valide",
        variant: "destructive",
      })
      return
    }
    
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      })

      if (error) throw error

      if (data.session && data.user) {
        // Vérifier si un compte fly_accounts existe déjà (créé automatiquement par le trigger)
        const { data: existingAccount, error: accountError } = await supabase
          .from('fly_accounts')
          .select('id')
          .eq('auth_user_id', data.user.id)
          .maybeSingle()

        // Le compte fly_accounts est généralement créé automatiquement par le trigger handle_new_auth_user()
        // Si le compte n'existe pas encore, attendre un peu et réessayer (le trigger peut prendre du temps)
        if (!existingAccount && accountError) {
          console.warn('Compte fly_accounts non trouvé après connexion, le trigger va le créer automatiquement')
        }

        elegantToasts.loginSuccess()
        router.push('/')
        router.refresh()
      }
    } catch (error: any) {
      // DEBUG: Log pour diagnostiquer
      console.log('[Login] Erreur Supabase:', error.message, 'Code:', error.status)
      
      let errorMessage = "Email ou mot de passe incorrect"
      
      // Analyser l'erreur pour déterminer la vraie cause
      const isEmailNotConfirmed = error.message?.includes('Email not confirmed') || 
                                   error.message?.includes('email_not_confirmed')
      const isInvalidCredentials = error.message?.includes('Invalid login credentials') || 
                                   error.message?.includes('invalid_credentials')
      
      // Si l'erreur est "Invalid credentials", vérifier si l'email existe
      // (Supabase peut retourner "Email not confirmed" même pour un email inexistant)
      if (isEmailNotConfirmed || isInvalidCredentials) {
        // Vérifier si l'email existe vraiment
        const emailExists = await checkEmailExists(email)
        
        console.log('[Login] Email vérifié:', email, 'Existe:', emailExists)
        
        // RÈGLE ABSOLUE : Si l'email n'existe pas, TOUJOURS dire "pas de compte"
        if (!emailExists) {
          elegantToasts.accountNotFound()
          return // Sortir de la fonction ici
        }
      }
      
      // Si on arrive ici, l'email existe vraiment OU l'erreur n'est pas credential-related
      // Traiter les erreurs normales selon le type d'erreur
      if (isEmailNotConfirmed) {
        // Si la confirmation email est désactivée, essayer de confirmer automatiquement
        const handleAutoConfirm = async () => {
          setResendingConfirmation(true)
          try {
            // Essayer d'appeler la fonction RPC pour confirmer automatiquement l'email
            const { data: confirmData, error: confirmError } = await supabase
              .rpc('confirm_user_email', { user_email: email.toLowerCase().trim() })
            
            if (!confirmError && confirmData) {
              // Email confirmé avec succès, essayer de se reconnecter
              showElegantToast({
                title: 'Email confirmé',
                message: 'Votre email a été confirmé automatiquement. Connexion en cours...',
                variant: 'success',
              })
              
              // Attendre un peu puis réessayer la connexion
              setTimeout(async () => {
                try {
                  const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
                    email: email.toLowerCase().trim(),
                    password: password,
                  })
                  
                  if (loginError) throw loginError
                  
                  if (loginData.session && loginData.user) {
                    elegantToasts.loginSuccess()
                    router.push('/')
                    router.refresh()
                  }
                } catch (loginErr: any) {
                  showElegantToast({
                    title: 'Connexion échouée',
                    message: 'La connexion a échoué après la confirmation de l\'email.',
                    subMessage: 'Veuillez réessayer de vous connecter.',
                    variant: 'error',
                  })
                }
              }, 1000)
            } else {
              // La fonction RPC n'existe pas ou a échoué, essayer de renvoyer l'email
              const { error: resendError } = await supabase.auth.resend({
                type: 'signup',
                email: email.toLowerCase().trim(),
                options: {
                  emailRedirectTo: `${window.location.origin}/auth/confirm?next=/`
                }
              })
              
              if (resendError) {
                showElegantToast({
                  title: 'Confirmation requise',
                  message: 'Votre compte nécessite une confirmation manuelle.',
                  subMessage: 'Contactez le support pour activer votre compte.',
                  variant: 'error',
                })
              } else {
                showElegantToast({
                  title: 'Email envoyé',
                  message: 'Un nouvel email de confirmation a été envoyé à votre adresse.',
                  variant: 'info',
                })
              }
            }
          } catch (err) {
            console.error('Erreur lors de la confirmation automatique:', err)
            showElegantToast({
              title: 'Confirmation impossible',
              message: 'Impossible de confirmer automatiquement votre email.',
              subMessage: 'Veuillez contacter le support pour obtenir de l\'aide.',
              variant: 'error',
            })
          } finally {
            setResendingConfirmation(false)
          }
        }
        
        elegantToasts.emailNotConfirmed(handleAutoConfirm, resendingConfirmation)
      } else if (isInvalidCredentials) {
        // On arrive ici seulement si l'email existe (vérifié plus haut)
        elegantToasts.wrongPassword()
      } else if (error.message?.includes('User not found')) {
        elegantToasts.accountNotFound()
      } else if (error.message?.includes('Too many requests')) {
        elegantToasts.tooManyRequests()
        } else {
          // Pour toutes les autres erreurs, vérifier si l'email existe
          const emailExists = await checkEmailExists(email)
          
          if (!emailExists) {
            elegantToasts.accountNotFound()
          } else {
            // Message par défaut pour les erreurs inconnues
            elegantToasts.connectionError()
          }
        }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-sm mx-auto">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-3">
          <Label htmlFor="email" className="text-sm text-gray-600 pl-1">
            Adresse e-mail
          </Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nom@exemple.com"
            required
            disabled={loading}
            className="h-14 px-4 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent transition-all"
          />
        </div>

        <div className="space-y-3">
          <Label htmlFor="password" className="text-sm text-gray-600 pl-1">
            Mot de passe
          </Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Entrez votre mot de passe"
            required
            disabled={loading}
            className="h-14 px-4 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent transition-all"
          />
        </div>

        <div className="pt-4">
          <Button 
            type="submit" 
            disabled={loading}
            className="w-full h-14 bg-black text-white rounded-xl hover:bg-gray-900 transition-all shadow-sm active:scale-[0.99] disabled:opacity-50"
          >
            {loading ? "Connexion..." : "Se connecter"}
          </Button>
        </div>

        {/* Info Flynesis ID */}
        <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl mt-4">
          <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-blue-700">
            <strong>CarsLink est affilié à Flynesis ID.</strong> Vous pouvez vous connecter avec votre compte FlyID existant.
          </p>
        </div>

        <p className="text-xs text-center text-gray-500 pt-2">
          Mot de passe oublié ?{' '}
          <button
            type="button"
            className="text-black underline"
            onClick={() => {
              // TODO: Implémenter la réinitialisation de mot de passe
              elegantToasts.comingSoon()
            }}
          >
            Réinitialiser
          </button>
        </p>
      </form>
    </div>
  )
}

