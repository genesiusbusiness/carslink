"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/lib/hooks/use-auth"
import { supabase } from "@/lib/supabase/client"
import { useToast } from "@/components/ui/use-toast"
import { BottomNavigation } from "@/components/layout/BottomNavigation"
import { elegantToasts, showElegantToast } from "@/components/ui/elegant-toast"

export default function NewVehiclePage() {
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    brand: "",
    model: "",
    year: "",
    license_plate: "",
    vin: "",
    color: "",
    mileage: "",
    fuel_type: "",
    vehicle_type: "voiture",
  })

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      toast({
        title: "Erreur",
        description: "Vous devez être connecté pour ajouter un véhicule",
        variant: "destructive",
      })
      router.push("/login")
      return
    }

    if (!formData.brand || !formData.model) {
      toast({
        title: "Erreur",
        description: "La marque et le modèle sont requis",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      // Préparer les données du véhicule
      const vehicleData: any = {
        flynesis_user_id: user.id,
        brand: formData.brand,
        model: formData.model,
        year: formData.year ? parseInt(formData.year) : null,
        license_plate: formData.license_plate || null,
        vin: formData.vin || null,
        color: formData.color || null,
        mileage: formData.mileage ? parseInt(formData.mileage) : null,
        fuel_type: formData.fuel_type || null,
        vehicle_type: formData.vehicle_type || "voiture",
      }
      
      // STRATÉGIE : Essayer d'abord sans client_id (si le trigger existe, il le remplira automatiquement)
      // Si ça échoue, on réessayera avec client_id obtenu via RPC ou création manuelle
      let attemptWithoutClientId = true
      let insertionError: any = null
      
      // Première tentative : sans client_id (le trigger devrait le gérer si configuré)
      const { error: firstError } = await supabase.from("vehicles").insert(vehicleData)
      
      if (!firstError) {
        // Succès ! Le trigger a probablement géré client_id
        console.log('[Vehicle] Véhicule ajouté avec succès (trigger automatique)')
      } else {
        insertionError = firstError
        console.log('[Vehicle] Première tentative échouée, besoin de client_id:', firstError.message)
        
        // Si l'erreur est liée à client_id, essayer de l'obtenir
        if (firstError.message?.includes("client_id") || firstError.message?.includes("null value")) {
          attemptWithoutClientId = false
          
          // Obtenir le carslink_user_id pour client_id
          let clientId: string | null = null
          
          // Essayer d'abord avec la fonction RPC (recommandé)
          const { data: rpcResult, error: rpcError } = await supabase
            .rpc('get_or_create_carslink_user_id', { flynesis_user_uuid: user.id })
          
          if (!rpcError && rpcResult) {
            clientId = rpcResult
            console.log('[Vehicle] carslink_user_id obtenu via RPC:', clientId)
          } else if (rpcError) {
            console.warn('[Vehicle] Fonction RPC non disponible ou erreur:', rpcError)
            
            // Fallback: chercher directement dans carslink_users
            const { data: carslinkUser, error: carslinkError } = await supabase
              .from('carslink_users')
              .select('id')
              .eq('flynesis_user_id', user.id)
              .eq('is_deleted', false)
              .maybeSingle()
            
            if (!carslinkError && carslinkUser?.id) {
              clientId = carslinkUser.id
              console.log('[Vehicle] carslink_user_id trouvé directement:', clientId)
            } else if (carslinkError?.code === 'PGRST116' || !carslinkUser) {
              // Aucun résultat trouvé, essayer de créer
              console.log('[Vehicle] Aucun carslink_user trouvé, tentative de création...')
              
              const { data: newCarslinkUser, error: createError } = await supabase
                .from('carslink_users')
                .insert({
                  flynesis_user_id: user.id,
                  role: 'client',
                  is_active: true,
                  is_deleted: false,
                })
                .select('id')
                .single()
              
              if (!createError && newCarslinkUser?.id) {
                clientId = newCarslinkUser.id
                console.log('[Vehicle] carslink_user créé avec succès:', clientId)
              } else if (createError) {
                console.error('[Vehicle] Erreur lors de la création du carslink_user:', createError)
                throw createError
              }
            }
          }
          
          // Deuxième tentative : avec client_id
          if (clientId) {
            vehicleData.client_id = clientId
            console.log('[Vehicle] Deuxième tentative avec client_id:', clientId)
            
            const { error: secondError } = await supabase.from("vehicles").insert(vehicleData)
            
            if (secondError) {
              throw secondError
            }
            
            console.log('[Vehicle] Véhicule ajouté avec succès (avec client_id explicite)')
          } else {
            // Impossible d'obtenir client_id, lancer l'erreur originale
            throw firstError
          }
        } else {
          // Autre type d'erreur, la lancer directement
          throw firstError
        }
      }

      showElegantToast({
        title: "Véhicule ajouté",
        message: "Votre véhicule a été enregistré avec succès.",
        variant: "success",
      })

      router.push("/profile")
    } catch (error: any) {
      console.error("Erreur lors de l'ajout du véhicule:", error)
      
      // Gestion spécifique des erreurs
      if (error.message?.includes("row-level security policy") || error.message?.includes("RLS")) {
        showElegantToast({
          title: "Problème d'authentification",
          message: "Impossible d'ajouter le véhicule. Vérifiez que vous êtes bien connecté et réessayez.",
          subMessage: "Si le problème persiste, déconnectez-vous et reconnectez-vous.",
          variant: "error",
        })
      } else if (error.message?.includes("foreign key constraint") && error.message?.includes("client_id")) {
        showElegantToast({
          title: "Configuration requise",
          message: "La base de données nécessite une configuration supplémentaire.",
          subMessage: "Veuillez exécuter la migration fix_vehicles_client_id_constraint.sql dans Supabase (SQL Editor), ou contactez le support.",
          variant: "error",
        })
        console.error("Erreur de contrainte client_id. Migration nécessaire:", error)
      } else {
        showElegantToast({
          title: "Erreur",
          message: error.message || "Une erreur est survenue lors de l'ajout du véhicule.",
          subMessage: "Veuillez réessayer dans quelques instants.",
          variant: "error",
        })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-full w-full bg-gray-50 overflow-y-auto pb-20 safe-area-top safe-area-bottom">
      <div className="max-w-2xl mx-auto px-6 py-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">Nouveau véhicule</h1>
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
              <div className="pt-4">
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-14 bg-black text-white rounded-xl hover:bg-gray-900 transition-all shadow-sm active:scale-[0.99]"
                >
                  {loading ? (
                    "Enregistrement..."
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Enregistrer le véhicule
                    </>
                  )}
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

