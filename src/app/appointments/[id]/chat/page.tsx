"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft, Send, MessageCircle, Lock, LockOpen, Clock, Sparkles, RotateCcw } from "lucide-react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BottomNavigation } from "@/components/layout/BottomNavigation"
import { useAuth } from "@/lib/hooks/use-auth"
import { supabase } from "@/lib/supabase/client"
import { formatDateTime } from "@/lib/utils"
import { showElegantToast } from "@/components/ui/elegant-toast"
import { Textarea } from "@/components/ui/textarea"
import type { Appointment, Garage } from "@/lib/types/database"

interface ChatMessage {
  id: string
  sender_id: string
  sender_type: 'client' | 'garage'
  message: string
  created_at: string
  read_at: string | null
}

interface Chat {
  id: string
  appointment_id: string
  is_open: boolean
  opened_at: string | null
  closed_at: string | null
}

export default function AppointmentChatPage() {
  const router = useRouter()
  const params = useParams()
  const appointmentId = params.id as string
  const { user, loading: authLoading } = useAuth()
  
  const [chat, setChat] = useState<Chat | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [appointment, setAppointment] = useState<Appointment | null>(null)
  const [garage, setGarage] = useState<Garage | null>(null)
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [clientAccountId, setClientAccountId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Vérifier si le client peut envoyer un message (tour par tour)
  const canClientSendMessage = () => {
    if (!chat?.is_open) return false
    if (messages.length === 0) return true // Premier message
    
    const lastMessage = messages[messages.length - 1]
    // Le client peut envoyer seulement si le dernier message est du garage
    return lastMessage.sender_type === 'garage'
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

    // Subscribe to real-time updates pour les messages
    const channel = supabase
      .channel(`chat_${appointmentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "appointment_chat_messages",
          filter: `chat_id=eq.${chat?.id || ''}`,
        },
        () => {
          loadMessages()
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "appointment_chats",
          filter: `appointment_id=eq.${appointmentId}`,
        },
        () => {
          loadChat()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, router, appointmentId, authLoading, chat?.id])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const loadData = async () => {
    if (!user || !appointmentId) return

    setLoading(true)
    try {
      // Charger le compte client
      const { data: accountData } = await supabase
        .from("fly_accounts")
        .select("id")
        .eq("auth_user_id", user.id)
        .maybeSingle()

      if (accountData) {
        setClientAccountId(accountData.id)
      }

      // Charger le rendez-vous
      // Note: flynesis_user_id dans appointments référence auth.users.id
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

      await loadChat()
    } catch (error: any) {
      console.error("Error loading data:", error)
      showElegantToast({
        title: "Erreur",
        message: error.message || "Impossible de charger les données",
        variant: "error",
      })
      setTimeout(() => router.push("/appointments"), 2000)
    } finally {
      setLoading(false)
    }
  }

  const loadChat = async () => {
    if (!appointmentId) return

    try {
      // Charger le chat s'il existe
      let { data: chatData, error: loadError } = await supabase
        .from("appointment_chats")
        .select("*")
        .eq("appointment_id", appointmentId)
        .maybeSingle()

      // Si les tables n'existent pas, on continue quand même pour afficher la page explicative
      if (loadError && loadError.code !== '42P01' && !loadError.message?.includes('does not exist')) {
        console.log("Error loading chat:", loadError)
      }

      if (chatData) {
        setChat(chatData)
        await loadMessages(chatData.id)
      } else {
        // Pas de chat créé, on affiche la page explicative
        setChat({
          id: '',
          appointment_id: appointmentId,
          is_open: false,
          opened_at: null,
          closed_at: null
        } as Chat)
      }
    } catch (error) {
      console.error("Error loading chat:", error)
      // En cas d'erreur, on affiche quand même la page avec le chat fermé
      setChat({
        id: '',
        appointment_id: appointmentId,
        is_open: false,
        opened_at: null,
        closed_at: null
      } as Chat)
    }
  }

  const loadMessages = async (chatId?: string) => {
    const chatIdToUse = chatId || chat?.id
    if (!chatIdToUse) return

    try {
      const { data: messagesData, error } = await supabase
        .from("appointment_chat_messages")
        .select("*")
        .eq("chat_id", chatIdToUse)
        .order("created_at", { ascending: true })

      if (!error && messagesData) {
        setMessages(messagesData)
        
        // Marquer les messages du garage comme lus
        const unreadGarageMessages = messagesData.filter(
          m => m.sender_type === 'garage' && !m.read_at
        )
        
        if (unreadGarageMessages.length > 0) {
          await supabase
            .from("appointment_chat_messages")
            .update({ read_at: new Date().toISOString() })
            .in("id", unreadGarageMessages.map(m => m.id))
        }
      }
    } catch (error) {
      console.error("Error loading messages:", error)
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !chat || !clientAccountId || sending) return

    if (!canClientSendMessage()) {
      showElegantToast({
        title: "Attente requise",
        message: "Veuillez attendre une réponse du garage avant d'envoyer un nouveau message.",
        variant: "error",
      })
      return
    }

    setSending(true)
    try {
      const { error } = await supabase
        .from("appointment_chat_messages")
        .insert({
          chat_id: chat.id,
          sender_id: clientAccountId,
          sender_type: 'client',
          message: newMessage.trim(),
        })

      if (error) throw error

      setNewMessage("")
      await loadMessages()
    } catch (error: any) {
      console.error("Error sending message:", error)
      showElegantToast({
        title: "Erreur",
        message: error.message || "Impossible d'envoyer le message",
        variant: "error",
      })
    } finally {
      setSending(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-600 mb-2">Chargement du chat...</div>
          <div className="text-sm text-gray-400">Veuillez patienter</div>
        </div>
      </div>
    )
  }

  if (!appointment) {
    return null
  }

  // Si le chat n'existe pas encore, afficher la page explicative
  const showExplanatoryPage = !chat || !chat.id

  return (
    <>
      <div className="h-full w-full bg-gradient-to-br from-blue-50/40 via-white to-purple-50/20 overflow-hidden flex flex-col safe-area-top safe-area-bottom pb-32">
        {/* Mobile Container avec effet Liquid Glass */}
        <div className="w-full h-full bg-white/70 backdrop-blur-2xl overflow-hidden flex flex-col">
          {/* Header avec verre givré amélioré */}
          <div className="px-6 py-5 bg-gradient-to-r from-white/80 via-white/60 to-white/80 backdrop-blur-2xl border-b border-white/30 sticky top-0 z-10 shadow-sm">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.back()}
                className="h-10 w-10 rounded-xl hover:bg-gray-100/80 transition-all hover:scale-105"
              >
                <ArrowLeft className="h-5 w-5 text-gray-700" />
              </Button>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-semibold text-gray-900 tracking-tight">Chat</h1>
                {garage && (
                  <p className="text-sm text-gray-500 font-medium truncate">{garage.name}</p>
                )}
              </div>
              {chat && chat.id && (
                <>
                  {!chat.is_open && (
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="flex items-center gap-2 text-xs font-medium text-gray-600 bg-gradient-to-r from-gray-100 to-gray-50 px-4 py-2 rounded-full border border-gray-200/50 shadow-sm"
                    >
                      <Lock className="h-3.5 w-3.5" />
                      <span>Fermé</span>
                    </motion.div>
                  )}
                  {chat.is_open && (
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="flex items-center gap-2 text-xs font-medium text-green-700 bg-gradient-to-r from-green-50 to-emerald-50 px-4 py-2 rounded-full border border-green-200/50 shadow-sm"
                    >
                      <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                      <LockOpen className="h-3.5 w-3.5" />
                      <span>Ouvert</span>
                    </motion.div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Messages avec effet Liquid Glass */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-4 pb-4">
            {showExplanatoryPage ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="max-w-2xl mx-auto py-8 px-4"
              >
                {/* Icône principale avec animation */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  className="relative inline-block mb-8 mx-auto"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-400/30 via-purple-400/30 to-pink-400/30 rounded-full blur-2xl animate-pulse" />
                  <div className="relative bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-xl border-2 border-white/60 rounded-3xl p-8 shadow-2xl">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-lg" />
                      <MessageCircle className="h-16 w-16 text-gray-400 relative z-10" />
                    </div>
                  </div>
                </motion.div>

                {/* Titre avec gradient */}
                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-center mb-2"
                >
                  Chat avec le garage
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-sm text-gray-500 text-center mb-8 font-medium"
                >
                  Communication sécurisée et organisée
                </motion.p>

                {/* Explication avec cartes améliorées */}
                <div className="space-y-4">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                    className="group relative bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-xl border-2 border-blue-200/50 rounded-2xl p-5 shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative flex items-start gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform">
                        <Lock className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1 pt-1">
                        <h3 className="font-bold text-gray-900 mb-2 text-lg">Le garage contrôle le chat</h3>
                        <p className="text-sm text-gray-600 leading-relaxed">
                          Le garage peut ouvrir ou fermer le chat selon ses besoins. Vous recevrez une notification lorsque le chat sera ouvert.
                        </p>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 }}
                    className="group relative bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-xl border-2 border-purple-200/50 rounded-2xl p-5 shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-pink-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative flex items-start gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform">
                        <RotateCcw className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1 pt-1">
                        <h3 className="font-bold text-gray-900 mb-2 text-lg">Communication tour par tour</h3>
                        <p className="text-sm text-gray-600 leading-relaxed">
                          Le garage peut envoyer plusieurs messages. Vous devez attendre une réponse du garage avant de pouvoir envoyer un nouveau message.
                        </p>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 }}
                    className="group relative bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-xl border-2 border-green-200/50 rounded-2xl p-5 shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 to-emerald-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative flex items-start gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform">
                        <Clock className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1 pt-1">
                        <h3 className="font-bold text-gray-900 mb-2 text-lg">Temps réel</h3>
                        <p className="text-sm text-gray-600 leading-relaxed">
                          Les messages sont synchronisés en temps réel. Vous verrez les nouveaux messages dès qu'ils arrivent.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                </div>

                {/* Message final */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  className="mt-8 p-5 bg-gradient-to-r from-blue-50/50 to-purple-50/50 backdrop-blur-sm border border-blue-200/30 rounded-2xl"
                >
                  <div className="flex items-center gap-3 justify-center">
                    <Sparkles className="h-5 w-5 text-blue-600" />
                    <p className="text-sm text-gray-700 font-medium text-center">
                      Le garage ouvrira le chat s'il a besoin de vous contacter concernant votre réservation.
                    </p>
                  </div>
                </motion.div>
              </motion.div>
            ) : messages.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-20 px-4"
              >
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-400/30 via-purple-400/30 to-pink-400/30 rounded-full blur-2xl animate-pulse" />
                  <div className="relative bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-xl border-2 border-white/60 rounded-full p-8 shadow-2xl">
                    <MessageCircle className="h-14 w-14 text-gray-400" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {chat.is_open ? "Aucun message pour le moment" : "Chat fermé"}
                </h3>
                <p className="text-gray-500 font-medium text-sm max-w-sm mx-auto text-center">
                  {chat.is_open 
                    ? "Commencez la conversation en envoyant votre premier message !"
                    : "Le garage l'ouvrira s'il a besoin de vous contacter."}
                </p>
              </motion.div>
            ) : (
              messages.map((message, index) => {
                const isClient = message.sender_type === 'client'
                return (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: index * 0.03, type: "spring", stiffness: 200 }}
                    className={`flex ${isClient ? 'justify-end' : 'justify-start'} items-end gap-3 mb-1`}
                  >
                    {!isClient && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: index * 0.03 + 0.1 }}
                        className="h-10 w-10 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center flex-shrink-0 shadow-lg ring-2 ring-white/50"
                      >
                        <span className="text-white text-sm font-bold">
                          {garage?.name?.charAt(0).toUpperCase() || 'G'}
                        </span>
                      </motion.div>
                    )}
                    <div className="relative group max-w-[75%]">
                      {isClient && (
                        <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/30 via-purple-500/30 to-pink-500/30 rounded-3xl blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      )}
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        className={`relative rounded-3xl px-5 py-3.5 shadow-xl ${
                          isClient
                            ? 'bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 text-white'
                            : 'bg-white/95 backdrop-blur-xl border-2 border-gray-100 text-gray-900 shadow-[0_8px_30px_rgba(0,0,0,0.12)]'
                        }`}
                      >
                        <p className={`text-[15px] whitespace-pre-wrap leading-relaxed ${isClient ? 'text-white' : 'text-gray-800'}`}>
                          {message.message}
                        </p>
                        <p className={`text-[11px] mt-2 font-medium ${isClient ? 'text-white/80' : 'text-gray-500'}`}>
                          {new Date(message.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </motion.div>
                    </div>
                    {isClient && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: index * 0.03 + 0.1 }}
                        className="h-10 w-10 rounded-2xl bg-gradient-to-br from-blue-500 via-purple-600 to-pink-600 flex items-center justify-center flex-shrink-0 shadow-lg ring-2 ring-white/50"
                      >
                        <span className="text-white text-sm font-bold">
                          {user?.email?.charAt(0).toUpperCase() || 'M'}
                        </span>
                      </motion.div>
                    )}
                  </motion.div>
                )
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input avec effet Liquid Glass amélioré */}
          {chat && chat.id && chat.is_open ? (
            <div className="px-4 sm:px-6 py-4 bg-gradient-to-r from-white/90 via-white/80 to-white/90 backdrop-blur-2xl border-t border-gray-200/50 safe-area-bottom shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
              {!canClientSendMessage() && messages.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-3 p-3.5 bg-gradient-to-r from-amber-50 to-orange-50 backdrop-blur-sm border-2 border-amber-200/60 rounded-2xl shadow-sm"
                >
                  <div className="flex items-center gap-2 justify-center">
                    <Clock className="h-4 w-4 text-amber-600" />
                    <p className="text-xs text-amber-800 text-center font-semibold">
                      Attendez une réponse du garage avant d'envoyer un nouveau message
                    </p>
                  </div>
                </motion.div>
              )}
              <div className="flex gap-3 items-end">
                <div className="flex-1 relative">
                  <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 rounded-2xl blur-lg opacity-0 focus-within:opacity-100 transition-opacity duration-300" />
                  <Textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={canClientSendMessage() ? "Tapez votre message..." : "Attendez une réponse du garage..."}
                    disabled={!canClientSendMessage() || sending}
                    className="relative flex-1 min-h-[64px] max-h-[140px] resize-none rounded-2xl bg-white/95 backdrop-blur-xl border-2 border-gray-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-200/30 transition-all shadow-lg text-[15px] placeholder:text-gray-400 disabled:opacity-60 disabled:cursor-not-allowed"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSendMessage()
                      }
                    }}
                  />
                </div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    onClick={handleSendMessage}
                    disabled={!canClientSendMessage() || sending || !newMessage.trim()}
                    className="h-[64px] w-[64px] p-0 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 text-white rounded-2xl shadow-xl hover:shadow-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    <Send className="h-5 w-5" />
                  </Button>
                </motion.div>
              </div>
            </div>
          ) : (
            <div className="px-4 sm:px-6 py-6 bg-gradient-to-r from-white/90 via-white/80 to-white/90 backdrop-blur-2xl border-t border-gray-200/50 safe-area-bottom shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-4"
              >
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="relative inline-block mb-4"
                >
                  <div className="absolute inset-0 bg-gray-300/30 rounded-full blur-xl" />
                  <div className="relative bg-gradient-to-br from-gray-100 to-gray-50 backdrop-blur-xl border-2 border-gray-200 rounded-full p-5 shadow-lg">
                    <Lock className="h-10 w-10 text-gray-400" />
                  </div>
                </motion.div>
                <h3 className="text-base font-semibold text-gray-900 mb-2">Chat fermé</h3>
                <p className="text-sm text-gray-600 font-medium max-w-sm mx-auto">
                  Le garage l'ouvrira s'il a besoin de vous contacter concernant votre réservation.
                </p>
              </motion.div>
            </div>
          )}
        </div>
      </div>

      <BottomNavigation />
    </>
  )
}

