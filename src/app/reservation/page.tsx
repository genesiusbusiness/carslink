"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import { Check, ChevronRight, Calendar, Clock, CreditCard, MapPin, Car, ArrowLeft, Star, User, Mail, UserPlus, ChevronLeft, Info, Verified, Building2, Navigation, Wrench, ArrowUp, ArrowDown } from "lucide-react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { BottomNavigation } from "@/components/layout/BottomNavigation"
import { useAuth } from "@/lib/hooks/use-auth"
import { supabase } from "@/lib/supabase/client"
import { useToast } from "@/components/ui/use-toast"
import { showElegantToast } from "@/components/ui/elegant-toast"
import { formatDateTime, formatDate, formatTime } from "@/lib/utils"
import { calculateDistance, formatDistance, getUserPosition } from "@/lib/utils/geolocation"
import { ServiceSelector } from "@/components/reservation/ServiceSelector"
import type { Garage, Vehicle, Profile } from "@/lib/types/database"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

const STEPS_NORMAL = [
  { id: 1, name: "Service", icon: Calendar },
  { id: 2, name: "Garage", icon: MapPin },
  { id: 3, name: "Créneau", icon: Clock },
  { id: 4, name: "Profil", icon: User },
  { id: 5, name: "Récapitulatif", icon: CreditCard },
]

const STEPS_FROM_GARAGE = [
  { id: 1, name: "Service", icon: Calendar },
  { id: 2, name: "Créneau", icon: Clock },
  { id: 3, name: "Profil", icon: User },
  { id: 4, name: "Récapitulatif", icon: CreditCard },
]

function ReservationPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const [currentStep, setCurrentStep] = useState(() => {
    // Si on arrive avec garage + service dans l'URL, commencer directement à l'étape 2 (calendrier)
    const garageId = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get("garage") : null
    const serviceParam = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get("service") : null
    if (garageId && serviceParam) {
      return 2 // Passer directement au calendrier
    }
    return 1
  })
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
  const isFromGarageDetails = !!searchParams.get("garage")
  const [selectedService, setSelectedService] = useState("")
  const [selectedServiceLabel, setSelectedServiceLabel] = useState("")
  const [selectedGarage, setSelectedGarage] = useState<Garage | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState("")
  const [selectedQuarterHour, setSelectedQuarterHour] = useState("")
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(false)
  const [garages, setGarages] = useState<Garage[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [garageServicePrices, setGarageServicePrices] = useState<Record<string, { min: number; max: number } | null>>({})
  const [servicePrices, setServicePrices] = useState<Record<string, number | null>>({}) // Prix par service ID pour le garage sélectionné
  const [loadingServicePrices, setLoadingServicePrices] = useState(false) // État de chargement des prix
  const [garageReviewsCount, setGarageReviewsCount] = useState<Record<string, number>>({})
  const [isBookingForSomeoneElse, setIsBookingForSomeoneElse] = useState(false)
  
  // Filtres pour les garages (peuvent être combinés)
  const [garageSortBy, setGarageSortBy] = useState<Set<'price' | 'distance' | 'availability'>>(new Set())
  const [garageSortOrder, setGarageSortOrder] = useState<'asc' | 'desc'>('asc') // 'asc' = croissant, 'desc' = décroissant
  const [garageAvailabilityDays, setGarageAvailabilityDays] = useState<Record<string, number>>({}) // Nombre de jours disponibles pour chaque garage
  
  // Horaires d'ouverture et créneaux réservés
  const [openingHours, setOpeningHours] = useState<Record<number, { is_open: boolean; open_time: string | null; close_time: string | null; lunch_break_start: string | null; lunch_break_end: string | null }>>({})
  const [allGaragesOpeningHours, setAllGaragesOpeningHours] = useState<Record<string, Record<number, { is_open: boolean; open_time: string | null; close_time: string | null; lunch_break_start: string | null; lunch_break_end: string | null }>>>({})
  const [bookingSlots, setBookingSlots] = useState<Record<string, Set<string>>>({}) // garageId_dayOfWeek => Set<time_slot>
  const [bookedSlots, setBookedSlots] = useState<Set<string>>(new Set())
  const [userPosition, setUserPosition] = useState<{ latitude: number; longitude: number } | null>(null)
  
  // Informations pour réservation pour quelqu'un d'autre
  const [otherPersonInfo, setOtherPersonInfo] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    brand: "",
    model: "",
    license_plate: "",
    year: "",
    fuel_type: "",
  })
  
  // État pour la navigation du calendrier mensuel
  const [currentMonth, setCurrentMonth] = useState(new Date())
  
  // Options supplémentaires
  const [additionalOptions, setAdditionalOptions] = useState({
    courtesyVehicle: false,
    pickupService: false,
    homePickup: false,
    expressBooking: false,
    otherService: false,
  })
  // Service "autre"
  const [otherServiceDescription, setOtherServiceDescription] = useState("")
  const [otherServiceFiles, setOtherServiceFiles] = useState<File[]>([])

  // Mapping des noms de services de l'URL vers les IDs de service
  const serviceNameToId: Record<string, { id: string; label: string }> = {
    "révision": { id: "revision", label: "Révision constructeur complète" },
    "revision": { id: "revision", label: "Révision constructeur complète" },
    "vidange": { id: "vidange", label: "Vidange & entretien" },
    "freinage": { id: "freinage", label: "Freinage (plaquettes, disques, liquide)" },
    "freins": { id: "freinage", label: "Freinage (plaquettes, disques, liquide)" },
    "pneu": { id: "changement_pneus", label: "Changement de pneus" },
    "pneus": { id: "changement_pneus", label: "Changement de pneus" },
  }

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      router.push("/login")
      return
    }

    loadVehicles()
    loadProfile()

    // Charger la position de l'utilisateur
    getUserPosition().then(pos => {
      if (pos) {
        setUserPosition({ latitude: pos.latitude, longitude: pos.longitude })
      }
    })

    const garageId = searchParams.get("garage")
    const serviceParam = searchParams.get("service")
    
    if (garageId) {
      // Charger le garage et les prix en parallèle pour être plus rapide
      Promise.all([
        loadGarage(garageId),
        loadAllServicePricesForGarage(garageId)
      ]).then(() => {
        // Une fois le garage chargé, si on a aussi un service, le sélectionner et passer au calendrier
        if (serviceParam) {
          const serviceLower = serviceParam.toLowerCase().trim()
          const serviceMapping = serviceNameToId[serviceLower]
          if (serviceMapping) {
            setSelectedService(serviceMapping.id)
            setSelectedServiceLabel(serviceMapping.label)
            // Passer directement au calendrier (étape 2 du flux "from garage")
            // Ne pas revenir à l'étape 1 même si currentStep était initialisé à 1
            setCurrentStep(2)
            // S'assurer que les créneaux sont chargés après le changement d'étape
            // Le garage est déjà chargé dans loadGarage, donc on peut utiliser garageId directement
            setTimeout(() => {
              loadBookingSlotsForGarage(garageId)
            }, 100)
          }
        }
      }).catch(error => {
      console.error("Erreur lors du chargement:", error)
      })
    } else if (serviceParam) {
      // Si on a seulement un service (sans garage), sélectionner le service et passer à l'étape 2 pour voir les garages avec filtres
      const serviceLower = serviceParam.toLowerCase().trim()
      const serviceMapping = serviceNameToId[serviceLower]
      if (serviceMapping) {
        setSelectedService(serviceMapping.id)
        setSelectedServiceLabel(serviceMapping.label)
        // Passer directement à l'étape 2 pour voir les garages avec filtres
        setCurrentStep(2)
      }
    }
    
    // Si on a garage + service dans l'URL ET qu'on est encore à l'étape 1 (premier chargement uniquement)
    // Ne pas interférer si on est déjà à une étape supérieure (pour éviter de revenir en arrière)
    // Utiliser une ref pour éviter les re-déclenchements
    if (garageId && serviceParam && currentStep === 1 && !selectedService) {
      setCurrentStep(2)
    }
  }, [user, router, searchParams, authLoading])

  // Charger les garages quand un service est sélectionné
  useEffect(() => {
    if (selectedService && selectedServiceLabel && currentStep >= 2) {
      loadGaragesForService()
    }
  }, [selectedService, selectedServiceLabel, currentStep])

  // Charger le prix pour un garage pré-sélectionné à l'étape 2
  useEffect(() => {
    if (currentStep === 2 && selectedGarage && selectedService && selectedServiceLabel) {
      const garageId = selectedGarage.id
      // Vérifier si le prix n'est pas déjà chargé
      if (!garageServicePrices[garageId]) {
        const loadPriceForGarage = async () => {
          const serviceName = selectedServiceLabel || selectedService
          
          // Mapping des IDs de service vers des mots-clés de recherche dans la base
          const serviceKeywords: Record<string, string[]> = {
            "vidange": ["vidange", "changement d'huile", "huile"],
            "revision": ["révision", "révision complète", "entretien"],
            "filtres": ["filtre", "filtres", "changement filtres"],
            "controle": ["contrôle technique", "préparation contrôle", "contre-visite"],
            "freinage": ["freinage", "frein", "plaquettes", "disques"],
            "suspension": ["suspension", "amortisseurs"],
            "embrayage": ["embrayage", "transmission"],
            "moteur": ["moteur", "diagnostic", "diagnostic électronique", "réparation moteur"],
            "climatisation": ["climatisation", "recharge climatisation", "clim"],
            "batterie": ["batterie", "test batterie"],
            "electricite": ["électricité", "phares", "vitres"],
            "accessoires": ["accessoires", "autoradio", "caméra", "attelage"],
            "changement_pneus": ["pneus", "montage pneus", "changement pneus"],
            "equilibrage": ["équilibrage", "parallélisme"],
            "permutation": ["permutation", "permutation pneus"],
            "carrosserie": ["carrosserie", "peinture", "réparation carrosserie"],
            "polissage": ["polissage", "débosselage"],
            "nettoyage": ["nettoyage", "lavage"],
            "depannage": ["dépannage", "réparation urgente"],
            "devis": ["devis"]
          }
          
          const keywords = serviceKeywords[selectedService] || [serviceName]
          const searchQueries = keywords.map(keyword => `name.ilike.%${keyword}%`).join(',')
          
          
          let { data: servicePriceData, error: priceError } = await supabase
            .from("carslink_garage_services")
            .select("price, base_price, name")
            .eq("garage_id", garageId)
            .eq("is_active", true)
            .or(searchQueries)
            .limit(1)
            .maybeSingle()
          
          
          // Si aucun résultat, essayer avec le premier keyword seulement
          if (!servicePriceData && keywords.length > 0) {
            const { data: fallbackPriceData } = await supabase
              .from("carslink_garage_services")
              .select("price, base_price, name")
              .eq("garage_id", garageId)
              .eq("is_active", true)
              .ilike("name", `%${keywords[0]}%`)
              .limit(1)
              .maybeSingle()
            
            if (fallbackPriceData) {
              servicePriceData = fallbackPriceData
            } else {
              // Dernier recours: récupérer le premier service actif du garage
              const { data: firstService } = await supabase
                .from("carslink_garage_services")
                .select("price, base_price, name")
                .eq("garage_id", garageId)
                .eq("is_active", true)
                .limit(1)
                .maybeSingle()
              
              if (firstService) {
                servicePriceData = firstService
              }
            }
          }
          
          if (servicePriceData) {
            // PRIORITÉ CORRECTE selon la base de données :
            // 1. price (prix fixe du service) - PRIORITÉ MAXIMALE
            // 2. base_price (ancien système) - PRIORITÉ SECONDAIRE
            
            // Convertir toutes les valeurs en nombres pour comparaison
            const price = servicePriceData.price != null ? Number(servicePriceData.price) : null
            const basePrice = servicePriceData.base_price != null ? Number(servicePriceData.base_price) : null
            
            
            // PRIORITÉ 1 : Utiliser le prix fixe du service (c'est le prix principal)
            if (price != null && !isNaN(price) && price > 0) {
              setGarageServicePrices(prev => ({
                ...prev,
                [garageId]: { min: price, max: price }
              }))
            }
            // PRIORITÉ 2 : Fallback sur base_price
            else if (basePrice != null && !isNaN(basePrice) && basePrice > 0) {
              setGarageServicePrices(prev => ({
                ...prev,
                [garageId]: { min: basePrice, max: basePrice }
              }))
            } else {
            }
          }
        }
        loadPriceForGarage()
      }
    }
  }, [currentStep, selectedGarage?.id, selectedService, selectedServiceLabel])

  // Charger les horaires de tous les garages
  useEffect(() => {
    if (garages.length > 0) {
      const loadAllHours = async () => {
        await Promise.all(
          garages.map(async (garage) => {
            if (!allGaragesOpeningHours[garage.id]) {
              await loadGarageOpeningHours(garage.id)
            }
          })
        )
      }
      loadAllHours()
    }
  }, [garages.length])

  // Auto-remplir le profil à l'étape 4 (ou 3 si depuis page détails)
  useEffect(() => {
    const profileStep = isFromGarageDetails ? 3 : 4
    if (currentStep === profileStep && profile && vehicles.length > 0 && !selectedVehicle && !isBookingForSomeoneElse) {
      // Sélectionner automatiquement le premier véhicule
      setSelectedVehicle(vehicles[0])
    }
  }, [currentStep, profile, vehicles, selectedVehicle, isBookingForSomeoneElse, isFromGarageDetails])

  // Charger les créneaux disponibles quand le garage change (une seule fois)
  useEffect(() => {
    const calendarStep = isFromGarageDetails ? 2 : 3
    if (selectedGarage?.id && currentStep >= calendarStep) {
      loadBookingSlotsForGarage(selectedGarage.id)
    }
  }, [selectedGarage?.id, currentStep, isFromGarageDetails])

  // Charger les créneaux réservés quand la date change
  useEffect(() => {
    const calendarStep = isFromGarageDetails ? 2 : 3
    if (selectedGarage?.id && selectedDate && currentStep === calendarStep) {
      loadBookedSlots(selectedGarage.id, selectedDate)
    }
  }, [selectedGarage?.id, selectedDate, currentStep, isFromGarageDetails])

  // Charger les créneaux de réservation du garage
  const loadBookingSlotsForGarage = async (garageId: string) => {
    if (!garageId) {
      return
    }

    try {
      const { data, error } = await supabase
        .from("carslink_garage_booking_slots")
        .select("day_of_week, time_slot, is_available")
        .eq("garage_id", garageId)
        .eq("is_available", true)

      if (error) {
        // Si erreur RLS ou table n'existe pas, utiliser les horaires d'ouverture comme fallback
        return
      }

      if (data && data.length > 0) {
        const slotsMap: Record<string, Set<string>> = {}
        data.forEach((slot: any) => {
          const key = `${garageId}_${slot.day_of_week}`
          if (!slotsMap[key]) {
            slotsMap[key] = new Set()
          }
          // Extraire juste HH:MM du format TIME
          const timeSlot = typeof slot.time_slot === 'string' 
            ? slot.time_slot.substring(0, 5) 
            : slot.time_slot
          slotsMap[key].add(timeSlot)
        })
        setBookingSlots(prev => {
          const updated = { ...prev, ...slotsMap }
          return updated
        })
      } else {
      }
    } catch (error) {
    }
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
      }
    } catch (error) {
      console.error("Error loading profile:", error)
    }
  }

  const loadVehicles = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .eq("flynesis_user_id", user.id)
        .order("created_at", { ascending: false })

      if (!error && data) {
        setVehicles(data)
        // Sélectionner automatiquement le premier véhicule s'il n'y en a qu'un
        if (data.length === 1 && currentStep === 4) {
          setSelectedVehicle(data[0])
        }
      }
    } catch (error) {
      console.error("Error loading vehicles:", error)
    }
  }

  const loadGaragesForService = async () => {
    if (!selectedService || !selectedServiceLabel) {
      setGarages([])
      return
    }

    try {
      // Rechercher les garages qui proposent ce service
      // Mapper le nom du service aux services de la base
      const serviceName = selectedServiceLabel || selectedService
      
      
      // Mapping des IDs de service vers des mots-clés de recherche dans la base
      const serviceKeywords: Record<string, string[]> = {
        "vidange": ["vidange", "changement d'huile", "huile"],
        "revision": ["révision", "révision complète", "entretien"],
        "filtres": ["filtre", "filtres", "changement filtres"],
        "controle": ["contrôle technique", "préparation contrôle", "contre-visite"],
        "freinage": ["freinage", "frein", "plaquettes", "disques"],
        "suspension": ["suspension", "amortisseurs"],
        "embrayage": ["embrayage", "transmission"],
        "moteur": ["moteur", "diagnostic", "diagnostic électronique", "réparation moteur"],
        "climatisation": ["climatisation", "recharge climatisation", "clim"],
        "batterie": ["batterie", "test batterie"],
        "electricite": ["électricité", "phares", "vitres"],
        "accessoires": ["accessoires", "autoradio", "caméra", "attelage"],
        "changement_pneus": ["pneus", "montage pneus", "changement pneus"],
        "equilibrage": ["équilibrage", "parallélisme"],
        "permutation": ["permutation", "permutation pneus"],
        "carrosserie": ["carrosserie", "peinture", "réparation carrosserie"],
        "polissage": ["polissage", "débosselage"],
        "nettoyage": ["nettoyage", "lavage"],
        "depannage": ["dépannage", "réparation urgente"],
        "devis": ["devis"]
      }
      
      // Récupérer les mots-clés pour ce service
      const keywords = serviceKeywords[selectedService] || [serviceName]
      
      // Requête pour trouver les garages avec ce service et récupérer le prix
      // Utiliser OR avec la syntaxe correcte pour PostgREST: "col1.eq.val1,col2.eq.val2"
      const searchQueries = keywords.map(keyword => `name.ilike.%${keyword}%`).join(',')
      
      let { data: serviceData, error: serviceError } = await supabase
        .from("carslink_garage_services")
        .select(`
          garage_id,
          price,
          base_price,
          name,
          garage:carslink_garages(*)
        `)
        .eq("is_active", true)
        .or(searchQueries)

      if (serviceData && serviceData.length > 0) {
        // Traiter les données de service
      }

      if (serviceError) {
        // Fallback: charger tous les garages actifs
        await loadAllGarages()
        return
      }
      
      // Si aucun résultat avec les keywords, essayer une recherche plus large
      if (!serviceData || serviceData.length === 0) {
        // Essayer avec juste le premier mot-clé
        const firstKeyword = keywords[0]
        if (firstKeyword) {
          const { data: fallbackData } = await supabase
            .from("carslink_garage_services")
            .select(`
              garage_id,
              price,
              base_price,
              name,
              garage:carslink_garages(*)
            `)
            .eq("is_active", true)
            .ilike("name", `%${firstKeyword}%`)
          
          if (fallbackData && fallbackData.length > 0) {
            serviceData = fallbackData
          } else {
            // Dernier recours: charger tous les garages actifs
            await loadAllGarages()
            return
          }
        }
      }

      if (serviceData && serviceData.length > 0) {
        // Extraire les garages uniques avec leurs prix
        const uniqueGarages = serviceData
          .map((item: any) => item.garage)
          .filter((g: any) => g && (g.status === "active" || !g.status))
        
        // Supprimer les doublons et prendre le PREMIER service correspondant pour chaque garage
        const garageMap = new Map()
        const pricesMap: Record<string, { min: number; max: number } | null> = {}
        // Map pour stocker le premier service trouvé pour chaque garage
        const firstServiceMap: Record<string, any> = {}
        
        serviceData.forEach((item: any) => {
          if (item.garage && !garageMap.has(item.garage.id)) {
            garageMap.set(item.garage.id, item.garage)
          }
          
          // Prendre SEULEMENT le PREMIER service correspondant pour chaque garage
          if (item.garage && !firstServiceMap[item.garage.id]) {
            firstServiceMap[item.garage.id] = item
            
            
            // PRIORITÉ CORRECTE selon la base de données :
            // 1. price (prix fixe du service) - PRIORITÉ MAXIMALE
            // 2. base_price (ancien système) - PRIORITÉ SECONDAIRE
            
            // Convertir toutes les valeurs en nombres pour comparaison
            const price = item.price != null ? Number(item.price) : null
            const basePrice = item.base_price != null ? Number(item.base_price) : null
            
            
            // PRIORITÉ 1 : Utiliser le prix fixe du service (c'est le prix principal)
            if (price != null && !isNaN(price) && price > 0) {
              pricesMap[item.garage.id] = { min: price, max: price }
            }
            // PRIORITÉ 2 : Fallback sur base_price
            else if (basePrice != null && !isNaN(basePrice) && basePrice > 0) {
              pricesMap[item.garage.id] = { min: basePrice, max: basePrice }
            } else {
            }
          }
        })
        
        
        const garagesList = Array.from(garageMap.values())
        
        // Trier par rating
        garagesList.sort((a: any, b: any) => (b.rating || 0) - (a.rating || 0))
        
        setGarages(garagesList)
        setGarageServicePrices(pricesMap)
        
        // Charger le nombre d'avis pour ces garages
        const garageIds = garagesList.map((g: any) => g.id)
        await loadGaragesReviewsCount(garageIds)
      } else {
        // Si aucun garage trouvé, charger tous les garages actifs
        await loadAllGarages()
      }
    } catch (error) {
      console.error("Error loading garages for service:", error)
      await loadAllGarages()
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

  const loadAllGarages = async () => {
    try {
      let { data, error } = await supabase
        .from("carslink_garages")
        .select("*")
        .eq("status", "active")
        .limit(50)

      if (error) {
        const result = await supabase
          .from("carslink_garages")
          .select("*")
          .limit(50)
        
        data = result.data
        if (data) {
          data = data.filter((g: any) => g.status === "active")
        }
      }

      if (data) {
        if (data[0]?.rating !== undefined) {
          data.sort((a: any, b: any) => (b.rating || 0) - (a.rating || 0))
        }
        setGarages(data)
      }
    } catch (error) {
      console.error("Error loading all garages:", error)
    }
  }

  // Charger tous les prix des services pour le garage sélectionné
  const loadAllServicePricesForGarage = async (garageId: string) => {
    if (!garageId) return

    setLoadingServicePrices(true)
    try {
      
      // D'abord, récupérer TOUS les services actifs du garage
      const { data: allServices, error: servicesError } = await supabase
        .from("carslink_garage_services")
        .select("id, name, price, base_price")
        .eq("garage_id", garageId)
        .eq("is_active", true)

      if (servicesError) {
        setLoadingServicePrices(false)
        return
      }

      const pricesMap: Record<string, number | null> = {}

      // Créer un mapping basé sur les noms de services réels (normalisés comme dans ServiceSelector)
        if (allServices && allServices.length > 0) {
        console.log(`💰 Chargement des prix pour ${allServices.length} services du garage ${garageId}`)
          for (const service of allServices) {
          // Générer l'ID de service de la même manière que dans ServiceSelector
          const serviceId = service.name.toLowerCase().replace(/\s+/g, '_')
          
          const price = service.price != null ? Number(service.price) : null
          const basePrice = service.base_price != null ? Number(service.base_price) : null
          
          // PRIORITÉ 1 : Utiliser le prix fixe du service
          if (price != null && !isNaN(price) && price > 0) {
            pricesMap[serviceId] = price
            console.log(`✅ Prix chargé: ${service.name} (${serviceId}) = ${price}€`)
          }
          // PRIORITÉ 2 : Fallback sur base_price
          else if (basePrice != null && !isNaN(basePrice) && basePrice > 0) {
            pricesMap[serviceId] = basePrice
            console.log(`✅ Prix chargé (base_price): ${service.name} (${serviceId}) = ${basePrice}€`)
          } else {
            pricesMap[serviceId] = null
            console.log(`⚠️ Pas de prix pour ${service.name} (${serviceId})`)
          }
        }
      }

      console.log('💰 Mapping des prix final:', pricesMap)
      setServicePrices(pricesMap)
    } catch (error) {
    } finally {
      setLoadingServicePrices(false)
    }
  }

  const loadGarage = async (garageId: string) => {
    try {
      const { data, error } = await supabase
        .from("carslink_garages")
        .select("*")
        .eq("id", garageId)
        .single()

      if (!error && data) {
        setSelectedGarage(data)
        // Charger les horaires d'ouverture et les créneaux de réservation
        await loadOpeningHours(garageId)
        await loadBookingSlotsForGarage(garageId)
        
        // Charger le prix du service pour ce garage si un service est sélectionné
        if (selectedService && selectedServiceLabel) {
          const serviceName = selectedServiceLabel || selectedService
          
          // Mapping des IDs de service vers des mots-clés de recherche dans la base
          const serviceKeywords: Record<string, string[]> = {
            "vidange": ["vidange", "changement d'huile", "huile"],
            "revision": ["révision", "révision complète", "entretien"],
            "filtres": ["filtre", "filtres", "changement filtres"],
            "controle": ["contrôle technique", "préparation contrôle", "contre-visite"],
            "freinage": ["freinage", "frein", "plaquettes", "disques"],
            "suspension": ["suspension", "amortisseurs"],
            "embrayage": ["embrayage", "transmission"],
            "moteur": ["moteur", "diagnostic", "diagnostic électronique", "réparation moteur"],
            "climatisation": ["climatisation", "recharge climatisation", "clim"],
            "batterie": ["batterie", "test batterie"],
            "electricite": ["électricité", "phares", "vitres"],
            "accessoires": ["accessoires", "autoradio", "caméra", "attelage"],
            "changement_pneus": ["pneus", "montage pneus", "changement pneus"],
            "equilibrage": ["équilibrage", "parallélisme"],
            "permutation": ["permutation", "permutation pneus"],
            "carrosserie": ["carrosserie", "peinture", "réparation carrosserie"],
            "polissage": ["polissage", "débosselage"],
            "nettoyage": ["nettoyage", "lavage"],
            "depannage": ["dépannage", "réparation urgente"],
            "devis": ["devis"]
          }
          
          const keywords = serviceKeywords[selectedService] || [serviceName]
          const searchQueries = keywords.map(keyword => `name.ilike.%${keyword}%`).join(',')
          
          
          let { data: servicePriceData, error: priceError } = await supabase
            .from("carslink_garage_services")
            .select("price, base_price, name")
            .eq("garage_id", garageId)
            .eq("is_active", true)
            .or(searchQueries)
            .limit(1)
            .maybeSingle()
          
          
          // Si aucun résultat, essayer avec le premier keyword seulement
          if (!servicePriceData && keywords.length > 0) {
            const { data: fallbackPriceData } = await supabase
              .from("carslink_garage_services")
              .select("price, base_price, name")
              .eq("garage_id", garageId)
              .eq("is_active", true)
              .ilike("name", `%${keywords[0]}%`)
              .limit(1)
              .maybeSingle()
            
            if (fallbackPriceData) {
              servicePriceData = fallbackPriceData
            } else {
              // Dernier recours: récupérer le premier service actif du garage
              const { data: firstService } = await supabase
                .from("carslink_garage_services")
                .select("price, base_price, name")
                .eq("garage_id", garageId)
                .eq("is_active", true)
                .limit(1)
                .maybeSingle()
              
              if (firstService) {
                servicePriceData = firstService
              }
            }
          }
          
          if (servicePriceData) {
            // PRIORITÉ CORRECTE selon la base de données :
            // 1. price (prix fixe du service) - PRIORITÉ MAXIMALE
            // 2. base_price (ancien système) - PRIORITÉ SECONDAIRE
            
            // Convertir toutes les valeurs en nombres pour comparaison
            const price = servicePriceData.price != null ? Number(servicePriceData.price) : null
            const basePrice = servicePriceData.base_price != null ? Number(servicePriceData.base_price) : null
            
            
            // PRIORITÉ 1 : Utiliser le prix fixe du service (c'est le prix principal)
            if (price != null && !isNaN(price) && price > 0) {
              setGarageServicePrices(prev => ({
                ...prev,
                [garageId]: { min: price, max: price }
              }))
            }
            // PRIORITÉ 2 : Fallback sur base_price
            else if (basePrice != null && !isNaN(basePrice) && basePrice > 0) {
              setGarageServicePrices(prev => ({
                ...prev,
                [garageId]: { min: basePrice, max: basePrice }
              }))
            } else {
            }
          }
        }
        
        setSelectedGarage(data)
        // Charger les horaires d'ouverture et les créneaux de réservation en parallèle
        Promise.all([
          loadOpeningHours(garageId),
          loadBookingSlotsForGarage(garageId)
        ]).catch(error => {
          console.error("Erreur lors du chargement des horaires:", error)
        })
        
        // Ne plus charger les prix ici car c'est fait en parallèle dans le useEffect
      }
    } catch (error) {
      console.error("Error loading garage:", error)
    }
  }

  // Charger les horaires d'ouverture du garage (pour le garage sélectionné)
  const loadOpeningHours = async (garageId: string) => {
    try {
      const { data, error } = await supabase
        .from("carslink_garage_opening_hours")
        .select("*")
        .eq("garage_id", garageId)

      if (error) {
        setOpeningHours({})
        return
      }

      if (data && data.length > 0) {
        const hoursMap: Record<number, any> = {}
        data.forEach((hour: any) => {
          // Toujours stocker l'entrée, même si is_open = false
          hoursMap[hour.day_of_week] = {
            is_open: hour.is_open,
            open_time: hour.open_time,
            close_time: hour.close_time,
            lunch_break_start: hour.lunch_break_start,
            lunch_break_end: hour.lunch_break_end,
          }
        })
        setOpeningHours(hoursMap)
      } else {
        // Créer un map vide pour indiquer qu'aucun jour n'est configuré
        setOpeningHours({})
      }
    } catch (error) {
      setOpeningHours({})
    }
  }

  // Charger les horaires d'ouverture d'un garage spécifique (pour l'affichage dans la liste)
  const loadGarageOpeningHours = async (garageId: string) => {
    try {
      const { data, error } = await supabase
        .from("carslink_garage_opening_hours")
        .select("*")
        .eq("garage_id", garageId)

      if (!error && data) {
        const hoursMap: Record<number, any> = {}
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

  // Obtenir un résumé des horaires d'ouverture pour un garage
  const getOpeningHoursSummary = (garageId: string) => {
    const hours = allGaragesOpeningHours[garageId]
    if (!hours || Object.keys(hours).length === 0) {
      // Si pas d'horaires chargés, retourner null pour le moment
      // Ils seront chargés progressivement
      return null
    }

    // Trouver les jours ouverts
    const openDays = Object.entries(hours).filter(([_, h]: [string, any]) => h.is_open)
    if (openDays.length === 0) return null

    // Prendre le premier jour ouvert comme référence
    const firstDay = openDays[0][1] as any
    let commonOpenTime = firstDay.open_time
    let commonCloseTime = firstDay.close_time

    // Formater les heures si elles sont au format TIME (HH:MM:SS) ou simplement HH:MM
    if (commonOpenTime && typeof commonOpenTime === 'string') {
      commonOpenTime = commonOpenTime.substring(0, 5) // Prendre seulement HH:MM
    }
    if (commonCloseTime && typeof commonCloseTime === 'string') {
      commonCloseTime = commonCloseTime.substring(0, 5)
    }

    if (!commonOpenTime) commonOpenTime = "08:00"
    if (!commonCloseTime) commonCloseTime = "18:00"

    // Vérifier si tous les jours ouverts ont les mêmes horaires
    const allSame = openDays.every(([_, h]: [string, any]) => {
      const openTime = h.open_time ? (typeof h.open_time === 'string' ? h.open_time.substring(0, 5) : h.open_time) : "08:00"
      const closeTime = h.close_time ? (typeof h.close_time === 'string' ? h.close_time.substring(0, 5) : h.close_time) : "18:00"
      return openTime === commonOpenTime && closeTime === commonCloseTime
    })

    if (allSame) {
      return `${commonOpenTime} - ${commonCloseTime}`
    }

    // Sinon, retourner le premier horaire trouvé
    return `${commonOpenTime} - ${commonCloseTime}`
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
      return 0 // Pas d'horaires chargés
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const maxDate = new Date(today)
    maxDate.setDate(today.getDate() + 90) // 90 jours à l'avance

    let availableDays = 0

    for (let d = new Date(today); d <= maxDate; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay()
      const dayHours = hours[dayOfWeek]

      // Vérifier si le jour est ouvert
      if (dayHours && dayHours.is_open) {
        // Vérifier s'il y a des créneaux de réservation pour ce jour
        const bookingSlotsKey = `${garageId}_${dayOfWeek}`
        const availableSlots = bookingSlots[bookingSlotsKey]

        // Si pas de créneaux spécifiques chargés, considérer comme disponible si ouvert
        // Si créneaux chargés, vérifier qu'il y en a au moins un
        if (!availableSlots || availableSlots.size > 0) {
          availableDays++
        }
      }
    }

    return availableDays
  }

  // Charger les jours disponibles pour tous les garages
  useEffect(() => {
    if (garages.length > 0 && Object.keys(allGaragesOpeningHours).length > 0) {
      const availabilityMap: Record<string, number> = {}
      garages.forEach(garage => {
        availabilityMap[garage.id] = calculateAvailableDaysForGarage(garage.id)
      })
      setGarageAvailabilityDays(availabilityMap)
    }
  }, [garages.length, Object.keys(allGaragesOpeningHours).length, Object.keys(bookingSlots).length])
  const loadBookedSlots = async (garageId: string, date: Date) => {
    if (!garageId || !date) {
      setBookedSlots(new Set())
      return
    }

    try {
      const startOfDay = new Date(date)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(date)
      endOfDay.setHours(23, 59, 59, 999)

      
      const { data, error } = await supabase
        .from("appointments")
        .select("start_time, end_time")
        .eq("garage_id", garageId)
        .gte("start_time", startOfDay.toISOString())
        .lte("start_time", endOfDay.toISOString())
        .in("status", ["pending", "confirmed", "in_progress"])

      if (error) {
        setBookedSlots(new Set())
        return
      }

      if (data && data.length > 0) {
        const slots = new Set<string>()
        data.forEach((apt: any) => {
          const start = new Date(apt.start_time)
          const end = new Date(apt.end_time)
          
          // Générer tous les créneaux de 15 min entre start et end
          let current = new Date(start)
          while (current < end) {
            const hours = current.getHours().toString().padStart(2, "0")
            const minutes = current.getMinutes().toString().padStart(2, "0")
            slots.add(`${hours}:${minutes}`)
            current.setMinutes(current.getMinutes() + 15)
          }
        })
        setBookedSlots(slots)
      } else {
        setBookedSlots(new Set())
      }
    } catch (error) {
      setBookedSlots(new Set())
    }
  }

  const timeSlots = ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00"]

  const handleServiceSelect = (serviceId: string, serviceLabel: string) => {
    setSelectedService(serviceId)
    setSelectedServiceLabel(serviceLabel)
    // Passer automatiquement à l'étape suivante après sélection (sauf pour "autre")
    if (serviceId && serviceId !== "autre" && currentStep === 1) {
      setTimeout(() => {
        handleNext()
      }, 300)
    }
  }

  // Fonction pour obtenir les étapes selon le contexte
  const getSteps = () => {
    return isFromGarageDetails ? STEPS_FROM_GARAGE : STEPS_NORMAL
  }

  // Fonction pour obtenir le numéro d'étape réel selon le contexte
  const getRealStepNumber = (step: number) => {
    if (!isFromGarageDetails) return step
    // Si on vient de la page de détails du garage, on saute l'étape 2 (Garage)
    if (step === 1) return 1 // Service
    if (step === 2) return 2 // Date (au lieu de Garage)
    if (step === 3) return 3 // Créneau
    if (step === 4) return 4 // Profil
    if (step === 5) return 5 // Récapitulatif
    return step
  }

  const handleNext = () => {
    const steps = getSteps()
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async () => {
    // Validation selon si c'est pour quelqu'un d'autre ou non
    if (!selectedService || !selectedGarage || !selectedDate || !selectedTime) {
      showElegantToast({
        title: "Champs manquants",
        message: "Veuillez remplir tous les champs requis",
        variant: "error",
      })
      return
    }

    if (!isBookingForSomeoneElse && !selectedVehicle) {
      showElegantToast({
        title: "Véhicule requis",
        message: "Veuillez sélectionner un véhicule",
        variant: "error",
      })
      return
    }

    if (isBookingForSomeoneElse && (!otherPersonInfo.first_name || !otherPersonInfo.last_name || !otherPersonInfo.phone || !otherPersonInfo.email || !otherPersonInfo.brand || !otherPersonInfo.model || !otherPersonInfo.license_plate)) {
      showElegantToast({
        title: "Informations incomplètes",
        message: "Veuillez remplir toutes les informations de la personne",
        variant: "error",
      })
      return
    }

    setLoading(true)

    try {
      // Validation de la date
      if (!selectedDate || !(selectedDate instanceof Date) || isNaN(selectedDate.getTime())) {
        throw new Error("Date invalide")
      }

      const startTime = new Date(selectedDate)
      // Utiliser selectedQuarterHour si disponible, sinon selectedTime
      const timeToUse = selectedQuarterHour || selectedTime
      const [hours, minutes] = timeToUse.split(":")
      startTime.setHours(parseInt(hours), parseInt(minutes), 0, 0)

      const endTime = new Date(startTime)
      endTime.setHours(endTime.getHours() + 1) // 1 hour default

      // Construire les notes complètes
      let fullNotes = notes || ""
      
      // Ajouter les options supplémentaires
      const optionNotes: string[] = []
      if (additionalOptions.courtesyVehicle) {
        optionNotes.push("🚙 Véhicule de courtoisie demandé")
      }
      if (additionalOptions.homePickup) {
        optionNotes.push("🏠 Prise à domicile / livraison demandée")
      }
      if (additionalOptions.expressBooking) {
        optionNotes.push("🕓 Réservation express (urgence 24h)")
      }
      if (optionNotes.length > 0) {
        fullNotes = (fullNotes ? fullNotes + "\n\n" : "") + optionNotes.join("\n")
      }

      // Si service "autre", ajouter la description
      if (selectedService === "autre" && otherServiceDescription) {
        fullNotes = (fullNotes ? fullNotes + "\n\n" : "") + `Description du problème:\n${otherServiceDescription}`
      }

      // Upload des fichiers si service "autre" et fichiers présents
      const uploadedFileUrls: string[] = []
      if (selectedService === "autre" && otherServiceFiles.length > 0) {
        for (const file of otherServiceFiles) {
          try {
            const fileExt = file.name.split(".").pop()
            const fileName = `${user!.id}/appointments/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from("diagnostics")
              .upload(fileName, file)

            if (!uploadError && uploadData) {
              const { data: urlData } = supabase.storage
                .from("diagnostics")
                .getPublicUrl(fileName)
              if (urlData?.publicUrl) {
                uploadedFileUrls.push(urlData.publicUrl)
              }
            }
          } catch (fileError) {
            console.error("Error uploading file:", fileError)
          }
        }
      }

      // Utiliser le label du service ou l'ID
      const serviceTypeToSave = selectedServiceLabel || selectedService

      // Si réservation pour quelqu'un d'autre, créer un véhicule temporaire ou mettre les infos dans les notes
      let vehicleIdToUse: string | null = null
      
      if (isBookingForSomeoneElse) {
        // Créer un véhicule temporaire pour cette réservation
        // Vérifier d'abord si un véhicule avec cette plaque existe déjà pour cet utilisateur
        const { data: existingVehicle } = await supabase
          .from("vehicles")
          .select("id")
          .eq("flynesis_user_id", user!.id)
          .eq("license_plate", otherPersonInfo.license_plate)
          .maybeSingle()

        if (existingVehicle) {
          // Utiliser le véhicule existant
          vehicleIdToUse = existingVehicle.id
        } else {
          // Créer un nouveau véhicule
          const { data: tempVehicle, error: vehicleError } = await supabase
            .from("vehicles")
            .insert({
              flynesis_user_id: user!.id,
              brand: otherPersonInfo.brand,
              model: otherPersonInfo.model,
              license_plate: otherPersonInfo.license_plate,
              year: otherPersonInfo.year ? parseInt(otherPersonInfo.year) : null,
              fuel_type: otherPersonInfo.fuel_type || null,
            })
            .select()
            .single()

          if (vehicleError) {
            console.error("Error creating temporary vehicle:", vehicleError)
            throw new Error(`Erreur lors de la création du véhicule: ${vehicleError.message}`)
          }

          if (tempVehicle) {
            vehicleIdToUse = tempVehicle.id
          }
        }

        // Ajouter les infos de la personne dans les notes
        const otherPersonNotes = `\n\nRéservation pour:\n${otherPersonInfo.first_name} ${otherPersonInfo.last_name}\nEmail: ${otherPersonInfo.email}\nTéléphone: ${otherPersonInfo.phone}`
        fullNotes = (fullNotes ? fullNotes : "") + otherPersonNotes
      } else {
        vehicleIdToUse = selectedVehicle!.id
      }

      const { data: appointmentData, error } = await supabase.from("appointments").insert({
        flynesis_user_id: user!.id, // La contrainte FK référence auth.users(id), pas fly_accounts(id)
        garage_id: selectedGarage.id,
        service_type: selectedServiceLabel,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        vehicle_id: vehicleIdToUse,
        status: "pending",
        notes: fullNotes,
      }).select().single()

      if (error) {
        throw error
      }
      
      if (!appointmentData) {
        throw new Error("Impossible de créer le rendez-vous")
      }


      // Vérification immédiate que la réservation existe
      const { data: verifyData, error: verifyError } = await supabase
        .from("appointments")
        .select("id, garage_id, status, start_time")
        .eq("id", appointmentData.id)
        .single()

      if (verifyError || !verifyData) {
        // Erreur de vérification, mais on continue quand même
      }

      // Rediriger vers la page de confirmation avec l'ID du rendez-vous
      router.push(`/reservation/confirmation?id=${appointmentData.id}`)
    } catch (error: any) {
      showElegantToast({
        title: "Erreur",
        message: error.message || "Erreur lors de la création du rendez-vous",
        variant: "error",
      })
    } finally {
      setLoading(false)
    }
  }

  // Générer les créneaux disponibles pour la date sélectionnée
  // Fonction utilitaire pour vérifier si une heure est passée
  const isTimePast = (timeSlot: string): boolean => {
    if (!selectedDate) return false
    
    // Vérifier si la date sélectionnée est aujourd'hui
    const today = new Date()
    const selected = new Date(selectedDate)
    
    // Comparer les dates (année, mois, jour)
    const isToday = 
      today.getFullYear() === selected.getFullYear() &&
      today.getMonth() === selected.getMonth() &&
      today.getDate() === selected.getDate()
    
    if (!isToday) return false // Si ce n'est pas aujourd'hui, l'heure n'est pas passée
    
    // Comparer l'heure actuelle avec le créneau
    const [hours, minutes] = timeSlot.split(":").map(Number)
    const now = new Date()
    const slotTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes)
    
    return now >= slotTime
  }

  const getAvailableTimeSlots = () => {
    if (!selectedDate || !selectedGarage) {
      const morningSlots = ["08:00", "09:00", "10:00", "11:00", "12:00"]
      const afternoonSlots = ["13:00", "14:00", "15:00", "16:00", "17:00", "18:00"]
      return [...morningSlots, ...afternoonSlots]
    }

    // Récupérer le jour de la semaine (0 = Dimanche, 1 = Lundi, ..., 6 = Samedi)
    const dayOfWeek = selectedDate.getDay()
    const dayOpeningHours = openingHours[dayOfWeek]


    // Récupérer les créneaux disponibles depuis carslink_garage_booking_slots
    const bookingSlotsKey = `${selectedGarage.id}_${dayOfWeek}`
    const availableBookingSlots = bookingSlots[bookingSlotsKey]


    // Si le garage est fermé ce jour (selon opening_hours avec is_open = false)
    if (dayOpeningHours && dayOpeningHours.is_open === false) {
      return []
    }

    // Si pas d'horaires ET pas de créneaux chargés, le jour est probablement fermé
    // Si on a déjà chargé des données pour d'autres jours mais pas celui-ci, c'est fermé
    if (dayOpeningHours === undefined && availableBookingSlots === undefined) {
      const hasAnyOpeningHours = Object.keys(openingHours).length > 0
      const hasAnyBookingSlots = Object.keys(bookingSlots).length > 0
      
      // Si on a déjà chargé des données pour d'autres jours, ce jour est fermé
      if (hasAnyOpeningHours || hasAnyBookingSlots) {
        return []
      }
      
      // Sinon, les données ne sont peut-être pas encore chargées
      return []
    }

    // Si des créneaux spécifiques sont définis dans booking_slots, les utiliser
    if (availableBookingSlots && availableBookingSlots.size > 0) {
      const slotsArray = Array.from(availableBookingSlots)
        .filter(slot => {
          // Filtrer les créneaux déjà réservés
          const isBooked = bookedSlots.has(slot)
          if (isBooked) {
          }
          return !isBooked
        })
        .filter(slot => {
          // Ne garder que les heures complètes (XX:00) pour l'affichage initial
          const minute = slot.substring(3, 5)
          return minute === "00"
        })
        .filter(slot => {
          // Filtrer les heures passées si la date sélectionnée est aujourd'hui
          const isPast = isTimePast(slot)
          if (isPast) {
          }
          return !isPast
        })
        .sort()
      
      return slotsArray
    }

    // Fallback : utiliser les horaires d'ouverture si pas de créneaux spécifiques
    if (!dayOpeningHours) {
      return []
    }

    const slots: string[] = []
    const startHour = dayOpeningHours?.open_time ? parseInt(dayOpeningHours.open_time.split(":")[0]) : 8
    const endHour = dayOpeningHours?.close_time ? parseInt(dayOpeningHours.close_time.split(":")[0]) : 18
    const startMinute = dayOpeningHours?.open_time ? parseInt(dayOpeningHours.open_time.split(":")[1]) : 0
    const endMinute = dayOpeningHours?.close_time ? parseInt(dayOpeningHours.close_time.split(":")[1]) : 0

    const lunchStart = dayOpeningHours?.lunch_break_start ? dayOpeningHours.lunch_break_start : null
    const lunchEnd = dayOpeningHours?.lunch_break_end ? dayOpeningHours.lunch_break_end : null


    for (let hour = startHour; hour <= endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        // Ignorer les créneaux avant l'heure d'ouverture
        if (hour === startHour && minute < startMinute) continue
        
        // Ignorer les créneaux après l'heure de fermeture
        if (hour === endHour && minute > endMinute) break

        const timeSlot = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`
        
        // Ignorer les créneaux pendant la pause déjeuner
        if (lunchStart && lunchEnd) {
          const [lunchStartHour, lunchStartMin] = lunchStart.split(":").map(Number)
          const [lunchEndHour, lunchEndMin] = lunchEnd.split(":").map(Number)
          
          const slotTime = hour * 60 + minute
          const lunchStartTime = lunchStartHour * 60 + lunchStartMin
          const lunchEndTime = lunchEndHour * 60 + lunchEndMin
          
          if (slotTime >= lunchStartTime && slotTime < lunchEndTime) {
            continue
          }
        }

        // Ignorer les créneaux déjà réservés (heure complète seulement pour l'affichage initial)
        // Et ignorer les heures passées si la date sélectionnée est aujourd'hui
        if (minute === 0 && !bookedSlots.has(timeSlot) && !isTimePast(timeSlot)) {
          slots.push(timeSlot)
        }
      }
    }

    return slots.length > 0 ? slots : []
  }

  // Détecter l'intervalle minimal entre les créneaux pour le jour sélectionné
  const getSlotInterval = (): number => {
    if (!selectedDate || !selectedGarage) return 15 // Par défaut 15 minutes
    
    const dayOfWeek = selectedDate.getDay()
    const bookingSlotsKey = `${selectedGarage.id}_${dayOfWeek}`
    const availableBookingSlots = bookingSlots[bookingSlotsKey]
    
    // Si pas de créneaux spécifiques, utiliser 15 minutes par défaut
    if (!availableBookingSlots || availableBookingSlots.size === 0) {
      return 15
    }
    
    // Convertir les créneaux en minutes pour calculer l'intervalle
    const slotsArray = Array.from(availableBookingSlots).sort()
    if (slotsArray.length < 2) {
      return 60 // Si un seul créneau, on considère que c'est toutes les heures
    }
    
    // Calculer les intervalles entre créneaux consécutifs
    const intervals: number[] = []
    for (let i = 1; i < slotsArray.length; i++) {
      const prev = slotsArray[i - 1].split(":")
      const curr = slotsArray[i].split(":")
      const prevMinutes = parseInt(prev[0]) * 60 + parseInt(prev[1])
      const currMinutes = parseInt(curr[0]) * 60 + parseInt(curr[1])
      const interval = currMinutes - prevMinutes
      
      // Ne garder que les intervalles positifs et dans la même heure ou heure suivante
      if (interval > 0 && interval <= 60) {
        intervals.push(interval)
      }
    }
    
    if (intervals.length === 0) return 60
    
    // Retourner le plus petit intervalle (15, 30 ou 60)
    const minInterval = Math.min(...intervals)
    
    // Arrondir à 15, 30 ou 60
    if (minInterval <= 15) return 15
    if (minInterval <= 30) return 30
    return 60
  }

  // Générer les sous-créneaux selon l'intervalle du garage
  const getQuarterHourSlots = (hour: string) => {
    if (!selectedDate || !selectedGarage) {
      const [hours] = hour.split(":")
      return [`${hours}:00`, `${hours}:15`, `${hours}:30`, `${hours}:45`]
    }

    const [hours] = hour.split(":")
    const dayOfWeek = selectedDate.getDay()
    const interval = getSlotInterval()
    
    // Si l'intervalle est de 60 minutes, pas de sous-créneaux
    if (interval === 60) {
      return []
    }
    
    // Vérifier les créneaux disponibles dans booking_slots pour ce jour/heure
    const bookingSlotsKey = `${selectedGarage.id}_${dayOfWeek}`
    const availableBookingSlots = bookingSlots[bookingSlotsKey]
    
    // Générer les créneaux selon l'intervalle
    let allSlots: string[] = []
    if (interval === 30) {
      // Créneaux toutes les 30 minutes : 00 et 30
      allSlots = [`${hours}:00`, `${hours}:30`]
    } else if (interval === 15) {
      // Créneaux toutes les 15 minutes : 00, 15, 30, 45
      allSlots = [`${hours}:00`, `${hours}:15`, `${hours}:30`, `${hours}:45`]
    } else {
      // Par défaut, 15 minutes
      allSlots = [`${hours}:00`, `${hours}:15`, `${hours}:30`, `${hours}:45`]
    }
    
    // Filtrer selon booking_slots si disponibles, sinon filtrer seulement les réservés
    return allSlots.filter(slot => {
      // Si des créneaux spécifiques sont définis, vérifier qu'ils sont disponibles
      if (availableBookingSlots && availableBookingSlots.size > 0) {
        if (!availableBookingSlots.has(slot)) {
          return false
        }
      }
      // Exclure les créneaux déjà réservés
      const isBooked = bookedSlots.has(slot)
      if (isBooked) {
        return false
      }
      // Exclure les heures passées si la date sélectionnée est aujourd'hui
      const isPast = isTimePast(slot)
      if (isPast) {
        return false
      }
      return true
    })
  }

  // Gérer le clic sur un sous-créneau (15/30 minutes)
  const handleQuarterHourClick = (quarterTime: string) => {
    // Empêcher la sélection d'heures passées
    if (isTimePast(quarterTime)) {
      showElegantToast({
        title: "Heure passée",
        message: "Vous ne pouvez pas réserver un créneau dans le passé",
        variant: "error",
      })
      return
    }
    setSelectedQuarterHour(quarterTime)
  }

  // Gérer le clic sur une heure (sélection/désélection)
  const handleTimeClick = (time: string) => {
    // Empêcher la sélection d'heures passées
    if (isTimePast(time)) {
      showElegantToast({
        title: "Heure passée",
        message: "Vous ne pouvez pas réserver un créneau dans le passé",
        variant: "error",
      })
      return
    }

    if (selectedTime === time) {
      // Désélectionner si déjà sélectionné
      setSelectedTime("")
      setSelectedQuarterHour("")
    } else {
      // Sélectionner la nouvelle heure
      setSelectedTime(time)
      
      // Si l'intervalle est de 60 minutes, sélectionner directement l'heure complète
      const interval = getSlotInterval()
      if (interval === 60) {
        setSelectedQuarterHour(time) // Sélectionner directement l'heure complète
      } else {
        // Sinon, sélectionner le premier sous-créneau disponible
        const subSlots = getQuarterHourSlots(time)
        if (subSlots.length > 0) {
          setSelectedQuarterHour(subSlots[0])
        } else {
          setSelectedQuarterHour(`${time.split(":")[0]}:00`) // Fallback
        }
      }
    }
  }

  // Fonctions pour le calendrier mensuel
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay() // 0 = Dimanche, 1 = Lundi, etc.
    
    const days: (Date | null)[] = []
    
    // Récupérer les derniers jours du mois précédent pour compléter la première semaine
    // Le calendrier commence par Dimanche (0), donc si le premier jour est un samedi (6), on ajoute 6 jours
    const prevMonthLastDay = new Date(year, month, 0).getDate()
    const daysFromPrevMonth = startingDayOfWeek // 0 = Dimanche, donc on ajoute 0 jours. 6 = Samedi, donc on ajoute 6 jours
    
    for (let i = daysFromPrevMonth; i >= 1; i--) {
      days.push(new Date(year, month - 1, prevMonthLastDay - i + 1))
    }
    
    // Ajouter les jours du mois actuel
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day))
    }
    
    // Ajouter les premiers jours du mois suivant pour compléter la grille (6 semaines = 42 jours)
    const totalCells = days.length
    const remainingCells = 42 - totalCells
    for (let day = 1; day <= remainingCells; day++) {
      days.push(new Date(year, month + 1, day))
    }
    
    return days
  }

  const isDateSelectable = (date: Date | null) => {
    if (!date) return false
    
    // Normaliser les dates pour comparer uniquement les jours (sans heures/minutes/secondes)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const dateToCheck = new Date(date)
    dateToCheck.setHours(0, 0, 0, 0)
    
    const maxDate = new Date()
    maxDate.setDate(today.getDate() + 90) // 3 mois à l'avance
    maxDate.setHours(23, 59, 59, 999)
    
    // Vérifier si la date est dans le passé (strictement avant aujourd'hui)
    if (dateToCheck < today) {
      return false
    }
    
    // Vérifier si la date est trop loin dans le futur (après 3 mois)
    if (dateToCheck > maxDate) {
      return false
    }
    
    // Si un garage est sélectionné, vérifier s'il est ouvert ce jour
    if (selectedGarage) {
      const dayOfWeek = date.getDay()
      const dayOpeningHours = openingHours[dayOfWeek]
      const bookingSlotsKey = `${selectedGarage.id}_${dayOfWeek}`
      const availableSlots = bookingSlots[bookingSlotsKey]
      const hasAnyBookingSlots = Object.keys(bookingSlots).length > 0
      
      // PRIORITÉ 1: Si les horaires sont définis et que le garage est fermé, la date n'est pas sélectionnable
      if (dayOpeningHours && dayOpeningHours.is_open === false) {
        return false
      }

      // PRIORITÉ 2: Si booking_slots a été chargé pour ce garage, vérifier que ce jour a des créneaux
      // Vérifier si on a des booking_slots pour CE garage spécifique (pas juste globalement)
      const garageBookingSlotsKeys = Object.keys(bookingSlots).filter(key => key.startsWith(`${selectedGarage.id}_`))
      const hasBookingSlotsForThisGarage = garageBookingSlotsKeys.length > 0
      
      if (hasBookingSlotsForThisGarage) {
        // Si on a des créneaux pour ce garage mais pas pour ce jour, c'est fermé
        if (availableSlots === undefined) {
          return false
        }
        // Si créneaux existent mais sont vides, c'est fermé
        if (availableSlots.size === 0) {
          return false
        }
      }

      // PRIORITÉ 3: Vérifier aussi via isDayClosed (double vérification)
      if (isDayClosed(date)) {
        return false
      }
    }
    
    return true
  }
  
  // Vérifier si un jour est fermé ou sans créneaux disponibles
  const isDayClosed = (date: Date | null) => {
    if (!date) return false
    
    // Si pas de garage sélectionné, ne pas considérer comme fermé (sauf si passé)
    if (!selectedGarage) {
      return false
    }
    
    const dayOfWeek = date.getDay()
    const dayOpeningHours = openingHours[dayOfWeek]
    const bookingSlotsKey = `${selectedGarage.id}_${dayOfWeek}`
    const availableSlots = bookingSlots[bookingSlotsKey]
    
    // PRIORITÉ 1: Si fermé selon opening_hours (is_open = false), c'est fermé
    if (dayOpeningHours && dayOpeningHours.is_open === false) {
      return true
    }

    // PRIORITÉ 2: Si booking_slots a été chargé pour CE garage, vérifier que ce jour a des créneaux
    const garageBookingSlotsKeys = Object.keys(bookingSlots).filter(key => key.startsWith(`${selectedGarage.id}_`))
    const hasBookingSlotsForThisGarage = garageBookingSlotsKeys.length > 0
    
    if (hasBookingSlotsForThisGarage) {
      // Si on a des créneaux pour ce garage mais pas pour ce jour, c'est fermé
      if (availableSlots === undefined) {
        return true
      }
      // Si créneaux existent mais sont vides, c'est fermé
      if (availableSlots.size === 0) {
        return true
      }
    }

    // PRIORITÉ 3: Si pas d'horaires ET pas de créneaux chargés
    if (dayOpeningHours === undefined && availableSlots === undefined) {
      // Si on a déjà chargé les données pour d'autres jours mais pas celui-ci, c'est probablement fermé
      const hasAnyOpeningHours = Object.keys(openingHours).length > 0
      // Si on a des données pour d'autres jours mais pas celui-ci, c'est probablement fermé
      if (hasAnyOpeningHours || hasBookingSlotsForThisGarage) {
        return true
      }
      // Sinon, on attend encore le chargement
      return false
    }
    
    return false
  }

  const isSameDay = (date1: Date | null, date2: Date | null) => {
    if (!date1 || !date2) return false
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    )
  }

  const isToday = (date: Date | null) => {
    if (!date) return false
    const today = new Date()
    return isSameDay(date, today)
  }

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  }

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
  }

  const getMonthYearString = (date: Date) => {
    return date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Chargement...</div>
      </div>
    )
  }

  if (!user) return null

  return (
    <>
      <div className="fixed inset-0 w-full h-full overflow-y-auto bg-gradient-to-br from-blue-50/40 via-white to-purple-50/20 pb-32 sm:pb-40 safe-area-top safe-area-bottom">
        {/* Mobile Container avec effet Liquid Glass */}
        <div className="w-full max-w-7xl mx-auto bg-white/70 backdrop-blur-2xl pb-32 sm:pb-40">
          {/* Header avec verre givré - Responsive */}
          <div className="px-4 sm:px-6 py-5 sm:py-6 bg-white/40 backdrop-blur-xl border-b border-white/20 sticky top-0 z-10">
            <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.back()}
                className="h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0"
              >
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl sm:text-2xl font-light text-gray-900 truncate">Nouveau rendez-vous</h1>
              </div>
            </div>
          </div>

          {/* Contenu - Responsive */}
          <div className="px-4 sm:px-6 py-5 sm:py-6 bg-white/30 backdrop-blur-sm">
            <Card className="bg-white/60 backdrop-blur-xl border border-white/40 shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
          <CardHeader className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base sm:text-lg">Étape {currentStep} sur {getSteps().length}</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">{getSteps()[currentStep - 1].name}</CardDescription>
                </div>
              </div>
            </div>
            <Progress value={(currentStep / getSteps().length) * 100} className="mt-3 sm:mt-4" />
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pb-6 sm:pb-8">
            {/* Step 1: Service - Ne pas afficher si on a déjà un service depuis l'URL avec un garage */}
            {currentStep === 1 && !(isFromGarageDetails && searchParams.get("service") && selectedService) && (
              <div className="space-y-4 sm:space-y-6">
                {isFromGarageDetails && selectedGarage && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                    <p className="text-sm text-blue-900 font-medium">
                      ✅ Réservation pour : <span className="font-semibold">{selectedGarage.name}</span>
                    </p>
                  </div>
                )}
                <div>
                  <h3 className="font-semibold mb-2 text-base sm:text-lg text-gray-900">Sélectionnez un service</h3>
                  <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
                    Choisissez le type de service dont vous avez besoin
                    {isFromGarageDetails && loadingServicePrices && (
                      <span className="ml-2 text-blue-600 animate-pulse">(Chargement des prix...)</span>
                    )}
                  </p>
                </div>
                <ServiceSelector
                  selectedService={selectedService}
                  onSelectService={(serviceId, serviceLabel) => {
                    handleServiceSelect(serviceId, serviceLabel)
                  }}
                  additionalOptions={additionalOptions}
                  onAdditionalOptionsChange={(options) => setAdditionalOptions((prev) => ({ ...prev, ...options }))}
                  servicePrices={isFromGarageDetails ? servicePrices : undefined}
                  isFromGarageDetails={isFromGarageDetails}
                />
              </div>
            )}

            {/* Step 2: Garage (seulement si pas depuis la page de détails) OU Date + Créneaux (si depuis la page de détails) */}
            {currentStep === 2 && isFromGarageDetails ? (
              // Si on vient de la page de détails, afficher le calendrier complet avec sélection des créneaux
              <div className="space-y-4 sm:space-y-6">
                <div>
                  <h3 className="font-light mb-2 text-lg sm:text-xl text-gray-900">Choisissez votre date</h3>
                  <p className="text-xs sm:text-sm font-light text-gray-500 mb-3">Sélectionnez le jour de votre rendez-vous</p>
                  
                  {/* Légende discrète */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] sm:text-xs text-gray-500 mb-4 pb-3 border-b border-gray-200/50">
                    <div className="flex items-center gap-1.5">
                      <div className="h-5 w-5 rounded-full bg-gradient-to-br from-indigo-100 to-blue-100 border-2 border-indigo-500 relative flex items-center justify-center">
                      </div>
                      <span>Aujourd'hui</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="h-5 w-5 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 border-2 border-white relative flex items-center justify-center">
                      </div>
                      <span>Sélectionné</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="h-5 w-5 rounded-lg bg-gradient-to-br from-red-100/90 via-red-50/70 to-red-100/90 border-2 border-red-300/60 relative flex items-center justify-center opacity-60">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="absolute w-full h-0.5 bg-red-400/80 transform rotate-45" />
                        </div>
                      </div>
                      <span>Fermé</span>
                    </div>
                  </div>
                </div>
                
                {/* Calendrier mensuel - Style Figma */}
                <div className="relative">
                  <div className="bg-white/30 backdrop-blur-2xl rounded-2xl sm:rounded-3xl border border-white/20 shadow-2xl p-4 sm:p-6">
                    {/* En-tête avec navigation - Style Figma */}
                    <div className="flex items-center justify-between mb-4 sm:mb-6">
                      <button
                        onClick={goToPreviousMonth}
                        className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg flex items-center justify-center hover:bg-white/30 transition-all duration-200 text-gray-700"
                      >
                        <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </button>
                      
                      <h4 className="text-sm sm:text-base font-semibold text-gray-900 capitalize">
                        {getMonthYearString(currentMonth)}
                      </h4>
                      
                      <button
                        onClick={goToNextMonth}
                        className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg flex items-center justify-center hover:bg-white/30 transition-all duration-200 text-gray-700"
                      >
                        <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </button>
                    </div>

                    {/* Jours de la semaine - Style compact Figma */}
                    <div className="grid grid-cols-7 gap-0.5 mb-3">
                      {["Di", "Lu", "Ma", "Me", "Je", "Ve", "Sa"].map((day) => (
                        <div
                          key={day}
                          className="h-8 flex items-center justify-center text-xs font-medium text-gray-600"
                        >
                          {day}
                        </div>
                      ))}
                    </div>

                    {/* Grille des dates - Style Figma */}
                    <div className="grid grid-cols-7 gap-1">
                      {getDaysInMonth(currentMonth).map((date, index) => {
                        if (!date) {
                          return (<div key={index} className="h-10" />)
                        }
                        
                        const isSelectable = isDateSelectable(date)
                        const isSelected = date && selectedDate && isSameDay(date, selectedDate)
                        const isTodayDate = isToday(date)
                        const isOtherMonth = date.getMonth() !== currentMonth.getMonth() || 
                                            date.getFullYear() !== currentMonth.getFullYear()
                        const isClosed = isDayClosed(date)

                        return (
                          <button
                            key={index}
                            disabled={!isSelectable || isClosed}
                            onClick={() => {
                              if (date && isSelectable && !isClosed) {
                                setSelectedDate(date)
                                setSelectedTime("")
                                setSelectedQuarterHour("")
                              }
                            }}
                            className={`
                              h-9 w-9 sm:h-10 sm:w-10 transition-all duration-200 relative flex items-center justify-center text-xs sm:text-sm font-medium
                              ${!isSelectable || isClosed
                                ? "cursor-not-allowed opacity-40 text-gray-400 rounded-lg"
                                : "cursor-pointer hover:bg-white/30"
                              }
                              ${isSelected
                                ? "bg-gradient-to-br from-blue-500 to-purple-500 text-white font-bold border-3 border-white shadow-xl shadow-blue-500/50 scale-110 z-10 rounded-xl"
                                : isClosed
                                ? "bg-gradient-to-br from-red-100/90 via-red-50/70 to-red-100/90 text-red-600/80 font-medium border-2 border-red-300/60 relative overflow-hidden shadow-sm rounded-lg"
                                : isTodayDate && !isSelected
                                ? "bg-gradient-to-br from-indigo-100 to-blue-100 text-indigo-900 font-extrabold border-3 border-indigo-500 shadow-lg ring-3 ring-indigo-400/40 rounded-full"
                                : isOtherMonth
                                ? "text-gray-400 rounded-lg"
                                : "text-gray-700 rounded-lg"
                              }
                            `}
                          >
                            <span className="relative z-10">{date.getDate()}</span>
                            
                            {/* Design élégant pour les jours fermés */}
                            {isClosed && !isSelected && (
                              <>
                                {/* Ligne diagonale élégante */}
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="absolute w-full h-0.5 bg-red-400/80 transform rotate-45 origin-center" />
                                </div>
                                {/* Point indicatif discret */}
                                <div className="absolute top-1 right-1 h-1.5 w-1.5 bg-red-500 rounded-full" />
                                {/* Effet de brillance/ombre subtil */}
                                <div className="absolute inset-0 bg-gradient-to-br from-red-200/20 to-transparent rounded-lg pointer-events-none" />
                              </>
                            )}
                            
                            {/* Indicateur "Aujourd'hui" - Point visible sur la bordure en haut à droite + contour renforcé */}
                            {isTodayDate && !isSelected && !isClosed && (
                              <>
                                {/* Point visible sur la bordure en haut à droite */}
                                <div className="absolute top-0 right-0 h-2.5 w-2.5 bg-indigo-600 rounded-full shadow-md z-10 border border-white transform translate-x-[3px] -translate-y-[3px]" />
                                {/* Ligne de contour supplémentaire pour plus de visibilité */}
                                <div className="absolute inset-0 rounded-full border-2 border-indigo-500/60" />
                              </>
                            )}
                            
                            {/* Indicateur pour jour sélectionné */}
                            {isSelected && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-xl"
                              />
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {/* Sélection d'heure - Style moderne avec gradient */}
                {selectedDate && selectedDate instanceof Date && !isNaN(selectedDate.getTime()) && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <label className="text-sm font-medium mb-4 block text-gray-700 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>Heure disponible</span>
                    </label>
                    
                    {/* Séparateur visuel */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-200 to-gray-200" />
                      <span className="text-xs font-light text-gray-400">
                        {selectedDate.toLocaleDateString("fr-FR", { 
                          weekday: "long", 
                          day: "numeric",
                          month: "long"
                        })}
                      </span>
                      <div className="flex-1 h-px bg-gradient-to-l from-transparent via-gray-200 to-gray-200" />
                    </div>

                    {getAvailableTimeSlots().length === 0 ? (
                      <div className="text-center py-8 p-4 rounded-xl bg-red-50/50 border border-red-200/50">
                        <Clock className="h-8 w-8 text-red-400 mx-auto mb-2" />
                        <p className="text-sm font-medium text-red-700 mb-1">Aucun créneau disponible</p>
                        <p className="text-xs text-red-600">Ce jour est fermé ou tous les créneaux sont déjà réservés</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-3">
                        {getAvailableTimeSlots().map((time, index) => {
                        const [hours, minutes] = time.split(":")
                        const isSelected = selectedTime === time
                        const isMorning = parseInt(hours) < 13
                        
                        return (
                          <motion.button
                            key={time}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.02 }}
                            onClick={() => handleTimeClick(time)}
                            className={`relative group h-14 rounded-xl border-2 transition-all duration-300 overflow-hidden ${
                              isSelected
                                ? "border-blue-500 bg-gradient-to-br from-blue-500 via-blue-600 to-purple-500 text-white shadow-lg shadow-blue-500/40 scale-105"
                                : "border-gray-200/60 bg-white/70 backdrop-blur-sm hover:border-blue-300/80 hover:bg-blue-50/50 hover:shadow-md hover:scale-[1.02]"
                            }`}
                          >
                            {/* Effet de brillance */}
                            {!isSelected && (
                              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 via-purple-500/0 to-blue-500/0 group-hover:from-blue-500/10 group-hover:via-purple-500/10 group-hover:to-blue-500/10 transition-all duration-300 rounded-xl" />
                            )}
                            
                            {/* Indicateur matin/après-midi */}
                            {!isSelected && (
                              <div className={`absolute top-1 right-1.5 h-1.5 w-1.5 rounded-full ${
                                isMorning ? "bg-orange-400" : "bg-blue-400"
                              } opacity-60`} />
                            )}

                            <div className="relative z-10 flex items-center justify-center h-full">
                              <span className={`text-base font-semibold ${
                                isSelected ? "text-white" : "text-gray-900"
                              }`}>
                                {time}
                              </span>
                            </div>
                            
                            {/* Check icon when selected */}
                            {isSelected && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="absolute top-1 right-1"
                              >
                                <Check className="h-4 w-4 text-white" />
                              </motion.div>
                            )}
                          </motion.button>
                        )
                      })}
                      </div>
                    )}

                    {/* Sous-créneaux adaptatifs selon l'intervalle du garage */}
                    {selectedTime && getSlotInterval() !== 60 && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="mt-4"
                      >
                        <label className="text-sm font-medium mb-3 block text-gray-700 flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5" />
                          <span>Précision ({getSlotInterval() === 30 ? '30 min' : '15 min'})</span>
                        </label>
                        
                        <div className={`grid gap-2 ${getSlotInterval() === 30 ? 'grid-cols-2' : 'grid-cols-4'}`}>
                          {getQuarterHourSlots(selectedTime).map((quarterTime, index) => {
                            const isSelectedQuarter = selectedQuarterHour === quarterTime
                            
                            return (
                              <motion.button
                                key={quarterTime}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.05 }}
                                onClick={() => handleQuarterHourClick(quarterTime)}
                                className={`relative group h-12 rounded-lg border-2 transition-all duration-200 overflow-hidden ${
                                  isSelectedQuarter
                                    ? "border-blue-500 bg-gradient-to-br from-blue-500 to-purple-500 text-white shadow-md shadow-blue-500/30 scale-105"
                                    : "border-gray-200/60 bg-white/60 backdrop-blur-sm hover:border-blue-300/80 hover:bg-blue-50/40 hover:shadow-sm hover:scale-[1.02]"
                                }`}
                              >
                                <div className="relative z-10 flex items-center justify-center h-full">
                                  <span className={`text-sm font-semibold ${
                                    isSelectedQuarter ? "text-white" : "text-gray-700"
                                  }`}>
                                    {quarterTime.split(":")[1]}
                                  </span>
                                </div>
                                
                                {/* Check icon when selected */}
                                {isSelectedQuarter && (
                                  <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="absolute top-0.5 right-0.5"
                                  >
                                    <Check className="h-3 w-3 text-white" />
                                  </motion.div>
                                )}
                              </motion.button>
                            )
                          })}
                        </div>
                        
                        {/* Afficher l'heure complète sélectionnée */}
                        {selectedQuarterHour && (
                          <div className="mt-3 p-3 rounded-lg bg-blue-50/50 border border-blue-100/50 backdrop-blur-sm">
                            <p className="text-xs font-medium text-gray-700 text-center">
                              ⏰ {selectedTime.split(":")[0]}h{selectedQuarterHour?.split(":")[1] || "00"}
                            </p>
                          </div>
                        )}
                      </motion.div>
                    )}

                    {/* Note informative */}
                    <div className="mt-4 p-3 rounded-xl bg-blue-50/50 border border-blue-100/50 backdrop-blur-sm">
                      <p className="text-xs font-light text-gray-600 text-center">
                        💡 Les créneaux sont disponibles selon les horaires d'ouverture du garage
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Bouton continuer avec animation */}
                {selectedDate && selectedDate instanceof Date && !isNaN(selectedDate.getTime()) && selectedTime && 
                  (getSlotInterval() === 60 ? selectedQuarterHour === selectedTime : selectedQuarterHour) && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Button 
                      onClick={handleNext} 
                      className="w-full h-14 rounded-xl bg-gradient-to-r from-blue-600 via-blue-600 to-purple-600 hover:from-blue-700 hover:via-blue-700 hover:to-purple-700 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      <span>Confirmer le créneau</span>
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                    <p className="text-xs text-center text-gray-500 mt-2 font-light">
                      {selectedDate.toLocaleDateString("fr-FR", { 
                        weekday: "long", 
                        day: "numeric",
                        month: "long",
                        year: "numeric"
                      })}
                    </p>
                  </motion.div>
                )}
              </div>
            ) : currentStep === 2 && !isFromGarageDetails && (
              <div className="space-y-4 sm:space-y-6">
                <div>
                  <h3 className="font-semibold mb-2 text-base sm:text-lg text-gray-900">Choisissez un garage</h3>
                  {selectedGarage && searchParams.get("garage") && (
                    <p className="text-xs sm:text-sm text-blue-600 mb-3 sm:mb-4">
                      ✅ Garage pré-sélectionné : <span className="font-medium">{selectedGarage.name}</span>
                    </p>
                  )}
                </div>

                {/* Filtres de tri */}
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

                {(() => {
                  // S'assurer que le garage pré-sélectionné est dans la liste
                  let allGarages = selectedGarage && !garages.find(g => g.id === selectedGarage.id)
                    ? [selectedGarage, ...garages]
                    : garages

                  // Appliquer le tri selon les filtres sélectionnés (peuvent être combinés)
                  if (garageSortBy.size > 0) {
                    const sortMultiplier = garageSortOrder === 'asc' ? 1 : -1
                    
                    allGarages = [...allGarages].sort((a, b) => {
                      // Ordre de priorité : prix > distance > disponibilité
                      // Si plusieurs filtres sont actifs, on les applique dans cet ordre
                      
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
                          // Croissant = moins de jours → plus de jours
                          // Décroissant = plus de jours → moins de jours
                          return (availA - availB) * sortMultiplier
                        }
                      }
                      
                      return 0
                    })
                  }
                  
                  return allGarages.length > 0 ? (
                    <div className="space-y-4 sm:space-y-6">
                      {allGarages.map((garage) => (
                        <motion.div
                          key={garage.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4, delay: 0.1 }}
                          className="relative group cursor-pointer"
                          onClick={async () => {
                            setSelectedGarage(garage)
                            await loadOpeningHours(garage.id)
                            await loadBookingSlotsForGarage(garage.id)
                          }}
                          whileHover={{ y: -2, scale: 1.01 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/10 to-blue-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                          <div className={`relative bg-white/60 backdrop-blur-xl border-2 rounded-2xl p-4 sm:p-5 shadow-[0_4px_20px_rgba(0,0,0,0.08)] group-hover:shadow-[0_12px_40px_rgba(59,130,246,0.2)] transition-all duration-300 ${
                            selectedGarage?.id === garage.id 
                              ? "border-blue-500 bg-blue-50/50 ring-2 ring-blue-500 ring-offset-2" 
                              : "border-white/40 group-hover:border-blue-300/50"
                          }`}>
                            {/* Indicateur de sélection */}
                            {selectedGarage?.id === garage.id && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="absolute top-3 right-3 z-10"
                              >
                                <div className="h-6 w-6 sm:h-7 sm:w-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-lg">
                                  <Check className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                                </div>
                              </motion.div>
                            )}
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
                                        {getDistanceFromUser(garage) && <span>•</span>}
                                      </>
                                    )}
                                    {getDistanceFromUser(garage) && (
                                      <span className="text-blue-600 font-medium">
                                        {getDistanceFromUser(garage)}
                                      </span>
                                    )}
                                    {garageAvailabilityDays[garage.id] !== undefined && (
                                      <>
                                        {getDistanceFromUser(garage) && <span>•</span>}
                                        <span className="text-green-600 font-medium">
                                          {garageAvailabilityDays[garage.id]} jour{garageAvailabilityDays[garage.id] > 1 ? 's' : ''} disponible{garageAvailabilityDays[garage.id] > 1 ? 's' : ''}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>

                                {/* Bas : étoile + avis à gauche, prix à droite */}
                                <div className="flex items-center justify-between mt-3">
                                  <div className="flex items-center gap-1.5">
                                    <Star className="h-3.5 w-3.5 sm:h-4 sm:w-4 fill-gray-400 text-gray-400" />
                                    <span className="text-xs sm:text-sm font-medium text-gray-700">{garage.rating?.toFixed(1) || "0.0"}</span>
                                    <span className="text-xs text-gray-500">•</span>
                                    <span className="text-xs text-gray-500">{garageReviewsCount[garage.id] || 0} avis</span>
                                  </div>
                                  
                                  {/* Prix aligné à droite */}
                                  {(() => {
                                    const priceRange = garageServicePrices[garage.id]
                                    if (priceRange && priceRange.min > 0) {
                                      const priceText = priceRange.min === priceRange.max 
                                        ? `${priceRange.min.toFixed(0)}€`
                                        : `${priceRange.min.toFixed(0)}€ - ${priceRange.max.toFixed(0)}€`
                                      return (
                                        <div className="bg-green-50 border border-green-200 rounded-lg px-2.5 py-1">
                                          <span className="text-base sm:text-lg text-green-700 font-bold">{priceText}</span>
                                        </div>
                                      )
                                    }
                                    return null
                                  })()}
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 sm:py-12 text-gray-600">
                      <MapPin className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-sm sm:text-base">Aucun garage disponible</p>
                    </div>
                  )
                })()}
                {selectedGarage && (
                  <Button onClick={handleNext} className="w-full mt-4 sm:mt-6 h-11 sm:h-12 text-sm sm:text-base">
                    Continuer
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                )}
              </div>
            )}

            {/* Step 3: Calendrier amélioré (si pas depuis page détails) OU rien (si depuis page détails) */}
            {currentStep === 3 && !isFromGarageDetails && (
              <div className="space-y-4 sm:space-y-6">
                <div>
                  <h3 className="font-light mb-2 text-lg sm:text-xl text-gray-900">Choisissez votre date</h3>
                  <p className="text-xs sm:text-sm font-light text-gray-500 mb-3">Sélectionnez le jour de votre rendez-vous</p>
                  
                  {/* Légende discrète */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] sm:text-xs text-gray-500 mb-4 pb-3 border-b border-gray-200/50">
                    <div className="flex items-center gap-1.5">
                      <div className="h-5 w-5 rounded-full bg-gradient-to-br from-indigo-100 to-blue-100 border-2 border-indigo-500 relative flex items-center justify-center">
                      </div>
                      <span>Aujourd'hui</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="h-5 w-5 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 border-2 border-white relative flex items-center justify-center">
                      </div>
                      <span>Sélectionné</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="h-5 w-5 rounded-lg bg-gradient-to-br from-red-100/90 via-red-50/70 to-red-100/90 border-2 border-red-300/60 relative flex items-center justify-center opacity-60">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="absolute w-full h-0.5 bg-red-400/80 transform rotate-45" />
                        </div>
                      </div>
                      <span>Fermé</span>
                    </div>
                  </div>
                </div>
                
                {/* Calendrier mensuel - Style Figma */}
                <div className="relative">
                  <div className="bg-white/30 backdrop-blur-2xl rounded-2xl sm:rounded-3xl border border-white/20 shadow-2xl p-4 sm:p-6">
                    {/* En-tête avec navigation - Style Figma */}
                    <div className="flex items-center justify-between mb-4 sm:mb-6">
                      <button
                        onClick={goToPreviousMonth}
                        className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg flex items-center justify-center hover:bg-white/30 transition-all duration-200 text-gray-700"
                      >
                        <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </button>
                      
                      <h4 className="text-sm sm:text-base font-semibold text-gray-900 capitalize">
                        {getMonthYearString(currentMonth)}
                      </h4>
                      
                      <button
                        onClick={goToNextMonth}
                        className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg flex items-center justify-center hover:bg-white/30 transition-all duration-200 text-gray-700"
                      >
                        <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </button>
                    </div>

                    {/* Jours de la semaine - Style compact Figma */}
                    <div className="grid grid-cols-7 gap-0.5 mb-3">
                      {["Di", "Lu", "Ma", "Me", "Je", "Ve", "Sa"].map((day) => (
                        <div
                          key={day}
                          className="h-8 flex items-center justify-center text-xs font-medium text-gray-600"
                        >
                          {day}
                        </div>
                      ))}
                    </div>

                    {/* Grille des dates - Style Figma */}
                    <div className="grid grid-cols-7 gap-1">
                      {getDaysInMonth(currentMonth).map((date, index) => {
                        if (!date) {
                          return (<div key={index} className="h-10" />)
                        }
                        
                        const isSelectable = isDateSelectable(date)
                        const isSelected = date && selectedDate && isSameDay(date, selectedDate)
                        const isTodayDate = isToday(date)
                        const isOtherMonth = date.getMonth() !== currentMonth.getMonth() || 
                                            date.getFullYear() !== currentMonth.getFullYear()
                        const isClosed = isDayClosed(date)

                        return (
                          <button
                            key={index}
                            disabled={!isSelectable || isClosed}
                            onClick={() => {
                              if (date && isSelectable && !isClosed) {
                                setSelectedDate(date)
                                setSelectedTime("")
                                setSelectedQuarterHour("")
                              }
                            }}
                            className={`
                              h-9 w-9 sm:h-10 sm:w-10 transition-all duration-200 relative flex items-center justify-center text-xs sm:text-sm font-medium
                              ${!isSelectable || isClosed
                                ? "cursor-not-allowed opacity-40 text-gray-400 rounded-lg"
                                : "cursor-pointer hover:bg-white/30"
                              }
                              ${isSelected
                                ? "bg-gradient-to-br from-blue-500 to-purple-500 text-white font-bold border-3 border-white shadow-xl shadow-blue-500/50 scale-110 z-10 rounded-xl"
                                : isClosed
                                ? "bg-gradient-to-br from-red-100/90 via-red-50/70 to-red-100/90 text-red-600/80 font-medium border-2 border-red-300/60 relative overflow-hidden shadow-sm rounded-lg"
                                : isTodayDate && !isSelected
                                ? "bg-gradient-to-br from-indigo-100 to-blue-100 text-indigo-900 font-extrabold border-3 border-indigo-500 shadow-lg ring-3 ring-indigo-400/40 rounded-full"
                                : isOtherMonth
                                ? "text-gray-400 rounded-lg"
                                : "text-gray-700 rounded-lg"
                              }
                            `}
                          >
                            <span className="relative z-10">{date.getDate()}</span>
                            
                            {/* Design élégant pour les jours fermés */}
                            {isClosed && !isSelected && (
                              <>
                                {/* Ligne diagonale élégante */}
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="absolute w-full h-0.5 bg-red-400/80 transform rotate-45 origin-center" />
                                </div>
                                {/* Point indicatif discret */}
                                <div className="absolute top-1 right-1 h-1.5 w-1.5 bg-red-500 rounded-full" />
                                {/* Effet de brillance/ombre subtil */}
                                <div className="absolute inset-0 bg-gradient-to-br from-red-200/20 to-transparent rounded-lg pointer-events-none" />
                              </>
                            )}
                            
                            {/* Indicateur "Aujourd'hui" - Point visible sur la bordure en haut à droite + contour renforcé */}
                            {isTodayDate && !isSelected && !isClosed && (
                              <>
                                {/* Point visible sur la bordure en haut à droite */}
                                <div className="absolute top-0 right-0 h-2.5 w-2.5 bg-indigo-600 rounded-full shadow-md z-10 border border-white transform translate-x-[3px] -translate-y-[3px]" />
                                {/* Ligne de contour supplémentaire pour plus de visibilité */}
                                <div className="absolute inset-0 rounded-full border-2 border-indigo-500/60" />
                              </>
                            )}
                            
                            {/* Indicateur pour jour sélectionné */}
                            {isSelected && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-xl"
                              />
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {/* Sélection d'heure - Style moderne avec gradient */}
                {selectedDate && selectedDate instanceof Date && !isNaN(selectedDate.getTime()) && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <label className="text-sm font-medium mb-4 block text-gray-700 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>Heure disponible</span>
                    </label>
                    
                    {/* Séparateur visuel */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-200 to-gray-200" />
                      <span className="text-xs font-light text-gray-400">
                        {selectedDate.toLocaleDateString("fr-FR", { 
                          weekday: "long", 
                          day: "numeric",
                          month: "long"
                        })}
                      </span>
                      <div className="flex-1 h-px bg-gradient-to-l from-transparent via-gray-200 to-gray-200" />
                    </div>

                    {getAvailableTimeSlots().length === 0 ? (
                      <div className="text-center py-8 p-4 rounded-xl bg-red-50/50 border border-red-200/50">
                        <Clock className="h-8 w-8 text-red-400 mx-auto mb-2" />
                        <p className="text-sm font-medium text-red-700 mb-1">Aucun créneau disponible</p>
                        <p className="text-xs text-red-600">Ce jour est fermé ou tous les créneaux sont déjà réservés</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-3">
                        {getAvailableTimeSlots().map((time, index) => {
                        const [hours, minutes] = time.split(":")
                        const isSelected = selectedTime === time
                        const isMorning = parseInt(hours) < 13
                        
                        return (
                          <motion.button
                            key={time}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.02 }}
                            onClick={() => handleTimeClick(time)}
                            className={`relative group h-14 rounded-xl border-2 transition-all duration-300 overflow-hidden ${
                              isSelected
                                ? "border-blue-500 bg-gradient-to-br from-blue-500 via-blue-600 to-purple-500 text-white shadow-lg shadow-blue-500/40 scale-105"
                                : "border-gray-200/60 bg-white/70 backdrop-blur-sm hover:border-blue-300/80 hover:bg-blue-50/50 hover:shadow-md hover:scale-[1.02]"
                            }`}
                          >
                            {/* Effet de brillance */}
                            {!isSelected && (
                              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 via-purple-500/0 to-blue-500/0 group-hover:from-blue-500/10 group-hover:via-purple-500/10 group-hover:to-blue-500/10 transition-all duration-300 rounded-xl" />
                            )}
                            
                            {/* Indicateur matin/après-midi */}
                            {!isSelected && (
                              <div className={`absolute top-1 right-1.5 h-1.5 w-1.5 rounded-full ${
                                isMorning ? "bg-orange-400" : "bg-blue-400"
                              } opacity-60`} />
                            )}

                            <div className="relative z-10 flex items-center justify-center h-full">
                              <span className={`text-base font-semibold ${
                                isSelected ? "text-white" : "text-gray-900"
                              }`}>
                                {time}
                              </span>
                            </div>
                            
                            {/* Check icon when selected */}
                            {isSelected && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="absolute top-1 right-1"
                              >
                                <Check className="h-4 w-4 text-white" />
                              </motion.div>
                            )}
                          </motion.button>
                        )
                      })}
                      </div>
                    )}

                    {/* Sous-créneaux adaptatifs selon l'intervalle du garage */}
                    {selectedTime && getSlotInterval() !== 60 && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="mt-4"
                      >
                        <label className="text-sm font-medium mb-3 block text-gray-700 flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5" />
                          <span>Précision ({getSlotInterval() === 30 ? '30 min' : '15 min'})</span>
                        </label>
                        
                        <div className={`grid gap-2 ${getSlotInterval() === 30 ? 'grid-cols-2' : 'grid-cols-4'}`}>
                          {getQuarterHourSlots(selectedTime).map((quarterTime, index) => {
                            const isSelectedQuarter = selectedQuarterHour === quarterTime
                            
                            return (
                              <motion.button
                                key={quarterTime}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.05 }}
                                onClick={() => handleQuarterHourClick(quarterTime)}
                                className={`relative group h-12 rounded-lg border-2 transition-all duration-200 overflow-hidden ${
                                  isSelectedQuarter
                                    ? "border-blue-500 bg-gradient-to-br from-blue-500 to-purple-500 text-white shadow-md shadow-blue-500/30 scale-105"
                                    : "border-gray-200/60 bg-white/60 backdrop-blur-sm hover:border-blue-300/80 hover:bg-blue-50/40 hover:shadow-sm hover:scale-[1.02]"
                                }`}
                              >
                                <div className="relative z-10 flex items-center justify-center h-full">
                                  <span className={`text-sm font-semibold ${
                                    isSelectedQuarter ? "text-white" : "text-gray-700"
                                  }`}>
                                    {quarterTime.split(":")[1]}
                                  </span>
                                </div>
                                
                                {/* Check icon when selected */}
                                {isSelectedQuarter && (
                                  <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="absolute top-0.5 right-0.5"
                                  >
                                    <Check className="h-3 w-3 text-white" />
                                  </motion.div>
                                )}
                              </motion.button>
                            )
                          })}
                        </div>
                        
                        {/* Afficher l'heure complète sélectionnée */}
                        {selectedQuarterHour && (
                          <div className="mt-3 p-3 rounded-lg bg-blue-50/50 border border-blue-100/50 backdrop-blur-sm">
                            <p className="text-xs font-medium text-gray-700 text-center">
                              ⏰ {selectedTime.split(":")[0]}h{selectedQuarterHour?.split(":")[1] || "00"}
                            </p>
                          </div>
                        )}
                      </motion.div>
                    )}

                    {/* Note informative */}
                    <div className="mt-4 p-3 rounded-xl bg-blue-50/50 border border-blue-100/50 backdrop-blur-sm">
                      <p className="text-xs font-light text-gray-600 text-center">
                        💡 Les créneaux sont disponibles selon les horaires d'ouverture du garage
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Bouton continuer avec animation */}
                {selectedDate && selectedDate instanceof Date && !isNaN(selectedDate.getTime()) && selectedTime && 
                  (getSlotInterval() === 60 ? selectedQuarterHour === selectedTime : selectedQuarterHour) && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Button 
                      onClick={handleNext} 
                      className="w-full h-14 rounded-xl bg-gradient-to-r from-blue-600 via-blue-600 to-purple-600 hover:from-blue-700 hover:via-blue-700 hover:to-purple-700 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      <span>Confirmer le créneau</span>
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                    <p className="text-xs text-center text-gray-500 mt-2 font-light">
                      {selectedDate.toLocaleDateString("fr-FR", { 
                        weekday: "long", 
                        day: "numeric",
                        month: "long",
                        year: "numeric"
                      })}
                    </p>
                  </motion.div>
                )}
              </div>
            )}

            {/* Step 4: Profil/Véhicule (ou Step 3 si depuis page détails) */}
            {(currentStep === 4 && !isFromGarageDetails) || (currentStep === 3 && isFromGarageDetails) ? (
              <div className="space-y-4">
                <h3 className="font-light mb-4 text-lg">Informations de réservation</h3>

                {/* Option "Réserver pour quelqu'un d'autre" */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`relative overflow-hidden rounded-2xl border-2 transition-all duration-300 cursor-pointer ${
                    isBookingForSomeoneElse
                      ? "border-blue-400/60 bg-gradient-to-br from-blue-50/80 via-purple-50/60 to-blue-50/80 shadow-lg shadow-blue-500/20"
                      : "border-gray-200/60 bg-white/70 backdrop-blur-sm hover:border-blue-300/60 hover:bg-blue-50/30 hover:shadow-md"
                  }`}
                  onClick={() => {
                    setIsBookingForSomeoneElse(!isBookingForSomeoneElse)
                    if (isBookingForSomeoneElse) {
                      // Réinitialiser les infos de l'autre personne
                      setOtherPersonInfo({
                        first_name: "",
                        last_name: "",
                        phone: "",
                        email: "",
                        brand: "",
                        model: "",
                        license_plate: "",
                        year: "",
                        fuel_type: "",
                      })
                      // Re-sélectionner le premier véhicule de l'utilisateur
                      if (vehicles.length > 0) {
                        setSelectedVehicle(vehicles[0])
                      }
                    }
                  }}
                >
                  {/* Effet de brillance au hover */}
                  {!isBookingForSomeoneElse && (
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 via-purple-500/0 to-blue-500/0 group-hover:from-blue-500/5 group-hover:via-purple-500/5 group-hover:to-blue-500/5 transition-all duration-300 rounded-2xl" />
                  )}
                  
                  {/* Contenu */}
                  <div className="relative z-10 flex items-center space-x-3 p-5">
                    {/* Checkbox personnalisé élégant */}
                    <div className={`relative flex-shrink-0 h-6 w-6 rounded-lg border-2 transition-all duration-300 flex items-center justify-center ${
                      isBookingForSomeoneElse
                        ? "border-blue-500 bg-gradient-to-br from-blue-500 to-purple-500 shadow-md shadow-blue-500/30"
                        : "border-gray-300 bg-white"
                    }`}>
                      {isBookingForSomeoneElse && (
                        <motion.svg
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          className="h-4 w-4 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={3}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </motion.svg>
                      )}
                    </div>
                    
                    {/* Label avec icône */}
                    <div className="flex-1 flex items-center gap-2">
                      <UserPlus className={`h-5 w-5 transition-colors duration-300 ${
                        isBookingForSomeoneElse ? "text-blue-600" : "text-gray-500"
                      }`} />
                      <label 
                        htmlFor="booking-for-other" 
                        className={`text-sm font-medium cursor-pointer transition-colors duration-300 ${
                          isBookingForSomeoneElse ? "text-blue-700" : "text-gray-700"
                        }`}
                      >
                        Réserver pour quelqu'un d'autre
                      </label>
                    </div>
                    
                    {/* Input checkbox invisible (pour l'accessibilité) */}
                    <input
                      type="checkbox"
                      id="booking-for-other"
                      checked={isBookingForSomeoneElse}
                      onChange={() => {}}
                      className="sr-only"
                    />
                  </div>
                  
                  {/* Indicateur de sélection avec effet */}
                  {isBookingForSomeoneElse && (
                    <motion.div
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: 0.3 }}
                      className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500"
                    />
                  )}
                </motion.div>

                {!isBookingForSomeoneElse ? (
                  /* Profil de l'utilisateur connecté */
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl border-2 border-gray-200 bg-white/50">
                      <h4 className="font-light mb-3 text-base flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Vos informations
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="text-gray-500">Email:</span>{" "}
                          <span className="font-medium">
                            {user?.email || "Non renseigné"}
                          </span>
                        </div>
                        {profile?.phone && (
                          <div>
                            <span className="text-gray-500">Téléphone:</span>{" "}
                            <span className="font-medium">{profile.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Sélection du véhicule */}
                    <div>
                      <h4 className="font-light mb-3 text-base flex items-center gap-2">
                        <Car className="h-4 w-4" />
                        Votre véhicule
                      </h4>
                      {vehicles.length > 0 ? (
                        <div className="space-y-2">
                          {vehicles.map((vehicle) => (
                            <button
                              key={vehicle.id}
                              onClick={() => setSelectedVehicle(vehicle)}
                              className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                                selectedVehicle?.id === vehicle.id
                                  ? "border-blue-600 bg-blue-50 shadow-md"
                                  : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                                  <Car className="h-5 w-5 text-white" />
                                </div>
                                <div className="flex-1">
                                  <div className="font-light text-gray-900 mb-1">
                                    {vehicle.brand} {vehicle.model}
                                  </div>
                                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-600">
                                    {vehicle.license_plate && (
                                      <span className="font-mono font-medium bg-gray-100 px-2 py-0.5 rounded">
                                        {vehicle.license_plate}
                                      </span>
                                    )}
                                    {vehicle.year && <span>{vehicle.year}</span>}
                                    {vehicle.fuel_type && <span className="capitalize">{vehicle.fuel_type}</span>}
                                  </div>
                                </div>
                                {selectedVehicle?.id === vehicle.id && (
                                  <Check className="h-5 w-5 text-blue-600 flex-shrink-0" />
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-xl">
                          <Car className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-600 mb-3">Aucun véhicule enregistré</p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push("/profile/vehicles/new")}
                          >
                            Ajouter un véhicule
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Formulaire pour quelqu'un d'autre */
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl border-2 border-blue-200 bg-blue-50">
                      <h4 className="font-light mb-3 text-base flex items-center gap-2">
                        <UserPlus className="h-4 w-4 text-blue-600" />
                        Informations de la personne
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="other-first-name" className="text-xs font-light">Prénom *</Label>
                          <Input
                            id="other-first-name"
                            value={otherPersonInfo.first_name}
                            onChange={(e) => setOtherPersonInfo({ ...otherPersonInfo, first_name: e.target.value })}
                            className="mt-1 rounded-xl"
                            placeholder="Prénom"
                          />
                        </div>
                        <div>
                          <Label htmlFor="other-last-name" className="text-xs font-light">Nom *</Label>
                          <Input
                            id="other-last-name"
                            value={otherPersonInfo.last_name}
                            onChange={(e) => setOtherPersonInfo({ ...otherPersonInfo, last_name: e.target.value })}
                            className="mt-1 rounded-xl"
                            placeholder="Nom"
                          />
                        </div>
                        <div>
                          <Label htmlFor="other-phone" className="text-xs font-light">Téléphone *</Label>
                          <Input
                            id="other-phone"
                            type="tel"
                            value={otherPersonInfo.phone}
                            onChange={(e) => setOtherPersonInfo({ ...otherPersonInfo, phone: e.target.value.replace(/\D/g, "") })}
                            className="mt-1 rounded-xl"
                            placeholder="0612345678"
                          />
                        </div>
                        <div>
                          <Label htmlFor="other-email" className="text-xs font-light">Email *</Label>
                          <Input
                            id="other-email"
                            type="email"
                            value={otherPersonInfo.email}
                            onChange={(e) => setOtherPersonInfo({ ...otherPersonInfo, email: e.target.value })}
                            className="mt-1 rounded-xl"
                            placeholder="email@example.com"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl border-2 border-gray-200 bg-white/50">
                      <h4 className="font-light mb-3 text-base flex items-center gap-2">
                        <Car className="h-4 w-4" />
                        Véhicule de la personne
                      </h4>
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor="other-brand" className="text-xs font-light">Marque *</Label>
                            <Input
                              id="other-brand"
                              value={otherPersonInfo.brand}
                              onChange={(e) => setOtherPersonInfo({ ...otherPersonInfo, brand: e.target.value })}
                              className="mt-1 rounded-xl"
                              placeholder="Peugeot"
                            />
                          </div>
                          <div>
                            <Label htmlFor="other-model" className="text-xs font-light">Modèle *</Label>
                            <Input
                              id="other-model"
                              value={otherPersonInfo.model}
                              onChange={(e) => setOtherPersonInfo({ ...otherPersonInfo, model: e.target.value })}
                              className="mt-1 rounded-xl"
                              placeholder="308"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor="other-license" className="text-xs font-light">Plaque d'immatriculation *</Label>
                            <Input
                              id="other-license"
                              value={otherPersonInfo.license_plate}
                              onChange={(e) => setOtherPersonInfo({ ...otherPersonInfo, license_plate: e.target.value.toUpperCase() })}
                              className="mt-1 rounded-xl"
                              placeholder="AB-123-CD"
                            />
                          </div>
                          <div>
                            <Label htmlFor="other-year" className="text-xs font-light">Année</Label>
                            <Input
                              id="other-year"
                              type="number"
                              value={otherPersonInfo.year}
                              onChange={(e) => setOtherPersonInfo({ ...otherPersonInfo, year: e.target.value })}
                              className="mt-1 rounded-xl"
                              placeholder="2020"
                              min="1900"
                              max={new Date().getFullYear() + 1}
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="other-fuel" className="text-xs font-light">Carburant</Label>
                          <Select
                            value={otherPersonInfo.fuel_type || "essence"}
                            onValueChange={(value) => setOtherPersonInfo({ ...otherPersonInfo, fuel_type: value as any })}
                          >
                            <SelectTrigger id="other-fuel" className="mt-1 rounded-xl">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="essence">Essence</SelectItem>
                              <SelectItem value="diesel">Diesel</SelectItem>
                              <SelectItem value="electrique">Électrique</SelectItem>
                              <SelectItem value="hybride">Hybride</SelectItem>
                              <SelectItem value="gpl">GPL</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Champ de message optionnel */}
                <div className="mt-6">
                  <Label htmlFor="reservation-message" className="text-sm font-light mb-2 block flex items-center gap-2">
                    <Info className="h-4 w-4 text-gray-500" />
                    Message pour le garage (optionnel)
                  </Label>
                  <Textarea
                    id="reservation-message"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Décrivez brièvement votre problème ou la raison de votre rendez-vous..."
                    className="min-h-[100px] rounded-xl border-gray-200 bg-white/70 backdrop-blur-sm resize-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200 transition-all"
                    maxLength={500}
                  />
                  <div className="text-xs text-gray-400 mt-1 text-right">
                    {notes.length}/500 caractères
                  </div>
                </div>

                {/* Bouton continuer */}
                {(!isBookingForSomeoneElse && selectedVehicle) || 
                 (isBookingForSomeoneElse && 
                  otherPersonInfo.first_name && 
                  otherPersonInfo.last_name && 
                  otherPersonInfo.phone && 
                  otherPersonInfo.email && 
                  otherPersonInfo.brand && 
                  otherPersonInfo.model && 
                  otherPersonInfo.license_plate) ? (
                  <Button onClick={handleNext} className="w-full mt-4 h-12 rounded-xl">
                    Continuer
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <div className="text-xs text-gray-500 text-center mt-4">
                    {isBookingForSomeoneElse 
                      ? "Veuillez remplir tous les champs obligatoires (*)"
                      : "Veuillez sélectionner un véhicule"}
                  </div>
                )}
              </div>
            ) : null}

            {/* Step 5: Récapitulatif (ou Step 4 si depuis page détails) */}
            {(currentStep === 5 && !isFromGarageDetails) || (currentStep === 4 && isFromGarageDetails) ? (
              <div className="space-y-4">
                <h3 className="font-semibold mb-4 text-lg">Récapitulatif</h3>
                <div className="space-y-3 p-5 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-gray-200">
                  {/* Véhicule */}
                  <div className="flex justify-between items-center pb-3 border-b">
                    <span className="text-gray-600 flex items-center gap-2">
                      <Car className="h-4 w-4" />
                      Véhicule:
                    </span>
                    <span className="font-semibold text-gray-900 text-right">
                      {isBookingForSomeoneElse 
                        ? `${otherPersonInfo.brand} ${otherPersonInfo.model}`
                        : `${selectedVehicle?.brand} ${selectedVehicle?.model}`
                      }
                      {(isBookingForSomeoneElse ? otherPersonInfo.license_plate : selectedVehicle?.license_plate) && (
                        <span className="block text-sm text-gray-600 font-normal">
                          {isBookingForSomeoneElse ? otherPersonInfo.license_plate : selectedVehicle?.license_plate}
                        </span>
                      )}
                    </span>
                  </div>

                  {/* Options supplémentaires */}
                  {(additionalOptions.courtesyVehicle || additionalOptions.homePickup || additionalOptions.expressBooking) && (
                    <div className="pb-3 border-b">
                      <span className="text-gray-600 text-sm block mb-2">Options:</span>
                      <div className="space-y-1">
                        {additionalOptions.courtesyVehicle && (
                          <span className="text-sm text-gray-900 block">🚙 Véhicule de courtoisie</span>
                        )}
                        {additionalOptions.homePickup && (
                          <span className="text-sm text-gray-900 block">🏠 Prise à domicile / livraison</span>
                        )}
                        {additionalOptions.expressBooking && (
                          <span className="text-sm text-gray-900 block">🕓 Réservation express (urgence 24h)</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Garage */}
                  <div className="flex justify-between items-start pb-3 border-b">
                    <span className="text-gray-600 flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Garage:
                    </span>
                    <span className="font-semibold text-gray-900 text-right">
                      {selectedGarage?.name}
                      {selectedGarage?.city && (
                        <span className="block text-sm text-gray-600 font-normal">
                          {selectedGarage.city}
                        </span>
                      )}
                    </span>
                  </div>

                  {/* Date et Heure */}
                  <div className="flex justify-between items-center pb-3 border-b">
                    <span className="text-gray-600 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Date:
                    </span>
                    <span className="font-semibold text-gray-900">
                      {selectedDate && selectedDate instanceof Date && !isNaN(selectedDate.getTime()) 
                        ? formatDate(selectedDate.toISOString())
                        : "Non sélectionnée"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b">
                    <span className="text-gray-600 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Heure:
                    </span>
                    <span className="font-semibold text-gray-900">{selectedTime}</span>
                  </div>

                  {/* Message si présent */}
                  {notes && (
                    <div className="pb-3 border-b">
                      <span className="text-gray-600 text-sm block mb-2 flex items-center gap-2">
                        <Info className="h-3.5 w-3.5" />
                        Votre message:
                      </span>
                      <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                        <span className="text-gray-900 text-sm whitespace-pre-wrap">{notes}</span>
                      </div>
                    </div>
                  )}

                </div>

                <Button
                  onClick={handleSubmit}
                  className="w-full h-12 sm:h-14 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-base sm:text-lg font-semibold shadow-lg hover:shadow-xl transition-all rounded-xl"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      <span className="text-sm sm:text-base">Traitement en cours...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                      Confirmer la réservation
                    </>
                  )}
                </Button>

                <p className="text-xs text-center text-gray-500 mt-2 sm:mt-3 px-2">
                  Vous pourrez modifier ou annuler ce rendez-vous jusqu'à 24h avant la date prévue
                </p>
              </div>
            ) : null}

            <div className="flex flex-col sm:flex-row gap-3 mt-6 sm:mt-8">
              {currentStep > 1 && (
                <Button variant="outline" onClick={handleBack} className="flex-1 h-11 sm:h-12 text-sm sm:text-base">
                  Retour
                </Button>
              )}
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

export default function ReservationPage() {
  return (
    <Suspense fallback={
      <div className="h-full w-full bg-gradient-to-br from-blue-50/40 via-white to-purple-50/20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    }>
      <ReservationPageContent />
    </Suspense>
  )
}

