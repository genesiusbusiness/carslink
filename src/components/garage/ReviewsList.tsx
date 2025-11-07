"use client"

import { Star, User } from "lucide-react"
import { motion } from "framer-motion"
import { formatDate } from "@/lib/utils"

interface Review {
  id: string
  rating: number
  comment?: string | null
  author?: string | null
  date: string | Date
}

interface ReviewsListProps {
  reviews: Review[]
}

export function ReviewsList({ reviews }: ReviewsListProps) {
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

  if (reviews.length === 0) {
    return (
      <div className="text-center py-12">
        <Star className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 font-light">Aucun avis pour le moment</p>
        <p className="text-sm text-gray-400 mt-1">Soyez le premier à laisser un avis !</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      {reviews.map((review, index) => (
        <motion.div
          key={review.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          className="bg-white/40 backdrop-blur-sm border border-gray-200/60 rounded-xl p-4 sm:p-5 hover:border-gray-300/80 transition-all duration-300"
        >
          {/* En-tête */}
          <div className="flex items-start gap-3 mb-3">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-md">
              <User className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-900 text-sm sm:text-base mb-1 truncate">
                {review.author || "Utilisateur anonyme"}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-0.5">
                  {renderStars(review.rating)}
                </div>
                <span className="text-xs text-gray-500 font-light">
                  {formatDate(review.date)}
                </span>
              </div>
            </div>
          </div>

          {/* Commentaire */}
          {review.comment && (
            <div className="pl-0 sm:pl-14">
              <p className="text-sm sm:text-base text-gray-700 font-light leading-relaxed">
                {review.comment}
              </p>
            </div>
          )}
        </motion.div>
      ))}
    </div>
  )
}
