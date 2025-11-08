"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import { Search, Wrench, Calendar, Shield, Star, Home as HomeIcon, User, Bell, Menu, MapPin, ChevronRight, Zap, Plus, TrendingUp, Circle, Droplet, ArrowRight, Bot } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BottomNavigation } from "@/components/layout/BottomNavigation"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/lib/hooks/use-auth"
import type { Garage, Profile, Appointment } from "@/lib/types/database"
import { formatDate, formatCurrency, formatDateTime, formatTime } from "@/lib/utils"
import { X } from "lucide-react"
import { getUserPosition, calculateDistance, formatDistance, geocodeAddress, isWithinRadius } from "@/lib/utils/geolocation"

export default function HomePage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [garages, setGarages] = useState<Garage[]>([])
  const [garageReviewsCount, setGarageReviewsCount] = useState<Record<string, number>>({})
  const [loadingGarages, setLoadingGarages] = useState(true)
  const [currentAppointment, setCurrentAppointment] = useState<Appointment | null>(null)
  const [loadingAppointments, setLoadingAppointments] = useState(true)
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showNotifications, setShowNotifications] = useState(false)
  const [loadingNotifications, setLoadingNotifications] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<{ garages: Garage[], services: string[] }>({ garages: [], services: [] })
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [userPosition, setUserPosition] = useState<{ latitude: number; longitude: number; source: 'gps' | 'default' } | null>(null)
  const [locationStatus, setLocationStatus] = useState<'loading' | 'success' | 'default' | 'denied'>('loading')

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
      return
    }

    if (user) {
      loadProfile()
      loadCurrentAppointment()
      loadNotifications()
      // Charger la position puis les garages
      initializeGeolocation()
    }
  }, [user, loading, router])

  const initializeGeolocation = async () => {
    setLocationStatus('loading')
    console.log("📍 Initialisation de la géolocalisation...")
    const position = await getUserPosition()
    console.log("📍 Position obtenue:", position)
    setUserPosition(position)
    
    if (!position) {
      console.warn("⚠️ Géolocalisation refusée ou indisponible")
      setLocationStatus('denied')
      // Ne pas charger les garages si la géolocalisation est refusée
      setGarages([])
      setLoadingGarages(false)
      return
    }
    
    setLocationStatus(position.source === 'gps' ? 'success' : 'default')
    console.log("✅ Géolocalisation réussie, chargement des garages...")
    // Charger les garages une fois la position obtenue
    loadGarages(position)
  }

  const loadProfile = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from("fly_accounts")
        .select("*")
        .eq("auth_user_id", user.id)
        .maybeSingle()

      if (!error && data) {
        setProfile(data as any)
        
        // Vérifier si l'utilisateur a un profil CarsLink (carslink_clients)
        // Si ce n'est pas le cas, le créer automatiquement lors de la première connexion
        console.log("🔍 Vérification si le profil CarsLink existe pour flyid:", data.id)
        const { data: existingClient, error: clientCheckError } = await supabase
          .from("carslink_clients")
          .select("id")
          .eq("flyid", data.id)
          .maybeSingle()

        console.log("📊 Résultat de la vérification carslink_clients:", { existingClient, clientCheckError })

        if (!existingClient && !clientCheckError) {
          // Aucun profil CarsLink trouvé, créer automatiquement
          console.log("🆕 Création automatique du profil CarsLink pour l'utilisateur:", data.id)
          console.log("📋 Données fly_accounts:", { id: data.id, phone: data.phone })
          
          // Créer carslink_clients avec ON CONFLICT pour éviter les doublons
          console.log("⏳ Tentative d'insertion dans carslink_clients...")
          const { data: newClient, error: clientError } = await supabase
            .from("carslink_clients")
            .insert({
              flyid: data.id,
              phone: data.phone || null,
            })
            .select("id")
            .single()
            // Note: Si une contrainte unique existe sur flyid, l'insertion échouera si un doublon existe
            // Dans ce cas, on récupère l'entrée existante

          console.log("📥 Résultat de l'insertion carslink_clients:", { newClient, clientError })

          if (clientError) {
            // Si l'erreur est due à un doublon (contrainte unique), récupérer l'entrée existante
            if (clientError.code === '23505' || clientError.message?.includes('duplicate') || clientError.message?.includes('unique')) {
              console.log("⚠️ Doublon détecté, récupération de l'entrée existante...")
              const { data: existingClientData, error: fetchError } = await supabase
                .from("carslink_clients")
                .select("id")
                .eq("flyid", data.id)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle()
              
              if (!fetchError && existingClientData) {
                console.log("✅ Entrée carslink_clients existante trouvée:", existingClientData.id)
              } else {
                console.error("❌ Erreur lors de la récupération de l'entrée existante:", fetchError)
              }
            } else {
              console.error("❌ Erreur lors de la création de carslink_clients:", clientError)
              console.error("📋 Détails de l'erreur:", {
                message: clientError.message,
                code: clientError.code,
                details: clientError.details,
                hint: clientError.hint
              })
            }
          } else {
            console.log("✅ carslink_clients créé automatiquement:", newClient?.id)
          }

          // Créer carslink_users (pour CarsLinkSupport)
          const { data: existingUser, error: userCheckError } = await supabase
            .from("carslink_users")
            .select("id")
            .eq("flynesis_user_id", data.id)
            .maybeSingle()

          if (!existingUser && !userCheckError) {
            console.log("⏳ Tentative d'insertion dans carslink_users...")
            const { data: newUser, error: userError } = await supabase
              .from("carslink_users")
              .insert({
                flynesis_user_id: data.id,
                role: 'client',
                is_active: true,
                is_deleted: false,
              })
              .select("id")
              .single()

            console.log("📥 Résultat de l'insertion carslink_users:", { newUser, userError })

            if (userError) {
              console.error("❌ Erreur lors de la création de carslink_users:", userError)
              console.error("📋 Détails de l'erreur:", {
                message: userError.message,
                code: userError.code,
                details: userError.details,
                hint: userError.hint
              })
            } else {
              console.log("✅ carslink_users créé automatiquement:", newUser?.id)
            }
          } else if (userCheckError) {
            console.error("❌ Erreur lors de la vérification de carslink_users:", userCheckError)
          } else if (existingUser) {
            console.log("ℹ️ carslink_users existe déjà:", existingUser.id)
          }
        }
      } else if (error && (error.code === 'PGRST116' || error.message?.includes('0 rows'))) {
        // Le compte fly_accounts est généralement créé automatiquement par le trigger handle_new_auth_user()
        // Attendre un peu et réessayer
        setTimeout(async () => {
          const { data: retryAccount } = await supabase
            .from("fly_accounts")
            .select("*")
            .eq("auth_user_id", user.id)
            .maybeSingle()
          if (retryAccount) {
            setProfile(retryAccount as any)
            
            // Vérifier et créer le profil CarsLink si nécessaire
            const { data: existingClient } = await supabase
              .from("carslink_clients")
              .select("id")
              .eq("flyid", retryAccount.id)
              .maybeSingle()

            if (!existingClient) {
              // Créer carslink_clients
              await supabase
                .from("carslink_clients")
                .insert({
                  flyid: retryAccount.id,
                  phone: retryAccount.phone || null,
                })

              // Créer carslink_users
              await supabase
                .from("carslink_users")
                .insert({
                  flynesis_user_id: retryAccount.id,
                  role: 'client',
                  is_active: true,
                  is_deleted: false,
                })
            }
          } else {
            // Pas de données de profil, ne rien faire
          }
        }, 2000)
      } else if (error) {
        console.error("❌ Erreur lors du chargement du profil:", error)
      }
    } catch (err) {
      console.error("❌ Erreur dans loadProfile:", err)
    }
  }

  /**
   * Charge les garages en fonction de la position de l'utilisateur
   * - Affiche les garages dans un rayon de 30km
   * - Géocode automatiquement les garages sans coordonnées
   * - Trie par distance puis par note
   */
  const loadGarages = async (position?: { latitude: number; longitude: number; source: 'gps' | 'default' }) => {
    try {
      const userPos = position || userPosition
      
      // Si pas de position, ne pas charger les garages (géolocalisation requise)
      if (!userPos) {
        setGarages([])
        setLoadingGarages(false)
        return
      }
      
      // Pour les tests : pas de limite de portée - afficher tous les garages
      const RADIUS_KM = Infinity // Pas de limite pour les tests


      // Charger tous les garages
      // Essayer de filtrer par status='active' si la colonne existe
      let { data: allGarages, error, status, statusText } = await supabase
        .from("carslink_garages")
        .select("*")
        .eq("status", "active")
      
      // Si erreur liée à la colonne status, réessayer sans filtre
      if (error && (error.code === '42703' || error.message?.includes('column') || error.message?.includes('status'))) {
        const retryResult = await supabase
          .from("carslink_garages")
          .select("*")
        
        if (!retryResult.error) {
          allGarages = retryResult.data
          error = null
        } else {
          error = retryResult.error
        }
      }

      if (error) {
        console.error("❌ Erreur lors du chargement des garages:", error)
        setGarages([])
        setLoadingGarages(false)
        return
      }

      if (!allGarages || allGarages.length === 0) {
        console.warn("⚠️ Aucun garage trouvé dans la base de données")
        setGarages([])
        setLoadingGarages(false)
        return
      }

      console.log("✅ Garages chargés:", allGarages.length)


      // Géocoder les garages sans coordonnées
      const garagesWithCoords: (Garage & { distance?: number })[] = []
      
      
      for (const garage of allGarages) {
        let lat = garage.latitude
        let lon = garage.longitude


        // Si pas de coordonnées, géocoder l'adresse
        if (!lat || !lon) {
          if (garage.address || garage.city) {
            const coords = await geocodeAddress(
              garage.address || '',
              garage.city || null,
              garage.postal_code || null
            )

            if (coords) {
              lat = coords.latitude
              lon = coords.longitude

              // Sauvegarder les coordonnées dans Supabase (seulement si réussite)
              try {
                const { error: updateError } = await supabase
                  .from("carslink_garages")
                  .update({ latitude: lat, longitude: lon })
                  .eq("id", garage.id)
                
                if (!updateError) {
                } else {
                }
              } catch (updateError) {
              }
              
              // Mettre à jour l'objet garage
              garage.latitude = lat
              garage.longitude = lon
            } else {
            }
          } else {
          }
        }

        // Si on a des coordonnées, calculer la distance
        if (lat && lon) {
          const distance = calculateDistance(userPos.latitude, userPos.longitude, lat, lon)
          
          // Mode test : afficher tous les garages sans limite de portée
          garagesWithCoords.push({ ...garage, distance })
        } else {
        }
      }

      // Trier par distance (croissante)
      // Note: Le tri par rating est désactivé car la colonne n'existe pas
      garagesWithCoords.sort((a, b) => {
        const distA = a.distance || Infinity
        const distB = b.distance || Infinity
        return distA - distB
      })


      // Conserver la distance dans les garages
      const finalGarages = garagesWithCoords.map((garage) => ({
        ...garage,
        distance: garage.distance, // Conserver la distance
      }))

      console.log("✅ Garages avec distances:", finalGarages.length)
      setGarages(finalGarages as any)
      
      // Charger le nombre d'avis pour ces garages
      const garageIds = finalGarages.map((g: any) => g.id)
      await loadGaragesReviewsCount(garageIds)
    } catch (error) {
      console.error("❌ Erreur dans loadGarages:", error)
      setGarages([])
    } finally {
      setLoadingGarages(false)
    }
  }

  // Charger le nombre d'avis pour les garages
  const loadGaragesReviewsCount = async (garageIds: string[]) => {
    if (garageIds.length === 0) return
    
    try {
      // Essayer carslink_reviews d'abord
      let { data, error } = await supabase
        .from("carslink_reviews")
        .select("garage_id")
        .in("garage_id", garageIds)
      
      if (error && (error.code === '42P01' || error.message?.includes('does not exist'))) {
        // Essayer carslink_garage_reviews
        const retryResult = await supabase
          .from("carslink_garage_reviews")
          .select("garage_id")
          .in("garage_id", garageIds)
        
        if (!retryResult.error) {
          data = retryResult.data
        }
      }
      
      if (data) {
        const counts: Record<string, number> = {}
        data.forEach((review: any) => {
          counts[review.garage_id] = (counts[review.garage_id] || 0) + 1
        })
        setGarageReviewsCount(prev => ({ ...prev, ...counts }))
      }
    } catch (error) {
      // Error loading reviews count
    }
  }

  const loadCurrentAppointment = async () => {
    if (!user) return

    try {
      const now = new Date()
      
      // Récupérer les réservations en cours ou à venir (pas terminées ni annulées)
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .eq("flynesis_user_id", user.id)
        .in("status", ["pending", "confirmed", "in_progress"])
        .gte("start_time", now.toISOString())
        .order("start_time", { ascending: true })
        .limit(1)

      if (!error && data && data.length > 0) {
        setCurrentAppointment(data[0])
        
        // Si on a un garage_id, charger les infos du garage
        if (data[0].garage_id) {
          const { data: garageData } = await supabase
            .from("carslink_garages")
            .select("name, city")
            .eq("id", data[0].garage_id)
            .single()
          
          if (garageData) {
            setCurrentAppointment({ ...data[0], garage: garageData } as any)
          }
        }
      } else {
        setCurrentAppointment(null)
      }
    } catch (error) {
      console.error("❌ Erreur dans loadCurrentAppointment:", error)
      setCurrentAppointment(null)
    } finally {
      setLoadingAppointments(false)
    }
  }

  const loadNotifications = async () => {
    if (!user) return

    try {
      // Charger le compteur de notifications non lues pour le badge
      const { data: unreadData } = await supabase
        .from("client_notifications")
        .select("id")
        .eq("flynesis_user_id", user.id)
        .eq("read", false)

      if (unreadData) {
        setUnreadCount(unreadData.length)
      }

      // Charger seulement les notifications NON LUSES pour l'affichage
      const { data, error } = await supabase
        .from("client_notifications")
        .select("*")
        .eq("flynesis_user_id", user.id)
        .eq("read", false)
        .order("created_at", { ascending: false })
        .limit(10)

      if (!error && data) {
        setNotifications(data || [])
      }
    } catch (error) {
      console.error("❌ Erreur dans loadNotifications:", error)
    }
  }

  const markAllAsRead = async () => {
    if (!user) return

    try {
      // Filtrer les notifications non factices pour la suppression en base
      const realNotifications = notifications.filter(n => !n.id.startsWith("mock-"))
      
      if (realNotifications.length > 0) {
        const notificationIds = realNotifications.map(n => n.id)
        const { error } = await supabase
          .from("client_notifications")
          .delete()
          .eq("flynesis_user_id", user.id)
          .in("id", notificationIds)

        if (error) {
          // Error deleting notifications
        }
      }

      // Supprimer toutes les notifications de l'état local (factices et réelles)
      setNotifications([])
      setUnreadCount(0)
    } catch (error) {
      // Error deleting all notifications
      // Même en cas d'erreur, supprimer de l'état local
      setNotifications([])
      setUnreadCount(0)
    }
  }

  const performSearch = async (query: string) => {
    if (!query || query.length < 2) {
      setSearchResults({ garages: [], services: [] })
      setShowSearchResults(false)
      return
    }

    setIsSearching(true)
    setShowSearchResults(true)

    try {
      const searchLower = query.toLowerCase()

      // Liste de services cohérents avec CarsLinkSupport
      const serviceKeywords: Record<string, string[]> = {
        'pneu': ['pneu', 'pneus', 'montage pneu', 'montage pneus', 'réparation pneu', 'géométrie'],
        'pneus': ['pneu', 'pneus', 'montage pneu', 'montage pneus', 'réparation pneu', 'géométrie'],
        'vidange': ['vidange', 'vidange moteur', 'filtre à huile'],
        'révision': ['révision', 'révision complète'],
        'freinage': ['freinage', 'plaquettes', 'disques', 'freins', 'réparation freinage'],
        'freins': ['freinage', 'plaquettes', 'disques', 'freins', 'réparation freinage'],
        'climatisation': ['climatisation', 'clim', 'recharge climatisation', 'réparation climatisation'],
        'clim': ['climatisation', 'clim', 'recharge climatisation', 'réparation climatisation'],
        'carrosserie': ['carrosserie', 'peinture', 'pare-chocs', 'rétroviseur'],
        'peinture': ['carrosserie', 'peinture', 'peinture carrosserie'],
        'diagnostic': ['diagnostic', 'diagnostic électronique', 'codes défaut'],
        'moteur': ['moteur', 'réparation moteur', 'courroie distribution'],
        'suspension': ['suspension', 'réparation suspension', 'amortisseurs'],
        'embrayage': ['embrayage', 'réparation embrayage'],
        'échappement': ['échappement', 'silencieux', 'ligne échappement'],
        'batterie': ['batterie', 'test batterie'],
        'contrôle technique': ['contrôle technique', 'ct', 'contre-visite'],
        'ct': ['contrôle technique', 'ct', 'contre-visite']
      }

      // Trouver les mots-clés de service correspondants
      const matchingServiceKeywords: string[] = []
      for (const [key, keywords] of Object.entries(serviceKeywords)) {
        if (searchLower.includes(key) || keywords.some(k => searchLower.includes(k))) {
          matchingServiceKeywords.push(...keywords)
        }
      }

      // Si on recherche un service spécifique, chercher dans carslink_garage_services
      let garagesData: any[] = []
      if (matchingServiceKeywords.length > 0) {
        try {
          // Construire la requête avec plusieurs conditions OR
          const orConditions = matchingServiceKeywords.map(keyword => `name.ilike.%${keyword}%`).join(',')
          
          const { data: servicesData, error: servicesError } = await supabase
            .from("carslink_garage_services")
            .select("garage_id, name, garage:carslink_garages(*)")
            .eq("is_active", true)
            .or(orConditions)
            .limit(20)

          if (!servicesError && servicesData && servicesData.length > 0) {
            const garageMap = new Map<string, any>()
            servicesData.forEach((item: any) => {
              if (item.garage && !garageMap.has(item.garage.id)) {
                garageMap.set(item.garage.id, item.garage)
              }
            })
            garagesData = Array.from(garageMap.values()).slice(0, 5)
          }
        } catch (error) {
          console.error("❌ Erreur lors de la recherche de services:", error)
        }
      }

      // Si pas de résultat par service, recherche classique par nom/ville/description
      if (garagesData.length === 0) {
        try {
          let query = supabase
            .from("carslink_garages")
            .select("*")

          try {
            query = query.eq("status", "active")
          } catch (e) {
            // Status column might not exist
          }

          // Utiliser la syntaxe correcte pour OR avec ilike
          const orConditions = `name.ilike.%${searchLower}%,city.ilike.%${searchLower}%,description.ilike.%${searchLower}%`
          const result = await query
            .or(orConditions)
            .limit(5)

          if (!result.error && result.data) {
            garagesData = result.data
          }
        } catch (error) {
          console.error("❌ Erreur lors de la recherche de garages:", error)
        }
      }

      // Recherche dans les services (liste cohérente avec CarsLinkSupport)
      const allServices = [
        'Vidange moteur', 'Révision complète', 'Pneus', 'Montage pneus', 'Réparation pneu',
        'Géométrie des roues', 'Freinage', 'Réparation freinage', 'Climatisation',
        'Recharge climatisation', 'Carrosserie', 'Peinture carrosserie', 'Diagnostic électronique',
        'Contrôle technique', 'Batterie', 'Moteur', 'Suspension', 'Embrayage', 'Échappement'
      ]
      const matchingServices = allServices.filter(service => 
        service.toLowerCase().includes(searchLower)
      )

      // Recherche dans les spécialités des garages
      let matchingGarages: Garage[] = []
      if (garagesData && garagesData.length > 0) {
        matchingGarages = garagesData.filter((garage: any) => {
          const matchesName = garage.name?.toLowerCase().includes(searchLower)
          const matchesCity = garage.city?.toLowerCase().includes(searchLower)
          const matchesDescription = garage.description?.toLowerCase().includes(searchLower)
          const matchesSpecialties = garage.specialties?.some((spec: string) => 
            spec.toLowerCase().includes(searchLower)
          )
          return matchesName || matchesCity || matchesDescription || matchesSpecialties
        }) || []
      }

      setSearchResults({ 
        garages: matchingGarages.slice(0, 5), 
        services: matchingServices.slice(0, 5)
      })
    } catch (error) {
      setSearchResults({ garages: [], services: [] })
    } finally {
      setIsSearching(false)
    }
  }

  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setSearchResults({ garages: [], services: [] })
      setShowSearchResults(false)
      return
    }

    const timeoutId = setTimeout(() => {
      performSearch(searchQuery)
    }, 300) // Debounce de 300ms

    return () => clearTimeout(timeoutId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery])

  const services = [
    { title: 'Révision', icon: Wrench, color: 'bg-blue-500/90' },
    { title: 'Vidange', icon: Wrench, color: 'bg-purple-500/90' },
    { title: 'Freinage', icon: Wrench, color: 'bg-red-500/90' },
    { title: 'Climatisation', icon: Wrench, color: 'bg-green-500/90' },
  ]

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      pending: "secondary",
      confirmed: "default",
      cancelled: "destructive",
      completed: "default",
    }
    const variant = variants[status] || "secondary"
    const labels: Record<string, string> = {
      pending: "En attente",
      confirmed: "Confirmé",
      cancelled: "Annulé",
      completed: "Terminé",
    }
    return (
      <Badge variant={variant}>{labels[status] || status}</Badge>
    )
  }

  return (
    <div className="fixed inset-0 w-full h-full overflow-y-auto bg-gradient-to-br from-blue-50/40 via-white to-purple-50/20 pb-28 sm:pb-32 safe-area-top safe-area-bottom">
      {/* Header */}
      <div className="w-full bg-white/40 backdrop-blur-xl border-b border-white/20 sticky top-0 z-10 safe-area-top">
        <div className="w-full px-4 sm:px-6 py-4 sm:py-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="flex-1 min-w-0">
                <h1 className="text-xl sm:text-2xl font-light text-gray-900 truncate">Bonjour {profile?.first_name || 'à vous'}</h1>
                <p className="text-xs text-gray-500 font-light mt-1 truncate">
                  {userPosition ? `Vous êtes à ${userPosition.source === 'gps' ? 'votre position' : 'Paris'}` : 'Chargement...'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="relative">
                <motion.button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative h-10 w-10 rounded-full bg-white/50 backdrop-blur-sm flex items-center justify-center border border-white/30 shadow-sm perfect-center"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  <Bell className="h-5 w-5 text-gray-600" />
                  {unreadCount > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 rounded-full border-2 border-white flex items-center justify-center perfect-center"
                    >
                      <span className="text-[10px] text-white font-bold">{unreadCount > 99 ? '99+' : unreadCount}</span>
                    </motion.span>
                  )}
                </motion.button>
                <AnimatePresence>
                  {showNotifications && (
                    <>
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        onClick={() => setShowNotifications(false)}
                        className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-lg pointer-events-auto"
                        style={{ 
                          position: 'fixed',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          width: '100vw',
                          height: '100vh',
                          zIndex: 9999,
                          backgroundColor: 'rgba(0, 0, 0, 0.85)'
                        }}
                      />
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        onClick={(e) => e.stopPropagation()}
                        className="fixed right-2 xs:right-3 sm:right-4 top-16 xs:top-20 w-56 xs:w-52 sm:w-64 max-w-[240px] z-[10000] bg-white/95 backdrop-blur-lg rounded-lg border border-gray-200/50 shadow-xl shadow-black/20 overflow-hidden pointer-events-auto"
                      >
                        <div className="px-2.5 py-1.5 border-b border-gray-100/80 flex items-center justify-between bg-gradient-to-r from-gray-50/50 to-white">
                          <h3 className="text-[10px] font-semibold text-gray-800">Notifications</h3>
                          <motion.button
                            onClick={(e) => {
                              e.stopPropagation()
                              setShowNotifications(false)
                            }}
                            className="h-4 w-4 rounded-full hover:bg-gray-200/60 flex items-center justify-center transition-colors"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                          >
                            <X className="h-2.5 w-2.5 text-gray-500" />
                          </motion.button>
                        </div>
                        <div className="max-h-[160px] overflow-y-auto custom-scrollbar">
                          {notifications.length > 0 ? (
                            <div className="divide-y divide-gray-100/60">
                              {notifications.slice(0, 5).map((notification) => (
                                <motion.div
                                  key={notification.id}
                                  initial={{ opacity: 0, y: 5 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className="px-2.5 py-2 hover:bg-gray-50/80 transition-colors cursor-pointer group"
                                  onClick={() => {
                                    if (notification.link) {
                                      router.push(notification.link)
                                    }
                                    setShowNotifications(false)
                                  }}
                                >
                                  <div className="flex items-start gap-2">
                                    <div className={`h-1 w-1 rounded-full mt-1.5 flex-shrink-0 ${!notification.read ? 'bg-violet-500 shadow-sm shadow-violet-500/50' : 'bg-transparent'}`} />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-[10px] font-semibold text-gray-900 mb-0.5 line-clamp-1 leading-tight">{notification.title}</p>
                                      <p className="text-[9px] text-gray-500 font-light line-clamp-2 leading-snug">{notification.message}</p>
                                    </div>
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          ) : (
                            <div className="p-4 text-center flex items-center justify-center min-h-[100px]">
                              <div>
                                <Bell className="h-6 w-6 text-gray-300 mx-auto mb-1.5" />
                                <p className="text-[10px] text-gray-600 font-medium mb-0.5">Aucune notification</p>
                                <p className="text-[9px] text-gray-400 font-light">Vous n'avez pas encore de notifications</p>
                              </div>
                            </div>
                          )}
                        </div>
                        {notifications.length > 0 && (
                          <div className="relative px-2 py-1 border-t border-gray-100/80 bg-gradient-to-r from-gray-50/30 to-white flex-shrink-0">
                            <motion.button
                              onClick={(e) => {
                                e.stopPropagation()
                                router.push('/notifications')
                                setShowNotifications(false)
                              }}
                              className="w-full py-1 px-2 text-[9px] text-violet-600 font-semibold hover:text-violet-700 rounded-md hover:bg-violet-50/60 transition-colors flex items-center justify-center gap-1"
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <span>Voir toutes</span>
                              <ChevronRight className="h-2 w-2" />
                            </motion.button>
                          </div>
                        )}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
              <motion.button 
                onClick={() => router.push('/profile')}
                className="h-10 w-10 rounded-full bg-white/50 backdrop-blur-sm flex items-center justify-center border border-white/30 shadow-sm perfect-center"
                whileHover={{ scale: 1.1, boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}
                whileTap={{ scale: 0.9 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <User className="h-5 w-5 text-gray-600" />
              </motion.button>
            </div>
          </div>

          {/* Search Bar intelligente avec suggestions - Responsive */}
          <div className="relative mt-4 sm:mt-6">
            <motion.div 
              className="relative"
              whileHover={{ scale: 1.01 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-500 pointer-events-none z-10" />
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-blue-500/20 rounded-xl blur-md opacity-0 focus-within:opacity-100 transition-opacity duration-300" />
                <Input
                  placeholder="Rechercher un service ou garage..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => {
                    if (searchQuery.length >= 2) {
                      setShowSearchResults(true)
                    }
                  }}
                  className="relative pl-11 sm:pl-12 pr-4 h-11 sm:h-12 rounded-xl border-2 border-gray-300/80 bg-white/90 backdrop-blur-md font-light text-sm sm:text-base shadow-lg focus:shadow-xl focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200/50 transition-all duration-300"
                />
              </div>
            </motion.div>

            {/* Dropdown de résultats de recherche */}
            <AnimatePresence>
              {showSearchResults && (searchQuery.length >= 2 || searchResults.garages.length > 0 || searchResults.services.length > 0) && (
                <>
                  {/* Backdrop simple */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 z-[35] bg-black/10 backdrop-blur-sm"
                    onClick={() => setShowSearchResults(false)}
                  />
                  
                  {/* Container simple */}
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute left-0 right-0 top-full mt-2 z-[40]"
                  >
                    {/* Container principal simplifié */}
                    <div className="bg-white/95 backdrop-blur-xl rounded-2xl border border-white/50 shadow-lg overflow-hidden">
                    {isSearching ? (
                      <div className="p-6 text-center">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"
                        />
                        <p className="text-sm text-gray-500 font-light">Recherche en cours...</p>
                      </div>
                    ) : searchResults.garages.length === 0 && searchResults.services.length === 0 ? (
                      <div className="p-6 text-center">
                        <Search className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-600 font-medium mb-1">Aucun résultat trouvé</p>
                        <p className="text-xs text-gray-500 font-light">Essayez avec d'autres mots-clés</p>
                      </div>
                    ) : (
                      <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                        {/* Services suggérés */}
                        {searchResults.services.length > 0 && (
                          <div className="p-3 border-b border-gray-100">
                            <div className="flex items-center gap-2 mb-2 px-2">
                              <TrendingUp className="h-4 w-4 text-blue-600" />
                              <p className="text-xs font-medium text-gray-600 uppercase">Services</p>
                            </div>
                            <div className="space-y-1">
                              {searchResults.services.map((service) => (
                                <motion.button
                                  key={service}
                                  onClick={() => {
                                    router.push(`/search?service=${service}`)
                                    setShowSearchResults(false)
                                    setSearchQuery("")
                                  }}
                                  className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
                                  whileHover={{ x: 2 }}
                                  whileTap={{ scale: 0.98 }}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                                      <Wrench className="h-4 w-4 text-blue-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-gray-900">{service}</p>
                                    </div>
                                  </div>
                                </motion.button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Garages suggérés */}
                        {searchResults.garages.length > 0 && (
                          <div className="p-3">
                            <div className="flex items-center gap-2 mb-2 px-2">
                              <MapPin className="h-4 w-4 text-purple-600" />
                              <p className="text-xs font-medium text-gray-600 uppercase">Garages</p>
                            </div>
                            <div className="space-y-1">
                              {searchResults.garages.slice(0, 5).map((garage) => (
                                <motion.div
                                  key={garage.id}
                                  className="w-full px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
                                  whileHover={{ x: 2 }}
                                  whileTap={{ scale: 0.98 }}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                                      <MapPin className="h-4 w-4 text-purple-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-gray-900 mb-0.5 line-clamp-1">{garage.name}</p>
                                      {garage.city && (
                                        <p className="text-xs text-gray-500 font-light">{garage.city}</p>
                                      )}
                                    </div>
                                    <motion.button 
                                      className="relative px-2 py-0.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full text-[8px] font-medium shadow-sm overflow-hidden perfect-center h-[20px] min-w-[50px]"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        router.push(`/reservation?garage=${garage.id}`)
                                        setShowSearchResults(false)
                                        setSearchQuery("")
                                      }}
                                      whileHover={{ scale: 1.05, boxShadow: "0 2px 8px rgba(59,130,246,0.3)" }}
                                      whileTap={{ scale: 0.95 }}
                                    >
                                      <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 hover:opacity-100 transition-opacity" />
                                      <span className="relative z-10 leading-tight tracking-normal">Réserver</span>
                                    </motion.button>
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Action de recherche complète */}
                        <div className="p-3 border-t border-gray-100">
                          <motion.button
                            onClick={() => {
                              router.push(`/search?q=${encodeURIComponent(searchQuery)}`)
                              setShowSearchResults(false)
                            }}
                            className="w-full py-2.5 px-4 text-sm text-blue-600 font-medium rounded-lg hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <span>Voir tous les résultats</span>
                            <ChevronRight className="h-4 w-4" />
                          </motion.button>
                        </div>
                      </div>
                    )}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-28 sm:pb-32">

        {/* Réservation en cours avec Liquid Glass */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="px-6 py-5 bg-white/30 backdrop-blur-sm border-b border-white/20"
        >
          <AnimatePresence mode="wait">
            {currentAppointment ? (
              <motion.div
                key="appointment"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                className="relative group cursor-pointer"
                onClick={() => router.push(`/appointments`)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/10 to-blue-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative bg-white/60 backdrop-blur-xl border border-white/40 rounded-2xl p-4 shadow-[0_8px_32px_rgba(59,130,246,0.12)] group-hover:shadow-[0_12px_40px_rgba(59,130,246,0.2)] transition-all duration-300">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <motion.div 
                        className="relative h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-[0_4px_20px_rgba(59,130,246,0.4)]"
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        transition={{ type: "spring", stiffness: 400, damping: 17 }}
                      >
                        <div className="absolute inset-0 bg-white/30 rounded-xl blur-sm" />
                        <Calendar className="h-6 w-6 text-white relative z-10" />
                      </motion.div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-light text-gray-900 truncate mb-1">
                          {currentAppointment.service_type}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                          {currentAppointment.start_time && (
                            <span className="text-xs text-gray-600 font-light">
                              {formatDate(currentAppointment.start_time)} à {formatTime(currentAppointment.start_time)}
                            </span>
                          )}
                          {currentAppointment.status && getStatusBadge(currentAppointment.status)}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0 group-hover:translate-x-1 transition-transform duration-300" />
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="no-appointment"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                className="relative group cursor-pointer"
                onClick={() => router.push('/reservation')}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative border-2 border-solid border-blue-400/60 rounded-2xl p-4 bg-gradient-to-br from-blue-50/90 via-white to-purple-50/90 backdrop-blur-md group-hover:border-blue-500 group-hover:from-blue-100/90 group-hover:to-purple-100/90 shadow-lg group-hover:shadow-xl transition-all duration-300">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-md group-hover:shadow-lg transition-shadow duration-300">
                      <Calendar className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900 mb-1 group-hover:text-blue-700 transition-colors">
                        Pas de nouvelle réservation
                      </p>
                      <p className="text-xs font-bold text-blue-600 group-hover:text-blue-700 transition-colors">
                        Cliquez ici pour réserver
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <div className="h-8 w-8 rounded-lg bg-blue-500/10 group-hover:bg-blue-500/20 flex items-center justify-center transition-colors">
                        <ArrowRight className="h-4 w-4 text-blue-600 group-hover:text-blue-700 group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Services avec Liquid Glass */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="px-6 py-6 bg-white/30 backdrop-blur-sm border-b border-white/20"
        >
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-gray-900 text-lg font-light">Services</h2>
            <motion.button 
              className="text-blue-600 text-sm font-light hover:text-blue-700 transition-colors"
              onClick={() => router.push('/services')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Voir tout
            </motion.button>
          </div>
          
          <div className="grid grid-cols-4 gap-4">
            {services.map((service, index) => {
              const Icon = service.icon
              return (
                <motion.button
                  key={index}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: 0.4 + index * 0.05 }}
                  className="flex flex-col items-center gap-2 group relative"
                  onClick={() => router.push(`/search?service=${service.title}`)}
                  whileHover={{ y: -4 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <motion.div 
                    className={`relative h-16 w-16 rounded-2xl ${service.color} flex items-center justify-center shadow-[0_4px_20px_rgba(0,0,0,0.08)] border border-white/30 backdrop-blur-sm`}
                    whileHover={{ 
                      scale: 1.1, 
                      rotate: 5
                    }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  >
                    <Icon className="h-7 w-7 text-white" />
                  </motion.div>
                  <span className="text-xs text-gray-700 font-light text-center line-clamp-1">{service.title}</span>
                </motion.button>
              )
            })}
          </div>
        </motion.div>

        {/* Assistant IA */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="px-6 py-6 bg-white/30 backdrop-blur-sm border-b border-white/20"
        >
          <motion.button
            onClick={() => router.push('/ai-chat')}
            className="w-full p-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl text-white shadow-lg hover:shadow-xl transition-all group relative overflow-hidden"
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                <Bot className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-base font-semibold mb-1">Assistant IA</h3>
                <p className="text-xs text-white/90 font-light">Diagnostic intelligent de votre véhicule</p>
              </div>
              <ChevronRight className="h-5 w-5 text-white/80 group-hover:translate-x-1 transition-transform" />
            </div>
          </motion.button>
        </motion.div>

        {/* Garages recommandés avec Liquid Glass */}
        {/* Content Container - Responsive avec centrage et spacing */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-28 sm:pb-32 bg-white/30 backdrop-blur-sm"
        >
          <div className="flex items-center justify-between mb-6 sm:mb-8">
            <div className="flex-1 min-w-0">
              <h2 className="text-gray-900 text-lg sm:text-xl font-light">Près de chez vous</h2>
              {locationStatus === 'denied' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 sm:p-4 mt-3 sm:mt-4">
                  <p className="text-xs sm:text-sm text-yellow-800 font-light">
                    ⚠️ Géolocalisation refusée — Pour voir les garages près de vous, veuillez autoriser l'accès à votre position dans les paramètres de votre navigateur.
                  </p>
                </div>
              )}
              {locationStatus === 'default' && (
                <p className="text-xs text-gray-500 font-light mt-1 sm:mt-2">
                  Mode test — Tous les garages affichés (sans limite de distance)
                </p>
              )}
              {locationStatus === 'success' && userPosition && (
                <p className="text-xs text-gray-500 font-light mt-1 sm:mt-2">
                  Mode test — Tous les garages affichés (sans limite de distance)
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 ml-3 sm:ml-4">
              <motion.button 
                className="text-blue-600 text-xs sm:text-sm font-light hover:text-blue-700 transition-colors whitespace-nowrap"
                onClick={() => router.push('/search')}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Voir tout
              </motion.button>
            </div>
          </div>
          <div className="space-y-4 sm:space-y-6">
            <AnimatePresence>
              {loadingGarages ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center text-gray-500 py-12 font-light"
                >
                  Chargement des garages...
                </motion.div>
              ) : garages.length > 0 ? (
                garages.slice(0, 3).map((garage, index) => (
                  <motion.div
                    key={garage.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.4, delay: 0.6 + index * 0.1, ease: [0.23, 1, 0.32, 1] }}
                    className="relative group cursor-pointer"
                    onClick={() => router.push(`/garage/${garage.id}`)}
                    whileHover={{ y: -4, scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/10 to-blue-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="relative bg-white/60 backdrop-blur-xl border border-white/40 rounded-2xl p-4 sm:p-5 shadow-[0_4px_20px_rgba(0,0,0,0.08)] group-hover:shadow-[0_12px_40px_rgba(59,130,246,0.2)] group-hover:border-blue-300/50 transition-all duration-300">
                      <div className="flex gap-3 sm:gap-4">
                        {/* Photo du garage */}
                        <div className="flex-shrink-0">
                          {(garage as any).image_url || (garage as any).logo_url || (garage as any).photo_url ? (
                            <div className="relative h-20 w-20 sm:h-24 sm:w-24 rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
                              <Image
                                src={garage.image_url || (garage as any).logo_url || (garage as any).photo_url}
                                alt={garage.name || 'Garage'}
                                fill
                                className="object-cover"
                                sizes="(max-width: 640px) 80px, 96px"
                              />
                            </div>
                          ) : (
                            <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-md border border-white/40">
                              <Wrench className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
                            </div>
                          )}
                        </div>
                        
                        {/* Contenu */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          {/* En-tête avec nom */}
                          <div>
                            <h3 className="text-gray-900 text-base sm:text-lg font-medium truncate mb-2">{garage.name}</h3>
                            
                            {/* Infos : ville, distance */}
                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs text-gray-500 font-light">
                              {garage.city && (
                                <>
                                  <div className="flex items-center gap-0.5">
                                    <MapPin className="h-3 w-3" />
                                    <span>{garage.city}</span>
                                  </div>
                                  {(garage as any).distance !== undefined && <span>•</span>}
                                </>
                              )}
                              {(garage as any).distance !== undefined && (
                                <span className="text-blue-600 font-medium">
                                  à {formatDistance((garage as any).distance)}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Bas : étoile + avis à gauche, bouton Réserver à droite */}
                          <div className="flex items-center justify-between mt-3">
                            <div className="flex items-center gap-1.5">
                              <Star className="h-3.5 w-3.5 sm:h-4 sm:w-4 fill-gray-400 text-gray-400" />
                              <span className="text-xs sm:text-sm font-medium text-gray-700">{garage.rating?.toFixed(1) || "0.0"}</span>
                              <span className="text-xs text-gray-500">•</span>
                              <span className="text-xs text-gray-500">{garageReviewsCount[garage.id] || 0} avis</span>
                            </div>
                            
                            {/* Bouton Réserver */}
                            <motion.button 
                              className="relative px-2 py-0.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full text-[8px] font-medium shadow-sm overflow-hidden perfect-center h-[20px] min-w-[50px]"
                              onClick={(e) => {
                                e.stopPropagation()
                                router.push(`/reservation?garage=${garage.id}`)
                              }}
                              whileHover={{ scale: 1.05, boxShadow: "0 2px 8px rgba(59,130,246,0.3)" }}
                              whileTap={{ scale: 0.95 }}
                            >
                              <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 hover:opacity-100 transition-opacity" />
                              <span className="relative z-10 leading-tight tracking-normal">Réserver</span>
                            </motion.button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center text-gray-500 py-12 font-light"
                >
                  <p className="mb-2">Aucun garage disponible pour le moment</p>
                  <p className="text-xs text-gray-400">Vérifiez votre connexion ou réessayez plus tard</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  )
}

