"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import { Search, MapPin, Star, X, Wrench, ArrowUp, ArrowDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { BottomNavigation } from "@/components/layout/BottomNavigation"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/lib/hooks/use-auth"
import { motion } from "framer-motion"
import type { Garage } from "@/lib/types/database"
import { calculateDistance, formatDistance, getUserPosition } from "@/lib/utils/geolocation"

function SearchPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading: authLoading } = useAuth()
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || searchParams.get("service") || "")
  const [garages, setGarages] = useState<Garage[]>([])
  const [garageReviewsCount, setGarageReviewsCount] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  
  // Filtres pour les garages
  const [garageSortBy, setGarageSortBy] = useState<Set<'price' | 'distance' | 'availability'>>(new Set())
  const [garageSortOrder, setGarageSortOrder] = useState<'asc' | 'desc'>('asc')
  const [garageServicePrices, setGarageServicePrices] = useState<Record<string, { min: number; max: number } | null>>({})
  const [garageAvailabilityDays, setGarageAvailabilityDays] = useState<Record<string, number>>({})
  const [userPosition, setUserPosition] = useState<{ latitude: number; longitude: number } | null>(null)
  const [allGaragesOpeningHours, setAllGaragesOpeningHours] = useState<Record<string, Record<number, { is_open: boolean; open_time: string | null; close_time: string | null; lunch_break_start: string | null; lunch_break_end: string | null }>>>({})
  const [bookingSlots, setBookingSlots] = useState<Record<string, Set<string>>>({})

  useEffect(() => {
    // Attendre que l'authentification soit vérifiée
    if (authLoading) {
      return
    }

    if (!user) {
      router.push("/login")
      return
    }

    // Charger la position de l'utilisateur
    getUserPosition().then(pos => {
      if (pos) {
        setUserPosition({ latitude: pos.latitude, longitude: pos.longitude })
      }
    })

    loadGarages()
  }, [user, authLoading, router])

  useEffect(() => {
    if (user && !authLoading) {
      loadGarages()
    }
  }, [searchQuery, user, authLoading])

  const loadGarages = async () => {
    try {
      setLoading(true)
      
      if (!searchQuery || searchQuery.trim().length === 0) {
        // Si pas de recherche, charger tous les garages
        let query = supabase
          .from("carslink_garages")
          .select("*")
        
        try {
          query = query.eq("status", "active")
        } catch (e) {
          // Status column might not exist
        }

        const { data, error } = await query
        if (!error && data) {
          setGarages(data)
          
          // Charger le nombre d'avis pour ces garages
          const garageIds = data.map((g: any) => g.id)
          await loadGaragesReviewsCount(garageIds)
        } else {
          setGarages([])
        }
        setLoading(false)
        return
      }

      // Recherche avec requête de service
      const searchLower = searchQuery.toLowerCase().trim()
      
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
      if (matchingServiceKeywords.length > 0) {
        // Rechercher les garages qui ont ce service
        const { data: servicesData, error: servicesError } = await supabase
          .from("carslink_garage_services")
          .select("garage_id, name, garage:carslink_garages(*)")
          .eq("is_active", true)
          .or(matchingServiceKeywords.map(keyword => `name.ilike.%${keyword}%`).join(','))

        if (!servicesError && servicesData && servicesData.length > 0) {
          // Extraire les garages uniques
          const garageMap = new Map<string, any>()
          servicesData.forEach((item: any) => {
            if (item.garage && !garageMap.has(item.garage.id)) {
              garageMap.set(item.garage.id, item.garage)
            }
          })
          
          // Filtrer par status si la colonne existe
          let garagesArray = Array.from(garageMap.values())
          if (garagesArray[0]?.status !== undefined) {
            garagesArray = garagesArray.filter((g: any) => g.status === 'active')
          }
          
          setGarages(garagesArray)
          
          // Charger le nombre d'avis pour ces garages
          const garageIds = garagesArray.map((g: any) => g.id)
          await loadGaragesReviewsCount(garageIds)
          
          setLoading(false)
          return
        }
      }

      // Sinon, recherche classique par nom/ville/description
      let query = supabase
        .from("carslink_garages")
        .select("*")

      try {
        query = query.eq("status", "active")
      } catch (e) {
        // Status column might not exist
      }

      query = query.or(`name.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)

      const { data, error } = await query

      if (error && (error.code === '42703' || error.message?.includes('column') || error.message?.includes('status'))) {
        // Retry without status filter
        const retryQuery = supabase
          .from("carslink_garages")
          .select("*")
          .or(`name.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)

        const retryResult = await retryQuery
        if (!retryResult.error && retryResult.data) {
          setGarages(retryResult.data)
          
          // Charger le nombre d'avis pour ces garages
          const garageIds = retryResult.data.map((g: any) => g.id)
          await loadGaragesReviewsCount(garageIds)
        } else {
          setGarages([])
        }
      } else if (!error && data) {
        setGarages(data)
        
        // Charger le nombre d'avis pour ces garages
        const garageIds = data.map((g: any) => g.id)
        await loadGaragesReviewsCount(garageIds)
      } else {
        setGarages([])
      }
    } catch (error) {
      console.error("Error loading garages:", error)
      setGarages([])
    } finally {
      setLoading(false)
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
      console.error("Error loading reviews count:", error)
    }
  }

  // Calculer la distance depuis l'utilisateur
  const getDistanceFromUser = (garage: Garage): string | null => {
    if (!userPosition || !garage.latitude || !garage.longitude) return null
    const distance = calculateDistance(
      userPosition.latitude,
      userPosition.longitude,
      garage.latitude,
      garage.longitude
    )
    return formatDistance(distance)
  }

  // Obtenir la distance en kilomètres pour le tri
  const getDistanceInKm = (garage: Garage): number | null => {
    if (!userPosition || !garage.latitude || !garage.longitude) return null
    const distanceMeters = calculateDistance(
      userPosition.latitude,
      userPosition.longitude,
      garage.latitude,
      garage.longitude
    )
    return distanceMeters / 1000 // Convertir mètres en kilomètres
  }

  // Calculer le nombre de jours disponibles pour un garage dans les 90 prochains jours
  const calculateAvailableDaysForGarage = (garageId: string): number => {
    const hours = allGaragesOpeningHours[garageId]
    if (!hours || Object.keys(hours).length === 0) {
      return 0
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const maxDate = new Date(today)
    maxDate.setDate(today.getDate() + 90)

    let availableDays = 0

    for (let d = new Date(today); d <= maxDate; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay()
      const dayHours = hours[dayOfWeek]

      if (dayHours && dayHours.is_open) {
        const bookingSlotsKey = `${garageId}_${dayOfWeek}`
        const availableSlots = bookingSlots[bookingSlotsKey]

        if (!availableSlots || availableSlots.size > 0) {
          availableDays++
        }
      }
    }

    return availableDays
  }

  // Charger les prix des services pour les garages
  const loadServicePrices = async () => {
    if (garages.length === 0) return

    const serviceParam = searchParams.get("service")
    if (!serviceParam) return

    const serviceLower = serviceParam.toLowerCase().trim()
    const serviceKeywords: Record<string, string[]> = {
      'révision': ['révision', 'révision complète'],
      'revision': ['révision', 'révision complète'],
      'vidange': ['vidange', 'vidange moteur', 'filtre à huile'],
      'freinage': ['freinage', 'plaquettes', 'disques', 'freins'],
      'freins': ['freinage', 'plaquettes', 'disques', 'freins'],
      'pneu': ['pneu', 'pneus', 'montage pneu'],
      'pneus': ['pneu', 'pneus', 'montage pneu'],
    }

    const keywords = serviceKeywords[serviceLower] || [serviceLower]
    const searchQueries = keywords.map(keyword => `name.ilike.%${keyword}%`).join(',')

    try {
      const { data: servicesData } = await supabase
        .from("carslink_garage_services")
        .select("garage_id, price, base_price")
        .eq("is_active", true)
        .or(searchQueries)

      if (servicesData) {
        const pricesMap: Record<string, { min: number; max: number }> = {}
        servicesData.forEach((item: any) => {
          const price = item.price != null ? Number(item.price) : (item.base_price != null ? Number(item.base_price) : null)
          if (price != null && price > 0) {
            if (!pricesMap[item.garage_id]) {
              pricesMap[item.garage_id] = { min: price, max: price }
            } else {
              pricesMap[item.garage_id].min = Math.min(pricesMap[item.garage_id].min, price)
              pricesMap[item.garage_id].max = Math.max(pricesMap[item.garage_id].max, price)
            }
          }
        })
        setGarageServicePrices(pricesMap)
      }
    } catch (error) {
      console.error("Error loading service prices:", error)
    }
  }

  // Charger les horaires d'ouverture pour tous les garages
  const loadGarageOpeningHours = async (garageId: string) => {
    try {
      const { data, error } = await supabase
        .from("carslink_garage_opening_hours")
        .select("*")
        .eq("garage_id", garageId)

      if (!error && data) {
        const hoursMap: Record<number, { is_open: boolean; open_time: string | null; close_time: string | null; lunch_break_start: string | null; lunch_break_end: string | null }> = {}
        data.forEach((hour: any) => {
          hoursMap[hour.day_of_week] = {
            is_open: hour.is_open,
            open_time: hour.open_time,
            close_time: hour.close_time,
            lunch_break_start: hour.lunch_break_start,
            lunch_break_end: hour.lunch_break_end,
          }
        })
        setAllGaragesOpeningHours(prev => ({
          ...prev,
          [garageId]: hoursMap
        }))
      }
    } catch (error) {
      console.error("Error loading garage opening hours:", error)
    }
  }

  // Charger les créneaux de réservation
  const loadBookingSlotsForGarage = async (garageId: string) => {
    try {
      const { data } = await supabase
        .from("carslink_garage_booking_slots")
        .select("day_of_week, time_slot, is_available")
        .eq("garage_id", garageId)
        .eq("is_available", true)

      if (data) {
        const slotsMap: Record<string, Set<string>> = {}
        data.forEach((slot: any) => {
          const key = `${garageId}_${slot.day_of_week}`
          if (!slotsMap[key]) {
            slotsMap[key] = new Set()
          }
          slotsMap[key].add(slot.time_slot)
        })
        setBookingSlots(prev => ({ ...prev, ...slotsMap }))
      }
    } catch (error) {
      console.error("Error loading booking slots:", error)
    }
  }

  // Charger les prix et horaires quand les garages changent
  useEffect(() => {
    if (garages.length > 0 && searchParams.get("service")) {
      loadServicePrices()
      garages.forEach(garage => {
        loadGarageOpeningHours(garage.id)
        loadBookingSlotsForGarage(garage.id)
      })
    }
  }, [garages.length, searchParams.get("service")])

  // Calculer les jours disponibles quand les horaires sont chargés
  useEffect(() => {
    if (garages.length > 0 && Object.keys(allGaragesOpeningHours).length > 0) {
      const availabilityMap: Record<string, number> = {}
      garages.forEach(garage => {
        availabilityMap[garage.id] = calculateAvailableDaysForGarage(garage.id)
      })
      setGarageAvailabilityDays(availabilityMap)
    }
  }, [garages.length, Object.keys(allGaragesOpeningHours).length, Object.keys(bookingSlots).length])


  // Afficher le chargement pendant la vérification d'authentification
  if (authLoading) {
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

  return (
    <div className="fixed inset-0 w-full h-full overflow-y-auto bg-gradient-to-br from-blue-50/40 via-white to-purple-50/20 pb-28 sm:pb-32 safe-area-top safe-area-bottom">
      {/* Mobile Container avec effet Liquid Glass */}
      <div className="w-full max-w-7xl mx-auto bg-white/70 backdrop-blur-2xl">
        {/* Header avec verre givré - Responsive */}
        <div className="px-4 sm:px-6 py-5 sm:py-6 bg-white/40 backdrop-blur-xl border-b border-white/20 sticky top-0 z-10">
          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0"
            >
              <X className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            <div className="flex-1 relative">
              <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
              <Input
                placeholder="Rechercher un garage..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 sm:pl-12 h-11 sm:h-12 text-sm sm:text-base rounded-xl"
              />
            </div>
          </div>
        </div>

        {/* Results - Responsive */}
        <div className="px-4 sm:px-6 py-6 sm:py-8 pb-28 sm:pb-32 bg-white/30 backdrop-blur-sm">
        {loading ? (
          <div className="text-center text-gray-500 py-12 text-sm sm:text-base">Chargement...</div>
        ) : garages.length > 0 ? (
          <div className="space-y-4 sm:space-y-6">
            {/* Filtres de tri - seulement si on recherche par service */}
            {searchParams.get("service") && (
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-4">
                <span className="text-xs sm:text-sm text-gray-600 font-medium">Trier par :</span>
                <Button
                  variant={garageSortBy.has('price') ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    const newSet = new Set(garageSortBy)
                    if (newSet.has('price')) {
                      newSet.delete('price')
                    } else {
                      newSet.add('price')
                    }
                    setGarageSortBy(newSet)
                  }}
                  className={`text-xs sm:text-sm h-8 sm:h-9 px-3 sm:px-4 rounded-lg transition-all ${
                    garageSortBy.has('price')
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
                      : 'bg-white/60 backdrop-blur-sm border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  💰 Prix
                </Button>
                <Button
                  variant={garageSortBy.has('distance') ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    const newSet = new Set(garageSortBy)
                    if (newSet.has('distance')) {
                      newSet.delete('distance')
                    } else {
                      newSet.add('distance')
                    }
                    setGarageSortBy(newSet)
                  }}
                  className={`text-xs sm:text-sm h-8 sm:h-9 px-3 sm:px-4 rounded-lg transition-all ${
                    garageSortBy.has('distance')
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
                      : 'bg-white/60 backdrop-blur-sm border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  📍 Distance
                </Button>
                <Button
                  variant={garageSortBy.has('availability') ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    const newSet = new Set(garageSortBy)
                    if (newSet.has('availability')) {
                      newSet.delete('availability')
                    } else {
                      newSet.add('availability')
                    }
                    setGarageSortBy(newSet)
                  }}
                  className={`text-xs sm:text-sm h-8 sm:h-9 px-3 sm:px-4 rounded-lg transition-all ${
                    garageSortBy.has('availability')
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
                      : 'bg-white/60 backdrop-blur-sm border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  📅 Disponibilité
                </Button>
                
                {/* Bouton pour changer l'ordre croissant/décroissant */}
                {garageSortBy.size > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setGarageSortOrder(garageSortOrder === 'asc' ? 'desc' : 'asc')}
                    className={`text-xs sm:text-sm h-8 sm:h-9 px-3 sm:px-4 rounded-lg transition-all bg-white/60 backdrop-blur-sm border-gray-300 text-gray-700 hover:bg-gray-50 ${
                      garageSortOrder === 'desc' ? 'bg-blue-50 border-blue-300' : ''
                    }`}
                    title={garageSortOrder === 'asc' ? 'Croissant' : 'Décroissant'}
                  >
                    {garageSortOrder === 'asc' ? (
                      <ArrowUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    ) : (
                      <ArrowDown className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    )}
                  </Button>
                )}
              </div>
            )}

            {(() => {
              let sortedGarages = garages

              // Appliquer le tri selon les filtres sélectionnés
              if (garageSortBy.size > 0) {
                const sortMultiplier = garageSortOrder === 'asc' ? 1 : -1
                
                sortedGarages = [...sortedGarages].sort((a, b) => {
                  // Ordre de priorité : prix > distance > disponibilité
                  
                  // 1. Tri par prix (si actif)
                  if (garageSortBy.has('price')) {
                    const priceA = garageServicePrices[a.id]?.min ?? Infinity
                    const priceB = garageServicePrices[b.id]?.min ?? Infinity
                    if (priceA !== priceB) {
                      return (priceA - priceB) * sortMultiplier
                    }
                  }
                  
                  // 2. Tri par distance (si actif et prix égaux ou prix non actif)
                  if (garageSortBy.has('distance')) {
                    const distA = getDistanceInKm(a) ?? Infinity
                    const distB = getDistanceInKm(b) ?? Infinity
                    if (distA !== distB) {
                      return (distA - distB) * sortMultiplier
                    }
                  }
                  
                  // 3. Tri par disponibilité (si actif et autres critères égaux ou non actifs)
                  if (garageSortBy.has('availability')) {
                    const availA = garageAvailabilityDays[a.id] ?? 0
                    const availB = garageAvailabilityDays[b.id] ?? 0
                    if (availA !== availB) {
                      return (availA - availB) * sortMultiplier
                    }
                  }
                  
                  return 0
                })
              }

              return (
                <>
                  {sortedGarages.map((garage) => (
                    <motion.div
                      key={garage.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="relative group">
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
                            
                            {/* Infos : ville, distance, prix, disponibilité */}
                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs text-gray-500 font-light">
                              {garage.city && (
                                <div className="flex items-center gap-0.5">
                                  <MapPin className="h-3 w-3" />
                                  <span>{garage.city}</span>
                                </div>
                              )}
                              {getDistanceFromUser(garage) && (
                                <>
                                  <span className="text-gray-400">•</span>
                                  <span>{getDistanceFromUser(garage)}</span>
                                </>
                              )}
                              {garageServicePrices[garage.id] && (
                                <>
                                  <span className="text-gray-400">•</span>
                                  <span className="text-green-600 font-semibold">
                                    {garageServicePrices[garage.id]!.min}€
                                  </span>
                                </>
                              )}
                              {garageAvailabilityDays[garage.id] !== undefined && (
                                <>
                                  <span className="text-gray-400">•</span>
                                  <span>{garageAvailabilityDays[garage.id]} jours dispo.</span>
                                </>
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
                                // Toujours passer le garage ET le service si présent
                                const serviceParam = searchParams.get("service")
                                if (serviceParam) {
                                  router.push(`/reservation?garage=${garage.id}&service=${encodeURIComponent(serviceParam)}`)
                                } else {
                                  router.push(`/reservation?garage=${garage.id}`)
                                }
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
                    </div>
                    </motion.div>
                  ))}
                </>
              )
            })()}
          </div>
        ) : (
          <div className="text-center text-gray-500 py-12 sm:py-16">
            <p className="mb-2 text-sm sm:text-base">Aucun garage trouvé</p>
            <p className="text-xs sm:text-sm">Essayez de modifier vos critères de recherche</p>
          </div>
        )}
        </div>
      </div>

      <BottomNavigation />
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">Chargement...</div>}>
      <SearchPageContent />
    </Suspense>
  )
}
