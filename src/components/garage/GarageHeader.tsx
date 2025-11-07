"use client"

import { MapPin, Star, Navigation } from "lucide-react"
import { motion } from "framer-motion"
import { formatDistance } from "@/lib/utils/geolocation"

interface GarageHeaderProps {
  name: string
  address?: string | null
  city?: string | null
  postalCode?: string | null
  distanceMeters?: number | null
  ratingAvg?: number | null
  ratingCount?: number
}

export function GarageHeader({
  name,
  address,
  city,
  postalCode,
  distanceMeters,
  ratingAvg,
  ratingCount = 0,
}: GarageHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="container mx-auto max-w-md sm:max-w-lg px-4 py-6"
    >
      <div className="bg-white/80 backdrop-blur-sm border border-gray-200/60 rounded-2xl p-5 sm:p-6 shadow-sm">
        {/* Nom du garage */}
        <h1 className="text-2xl sm:text-3xl font-light text-gray-900 mb-4">{name}</h1>

        {/* Adresse */}
        {(address || city || postalCode) && (
          <div className="flex items-start gap-2 mb-4">
            <MapPin className="h-5 w-5 text-gray-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              {address && (
                <p className="text-sm text-gray-700 font-light">{address}</p>
              )}
              {(city || postalCode) && (
                <p className="text-sm text-gray-600 font-light">
                  {[postalCode, city].filter(Boolean).join(" ")}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Distance et note */}
        <div className="flex items-center gap-4 flex-wrap">
          {distanceMeters !== null && distanceMeters !== undefined && (
            <div className="flex items-center gap-2">
              <Navigation className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-gray-700 font-light">
                {formatDistance(distanceMeters)}
              </span>
            </div>
          )}
          {ratingAvg !== null && ratingAvg !== undefined && !isNaN(ratingAvg) && (
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className="text-sm font-medium text-gray-900">
                {ratingAvg.toFixed(1)}
              </span>
              {ratingCount > 0 && (
                <span className="text-xs text-gray-500 font-light">
                  ({ratingCount} avis)
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
