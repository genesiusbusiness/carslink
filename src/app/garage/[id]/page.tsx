"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { motion } from "framer-motion"
import { 
  MapPin, 
  Phone, 
  Mail, 
  Clock, 
  Star, 
  ArrowLeft, 
  Calendar,
  Wrench,
  Navigation
} from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { Garage } from "@/lib/types/database"
import { formatDistance } from "@/lib/utils/geolocation"
import { BottomNavigation } from "@/components/layout/BottomNavigation"

export default function GarageDetailPage() {
  const router = useRouter()
  const params = useParams()
  const garageId = params.id as string

  const [garage, setGarage] = useState<Garage | null>(null)
  const [loading, setLoading] = useState(true)
  const [userPosition, setUserPosition] = useState<{ latitude: number; longitude: number } | null>(null)

  useEffect(() => {
    loadGarage()
    getUserPosition()
  }, [garageId])

  const getUserPosition = async () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserPosition({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          })
        },
        () => {
          // Utiliser Paris par défaut si la géolocalisation échoue
          setUserPosition({ latitude: 48.8566, longitude: 2.3522 })
        }
      )
    } else {
      setUserPosition({ latitude: 48.8566, longitude: 2.3522 })
    }
  }

  const loadGarage = async () => {
    try {
      const { data, error } = await supabase
        .from("carslink_garages")
        .select("*")
        .eq("id", garageId)
        .single()

      if (error) {
        console.error("Error loading garage:", error)
        return
      }

      setGarage(data)
    } catch (error) {
      console.error("Error loading garage:", error)
    } finally {
      setLoading(false)
    }
  }

  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371 // Rayon de la Terre en km
    const dLat = ((lat2 - lat1) * Math.PI) / 180
    const dLon = ((lon2 - lon1) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30">
        <div className="flex items-center justify-center min-h-screen">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center"
          >
            <div className="text-gray-500 font-light">Chargement...</div>
          </motion.div>
        </div>
      </div>
    )
  }

  if (!garage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30">
        <div className="flex flex-col items-center justify-center min-h-screen px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <h2 className="text-xl font-light text-gray-900 mb-2">Garage non trouvé</h2>
            <p className="text-gray-500 font-light mb-6">Ce garage n'existe pas ou a été supprimé</p>
            <motion.button
              onClick={() => router.back()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-light hover:bg-blue-700 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Retour
            </motion.button>
          </motion.div>
        </div>
      </div>
    )
  }

  const distance = userPosition && garage.latitude && garage.longitude
    ? calculateDistance(userPosition.latitude, userPosition.longitude, garage.latitude, garage.longitude)
    : null

  const fullAddress = [garage.address, garage.postal_code, garage.city]
    .filter(Boolean)
    .join(", ")

  return (
    <div className="h-full w-full bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 overflow-y-auto pb-20 safe-area-top safe-area-bottom">
      {/* Header with back button */}
      <div className="sticky top-0 z-40 bg-white/70 backdrop-blur-xl border-b border-white/40 safe-area-top">
        <div className="flex items-center gap-4 px-6 py-4">
          <motion.button
            onClick={() => router.back()}
            className="p-2 rounded-full bg-white/60 backdrop-blur-sm border border-white/40 hover:bg-white/80 transition-colors"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <ArrowLeft className="h-5 w-5 text-gray-700" />
          </motion.button>
          <h1 className="text-lg font-light text-gray-900 flex-1">Détails du garage</h1>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-6 space-y-6">
        {/* Name and Rating */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-start justify-between gap-4 mb-3">
            <h2 className="text-2xl font-light text-gray-900 flex-1">{garage.name}</h2>
            {garage.rating && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/60 backdrop-blur-sm border border-white/40">
                <Star className="h-4 w-4 fill-blue-600 text-blue-600" />
                <span className="text-sm font-light text-gray-900">
                  {garage.rating.toFixed(1)}
                </span>
              </div>
            )}
          </div>

          {distance && (
            <div className="flex items-center gap-2 text-sm text-gray-600 font-light">
              <Navigation className="h-4 w-4 text-blue-600" />
              <span>à {formatDistance(distance)} de vous</span>
            </div>
          )}
        </motion.div>

        {/* Contact Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/60 backdrop-blur-xl border border-white/40 rounded-2xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.06)]"
        >
          <div className="space-y-3">
            {fullAddress && (
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-blue-50/50 border border-blue-100/50">
                  <MapPin className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <div className="text-xs text-gray-500 font-light mb-0.5">Adresse</div>
                  <div className="text-sm text-gray-900 font-light">{fullAddress}</div>
                </div>
              </div>
            )}

            {garage.phone && (
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-green-50/50 border border-green-100/50">
                  <Phone className="h-4 w-4 text-green-600" />
                </div>
                <div className="flex-1">
                  <div className="text-xs text-gray-500 font-light mb-0.5">Téléphone</div>
                  <a
                    href={`tel:${garage.phone}`}
                    className="text-sm text-blue-600 font-light hover:underline"
                  >
                    {garage.phone}
                  </a>
                </div>
              </div>
            )}

            {garage.email && (
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-purple-50/50 border border-purple-100/50">
                  <Mail className="h-4 w-4 text-purple-600" />
                </div>
                <div className="flex-1">
                  <div className="text-xs text-gray-500 font-light mb-0.5">Email</div>
                  <a
                    href={`mailto:${garage.email}`}
                    className="text-sm text-blue-600 font-light hover:underline break-all"
                  >
                    {garage.email}
                  </a>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Description */}
        {garage.description && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white/60 backdrop-blur-xl border border-white/40 rounded-2xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.06)]"
          >
            <h3 className="text-sm font-light text-gray-500 mb-2">À propos</h3>
            <p className="text-sm text-gray-900 font-light leading-relaxed">
              {garage.description}
            </p>
          </motion.div>
        )}

        {/* Services / Specialties */}
        {garage.specialties && garage.specialties.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white/60 backdrop-blur-xl border border-white/40 rounded-2xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.06)]"
          >
            <h3 className="text-sm font-light text-gray-500 mb-3 flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Services proposés
            </h3>
            <div className="flex flex-wrap gap-2">
              {garage.specialties.map((specialty: string, index: number) => (
                <motion.span
                  key={index}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 + index * 0.05 }}
                  className="px-3 py-1.5 bg-blue-50/50 border border-blue-100/50 rounded-lg text-xs text-blue-700 font-light"
                >
                  {specialty}
                </motion.span>
              ))}
            </div>
          </motion.div>
        )}

        {/* Opening Hours */}
        {garage.opening_hours && Object.keys(garage.opening_hours).length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white/60 backdrop-blur-xl border border-white/40 rounded-2xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.06)]"
          >
            <h3 className="text-sm font-light text-gray-500 mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Horaires d'ouverture
            </h3>
            <div className="space-y-2">
              {Object.entries(garage.opening_hours).map(([day, hours]) => (
                <div
                  key={day}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-gray-600 font-light capitalize">{day}</span>
                  <span className="text-gray-900 font-light">
                    {hours ? String(hours) : "Fermé"}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Reserve Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="pt-4"
        >
          <motion.button
            onClick={() => router.push(`/reservation?garage=${garage.id}`)}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl font-light text-lg shadow-[0_4px_20px_rgba(59,130,246,0.3)] hover:shadow-[0_8px_30px_rgba(59,130,246,0.4)] transition-all duration-300 flex items-center justify-center gap-2"
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <Calendar className="h-5 w-5" />
            Réserver un rendez-vous
          </motion.button>
        </motion.div>
      </div>

      <BottomNavigation />
    </div>
  )
}
