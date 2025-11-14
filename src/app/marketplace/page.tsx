"use client"

import { ShoppingBag } from "lucide-react"
import { BottomNavigation } from "@/components/layout/BottomNavigation"
import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"

export default function MarketplacePage() {

  return (
    <>
      <div className="fixed inset-0 w-full h-full overflow-y-auto bg-gradient-to-br from-blue-50/40 via-white to-purple-50/20 pb-28 sm:pb-32 safe-area-top safe-area-bottom">
        <div className="w-full max-w-7xl mx-auto bg-white/70 backdrop-blur-2xl pb-28 sm:pb-32">
          {/* Header simple */}
          <div className="px-4 sm:px-6 py-5 sm:py-6 bg-white/40 backdrop-blur-xl border-b border-white/20">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl shadow-lg">
                <ShoppingBag className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl sm:text-2xl font-light text-gray-900">Marketplace</h1>
                <p className="text-xs sm:text-sm text-gray-500 font-light mt-1 sm:mt-2">
                  Bientôt disponible
                </p>
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="px-4 sm:px-6 py-6 sm:py-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="relative group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/10 to-blue-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <Card className="relative bg-white/60 backdrop-blur-xl border border-white/40 rounded-2xl p-6 sm:p-8 shadow-[0_4px_20px_rgba(0,0,0,0.08)] group-hover:shadow-[0_12px_40px_rgba(59,130,246,0.2)] transition-all duration-300">
                <CardContent className="text-center">
                  <motion.div
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="mb-6"
                  >
                    <div className="inline-flex p-4 bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl mb-4">
                      <ShoppingBag className="h-12 w-12 sm:h-16 sm:w-16 text-blue-600" />
                    </div>
                  </motion.div>
                  
                  <h2 className="text-lg sm:text-xl font-medium text-gray-900 mb-2">
                    Marketplace à venir
                  </h2>
                  <p className="text-sm sm:text-base text-gray-600 mb-6 max-w-md mx-auto">
                    Le marketplace sera disponible dans une prochaine fonctionnalité. 
                    Vous pourrez rechercher et acheter des pièces détachées et accessoires pour votre véhicule.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
      <BottomNavigation />
    </>
  )
}
