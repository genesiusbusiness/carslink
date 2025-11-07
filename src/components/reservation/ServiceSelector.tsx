"use client"

import { useState, useEffect } from "react"
import { Wrench, Droplet, Filter, Gauge, Car as CarIcon, Zap, Shield, Car, Settings, Battery, Wind, Radio, CircleDot, ChevronDown, ChevronUp } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { supabase } from "@/lib/supabase/client"

interface ServiceOption {
  id: string
  label: string
  icon: typeof Wrench
  section_name?: string | null
  price?: number | null
}

interface ServiceCategory {
  name: string
  icon: typeof Wrench
  services: ServiceOption[]
}

export function ServiceSelector({
  selectedService,
  onSelectService,
  additionalOptions = {
    courtesyVehicle: false,
  },
  onAdditionalOptionsChange,
  servicePrices,
  isFromGarageDetails = false,
}: {
  selectedService: string
  onSelectService: (serviceId: string, serviceLabel: string) => void
  additionalOptions?: {
    courtesyVehicle: boolean
    pickupService?: boolean
    homePickup?: boolean
    expressBooking?: boolean
    otherService?: boolean
  }
  onAdditionalOptionsChange?: (options: { courtesyVehicle: boolean; pickupService?: boolean; homePickup?: boolean; expressBooking?: boolean; otherService?: boolean }) => void
  servicePrices?: Record<string, number | null>
  isFromGarageDetails?: boolean
}) {
  const [services, setServices] = useState<ServiceOption[]>([])
  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

  // Icon mapping
  const getIcon = (iconName: string | null | undefined, sectionIcon: string | null | undefined) => {
    const iconMap: Record<string, any> = {
      wrench: Wrench,
      droplet: Droplet,
      filter: Filter,
      gauge: Gauge,
      zap: Zap,
      shield: Shield,
      car: Car,
      settings: Settings,
      battery: Battery,
      wind: Wind,
      radio: Radio,
      circledot: CircleDot,
    }
    
    // Essayer d'abord l'icône de la section, puis l'icône du service
    const iconToUse = sectionIcon || iconName || "wrench"
    return iconMap[iconToUse.toLowerCase()] || Wrench
  }

  useEffect(() => {
    loadServices()
  }, [])

  // Mettre à jour les prix des services quand servicePrices change
  useEffect(() => {
    if (servicePrices && services.length > 0) {
      console.log('💰 Mise à jour des prix des services:', servicePrices)
      console.log('📋 Services actuels:', services.map(s => ({ id: s.id, label: s.label })))
      
      setServices(prevServices => 
        prevServices.map(service => {
          const price = servicePrices[service.id] ?? null
          if (price !== null) {
            console.log(`✅ Prix trouvé pour ${service.label} (${service.id}): ${price}€`)
          } else {
            console.log(`❌ Pas de prix pour ${service.label} (${service.id})`)
          }
          return { ...service, price }
        })
      )
      
      // Mettre à jour aussi les catégories avec les nouveaux prix
      setCategories(prevCategories =>
        prevCategories.map(category => ({
          ...category,
          services: category.services.map(service => {
            const price = servicePrices[service.id] ?? null
            return { ...service, price }
          })
        }))
      )
    }
  }, [servicePrices, services.length])

  const loadServices = async () => {
    setLoading(true)
    try {
      console.log('🔍 Chargement des services depuis la base de données...')
      const { data, error } = await supabase
        .from("carslink_garage_services")
        .select(`
          name,
          description,
          section:carslink_service_sections (
            name,
            icon
          )
        `)
        .eq("is_active", true)

      if (error) {
        console.error("❌ Erreur lors du chargement des services:", error)
        throw error
      }

      console.log('✅ Services chargés:', data?.length || 0)

      // Grouper par nom de service (pour éviter les doublons)
      const servicesMap = new Map<string, { name: string; section_name?: string | null; section_icon?: string | null }>()
      
      if (data) {
        for (const service of data) {
          const serviceName = service.name
          // section peut être un objet ou un tableau selon la requête Supabase
          const section = Array.isArray(service.section) ? service.section[0] : service.section
          const sectionName = section?.name || null
          const sectionIcon = section?.icon || null

          // Ne garder que le premier service trouvé pour chaque nom (ou prioriser ceux avec section "Entretien & révision")
          if (!servicesMap.has(serviceName)) {
            servicesMap.set(serviceName, {
              name: serviceName,
              section_name: sectionName,
              section_icon: sectionIcon,
            })
          }
        }
      }

      // Convertir en tableau et trier
      const servicesArray: ServiceOption[] = Array.from(servicesMap.values()).map(service => {
        const serviceId = service.name.toLowerCase().replace(/\s+/g, '_')
        // Récupérer le prix si disponible
        const price = servicePrices?.[serviceId] ?? null
        
        return {
          id: serviceId,
          label: service.name,
          icon: getIcon(null, service.section_icon),
          section_name: service.section_name,
          price: price,
        }
      })

      // Trier les services par nom dans chaque section
      servicesArray.sort((a, b) => a.label.localeCompare(b.label))

      // Grouper les services par catégorie (section)
      const categoriesMap = new Map<string, ServiceOption[]>()
      
      servicesArray.forEach(service => {
        const categoryName = service.section_name || "Autres"
        if (!categoriesMap.has(categoryName)) {
          categoriesMap.set(categoryName, [])
        }
        categoriesMap.get(categoryName)!.push(service)
      })

      // Convertir en tableau de catégories avec leurs icônes
      const categoriesArray: ServiceCategory[] = Array.from(categoriesMap.entries()).map(([categoryName, categoryServices]) => {
        // Utiliser l'icône du premier service de la catégorie ou une icône par défaut
        const firstService = categoryServices[0]
        const categoryIcon = firstService?.icon || Wrench
        
        return {
          name: categoryName,
          icon: categoryIcon,
          services: categoryServices,
        }
      })

      // Trier les catégories : "Entretien & révision" en premier, puis les autres par ordre alphabétique
      categoriesArray.sort((a, b) => {
        const isMaintenanceA = a.name.toLowerCase().includes("entretien") || a.name.toLowerCase().includes("révision")
        const isMaintenanceB = b.name.toLowerCase().includes("entretien") || b.name.toLowerCase().includes("révision")
        
        if (isMaintenanceA && !isMaintenanceB) return -1
        if (!isMaintenanceA && isMaintenanceB) return 1
        
        return a.name.localeCompare(b.name)
      })

      // Ouvrir la première catégorie par défaut (généralement "Entretien & révision")
      if (categoriesArray.length > 0) {
        setExpandedCategories(new Set([categoriesArray[0].name]))
      }

      console.log('✅ Services formatés:', servicesArray.length)
      console.log('✅ Catégories:', categoriesArray.length)
      setServices(servicesArray)
      setCategories(categoriesArray)
    } catch (error) {
      console.error("Error loading services:", error)
      setServices([])
    } finally {
      setLoading(false)
    }
  }

  const handleServiceClick = (serviceId: string, serviceLabel: string) => {
    onSelectService(serviceId, serviceLabel)
  }

  const toggleCategory = (categoryName: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev)
      if (newSet.has(categoryName)) {
        newSet.delete(categoryName)
      } else {
        newSet.add(categoryName)
      }
      return newSet
    })
  }

  return (
    <div className="w-full max-w-[430px] mx-auto space-y-6">
      {/* Progress bar */}
      <div className="w-full h-1 rounded-full bg-gray-200 overflow-hidden">
        <motion.div
          className="h-full bg-violet-500 rounded-full"
          initial={{ width: "0%" }}
          animate={{ width: "20%" }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Liste des catégories avec menus déroulants */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-4 text-gray-500 text-sm">Chargement des services...</div>
        ) : categories.length === 0 ? (
          <div className="text-center py-4 text-gray-500 text-sm">Aucun service disponible</div>
        ) : (
          categories.map((category, categoryIndex) => {
            const isExpanded = expandedCategories.has(category.name)
            const CategoryIcon = category.icon

          return (
            <motion.div
                key={category.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: categoryIndex * 0.05 }}
                className="rounded-2xl border bg-white/50 backdrop-blur p-3 md:p-4 hover:shadow-sm transition"
              >
                {/* En-tête de la catégorie (cliquable pour ouvrir/fermer) */}
                  <button
                  onClick={() => toggleCategory(category.name)}
                  className="w-full flex items-center justify-between gap-3 mb-4 focus:outline-none focus:ring-2 focus:ring-violet-400 rounded-lg p-1 -m-1"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full border flex items-center justify-center bg-gradient-to-br from-violet-600 to-indigo-600">
                      <CategoryIcon className="h-4 w-4 text-white" />
                    </div>
                    <h3 className="font-medium text-gray-900">{category.name}</h3>
                    <span className="text-xs text-gray-500">({category.services.length})</span>
            </div>
            <motion.div
                    animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
                    <ChevronDown className="h-5 w-5 text-gray-400" />
            </motion.div>
          </button>

                {/* Liste des services de la catégorie (déroulante) */}
          <AnimatePresence>
                  {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                      <div className="space-y-3">
                        {category.services.map((service, serviceIndex) => {
                          const isSelected = selectedService === service.id
                          const Icon = service.icon

                          return (
                            <motion.button
                              key={service.id}
                              onClick={() => handleServiceClick(service.id, service.label)}
                              aria-pressed={isSelected}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.2, delay: serviceIndex * 0.03 }}
                              className={`w-full rounded-xl border px-4 py-3 text-left transition-all focus:outline-none focus:ring-2 focus:ring-violet-400 ${
                                isSelected
                                  ? "border-violet-500 bg-violet-50 shadow-sm"
                                  : "border-gray-200 hover:bg-gray-50 active:scale-[0.99]"
                              }`}
                              whileTap={{ scale: 0.99 }}
                            >
                              <div className="flex items-center gap-3">
                                {/* Icône ou dot à gauche */}
                                <div
                                  className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                    isSelected
                                      ? "bg-gradient-to-br from-violet-600 to-indigo-600 text-white"
                                      : "bg-gray-100 text-gray-600"
                                  }`}
                                >
                                  {isSelected ? (
                                    <Icon className="h-4 w-4" />
                                  ) : (
                                    <div className="h-2 w-2 rounded-full bg-gray-400" />
                                  )}
                                </div>
                                <div className="flex-1 flex items-center justify-between gap-2">
                                  <span
                                    className={`font-medium ${
                                      isSelected ? "text-violet-900" : "text-gray-900"
                                    }`}
                                  >
                                    {service.label}
                                  </span>
                                  {isFromGarageDetails && service.price !== null && service.price !== undefined && (
                                    <span className="text-sm font-semibold text-violet-600 whitespace-nowrap">
                                      {service.price.toFixed(0)}€
                                    </span>
                      )}
                    </div>
                  </div>
                            </motion.button>
                          )
                        })}
                    </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })
            )}
      </div>

      {/* Options supplémentaires */}
      <div className="mt-6">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Options supplémentaires</h4>
              <motion.button
                onClick={() => {
                  const newOptions = {
                    ...additionalOptions,
              courtesyVehicle: !additionalOptions?.courtesyVehicle,
                  }
                  onAdditionalOptionsChange?.(newOptions)
                }}
          aria-pressed={additionalOptions?.courtesyVehicle || false}
          className={`w-full rounded-xl border px-4 py-3 text-left transition-all focus:outline-none focus:ring-2 focus:ring-violet-400 ${
            additionalOptions?.courtesyVehicle
              ? "border-violet-500 bg-violet-50"
              : "border-gray-200 hover:bg-gray-50 active:scale-[0.99]"
          }`}
                whileTap={{ scale: 0.99 }}
              >
                <div className="flex items-center gap-3">
                  <div
              className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                additionalOptions?.courtesyVehicle
                  ? "bg-gradient-to-br from-violet-600 to-indigo-600 text-white"
                  : "bg-gray-100 text-gray-600"
                    }`}
                  >
              {additionalOptions?.courtesyVehicle ? (
                <CarIcon className="h-4 w-4" />
              ) : (
                <div className="h-2 w-2 rounded-full bg-gray-400" />
              )}
                  </div>
                  <span
                    className={`font-medium ${
                additionalOptions?.courtesyVehicle ? "text-violet-900" : "text-gray-900"
                    }`}
                  >
              Véhicule de courtoisie
                  </span>
                </div>
              </motion.button>
      </div>
    </div>
  )
}

