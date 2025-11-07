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
  otherServiceDescription?: string
  onOtherServiceChange?: (description: string) => void
  otherServiceFiles?: File[]
  onOtherServiceFilesChange?: (files: File[]) => void
  servicePrices?: Record<string, number | null> // Prix par service ID
}

export function ServiceSelector({
  selectedService,
  onSelectService,
  additionalOptions = {
    courtesyVehicle: false,
  },
  onAdditionalOptionsChange,
  otherServiceDescription = "",
  onOtherServiceChange,
  otherServiceFiles = [],
  onOtherServiceFilesChange,
  servicePrices,
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
  otherServiceDescription?: string
  onOtherServiceChange?: (description: string) => void
  otherServiceFiles?: File[]
  onOtherServiceFilesChange?: (files: File[]) => void
  servicePrices?: Record<string, number | null>
}) {
  const [showOtherService, setShowOtherService] = useState(false)
  const [otherServiceDesc, setOtherServiceDesc] = useState(otherServiceDescription)
  const [otherFiles, setOtherFiles] = useState<File[]>(otherServiceFiles)

  const handleServiceClick = (serviceId: string, serviceLabel: string) => {
    onSelectService(serviceId, serviceLabel)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const newFiles = [...otherFiles, ...files]
    setOtherFiles(newFiles)
    onOtherServiceFilesChange?.(newFiles)
  }

  const removeFile = (index: number) => {
    const newFiles = otherFiles.filter((_, i) => i !== index)
    setOtherFiles(newFiles)
    onOtherServiceFilesChange?.(newFiles)
  }

  const services = [
    { id: "revision", label: "Révision", icon: Wrench, price: servicePrices?.revision },
    { id: "vidange", label: "Vidange", icon: Droplet, price: servicePrices?.vidange },
    { id: "freinage", label: "Freinage", icon: CircleDot, price: servicePrices?.freinage },
    { id: "climatisation", label: "Climatisation", icon: Wind, price: servicePrices?.climatisation },
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {services.map((service) => {
          const isSelected = selectedService === service.id
          const Icon = service.icon

          return (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card
                className={`border-2 cursor-pointer transition-all ${
                  isSelected
                    ? "border-blue-500 bg-blue-50 shadow-md"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <CardContent className="p-0">
                  <button
                    onClick={() => handleServiceClick(service.id, service.label)}
                    className="w-full p-4 flex flex-col items-center gap-2"
                  >
                    <div
                      className={`h-12 w-12 rounded-lg flex items-center justify-center ${
                        isSelected
                          ? "bg-gradient-to-br from-blue-600 to-purple-600"
                          : "bg-gray-100"
                      }`}
                    >
                      <Icon
                        className={`h-6 w-6 ${
                          isSelected ? "text-white" : "text-gray-600"
                        }`}
                      />
                    </div>
                    <span
                      className={`font-semibold text-sm ${
                        isSelected ? "text-blue-900" : "text-gray-900"
                      }`}
                    >
                      {service.label}
                    </span>
                    {service.price && (
                      <Badge variant="secondary" className="text-xs">
                        {service.price.toFixed(0)}€
                      </Badge>
                    )}
                  </button>
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
                      value={otherServiceDesc}
                      onChange={(e) => {
                        setOtherServiceDesc(e.target.value)
                        onOtherServiceChange?.(e.target.value)
                      }}
                      placeholder="Décrivez en détail le problème ou le service dont vous avez besoin..."
                      className="w-full h-32 px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                      maxLength={1000}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {otherServiceDesc.length}/1000
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

                      {otherFiles.length > 0 && (
                        <div className="grid grid-cols-3 gap-2">
                          {otherFiles.map((file, index) => (
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
                  {showOtherService && otherServiceDesc.trim().length > 10 && (
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
          ].map((option) => {
            const isChecked = additionalOptions?.courtesyVehicle || false
            const Icon = option.icon

            return (
              <motion.button
                key={option.id}
                onClick={() => {
                  const newOptions = {
                    ...additionalOptions,
                    courtesyVehicle: !isChecked,
                  }
                  onAdditionalOptionsChange?.(newOptions)
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

