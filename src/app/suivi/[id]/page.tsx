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
      // Charger l'appointment
      const { data: appointmentData, error: appointmentError } = await supabase
        .from("appointments")
        .select("*")
        .eq("id", appointmentId)
        .single()

      if (appointmentError) throw appointmentError

      if (appointmentData) {
        setAppointment(appointmentData)
        setTracking(appointmentData)

        // Charger le garage
        if (appointmentData.garage_id) {
          const { data: garageData } = await supabase
            .from("garages")
            .select("*")
            .eq("id", appointmentData.garage_id)
            .single()
          if (garageData) setGarage(garageData)
        }

        // Charger le véhicule
        if (appointmentData.vehicle_id) {
          const { data: vehicleData } = await supabase
            .from("vehicles")
            .select("*")
            .eq("id", appointmentData.vehicle_id)
            .single()
          if (vehicleData) setVehicle(vehicleData)
        }
      }
    } catch (error: any) {
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

          {/* Card principale */}
          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Statut de la réparation</CardTitle>
              <CardDescription>
                {appointment.service_type} - {appointment.start_time ? formatDate(appointment.start_time) : 'N/A'}
              </CardDescription>
            </CardHeader>
            <CardContent>
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

