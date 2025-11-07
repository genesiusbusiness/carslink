"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { CheckCircle, Circle, Clock, Wrench, Check, ArrowLeft, MapPin, Phone, Car, Calendar, User, FileText, XCircle } from "lucide-react"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { BottomNavigation } from "@/components/layout/BottomNavigation"
import { useAuth } from "@/lib/hooks/use-auth"
import { supabase } from "@/lib/supabase/client"
import { formatDateTime, formatDate, formatTime } from "@/lib/utils"
import { showElegantToast } from "@/components/ui/elegant-toast"
import type { Appointment, Garage, Vehicle } from "@/lib/types/database"

const STATUS_STEPS = [
  { id: "received", label: "Reçu", icon: CheckCircle },
  { id: "diagnosing", label: "Diagnostic", icon: Wrench },
  { id: "in_progress", label: "En cours", icon: Clock },
  { id: "completed", label: "Terminé", icon: Check },
]

export default function SuiviPage() {
  const router = useRouter()
  const params = useParams()
  const appointmentId = params.id as string
  const { user, loading: authLoading } = useAuth()
  const [appointment, setAppointment] = useState<Appointment | null>(null)
  const [tracking, setTracking] = useState<Appointment | null>(null)
  const [garage, setGarage] = useState<Garage | null>(null)
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    if (!appointmentId) return

    try {
      console.log('🔍 Chargement du suivi pour appointment:', appointmentId)
      
      // Charger l'appointment
      const { data: appointmentData, error: appointmentError } = await supabase
        .from("appointments")
        .select("*")
        .eq("id", appointmentId)
        .single()

      if (appointmentError) {
        console.error("❌ Erreur lors du chargement de l'appointment:", appointmentError)
        throw appointmentError
      }

      console.log('✅ Appointment chargé:', appointmentData)

      if (appointmentData) {
        setAppointment(appointmentData)
        setTracking(appointmentData)

        // Charger le garage
        if (appointmentData.garage_id) {
          console.log('🔍 Chargement du garage:', appointmentData.garage_id)
          const { data: garageData, error: garageError } = await supabase
            .from("carslink_garages")
            .select("*")
            .eq("id", appointmentData.garage_id)
            .single()
          
          if (garageError) {
            console.error("❌ Erreur lors du chargement du garage:", garageError)
          } else if (garageData) {
            console.log('✅ Garage chargé:', garageData)
            setGarage(garageData)
          }
        }

        // Charger le véhicule
        if (appointmentData.vehicle_id) {
          console.log('🔍 Chargement du véhicule:', appointmentData.vehicle_id)
          const { data: vehicleData, error: vehicleError } = await supabase
            .from("vehicles")
            .select("*")
            .eq("id", appointmentData.vehicle_id)
            .single()
          
          if (vehicleError) {
            console.error("❌ Erreur lors du chargement du véhicule:", vehicleError)
          } else if (vehicleData) {
            console.log('✅ Véhicule chargé:', vehicleData)
            setVehicle(vehicleData)
          }
        }
      }
    } catch (error: any) {
      console.error("❌ Erreur inattendue:", error)
      showElegantToast({
        title: "Erreur",
        message: error.message || "Impossible de charger les données",
        variant: "error",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      router.push("/login")
      return
    }

    if (!appointmentId) {
      router.push("/appointments")
      return
    }

    loadData()

    // Subscribe to real-time updates pour appointments
    const appointmentsChannel = supabase
      .channel(`appointment_${appointmentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "appointments",
          filter: `id=eq.${appointmentId}`,
        },
        async (payload) => {
          if (payload.eventType === "UPDATE") {
            const { data: trackingData } = await supabase
              .from("appointments")
              .select("*")
              .eq("id", appointmentId)
              .limit(1)
              .maybeSingle()

            if (trackingData) {
              setTracking(trackingData)
            }
          }
        }
      )
      .subscribe()

    return () => {
      appointmentsChannel.unsubscribe()
    }
  }, [user, appointmentId, router, authLoading])

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-600 mb-2">Chargement du suivi...</div>
          <div className="text-sm text-gray-400">Veuillez patienter</div>
        </div>
      </div>
    )
  }

  if (!appointment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-2">Rendez-vous introuvable</div>
          <Button
            variant="outline"
            onClick={() => router.push("/appointments")}
            className="mt-4"
          >
            Retour aux rendez-vous
          </Button>
        </div>
      </div>
    )
  }

  // Déterminer le statut actuel pour l'affichage des steps
  let mappedStatus = 'received'
  
  if (tracking) {
    // Si on a un tracking, utiliser son statut directement
    mappedStatus = tracking.status || 'received'
  } else {
    // Mapper les statuts d'appointment vers les steps de tracking
    const statusMap: Record<string, string> = {
      'pending': 'received',
      'confirmed': 'received',
      'in_progress': 'in_progress',
      'completed': 'completed',
      'cancelled': 'received',
    }
    mappedStatus = appointment.status ? (statusMap[appointment.status] || 'received') : 'received'
  }

  const currentStepIndex = STATUS_STEPS.findIndex((s) => s.id === mappedStatus)
  const effectiveStepIndex = currentStepIndex >= 0 ? currentStepIndex : 0

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      pending: "secondary",
      confirmed: "default",
      cancelled: "destructive",
      completed: "default",
    }
    return variants[status] || "secondary"
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
              <h1 className="text-2xl font-bold text-gray-900">Suivi de réparation</h1>
              <p className="text-sm text-gray-500">Suivez l'avancement de votre rendez-vous</p>
            </div>
          </div>

          {/* Card principale - Statut de la réparation */}
          <Card className="mb-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
              <CardTitle>Statut de la réparation</CardTitle>
              <CardDescription>
                {appointment.service_type} - {appointment.start_time ? formatDate(appointment.start_time) : 'N/A'}
              </CardDescription>
                </div>
                <Badge variant={getStatusBadge(appointment.status || "pending")}>
                  {appointment.status === "pending" && "En attente"}
                  {appointment.status === "confirmed" && "Confirmé"}
                  {appointment.status === "in_progress" && "En cours"}
                  {appointment.status === "completed" && "Terminé"}
                  {appointment.status === "cancelled" && "Annulé"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {/* Barre de progression des étapes */}
              <div className="space-y-6">
                {STATUS_STEPS.map((step, index) => {
                  const StepIcon = step.icon
                  const isActive = index <= effectiveStepIndex
                  const isCurrent = index === effectiveStepIndex

                  return (
                    <motion.div
                      key={step.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-start gap-4"
                    >
                      <div className="flex flex-col items-center">
                        <div
                          className={`h-12 w-12 rounded-full flex items-center justify-center border-2 transition-all ${
                            isActive
                              ? "bg-violet-500 border-violet-500 text-white"
                              : "bg-gray-100 border-gray-300 text-gray-400"
                          }`}
                        >
                          {isActive ? (
                            <CheckCircle className="h-6 w-6" />
                          ) : (
                            <StepIcon className="h-6 w-6" />
                          )}
                        </div>
                        {index < STATUS_STEPS.length - 1 && (
                          <div
                            className={`w-0.5 h-16 mt-2 ${
                              isActive ? "bg-violet-500" : "bg-gray-200"
                            }`}
                          />
                        )}
                      </div>
                      <div className="flex-1 pt-2">
                        <div
                          className={`font-semibold text-lg ${
                            isActive ? "text-gray-900" : "text-gray-400"
                          }`}
                        >
                          {step.label}
                        </div>
                        {isCurrent && (
                          <div className="text-sm text-violet-600 mt-1">
                            Étape en cours
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )
                })}
              </div>

              {/* Message si pas encore commencé */}
              {appointment.status === "pending" && (
                <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <div className="font-semibold text-blue-900 mb-1">En attente de confirmation</div>
                      <div className="text-sm text-blue-700">
                        Votre rendez-vous est en attente de confirmation par le garage. Vous recevrez une notification dès qu'il sera confirmé.
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Informations du rendez-vous */}
          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Informations du rendez-vous</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Garage */}
              {garage && (
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <MapPin className="h-5 w-5 text-gray-600 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">{garage.name}</div>
                    {garage.address && (
                      <div className="text-sm text-gray-600">{garage.address}</div>
                    )}
                    {garage.phone && (
                      <div className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                        <Phone className="h-4 w-4" />
                        {garage.phone}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Véhicule */}
              {vehicle && (
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <Car className="h-5 w-5 text-gray-600 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">
                      {vehicle.brand} {vehicle.model}
                    </div>
                    {vehicle.license_plate && (
                      <div className="text-sm text-gray-600">Plaque: {vehicle.license_plate}</div>
                    )}
                    {vehicle.year && (
                      <div className="text-sm text-gray-600">Année: {vehicle.year}</div>
                    )}
                  </div>
                </div>
              )}

              {/* Date et heure */}
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <Calendar className="h-5 w-5 text-gray-600 mt-0.5" />
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">Date et heure</div>
                  {appointment.start_time ? (
                    <div className="text-sm text-gray-600">
                      {formatDateTime(appointment.start_time)}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">Non définie</div>
                  )}
                </div>
              </div>

              {/* Service */}
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <Wrench className="h-5 w-5 text-gray-600 mt-0.5" />
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">Service</div>
                  <div className="text-sm text-gray-600">{appointment.service_type || 'N/A'}</div>
                </div>
              </div>

              {/* Notes */}
              {appointment.notes && (
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <FileText className="h-5 w-5 text-gray-600 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 mb-1">Notes</div>
                    <div className="text-sm text-gray-600 whitespace-pre-wrap">{appointment.notes}</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bouton retour */}
          <div className="mt-6">
            <Button
              variant="outline"
              onClick={() => router.push("/appointments")}
              className="w-full rounded-xl"
            >
              Retour à mes rendez-vous
            </Button>
          </div>
        </div>
      </div>

      <BottomNavigation />
    </>
  )
}

