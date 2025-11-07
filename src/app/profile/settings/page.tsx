"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Save, Bell, Mail, Smartphone, MapPin, ExternalLink, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useAuth } from "@/lib/hooks/use-auth"
import { supabase } from "@/lib/supabase/client"
import { useToast } from "@/components/ui/use-toast"
import { BottomNavigation } from "@/components/layout/BottomNavigation"
import type { Profile } from "@/lib/types/database"

export default function SettingsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    postal_code: "",
    country: "",
  })

  useEffect(() => {
    // Attendre que l'auth soit vérifiée
    if (authLoading) {
      return
    }

    if (!user) {
      router.push("/login")
      return
    }

    loadProfile()
  }, [user, router, authLoading])

  const loadProfile = async () => {
    if (!user) return
    
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("fly_accounts")
        .select("*")
        .eq("auth_user_id", user.id)
        .maybeSingle()

      if (error) {
        // Error loading profile
        throw error
      }

      if (data) {
        setProfile(data)
        // Normaliser le téléphone : ne garder que les chiffres
        const phoneDigits = data.phone ? data.phone.replace(/\D/g, '') : ""
        setFormData({
          first_name: data.first_name || "",
          last_name: data.last_name || "",
          email: data.email || "",
          phone: phoneDigits,
          address: data.address || "",
          city: data.city || "",
          postal_code: data.postal_code || "",
          country: data.country || "",
        })
      } else {
        // Si pas de profil, créer un profil minimal avec l'email de l'utilisateur
        setFormData({
          first_name: "",
          last_name: "",
          email: user.email || "",
          phone: "",
          address: "",
          city: "",
          postal_code: "",
          country: "",
        })
      }
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Erreur lors du chargement du profil",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

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

    setSaving(true)

    try {
      if (!user) {
        throw new Error("Utilisateur non connecté")
      }

      // Vérifier si le compte fly_accounts existe (créé automatiquement par le trigger)
      const { data: existingAccount } = await supabase
        .from("fly_accounts")
        .select("id")
        .eq("auth_user_id", user.id)
        .maybeSingle()

      if (!existingAccount) {
        // Le compte fly_accounts sera créé automatiquement par le trigger handle_new_auth_user()
        // Attendre un peu et réessayer
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        const { data: retryAccount } = await supabase
          .from("fly_accounts")
          .select("id")
          .eq("auth_user_id", user.id)
          .maybeSingle()
        
        if (!retryAccount) {
          throw new Error("Compte fly_accounts non trouvé. Le trigger va le créer automatiquement.")
        }
      }

      // Mettre à jour le compte fly_accounts
      const { error: updateError } = await supabase
        .from("fly_accounts")
        .update({
          first_name: formData.first_name || null,
          last_name: formData.last_name || null,
          email: formData.email || null,
          phone: formData.phone || null,
          address: formData.address || null,
          city: formData.city || null,
          postal_code: formData.postal_code || null,
          country: formData.country || null,
        })
        .eq("auth_user_id", user.id)

      if (updateError) throw updateError

      // Mettre à jour l'email dans auth.users si nécessaire et différent
      if (formData.email && formData.email !== user.email) {
        const { error: authError } = await supabase.auth.updateUser({
          email: formData.email,
        })

        if (authError) {
          toast({
            title: "Attention",
            description: "Le profil a été mis à jour mais l'email n'a pas pu être modifié dans l'authentification",
            variant: "default",
          })
        }
      }

      toast({
        title: "Succès",
        description: "Vos informations ont été mises à jour avec succès",
        variant: "default",
      })

      // Attendre un peu avant de rediriger pour que l'utilisateur voie le message
      setTimeout(() => {
        router.push("/profile")
      }, 1000)
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la mise à jour du profil",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  // Afficher le chargement pendant la vérification d'auth ou le chargement des données
  if (authLoading || loading) {
    return (
      <>
        <div className="min-h-screen w-full bg-gradient-to-br from-blue-50/40 via-white to-purple-50/20 overflow-y-auto pb-32 sm:pb-40 safe-area-top safe-area-bottom">
          <div className="w-full min-h-screen bg-white/70 backdrop-blur-2xl overflow-y-auto pb-32 sm:pb-40 flex items-center justify-center">
            <div className="text-center">
              <div className="text-gray-600 mb-2 font-medium">Chargement des paramètres...</div>
              <div className="text-sm text-gray-400">Veuillez patienter</div>
            </div>
          </div>
        </div>
        <BottomNavigation />
      </>
    )
  }

  // Si pas d'utilisateur (après chargement), ne rien afficher (redirection en cours)
  if (!user) {
    return null
  }

  return (
    <>
      <div className="fixed inset-0 w-full h-full overflow-y-auto bg-gradient-to-br from-blue-50/40 via-white to-purple-50/20 pb-32 sm:pb-40 safe-area-top safe-area-bottom">
        {/* Mobile Container avec effet Liquid Glass */}
        <div className="w-full min-h-full bg-white/70 backdrop-blur-2xl pb-32 sm:pb-40">
          <div className="max-w-2xl mx-auto px-6 py-6">
            {/* Header avec verre givré */}
            <div className="mb-6 pb-6 border-b border-white/20">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => router.back()}
                  className="h-10 w-10 rounded-xl hover:bg-gray-100/80 transition-all hover:scale-105"
                >
                  <ArrowLeft className="h-5 w-5 text-gray-700" />
                </Button>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Paramètres</h1>
              </div>
            </div>

            {/* Informations personnelles */}
            <Card className="mb-4 bg-white/80 backdrop-blur-xl border border-white/60 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Informations personnelles</CardTitle>
                <CardDescription className="text-sm text-gray-600">
                  Gérez vos informations de profil
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Prénom et Nom */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <Label htmlFor="first_name" className="text-sm text-gray-600 pl-1">
                        Prénom
                      </Label>
                      <Input
                        id="first_name"
                        type="text"
                        value={formData.first_name}
                        onChange={(e) => handleChange("first_name", e.target.value)}
                        placeholder="Jean"
                        className="h-14 px-4 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                      />
                    </div>
                    <div className="space-y-3">
                      <Label htmlFor="last_name" className="text-sm text-gray-600 pl-1">
                        Nom
                      </Label>
                      <Input
                        id="last_name"
                        type="text"
                        value={formData.last_name}
                        onChange={(e) => handleChange("last_name", e.target.value)}
                        placeholder="Dupont"
                        className="h-14 px-4 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="space-y-3">
                    <Label htmlFor="email" className="text-sm text-gray-600 pl-1 flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Adresse e-mail
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleChange("email", e.target.value)}
                      placeholder="nom@exemple.com"
                      className="h-14 px-4 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                    />
                  </div>

                  {/* Téléphone */}
                  <div className="space-y-3">
                    <Label htmlFor="phone" className="text-sm text-gray-600 pl-1 flex items-center gap-2">
                      <Smartphone className="h-4 w-4" />
                      Numéro de téléphone
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      inputMode="numeric"
                      value={formData.phone}
                      onChange={(e) => handleChange("phone", e.target.value)}
                      onKeyPress={(e) => {
                        // Empêcher la saisie de caractères non numériques
                        if (!/[0-9]/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'Tab' && e.key !== 'Enter') {
                          e.preventDefault()
                        }
                      }}
                      placeholder="0612345678"
                      className="h-14 px-4 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                    />
                    <p className="text-xs text-gray-500 pl-1">
                      Entrez uniquement des chiffres (ex: 0612345678)
                    </p>
                  </div>

                  {/* Adresse */}
                  <div className="space-y-3">
                    <Label htmlFor="address" className="text-sm text-gray-600 pl-1 flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Adresse
                    </Label>
                    <Input
                      id="address"
                      type="text"
                      value={formData.address}
                      onChange={(e) => handleChange("address", e.target.value)}
                      placeholder="123 Rue de la République"
                      className="h-14 px-4 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                    />
                  </div>

                  {/* Ville, Code postal et Pays */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <Label htmlFor="city" className="text-sm text-gray-600 pl-1">
                        Ville
                      </Label>
                      <Input
                        id="city"
                        type="text"
                        value={formData.city}
                        onChange={(e) => handleChange("city", e.target.value)}
                        placeholder="Paris"
                        className="h-14 px-4 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                      />
                    </div>
                    <div className="space-y-3">
                      <Label htmlFor="postal_code" className="text-sm text-gray-600 pl-1">
                        Code postal
                      </Label>
                      <Input
                        id="postal_code"
                        type="text"
                        value={formData.postal_code}
                        onChange={(e) => handleChange("postal_code", e.target.value)}
                        placeholder="75001"
                        className="h-14 px-4 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                      />
                    </div>
                  </div>

                  {/* Pays */}
                  <div className="space-y-3">
                    <Label htmlFor="country" className="text-sm text-gray-600 pl-1">
                      Pays
                    </Label>
                    <Input
                      id="country"
                      type="text"
                      value={formData.country}
                      onChange={(e) => handleChange("country", e.target.value)}
                      placeholder="France"
                      className="h-14 px-4 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                    />
                  </div>

                  {/* Submit */}
                  <div className="pt-4">
                    <Button
                      type="submit"
                      disabled={saving}
                      className="w-full h-14 bg-black text-white rounded-xl hover:bg-gray-900 transition-all shadow-sm active:scale-[0.99]"
                    >
                      {saving ? (
                        "Enregistrement..."
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Enregistrer les modifications
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Compte Flynesis */}
            <Card className="mb-4 bg-white/80 backdrop-blur-xl border border-white/60 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                  <User className="h-5 w-5" />
                  Compte Flynesis
                </CardTitle>
                <CardDescription className="text-sm text-gray-600">
                  Accédez à votre compte Flynesis pour gérer tous vos services
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  className="w-full h-12 justify-start group hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:border-blue-200 border-2 rounded-xl transition-all font-medium"
                  onClick={() => {
                    // Ouvrir Flynesis Account
                    const flynesisAccountUrl = "https://account.flynesis.com/dashboard"
                    
                    // Tenter d'ouvrir dans un nouvel onglet
                    try {
                      window.open(flynesisAccountUrl, "_blank", "noopener,noreferrer")
                    } catch (error) {
                      toast({
                        title: "Erreur",
                        description: "Impossible d'ouvrir Flynesis Account",
                        variant: "destructive",
                      })
                    }
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 group-hover:from-blue-600 group-hover:to-purple-600 transition-colors">
                      <ExternalLink className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-semibold text-gray-900">Ouvrir Flynesis Account</div>
                      <div className="text-xs text-gray-500">Gérer tous vos services Flynesis</div>
                    </div>
                  </div>
                </Button>
              </CardContent>
            </Card>

            {/* Préférences de notification */}
            <Card className="mb-4 bg-white/80 backdrop-blur-xl border border-white/60 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                  <Bell className="h-5 w-5" />
                  Notifications
                </CardTitle>
                <CardDescription className="text-sm text-gray-600">
                  Gérez vos préférences de notification
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Les notifications par email et push sont activées par défaut. Vous pouvez les gérer dans les paramètres de votre appareil.
                  </p>
                  <div className="pt-2 space-y-3">
                    <Button
                      variant="outline"
                      className="w-full h-12 justify-start group hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:border-blue-200 border-2 rounded-xl transition-all font-medium"
                      onClick={() => {
                        router.push('/notifications')
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 group-hover:from-blue-600 group-hover:to-purple-600 transition-colors">
                          <Bell className="h-4 w-4 text-white" />
                        </div>
                        <div className="flex-1 text-left">
                          <div className="font-semibold text-gray-900">Voir toutes les notifications</div>
                          <div className="text-xs text-gray-500">Consultez toutes vos notifications</div>
                        </div>
                      </div>
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        toast({
                          title: "Information",
                          description: "Fonctionnalité à venir",
                          variant: "default",
                        })
                      }}
                    >
                      Gérer les notifications
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <BottomNavigation />
    </>
  )
}

