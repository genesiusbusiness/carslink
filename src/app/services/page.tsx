"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Search, ArrowLeft, Wrench, Zap, Shield, Car, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { BottomNavigation } from "@/components/layout/BottomNavigation"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/lib/hooks/use-auth"
import { motion } from "framer-motion"

interface Service {
  name: string
  description?: string | null
  section_name?: string | null
  garage_count: number
  icon?: string | null
}

export default function ServicesPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [services, setServices] = useState<Service[]>([])
  const [filteredServices, setFilteredServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedSection, setSelectedSection] = useState<string | null>(null)

  useEffect(() => {
    loadServices()
  }, [])

  useEffect(() => {
    filterServices()
  }, [searchQuery, selectedSection, services])

  const loadServices = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("carslink_garage_services")
        .select("name, description, section_name, icon, garage_id")
        .eq("is_active", true)

      if (error) throw error

      // Grouper par nom de service et compter les garages
      const servicesMap = new Map<string, { name: string; description?: string | null; section_name?: string | null; icon?: string | null; garage_ids: Set<string> }>()
      
      if (data) {
        for (const service of data) {
          const serviceName = service.name
          const garageId = service.garage_id

          if (!servicesMap.has(serviceName)) {
            servicesMap.set(serviceName, {
              name: serviceName,
              description: service.description,
              section_name: service.section_name,
              icon: service.icon,
              garage_ids: new Set(),
            })
          }
          
          if (garageId) {
            const existing = servicesMap.get(serviceName)!
            existing.garage_ids.add(garageId)
          }
        }
      }

      // Convertir en tableau avec le comptage correct et trier
      const servicesArray: Service[] = Array.from(servicesMap.values()).map(service => ({
        name: service.name,
        description: service.description,
        section_name: service.section_name,
        icon: service.icon,
        garage_count: service.garage_ids.size,
      }))

      servicesArray.sort((a, b) => {
        // Trier par section d'abord
        const sectionA = a.section_name || "Autres"
        const sectionB = b.section_name || "Autres"
        if (sectionA !== sectionB) {
          return sectionA.localeCompare(sectionB)
        }
        // Puis par nombre de garages (décroissant), puis par nom
        if (a.garage_count !== b.garage_count) {
          return b.garage_count - a.garage_count
        }
        return a.name.localeCompare(b.name)
      })

      setServices(servicesArray)
      setFilteredServices(servicesArray)
    } catch (error) {
      console.error("Error loading services:", error)
      setServices([])
    } finally {
      setLoading(false)
    }
  }

  const filterServices = () => {
    let filtered = [...services]

    // Filtre par recherche
    if (searchQuery.trim().length > 0) {
      const queryLower = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (service) =>
          service.name.toLowerCase().includes(queryLower) ||
          (service.description && service.description.toLowerCase().includes(queryLower)) ||
          (service.section_name && service.section_name.toLowerCase().includes(queryLower))
      )
    }

    // Filtre par section
    if (selectedSection) {
      filtered = filtered.filter(
        (service) => (service.section_name || "Autres") === selectedSection
      )
    }

    setFilteredServices(filtered)
  }

  // Obtenir toutes les sections uniques
  const sections = Array.from(new Set(services.map((s) => s.section_name || "Autres"))).sort()

  // Icon mapping
  const getIcon = (iconName: string | null) => {
    const iconMap: Record<string, any> = {
      wrench: Wrench,
      zap: Zap,
      shield: Shield,
      car: Car,
    }
    return iconMap[iconName || "wrench"] || Wrench
  }

  return (
    <>
      <div className="fixed inset-0 w-full h-full overflow-y-auto bg-gradient-to-br from-blue-50/40 via-white to-purple-50/20 pb-28 sm:pb-32 safe-area-top safe-area-bottom">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-28 sm:pb-32">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="h-10 w-10 rounded-xl hover:bg-gray-100"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">Services</h1>
              <p className="text-sm text-gray-500">Tous les services disponibles</p>
            </div>
          </div>

          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Rechercher un service..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 h-12 rounded-xl border-2 border-gray-200 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Services List */}
          {loading ? (
            <div className="text-center py-12">
              <div className="text-gray-500">Chargement...</div>
            </div>
          ) : filteredServices.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-500">Aucun service trouvé</div>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredServices.map((service, index) => {
                const Icon = getIcon(service.icon || null)
                return (
                  <motion.div
                    key={service.name}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-white/60 backdrop-blur-xl border border-white/40 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer"
                    onClick={() => router.push(`/search?service=${encodeURIComponent(service.name)}`)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-medium text-gray-900 mb-1">{service.name}</h3>
                        {service.description && (
                          <p className="text-sm text-gray-600 mb-2">{service.description}</p>
                        )}
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {service.garage_count} garage{service.garage_count > 1 ? "s" : ""}
                          </Badge>
                          {service.section_name && (
                            <Badge variant="secondary" className="text-xs">
                              {service.section_name}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <CheckCircle2 className="h-5 w-5 text-blue-600 flex-shrink-0" />
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <BottomNavigation />
    </>
  )
}

