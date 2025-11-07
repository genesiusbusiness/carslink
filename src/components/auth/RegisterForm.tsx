"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Info, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/use-toast'

interface RegisterFormProps {
  onSwitchToLogin?: () => void
}

export function RegisterForm({ onSwitchToLogin }: RegisterFormProps = {}) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  })
  const [emailExists, setEmailExists] = useState(false)
  const [checkingEmail, setCheckingEmail] = useState(false)
  const [passwordMismatch, setPasswordMismatch] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  // Vérifier automatiquement si l'email existe (comme Flynesis Account)
  useEffect(() => {
    const checkEmailExists = async () => {
      // Vérifier que l'email a un format valide
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (formData.email && emailRegex.test(formData.email)) {
        setCheckingEmail(true)
        try {
          // Utiliser la fonction RPC qui vérifie dans auth.users ET fly_accounts
          const { data, error } = await supabase
            .rpc('check_email_exists', { email_to_check: formData.email.toLowerCase().trim() })

          // La fonction RPC retourne un boolean
          if (error) {
            // Error checking email
            setEmailExists(false)
          } else {
            // data is true if l'email exists, false sinon
            setEmailExists(data === true)
          }
        } catch (err) {
          // En cas d'erreur, on considère que l'email est disponible
          setEmailExists(false)
        } finally {
          setCheckingEmail(false)
        }
      } else {
        // Réinitialiser si l'email n'est pas valide ou vide
        setEmailExists(false)
      }
    }

    // Délai pour éviter trop de requêtes (500ms après la dernière frappe)
    const timer = setTimeout(() => {
      checkEmailExists()
    }, 500)

    return () => clearTimeout(timer)
  }, [formData.email])

  const handleChange = (field: string, value: string) => {
    // Pour le téléphone, ne garder que les chiffres
    if (field === 'phone') {
      // Supprimer tout ce qui n'est pas un chiffre
      const digitsOnly = value.replace(/\D/g, '')
      setFormData((prev) => ({ ...prev, [field]: digitsOnly }))
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Valider les champs requis
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.password || !formData.confirmPassword) {
      toast({
        title: "Champs requis",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive",
      })
      return
    }

    // Vérifier que les mots de passe correspondent
    if (formData.password !== formData.confirmPassword) {
      setPasswordMismatch(true)
      toast({
        title: "Mots de passe différents",
        description: "Les mots de passe ne correspondent pas",
        variant: "destructive",
      })
      return
    }
    setPasswordMismatch(false)

    // Bloquer si l'email existe déjà
    if (emailExists) {
      toast({
        title: "Compte déjà existant",
        description: "Cet email est déjà associé à un compte FlyID. Utilisez l'onglet 'Connexion' pour vous connecter.",
        variant: "destructive",
      })
      if (onSwitchToLogin) {
        setTimeout(() => {
          onSwitchToLogin()
        }, 2000)
      }
      return
    }

    // Valider le format de l'email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      toast({
        title: "Email invalide",
        description: "Veuillez entrer une adresse email valide",
        variant: "destructive",
      })
      return
    }

    // Valider la longueur du mot de passe
    if (formData.password.length < 6) {
      toast({
        title: "Mot de passe trop court",
        description: "Le mot de passe doit contenir au moins 6 caractères",
        variant: "destructive",
      })
      return
    }
    
    setLoading(true)

    try {
      // Vérifier une dernière fois si l'email existe (sécurité)
      const { data: finalCheck, error: checkError } = await supabase
        .rpc('check_email_exists', { email_to_check: formData.email.toLowerCase().trim() })

      if (checkError) {
        // Error checking email
      } else if (finalCheck === true) {
        // L'email existe déjà
        toast({
          title: "Compte déjà existant",
          description: "Cet email est déjà associé à un compte FlyID. Utilisez l'onglet 'Connexion' pour vous connecter.",
          variant: "destructive",
        })
        setEmailExists(true)
        if (onSwitchToLogin) {
          setTimeout(() => {
            onSwitchToLogin()
          }, 2000)
        }
        setLoading(false)
        return
      }

      // Créer le compte FlyID (via Supabase Auth)
      // Pour le flux PKCE, on doit rediriger vers /auth/confirm pour échanger le token
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email.toLowerCase().trim(),
        password: formData.password,
      })

      if (authError) {
        // Gestion d'erreurs détaillée comme Flynesis Account
        let errorMessage = authError.message || "Une erreur est survenue lors de l'inscription"
        
        if (
          authError.message?.includes('already registered') || 
          authError.message?.includes('User already registered') ||
          authError.message?.includes('already exists') ||
          authError.message?.toLowerCase().includes('user already exists') ||
          authError.code === 'signup_disabled'
        ) {
          errorMessage = "Cet email est déjà associé à un compte FlyID. Utilisez l'onglet 'Connexion'."
          setEmailExists(true)
        } else if (authError.status === 429 || authError.message?.includes('Too Many Requests')) {
          errorMessage = "Trop de tentatives. Veuillez patienter quelques minutes avant de réessayer."
        } else if (authError.message?.includes('Password should be at least')) {
          errorMessage = "Le mot de passe doit contenir au moins 6 caractères"
        } else if (authError.message?.includes('Invalid email')) {
          errorMessage = "Format d'email invalide"
        } else if (authError.message?.includes('Unable to validate email')) {
          errorMessage = "Impossible de valider l'email. Veuillez réessayer."
        } else if (authError.message?.includes('Error sending confirmation email') || authError.message?.includes('email_sending')) {
          errorMessage = "Erreur lors de l'envoi de l'email de confirmation. Vérifiez votre configuration ou réessayez plus tard."
        }
        
        toast({
          title: "Erreur d'inscription",
          description: errorMessage,
          variant: "destructive",
        })
        
        if (emailExists && onSwitchToLogin) {
          setTimeout(() => {
            onSwitchToLogin()
          }, 2000)
        }
        
        setLoading(false)
        return
      }

      // Si Supabase retourne un user sans erreur, c'est qu'un nouveau compte a été créé
      // Pas de session = email confirmation requise (comportement normal de Supabase)
      if (authData.user) {
        // Utiliser la route API pour créer le profil (utilise le client admin côté serveur)
        try {
          const response = await fetch('/api/auth/create-profile', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              firstName: formData.firstName,
              lastName: formData.lastName,
              email: formData.email,
              phone: formData.phone,
              userId: authData.user.id, // Passer l'ID de l'utilisateur pour que l'API utilise le client admin
            }),
          })

          const result = await response.json()

          if (!response.ok) {
            // Si c'est l'erreur pgcrypto, afficher un message spécial
            if (result.code === 'PGCRYPTO_NOT_ENABLED' || (result.error && result.error.includes('gen_random_bytes'))) {
              toast({
                title: "Configuration requise",
                description: "Une extension de base de données est manquante. Contactez le support.",
                variant: "destructive",
              })
            } else {
              toast({
                title: "Erreur",
                description: result.error || "Erreur lors de la création du profil",
                variant: "destructive",
              })
            }
            setLoading(false)
            return
          }

          if (result.success) {
            // Vérifier ce qui a été créé
            const created = result.created || {}
            const missing = []
            
            if (!created.flyAccount) {
              missing.push("compte FlyID")
            }
            if (!created.carslinkClient) {
              missing.push("profil CarsLink")
            }
            if (!created.carslinkUser) {
              missing.push("compte utilisateur CarsLink")
            }
            
            if (missing.length > 0) {
              console.warn('⚠️ Certains éléments n\'ont pas été créés:', missing)
              // Ne pas bloquer l'inscription, mais logger l'avertissement
            } else {
              console.log('✅ Tous les profils ont été créés avec succès')
            }
          }
        } catch (profileError: any) {
          // Ce n'est pas bloquant, on continue quand même
        }

        // Afficher le message de succès approprié
        if (authData.session) {
          // Session créée = compte confirmé directement (confirmation email désactivée)
          toast({
            title: "Inscription réussie",
            description: "Votre compte a été créé avec succès.",
            variant: "default",
          })
          router.push('/')
          router.refresh()
        } else {
          // Pas de session = confirmation email activée (mais on redirige quand même)
          // Note: Si confirmation email est désactivée dans Supabase, authData.session sera toujours présent
          toast({
            title: "Inscription réussie",
            description: "Votre compte a été créé. Vérifiez votre email pour confirmer votre compte.",
            variant: "default",
          })
          // Rediriger vers la page de connexion
          if (onSwitchToLogin) {
            setTimeout(() => {
              onSwitchToLogin()
            }, 2000)
          } else {
            setTimeout(() => {
              router.push('/login')
            }, 2000)
          }
        }
      }
    } catch (error: any) {
      // Erreur générale (déjà gérée dans le try block, mais on garde cette sécurité)
      toast({
        title: "Erreur d'inscription",
        description: error.message || "Une erreur est survenue",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-7">
        <div className="grid grid-cols-2 gap-4 sm:gap-5">
          <div className="space-y-2.5 sm:space-y-3">
            <Label htmlFor="firstName" className="text-sm sm:text-base text-gray-700 font-medium pl-1">
              Prénom
            </Label>
            <Input
              id="firstName"
              type="text"
              value={formData.firstName}
              onChange={(e) => handleChange('firstName', e.target.value)}
              placeholder="Jean"
              required
              disabled={loading}
              className="h-14 sm:h-16 text-base px-5 sm:px-6 bg-gray-50/80 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm hover:border-gray-300"
            />
          </div>

          <div className="space-y-2.5 sm:space-y-3">
            <Label htmlFor="lastName" className="text-sm sm:text-base text-gray-700 font-medium pl-1">
              Nom
            </Label>
            <Input
              id="lastName"
              type="text"
              value={formData.lastName}
              onChange={(e) => handleChange('lastName', e.target.value)}
              placeholder="Dupont"
              required
              disabled={loading}
              className="h-14 sm:h-16 text-base px-5 sm:px-6 bg-gray-50/80 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm hover:border-gray-300"
            />
          </div>
        </div>

        <div className="space-y-2.5 sm:space-y-3">
          <Label htmlFor="email" className="text-sm sm:text-base text-gray-700 font-medium pl-1">
            Adresse e-mail
          </Label>
          <div>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="nom@exemple.com"
              required
              disabled={loading}
              className={`h-13 sm:h-14 text-base px-5 sm:px-6 bg-gray-50/80 border-2 rounded-xl focus:ring-2 focus:border-transparent transition-all shadow-sm hover:border-gray-300 ${
                emailExists 
                  ? 'border-red-500 bg-red-50/80 focus:ring-red-500' 
                  : 'border-gray-200 focus:ring-blue-500 focus:border-blue-500'
              }`}
            />
            {emailExists && (
              <p className="text-xs sm:text-sm text-red-600 mt-2.5 flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                Cet email est déjà associé à un compte FlyID. Utilisez l'onglet "Connexion".
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2.5 sm:space-y-3">
          <Label htmlFor="phone" className="text-sm sm:text-base text-gray-700 font-medium pl-1">
            Numéro de téléphone
          </Label>
          <Input
            id="phone"
            type="tel"
            inputMode="numeric"
            value={formData.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            onKeyPress={(e) => {
              // Empêcher la saisie de caractères non numériques
              if (!/[0-9]/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'Tab' && e.key !== 'Enter') {
                e.preventDefault()
              }
            }}
            placeholder="0612345678"
            required
            disabled={loading}
            className="h-13 sm:h-14 text-base px-5 sm:px-6 bg-gray-50/80 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm hover:border-gray-300"
          />
          <p className="text-xs sm:text-sm text-gray-500 pl-1 mt-1.5">
            Entrez uniquement des chiffres (ex: 0612345678)
          </p>
        </div>

        <div className="space-y-2.5 sm:space-y-3">
          <Label htmlFor="password" className="text-sm sm:text-base text-gray-700 font-medium pl-1">
            Mot de passe
          </Label>
          <Input
            id="password"
            type="password"
            value={formData.password}
            onChange={(e) => {
              handleChange('password', e.target.value)
              if (formData.confirmPassword) {
                setPasswordMismatch(e.target.value !== formData.confirmPassword)
              }
            }}
            placeholder="Minimum 6 caractères"
            required
            minLength={6}
            disabled={loading}
            className={`h-13 sm:h-14 text-base px-5 sm:px-6 bg-gray-50/80 border-2 rounded-xl focus:ring-2 focus:border-transparent transition-all shadow-sm hover:border-gray-300 ${
              passwordMismatch 
                ? 'border-red-500 bg-red-50/80 focus:ring-red-500' 
                : 'border-gray-200 focus:ring-blue-500 focus:border-blue-500'
            }`}
          />
        </div>

        <div className="space-y-2.5 sm:space-y-3">
          <Label htmlFor="confirmPassword" className="text-sm sm:text-base text-gray-700 font-medium pl-1">
            Confirmer le mot de passe
          </Label>
          <Input
            id="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={(e) => {
              handleChange('confirmPassword', e.target.value)
              setPasswordMismatch(e.target.value !== formData.password)
            }}
            placeholder="Répétez le mot de passe"
            required
            minLength={6}
            disabled={loading}
            className={`h-13 sm:h-14 text-base px-5 sm:px-6 bg-gray-50/80 border-2 rounded-xl focus:ring-2 focus:border-transparent transition-all shadow-sm hover:border-gray-300 ${
              passwordMismatch 
                ? 'border-red-500 bg-red-50/80 focus:ring-red-500' 
                : 'border-gray-200 focus:ring-blue-500 focus:border-blue-500'
            }`}
          />
          {passwordMismatch && (
            <p className="text-xs sm:text-sm text-red-600 mt-2.5 flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              Les mots de passe ne correspondent pas
            </p>
          )}
        </div>

        <div className="pt-2 sm:pt-3">
          <Button 
            type="submit"
            disabled={loading || emailExists || passwordMismatch}
            className={`w-full h-14 sm:h-16 text-base sm:text-lg font-semibold rounded-xl transition-all shadow-lg hover:shadow-xl active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${
              emailExists || passwordMismatch
                ? 'bg-gray-400 text-white'
                : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
            }`}
          >
            {loading ? "Inscription..." : "Créer mon compte"}
          </Button>
        </div>

        {/* Info Flynesis ID */}
        <div className="flex items-start gap-3.5 p-4.5 bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-200/50 rounded-xl mt-5 sm:mt-6">
          <Info className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs sm:text-sm text-purple-800 leading-relaxed">
            En créant un compte, un <strong className="font-semibold">profil CarsLink</strong> et un <strong className="font-semibold">compte FlyID</strong> seront créés automatiquement. Vous pourrez utiliser ce même compte sur tous les services Flynesis.
          </p>
        </div>

        <p className="text-xs sm:text-sm text-center text-gray-500 pt-3 sm:pt-4 leading-relaxed">
          En créant un compte, vous acceptez nos{' '}
          <a href="/terms" className="text-blue-600 hover:text-blue-700 font-medium underline underline-offset-2 transition-colors">
            conditions d'utilisation
          </a>{' '}
          et notre{' '}
          <a href="/privacy" className="text-blue-600 hover:text-blue-700 font-medium underline underline-offset-2 transition-colors">
            politique de confidentialité
          </a>
          .
        </p>
      </form>
    </div>
  )
}

