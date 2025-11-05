"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Search, MapPin, Star, Clock, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { BottomNavigation } from "@/components/layout/BottomNavigation"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/lib/hooks/use-auth"
import { motion } from "framer-motion"
import type { Garage } from "@/lib/types/database"

function SearchPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading: authLoading } = useAuth()
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "")
  const [garages, setGarages] = useState<Garage[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Attendre que l'authentification soit vérifiée
    if (authLoading) {
      return
    }

    if (!user) {
      router.push("/login")
      return
    }

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
        } else {
          setGarages([])
        }
      } else if (!error && data) {
        setGarages(data)
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
    <div className="h-full w-full bg-gradient-to-br from-blue-50/40 via-white to-purple-50/20 overflow-y-auto pb-20 safe-area-top safe-area-bottom">
      {/* Mobile Container avec effet Liquid Glass */}
      <div className="w-full h-full bg-white/70 backdrop-blur-2xl overflow-y-auto">
        {/* Header avec verre givré */}
        <div className="px-6 py-6 bg-white/40 backdrop-blur-xl border-b border-white/20 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
            >
              <X className="h-5 w-5" />
            </Button>
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                placeholder="Rechercher un garage..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12"
              />
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="px-6 py-6 bg-white/30 backdrop-blur-sm">
        {loading ? (
          <div className="text-center text-gray-500 py-8">Chargement...</div>
        ) : garages.length > 0 ? (
          <div className="space-y-3">
            {garages.map((garage) => (
              <motion.div
                key={garage.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/10 to-blue-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="relative bg-white/60 backdrop-blur-xl border border-white/40 rounded-2xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.08)] group-hover:shadow-[0_12px_40px_rgba(59,130,246,0.2)] group-hover:border-blue-300/50 transition-all duration-300">
                      <div className="flex gap-4">
                        <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-gray-100/80 to-gray-200/80 backdrop-blur-sm flex-shrink-0 flex items-center justify-center border border-white/30 shadow-sm">
                          <MapPin className="h-7 w-7 text-gray-400" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h3 className="text-gray-900 font-light truncate">{garage.name}</h3>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <Star className="h-4 w-4 fill-blue-600 text-blue-600" />
                              <span className="text-sm font-light text-gray-900">{garage.rating?.toFixed(1) || "4.8"}</span>
                            </div>
                          </div>

                          {garage.description && (
                            <p className="text-xs text-gray-500 font-light mb-2 line-clamp-2">
                              {garage.description}
                            </p>
                          )}

                          {garage.specialties && garage.specialties.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {garage.specialties.slice(0, 3).map((spec: string, idx: number) => (
                                <Badge key={idx} variant="secondary" className="text-xs font-light">
                                  {spec}
                                </Badge>
                              ))}
                            </div>
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
                            <span>127 avis</span>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1 text-xs text-gray-500 font-light">
                              <Clock className="h-3 w-3 text-blue-600" />
                              <span>Aujourd'hui 14h</span>
                            </div>
                            <button
                              className="relative px-4 py-1.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl text-xs font-light shadow-[0_4px_20px_rgba(59,130,246,0.4)] overflow-hidden"
                              onClick={(e) => {
                                e.stopPropagation()
                                router.push(`/reservation?garage=${garage.id}`)
                              }}
                            >
                              <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 hover:opacity-100 transition-opacity" />
                              <span className="relative z-10">Réserver</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-500 py-12">
            <p className="mb-2">Aucun garage trouvé</p>
            <p className="text-sm">Essayez de modifier vos critères de recherche</p>
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
