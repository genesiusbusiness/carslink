"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion"
import { Bell, ChevronLeft, Check, Trash2, Calendar, Archive } from "lucide-react"
import { BottomNavigation } from "@/components/layout/BottomNavigation"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/lib/hooks/use-auth"
import type { Notification } from "@/lib/types/database"

// Composant de notification avec swipe
function SwipeableNotification({
  notification,
  index,
  onArchive,
  onDelete,
  onRead,
  onClick,
  isSwiped,
  onSwipeStart,
  onSwipeEnd,
  isArchived = false,
}: {
  notification: Notification
  index: number
  onArchive: () => void
  onDelete: () => void
  onRead: () => void
  onClick: () => void
  isSwiped: boolean
  onSwipeStart: () => void
  onSwipeEnd: () => void
  isArchived?: boolean
}) {
  const x = useMotionValue(0)
  const opacity = useTransform(x, [-200, 0, 200], [1, 1, 1])
  const deleteOpacity = useTransform(x, [-100, -50, 0], [1, 0.5, 0])
  const archiveOpacity = useTransform(x, [0, 50, 100], [0, 0.5, 1])
  const deleteScale = useTransform(x, [-100, -50, 0], [1, 0.8, 0])
  const archiveScale = useTransform(x, [0, 50, 100], [0, 0.8, 1])

  const handleDragEnd = (event: any, info: any) => {
    if (info.offset.x < -100) {
      // Swipe gauche -> Supprimer
      onDelete()
      x.set(0)
    } else if (info.offset.x > 100) {
      // Swipe droite -> Archiver
      onArchive()
      x.set(0)
    } else {
      // Retour à la position initiale
      x.set(0)
    }
    onSwipeEnd()
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="relative group overflow-hidden"
    >
      {/* Actions en arrière-plan */}
      <div className="absolute inset-0 flex">
        {/* Action supprimer (gauche) */}
        <motion.div
          style={{ opacity: deleteOpacity }}
          className="flex-1 bg-red-500 flex items-center justify-start pl-4"
        >
          <motion.div
            style={{ scale: deleteScale }}
            className="flex items-center gap-2 text-white"
          >
            <Trash2 className="h-5 w-5" />
            <span className="text-sm font-medium">Supprimer</span>
          </motion.div>
        </motion.div>

        {/* Action archiver (droite) */}
        <motion.div
          style={{ opacity: archiveOpacity }}
          className={`flex-1 flex items-center justify-end pr-4 ${isArchived ? 'bg-green-500' : 'bg-blue-500'}`}
        >
          <motion.div
            style={{ scale: archiveScale }}
            className="flex items-center gap-2 text-white"
          >
            {isArchived ? (
              <>
                <Archive className="h-5 w-5 rotate-180" />
                <span className="text-sm font-medium">Désarchiver</span>
              </>
            ) : (
              <>
                <Archive className="h-5 w-5" />
                <span className="text-sm font-medium">Archiver</span>
              </>
            )}
          </motion.div>
        </motion.div>
      </div>

      {/* Carte de notification */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -200, right: 200 }}
        dragElastic={0.2}
        onDragStart={onSwipeStart}
        onDragEnd={handleDragEnd}
        style={{ x, opacity }}
        className={`relative bg-white/70 backdrop-blur-xl border border-gray-200/50 rounded-xl p-3 shadow-sm cursor-pointer hover:shadow-md hover:border-violet-300/50 transition-all duration-200 ${
          !notification.read ? "ring-1 ring-violet-400/30 bg-violet-50/30" : ""
        }`}
        onClick={onClick}
      >
        <div className="flex items-start gap-2.5">
          <div className={`h-1.5 w-1.5 rounded-full mt-1.5 flex-shrink-0 ${
            !notification.read ? "bg-violet-500 shadow-sm shadow-violet-500/50" : "bg-transparent"
          }`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <p className="text-xs font-semibold text-gray-900 leading-tight">
                {notification.title}
              </p>
            </div>
            <p className="text-[11px] text-gray-600 font-light mb-2 leading-snug line-clamp-2">
              {notification.message}
            </p>
            <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-light">
              <Calendar className="h-2.5 w-2.5" />
              <span>
                {notification.created_at ? new Date(notification.created_at).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                }) : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function NotificationsPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loadingNotifications, setLoadingNotifications] = useState(true)
  const [filter, setFilter] = useState<"all" | "unread" | "read" | "archived">("all")
  const [counts, setCounts] = useState({ all: 0, unread: 0, read: 0, archived: 0 })
  const [swipedId, setSwipedId] = useState<string | null>(null)

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
      // Charger les compteurs totaux
      const { data: allData } = await supabase
        .from("client_notifications")
        .select("id, read, archived")
        .eq("flynesis_user_id", user.id)

      if (allData) {
        const allCount = allData.length
        const unreadCount = allData.filter(n => !n.read).length
        const readCount = allData.filter(n => n.read).length
        const archivedCount = allData.filter(n => n.archived === true).length
        setCounts({ all: allCount, unread: unreadCount, read: readCount, archived: archivedCount })
      }

      // Charger toutes les notifications selon le filtre
      let query = supabase
        .from("client_notifications")
        .select("*")
        .eq("flynesis_user_id", user.id)
        .order("created_at", { ascending: false })

      // Si on filtre par archives, charger seulement les archivées
      if (filter === "archived") {
        query = query.eq("archived", true)
      } else {
        // Pour les autres filtres, exclure les archivées
        query = query.or("archived.is.null,archived.eq.false")
      }

      const { data, error } = await query

      if (!error && data) {
        setNotifications(data)
      }
    } catch (error) {
      // Error loading notifications
    } finally {
      setLoadingNotifications(false)
    }
  }

  // Filtrer les notifications côté client selon le filtre actif
  const filteredNotifications = notifications.filter(n => {
    if (filter === "unread") return !n.read && (!n.archived || n.archived === null)
    if (filter === "read") return n.read && (!n.archived || n.archived === null)
    if (filter === "archived") return n.archived === true
    return !n.archived || n.archived === null // "all" - exclure les archivées
  })

  const markAsRead = async (notificationId: string) => {
    try {
      // Si c'est une notification fictive, on la marque juste comme lue localement
      if (notificationId.startsWith("mock-")) {
        setNotifications(prev =>
          prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
        )
        setCounts(prev => ({
          ...prev,
          unread: Math.max(0, prev.unread - 1),
        }))
        return
      }

      const { error } = await supabase
        .from("client_notifications")
        .update({ read: true })
        .eq("id", notificationId)

      if (!error) {
        setNotifications(prev =>
          prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
        )
        // Mettre à jour les compteurs
        setCounts(prev => ({
          ...prev,
          unread: Math.max(0, prev.unread - 1),
        }))
      }
    } catch (error) {
      // Error marking notification as read
    }
  }

  const markAllAsRead = async () => {
    if (!user) return

    try {
      // Marquer toutes les notifications fictives comme lues
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      
      // Mettre à jour les compteurs
      setCounts(prev => ({
        ...prev,
        unread: 0,
      }))

      // Marquer les notifications réelles comme lues dans Supabase
      const { error } = await supabase
        .from("client_notifications")
        .update({ read: true })
        .eq("flynesis_user_id", user.id)
        .eq("read", false)

      if (error) {
        // Error marking all notifications as read
      }
    } catch (error) {
      // Error marking all notifications as read
    }
  }

  const deleteNotification = async (notificationId: string) => {
    try {
      // Récupérer la notification avant suppression pour connaître son statut
      const notificationToDelete = notifications.find(n => n.id === notificationId)
      const wasUnread = notificationToDelete && !notificationToDelete.read

      // Si c'est une notification fictive, on la supprime juste localement
      if (notificationId.startsWith("mock-")) {
        setNotifications(prev => prev.filter(n => n.id !== notificationId))
        setCounts(prev => ({
          ...prev,
          all: Math.max(0, prev.all - 1),
          unread: wasUnread ? Math.max(0, prev.unread - 1) : prev.unread,
        }))
        return
      }

      const { error } = await supabase
        .from("client_notifications")
        .delete()
        .eq("id", notificationId)

      if (!error) {
        setNotifications(prev => prev.filter(n => n.id !== notificationId))
        // Mettre à jour les compteurs en fonction du statut de la notification
        setCounts(prev => ({
          ...prev,
          all: Math.max(0, prev.all - 1),
          unread: wasUnread ? Math.max(0, prev.unread - 1) : prev.unread,
        }))
      }
    } catch (error) {
      // Error deleting notification
    }
  }

  const deleteAllNotifications = async () => {
    if (!user) return

    try {
      // Supprimer toutes les notifications fictives localement
      setNotifications([])
      setCounts({ all: 0, unread: 0, read: 0, archived: 0 })

      // Supprimer les notifications réelles dans Supabase
      const { error } = await supabase
        .from("client_notifications")
        .delete()
        .eq("flynesis_user_id", user.id)

      if (error) {
        // Error deleting all notifications
      }
    } catch (error) {
      // Error deleting all notifications
    }
  }

  const unarchiveNotification = async (notificationId: string) => {
    try {
      // Si c'est une notification fictive, on la désarchive juste localement
      if (notificationId.startsWith("mock-")) {
        setNotifications(prev =>
          prev.map(n => n.id === notificationId ? { ...n, archived: false } : n)
        )
        // Mettre à jour les compteurs
        const notificationToUnarchive = notifications.find(n => n.id === notificationId)
        const wasUnread = notificationToUnarchive && !notificationToUnarchive.read
        setCounts(prev => ({
          ...prev,
          archived: Math.max(0, prev.archived - 1),
          unread: wasUnread ? prev.unread + 1 : prev.unread,
        }))
        return
      }

      // Désarchiver la notification réelle dans Supabase
      const { error } = await supabase
        .from("client_notifications")
        .update({ archived: false })
        .eq("id", notificationId)

      if (!error) {
        // Mettre à jour le statut localement
        const notificationToUnarchive = notifications.find(n => n.id === notificationId)
        const wasUnread = notificationToUnarchive && !notificationToUnarchive.read
        setNotifications(prev =>
          prev.map(n => n.id === notificationId ? { ...n, archived: false } : n)
        )
        // Mettre à jour les compteurs
        setCounts(prev => ({
          ...prev,
          archived: Math.max(0, prev.archived - 1),
          unread: wasUnread ? prev.unread + 1 : prev.unread,
        }))
      }
    } catch (error) {
      // Error unarchiving notification
    }
  }

  const archiveNotification = async (notificationId: string) => {
    try {
      // Si c'est une notification fictive, on l'archive juste localement
      if (notificationId.startsWith("mock-")) {
        setNotifications(prev => prev.filter(n => n.id !== notificationId))
        // Mettre à jour les compteurs (on retire la notification archivée)
        const notificationToArchive = notifications.find(n => n.id === notificationId)
        const wasUnread = notificationToArchive && !notificationToArchive.read
        setCounts(prev => ({
          ...prev,
          archived: prev.archived + 1,
          unread: wasUnread ? Math.max(0, prev.unread - 1) : prev.unread,
        }))
        return
      }

      // Archiver la notification réelle dans Supabase
      // Vérifier si la colonne archived existe
      const { error: checkError } = await supabase
        .from("client_notifications")
        .select("archived")
        .eq("id", notificationId)
        .limit(1)

      if (checkError && checkError.code === '42703') {
        // La colonne n'existe pas, on supprime simplement la notification
        const { error: deleteError } = await supabase
          .from("client_notifications")
          .delete()
          .eq("id", notificationId)
        
        if (!deleteError) {
          const notificationToDelete = notifications.find(n => n.id === notificationId)
          const wasUnread = notificationToDelete && !notificationToDelete.read
          setNotifications(prev => prev.filter(n => n.id !== notificationId))
          setCounts(prev => ({
            ...prev,
            all: Math.max(0, prev.all - 1),
            unread: wasUnread ? Math.max(0, prev.unread - 1) : prev.unread,
          }))
        }
        return
      }

      const { error } = await supabase
        .from("client_notifications")
        .update({ archived: true })
        .eq("id", notificationId)

      if (!error) {
        // Retirer la notification de la liste seulement si on n'est pas dans le filtre archives
        if (filter !== "archived") {
          const notificationToArchive = notifications.find(n => n.id === notificationId)
          const wasUnread = notificationToArchive && !notificationToArchive.read
          setNotifications(prev => prev.filter(n => n.id !== notificationId))
          // Mettre à jour les compteurs
          setCounts(prev => ({
            ...prev,
            archived: prev.archived + 1,
            unread: wasUnread ? Math.max(0, prev.unread - 1) : prev.unread,
          }))
        } else {
          // Si on est dans les archives, mettre à jour seulement le statut
          setNotifications(prev =>
            prev.map(n => n.id === notificationId ? { ...n, archived: true } : n)
          )
        }
      }
    } catch (error) {
      // Error archiving notification
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

  const unreadCount = counts.unread

  return (
    <div className="fixed inset-0 w-full h-full overflow-y-auto bg-gradient-to-br from-blue-50/40 via-white to-purple-50/20 pb-28 sm:pb-32 safe-area-top safe-area-bottom">
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
            <div className="flex items-center gap-2">
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
              {notifications.length > 0 && (
                <motion.button
                  onClick={deleteAllNotifications}
                  className="text-sm text-red-600 font-light hover:text-red-700 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/50 backdrop-blur-sm border border-white/30"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Trash2 className="h-4 w-4" />
                  Tout supprimer
                </motion.button>
              )}
            </div>
          </div>

          {/* Filtres */}
          <div className="flex gap-2 flex-wrap">
            <motion.button
              onClick={() => setFilter("all")}
              className={`px-4 py-2 rounded-xl text-sm font-light transition-all ${
                filter === "all"
                  ? "bg-blue-600 text-white shadow-[0_4px_20px_rgba(59,130,246,0.3)]"
                  : "bg-white/50 backdrop-blur-sm text-gray-600 border border-white/30 hover:bg-white/70"
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Toutes ({counts.all})
            </motion.button>
            <motion.button
              onClick={() => setFilter("unread")}
              className={`px-4 py-2 rounded-xl text-sm font-light transition-all ${
                filter === "unread"
                  ? "bg-blue-600 text-white shadow-[0_4px_20px_rgba(59,130,246,0.3)]"
                  : "bg-white/50 backdrop-blur-sm text-gray-600 border border-white/30 hover:bg-white/70"
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Non lues ({unreadCount})
            </motion.button>
            <motion.button
              onClick={() => setFilter("read")}
              className={`px-4 py-2 rounded-xl text-sm font-light transition-all ${
                filter === "read"
                  ? "bg-blue-600 text-white shadow-[0_4px_20px_rgba(59,130,246,0.3)]"
                  : "bg-white/50 backdrop-blur-sm text-gray-600 border border-white/30 hover:bg-white/70"
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Lues ({counts.read})
            </motion.button>
            <motion.button
              onClick={() => setFilter("archived")}
              className={`px-4 py-2 rounded-xl text-sm font-light transition-all ${
                filter === "archived"
                  ? "bg-blue-600 text-white shadow-[0_4px_20px_rgba(59,130,246,0.3)]"
                  : "bg-white/50 backdrop-blur-sm text-gray-600 border border-white/30 hover:bg-white/70"
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Archives ({counts.archived})
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Liste des notifications */}
      <div className="w-full px-4 sm:px-6 py-6 sm:py-8 pb-28 sm:pb-32">
        {filteredNotifications.length > 0 ? (
          <div className="space-y-3">
            <AnimatePresence>
              {filteredNotifications.map((notification, index) => (
                <SwipeableNotification
                  key={notification.id}
                  notification={notification}
                  index={index}
                  onArchive={filter === "archived" ? () => unarchiveNotification(notification.id) : () => archiveNotification(notification.id)}
                  onDelete={() => deleteNotification(notification.id)}
                  onRead={() => {
                    if (!notification.read) {
                      markAsRead(notification.id)
                    }
                  }}
                  onClick={() => {
                    if (notification.link) {
                      router.push(notification.link)
                    }
                  }}
                  isSwiped={swipedId === notification.id}
                  onSwipeStart={() => setSwipedId(notification.id)}
                  onSwipeEnd={() => setSwipedId(null)}
                  isArchived={filter === "archived"}
                />
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
                  : filter === "read"
                  ? "Vous n'avez pas de notifications lues"
                  : filter === "archived"
                  ? "Vous n'avez pas de notifications archivées"
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

