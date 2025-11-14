"use client"

import { useState, useEffect, useRef, useCallback } from "react"
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
  chat_id: string
  sender_type: 'client' | 'garage'
  message: string
  created_at: string
  read_at: string | null
}

export default function ChatPageClient() {
  const router = useRouter()
  const params = useParams()
  const appointmentId = params.id as string
  const { user, loading: authLoading } = useAuth()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [chat, setChat] = useState<any>(null)
  const [appointment, setAppointment] = useState<Appointment | null>(null)
  const [garage, setGarage] = useState<Garage | null>(null)
  const [loading, setLoading] = useState(true)
  const [newMessage, setNewMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [clientAccountId, setClientAccountId] = useState<string | null>(null)

  const loadMessages = useCallback(async (chatId?: string) => {
    const targetChatId = chatId || chat?.id
    if (!targetChatId) return

    try {
      const { data: messagesData, error } = await supabase
        .from("appointment_chat_messages")
        .select("*")
        .eq("chat_id", targetChatId)
        .order("created_at", { ascending: true })
        .limit(1000)

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
      // Error handling
    }
  }, [chat?.id])

  const canClientSendMessage = useCallback(() => {
    if (!messages.length) return true
    const lastMessage = messages[messages.length - 1]
    return lastMessage.sender_type === 'garage'
  }, [messages])

  const loadChat = useCallback(async () => {
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
        })
      }
    } catch (error) {
      // Error handling
    }
  }, [appointmentId])

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      router.push("/login")
      return
    }

    loadData()
  }, [user, authLoading, appointmentId])

  useEffect(() => {
    if (!chat?.id) return

    const channel = supabase
      .channel(`chat:${chat.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'appointment_chat_messages',
        filter: `chat_id=eq.${chat.id}`,
      }, () => {
        loadMessages()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [chat?.id, loadMessages])

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
      showElegantToast({
        title: "Erreur",
        message: error.message || "Erreur lors du chargement",
        variant: "error",
      })
      setTimeout(() => router.push("/appointments"), 2000)
    } finally {
      setLoading(false)
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !chat || !clientAccountId || sending) return

    if (!canClientSendMessage()) {
      showElegantToast({
        title: "Attente requise",
        message: "Attendez une réponse du garage avant d'envoyer un nouveau message",
        variant: "info",
      })
      return
    }

    setSending(true)
    try {
      const { error } = await supabase
        .from("appointment_chat_messages")
        .insert({
          chat_id: chat.id,
          sender_type: 'client',
          message: newMessage.trim(),
        })

      if (error) throw error

      setNewMessage("")
      await loadMessages()
    } catch (error: any) {
      showElegantToast({
        title: "Erreur",
        message: error.message || "Erreur lors de l'envoi du message",
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
      {/* Background avec gradient bleu clair de l'app */}
      <div className="h-full w-full bg-gradient-to-b from-blue-50 via-indigo-50/30 to-blue-50 overflow-hidden flex flex-col safe-area-top safe-area-bottom pb-32">
        {/* Container principal */}
        <div className="w-full h-full overflow-hidden flex flex-col">
          {/* Header glassmorphism */}
          <div className="px-4 sm:px-6 py-4 bg-white/70 backdrop-blur-xl border-b border-indigo-100/50 sticky top-0 z-10 shadow-sm">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.back()}
                className="h-10 w-10 rounded-full hover:bg-indigo-50 transition-all text-gray-700"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              {/* Avatar et infos */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-md border-2 border-white">
                  <span className="text-white text-sm font-semibold">
                    {garage?.name?.charAt(0).toUpperCase() || 'G'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-base font-semibold text-gray-900 truncate">
                    {garage?.name || 'Garage'}
                  </h1>
                  {chat && chat.id && (
                    <div className="flex items-center gap-1.5">
                      <div className={`h-1.5 w-1.5 rounded-full ${chat.is_open ? 'bg-green-500' : 'bg-gray-400'}`} />
                      <p className="text-xs text-gray-600">
                        {chat.is_open ? 'En ligne' : 'Hors ligne'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Zone de messages */}
          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 pb-4">
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
                  className="relative inline-block mb-4 sm:mb-6 mx-auto"
                >
                  <div className="relative bg-white/90 backdrop-blur-sm border border-gray-200 rounded-full p-4 shadow-md">
                    <MessageCircle className="h-8 w-8 text-indigo-600 relative z-10" />
                  </div>
                </motion.div>

                {/* Titre avec gradient */}
                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-2xl sm:text-3xl font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent text-center mb-2"
                >
                  Chat avec le garage
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-sm text-gray-600 text-center mb-8"
                >
                  Communication sécurisée et organisée
                </motion.p>

                {/* Explication avec cartes améliorées */}
                <div className="space-y-3">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                    className="bg-white/90 backdrop-blur-sm border border-gray-200 rounded-xl p-4 shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-md">
                        <Lock className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1 pt-0.5">
                        <h3 className="font-semibold text-gray-900 mb-1.5 text-base">Le garage contrôle le chat</h3>
                        <p className="text-sm text-gray-700 leading-relaxed">
                          Le garage peut ouvrir ou fermer le chat selon ses besoins. Vous recevrez une notification lorsque le chat sera ouvert.
                        </p>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 }}
                    className="bg-white/90 backdrop-blur-sm border border-gray-200 rounded-xl p-4 shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-md">
                        <RotateCcw className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1 pt-0.5">
                        <h3 className="font-semibold text-gray-900 mb-1.5 text-base">Communication tour par tour</h3>
                        <p className="text-sm text-gray-700 leading-relaxed">
                          Le garage peut envoyer plusieurs messages. Vous devez attendre une réponse du garage avant de pouvoir envoyer un nouveau message.
                        </p>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 }}
                    className="bg-white/90 backdrop-blur-sm border border-gray-200 rounded-xl p-4 shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-md">
                        <Clock className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1 pt-0.5">
                        <h3 className="font-semibold text-gray-900 mb-1.5 text-base">Temps réel</h3>
                        <p className="text-sm text-gray-700 leading-relaxed">
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
                  className="mt-6 p-4 bg-indigo-50/80 backdrop-blur-sm border border-indigo-200 rounded-xl"
                >
                  <div className="flex items-center gap-2 justify-center">
                    <Sparkles className="h-4 w-4 text-indigo-600" />
                    <p className="text-sm text-gray-700 text-center font-medium">
                      Le garage ouvrira le chat s'il a besoin de vous contacter concernant votre réservation.
                    </p>
                  </div>
                </motion.div>
              </motion.div>
            ) : messages.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-16 sm:py-20 px-4"
              >
                <div className="relative mb-4 sm:mb-5">
                  <div className="relative bg-white/90 backdrop-blur-sm border border-gray-200 rounded-full p-4 shadow-md">
                    <MessageCircle className="h-8 w-8 text-indigo-600 relative z-10" />
                  </div>
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-1.5">
                  {chat.is_open ? "Aucun message pour le moment" : "Chat fermé"}
                </h3>
                <p className="text-xs text-gray-600 max-w-sm mx-auto text-center">
                  {chat.is_open 
                    ? "Commencez la conversation en envoyant votre premier message !"
                    : "Le garage l'ouvrira s'il a besoin de vous contacter."}
                </p>
              </motion.div>
            ) : (
              messages.map((message, index) => {
                const isClient = message.sender_type === 'client'
                const messageTime = new Date(message.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                
                return (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className={`flex ${isClient ? 'justify-end' : 'justify-start'} items-start gap-3`}
                  >
                    {/* Avatar pour les messages du garage (gauche) */}
                    {!isClient && (
                      <div className="flex flex-col items-center gap-1 flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md border-2 border-white">
                          <span className="text-white text-sm font-semibold">
                            {garage?.name?.charAt(0).toUpperCase() || 'G'}
                          </span>
                        </div>
                        <span className="text-[10px] text-gray-600 font-medium">{messageTime}</span>
                      </div>
                    )}
                    
                    {/* Bulle de message */}
                    <div className={`max-w-[75%] ${isClient ? 'order-2' : ''}`}>
                      <div
                        className={`rounded-2xl px-4 py-3 shadow-md ${
                          isClient
                            ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white'
                            : 'bg-white/90 backdrop-blur-sm border border-gray-200 text-gray-900'
                        }`}
                      >
                        <p className={`text-sm whitespace-pre-wrap leading-relaxed font-medium ${
                          isClient ? 'text-white' : 'text-gray-900'
                        }`}>
                          {message.message}
                        </p>
                      </div>
                      {/* Timestamp pour les messages client (droite) */}
                      {isClient && (
                        <span className="text-[10px] text-gray-600 font-medium mt-1 block text-right">
                          {messageTime}
                        </span>
                      )}
                    </div>
                  </motion.div>
                )
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input glassmorphism */}
          {chat && chat.id && chat.is_open ? (
            <div className="px-4 py-4 bg-white/70 backdrop-blur-xl border-t border-indigo-100/50 safe-area-bottom shadow-sm">
              {!canClientSendMessage() && messages.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-3 p-3 bg-amber-50/90 backdrop-blur-sm border border-amber-200 rounded-xl"
                >
                  <div className="flex items-center gap-2 justify-center">
                    <Clock className="h-3.5 w-3.5 text-amber-700" />
                    <p className="text-xs text-amber-900 text-center font-medium">
                      Attendez une réponse du garage avant d'envoyer un nouveau message
                    </p>
                  </div>
                </motion.div>
              )}
              <div className="flex gap-3 items-end">
                <Textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={canClientSendMessage() ? "Tapez votre message..." : "Attendez une réponse du garage..."}
                  disabled={!canClientSendMessage() || sending}
                  className="flex-1 min-h-[50px] max-h-[120px] resize-none rounded-2xl bg-white/90 backdrop-blur-sm border border-gray-200 text-gray-900 placeholder:text-gray-500 shadow-sm text-sm disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-300"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSendMessage()
                    }
                  }}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!canClientSendMessage() || sending || !newMessage.trim()}
                  className="h-[50px] w-[50px] p-0 bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-2xl shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="h-5 w-5" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="px-4 py-6 bg-white/70 backdrop-blur-xl border-t border-indigo-100/50 safe-area-bottom shadow-sm">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-4"
              >
                <div className="relative inline-block mb-3">
                  <div className="bg-white/90 backdrop-blur-sm border border-gray-200 rounded-full p-3 shadow-md">
                    <Lock className="h-6 w-6 text-gray-600" />
                  </div>
                </div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1.5">Chat fermé</h3>
                <p className="text-xs text-gray-600 max-w-sm mx-auto">
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

