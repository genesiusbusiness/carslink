"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Calendar, Clock, MapPin, ChevronRight, Plus, Car, Filter, X, ArrowLeft, Phone, Star, Trash2, MessageCircle } from "lucide-react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BottomNavigation } from "@/components/layout/BottomNavigation"
import { useAuth } from "@/lib/hooks/use-auth"
import { supabase } from "@/lib/supabase/client"
import { formatDateTime, formatDate, formatTime } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"
import { showElegantToast } from "@/components/ui/elegant-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { Appointment, Garage, Vehicle } from "@/lib/types/database"

type FilterType = "all" | "upcoming" | "past" | "pending" | "confirmed" | "completed" | "cancelled"

export default function AppointmentsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [garages, setGarages] = useState<Record<string, Garage>>({})
  const [vehicles, setVehicles] = useState<Record<string, Vehicle>>({})
  const [chatStatuses, setChatStatuses] = useState<Record<string, { isOpen: boolean; hasUnread: boolean }>>({})
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>("all")
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [appointmentToCancel, setAppointmentToCancel] = useState<Appointment | null>(null)

  const loadAppointments = useCallback(async () => {
    if (!user) return

    setLoading(true)
    try {
      let query = supabase
        .from("appointments")
        .select("*")
        .eq("flynesis_user_id", user.id)

      // Appliquer les filtres
      const now = new Date()
      if (filter === "upcoming") {
        query = query.gte("start_time", now.toISOString())
        query = query.not("status", "eq", "cancelled")
      } else if (filter === "past") {
        query = query.lt("start_time", now.toISOString())
      } else if (filter === "pending") {
        query = query.eq("status", "pending")
      } else if (filter === "confirmed") {
        query = query.eq("status", "confirmed")
      } else if (filter === "completed") {
        query = query.eq("status", "completed")
      } else if (filter === "cancelled") {
        query = query.eq("status", "cancelled")
      }

      const { data, error } = await query.order("start_time", { ascending: filter === "past" || filter === "completed" })

      if (!error && data) {
        setAppointments(data)
        
        // Charger les garages et véhicules
        const garageIds = Array.from(new Set(data.map(a => a.garage_id).filter(Boolean)))
        const vehicleIds = Array.from(new Set(data.map(a => a.vehicle_id).filter(Boolean)))

        // Charger les garages
        if (garageIds.length > 0) {
          const { data: garagesData } = await supabase
            .from("carslink_garages")
            .select("*")
            .in("id", garageIds)

          if (garagesData) {
            const garagesMap: Record<string, Garage> = {}
            garagesData.forEach(garage => {
              garagesMap[garage.id] = garage
            })
            setGarages(garagesMap)
          }
        }

        // Charger les véhicules
        if (vehicleIds.length > 0) {
          const { data: vehiclesData } = await supabase
            .from("vehicles")
            .select("*")
            .in("id", vehicleIds)

          if (vehiclesData) {
            const vehiclesMap: Record<string, Vehicle> = {}
            vehiclesData.forEach(vehicle => {
              vehiclesMap[vehicle.id] = vehicle
            })
            setVehicles(vehiclesMap)
          }
        }

        // Charger l'état des chats pour chaque rendez-vous (optionnel - si les tables n'existent pas, on ignore)
        if (data.length > 0) {
          try {
            const appointmentIds = data.map(a => a.id)
            const { data: chatsData, error: chatsError } = await supabase
              .from("appointment_chats")
              .select("id, appointment_id, is_open")
              .in("appointment_id", appointmentIds)

            // Si les tables n'existent pas encore, on ignore l'erreur
            if (chatsError) {
              console.log("Chat tables not available yet:", chatsError.message)
              setChatStatuses({})
            } else if (chatsData && chatsData.length > 0) {
              const chatIds = chatsData.map(c => c.id)
              const { data: messagesData, error: messagesError } = await supabase
                .from("appointment_chat_messages")
                .select("chat_id, sender_type, read_at, created_at")
                .in("chat_id", chatIds)
                .order("created_at", { ascending: false })

              if (messagesError) {
                console.log("Messages table not available yet:", messagesError.message)
                setChatStatuses({})
              } else {
                const chatStatusMap: Record<string, { isOpen: boolean; hasUnread: boolean }> = {}
                
                chatsData.forEach(chat => {
                  const lastMessage = messagesData
                    ?.filter(m => m.chat_id === chat.id)[0] // Déjà trié par date décroissante
                  
                  chatStatusMap[chat.appointment_id] = {
                    isOpen: chat.is_open,
                    hasUnread: lastMessage?.sender_type === 'garage' && !lastMessage.read_at
                  }
                })

                setChatStatuses(chatStatusMap)
              }
            }
          } catch (chatError) {
            // Si les tables de chat n'existent pas, on continue sans erreur
            console.log("Chat feature not available yet:", chatError)
            setChatStatuses({})
          }
        }
      }
    } catch (error) {
      console.error("Error loading appointments:", error)
      showElegantToast({
        title: "Erreur",
        message: "Impossible de charger les rendez-vous",
        variant: "error",
      })
    } finally {
      setLoading(false)
    }
  }, [user, filter])

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      router.push("/login")
      return
    }

    loadAppointments()
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel("appointments_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "appointments",
          filter: `flynesis_user_id=eq.${user.id}`,
        },
        () => {
          loadAppointments()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, router, authLoading, loadAppointments])

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

  const handleCancelClick = (appointment: Appointment, e: React.MouseEvent) => {
    e.stopPropagation()
    setAppointmentToCancel(appointment)
    setCancelDialogOpen(true)
  }

  const handleCancelAppointment = async () => {
    if (!appointmentToCancel) return

    try {
      const { error } = await supabase
        .from("appointments")
        .update({ status: "cancelled" })
        .eq("id", appointmentToCancel.id)

      if (error) throw error

      showElegantToast({
        title: "Rendez-vous annulé",
        message: "Votre rendez-vous a été annulé avec succès.",
        variant: "success",
      })

      setCancelDialogOpen(false)
      setAppointmentToCancel(null)
      loadAppointments()
    } catch (error: any) {
      console.error("Error cancelling appointment:", error)
      showElegantToast({
        title: "Erreur",
        message: error.message || "Impossible d'annuler le rendez-vous",
        variant: "error",
      })
    }
  }

  const canCancelAppointment = (appointment: Appointment) => {
    if (appointment.status === "cancelled" || appointment.status === "completed") {
      return false
    }
    if (!appointment.start_time) {
      return false
    }
    const appointmentDate = new Date(appointment.start_time)
    const now = new Date()
    const hoursUntilAppointment = (appointmentDate.getTime() - now.getTime()) / (1000 * 60 * 60)
    return hoursUntilAppointment >= 24 // Peut annuler jusqu'à 24h avant
  }

  const filteredAppointments = appointments.filter((appt) => {
    if (filter === "all") return true
    if (!appt.start_time) return false
    const now = new Date()
    const apptDate = new Date(appt.start_time)
    if (filter === "upcoming") return apptDate >= now && appt.status !== "cancelled"
    if (filter === "past") return apptDate < now
    return true
  })

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-600 mb-2">Chargement des rendez-vous...</div>
          <div className="text-sm text-gray-400">Veuillez patienter</div>
        </div>
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
          <div className="flex items-center justify-between mb-6">
            <div className="flex-1">
              <h1 className="text-2xl font-light text-gray-900">Mes rendez-vous</h1>
              <p className="text-sm text-gray-500 font-light mt-1">
                {filteredAppointments.length} rendez-vous{filter !== "all" ? ` (${filter === "upcoming" ? "à venir" : filter === "past" ? "passés" : filter})` : ""}
              </p>
            </div>
            <Button 
              onClick={() => router.push("/reservation")}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-md hover:shadow-lg rounded-xl"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nouveau RDV
            </Button>
          </div>

          {/* Filtres */}
          <div className="flex gap-2 overflow-x-auto pb-2">
          {[
            { id: "all" as FilterType, label: "Tous" },
            { id: "upcoming" as FilterType, label: "À venir" },
            { id: "past" as FilterType, label: "Passés" },
            { id: "pending" as FilterType, label: "En attente" },
            { id: "confirmed" as FilterType, label: "Confirmés" },
            { id: "completed" as FilterType, label: "Terminés" },
          ].map((filterOption) => (
            <Button
              key={filterOption.id}
              variant={filter === filterOption.id ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(filterOption.id)}
              className="whitespace-nowrap rounded-xl"
            >
              {filterOption.label}
            </Button>
          ))}
          </div>
        </div>

        {/* Liste des rendez-vous */}
        <div className="px-6 py-6 bg-white/30 backdrop-blur-sm">
          {filteredAppointments.length > 0 ? (
          <div className="space-y-3">
            {filteredAppointments.map((appointment) => {
              const garage = appointment.garage_id ? garages[appointment.garage_id] : null
              const vehicle = appointment.vehicle_id ? vehicles[appointment.vehicle_id] : null
              const appointmentDate = appointment.start_time ? new Date(appointment.start_time) : null
              const isUpcoming = appointmentDate ? appointmentDate >= new Date() : false

              return (
                <motion.div
                  key={appointment.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="mb-4"
                >
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/10 to-blue-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="relative bg-white/60 backdrop-blur-xl border border-white/40 rounded-2xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.08)] group-hover:shadow-[0_12px_40px_rgba(59,130,246,0.2)] group-hover:border-blue-300/50 transition-all duration-300">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-light text-lg text-gray-900">
                              {appointment.service_type}
                            </h3>
                            {getStatusBadge(appointment.status)}
                          </div>

                          {/* Véhicule */}
                          {vehicle && (
                            <div className="flex items-center gap-2 mb-2 text-sm text-gray-500 font-light">
                              <Car className="h-4 w-4" />
                              <span>{vehicle.brand} {vehicle.model}</span>
                              {vehicle.license_plate && (
                                <span className="font-mono bg-white/50 px-2 py-0.5 rounded">
                                  {vehicle.license_plate}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Garage */}
                          {garage && (
                            <div className="flex items-center gap-2 mb-2 text-sm text-gray-500 font-light">
                              <MapPin className="h-4 w-4" />
                              <span>{garage.name}</span>
                              {garage.city && (
                                <span className="text-gray-400">• {garage.city}</span>
                              )}
                            </div>
                          )}

                          {/* Date et heure */}
                          <div className="flex items-center gap-4 text-sm text-gray-500 font-light">
                            {appointment.start_time && (
                              <>
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  <span>{formatDate(appointment.start_time)}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Clock className="h-4 w-4" />
                                  <span>{formatTime(appointment.start_time)}</span>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 h-10 rounded-xl"
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/suivi/${appointment.id}`)
                          }}
                        >
                          Voir les détails
                          <ChevronRight className="h-4 w-4 ml-2" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className={`h-10 px-4 rounded-xl relative ${
                            chatStatuses[appointment.id]?.isOpen
                              ? "border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300"
                              : "border-gray-200 text-gray-500 hover:bg-gray-50 hover:border-gray-300"
                          }`}
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/appointments/${appointment.id}/chat`)
                          }}
                        >
                          <MessageCircle className="h-4 w-4" />
                          {chatStatuses[appointment.id]?.hasUnread && (
                            <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full border-2 border-white"></span>
                          )}
                        </Button>
                        {canCancelAppointment(appointment) && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-10 px-4 rounded-xl border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                            onClick={(e) => handleCancelClick(appointment, e)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        ) : (
          <div className="relative border-2 border-dashed border-white/60 rounded-2xl p-12 text-center bg-white/40 backdrop-blur-md">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {filter === "all" ? "Aucun rendez-vous" : `Aucun rendez-vous ${filter === "upcoming" ? "à venir" : filter === "past" ? "passé" : filter}`}
              </h3>
              <p className="text-gray-500 mb-6">
                {filter === "all" 
                  ? "Vous n'avez pas encore de rendez-vous programmé"
                  : `Vous n'avez aucun rendez-vous ${filter === "upcoming" ? "à venir" : filter === "past" ? "passé" : `avec le statut "${filter}"`}`
                }
              </p>
              {filter !== "all" && (
                <Button
                  variant="outline"
                  onClick={() => setFilter("all")}
                  className="mb-3"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Voir tous les rendez-vous
                </Button>
              )}
              <Button 
                onClick={() => router.push("/reservation")}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Prendre un rendez-vous
              </Button>
          </div>
        )}
        </div>
        </div>
      </div>

      <BottomNavigation />

      {/* Dialog de confirmation d'annulation */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-red-100">
              <Trash2 className="h-8 w-8 text-red-600" />
            </div>
            <AlertDialogTitle className="text-center">
              Annuler le rendez-vous ?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              {appointmentToCancel && (
                <>
                  Êtes-vous sûr de vouloir annuler votre rendez-vous pour{" "}
                  <span className="font-semibold text-gray-900">
                    {appointmentToCancel.service_type}
                  </span>
                  ?
                  <br />
                  {appointmentToCancel.start_time && (
                    <span className="text-sm text-gray-600 mt-2 block">
                      Le {formatDate(appointmentToCancel.start_time)} à {formatTime(appointmentToCancel.start_time)}
                    </span>
                  )}
                  <span className="text-red-600 font-medium mt-2 block">
                    Cette action est irréversible.
                  </span>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:flex-row gap-3 mt-2">
            <AlertDialogCancel className="flex-1 sm:flex-initial">
              Conserver
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelAppointment}
              className="flex-1 sm:flex-initial bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Annuler le rendez-vous
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

