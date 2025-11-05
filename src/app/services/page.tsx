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
  description: string | null
  section_name: string | null
  section_icon: string | null
  garage_count: number
}

export default function ServicesPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [services, setServices] = useState<Service[]>([])
  const [filteredServices, setFilteredServices] = useState<Service[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [selectedSection, setSelectedSection] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      router.push("/login")
      return
    }

    loadServices()
  }, [user, authLoading, router])

  useEffect(() => {
    filterServices()
  }, [searchQuery, selectedSection, services])

  const loadServices = async () => {
    try {
      setLoading(true)

      // Récupérer tous les services actifs avec leur section et le nombre de garages qui les proposent
      const { data, error } = await supabase
        .from("carslink_garage_services")
        .select(`
          name,
          description,
          garage_id,
          section:carslink_service_sections (
            name,
            icon,
            display_order
          )
        `)
        .eq("is_active", true)

      if (error) {
        console.error("Error loading services:", error)
        setServices([])
        setLoading(false)
        return
      }

      // Grouper les services par nom et compter les garages uniques
      const servicesMap = new Map<string, {
        name: string
        description: string | null
        section_name: string | null
        section_icon: string | null
        garage_ids: Set<string>
      }>()

      if (data) {
        // Compter le nombre de garages uniques par service
        for (const service of data) {
          const serviceName = service.name
          const garageId = service.garage_id
          
          if (!servicesMap.has(serviceName)) {
            servicesMap.set(serviceName, {
              name: serviceName,
              description: service.description || null,
              section_name: (service.section && Array.isArray(service.section) && service.section.length > 0) ? service.section[0].name : (typeof service.section === 'object' && service.section !== null && 'name' in service.section ? service.section.name : null),
              section_icon: (service.section && Array.isArray(service.section) && service.section.length > 0) ? service.section[0].icon : (typeof service.section === 'object' && service.section !== null && 'icon' in service.section ? service.section.icon : null),
              garage_ids: new Set([garageId])
            })
          } else {
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
        section_icon: service.section_icon,
        garage_count: service.garage_ids.size
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
      checkCircle2: CheckCircle2,
    }
    return iconMap[iconName || "wrench"] || Wrench
  }

  // Grouper les services par section
  const groupedServices = filteredServices.reduce((acc, service) => {
    const section = service.section_name || "Autres"
    if (!acc[section]) {
      acc[section] = []
    }
    acc[section].push(service)
    return acc
  }, {} as Record<string, Service[]>)

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50/40 via-white to-purple-50/20 flex items-center justify-center">
        <div className="text-gray-600 font-light">Chargement...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <>
      <div className="h-full w-full bg-gradient-to-br from-blue-50/40 via-white to-purple-50/20 overflow-y-auto pb-20 safe-area-top safe-area-bottom">
        {/* Mobile Container avec effet Liquid Glass */}
        <div className="w-full h-full bg-white/70 backdrop-blur-2xl overflow-y-auto">
          {/* Header avec verre givré */}
          <div className="px-6 py-6 bg-white/40 backdrop-blur-xl border-b border-white/20 sticky top-0 z-10">
            <div className="flex items-center gap-4 mb-6">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.back()}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex-1">
                <h1 className="text-2xl font-light text-gray-900">Tous les services</h1>
                <p className="text-sm text-gray-500 font-light mt-1">
                  {services.length} service{services.length > 1 ? "s" : ""} disponible{services.length > 1 ? "s" : ""}
                </p>
              </div>
            </div>

            {/* Barre de recherche */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none z-10" />
              <Input
                placeholder="Rechercher un service..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10 rounded-xl border-white/30 bg-white/50 backdrop-blur-md font-light text-sm"
              />
            </div>

            {/* Filtres par section */}
            {sections.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                <Button
                  variant={selectedSection === null ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedSection(null)}
                  className="rounded-full text-xs whitespace-nowrap"
                >
                  Tous
                </Button>
                {sections.map((section) => (
                  <Button
                    key={section}
                    variant={selectedSection === section ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedSection(section)}
                    className="rounded-full text-xs whitespace-nowrap"
                  >
                    {section}
                  </Button>
                ))}
              </div>
            )}
          </div>

          {/* Contenu */}
          <div className="px-6 py-6 bg-white/30 backdrop-blur-sm">
            {filteredServices.length === 0 ? (
              <div className="relative border-2 border-dashed border-white/60 rounded-2xl p-12 text-center bg-white/40 backdrop-blur-md">
                <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-light text-gray-900 mb-2">
                  Aucun service trouvé
                </h3>
                <p className="text-gray-500 font-light">
                  {searchQuery ? "Essayez avec d'autres mots-clés" : "Aucun service disponible"}
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedServices).map(([section, sectionServices]) => {
                  const firstService = sectionServices[0]
                  const SectionIcon = getIcon(firstService.section_icon)

                  return (
                    <motion.div
                      key={section}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      {/* En-tête de section */}
                      <div className="flex items-center gap-2 mb-4">
                        <SectionIcon className="h-5 w-5 text-blue-600" />
                        <h2 className="text-lg font-light text-gray-900">{section}</h2>
                        <Badge variant="secondary" className="ml-auto text-xs">
                          {sectionServices.length}
                        </Badge>
                      </div>

                      {/* Liste des services */}
                      <div className="space-y-3">
                        {sectionServices.map((service, index) => (
                          <motion.div
                            key={`${service.name}-${index}`}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.05 }}
                          >
                            <div className="relative group">
                              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/10 to-blue-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                              <button
                                onClick={() => router.push(`/search?service=${encodeURIComponent(service.name)}`)}
                                className="relative w-full bg-white/60 backdrop-blur-xl border border-white/40 rounded-2xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.08)] group-hover:shadow-[0_12px_40px_rgba(59,130,246,0.2)] group-hover:border-blue-300/50 transition-all duration-300 text-left"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1 min-w-0">
                                    <h3 className="font-light text-gray-900 mb-1 text-base">
                                      {service.name}
                                    </h3>
                                    {service.description && (
                                      <p className="text-sm text-gray-500 font-light line-clamp-2">
                                        {service.description}
                                      </p>
                                    )}
                                  </div>
                                  <Badge variant="outline" className="flex-shrink-0 text-xs whitespace-nowrap">
                                    {service.garage_count} garage{service.garage_count > 1 ? "s" : ""}
                                  </Badge>
                                </div>
                              </button>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <BottomNavigation />
    </>
  )
}

