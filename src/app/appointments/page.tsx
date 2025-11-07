"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Calendar, Clock, MapPin, ChevronRight, Plus, Car, Filter, X, ArrowLeft, Phone, Star, Trash2, MessageCircle, CheckCircle2, XCircle } from "lucide-react"
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
              setChatStatuses({})
            } else if (chatsData && chatsData.length > 0) {
              const chatIds = chatsData.map(c => c.id)
              const { data: messagesData, error: messagesError } = await supabase
                .from("appointment_chat_messages")
                .select("chat_id, sender_type, read_at, created_at")
                .in("chat_id", chatIds)
                .order("created_at", { ascending: false })

              if (messagesError) {
                setChatStatuses({})
              } else {
                const chatStatusMap: Record<string, { isOpen: boolean; hasUnread: boolean }> = {}
                
                chatsData.forEach(chat => {
                  const lastMessage = messagesData
                    ?.filter(m => m.chat_id === chat.id)[0] // Déjà trié par date décroissante
                  
                  chatStatusMap[chat.appointment_id] = {
                    isOpen: chat.is_open,
                    hasUnread: lastMessage ? lastMessage.sender_type === 'garage' && !lastMessage.read_at : false,
                  }
                })

                setChatStatuses(chatStatusMap)
              }
            }
          } catch (chatError) {
            // Si les tables de chat n'existent pas, on continue sans erreur
            setChatStatuses({})
          }
        }
      }
    } catch (error) {
      showElegantToast({
        title: "Erreur",
        message: "Erreur lors du chargement des rendez-vous",
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
  }, [user, loadAppointments])

  const handleCancelClick = (appointment: Appointment, e: React.MouseEvent) => {
    e.stopPropagation()
    setAppointmentToCancel(appointment)
    setCancelDialogOpen(true)
  }

  const cancelAppointment = async () => {
    if (!appointmentToCancel) return

    try {
      const { error } = await supabase
        .from("appointments")
        .update({ status: "cancelled" })
        .eq("id", appointmentToCancel.id)

      if (error) throw error

      showElegantToast({
        title: "Rendez-vous annulé",
        message: "Votre rendez-vous a été annulé avec succès",
        variant: "success",
      })

      setCancelDialogOpen(false)
      setAppointmentToCancel(null)
      loadAppointments()
    } catch (error: any) {
      showElegantToast({
        title: "Erreur",
        message: error.message || "Erreur lors de l'annulation du rendez-vous",
        variant: "error",
      })
    }
  }

  const canCancelAppointment = (appointment: Appointment) => {
    // Ne peut pas annuler si déjà annulé ou terminé
    if (appointment.status === "cancelled" || appointment.status === "completed") {
      return false
    }
    // Peut annuler tous les rendez-vous à venir (pending, confirmed, etc.)
    if (!appointment.start_time) {
      return false
    }
    const appointmentDate = new Date(appointment.start_time)
    const now = new Date()
    // Permettre l'annulation si le rendez-vous est dans le futur (même le jour même)
    return appointmentDate >= now
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

  const getStatusBadge = (status: string) => {
    if (status === "confirmed") {
      return (
        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-gradient-to-r from-emerald-500 to-green-600 text-white text-xs font-medium shadow-md border border-emerald-400/70">
          <CheckCircle2 className="h-3 w-3" />
          <span>Confirmé</span>
        </div>
      )
    }
    if (status === "cancelled") {
      return (
        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-medium shadow-md border border-red-400/70">
          <XCircle className="h-3 w-3" />
          <span>Annulé</span>
        </div>
      )
    }
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      pending: "secondary",
      completed: "default",
    }
    const variant = variants[status] || "secondary"
    const labels: Record<string, string> = {
      pending: "En attente",
      completed: "Terminé",
    }
    return (<Badge variant={variant}>{labels[status] || status}</Badge>)
  }

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
      <div className="fixed inset-0 w-full h-full overflow-y-auto bg-gradient-to-br from-blue-50/40 via-white to-purple-50/20 pb-28 sm:pb-32 safe-area-top safe-area-bottom">
        {/* Mobile Container avec effet Liquid Glass */}
        <div className="w-full max-w-7xl mx-auto bg-white/70 backdrop-blur-2xl pb-28 sm:pb-32">
        {/* Header avec verre givré - Responsive */}
        <div className="px-4 sm:px-6 py-5 sm:py-6 bg-white/40 backdrop-blur-xl border-b border-white/20 sticky top-0 z-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6 mb-4 sm:mb-6">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-light text-gray-900">Mes rendez-vous</h1>
              <p className="text-xs sm:text-sm text-gray-500 font-light mt-1 sm:mt-2">
                {filteredAppointments.length} rendez-vous{filter !== "all" ? ` (${filter === "upcoming" ? "à venir" : filter === "past" ? "passés" : filter})` : ""}
              </p>
            </div>
          </div>

          {/* Filtres - Responsive */}
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 sm:mx-0 px-4 sm:px-0">
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
              variant="ghost"
              size="sm"
              onClick={() => setFilter(filterOption.id)}
              className={`whitespace-nowrap rounded-xl transition-all duration-200 ${
                filter === filterOption.id
                  ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md shadow-blue-500/30 hover:from-blue-600 hover:to-purple-600 font-medium"
                  : "bg-white/60 backdrop-blur-sm text-gray-600 hover:bg-white/80 hover:text-gray-900 border border-gray-200/50"
              }`}
            >
              {filterOption.label}
            </Button>
          ))}
          </div>
        </div>

        {/* Liste des rendez-vous - Responsive */}
        <div className="px-4 sm:px-6 py-6 sm:py-8 pb-28 sm:pb-32 bg-white/30 backdrop-blur-sm">
          {filteredAppointments.length > 0 ? (
          <div className="space-y-3 max-w-7xl mx-auto">
            {filteredAppointments.map((appointment, index) => {
              const garage = appointment.garage_id ? garages[appointment.garage_id] : null
              const vehicle = appointment.vehicle_id ? vehicles[appointment.vehicle_id] : null
              const appointmentDate = appointment.start_time ? new Date(appointment.start_time) : null
              const isUpcoming = appointmentDate ? appointmentDate >= new Date() : false

              return (
                <motion.div
                  key={appointment.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/10 to-blue-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="relative bg-white/60 backdrop-blur-xl border border-white/40 rounded-2xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.08)] group-hover:shadow-[0_12px_40px_rgba(59,130,246,0.2)] group-hover:border-blue-300/50 transition-all duration-300">
                      {/* En-tête avec service et statut */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0 pr-2">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-light text-base text-gray-900 truncate">
                              {appointment.service_type}
                            </h3>
                            {/* Afficher le badge seulement si ce n'est pas "confirmé" ou "annulé" (car ils sont déjà affichés ailleurs) */}
                            {appointment.status && appointment.status !== "confirmed" && appointment.status !== "cancelled" && getStatusBadge(appointment.status)}
                          </div>
                          
                          {/* Date et heure - Mise en avant */}
                          {appointment.start_time && (
                            <div className="flex items-center gap-3 mb-3">
                              <div className="flex items-center gap-1.5 text-sm text-gray-700 font-medium">
                                <Calendar className="h-4 w-4 text-blue-600" />
                                <span>{formatDate(appointment.start_time)}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-sm text-gray-700 font-medium">
                                <Clock className="h-4 w-4 text-purple-600" />
                                <span>{formatTime(appointment.start_time)}</span>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {/* Bouton chat en haut à droite - Ne pas afficher si le rendez-vous est annulé */}
                        {appointment.status !== "cancelled" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`h-10 w-10 rounded-xl relative transition-all duration-200 group ${
                              chatStatuses[appointment.id]?.isOpen
                                ? "bg-gradient-to-br from-blue-500/20 to-purple-500/20 hover:from-blue-500/30 hover:to-purple-500/30 text-blue-600 border-2 border-blue-400/70 shadow-md shadow-blue-500/30 ring-2 ring-blue-300/40 ring-offset-1 ring-offset-white/50"
                                : "bg-white/70 backdrop-blur-sm text-gray-500 hover:text-blue-600 hover:bg-gradient-to-br hover:from-blue-500/10 hover:to-purple-500/10 border-2 border-gray-300/50 hover:border-blue-400/70 shadow-sm hover:shadow-md hover:ring-2 hover:ring-blue-200/50 hover:ring-offset-1 hover:ring-offset-white/50"
                            }`}
                            onClick={(e) => {
                              e.stopPropagation()
                              router.push(`/appointments/${appointment.id}/chat`)
                            }}
                          >
                            <MessageCircle className={`h-4.5 w-4.5 transition-transform duration-200 ${chatStatuses[appointment.id]?.isOpen ? 'scale-110' : 'group-hover:scale-110'}`} />
                            {chatStatuses[appointment.id]?.hasUnread && (
                              <>
                                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-gradient-to-r from-red-500 to-red-600 rounded-full border-2 border-white shadow-lg animate-pulse flex items-center justify-center z-10">
                                  <span className="h-1.5 w-1.5 bg-white rounded-full"></span>
                                </span>
                                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-red-500/30 rounded-full animate-ping"></span>
                              </>
                            )}
                          </Button>
                        )}
                      </div>

                      {/* Informations véhicule et garage */}
                      <div className="space-y-2 mb-4">
                        {/* Badge "Confirmé" ou "Annulé" juste au-dessus de la localisation, aligné à droite */}
                        {(appointment.status === "confirmed" || appointment.status === "cancelled") && (
                          <div className="mb-2 flex justify-end">
                            {getStatusBadge(appointment.status)}
                          </div>
                        )}
                        
                        {vehicle && (
                          <div className="flex items-center gap-2 text-sm text-gray-600 font-light">
                            <Car className="h-4 w-4 text-gray-400 flex-shrink-0" />
                            <span className="truncate">{vehicle.brand} {vehicle.model}</span>
                            {vehicle.license_plate && (
                              <span className="font-mono bg-white/60 px-2 py-0.5 rounded text-xs border border-gray-200/50">
                                {vehicle.license_plate}
                              </span>
                            )}
                          </div>
                        )}

                        {garage && (
                          <div className="flex items-center gap-2 text-sm text-gray-600 font-light">
                            <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
                            <span className="truncate">{garage.name}</span>
                            {garage.city && (
                              <span className="text-gray-400">• {garage.city}</span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-3 border-t border-gray-100/50">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex-1 h-10 text-xs rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 hover:from-blue-500/20 hover:to-purple-500/20 text-blue-700 hover:text-blue-800 border border-blue-200/50 hover:border-blue-300/70 transition-all duration-200 font-medium"
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/suivi/${appointment.id}`)
                          }}
                        >
                          Détails
                          <ChevronRight className="h-3.5 w-3.5 ml-1.5" />
                        </Button>
                        {canCancelAppointment(appointment) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-10 px-3 text-xs rounded-xl bg-gradient-to-r from-red-500/10 to-red-600/10 hover:from-red-500/20 hover:to-red-600/20 text-red-600 hover:text-red-700 border border-red-200/50 hover:border-red-300/70 transition-all duration-200 font-medium"
                            onClick={(e) => handleCancelClick(appointment, e)}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                            Annuler
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
              <h3 className="text-lg font-light text-gray-900 mb-2">
                {filter === "all" ? "Aucun rendez-vous" : `Aucun rendez-vous ${filter === "upcoming" ? "à venir" : filter === "past" ? "passé" : filter}`}
              </h3>
              <p className="text-gray-500 font-light mb-6">
                {filter === "all" 
                  ? "Vous n'avez pas encore de rendez-vous programmé"
                  : `Vous n'avez aucun rendez-vous ${filter === "upcoming" ? "à venir" : filter === "past" ? "passé" : `avec le statut "${filter}"`}`
                }
              </p>
              {filter !== "all" && (
                <Button
                  variant="ghost"
                  onClick={() => setFilter("all")}
                  className="rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 hover:from-blue-500/20 hover:to-purple-500/20 text-blue-700 hover:text-blue-800 border border-blue-200/50 hover:border-blue-300/70 transition-all duration-200 font-medium"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Voir tous les rendez-vous
                </Button>
              )}
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
            <AlertDialogCancel className="flex-1 sm:flex-initial rounded-xl bg-white/60 backdrop-blur-sm border border-gray-200/50 hover:bg-white/80 hover:border-gray-300/70 transition-all duration-200 font-medium">
              Conserver
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={cancelAppointment}
              className="flex-1 sm:flex-initial rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-lg hover:shadow-xl transition-all duration-200 font-medium"
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

