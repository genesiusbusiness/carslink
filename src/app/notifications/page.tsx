"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Bell, ChevronLeft, Check, Trash2, Calendar } from "lucide-react"
import { BottomNavigation } from "@/components/layout/BottomNavigation"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/lib/hooks/use-auth"
import type { Notification } from "@/lib/types/database"

export default function NotificationsPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loadingNotifications, setLoadingNotifications] = useState(true)
  const [filter, setFilter] = useState<"all" | "unread">("all")

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
      return
    }

    if (user) {
      loadNotifications()
    }
  }, [user, loading, router, filter])

  const loadNotifications = async () => {
    if (!user) return

    try {
      let query = supabase
        .from("client_notifications")
        .select("*")
        .eq("flynesis_user_id", user.id)
        .order("created_at", { ascending: false })

      if (filter === "unread") {
        query = query.eq("read", false)
      }

      const { data, error } = await query

      if (!error && data) {
        setNotifications(data)
      }
    } catch (error) {
      console.error("Error loading notifications:", error)
    } finally {
      setLoadingNotifications(false)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from("client_notifications")
        .update({ read: true })
        .eq("id", notificationId)

      if (!error) {
        setNotifications(prev =>
          prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
        )
      }
    } catch (error) {
      console.error("Error marking notification as read:", error)
    }
  }

  const markAllAsRead = async () => {
    if (!user) return

    try {
      const { error } = await supabase
        .from("client_notifications")
        .update({ read: true })
        .eq("flynesis_user_id", user.id)
        .eq("read", false)

      if (!error) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      }
    } catch (error) {
      console.error("Error marking all notifications as read:", error)
    }
  }

  const deleteNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from("client_notifications")
        .delete()
        .eq("id", notificationId)

      if (!error) {
        setNotifications(prev => prev.filter(n => n.id !== notificationId))
      }
    } catch (error) {
      console.error("Error deleting notification:", error)
    }
  }

  if (loading || loadingNotifications) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50/40 via-white to-purple-50/20 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-gray-600 font-light"
        >
          Chargement...
        </motion.div>
      </div>
    )
  }

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <div className="h-full w-full bg-gradient-to-br from-blue-50/40 via-white to-purple-50/20 overflow-y-auto pb-20 safe-area-top safe-area-bottom">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full bg-white/40 backdrop-blur-xl border-b border-white/20 sticky top-0 z-10 safe-area-top"
      >
        <div className="w-full px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <motion.button
                onClick={() => router.back()}
                className="h-9 w-9 rounded-full bg-white/50 backdrop-blur-sm flex items-center justify-center border border-white/30 shadow-sm"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <ChevronLeft className="h-5 w-5 text-gray-600" />
              </motion.button>
              <div>
                <h1 className="text-2xl font-light text-gray-900">Notifications</h1>
                <p className="text-xs text-gray-500 font-light mt-0.5">
                  {unreadCount > 0 ? `${unreadCount} non lue${unreadCount > 1 ? 's' : ''}` : 'Toutes lues'}
                </p>
              </div>
            </div>
            {unreadCount > 0 && (
              <motion.button
                onClick={markAllAsRead}
                className="text-sm text-blue-600 font-light hover:text-blue-700 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/50 backdrop-blur-sm border border-white/30"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Check className="h-4 w-4" />
                Tout marquer lu
              </motion.button>
            )}
          </div>

          {/* Filtres */}
          <div className="flex gap-2">
            <motion.button
              onClick={() => setFilter("all")}
              className={`px-4 py-2 rounded-xl text-sm font-light transition-all ${
                filter === "all"
                  ? "bg-blue-600 text-white shadow-[0_4px_20px_rgba(59,130,246,0.3)]"
                  : "bg-white/50 backdrop-blur-sm text-gray-600 border border-white/30"
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Toutes
            </motion.button>
            <motion.button
              onClick={() => setFilter("unread")}
              className={`px-4 py-2 rounded-xl text-sm font-light transition-all ${
                filter === "unread"
                  ? "bg-blue-600 text-white shadow-[0_4px_20px_rgba(59,130,246,0.3)]"
                  : "bg-white/50 backdrop-blur-sm text-gray-600 border border-white/30"
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Non lues ({unreadCount})
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Liste des notifications */}
      <div className="w-full px-6 py-6">
        {notifications.length > 0 ? (
          <div className="space-y-3">
            <AnimatePresence>
              {notifications.map((notification, index) => (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="relative group"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/5 to-blue-500/10 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div
                    className={`relative bg-white/60 backdrop-blur-xl border border-white/40 rounded-2xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.08)] cursor-pointer hover:shadow-[0_12px_40px_rgba(59,130,246,0.2)] transition-all duration-300 ${
                      !notification.read ? "ring-2 ring-blue-500/30" : ""
                    }`}
                    onClick={() => {
                      if (!notification.read) {
                        markAsRead(notification.id)
                      }
                      if (notification.link) {
                        router.push(notification.link)
                      }
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`h-3 w-3 rounded-full mt-1.5 flex-shrink-0 ${
                        !notification.read ? "bg-blue-600" : "bg-transparent"
                      }`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <p className="text-sm font-light text-gray-900">
                            {notification.title}
                          </p>
                          {notification.read && (
                            <motion.button
                              onClick={(e) => {
                                e.stopPropagation()
                                deleteNotification(notification.id)
                              }}
                              className="h-6 w-6 rounded-full bg-white/50 backdrop-blur-sm flex items-center justify-center border border-white/30 opacity-0 group-hover:opacity-100 transition-opacity"
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                            >
                              <Trash2 className="h-3 w-3 text-gray-400" />
                            </motion.button>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 font-light mb-3">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-gray-400 font-light">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {new Date(notification.created_at).toLocaleDateString("fr-FR", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-20"
          >
            <div className="bg-white/60 backdrop-blur-xl border border-white/40 rounded-2xl p-12 shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
              <Bell className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-light text-gray-900 mb-2">
                Aucune notification
              </h3>
              <p className="text-sm text-gray-500 font-light">
                {filter === "unread"
                  ? "Vous n'avez pas de notifications non lues"
                  : "Vous n'avez pas encore de notifications"}
              </p>
            </div>
          </motion.div>
        )}
      </div>

      <BottomNavigation />
    </div>
  )
}

