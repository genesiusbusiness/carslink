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
import type { Appointment, RepairTracking, Garage, Vehicle } from "@/lib/types/database"

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
  const [tracking, setTracking] = useState<RepairTracking | null>(null)
  const [garage, setGarage] = useState<Garage | null>(null)
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [loading, setLoading] = useState(true)

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
        () => {
          loadData()
        }
      )
      .subscribe()

    // Subscribe to real-time updates pour repairs_tracking
    const trackingChannel = supabase
      .channel(`tracking_${appointmentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "repairs_tracking",
          filter: `appointment_id=eq.${appointmentId}`,
        },
        () => {
          loadData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(appointmentsChannel)
      supabase.removeChannel(trackingChannel)
    }
  }, [user, router, appointmentId, authLoading])

  const loadData = async () => {
    if (!user || !appointmentId) return

    setLoading(true)
    try {
      // Charger le rendez-vous
      const { data: appointmentData, error: appointmentError } = await supabase
        .from("appointments")
        .select("*")
        .eq("id", appointmentId)
        .eq("flynesis_user_id", user.id)
        .single()

      if (appointmentError || !appointmentData) {
        throw new Error("Rendez-vous introuvable")
      }

      setAppointment(appointmentData)

      // Charger le tracking
      const { data: trackingData } = await supabase
        .from("repairs_tracking")
        .select("*")
        .eq("appointment_id", appointmentId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (trackingData) {
        setTracking(trackingData)
      }

      // Charger le garage
      if (appointmentData.garage_id) {
        const { data: garageData } = await supabase
          .from("carslink_garages")
          .select("*")
          .eq("id", appointmentData.garage_id)
          .single()

        if (garageData) {
          setGarage(garageData)
        }
      }

      // Charger le véhicule
      if (appointmentData.vehicle_id) {
        const { data: vehicleData } = await supabase
          .from("vehicles")
          .select("*")
          .eq("id", appointmentData.vehicle_id)
          .single()

        if (vehicleData) {
          setVehicle(vehicleData)
        }
      }
    } catch (error: any) {
      console.error("Error loading data:", error)
      showElegantToast({
        title: "Erreur",
        message: error.message || "Impossible de charger les détails du rendez-vous",
        variant: "error",
      })
      setTimeout(() => router.push("/appointments"), 2000)
    } finally {
      setLoading(false)
    }
  }

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
    mappedStatus = statusMap[appointment.status] || 'received'
  }

  const currentStepIndex = STATUS_STEPS.findIndex((s) => s.id === mappedStatus)
  const effectiveStepIndex = currentStepIndex >= 0 ? currentStepIndex : 0

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      pending: "secondary",
      confirmed: "default",
      in_progress: "default",
      completed: "default",
      cancelled: "destructive",
    }

    const labels: Record<string, string> = {
      pending: "En attente",
      confirmed: "Confirmé",
      in_progress: "En cours",
      completed: "Terminé",
      cancelled: "Annulé",
    }

    return (
      <Badge variant={variants[status] || "secondary"} className="text-xs">
        {labels[status] || status}
      </Badge>
    )
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
                <h1 className="text-2xl font-light text-gray-900">Suivi de la réparation</h1>
              </div>
            </div>
          </div>

          {/* Contenu */}
          <div className="px-6 py-6 bg-white/30 backdrop-blur-sm">
            {/* Informations du rendez-vous */}
            <Card className="mb-4 bg-white/60 backdrop-blur-xl border border-white/40 shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {appointment.service_type}
                  {getStatusBadge(appointment.status)}
                </CardTitle>
                <CardDescription>
                  {appointment.start_time ? (
                    <>
                      {formatDate(appointment.start_time)} à {formatTime(appointment.start_time)}
                    </>
                  ) : (
                    "Date non renseignée"
                  )}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Véhicule */}
            {vehicle && (
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                  <Car className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <div className="text-sm text-gray-600 mb-1">Véhicule</div>
                  <div className="font-semibold text-gray-900">
                    {vehicle.brand} {vehicle.model}
                  </div>
                  {vehicle.license_plate && (
                    <div className="text-sm text-gray-600 mt-1">
                      <span className="font-mono bg-white px-2 py-0.5 rounded">
                        {vehicle.license_plate}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Garage */}
            {garage && (
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center flex-shrink-0">
                  <MapPin className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <div className="text-sm text-gray-600 mb-1">Garage</div>
                  <div className="font-semibold text-gray-900 mb-1">{garage.name}</div>
                  <div className="space-y-1 text-sm text-gray-600">
                    {garage.address && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        <span>{garage.address}</span>
                      </div>
                    )}
                    {garage.city && garage.postal_code && (
                      <div>{garage.postal_code} {garage.city}</div>
                    )}
                    {garage.phone && (
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        <a href={`tel:${garage.phone}`} className="text-blue-600 hover:underline">
                          {garage.phone}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Notes du rendez-vous */}
            {appointment.notes && (
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
                <div className="text-sm text-gray-600 mb-1">Vos notes</div>
                <div className="text-sm text-gray-900">{appointment.notes}</div>
              </div>
            )}
          </CardContent>
        </Card>

            {/* Suivi de la réparation - Masqué si annulé */}
            {appointment.status === "cancelled" ? (
              <Card className="mb-4 bg-white/60 backdrop-blur-xl border border-red-200/60 shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
                <CardHeader>
                  <CardTitle className="font-light flex items-center gap-2 text-red-700">
                    <XCircle className="h-5 w-5" />
                    Rendez-vous annulé
                  </CardTitle>
                  <CardDescription className="font-light">
                    Ce rendez-vous a été annulé
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="p-6 bg-red-50/50 rounded-xl border border-red-200/50">
                    <div className="flex items-start gap-4">
                      <XCircle className="h-6 w-6 text-red-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-semibold text-red-900 mb-2">Rendez-vous annulé</div>
                        <div className="text-sm text-red-700">
                          Ce rendez-vous a été annulé. Vous ne pouvez plus suivre l'état de la réparation pour ce rendez-vous.
                        </div>
                        {appointment.notes && (
                          <div className="mt-4 pt-4 border-t border-red-200/50">
                            <div className="text-xs font-medium text-red-800 mb-1">Note de l'annulation :</div>
                            <div className="text-sm text-red-700">{appointment.notes}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="mb-4 bg-white/60 backdrop-blur-xl border border-white/40 shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
                <CardHeader>
                  <CardTitle className="font-light">État de la réparation</CardTitle>
                  <CardDescription className="font-light">
                    Suivez l'avancement de votre véhicule en temps réel
                  </CardDescription>
                </CardHeader>
                <CardContent>
            <div className="space-y-6">
              {/* Progress Bar */}
              <div>
                <Progress
                  value={((effectiveStepIndex + 1) / STATUS_STEPS.length) * 100}
                  className="mb-6 h-3"
                />
                <div className="text-center text-sm text-gray-600">
                  Étape {effectiveStepIndex + 1} sur {STATUS_STEPS.length}
                </div>
              </div>

              {/* Status Steps */}
              <div className="space-y-4">
                {STATUS_STEPS.map((step, index) => {
                  const Icon = step.icon
                  const isCompleted = index <= effectiveStepIndex
                  const isCurrent = index === effectiveStepIndex

                  return (
                    <div key={step.id} className="flex items-start gap-4">
                      <div
                        className={`flex-shrink-0 h-12 w-12 rounded-full flex items-center justify-center transition-all ${
                          isCompleted
                            ? "bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-lg"
                            : "bg-gray-200 text-gray-400"
                        }`}
                      >
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="flex-1 pt-2">
                        <div
                          className={`font-semibold text-base mb-1 ${
                            isCurrent ? "text-blue-600" : isCompleted ? "text-gray-900" : "text-gray-400"
                          }`}
                        >
                          {step.label}
                          {isCurrent && <span className="ml-2 text-xs">(En cours)</span>}
                        </div>
                        {isCurrent && tracking?.description && (
                          <div className="text-sm text-gray-600 mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                            {tracking.description}
                          </div>
                        )}
                        {isCurrent && tracking?.updated_at && (
                          <div className="text-xs text-gray-500 mt-2">
                            Dernière mise à jour: {formatDate(tracking.updated_at)}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Photos - Section désactivée car non disponible dans la table */}

              {/* Message si pas encore commencé */}
              {appointment.status === "pending" && !tracking && (
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
            </div>
          </CardContent>
        </Card>
            )}

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
      </div>

      <BottomNavigation />
    </>
  )
}

