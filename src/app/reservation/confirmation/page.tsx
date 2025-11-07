"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { CheckCircle, Calendar, MapPin, Car, Clock, Building2, Download, ArrowLeft, CreditCard } from "lucide-react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BottomNavigation } from "@/components/layout/BottomNavigation"
import { useAuth } from "@/lib/hooks/use-auth"
import { supabase } from "@/lib/supabase/client"
import { formatDateTime, formatDate, formatTime } from "@/lib/utils"
import { showElegantToast } from "@/components/ui/elegant-toast"
import type { Appointment, Garage, Vehicle } from "@/lib/types/database"

function ConfirmationPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const appointmentId = searchParams.get("id")
  const { user, loading: authLoading } = useAuth()
  
  const [appointment, setAppointment] = useState<Appointment | null>(null)
  const [garage, setGarage] = useState<Garage | null>(null)
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [servicePrice, setServicePrice] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      router.push("/login")
      return
    }

    if (!appointmentId) {
      router.push("/reservation")
      return
    }

    loadAppointment()
  }, [user, appointmentId, authLoading, router])

  const loadAppointment = async () => {
    if (!appointmentId || !user) return

    setLoading(true)
    try {
      // Charger le rendez-vous
      const { data: appointmentData, error: appointmentError } = await supabase
        .from("appointments")
        .select("*")
        .eq("id", appointmentId)
        .eq("flynesis_user_id", user.id)
        .single()

      if (appointmentError || !appointmentData) {
        throw new Error("Rendez-vous introuvable")
      }

      setAppointment(appointmentData)

      // Charger le garage
      if (appointmentData.garage_id) {
        const { data: garageData } = await supabase
          .from("carslink_garages")
          .select("*")
          .eq("id", appointmentData.garage_id)
          .single()

        if (garageData) {
          setGarage(garageData)
        }
      }

      // Charger le véhicule
      if (appointmentData.vehicle_id) {
        const { data: vehicleData } = await supabase
          .from("vehicles")
          .select("*")
          .eq("id", appointmentData.vehicle_id)
          .single()

        if (vehicleData) {
          setVehicle(vehicleData)
        }
      }

      // Charger le prix du service depuis carslink_garage_services
      // Utiliser la même logique que dans la page de réservation
      if (appointmentData.garage_id && appointmentData.service_type) {
        const serviceName = appointmentData.service_type
        
        // Mapping des noms de service vers des mots-clés de recherche (même logique que reservation/page.tsx)
        const serviceKeywords: Record<string, string[]> = {
          "vidange": ["vidange", "changement d'huile", "huile"],
          "revision": ["révision", "révision complète", "entretien"],
          "filtres": ["filtre", "filtres", "changement filtres"],
          "controle": ["contrôle technique", "préparation contrôle", "contre-visite"],
          "freinage": ["freinage", "frein", "plaquettes", "disques"],
          "suspension": ["suspension", "amortisseurs"],
          "embrayage": ["embrayage", "transmission"],
          "climatisation": ["climatisation", "clim", "recharge clim"],
          "batterie": ["batterie", "changement batterie"],
          "eclairage": ["éclairage", "phare", "ampoule"],
          "changement_pneus": ["pneus", "montage pneus", "changement pneus"],
          "equilibrage": ["équilibrage", "parallélisme"],
          "permutation": ["permutation", "permutation pneus"],
          "carrosserie": ["carrosserie", "peinture", "réparation carrosserie"],
          "polissage": ["polissage", "débosselage"],
          "nettoyage": ["nettoyage", "lavage"],
          "depannage": ["dépannage", "réparation urgente"],
          "devis": ["devis"]
        }

        // Déterminer les keywords à utiliser
        // Chercher dans les clés du mapping si le service_type correspond
        let keywords: string[] = []
        const normalizedServiceType = serviceName.toLowerCase().trim()
        
        // Chercher une correspondance dans les clés et combiner les keywords si plusieurs matchs
        for (const [key, keyWords] of Object.entries(serviceKeywords)) {
          if (normalizedServiceType.includes(key) || keyWords.some(kw => normalizedServiceType.includes(kw))) {
            // Combiner les keywords au lieu de remplacer
            keywords = Array.from(new Set([...keywords, ...keyWords]))
          }
        }
        
        // Si pas trouvé, utiliser le nom du service comme keyword
        if (keywords.length === 0) {
          keywords = [serviceName]
        }

        const searchQueries = keywords.map(keyword => `name.ilike.%${keyword}%`).join(',')

        // Rechercher le service avec les keywords
        let { data: servicePriceData, error: priceError } = await supabase
          .from("carslink_garage_services")
          .select("price, base_price, name")
          .eq("garage_id", appointmentData.garage_id)
          .eq("is_active", true)
          .or(searchQueries)
          .limit(1)
          .maybeSingle()

        // Si aucun résultat, essayer avec le premier keyword seulement
        if (!servicePriceData && keywords.length > 0) {
          const { data: fallbackPriceData } = await supabase
            .from("carslink_garage_services")
            .select("price, base_price, name")
            .eq("garage_id", appointmentData.garage_id)
            .eq("is_active", true)
            .ilike("name", `%${keywords[0]}%`)
            .limit(1)
            .maybeSingle()
          
          if (fallbackPriceData) {
            servicePriceData = fallbackPriceData
          }
        }

        if (servicePriceData) {
          // PRIORITÉ : price (prix fixe) > base_price (fallback)
          const price = servicePriceData.price != null ? Number(servicePriceData.price) : null
          const basePrice = servicePriceData.base_price != null ? Number(servicePriceData.base_price) : null
          
          if (price != null && !isNaN(price) && price > 0) {
            setServicePrice(price)
          } else if (basePrice != null && !isNaN(basePrice) && basePrice > 0) {
            setServicePrice(basePrice)
          }
        }
      }
    } catch (error: any) {
      showElegantToast({
        title: "Erreur",
        message: error.message || "Erreur lors du chargement",
        variant: "error",
      })
      setTimeout(() => router.push("/appointments"), 2000)
    } finally {
      setLoading(false)
    }
  }

  // Détecter si on est sur iOS/macOS
  const isAppleDevice = () => {
    if (typeof window === "undefined") return false
    return /iPad|iPhone|iPod|Macintosh/.test(navigator.userAgent) || 
           (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  }

  // Générer le fichier .ics pour le calendrier
  const generateICS = () => {
    if (!appointment || !garage || !appointment.start_time || !appointment.end_time) return

    const startDate = new Date(appointment.start_time)
    const endDate = new Date(appointment.end_time)
    
    // Formater les dates au format ICS (YYYYMMDDTHHMMSSZ)
    const formatICSDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z"
    }

    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//CarsLink//Reservation//FR",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      `UID:${appointment.id}@carslink.app`,
      `DTSTAMP:${formatICSDate(new Date())}`,
      `DTSTART:${formatICSDate(startDate)}`,
      `DTEND:${formatICSDate(endDate)}`,
      `SUMMARY:${appointment.service_type}`,
      `DESCRIPTION:Rendez-vous chez ${garage.name}\\nAdresse: ${garage.address || ""}, ${garage.postal_code || ""} ${garage.city || ""}${appointment.notes ? `\\n\\nNotes: ${appointment.notes.replace(/\n/g, "\\n")}` : ""}`,
      `LOCATION:${garage.address || ""}, ${garage.postal_code || ""} ${garage.city || ""}`,
      "STATUS:CONFIRMED",
      "SEQUENCE:0",
      "END:VEVENT",
      "END:VCALENDAR"
    ].join("\r\n")

    // Créer un blob et télécharger
    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `reservation-${appointment.id}.ics`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(link.href)
  }

  // Ouvrir Google Calendar
  const openGoogleCalendar = () => {
    if (!appointment || !garage || !appointment.start_time || !appointment.end_time) return

    const startDate = new Date(appointment.start_time)
    const endDate = new Date(appointment.end_time)
    
    const formatGoogleDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z"
    }

    const title = encodeURIComponent(appointment.service_type || "Rendez-vous")
    const details = encodeURIComponent(
      `Rendez-vous chez ${garage.name}\n\n` +
      `Adresse: ${garage.address || ""}, ${garage.postal_code || ""} ${garage.city || ""}\n` +
      (appointment.notes ? `Notes: ${appointment.notes}` : "")
    )
    const location = encodeURIComponent(
      `${garage.address || ""}, ${garage.postal_code || ""} ${garage.city || ""}`
    )
    const start = formatGoogleDate(startDate)
    const end = formatGoogleDate(endDate)

    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}&location=${location}`
    window.open(url, "_blank")
  }

  const handleAddToCalendar = () => {
    if (isAppleDevice()) {
      // Sur Apple, télécharger le fichier .ics qui s'ouvrira automatiquement
      generateICS()
    } else {
      // Sur autres plateformes, proposer les deux options
      const useGoogle = confirm("Voulez-vous ajouter à Google Calendar ?\n\nCliquez sur OK pour Google Calendar, ou Annuler pour télécharger le fichier .ics")
      if (useGoogle) {
        openGoogleCalendar()
      } else {
        generateICS()
      }
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50/40 via-white to-purple-50/20 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-600 mb-2">Chargement de la confirmation...</div>
          <div className="text-sm text-gray-400">Veuillez patienter</div>
        </div>
      </div>
    )
  }

  if (!appointment || !appointment.start_time || !appointment.end_time) {
    return null
  }

  const startDate = new Date(appointment.start_time)
  const endDate = new Date(appointment.end_time)

  return (
    <>
      <div className="fixed inset-0 w-full h-full overflow-y-auto bg-gradient-to-br from-blue-50/40 via-white to-purple-50/20 pb-32 sm:pb-40 safe-area-top safe-area-bottom">
        {/* Mobile Container avec effet Liquid Glass */}
        <div className="w-full max-w-7xl mx-auto bg-white/70 backdrop-blur-2xl pb-32 sm:pb-40">
          {/* Header */}
          <div className="px-6 py-6 bg-white/40 backdrop-blur-xl border-b border-white/20">
            <div className="flex items-center gap-4 mb-6">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push("/appointments")}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex-1">
                <h1 className="text-2xl font-light text-gray-900">Réservation confirmée</h1>
              </div>
            </div>
          </div>

          {/* Contenu */}
          <div className="px-4 sm:px-6 py-6 sm:py-8 space-y-4 sm:space-y-6 pb-12 sm:pb-16">
            {/* Message de confirmation */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="text-center py-6"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="mx-auto mb-4 h-16 w-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-lg"
              >
                <CheckCircle className="h-10 w-10 text-white" />
              </motion.div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Votre rendez-vous a été confirmé
              </h2>
              <p className="text-gray-600 text-sm">
                Votre rendez-vous pour <strong>{appointment.service_type}</strong> a été enregistré avec succès.
              </p>
            </motion.div>

            {/* Détails du rendez-vous */}
            <Card className="bg-white/60 backdrop-blur-xl border border-white/40 shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
              <CardHeader>
                <CardTitle className="font-light text-lg">Détails du rendez-vous</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Service */}
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                    <Clock className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-gray-600 mb-1">Service</div>
                    <div className="font-semibold text-gray-900">{appointment.service_type}</div>
                    {servicePrice !== null && (
                      <div className="flex items-center gap-1 mt-2">
                        <CreditCard className="h-3.5 w-3.5 text-green-600" />
                        <span className="text-sm font-semibold text-green-600">
                          {new Intl.NumberFormat("fr-FR", {
                            style: "currency",
                            currency: "EUR",
                          }).format(servicePrice)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Date et heure */}
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center flex-shrink-0">
                    <Calendar className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-gray-600 mb-1">Date et heure</div>
                    <div className="font-semibold text-gray-900">
                      {formatDate(startDate.toISOString())} à {formatTime(startDate.toISOString())}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Jusqu'à {formatTime(endDate.toISOString())}
                    </div>
                  </div>
                </div>

                {/* Véhicule */}
                {vehicle && (
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center flex-shrink-0">
                      <Car className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm text-gray-600 mb-1">Véhicule</div>
                      <div className="font-semibold text-gray-900">
                        {vehicle.brand} {vehicle.model}
                      </div>
                      {vehicle.license_plate && (
                        <div className="text-xs text-gray-500 mt-1">
                          <span className="font-mono bg-white px-2 py-0.5 rounded">
                            {vehicle.license_plate}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Garage */}
                {garage && (
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                      <Building2 className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm text-gray-600 mb-1">Garage</div>
                      <div className="font-semibold text-gray-900 mb-1">{garage.name}</div>
                      <div className="space-y-1 text-sm text-gray-600">
                        {garage.address && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            <span>{garage.address}</span>
                          </div>
                        )}
                        {garage.city && garage.postal_code && (
                          <div>{garage.postal_code} {garage.city}</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Notes */}
                {appointment.notes && (
                  <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                    <div className="text-sm text-gray-600 mb-1">Vos notes</div>
                    <div className="text-sm text-gray-900 whitespace-pre-wrap">{appointment.notes}</div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Bouton ajouter au calendrier */}
            <Button
              onClick={handleAddToCalendar}
              className="w-full h-10 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-sm font-medium shadow-md hover:shadow-lg transition-all"
            >
              <Calendar className="h-4 w-4 mr-2" />
              {isAppleDevice() ? "Ajouter au calendrier Apple" : "Ajouter au calendrier"}
              <Download className="h-4 w-4 ml-2" />
            </Button>

            {/* Bouton retour */}
            <Button
              variant="outline"
              onClick={() => router.push("/appointments")}
              className="w-full h-12 rounded-xl"
            >
              Voir mes rendez-vous
            </Button>
          </div>
        </div>
      </div>

      <BottomNavigation />
    </>
  )
}

export default function ConfirmationPage() {
  return (
    <Suspense fallback={
      <div className="h-full w-full bg-gradient-to-br from-blue-50/40 via-white to-purple-50/20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    }>
      <ConfirmationPageContent />
    </Suspense>
  )
}

