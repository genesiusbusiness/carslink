"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Calendar, Clock, FileText, ArrowLeft } from "lucide-react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BottomNavigation } from "@/components/layout/BottomNavigation"
import { useAuth } from "@/lib/hooks/use-auth"
import { supabase } from "@/lib/supabase/client"
import { formatDate } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"
import type { Appointment } from "@/lib/types/database"

export default function HistoriquePage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "completed" | "cancelled">("all")

  useEffect(() => {
    // Attendre que l'auth soit vérifiée
    if (authLoading) {
      return
    }

    if (!user) {
      router.push("/login")
      return
    }

    loadHistory()
  }, [user, router, filter, authLoading])

  const loadHistory = async () => {
    if (!user) return
    
    setLoading(true)
    try {
      let query = supabase
        .from("appointments")
        .select("*")
        .eq("flynesis_user_id", user.id)

      if (filter === "completed") {
        query = query.eq("status", "completed")
      } else if (filter === "cancelled") {
        query = query.eq("status", "cancelled")
      }

      const { data, error } = await query.order("start_time", { ascending: false })

      if (error) {
        toast({
          title: "Erreur",
          description: "Erreur lors du chargement de l'historique",
          variant: "destructive",
        })
      } else if (data) {
        setAppointments(data)
      }
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Erreur lors du chargement de l'historique",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Afficher le chargement pendant la vérification d'auth ou le chargement des données
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-600 mb-2">Chargement de l'historique...</div>
          <div className="text-sm text-gray-400">Veuillez patienter</div>
        </div>
      </div>
    )
  }

  // Si pas d'utilisateur (après chargement), ne rien afficher (redirection en cours)
  if (!user) {
    return null
  }

  return (
    <>
      <div className="fixed inset-0 w-full h-full overflow-y-auto bg-gradient-to-br from-blue-50/40 via-white to-purple-50/20 pb-28 sm:pb-32 safe-area-top safe-area-bottom">
        {/* Mobile Container avec effet Liquid Glass */}
        <div className="w-full max-w-7xl mx-auto bg-white/70 backdrop-blur-2xl pb-28 sm:pb-32">
          {/* Header avec verre givré */}
          <div className="px-4 sm:px-6 py-5 sm:py-6 bg-white/40 backdrop-blur-xl border-b border-white/20 sticky top-0 z-10">
            <div className="flex items-center gap-4 mb-6">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.back()}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-light text-gray-900">Historique</h1>
                <p className="text-sm text-gray-500 font-light mt-1">Carnet d'entretien digital</p>
              </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2 mb-4">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
          >
            Tout
          </Button>
          <Button
            variant={filter === "completed" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("completed")}
          >
            Terminés
          </Button>
          <Button
            variant={filter === "cancelled" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("cancelled")}
          >
            Annulés
          </Button>
        </div>
          </div>

          {/* Contenu */}
          <div className="px-4 sm:px-6 py-6 sm:py-8 pb-28 sm:pb-32 bg-white/30 backdrop-blur-sm">
            {appointments.length > 0 ? (
            <div className="space-y-3">
              {appointments.map((appointment) => (
                <motion.div
                  key={appointment.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="mb-4"
                >
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/10 to-blue-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="relative bg-white/60 backdrop-blur-xl border border-white/40 rounded-2xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.08)] group-hover:shadow-[0_12px_40px_rgba(59,130,246,0.2)] group-hover:border-blue-300/50 transition-all duration-300">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-light text-gray-900">
                              {appointment.service_type}
                            </h3>
                            <Badge
                              variant={
                                appointment.status === "completed"
                                  ? "default"
                                  : appointment.status === "cancelled"
                                  ? "destructive"
                                  : "secondary"
                              }
                            >
                              {appointment.status === "completed"
                                ? "Terminé"
                                : appointment.status === "cancelled"
                                ? "Annulé"
                                : appointment.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-500 font-light mt-2">
                            {appointment.start_time && (
                              <>
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  <span>{formatDate(appointment.start_time)}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Clock className="h-4 w-4" />
                                  <span>{new Date(appointment.start_time).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
                                </div>
                              </>
                            )}
                          </div>
                          {appointment.notes && (
                            <p className="text-sm text-gray-500 font-light mt-2">{appointment.notes}</p>
                          )}
                        </div>
                      </div>
                      {appointment.status === "completed" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full mt-3 rounded-xl"
                          onClick={() => router.push(`/factures?appointment=${appointment.id}`)}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Voir la facture
                        </Button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="relative border-2 border-dashed border-white/60 rounded-2xl p-12 text-center bg-white/40 backdrop-blur-md">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-light text-gray-900 mb-2">
                Aucun historique
              </h3>
              <p className="text-gray-500 font-light">
                Votre historique d'entretien apparaîtra ici
              </p>
            </div>
          )}
          </div>
        </div>
      </div>

      <BottomNavigation />
    </>
  )
}

