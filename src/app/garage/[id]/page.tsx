"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { motion } from "framer-motion"
import Image from "next/image"
import { 
  ArrowLeft, 
  Calendar,
  Clock,
  Wrench,
  Wallet
} from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { Garage } from "@/lib/types/database"
import { BottomNavigation } from "@/components/layout/BottomNavigation"
import { Button } from "@/components/ui/button"
import { GarageHeader } from "@/components/garage/GarageHeader"
import { Tabs } from "@/components/garage/Tabs"
import { RatingsSummary } from "@/components/garage/RatingsSummary"
import { ReviewsList } from "@/components/garage/ReviewsList"

interface GarageService {
  id: string
  name: string
  description?: string
  price?: number | null
  base_price?: number | null
  section?: {
    name?: string
    icon?: string
  } | null
}

const DAYS_OF_WEEK: Record<number, string> = {
  0: "Dimanche",
  1: "Lundi",
  2: "Mardi",
  3: "Mercredi",
  4: "Jeudi",
  5: "Vendredi",
  6: "Samedi",
}

export default function GarageDetailPage() {
  const router = useRouter()
  const params = useParams()
  const garageId = params.id as string
  
  const [garage, setGarage] = useState<Garage | null>(null)
  const [services, setServices] = useState<GarageService[]>([])
  const [openingHours, setOpeningHours] = useState<any[]>([])
  const [reviews, setReviews] = useState<any[]>([])
  const [reviewsCount, setReviewsCount] = useState(0)
  const [userPosition, setUserPosition] = useState<{ latitude: number; longitude: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"rdv" | "avis">("rdv")

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserPosition({ latitude: position.coords.latitude, longitude: position.coords.longitude })
        },
        () => {
          setUserPosition({ latitude: 48.8566, longitude: 2.3522 })
        }
      )
    } else {
      setUserPosition({ latitude: 48.8566, longitude: 2.3522 })
    }
  }, [])

  const loadGarage = async () => {
    try {
      console.log('🔍 Chargement du garage:', garageId)
      const { data, error } = await supabase
        .from("carslink_garages")
        .select("*")
        .eq("id", garageId)
        .single()

      if (error) {
        console.error("❌ Erreur lors du chargement du garage:", error)
        console.error("Détails:", {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        })
        return
      }

      console.log('✅ Garage chargé:', data?.name)
      setGarage(data)
    } catch (error: any) {
      console.error("❌ Erreur inattendue lors du chargement du garage:", error)
      console.error("Stack:", error?.stack)
    } finally {
      setLoading(false)
    }
  }

  const loadServices = async () => {
    try {
      console.log('🔍 Chargement des services pour garage:', garageId)
      const { data, error } = await supabase
        .from("carslink_garage_services")
        .select(`
          id,
          name,
          description,
          price,
          base_price,
          section:carslink_service_sections (
            name,
            icon
          )
        `)
        .eq("garage_id", garageId)
        .eq("is_active", true)
        .order("name", { ascending: true })

      if (error) {
        console.error("❌ Erreur lors du chargement des services:", error)
        console.error("Détails:", {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        })
        return
      }

      // Transformer les données pour correspondre au type GarageService
      const formattedServices: GarageService[] = (data || []).map((service: any) => ({
        id: service.id,
        name: service.name || "",
        description: service.description || null,
        price: service.price || null,
        base_price: service.base_price || null,
        section: service.section || null,
      }))

      console.log('✅ Services chargés:', formattedServices.length)
      setServices(formattedServices)
    } catch (error: any) {
      console.error("❌ Erreur inattendue lors du chargement des services:", error)
      console.error("Stack:", error?.stack)
    }
  }

  const loadOpeningHours = async () => {
    try {
      console.log('🔍 Chargement des horaires pour garage:', garageId)
      const { data, error } = await supabase
        .from("carslink_garage_opening_hours")
        .select("*")
        .eq("garage_id", garageId)
        .order("day_of_week", { ascending: true })

      if (error) {
        console.error("❌ Erreur lors du chargement des horaires:", error)
        console.error("Détails:", {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        })
        return
      }

      console.log('✅ Horaires chargés:', data?.length || 0)
      setOpeningHours(data || [])
    } catch (error: any) {
      console.error("❌ Erreur inattendue lors du chargement des horaires:", error)
      console.error("Stack:", error?.stack)
    }
  }

  const loadReviews = async () => {
    try {
      
      // Essayer de charger depuis carslink_reviews ou carslink_garage_reviews
      let { data, error } = await supabase
        .from("carslink_reviews")
        .select("*")
        .eq("garage_id", garageId)
        .order("created_at", { ascending: false })
        .limit(50)


      if (error && (error.code === '42P01' || error.message?.includes('does not exist'))) {
        const retryResult = await supabase
          .from("carslink_garage_reviews")
          .select("*")
          .eq("garage_id", garageId)
          .order("created_at", { ascending: false })
          .limit(50)
        
        
        if (!retryResult.error) {
          data = retryResult.data
          error = null
        } else {
          // Les deux tables n'existent pas, ne pas charger de données factices
          setReviews([])
          setReviewsCount(0)
          return
        }
      }

      // Si autre erreur que table inexistante
      if (error && error.code !== '42P01') {
        setReviews([])
        setReviewsCount(0)
        return
      }

      if (data && data.length > 0) {
        setReviews(data || [])
        setReviewsCount(data.length)
      } else {
        // Si pas de données dans la table, ne pas afficher d'avis factices
        setReviews([])
        setReviewsCount(0)
      }
    } catch (error) {
      // Ne pas charger de données factices en cas d'erreur
      setReviews([])
      setReviewsCount(0)
    }
  }

  useEffect(() => {
    if (garageId) {
      loadGarage()
      loadServices()
      loadOpeningHours()
      loadReviews()
    }
  }, [garageId])

  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371e3 // Rayon de la Terre en mètres
    const φ1 = lat1 * Math.PI / 180
    const φ2 = lat2 * Math.PI / 180
    const Δφ = (lat2 - lat1) * Math.PI / 180
    const Δλ = (lon2 - lon1) * Math.PI / 180

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))

    return R * c // Distance en mètres
  }

  const formatOpeningHours = (hour: any): string => {
    if (!hour.is_open) return "Fermé"
    if (!hour.open_time || !hour.close_time) return "Ouvert"
    
    const open = hour.open_time.substring(0, 5)
    const close = hour.close_time.substring(0, 5)
    
    if (hour.lunch_break_start && hour.lunch_break_end) {
      const lunchStart = hour.lunch_break_start.substring(0, 5)
      const lunchEnd = hour.lunch_break_end.substring(0, 5)
      return `${open} - ${lunchStart} / ${lunchEnd} - ${close}`
    }
    
    return `${open} - ${close}`
  }

  const formatPrice = (price: number | null): string => {
    if (!price) return ""
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(price)
  }

  const formatPriceRange = (min: number | null, max: number | null): string => {
    if (!min && !max) return ""
    if (min && max) {
      if (min === max) return formatPrice(min)
      return `${formatPrice(min)} - ${formatPrice(max)}`
    }
    if (min) return `À partir de ${formatPrice(min)}`
    if (max) return `Jusqu'à ${formatPrice(max)}`
    return ""
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50/40 via-white to-purple-50/20 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="text-gray-600 font-light">Chargement...</div>
        </motion.div>
      </div>
    )
  }

  if (!garage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50/40 via-white to-purple-50/20 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h2 className="text-xl font-light text-gray-900 mb-2">Garage non trouvé</h2>
          <p className="text-gray-500 font-light mb-6">Ce garage n'existe pas ou a été supprimé</p>
          <Button
            onClick={() => router.back()}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white"
          >
            Retour
          </Button>
        </motion.div>
      </div>
    )
  }

  const distanceMeters = userPosition && garage.latitude && garage.longitude
    ? calculateDistance(userPosition.latitude, userPosition.longitude, garage.latitude, garage.longitude)
    : null

  // Grouper les services par section
  const servicesBySection = services.reduce((acc, service) => {
    const sectionName = service.section?.name || "Autres"
    if (!acc[sectionName]) {
      acc[sectionName] = []
    }
    acc[sectionName].push(service)
    return acc
  }, {} as Record<string, GarageService[]>)

  // Préparer les avis pour ReviewsList
  const formattedReviews = reviews.map(review => ({
    id: review.id,
    rating: review.rating,
    comment: review.comment,
    date: review.created_at || new Date().toISOString(),
    createdAt: review.created_at,
  }))

  // Calculer moyenne des sous-notes
  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : (garage.rating || 0)

  // Calculer la note finale en toute sécurité
  const finalRating = (garage.rating !== null && garage.rating !== undefined && !isNaN(garage.rating))
    ? garage.rating
    : (avgRating !== null && avgRating !== undefined && !isNaN(avgRating))
      ? avgRating
      : null

  // Ne pas afficher de subratings factices - seulement si disponibles dans les vraies données
  const subratings = undefined

  // Vérifier s'il y a des avis réels
  const hasReviews = reviewsCount > 0 && reviews.length > 0

  // Afficher l'onglet Avis toujours (même s'il n'y a pas d'avis pour le moment)
  const tabs = [
    { id: "rdv", label: "Prendre RDV", anchor: "rdv" },
    { id: "avis", label: "Avis", anchor: "avis" }
  ]
  

  return (
    <div className="fixed inset-0 w-full h-full bg-gradient-to-br from-blue-50/40 via-white to-purple-50/20 overflow-y-auto pb-36 sm:pb-40 safe-area-top safe-area-bottom">
      {/* Header avec bouton retour */}
      <div className="sticky top-0 z-40 bg-white/70 backdrop-blur-xl border-b border-white/40 safe-area-top">
        <div className="flex items-center gap-4 px-4 sm:px-6 py-4">
          <motion.button
            onClick={() => router.back()}
            className="p-2 rounded-full bg-white/60 backdrop-blur-sm border border-white/40 hover:bg-white/80 transition-colors"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <ArrowLeft className="h-5 w-5 text-gray-700" />
          </motion.button>
          <h1 className="text-lg sm:text-xl font-light text-gray-900 flex-1">Détails du garage</h1>
        </div>
      </div>

      {/* Photo du garage */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="relative w-full h-64 sm:h-80 overflow-hidden"
      >
        {garage.image_url ? (
          <>
            <Image
              src={garage.image_url || ''}
              alt={garage.name || 'Garage'}
              fill
              className="object-cover"
              sizes="100vw"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent" />
          </>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-500 via-purple-500 to-blue-600 flex items-center justify-center">
            <div className="text-center">
              <Wrench className="h-16 w-16 sm:h-20 sm:w-20 text-white/80 mx-auto mb-4" />
              <div className="text-white/90 font-light text-lg sm:text-xl">{garage.name}</div>
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
          </div>
        )}
      </motion.div>

      {/* En-tête avec GarageHeader */}
      <GarageHeader
        name={garage.name || ''}
        address={garage.address || ''}
        city={garage.city || ''}
        postalCode={garage.postal_code || ''}
        distanceMeters={distanceMeters}
        ratingAvg={finalRating}
        ratingCount={reviewsCount}
      />

      {/* Bouton Réserver */}
      <div className="container mx-auto max-w-md sm:max-w-lg px-4 pb-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Button
            onClick={() => router.push(`/reservation?garage=${garage.id}`)}
            className="w-full h-10 sm:h-11 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-medium text-sm sm:text-base shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-3"
          >
            <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
            Réserver un rendez-vous
          </Button>
        </motion.div>
      </div>

      {/* Barre d'onglets sticky */}
      <Tabs 
        tabs={tabs} 
        activeTab={activeTab} 
        onChange={(tabId) => {
          setActiveTab(tabId as "rdv" | "avis")
        }} 
      />

      {/* Contenu principal avec sections selon l'onglet actif */}
      <div className="container mx-auto max-w-md sm:max-w-lg px-4 py-6 pb-40 sm:pb-44">
        {/* Section Prendre RDV */}
        {activeTab === "rdv" && (
          <section id="rdv" className="space-y-6">
            {/* À propos - Toujours affiché */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="bg-white/80 backdrop-blur-sm border border-gray-200/60 rounded-2xl p-4 sm:p-6 shadow-sm"
            >
              <h3 className="text-lg sm:text-xl font-light text-gray-900 mb-4">À propos</h3>
              <p className="text-sm sm:text-base text-gray-700 font-light leading-relaxed text-balance">
                {garage.description || "Aucune description disponible pour ce garage."}
              </p>
            </motion.div>

            {/* Horaires */}
            {openingHours.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white/80 backdrop-blur-sm border border-gray-200/60 rounded-2xl p-4 sm:p-6 shadow-sm"
              >
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg sm:text-xl font-light text-gray-900">Horaires d'ouverture</h3>
                </div>
                <div className="space-y-2">
                  {openingHours.map((hour, index) => (
                    <motion.div
                      key={hour.day_of_week}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + index * 0.05 }}
                      className="flex items-center justify-between py-2 border-b border-gray-100/50 last:border-0"
                    >
                      <span className="text-sm sm:text-base text-gray-700 font-medium flex-1">
                        {DAYS_OF_WEEK[hour.day_of_week]}
                      </span>
                      <span className={`text-sm sm:text-base font-light ${
                        hour.is_open ? "text-gray-900" : "text-gray-400"
                      }`}>
                        {formatOpeningHours(hour)}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Services */}
            {services.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white/80 backdrop-blur-sm border border-gray-200/60 rounded-2xl p-4 sm:p-6 shadow-sm"
              >
                <div className="flex items-center gap-2 mb-4">
                  <Wrench className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg sm:text-xl font-light text-gray-900">Services & Tarifs</h3>
                </div>
                
                <div className="space-y-6">
                  {Object.entries(servicesBySection).map(([sectionName, sectionServices]) => (
                    <div key={sectionName} className="space-y-3">
                      {sectionName !== "Autres" && (
                        <h4 className="text-sm font-medium text-gray-700 mb-2">{sectionName}</h4>
                      )}
                      <div className="space-y-2">
                        {sectionServices.map((service, index) => (
                          <motion.div
                            key={service.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 + index * 0.05 }}
                            className="flex items-start justify-between gap-3 p-3 rounded-xl bg-gray-50/50 border border-gray-100/50 hover:bg-gray-100/50 transition-colors"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-gray-900 text-sm sm:text-base mb-1">
                                {service.name}
                              </div>
                              {service.description && (
                                <div className="text-xs sm:text-sm text-gray-600 font-light line-clamp-2">
                                  {service.description}
                                </div>
                              )}
                            </div>
                            {(service.price || service.base_price) && (
                              <div className="flex items-center gap-1 text-sm font-medium text-blue-600 flex-shrink-0">
                                <Wallet className="h-4 w-4" />
                                <span>
                                  {service.price
                                    ? formatPrice(service.price)
                                    : service.base_price ? formatPrice(service.base_price) : 'N/A'
                                  }
                                </span>
                              </div>
                            )}
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </section>
        )}

        {/* Section Avis */}
        {activeTab === "avis" && (
          <section id="avis" className="space-y-6">
            {/* Carte de synthèse - seulement si des avis existent */}
            {reviewsCount > 0 && (
              <RatingsSummary
                avg={finalRating}
                count={reviewsCount}
                subratings={undefined}
              />
            )}

            {/* Liste d'avis */}
            <ReviewsList reviews={formattedReviews} />
          </section>
        )}
      </div>

      <BottomNavigation />
    </div>
  )
}
