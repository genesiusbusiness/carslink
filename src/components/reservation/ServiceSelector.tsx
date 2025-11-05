"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Wrench, Droplet, Filter, Gauge, 
  CircleDot, Car, Settings, 
  Wind, Battery, Zap, Radio,
  Circle, ArrowRight, ChevronRight,
  Clock, Home, Car as CarIcon,
  Upload, X, Image as ImageIcon
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface ServiceOption {
  id: string
  label: string
  icon: any
}

interface ServiceCategory {
  id: string
  label: string
  icon: any
  services: ServiceOption[]
}

const SERVICE_CATEGORIES: ServiceCategory[] = [
  {
    id: "entretien",
    label: "Entretien et révision",
    icon: Wrench,
    services: [
      { id: "vidange", label: "Vidange & entretien", icon: Droplet },
      { id: "revision", label: "Révision constructeur complète", icon: Gauge },
      { id: "filtres", label: "Changement filtres (huile, air, carburant)", icon: Filter },
      { id: "controle", label: "Préparation contrôle technique", icon: Car },
    ]
  },
  {
    id: "reparations",
    label: "Réparations mécaniques",
    icon: Settings,
    services: [
      { id: "freinage", label: "Freinage (plaquettes, disques, liquide)", icon: CircleDot },
      { id: "suspension", label: "Suspension & amortisseurs", icon: Car },
      { id: "embrayage", label: "Embrayage & transmission", icon: Settings },
      { id: "moteur", label: "Moteur / diagnostic électronique", icon: Gauge },
    ]
  },
  {
    id: "electricite",
    label: "Électricité & confort",
    icon: Zap,
    services: [
      { id: "climatisation", label: "Climatisation (recharge / nettoyage)", icon: Wind },
      { id: "batterie", label: "Batterie (test / remplacement)", icon: Battery },
      { id: "electricite", label: "Électricité / phares / vitres", icon: Zap },
      { id: "accessoires", label: "Installation accessoires (autoradio, caméra, attelage)", icon: Radio },
    ]
  },
  {
    id: "pneus",
    label: "Pneus et roues",
    icon: Circle,
    services: [
      { id: "changement_pneus", label: "Changement de pneus", icon: Circle },
      { id: "equilibrage", label: "Équilibrage / parallélisme", icon: Circle },
      { id: "permutation", label: "Permutation pneus été / hiver", icon: Circle },
    ]
  },
  {
    id: "carrosserie",
    label: "Carrosserie & esthétique",
    icon: Car,
    services: [
      { id: "carrosserie", label: "Carrosserie / peinture", icon: Car },
      { id: "polissage", label: "Polissage / débosselage", icon: Car },
      { id: "nettoyage", label: "Nettoyage intérieur / extérieur", icon: Car },
    ]
  },
  {
    id: "urgences",
    label: "Services rapides & urgences",
    icon: Clock,
    services: [
      { id: "depannage", label: "Réparation urgente / dépannage", icon: Clock },
      { id: "devis", label: "Devis uniquement (sans réparation immédiate)", icon: Car },
    ]
  }
]

interface ServiceSelectorProps {
  selectedService: string
  onSelectService: (serviceId: string, serviceLabel: string) => void
  additionalOptions?: {
    courtesyVehicle: boolean
    homePickup: boolean
    expressBooking: boolean
  }
  onAdditionalOptionsChange?: (options: {
    courtesyVehicle: boolean
    homePickup: boolean
    expressBooking: boolean
  }) => void
  otherServiceDescription?: string
  onOtherServiceChange?: (description: string) => void
  otherServiceFiles?: File[]
  onOtherServiceFilesChange?: (files: File[]) => void
}

export function ServiceSelector({
  selectedService,
  onSelectService,
  additionalOptions = {
    courtesyVehicle: false,
    homePickup: false,
    expressBooking: false,
  },
  onAdditionalOptionsChange,
  otherServiceDescription = "",
  onOtherServiceChange,
  otherServiceFiles = [],
  onOtherServiceFilesChange,
}: ServiceSelectorProps) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  const [showOtherService, setShowOtherService] = useState(false)

  const handleServiceClick = (serviceId: string, serviceLabel: string) => {
    if (serviceId === "autre") {
      setShowOtherService(true)
      onSelectService(serviceId, serviceLabel)
    } else {
      setShowOtherService(false)
      onSelectService(serviceId, serviceLabel)
      // Fermer les catégories quand un service est sélectionné
      setExpandedCategory(null)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && onOtherServiceFilesChange) {
      const files = Array.from(e.target.files)
      onOtherServiceFilesChange([...otherServiceFiles, ...files])
    }
  }

  const removeFile = (index: number) => {
    if (onOtherServiceFilesChange) {
      const newFiles = otherServiceFiles.filter((_, i) => i !== index)
      onOtherServiceFilesChange(newFiles)
    }
  }

  const getSelectedServiceLabel = () => {
    if (selectedService === "autre") return "Autre (décrire le problème)"
    
    for (const category of SERVICE_CATEGORIES) {
      const service = category.services.find(s => s.id === selectedService)
      if (service) return service.label
    }
    return selectedService
  }

  return (
    <div className="space-y-4">
      {/* Affichage du service sélectionné */}
      {selectedService && !showOtherService && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border-2 border-blue-200 shadow-md"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                <Wrench className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="font-semibold text-gray-900">Service sélectionné</div>
                <div className="text-sm text-gray-600">{getSelectedServiceLabel()}</div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onSelectService("", "")
                setShowOtherService(false)
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>
      )}

      {/* Catégories de services */}
      <div className="space-y-3">
        {SERVICE_CATEGORIES.map((category) => {
          const Icon = category.icon
          const isExpanded = expandedCategory === category.id

          return (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Card
                className={`border-2 transition-all duration-300 ${
                  isExpanded
                    ? "border-blue-300 shadow-lg bg-gradient-to-br from-blue-50/50 to-purple-50/50"
                    : "border-gray-200 hover:border-gray-300 hover:shadow-md"
                }`}
              >
                <CardContent className="p-0">
                  <button
                    onClick={() => setExpandedCategory(isExpanded ? null : category.id)}
                    className="w-full p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      <span className="font-semibold text-gray-900 text-left">
                        {category.label}
                      </span>
                    </div>
                    <motion.div
                      animate={{ rotate: isExpanded ? 90 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ArrowRight className="h-5 w-5 text-gray-400" />
                    </motion.div>
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 space-y-2 border-t border-gray-200 pt-4">
                          {category.services.map((service) => {
                            const ServiceIcon = service.icon
                            const isSelected = selectedService === service.id

                            return (
                              <motion.button
                                key={service.id}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleServiceClick(service.id, service.label)
                                }}
                                className={`w-full p-3 rounded-xl border-2 text-left transition-all duration-200 ${
                                  isSelected
                                    ? "border-blue-500 bg-blue-50 shadow-md backdrop-blur-sm bg-opacity-80 ring-2 ring-blue-200"
                                    : "border-gray-200 hover:border-blue-300 hover:bg-blue-50/50"
                                }`}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                              >
                                <div className="flex items-center gap-3">
                                  <div
                                    className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                      isSelected
                                        ? "bg-gradient-to-br from-blue-600 to-purple-600"
                                        : "bg-gray-100"
                                    }`}
                                  >
                                    <ServiceIcon
                                      className={`h-4 w-4 ${
                                        isSelected ? "text-white" : "text-gray-600"
                                      }`}
                                    />
                                  </div>
                                  <span
                                    className={`font-medium ${
                                      isSelected ? "text-blue-900" : "text-gray-900"
                                    }`}
                                  >
                                    {service.label}
                                  </span>
                                  {isSelected && (
                                    <motion.div
                                      initial={{ scale: 0 }}
                                      animate={{ scale: 1 }}
                                      className="ml-auto"
                                    >
                                      <div className="h-5 w-5 rounded-full bg-blue-600 flex items-center justify-center">
                                        <div className="h-2 w-2 rounded-full bg-white" />
                                      </div>
                                    </motion.div>
                                  )}
                                </div>
                              </motion.button>
                            )
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* Option "Autre" */}
      <Card className="border-2 border-gray-200 hover:border-blue-300 transition-all">
        <CardContent className="p-0">
          <button
            onClick={() => {
              setShowOtherService(!showOtherService)
              if (!showOtherService) {
                handleServiceClick("autre", "Autre (décrire le problème)")
              } else {
                onSelectService("", "")
              }
            }}
            className={`w-full p-4 flex items-center justify-between ${
              showOtherService || selectedService === "autre"
                ? "bg-gradient-to-r from-blue-50 to-purple-50"
                : ""
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                  showOtherService || selectedService === "autre"
                    ? "bg-gradient-to-br from-blue-600 to-purple-600"
                    : "bg-gray-100"
                }`}
              >
                <Wrench
                  className={`h-5 w-5 ${
                    showOtherService || selectedService === "autre"
                      ? "text-white"
                      : "text-gray-600"
                  }`}
                />
              </div>
              <span className="font-semibold text-gray-900">Autre (décrire le problème)</span>
            </div>
            <motion.div
              animate={{ rotate: showOtherService ? 90 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ArrowRight className="h-5 w-5 text-gray-400" />
            </motion.div>
          </button>

          <AnimatePresence>
            {showOtherService && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 space-y-4 border-t border-gray-200 pt-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      Décrivez votre problème
                    </label>
                    <textarea
                      value={otherServiceDescription}
                      onChange={(e) => onOtherServiceChange?.(e.target.value)}
                      placeholder="Décrivez en détail le problème ou le service dont vous avez besoin..."
                      className="w-full h-32 px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                      maxLength={1000}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {otherServiceDescription.length}/1000
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      Ajouter des photos/vidéos (optionnel)
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all cursor-pointer">
                        <Upload className="h-5 w-5 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          Cliquez pour ajouter des fichiers
                        </span>
                        <input
                          type="file"
                          multiple
                          accept="image/*,video/*"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </label>

                      {otherServiceFiles.length > 0 && (
                        <div className="grid grid-cols-3 gap-2">
                          {otherServiceFiles.map((file, index) => (
                            <div
                              key={index}
                              className="relative aspect-square rounded-lg overflow-hidden border-2 border-gray-200 group"
                            >
                              {file.type.startsWith("image/") ? (
                                <img
                                  src={URL.createObjectURL(file)}
                                  alt={`Upload ${index + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                                  <ImageIcon className="h-8 w-8 text-gray-400" />
                                </div>
                              )}
                              <button
                                onClick={() => removeFile(index)}
                                className="absolute top-1 right-1 h-6 w-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="h-4 w-4" />
                              </button>
                              <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 truncate">
                                {file.name}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Bouton continuer pour service "autre" */}
                  {showOtherService && otherServiceDescription.trim().length > 10 && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <Button
                        onClick={() => {
                          // Le parent gère la navigation via onSelectService
                          onSelectService("autre", "Autre (décrire le problème)")
                        }}
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                      >
                        Continuer avec cette description
                        <ChevronRight className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Options supplémentaires */}
      <div className="pt-4 border-t border-gray-200">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Options supplémentaires</h4>
        <div className="space-y-2">
          {[
            {
              id: "courtesyVehicle",
              label: "Véhicule de courtoisie",
              icon: CarIcon,
            },
            {
              id: "homePickup",
              label: "Prise à domicile / livraison",
              icon: Home,
            },
            {
              id: "expressBooking",
              label: "Réservation express (urgence 24h)",
              icon: Clock,
            },
          ].map((option) => {
            const Icon = option.icon
            const isChecked = additionalOptions[option.id as keyof typeof additionalOptions]

            return (
              <motion.button
                key={option.id}
                onClick={() => {
                  if (onAdditionalOptionsChange) {
                    onAdditionalOptionsChange({
                      ...additionalOptions,
                      [option.id]: !isChecked,
                    })
                  }
                }}
                className={`w-full p-3 rounded-xl border-2 text-left transition-all duration-200 ${
                  isChecked
                    ? "border-blue-500 bg-blue-50 shadow-md"
                    : "border-gray-200 hover:border-gray-300"
                }`}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      isChecked
                        ? "bg-gradient-to-br from-blue-600 to-purple-600"
                        : "bg-gray-100"
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 ${
                        isChecked ? "text-white" : "text-gray-600"
                      }`}
                    />
                  </div>
                  <span
                    className={`font-medium ${
                      isChecked ? "text-blue-900" : "text-gray-900"
                    }`}
                  >
                    {option.label}
                  </span>
                  {isChecked && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="ml-auto"
                    >
                      <div className="h-5 w-5 rounded-full bg-blue-600 flex items-center justify-center">
                        <div className="h-2 w-2 rounded-full bg-white" />
                      </div>
                    </motion.div>
                  )}
                </div>
              </motion.button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

