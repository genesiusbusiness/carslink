"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Search, Wrench, Calendar, Clock, Shield, Star, Home as HomeIcon, User, Bell, Menu, MapPin, ChevronRight, Zap, Plus, TrendingUp, Circle, Droplet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { BottomNavigation } from "@/components/layout/BottomNavigation"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/lib/hooks/use-auth"
import type { Garage, Profile, Appointment, Notification } from "@/lib/types/database"
import { formatDate, formatCurrency, formatDateTime, formatTime } from "@/lib/utils"
import { X } from "lucide-react"
import { getUserPosition, calculateDistance, formatDistance, geocodeAddress, isWithinRadius } from "@/lib/utils/geolocation"

export default function HomePage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [garages, setGarages] = useState<Garage[]>([])
  const [loadingGarages, setLoadingGarages] = useState(true)
  const [currentAppointment, setCurrentAppointment] = useState<Appointment | null>(null)
  const [loadingAppointments, setLoadingAppointments] = useState(true)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showNotifications, setShowNotifications] = useState(false)
  const [loadingNotifications, setLoadingNotifications] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<{ garages: Garage[], services: string[] }>({ garages: [], services: [] })
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [userPosition, setUserPosition] = useState<{ latitude: number; longitude: number; source: 'gps' | 'default' } | null>(null)
  const [locationStatus, setLocationStatus] = useState<'loading' | 'success' | 'default'>('loading')

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
    const position = await getUserPosition()
    setUserPosition(position)
    setLocationStatus(position.source === 'gps' ? 'success' : 'default')
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
        setProfile(data)
      } else if (error && (error.code === 'PGRST116' || error.message?.includes('0 rows'))) {
        // Le compte fly_accounts est généralement créé automatiquement par le trigger handle_new_auth_user()
        // Attendre un peu et réessayer
        console.log('Compte fly_accounts non trouvé, attente de la création automatique...')
        setTimeout(async () => {
          const { data: retryAccount } = await supabase
            .from("fly_accounts")
            .select("*")
            .eq("auth_user_id", user.id)
            .maybeSingle()
          if (retryAccount) {
            setProfile(retryAccount)
            console.log('✅ Compte fly_accounts chargé après retry')
          } else {
            console.warn('⚠️ Compte fly_accounts toujours introuvable après retry')
          }
        }, 2000)
      } else if (error) {
        console.error('Error loading profile:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        })
      }
    } catch (err) {
      console.error('Error in loadProfile:', err)
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
      const userPos = position || userPosition || { latitude: 48.8566, longitude: 2.3522, source: 'default' as const }
      const RADIUS_KM = 30

      console.log(`\n🌍 Loading garages near position: ${userPos.latitude}, ${userPos.longitude} (${userPos.source === 'gps' ? 'GPS' : 'default'})`)
      console.log(`   📍 Search radius: ${RADIUS_KM}km`)

      // Charger tous les garages
      // Essayer de filtrer par status='active' si la colonne existe
      console.log("📡 Querying Supabase for garages...")
      let { data: allGarages, error, status, statusText } = await supabase
        .from("carslink_garages")
        .select("*")
        .eq("status", "active")
      
      // Si erreur liée à la colonne status, réessayer sans filtre
      if (error && (error.code === '42703' || error.message?.includes('column') || error.message?.includes('status'))) {
        console.log("ℹ️  Column 'status' might not exist, retrying without filter...")
        const retryResult = await supabase
          .from("carslink_garages")
          .select("*")
        
        if (!retryResult.error) {
          allGarages = retryResult.data
          error = null
          console.log("✅ Loaded all garages (without status filter)")
        } else {
          error = retryResult.error
        }
      } else if (!error) {
        console.log("✅ Loaded garages filtered by status='active'")
      }

      console.log(`📊 Query result:`, {
        hasData: !!allGarages,
        dataLength: allGarages?.length || 0,
        hasError: !!error,
        error,
        status,
        statusText
      })

      if (error) {
        console.error("❌ Error loading garages:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        setGarages([])
        setLoadingGarages(false)
        return
      }

      if (!allGarages || allGarages.length === 0) {
        console.warn("⚠️ No garages data returned from database")
        console.log("💡 Possible reasons:")
        console.log("   - Table 'carslink_garages' is empty")
        console.log("   - RLS policies are blocking access")
        console.log("   - User doesn't have SELECT permissions")
        setGarages([])
        setLoadingGarages(false)
        return
      }

      console.log(`✅ Found ${allGarages.length} garage(s) in database`)

      // Géocoder les garages sans coordonnées
      const garagesWithCoords: (Garage & { distance?: number })[] = []
      const garagesOutOfRange: Array<{ name: string; distance: number }> = []
      
      console.log(`📊 Processing ${allGarages.length} garage(s)...`)
      
      for (const garage of allGarages) {
        let lat = garage.latitude
        let lon = garage.longitude

        console.log(`\n🔍 Checking garage: "${garage.name}"`)
        console.log(`   - Address: ${garage.address || 'N/A'}, ${garage.city || 'N/A'}`)
        console.log(`   - Current coords: lat=${lat || 'N/A'}, lon=${lon || 'N/A'}`)

        // Si pas de coordonnées, géocoder l'adresse
        if (!lat || !lon) {
          if (garage.address || garage.city) {
            console.log(`   🔄 Geocoding "${garage.name}" (${garage.address}, ${garage.city})`)
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
                  console.log(`   ✅ Saved coordinates for "${garage.name}": ${lat}, ${lon}`)
                } else {
                  console.error(`   ❌ Error saving coordinates for "${garage.name}":`, updateError)
                }
              } catch (updateError) {
                console.error(`   ❌ Error updating garage coordinates:`, updateError)
              }
              
              // Mettre à jour l'objet garage
              garage.latitude = lat
              garage.longitude = lon
            } else {
              console.warn(`   ⚠️ Geocoding failed for "${garage.name}" - skipping`)
            }
          } else {
            console.warn(`   ⚠️ No address/city for "${garage.name}" - skipping`)
          }
        }

        // Si on a des coordonnées, calculer la distance et vérifier le rayon
        if (lat && lon) {
          const distance = calculateDistance(userPos.latitude, userPos.longitude, lat, lon)
          console.log(`   📍 Distance from user: ${distance.toFixed(2)} km`)
          
          // Filtrer par rayon de 30km (ou plus large en mode debug)
          if (isWithinRadius(userPos.latitude, userPos.longitude, lat, lon, RADIUS_KM)) {
            console.log(`   ✅ Within ${RADIUS_KM}km radius - ADDED`)
            garagesWithCoords.push({ ...garage, distance })
          } else {
            console.log(`   ❌ Outside ${RADIUS_KM}km radius (${distance.toFixed(2)}km away) - SKIPPED`)
            garagesOutOfRange.push({ name: garage.name, distance })
          }
        } else {
          console.warn(`   ⚠️ No coordinates available for "${garage.name}" - skipping`)
        }
      }

      // Trier par distance (croissante)
      // Note: Le tri par rating est désactivé car la colonne n'existe pas
      garagesWithCoords.sort((a, b) => {
        const distA = a.distance || Infinity
        const distB = b.distance || Infinity
        return distA - distB
      })

      console.log(`\n📊 RESULTS:`)
      console.log(`   ✅ Found ${garagesWithCoords.length} garage(s) within ${RADIUS_KM}km`)
      
      if (garagesOutOfRange.length > 0) {
        console.log(`   ⚠️ ${garagesOutOfRange.length} garage(s) outside ${RADIUS_KM}km radius:`)
        garagesOutOfRange.forEach(g => {
          console.log(`      - "${g.name}": ${g.distance.toFixed(2)}km away`)
        })
      }

      // Enlever la propriété distance temporaire pour le type
      const finalGarages = garagesWithCoords.map(({ distance, ...garage }) => ({
        ...garage,
        _distance: distance, // Stocker la distance dans une propriété personnalisée
      }))

      setGarages(finalGarages as any)
    } catch (error) {
      console.error("Error loading garages:", error)
      setGarages([])
    } finally {
      setLoadingGarages(false)
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
      console.error("Error loading current appointment:", error)
      setCurrentAppointment(null)
    } finally {
      setLoadingAppointments(false)
    }
  }

  const loadNotifications = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from("client_notifications")
        .select("*")
        .eq("flynesis_user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10)

      if (!error && data) {
        setNotifications(data)
        const unread = data.filter(n => !n.read).length
        setUnreadCount(unread)
      }
    } catch (error) {
      console.error("Error loading notifications:", error)
    } finally {
      setLoadingNotifications(false)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from("client_notifications")
        .update({ read: true })
        .eq("id", notificationId)

      if (!error) {
        setNotifications(prev => 
          prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error("Error marking notification as read:", error)
    }
  }

  const markAllAsRead = async () => {
    if (!user) return

    try {
      const { error } = await supabase
        .from("client_notifications")
        .update({ read: true })
        .eq("flynesis_user_id", user.id)
        .eq("read", false)

      if (!error) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })))
        setUnreadCount(0)
      }
    } catch (error) {
      console.error("Error marking all notifications as read:", error)
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
        const { data: servicesData, error: servicesError } = await supabase
          .from("carslink_garage_services")
          .select("garage_id, name, garage:carslink_garages(*)")
          .eq("is_active", true)
          .or(matchingServiceKeywords.map(keyword => `name.ilike.%${keyword}%`).join(','))
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
      }

      // Si pas de résultat par service, recherche classique par nom/ville/description
      if (garagesData.length === 0) {
        let query = supabase
          .from("carslink_garages")
          .select("*")

        try {
          query = query.eq("status", "active")
        } catch (e) {
          // Status column might not exist
        }

        const result = await query
          .or(`name.ilike.%${searchLower}%,city.ilike.%${searchLower}%,description.ilike.%${searchLower}%`)
          .limit(5)

        if (!result.error && result.data) {
          garagesData = result.data
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
      console.error("Error performing search:", error)
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
    {
      title: 'Révision',
      icon: Wrench,
      color: 'bg-blue-100 text-blue-600'
    },
    {
      title: 'Vidange',
      icon: Droplet,
      color: 'bg-purple-100 text-purple-600'
    },
    {
      title: 'Freinage',
      icon: Shield,
      color: 'bg-green-100 text-green-600'
    },
    {
      title: 'Pneu',
      icon: Circle,
      color: 'bg-orange-100 text-orange-600'
    }
  ]

  if (loading || loadingGarages || loadingAppointments) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50/50 via-white to-purple-50/30 flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-gray-600 font-light"
        >
          Chargement...
        </motion.div>
      </div>
    )
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      pending: { label: "En attente", className: "bg-yellow-50/80 backdrop-blur-sm text-yellow-700 border border-yellow-200/50 shadow-sm" },
      confirmed: { label: "Confirmé", className: "bg-blue-50/80 backdrop-blur-sm text-blue-700 border border-blue-200/50 shadow-sm" },
      in_progress: { label: "En cours", className: "bg-purple-50/80 backdrop-blur-sm text-purple-700 border border-purple-200/50 shadow-sm" },
      completed: { label: "Terminé", className: "bg-gray-50/80 backdrop-blur-sm text-gray-700 border border-gray-200/50 shadow-sm" },
      cancelled: { label: "Annulé", className: "bg-red-50/80 backdrop-blur-sm text-red-700 border border-red-200/50 shadow-sm" },
    }

    const config = statusConfig[status] || { label: status, className: "bg-gray-50/80 backdrop-blur-sm text-gray-700 border border-gray-200/50 shadow-sm" }

    return (
      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-light ${config.className}`}>
        {config.label}
      </span>
    )
  }

  const capitalizeFirst = (str: string | null | undefined): string => {
    if (!str) return ""
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
  }

  const displayName = capitalizeFirst(user?.email?.split("@")[0] || "Utilisateur")

  return (
    <div className="h-full w-full bg-gradient-to-br from-blue-50/40 via-white to-purple-50/20 overflow-y-auto pb-20 safe-area-top safe-area-bottom">
      {/* Mobile Container avec effet Liquid Glass */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
        className="w-full h-full bg-white/70 backdrop-blur-2xl overflow-y-auto"
      >
        
        {/* Header avec verre givré */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="px-6 py-6 bg-white/40 backdrop-blur-xl border-b border-white/20 sticky top-0 z-10"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-gray-600 text-sm font-light">Bonjour,</p>
              <h1 className="text-gray-900 text-2xl font-light mt-1">{displayName}</h1>
            </div>
            <div className="flex items-center gap-3">
              {/* Notifications Dropdown */}
              <div className="relative">
                <motion.button 
                  className="relative h-9 w-9 rounded-full bg-white/50 backdrop-blur-sm flex items-center justify-center border border-white/30 shadow-sm"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  onClick={() => setShowNotifications(!showNotifications)}
                >
                  <Bell className="h-5 w-5 text-gray-600" />
                  {unreadCount > 0 && (
                    <motion.span 
                      className="absolute -top-1 -right-1 h-4 w-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full text-white text-xs flex items-center justify-center font-medium shadow-[0_2px_10px_rgba(59,130,246,0.5)]"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 15 }}
                    >
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </motion.span>
                  )}
                </motion.button>

                {/* Dropdown de notifications */}
                <AnimatePresence>
                  {showNotifications && (
                    <>
                      {/* Backdrop avec blur intensif */}
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-[45] bg-black/20 backdrop-blur-md"
                        onClick={() => setShowNotifications(false)}
                      />
                      
                      {/* Container de notification aligné à droite */}
                      <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.2 }}
                        onClick={(e) => e.stopPropagation()}
                        className="fixed right-4 top-20 z-[50] w-[calc(100vw-8rem)] max-w-[300px] max-h-[calc(100vh-6rem)] bg-white rounded-2xl border border-gray-200 shadow-2xl overflow-hidden flex flex-col"
                      >
                        {/* Header avec dégradé */}
                        <div className="relative p-4 border-b border-gray-200 bg-white/80 flex-shrink-0">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-sm">
                                <Bell className="h-4 w-4 text-white" />
                              </div>
                              <div>
                                <h3 className="text-base font-semibold text-gray-900">Notifications</h3>
                                {unreadCount > 0 && (
                                  <p className="text-xs text-gray-500 mt-0.5">
                                    {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {unreadCount > 0 && (
                              <motion.button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  markAllAsRead()
                                }}
                                className="px-2.5 py-1.5 text-xs text-blue-600 font-medium hover:text-blue-700 rounded-lg hover:bg-blue-50 transition-colors"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                              >
                                Tout lu
                              </motion.button>
                              )}
                              <motion.button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setShowNotifications(false)
                                }}
                                className="h-7 w-7 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                                whileHover={{ scale: 1.1, rotate: 90 }}
                                whileTap={{ scale: 0.9 }}
                              >
                                <X className="h-4 w-4 text-gray-600" />
                              </motion.button>
                            </div>
                          </div>
                        </div>

                        {/* Liste des notifications avec meilleur espacement */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
                          {loadingNotifications ? (
                            <div className="p-8 text-center">
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"
                              />
                              <p className="text-sm text-gray-500">Chargement...</p>
                            </div>
                          ) : notifications.length > 0 ? (
                            <div className="p-2">
                              {notifications.map((notification, index) => (
                                <motion.div
                                  key={notification.id}
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: index * 0.05, duration: 0.3 }}
                                  className={`group relative mb-1.5 rounded-xl overflow-hidden cursor-pointer transition-all duration-200 ${
                                    !notification.read 
                                      ? 'bg-blue-50/80 ring-1 ring-blue-200/50' 
                                      : 'bg-gray-50/50 hover:bg-gray-100/50'
                                  }`}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    if (!notification.read) {
                                      markAsRead(notification.id)
                                    }
                                    if (notification.link) {
                                      router.push(notification.link)
                                      setShowNotifications(false)
                                    }
                                  }}
                                  whileHover={{ scale: 1.01 }}
                                >
                                  <div className="relative p-3">
                                    <div className="flex items-start gap-3">
                                      <div className={`h-2 w-2 rounded-full mt-1.5 flex-shrink-0 transition-all ${
                                        !notification.read 
                                          ? 'bg-blue-600 shadow-sm' 
                                          : 'bg-gray-300'
                                      }`} />
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-900 mb-1 leading-snug">
                                          {notification.title}
                                        </p>
                                        <p className="text-xs text-gray-600 leading-relaxed mb-2 line-clamp-2">
                                          {notification.message}
                                        </p>
                                        <p className="text-xs text-gray-400">
                                          {new Date(notification.created_at).toLocaleDateString('fr-FR', {
                                            day: 'numeric',
                                            month: 'short',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                          })}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          ) : (
                            <div className="p-8 text-center flex items-center justify-center min-h-[200px]">
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                                className="w-full"
                              >
                                <div className="h-12 w-12 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                                  <Bell className="h-6 w-6 text-gray-400" />
                                </div>
                                <h3 className="text-sm font-semibold text-gray-900 mb-1.5">
                                  Aucune notification
                                </h3>
                                <p className="text-xs text-gray-500 leading-relaxed max-w-[240px] mx-auto">
                                  Vous n'avez pas encore de notifications
                                </p>
                              </motion.div>
                            </div>
                          )}
                        </div>

                        {/* Footer avec gradient */}
                        {notifications.length > 0 && (
                          <div className="relative p-3 border-t border-gray-200 bg-gray-50/50 flex-shrink-0">
                            <motion.button
                              onClick={(e) => {
                                e.stopPropagation()
                                router.push('/notifications')
                                setShowNotifications(false)
                              }}
                              className="w-full py-2 px-4 text-xs text-blue-600 font-medium hover:text-blue-700 rounded-lg hover:bg-blue-50 transition-colors flex items-center justify-center gap-1.5"
                              whileHover={{ scale: 1.01 }}
                              whileTap={{ scale: 0.99 }}
                            >
                              <span>Voir toutes</span>
                              <ChevronRight className="h-3.5 w-3.5" />
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
                className="h-9 w-9 rounded-full bg-white/50 backdrop-blur-sm flex items-center justify-center border border-white/30 shadow-sm"
                whileHover={{ scale: 1.1, boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}
                whileTap={{ scale: 0.9 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <User className="h-4 w-4 text-gray-600" />
              </motion.button>
            </div>
          </div>

          {/* Search Bar intelligente avec suggestions */}
          <div className="relative">
            <motion.div 
              className="relative"
              whileHover={{ scale: 1.01 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none z-10" />
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-blue-500/10 rounded-xl blur-sm opacity-0 focus-within:opacity-100 transition-opacity duration-300" />
                <Input
                  placeholder="Rechercher un service ou garage..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => {
                    if (searchQuery.length >= 2) {
                      setShowSearchResults(true)
                    }
                  }}
                  className="relative pl-11 pr-4 h-11 rounded-xl border-white/30 bg-white/50 backdrop-blur-md font-light text-sm shadow-[0_4px_20px_rgba(0,0,0,0.05)] focus:shadow-[0_4px_30px_rgba(59,130,246,0.15)] focus:border-blue-300/50 transition-all duration-300"
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
                                    <div>
                                      <p className="text-sm font-medium text-gray-900">{service}</p>
                                      <p className="text-xs text-gray-500 font-light">Service disponible</p>
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
                              <MapPin className="h-4 w-4 text-blue-600" />
                              <p className="text-xs font-medium text-gray-600 uppercase">Garages</p>
                            </div>
                            <div className="space-y-1">
                              {searchResults.garages.map((garage) => (
                                <motion.button
                                  key={garage.id}
                                  onClick={() => {
                                    router.push(`/garage/${garage.id}`)
                                    setShowSearchResults(false)
                                    setSearchQuery("")
                                  }}
                                  className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
                                  whileHover={{ x: 2 }}
                                  whileTap={{ scale: 0.98 }}
                                >
                                  <div className="flex items-start gap-3">
                                    <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                                      <MapPin className="h-5 w-5 text-gray-500" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-start justify-between gap-2 mb-1">
                                        <p className="text-sm font-medium text-gray-900 truncate">{garage.name}</p>
                                        {garage.rating && (
                                          <div className="flex items-center gap-1 flex-shrink-0">
                                            <Star className="h-3 w-3 fill-blue-600 text-blue-600" />
                                            <span className="text-xs text-gray-600">{garage.rating.toFixed(1)}</span>
                                          </div>
                                        )}
                                      </div>
                                      {garage.city && (
                                        <p className="text-xs text-gray-500 font-light">{garage.city}</p>
                                      )}
                                    </div>
                                    <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0 mt-1" />
                                  </div>
                                </motion.button>
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
        </motion.div>

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
                          {getStatusBadge(currentAppointment.status)}
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
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative border-2 border-dashed border-white/60 rounded-2xl p-4 bg-white/70 backdrop-blur-md group-hover:border-blue-400/80 group-hover:bg-white/85 shadow-md transition-all duration-300">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-gray-100/70 to-gray-200/70 backdrop-blur-sm flex items-center justify-center flex-shrink-0 border border-white/50 shadow-sm">
                      <Calendar className="h-6 w-6 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 mb-1">
                        Pas de nouvelle réservation
                      </p>
                      <p className="text-xs text-gray-600 font-medium">
                        Cliquez pour réserver
                      </p>
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
                      rotate: [0, -5, 5, 0],
                      boxShadow: "0 8px 30px rgba(59,130,246,0.3)"
                    }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  >
                    <Icon className="h-7 w-7 relative z-10" />
                  </motion.div>
                  <span className="text-xs text-gray-600 text-center font-light relative z-10">{service.title}</span>
                </motion.button>
              )
            })}
          </div>
        </motion.div>

        {/* Garages recommandés avec Liquid Glass */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="px-6 py-6 pb-24 bg-white/30 backdrop-blur-sm"
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-gray-900 text-lg font-light">Près de chez vous</h2>
              {locationStatus === 'default' && (
                <p className="text-xs text-gray-500 font-light mt-1">
                  Position non détectée — affichage des garages les plus proches
                </p>
              )}
              {locationStatus === 'success' && userPosition && (
                <p className="text-xs text-gray-500 font-light mt-1">
                  Dans un rayon de 30 km
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <motion.button 
                className="text-blue-600 text-sm font-light hover:text-blue-700 transition-colors"
                onClick={() => router.push('/search')}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Voir tout
              </motion.button>
            </div>
          </div>
          <div className="space-y-4">
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
                    <div className="relative bg-white/60 backdrop-blur-xl border border-white/40 rounded-2xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.08)] group-hover:shadow-[0_12px_40px_rgba(59,130,246,0.2)] group-hover:border-blue-300/50 transition-all duration-300">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className="text-gray-900 font-light truncate">{garage.name}</h3>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Star className="h-4 w-4 fill-blue-600 text-blue-600" />
                            <span className="text-sm font-light text-gray-900">{garage.rating?.toFixed(1) || "4.8"}</span>
                          </div>
                        </div>
                        
                        {garage.specialties && garage.specialties.length > 0 && (
                          <p className="text-xs text-gray-500 font-light mb-2">
                            {garage.specialties[0]}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-3 text-xs text-gray-500 font-light mb-3">
                          {garage.city && (
                            <>
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                <span>{garage.city}</span>
                              </div>
                              <span>•</span>
                            </>
                          )}
                          {(garage as any)._distance !== undefined && (
                            <>
                              <span className="text-blue-600 font-medium">
                                à {formatDistance((garage as any)._distance)}
                              </span>
                              <span>•</span>
                            </>
                          )}
                          <span>127 avis</span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1 text-xs text-gray-500 font-light">
                            <Clock className="h-3 w-3 text-blue-600" />
                            <span>Aujourd'hui 14h</span>
                          </div>
                          <motion.button 
                            className="relative px-4 py-1.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl text-xs font-light shadow-[0_4px_20px_rgba(59,130,246,0.4)] overflow-hidden"
                            onClick={(e) => {
                              e.stopPropagation()
                              router.push(`/reservation?garage=${garage.id}`)
                            }}
                            whileHover={{ scale: 1.05, boxShadow: "0 6px 30px rgba(59,130,246,0.5)" }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 hover:opacity-100 transition-opacity" />
                            <span className="relative z-10">Réserver</span>
                          </motion.button>
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
      </motion.div>

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  )
}

