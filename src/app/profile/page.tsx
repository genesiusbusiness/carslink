"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { User, Car, Settings, LogOut, Plus, Trash2, Edit, FileText, History, HelpCircle, BookOpen } from "lucide-react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BottomNavigation } from "@/components/layout/BottomNavigation"
import { useAuth } from "@/lib/hooks/use-auth"
import { supabase } from "@/lib/supabase/client"
import { useToast } from "@/components/ui/use-toast"
import { showElegantToast } from "@/components/ui/elegant-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { Profile, Vehicle } from "@/lib/types/database"

export default function ProfilePage() {
  const router = useRouter()
  const { user, loading: authLoading, signOut } = useAuth()
  const { toast } = useToast()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [vehicleToDelete, setVehicleToDelete] = useState<Vehicle | null>(null)

  const loadData = useCallback(async () => {
    if (!user) return
    
    setLoading(true)
    try {
      // Charger le profil
      const { data: profileData, error: profileError } = await supabase
        .from("fly_accounts")
        .select("*")
        .eq("auth_user_id", user.id)
        .maybeSingle()

      if (profileError) {
        console.error("Error loading profile:", profileError)
      } else if (profileData) {
        setProfile(profileData)
      }

      // Charger les véhicules
      // Récupérer d'abord le fly_accounts.id
      const { data: flyAccount, error: flyAccountError } = await supabase
        .from("fly_accounts")
        .select("id")
        .eq("auth_user_id", user.id)
        .maybeSingle()

      let vehiclesData = null
      let vehiclesError = null

      if (!flyAccountError && flyAccount?.id) {
        // Utiliser fly_accounts.id pour charger les véhicules
        const result = await supabase
          .from("vehicles")
          .select("*")
          .eq("flynesis_user_id", flyAccount.id)
          .order("created_at", { ascending: false })
        
        vehiclesData = result.data
        vehiclesError = result.error

        // Si aucun véhicule trouvé avec flyAccount.id, essayer avec user.id (anciens véhicules)
        if (!vehiclesError && (!vehiclesData || vehiclesData.length === 0)) {
          const fallbackResult = await supabase
            .from("vehicles")
            .select("*")
            .eq("flynesis_user_id", user.id)
            .order("created_at", { ascending: false })
          
          if (!fallbackResult.error && fallbackResult.data) {
            vehiclesData = fallbackResult.data
            vehiclesError = fallbackResult.error
          }
        }
      } else {
        // Si pas de fly_accounts, essayer avec user.id directement
        const result = await supabase
          .from("vehicles")
          .select("*")
          .eq("flynesis_user_id", user.id)
          .order("created_at", { ascending: false })
        
        vehiclesData = result.data
        vehiclesError = result.error
      }

      if (vehiclesError) {
        console.error("Error loading vehicles:", vehiclesError)
      } else if (vehiclesData) {
        setVehicles(vehiclesData)
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur lors du chargement des données",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [user, toast])

  useEffect(() => {
    // Attendre que l'authentification soit vérifiée
    if (authLoading) {
      return
    }

    // Si pas d'utilisateur après le chargement, rediriger vers login
    if (!user) {
      router.push("/login")
      return
    }

    // Charger les données si l'utilisateur est connecté
    loadData()
  }, [user, authLoading, router, loadData])

  const handleDeleteClick = (vehicle: Vehicle) => {
    setVehicleToDelete(vehicle)
    setDeleteDialogOpen(true)
  }

  const handleDeleteVehicle = async () => {
    if (!vehicleToDelete) return

    try {
      const { error } = await supabase
        .from("vehicles")
        .delete()
        .eq("id", vehicleToDelete.id)

      if (error) throw error

      showElegantToast({
        title: "Véhicule supprimé",
        message: "Le véhicule a été supprimé avec succès",
        variant: "success",
      })

      setDeleteDialogOpen(false)
      setVehicleToDelete(null)
      loadData()
    } catch (error: any) {
      showElegantToast({
        title: "Erreur",
        message: error.message || "Erreur lors de la suppression",
        variant: "error",
      })
    }
  }

  // Afficher le chargement pendant la vérification d'auth ou le chargement des données
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Chargement...</div>
      </div>
    )
  }

  // Si pas d'utilisateur (après chargement), ne rien afficher (redirection en cours)
  if (!user) {
    return null
  }

  const capitalizeFirst = (str: string | null | undefined): string => {
    if (!str) return ""
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
  }

  const displayName = capitalizeFirst(user?.email?.split("@")[0] || "Utilisateur")

  return (
    <>
      <div className="fixed inset-0 w-full h-full overflow-y-auto bg-gradient-to-br from-blue-50/40 via-white to-purple-50/20 pb-32 sm:pb-40 safe-area-top safe-area-bottom">
      {/* Mobile Container avec effet Liquid Glass */}
      <div className="w-full max-w-7xl mx-auto bg-white/70 backdrop-blur-2xl pb-32 sm:pb-40">
        <div className="px-4 sm:px-6 py-6 sm:py-8 pb-8 sm:pb-12">
          {/* Profile Header - Responsive */}
          <div className="relative mb-6 sm:mb-8">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/10 to-blue-500/20 rounded-2xl blur-xl opacity-50" />
            <div className="relative bg-white/60 backdrop-blur-xl border border-white/40 rounded-2xl p-5 sm:p-6 shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-lg flex-shrink-0">
                  <User className="h-7 w-7 sm:h-8 sm:w-8 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg sm:text-xl font-light text-gray-900 truncate">{displayName}</h2>
                  <p className="text-xs sm:text-sm text-gray-500 font-light truncate">{user?.email || ""}</p>
                  {profile?.phone && (
                    <p className="text-xs sm:text-sm text-gray-500 font-light">{profile.phone}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

        {/* Vehicles - Responsive */}
        <Card className="mb-6 sm:mb-8">
          <CardHeader className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
              <div className="flex-1">
                <CardTitle className="text-lg sm:text-xl">Mes véhicules</CardTitle>
                <CardDescription className="text-xs sm:text-sm mt-1">
                  Gérez vos véhicules enregistrés
                </CardDescription>
              </div>
              {vehicles.length > 0 && (
                <Button
                  size="sm"
                  type="button"
                  className="bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-md hover:shadow-lg transition-all duration-200 rounded-xl h-9 sm:h-10 text-xs sm:text-sm w-full sm:w-auto font-medium"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    router.push("/profile/vehicles/new")
                  }}
                >
                  <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
                  Ajouter
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            {vehicles.length > 0 ? (
              <div className="space-y-4 sm:space-y-6">
                {vehicles.map((vehicle) => (
                  <div
                    key={vehicle.id}
                    className="group relative bg-white border-2 border-gray-200 rounded-2xl p-4 sm:p-5 hover:border-gray-300 hover:shadow-lg hover:shadow-gray-100 transition-all duration-300 transform hover:-translate-y-0.5"
                  >
                    <div className="flex items-start gap-3 sm:gap-4">
                      {/* Icône véhicule */}
                      <div className="flex-shrink-0 h-11 w-11 sm:h-12 sm:w-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                        <Car className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                      </div>
                      
                      {/* Informations du véhicule */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 mb-2 sm:mb-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                                {vehicle.brand} {vehicle.model}
                              </h3>
                              {/* Boutons d'action dans le header */}
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  type="button"
                                  className="h-8 w-8 rounded-lg text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 transition-all duration-200"
                                  onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    const url = `/profile/vehicles/${vehicle.id}`
                                    router.push(url)
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50 transition-all duration-200"
                                  onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    handleDeleteClick(vehicle)
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 sm:gap-x-4 gap-y-1 text-xs sm:text-sm text-gray-600">
                              {vehicle.license_plate && (
                                <span className="inline-flex items-center gap-1.5">
                                  <span className="font-mono font-medium bg-gray-100 px-2 py-0.5 rounded">
                                    {vehicle.license_plate}
                                  </span>
                                </span>
                              )}
                              {vehicle.year && (
                                <span>{vehicle.year}</span>
                              )}
                              {vehicle.fuel_type && (
                                <span className="capitalize">{vehicle.fuel_type}</span>
                              )}
                            </div>
                            {vehicle.mileage && (
                              <div className="mt-2 text-xs text-gray-500">
                                {vehicle.mileage.toLocaleString('fr-FR')} km
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Car className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 mb-4">Aucun véhicule enregistré</p>
                <Button
                  variant="outline"
                  type="button"
                  className="bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white border-0 hover:shadow-lg transition-all duration-200 rounded-xl font-medium shadow-md"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    router.push("/profile/vehicles/new")
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter un véhicule
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Settings - Responsive */}
        <Card className="mb-6 sm:mb-8">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-lg sm:text-xl">Paramètres</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-2 sm:space-y-3">
            <Button
              variant="ghost"
              type="button"
              className="w-full justify-start h-12 sm:h-14 bg-white/60 backdrop-blur-sm hover:bg-white/90 hover:shadow-md border border-gray-200/50 hover:border-indigo-300 rounded-xl transition-all duration-200 font-medium group"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                router.push("/profile/settings")
              }}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 group-hover:from-blue-600 group-hover:to-blue-700 transition-all shadow-sm">
                  <Settings className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm sm:text-base text-gray-900">Préférences</span>
              </div>
            </Button>
            <Button
              variant="ghost"
              type="button"
              className="w-full justify-start h-12 sm:h-14 bg-white/60 backdrop-blur-sm hover:bg-white/90 hover:shadow-md border border-gray-200/50 hover:border-indigo-300 rounded-xl transition-all duration-200 font-medium group"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                router.push("/profile/maintenance")
              }}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 group-hover:from-indigo-600 group-hover:to-indigo-700 transition-all shadow-sm">
                  <BookOpen className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm sm:text-base text-gray-900">Documentation technique</span>
              </div>
            </Button>
            <Button
              variant="ghost"
              type="button"
              className="w-full justify-start h-12 sm:h-14 bg-white/60 backdrop-blur-sm hover:bg-white/90 hover:shadow-md border border-gray-200/50 hover:border-purple-300 rounded-xl transition-all duration-200 font-medium group"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                router.push("/historique")
              }}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 group-hover:from-purple-600 group-hover:to-purple-700 transition-all shadow-sm">
                  <History className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm sm:text-base text-gray-900">Historique</span>
              </div>
            </Button>
            <Button
              variant="ghost"
              type="button"
              className="w-full justify-start h-12 sm:h-14 bg-white/60 backdrop-blur-sm hover:bg-white/90 hover:shadow-md border border-gray-200/50 hover:border-green-300 rounded-xl transition-all duration-200 font-medium group"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                router.push("/factures")
              }}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-green-500 to-green-600 group-hover:from-green-600 group-hover:to-green-700 transition-all shadow-sm">
                  <FileText className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm sm:text-base text-gray-900">Factures</span>
              </div>
            </Button>
            <Button
              variant="ghost"
              type="button"
              className="w-full justify-start h-12 sm:h-14 bg-white/60 backdrop-blur-sm hover:bg-white/90 hover:shadow-md border border-gray-200/50 hover:border-orange-300 rounded-xl transition-all duration-200 font-medium group"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                router.push("/profile/support")
              }}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 group-hover:from-orange-600 group-hover:to-orange-700 transition-all shadow-sm">
                  <HelpCircle className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm sm:text-base text-gray-900">Support</span>
              </div>
            </Button>
          </CardContent>
        </Card>

        {/* Logout - Responsive */}
        <div className="mb-6 sm:mb-8">
          <Button
            variant="outline"
            type="button"
            className="w-full h-12 sm:h-14 bg-white/60 backdrop-blur-sm hover:bg-gradient-to-br hover:from-red-500 hover:to-red-600 hover:text-white border-2 border-red-200 hover:border-red-500 text-red-600 rounded-xl transition-all duration-200 font-medium text-sm sm:text-base shadow-sm hover:shadow-lg"
            onClick={async (e) => {
              e.preventDefault()
              e.stopPropagation()
              try {
                await signOut()
              } catch (error) {
                console.error("[Profile] Erreur lors de la déconnexion:", error)
                // Forcer la déconnexion même en cas d'erreur
                window.location.href = "/login"
              }
            }}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Se déconnecter
          </Button>
        </div>
        </div>
        </div>
      </div>

      <BottomNavigation />

      {/* Dialog de confirmation de suppression */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-red-100">
              <Trash2 className="h-8 w-8 text-red-600" />
            </div>
            <AlertDialogTitle className="text-center">
              Supprimer le véhicule ?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              {vehicleToDelete && (
                <>
                  Êtes-vous sûr de vouloir supprimer{" "}
                  <span className="font-semibold text-gray-900">
                    {vehicleToDelete.brand} {vehicleToDelete.model}
                  </span>
                  ?
                  <br />
                  <span className="text-red-600 font-medium mt-2 block">
                    Cette action est irréversible.
                  </span>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:flex-row gap-3 mt-2">
            <AlertDialogCancel className="flex-1 sm:flex-initial">
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteVehicle}
              className="flex-1 sm:flex-initial bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-md hover:shadow-lg transition-all duration-200 rounded-xl font-medium"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Supprimer définitivement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

