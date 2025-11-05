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
  })
  const [loading, setLoading] = useState(false)
  const [emailExists, setEmailExists] = useState(false)
  const [checkingEmail, setCheckingEmail] = useState(false)
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
            console.error('Erreur lors de la vérification de l\'email:', error)
            setEmailExists(false)
          } else {
            // data est true si l'email existe, false sinon
            setEmailExists(data === true)
          }
        } catch (err) {
          // En cas d'erreur, on considère que l'email est disponible
          console.error('Erreur lors de la vérification de l\'email:', err)
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
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.password) {
      toast({
        title: "Champs requis",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive",
      })
      return
    }

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
        console.error('Erreur lors de la vérification finale de l\'email:', checkError)
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
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm?next=/`,
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            phone: formData.phone,
          },
        },
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
        // Le trigger handle_new_auth_user() crée automatiquement le compte fly_accounts
        // Vérifier si le compte existe déjà (créé par le trigger)
        const { data: existingAccount } = await supabase
          .from('fly_accounts')
          .select('id')
          .eq('auth_user_id', authData.user.id)
          .maybeSingle()

        // Si le compte n'existe pas encore, attendre un peu (le trigger peut prendre du temps)
        if (!existingAccount) {
          console.log('Compte fly_accounts non trouvé, attente de la création automatique par le trigger...')
          // Le trigger va créer le compte automatiquement, pas besoin de le créer manuellement
        } else {
          // Mettre à jour le compte existant avec les infos complètes si nécessaire
          const { error: updateError } = await supabase
            .from('fly_accounts')
            .update({
              first_name: formData.firstName,
              last_name: formData.lastName,
              phone: formData.phone || null,
            })
            .eq('auth_user_id', authData.user.id)

          if (updateError) {
            console.error('Error updating fly_accounts:', updateError)
          }
        }

        // Afficher le message de succès approprié
        if (authData.session) {
          // Session créée = compte confirmé directement (confirmation email désactivée)
          toast({
            title: "Inscription réussie",
            description: "Votre compte FlyID et votre profil CarsLink ont été créés avec succès",
          })
          router.push('/')
          router.refresh()
        } else {
          // Pas de session = confirmation email activée (mais on redirige quand même)
          // Note: Si confirmation email est désactivée dans Supabase, authData.session sera toujours présent
          toast({
            title: "Inscription réussie",
            description: "Votre compte FlyID a été créé. Vous pouvez maintenant vous connecter.",
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
      console.error('Erreur lors de l\'inscription:', error)
      toast({
        title: "Erreur d'inscription",
        description: error.message || "Une erreur est survenue lors de l'inscription",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-sm mx-auto">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            <Label htmlFor="firstName" className="text-sm text-gray-600 pl-1">
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
              className="h-14 px-4 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent transition-all"
            />
          </div>

          <div className="space-y-3">
            <Label htmlFor="lastName" className="text-sm text-gray-600 pl-1">
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
              className="h-14 px-4 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent transition-all"
            />
          </div>
        </div>

        <div className="space-y-3">
          <Label htmlFor="email" className="text-sm text-gray-600 pl-1">
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
              className={`h-14 px-4 bg-white border rounded-xl focus:ring-2 focus:border-transparent transition-all ${
                emailExists 
                  ? 'border-red-500 bg-red-50 focus:ring-red-500' 
                  : 'border-gray-200 focus:ring-black'
              }`}
            />
            {emailExists && (
              <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                Cet email est déjà associé à un compte FlyID. Utilisez l'onglet "Connexion".
              </p>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <Label htmlFor="phone" className="text-sm text-gray-600 pl-1">
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
            className="h-14 px-4 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent transition-all"
          />
          <p className="text-xs text-gray-500 pl-1">
            Entrez uniquement des chiffres (ex: 0612345678)
          </p>
        </div>

        <div className="space-y-3">
          <Label htmlFor="password" className="text-sm text-gray-600 pl-1">
            Mot de passe
          </Label>
          <Input
            id="password"
            type="password"
            value={formData.password}
            onChange={(e) => handleChange('password', e.target.value)}
            placeholder="Minimum 8 caractères"
            required
            minLength={8}
            disabled={loading}
            className="h-14 px-4 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent transition-all"
          />
        </div>

        <div className="pt-4">
          <Button 
            type="submit"
            disabled={loading || emailExists}
            className={`w-full h-14 text-white rounded-xl transition-all shadow-sm active:scale-[0.99] disabled:opacity-50 ${
              emailExists
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-black hover:bg-gray-900'
            }`}
          >
            {loading ? "Inscription..." : "Créer mon compte"}
          </Button>
        </div>

        {/* Info Flynesis ID */}
        <div className="flex items-start gap-2 p-3 bg-purple-50 border border-purple-200 rounded-xl mt-4">
          <Info className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-purple-700">
            En créant un compte, un <strong>profil CarsLink</strong> et un <strong>compte FlyID</strong> seront créés automatiquement. Vous pourrez utiliser ce même compte sur tous les services Flynesis.
          </p>
        </div>

        <p className="text-xs text-center text-gray-500 pt-2">
          En créant un compte, vous acceptez nos{' '}
          <a href="/terms" className="text-black underline">
            conditions d'utilisation
          </a>{' '}
          et notre{' '}
          <a href="/privacy" className="text-black underline">
            politique de confidentialité
          </a>
          .
        </p>
      </form>
    </div>
  )
}

