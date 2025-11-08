"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft, Save, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/lib/hooks/use-auth"
import { supabase } from "@/lib/supabase/client"
import { useToast } from "@/components/ui/use-toast"
import { BottomNavigation } from "@/components/layout/BottomNavigation"
import type { Vehicle } from "@/lib/types/database"

export default function EditVehiclePage() {
  const router = useRouter()
  const params = useParams()
  const vehicleId = params.id as string
  const { user, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    brand: "",
    model: "",
    year: "",
    license_plate: "",
    mileage: "",
    fuel_type: "",
    vehicle_type: "",
    vin: "",
    color: "",
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

    if (!vehicleId) {
      toast({
        title: "Erreur",
        description: "Aucun véhicule spécifié",
        variant: "destructive",
      })
      router.push("/profile")
      return
    }

    loadVehicle()
  }, [user, vehicleId, router, authLoading])

  const loadVehicle = async () => {
    if (!user || !vehicleId) {
      return
    }

    try {
      
      // Essayer d'abord avec le filtre flynesis_user_id
      let data = null
      let error = null
      
      const { data: dataWithFilter, error: errorWithFilter } = await supabase
        .from("vehicles")
        .select("*")
        .eq("id", vehicleId)
        .eq("flynesis_user_id", user.id)
        .maybeSingle()

      if (!errorWithFilter && dataWithFilter) {
        data = dataWithFilter
      } else if (errorWithFilter?.code === 'PGRST116' || !dataWithFilter) {
        // Si pas trouvé avec le filtre, essayer sans
        const { data: dataWithoutFilter, error: errorWithoutFilter } = await supabase
          .from("vehicles")
          .select("*")
          .eq("id", vehicleId)
          .maybeSingle()

        if (!errorWithoutFilter && dataWithoutFilter) {
          data = dataWithoutFilter
        } else {
          error = errorWithoutFilter || errorWithFilter
        }
      } else {
        error = errorWithFilter
      }

      if (error) {
        throw error
      }

      if (!data) {
        toast({
          title: "Véhicule introuvable",
          description: "Le véhicule demandé n'existe pas ou vous n'avez pas les droits pour le modifier",
          variant: "destructive",
        })
        setTimeout(() => router.push("/profile"), 2000)
        return
      }

      setFormData({
        brand: data.brand || "",
        model: data.model || "",
        year: data.year ? String(data.year) : "",
        license_plate: data.license_plate || "",
        mileage: data.mileage ? String(data.mileage) : "",
        fuel_type: data.fuel_type || "",
        vehicle_type: data.vehicle_type || "",
        vin: data.vin || "",
        color: data.color || "",
      })
      setError(null)
    } catch (error: any) {
      const errorMessage = error.message || "Impossible de charger le véhicule."
      setError(errorMessage)
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      }) 
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.brand || !formData.model) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir au moins la marque et le modèle",
        variant: "destructive",
      })
      return
    }

    if (!user) {
      toast({
        title: "Erreur",
        description: "Vous devez être connecté pour modifier un véhicule",
        variant: "destructive",
      })
      return
    }

    setSaving(true)

    try {
      // Récupérer le flynesis_user_id
      const { data: flyAccount } = await supabase
        .from("fly_accounts")
        .select("id")
        .eq("auth_user_id", user.id)
        .single()

      if (!flyAccount) {
        throw new Error("Compte FlyID introuvable")
      }

      const updateData: any = {
        brand: formData.brand,
        model: formData.model,
        year: formData.year ? parseInt(formData.year) : null,
        license_plate: formData.license_plate || null,
        mileage: formData.mileage ? parseInt(formData.mileage) : null,
        fuel_type: formData.fuel_type || null,
      }

      const { error } = await supabase
        .from("vehicles")
        .update(updateData)
        .eq("id", vehicleId)
        .eq("flynesis_user_id", flyAccount.id)

      if (error) throw error

      toast({
        title: "Véhicule mis à jour",
        description: "Les modifications ont été enregistrées avec succès",
        variant: "default",
      })

      // Attendre un peu avant de rediriger pour que l'utilisateur voie le message
      setTimeout(() => {
        router.push("/profile")
      }, 1000)
    } catch (error: any) {
      const errorMessage = error.message || "Une erreur est survenue lors de la mise à jour"
      
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce véhicule ?")) return
    if (!user) return

    try {
      // Vérifier que le véhicule appartient bien à l'utilisateur avant de supprimer
      // Récupérer d'abord le fly_accounts.id
      const { data: flyAccount, error: flyAccountError } = await supabase
        .from("fly_accounts")
        .select("id")
        .eq("auth_user_id", user.id)
        .maybeSingle()

      if (flyAccountError || !flyAccount?.id) {
        throw new Error("Impossible de vérifier la propriété du véhicule")
      }

      // Vérifier que le véhicule appartient à l'utilisateur
      const { data: vehicleCheck, error: checkError } = await supabase
        .from("vehicles")
        .select("flynesis_user_id")
        .eq("id", vehicleId)
        .maybeSingle()

      if (checkError || !vehicleCheck) {
        throw new Error("Véhicule introuvable")
      }

      // Vérifier que le véhicule appartient bien à l'utilisateur (flyAccount.id ou user.id pour compatibilité)
      if (vehicleCheck.flynesis_user_id !== flyAccount.id && vehicleCheck.flynesis_user_id !== user.id) {
        throw new Error("Vous n'avez pas la permission de supprimer ce véhicule")
      }

      // Supprimer le véhicule
      const { error } = await supabase
        .from("vehicles")
        .delete()
        .eq("id", vehicleId)

      if (error) throw error

      toast({
        title: "Véhicule supprimé",
        description: "Le véhicule a été supprimé avec succès",
        variant: "default",
      })

      router.push("/profile")
    } catch (error: any) {
      console.error("Erreur lors de la suppression du véhicule:", error)
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la suppression",
        variant: "destructive",
      })
    }
  }

  // Affichage pendant le chargement de l'auth
  if (authLoading || (loading && !error)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-600 mb-2">Chargement du véhicule...</div>
          <div className="text-sm text-gray-400">Veuillez patienter</div>
        </div>
      </div>
    )
  }

  // Si erreur et pas de données, afficher un message d'erreur avec possibilité de réessayer
  if (error && !formData.brand) {
    return (
      <div className="fixed inset-0 w-full h-full overflow-y-auto bg-gray-50 pb-28 sm:pb-32 safe-area-top safe-area-bottom">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 sm:py-6 pb-28 sm:pb-32">
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">Erreur</h1>
          </div>
          <Card>
            <CardContent className="p-6">
              <div className="text-center py-8">
                <div className="text-red-600 mb-4">
                  <Trash2 className="h-12 w-12 mx-auto" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Impossible de charger le véhicule</h2>
                <p className="text-gray-600 mb-6">{error}</p>
                <div className="flex gap-3 justify-center">
                  <Button
                    variant="outline"
                    onClick={() => router.push("/profile")}
                  >
                    Retour au profil
                  </Button>
                  <Button
                    onClick={() => {
                      setError(null)
                      setLoading(true)
                      loadVehicle()
                    }}
                  >
                    Réessayer
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 w-full h-full overflow-y-auto bg-gray-50 pb-28 sm:pb-32 safe-area-top safe-area-bottom">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 sm:py-6 pb-28 sm:pb-32">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">Modifier le véhicule</h1>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>Informations du véhicule</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Marque et Modèle */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <Label htmlFor="brand" className="text-sm text-gray-600 pl-1">
                    Marque *
                  </Label>
                  <Input
                    id="brand"
                    type="text"
                    value={formData.brand}
                    onChange={(e) => handleChange("brand", e.target.value)}
                    placeholder="Peugeot"
                    required
                    className="h-14 px-4 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="model" className="text-sm text-gray-600 pl-1">
                    Modèle *
                  </Label>
                  <Input
                    id="model"
                    type="text"
                    value={formData.model}
                    onChange={(e) => handleChange("model", e.target.value)}
                    placeholder="308"
                    required
                    className="h-14 px-4 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Année et Plaque */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <Label htmlFor="year" className="text-sm text-gray-600 pl-1">
                    Année
                  </Label>
                  <Input
                    id="year"
                    type="number"
                    value={formData.year}
                    onChange={(e) => handleChange("year", e.target.value)}
                    placeholder="2020"
                    min="1900"
                    max={new Date().getFullYear() + 1}
                    className="h-14 px-4 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="license_plate" className="text-sm text-gray-600 pl-1">
                    Plaque d'immatriculation
                  </Label>
                  <Input
                    id="license_plate"
                    type="text"
                    value={formData.license_plate}
                    onChange={(e) => handleChange("license_plate", e.target.value.toUpperCase())}
                    placeholder="AB-123-CD"
                    className="h-14 px-4 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Type de véhicule et Carburant */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <Label htmlFor="vehicle_type" className="text-sm text-gray-600 pl-1">
                    Type de véhicule
                  </Label>
                  <Select
                    value={formData.vehicle_type}
                    onValueChange={(value) => handleChange("vehicle_type", value)}
                  >
                    <SelectTrigger className="h-14">
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="voiture">Voiture</SelectItem>
                      <SelectItem value="moto">Moto</SelectItem>
                      <SelectItem value="utilitaire">Utilitaire</SelectItem>
                      <SelectItem value="poids_lourd">Poids lourd</SelectItem>
                      <SelectItem value="autre">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3">
                  <Label htmlFor="fuel_type" className="text-sm text-gray-600 pl-1">
                    Type de carburant
                  </Label>
                  <Select
                    value={formData.fuel_type}
                    onValueChange={(value) => handleChange("fuel_type", value)}
                  >
                    <SelectTrigger className="h-14">
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="essence">Essence</SelectItem>
                      <SelectItem value="diesel">Diesel</SelectItem>
                      <SelectItem value="electrique">Électrique</SelectItem>
                      <SelectItem value="hybride">Hybride</SelectItem>
                      <SelectItem value="gpl">GPL</SelectItem>
                      <SelectItem value="autre">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* VIN et Couleur */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <Label htmlFor="vin" className="text-sm text-gray-600 pl-1">
                    N° de série (VIN)
                  </Label>
                  <Input
                    id="vin"
                    type="text"
                    value={formData.vin}
                    onChange={(e) => handleChange("vin", e.target.value.toUpperCase())}
                    placeholder="VF12345678901234"
                    maxLength={17}
                    className="h-14 px-4 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="color" className="text-sm text-gray-600 pl-1">
                    Couleur
                  </Label>
                  <Input
                    id="color"
                    type="text"
                    value={formData.color}
                    onChange={(e) => handleChange("color", e.target.value)}
                    placeholder="Rouge"
                    className="h-14 px-4 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Kilométrage */}
              <div className="space-y-3">
                <Label htmlFor="mileage" className="text-sm text-gray-600 pl-1">
                  Kilométrage actuel
                </Label>
                <Input
                  id="mileage"
                  type="number"
                  value={formData.mileage}
                  onChange={(e) => handleChange("mileage", e.target.value)}
                  placeholder="50000"
                  min="0"
                  className="h-14 px-4 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                />
              </div>

              {/* Submit */}
              <div className="pt-4 space-y-3">
                <Button
                  type="submit"
                  disabled={loading || saving}
                  className="w-full h-14 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl active:scale-[0.99] font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={(e) => {
                  }}
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                      Enregistrement en cours...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Enregistrer les modifications
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDelete}
                  className="w-full h-14 border-red-200 text-red-600 hover:bg-red-50 rounded-xl"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer le véhicule
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      <BottomNavigation />
    </div>
  )
}

