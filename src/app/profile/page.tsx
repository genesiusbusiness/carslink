"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { User, Car, Settings, LogOut, Plus, Trash2, Edit, FileText, History, HelpCircle } from "lucide-react"
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
      const { data: vehiclesData, error: vehiclesError } = await supabase
        .from("vehicles")
        .select("*")
        .eq("flynesis_user_id", user.id)
        .order("created_at", { ascending: false })

      if (vehiclesError) {
        console.error("Error loading vehicles:", vehiclesError)
      } else if (vehiclesData) {
        setVehicles(vehiclesData)
      }
    } catch (error) {
      console.error("Error loading data:", error)
      toast({
        title: "Erreur",
        description: "Impossible de charger les données du profil",
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
        message: `${vehicleToDelete.brand} ${vehicleToDelete.model} a été supprimé avec succès.`,
        variant: "success",
      })

      setDeleteDialogOpen(false)
      setVehicleToDelete(null)
      loadData()
    } catch (error: any) {
      showElegantToast({
        title: "Erreur",
        message: error.message || "Une erreur est survenue lors de la suppression",
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
      <div className="h-full w-full bg-gradient-to-br from-blue-50/40 via-white to-purple-50/20 overflow-y-auto pb-32 safe-area-top safe-area-bottom">
      {/* Mobile Container avec effet Liquid Glass */}
      <div className="w-full h-full bg-white/70 backdrop-blur-2xl overflow-y-auto pb-32">
        <div className="px-6 py-6 pb-8">
          {/* Profile Header */}
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/10 to-blue-500/20 rounded-2xl blur-xl opacity-50" />
            <div className="relative bg-white/60 backdrop-blur-xl border border-white/40 rounded-2xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-lg">
                  <User className="h-8 w-8 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-light text-gray-900">{displayName}</h2>
                  <p className="text-sm text-gray-500 font-light">{user?.email || ""}</p>
                  {profile?.phone && (
                    <p className="text-sm text-gray-500 font-light">{profile.phone}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

        {/* Vehicles */}
        <Card className="mb-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Mes véhicules</CardTitle>
                <CardDescription>
                  Gérez vos véhicules enregistrés
                </CardDescription>
              </div>
              <Button
                size="sm"
                type="button"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-md hover:shadow-lg transition-all rounded-xl"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  console.log("[Profile] Navigation vers ajout de véhicule")
                  router.push("/profile/vehicles/new")
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Ajouter
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {vehicles.length > 0 ? (
              <div className="space-y-3">
                {vehicles.map((vehicle) => (
                  <div
                    key={vehicle.id}
                    className="group relative bg-white border-2 border-gray-200 rounded-2xl p-5 hover:border-gray-300 hover:shadow-lg hover:shadow-gray-100 transition-all duration-300 transform hover:-translate-y-0.5"
                  >
                    <div className="flex items-start gap-4">
                      {/* Icône véhicule */}
                      <div className="flex-shrink-0 h-12 w-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                        <Car className="h-6 w-6 text-white" />
                      </div>
                      
                      {/* Informations du véhicule */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 text-base mb-1">
                              {vehicle.brand} {vehicle.model}
                            </h3>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
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
                    
                    {/* Boutons d'action */}
                    <div className="mt-4 flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        type="button"
                        className="flex-1 max-w-[150px] h-11 font-medium bg-white hover:bg-gradient-to-r hover:from-blue-50 hover:to-blue-100 hover:border-blue-400 hover:text-blue-700 hover:shadow-md transition-all duration-200 rounded-xl border-2 cursor-pointer active:scale-95"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          console.log("[Profile] Navigation vers édition du véhicule:", vehicle.id)
                          const url = `/profile/vehicles/${vehicle.id}`
                          console.log("[Profile] URL:", url)
                          router.push(url)
                        }}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Modifier
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 max-w-[150px] h-11 font-medium bg-white hover:bg-gradient-to-r hover:from-red-50 hover:to-red-100 hover:border-red-400 hover:text-red-700 hover:shadow-md transition-all duration-200 rounded-xl border-2 cursor-pointer active:scale-95"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleDeleteClick(vehicle)
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Supprimer
                      </Button>
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
                  className="bg-gradient-to-r from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100 border-2 border-blue-200 hover:border-blue-300 rounded-xl font-medium"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    console.log("[Profile] Navigation vers ajout de véhicule (vide)")
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

        {/* Settings */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Paramètres</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="ghost"
              type="button"
              className="w-full justify-start h-14 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:border-blue-200 border-2 border-transparent rounded-xl transition-all font-medium group"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                console.log("[Profile] Navigation vers paramètres")
                router.push("/profile/settings")
              }}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 group-hover:bg-blue-200 transition-colors">
                  <Settings className="h-4 w-4 text-blue-600" />
                </div>
                <span>Préférences</span>
              </div>
            </Button>
            <Button
              variant="ghost"
              type="button"
              className="w-full justify-start h-14 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:border-blue-200 border-2 border-transparent rounded-xl transition-all font-medium group"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                console.log("[Profile] Navigation vers historique")
                router.push("/historique")
              }}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100 group-hover:bg-purple-200 transition-colors">
                  <History className="h-4 w-4 text-purple-600" />
                </div>
                <span>Historique</span>
              </div>
            </Button>
            <Button
              variant="ghost"
              type="button"
              className="w-full justify-start h-14 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:border-blue-200 border-2 border-transparent rounded-xl transition-all font-medium group"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                console.log("[Profile] Navigation vers factures")
                router.push("/factures")
              }}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100 group-hover:bg-green-200 transition-colors">
                  <FileText className="h-4 w-4 text-green-600" />
                </div>
                <span>Factures</span>
              </div>
            </Button>
            <Button
              variant="ghost"
              type="button"
              className="w-full justify-start h-14 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:border-blue-200 border-2 border-transparent rounded-xl transition-all font-medium group"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                console.log("[Profile] Navigation vers support")
                router.push("/profile/support")
              }}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-100 group-hover:bg-orange-200 transition-colors">
                  <HelpCircle className="h-4 w-4 text-orange-600" />
                </div>
                <span>Support</span>
              </div>
            </Button>
          </CardContent>
        </Card>

        {/* Logout */}
        <Button
          variant="outline"
          type="button"
          className="w-full h-12 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 rounded-xl transition-all font-medium"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            console.log("[Profile] Déconnexion...")
            signOut()
          }}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Se déconnecter
        </Button>
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
              className="flex-1 sm:flex-initial bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-lg hover:shadow-xl transition-all duration-200"
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

