"use client"

import { Star } from "lucide-react"
import { motion } from "framer-motion"

interface SubRating {
  label: string
  value: number
}

interface RatingsSummaryProps {
  avg: number | null
  count: number
  subratings?: {
    proprete?: number
    ambiance?: number
    qualite?: number
  } | null | undefined
}

const SUBRATING_LABELS = {
  proprete: "Propreté",
  ambiance: "Ambiance",
  qualite: "Qualité",
}

export function RatingsSummary({ avg, count, subratings }: RatingsSummaryProps) {
  const subratingsList: SubRating[] = []
  
  if (subratings) {
    if (subratings.proprete !== undefined) {
      subratingsList.push({ label: SUBRATING_LABELS.proprete, value: subratings.proprete })
    }
    if (subratings.ambiance !== undefined) {
      subratingsList.push({ label: SUBRATING_LABELS.ambiance, value: subratings.ambiance })
    }
    if (subratings.qualite !== undefined) {
      subratingsList.push({ label: SUBRATING_LABELS.qualite, value: subratings.qualite })
    }
  }

  const renderStars = (rating: number) => {
    return [...Array(5)].map((_, i) => (
      <Star
        key={i}
        className={`h-3 w-3 ${
          i < Math.round(rating)
            ? "fill-yellow-400 text-yellow-400"
            : "fill-gray-200 text-gray-200"
        }`}
      />
    ))
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white/80 backdrop-blur-sm border border-gray-200/60 rounded-2xl p-4 sm:p-6 shadow-sm"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        {/* Colonne gauche : Note moyenne */}
        <div className="flex flex-col items-center sm:items-start justify-center space-y-2">
          <div className="text-5xl sm:text-6xl font-light text-gray-900">
            {avg !== null && avg !== undefined && !isNaN(avg) ? avg.toFixed(1) : "—"}
          </div>
          <div className="flex items-center gap-1">
            {avg !== null && avg !== undefined && !isNaN(avg) && renderStars(avg)}
          </div>
          <div className="text-sm text-gray-500 font-light text-center sm:text-left">
            {count > 0 ? `${count} client${count > 1 ? "s ont" : " a"} donné${count > 1 ? "" : "e"} leur avis` : "Aucun avis"}
          </div>
        </div>

        {/* Colonne droite : Sous-notes */}
        {subratingsList.length > 0 && (
          <div className="space-y-3 sm:space-y-4">
            {subratingsList.map((subrating, index) => (
              <motion.div
                key={subrating.label}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between gap-3"
              >
                <span className="text-sm text-gray-700 font-light flex-1">
                  {subrating.label}
                </span>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-0.5">
                    {renderStars(subrating.value)}
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-8 text-right">
                    {subrating.value.toFixed(1)}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}
