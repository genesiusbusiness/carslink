"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowLeft, Send, Bot, User, AlertCircle, Clock, CheckCircle, Calendar, X, Check, Trash2, Menu, Plus, Car, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { ModelId } from "@/lib/openrouter"
import { FREE_MODELS } from "@/lib/openrouter"
import { BottomNavigation } from "@/components/layout/BottomNavigation"
import { useAuth } from "@/lib/hooks/use-auth"
import { supabase } from "@/lib/supabase/client"
import type { AIChatMessage, Vehicle, Profile } from "@/lib/types/database"
import { useToast } from "@/components/ui/use-toast"

export default function AIChatPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const [messages, setMessages] = useState<AIChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [apiAvailable, setApiAvailable] = useState(true)
  const [suggestedQuestions, setSuggestedQuestions] = useState<Array<{question: string, options: string[]}>>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
  const [showVehicleSelector, setShowVehicleSelector] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [conversations, setConversations] = useState<Array<{id: string, created_at: string, updated_at: string, message_count: number}>>([])
  const [showConversationsList, setShowConversationsList] = useState(false)
  const [selectedConversations, setSelectedConversations] = useState<Set<string>>(new Set())
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [selectedAnswers, setSelectedAnswers] = useState<Map<number, string>>(new Map())
  const [selectedModel, setSelectedModel] = useState<ModelId | undefined>(undefined) // undefined = utiliser le modèle par défaut
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastMessageRef = useRef<string>("")

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
      return
    }
  }, [user, authLoading, router])

  // Charger le profil et les véhicules du client
  useEffect(() => {
    if (!user) return

    const loadUserData = async () => {
      try {
        // Charger le profil
        const { data: flyAccount, error: flyAccountError } = await supabase
          .from('fly_accounts')
          .select('id')
          .eq('auth_user_id', user.id)
          .single()

        if (flyAccountError) {
          console.error('❌ Erreur lors du chargement du compte FlyID:', flyAccountError)
          return
        }

        if (flyAccount) {
          // Charger le profil complet depuis fly_accounts (contient first_name, last_name, email)
          const { data: flyAccountFull, error: flyAccountFullError } = await supabase
            .from('fly_accounts')
            .select('*')
            .eq('id', flyAccount.id)
            .single()

          if (flyAccountFullError) {
            console.error('❌ Erreur lors du chargement du profil fly_accounts:', flyAccountFullError)
          } else if (flyAccountFull) {
            // Charger aussi carslink_clients pour le phone
            const { data: profileData, error: profileError } = await supabase
              .from('carslink_clients')
              .select('*')
              .eq('flyid', flyAccount.id)
              .single()

            // Combiner les données de fly_accounts et carslink_clients
            const combinedProfile = {
              ...flyAccountFull,
              phone: profileData?.phone || flyAccountFull.phone || null,
            }
            console.log('✅ Profil client chargé:', combinedProfile)
            setProfile(combinedProfile as Profile)
          }

          // Charger les véhicules
          const { data: vehiclesData, error: vehiclesError } = await supabase
            .from('vehicles')
            .select('*')
            .eq('flynesis_user_id', flyAccount.id)
            .order('created_at', { ascending: false })

          if (vehiclesError) {
            console.error('❌ Erreur lors du chargement des véhicules:', vehiclesError)
          } else if (vehiclesData) {
            console.log('✅ Véhicules chargés depuis le profil CarsLink:', vehiclesData.length, 'véhicule(s)')
            vehiclesData.forEach((v, i) => {
              console.log(`  ${i + 1}. ${v.brand} ${v.model}${v.year ? ` (${v.year})` : ''}${v.license_plate ? ` - ${v.license_plate}` : ''}`)
            })
            const vehiclesList = vehiclesData as Vehicle[]
            setVehicles(vehiclesList)
            
            // Si aucun véhicule n'est sélectionné et qu'il y a des véhicules, afficher le sélecteur
            if (vehiclesList.length > 0 && !selectedVehicle) {
              setShowVehicleSelector(true)
            }
          } else {
            console.log('ℹ️ Aucun véhicule trouvé dans le profil CarsLink')
            // Si aucun véhicule, afficher quand même le sélecteur pour informer l'utilisateur
            if (vehicles.length === 0) {
              setShowVehicleSelector(true)
            }
          }
        }
      } catch (error) {
        console.error('❌ Erreur lors du chargement du profil:', error)
      }
    }

    loadUserData()
  }, [user])

  // Charger l'historique des conversations (15 jours)
  useEffect(() => {
    if (!user) return

    const loadConversations = async () => {
      try {
        const { data: flyAccount } = await supabase
          .from('fly_accounts')
          .select('id')
          .eq('auth_user_id', user.id)
          .single()

        if (!flyAccount) return

        // Récupérer les conversations des 15 derniers jours
        const fifteenDaysAgo = new Date()
        fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15)

        // Supprimer automatiquement les conversations de plus de 15 jours
        const { error: deleteError } = await supabase
          .from('ai_chat_conversations')
          .delete()
          .eq('flynesis_user_id', flyAccount.id)
          .lt('created_at', fifteenDaysAgo.toISOString())

        if (deleteError) {
          console.error('❌ Erreur lors de la suppression des anciennes conversations:', deleteError)
        } else {
          console.log('✅ Nettoyage automatique : conversations de plus de 15 jours supprimées')
        }

        const { data: conversationsData, error } = await supabase
          .from('ai_chat_conversations')
          .select('id, created_at, updated_at')
          .eq('flynesis_user_id', flyAccount.id)
          .order('updated_at', { ascending: false })

        if (error) {
          console.error('❌ Erreur lors du chargement des conversations:', error)
          return
        }

        if (conversationsData && conversationsData.length > 0) {
          // Pour chaque conversation, compter les messages
          const conversationsWithCount = await Promise.all(
            conversationsData.map(async (conv) => {
              const { count } = await supabase
                .from('ai_chat_messages')
                .select('*', { count: 'exact', head: true })
                .eq('conversation_id', conv.id)

              return {
                id: conv.id,
                created_at: conv.created_at,
                updated_at: conv.updated_at,
                message_count: count || 0,
              }
            })
          )

          setConversations(conversationsWithCount)
          
          // Ne pas ouvrir automatiquement l'historique
          setShowConversationsList(false)
        }
      } catch (error) {
        console.error('❌ Erreur lors du chargement des conversations:', error)
      }
    }

    loadConversations()
  }, [user, conversationId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  // ⚠️ ANTI-SPAM: Debounce pour éviter les rafales d'appels
  const sendMessage = useCallback(async (messageToSend?: string) => {
    const message = messageToSend || inputMessage.trim()
    
    // Validation: message non vide et longueur raisonnable
    if (!message || message.length === 0 || message.length > 5000) {
      if (message.length > 5000) {
        toast({
          title: "Message trop long",
          description: "Veuillez limiter votre message à 5000 caractères.",
          variant: "destructive",
        })
      }
      return
    }
    
    // Anti-spam: ignorer les messages identiques répétés
    if (message === lastMessageRef.current) {
      console.warn('⚠️ Message identique ignoré (anti-spam)')
      return
    }
    lastMessageRef.current = message
    
    // Annuler le debounce précédent s'il existe
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }
    
    if (!user || isLoading) return

    const userMessage = message.trim()
    
    // Vérifier qu'un véhicule est sélectionné AVANT d'ajouter le message
    if (!selectedVehicle) {
      // Si aucun véhicule n'est disponible, permettre quand même l'envoi
      if (vehicles.length === 0) {
        toast({
          title: "Aucun véhicule",
          description: "Vous pouvez quand même poser une question, mais le diagnostic sera plus général.",
          variant: "default",
        })
        // Continuer sans véhicule - on va ajouter le message et envoyer
      } else {
        // Si des véhicules existent mais aucun n'est sélectionné, ouvrir le sélecteur
        toast({
          title: "Véhicule requis",
          description: "Veuillez sélectionner un véhicule pour commencer une conversation.",
          variant: "destructive",
        })
        setShowVehicleSelector(true)
        // Ne pas vider l'input, garder le message
        return
      }
    }

    setInputMessage("")
    setIsLoading(true)

    // Ajouter le message de l'utilisateur à l'interface
    const tempUserMessage: AIChatMessage = {
      id: `temp-${Date.now()}`,
      conversation_id: conversationId || '',
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, tempUserMessage])

    try {
      
      // Préparer le véhicule sélectionné à envoyer (ou un tableau vide si aucun véhicule)
      const vehiclesPayload = selectedVehicle ? [selectedVehicle].map(v => ({
        id: v.id,
        brand: v.brand || 'Marque inconnue',
        model: v.model || 'Modèle inconnu',
        license_plate: v.license_plate || null,
        year: v.year || null,
        fuel_type: v.fuel_type || null,
      })) : []
      
      console.log('📤 Envoi des véhicules RÉELS à l\'API:', vehiclesPayload.length, 'véhicule(s)')
      vehiclesPayload.forEach((v, i) => {
        const vehicleLabel = `${v.brand} ${v.model}${v.year ? ` (${v.year})` : ''}${v.license_plate ? ` - ${v.license_plate}` : ''}`
        console.log(`  ${i + 1}. ${vehicleLabel}`)
      })
      
      // Appeler l'API IA
      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId,
          message: userMessage,
          userId: user.id,
          vehicles: vehiclesPayload,
          model: selectedModel, // Passer le modèle sélectionné
          profile: profile ? {
            first_name: profile.first_name,
            last_name: profile.last_name,
            email: profile.email,
            phone: profile.phone,
          } : null,
        }),
      })
      
      console.log('📥 Réponse HTTP reçue:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        contentType: response.headers.get('content-type'),
      })

      // Vérifier le type de contenu de la réponse
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        console.error('❌ Réponse non-JSON reçue:', text.substring(0, 200))
        throw new Error('Le serveur a retourné une réponse invalide. Vérifiez que l\'API route est correctement configurée.')
      }

      if (!response.ok) {
        let errorData
        try {
          errorData = await response.json()
        } catch (e) {
          throw new Error(`Erreur HTTP ${response.status}: ${response.statusText}`)
        }
        
        // Gérer les erreurs spécifiques
        if (errorData.error === 'Server configuration error') {
          throw new Error('Configuration serveur manquante. Les variables d\'environnement Supabase ne sont pas configurées.')
        }
        
        if (errorData.code === 'TABLE_NOT_FOUND') {
          throw new Error('Les tables de base de données n\'existent pas. Veuillez appliquer la migration SQL dans Supabase.')
        }
        
        throw new Error(errorData.details || errorData.error || 'Erreur lors de l\'envoi du message')
      }

      let data
      let responseText: string | undefined
      try {
        responseText = await response.text()
        console.log('📥 Réponse brute de l\'API (premiers 500 caractères):', responseText.substring(0, 500))
        data = JSON.parse(responseText)
        console.log('✅ JSON parsé avec succès:', {
          success: data.success,
          hasMessage: !!data.message,
          hasAnalysis: !!data.analysis,
          analysisKeys: data.analysis ? Object.keys(data.analysis) : [],
        })
      } catch (e: any) {
        console.error('❌ Erreur lors du parsing JSON:', e)
        console.error('❌ Réponse texte reçue:', responseText?.substring(0, 1000))
        throw new Error('Réponse invalide du serveur')
      }

      // Mettre à jour la conversation ID si c'est une nouvelle conversation
      if (data.conversationId && !conversationId) {
        setConversationId(data.conversationId)
      }

      // Vérifier si la réponse contient une erreur ou un message d'indisponibilité
      const isErrorResponse = data.message && data.message.content && data.message.content.includes('temporairement indisponible')
      
      if (isErrorResponse) {
        console.error('⚠️ Message d\'indisponibilité détecté dans la réponse:', data.message.content)
        console.error('⚠️ Analyse reçue:', data.analysis)
        console.error('⚠️ Message complet:', data.message)
        
        // Afficher les détails de l'erreur si disponibles
        if (data.error_details) {
          console.error('❌ DÉTAILS DE L\'ERREUR (côté serveur):', data.error_details)
          console.error('❌ Message d\'erreur:', data.error_details.message)
          console.error('❌ Nom de l\'erreur:', data.error_details.name)
          console.error('❌ Stack trace:', data.error_details.stack)
        } else {
          console.warn('⚠️ Aucun détail d\'erreur disponible dans la réponse')
        }
        
        // Si c'est une erreur d'authentification OpenRouter, afficher un toast non bloquant
        if (data.warnings && Array.isArray(data.warnings) && data.warnings.includes('OPENROUTER_AUTH')) {
          try {
            toast({
              title: "Avertissement",
              description: "Erreur d'authentification OpenRouter détectée. La réponse peut être limitée.",
              variant: "default",
            })
          } catch (toastError: any) {
            console.error('❌ Erreur lors de l\'affichage du toast:', toastError)
          }
        }
        
        // Créer un message d'erreur plus informatif au lieu d'utiliser le message générique
        let errorContent = 'Le service CarsLink Assistant est temporairement indisponible. Réessayez plus tard.'
        
        if (data.error_details?.message) {
          if (data.error_details.message.includes('401') || data.error_details.message.includes('403')) {
            errorContent = '⚠️ Erreur d\'authentification avec le service IA. Veuillez contacter le support.'
          } else if (data.error_details.message.includes('429') || data.error_details.message.includes('rate limit')) {
            errorContent = '⚠️ Le service est temporairement surchargé. Veuillez réessayer dans quelques instants.'
          } else if (data.error_details.message.includes('timeout')) {
            errorContent = '⚠️ La requête a pris trop de temps. Veuillez réessayer.'
          }
        }
        
        const errorMessage: AIChatMessage = {
          id: data.message.id || `error-${Date.now()}`,
          conversation_id: conversationId || '',
          role: 'assistant',
          content: errorContent,
          created_at: data.message.created_at || new Date().toISOString(),
          ai_analysis: data.analysis,
        }
        
        // Remplacer le message temporaire par le message réel de l'utilisateur et ajouter le message d'erreur
        setMessages((prev) => {
          const filtered = prev.filter((msg) => msg.id !== tempUserMessage.id)
          const userMsg = data.userMessage ? data.userMessage : tempUserMessage
          return [...filtered, userMsg, errorMessage]
        })
      } else {
        // Remplacer le message temporaire par le message réel de l'utilisateur et ajouter le message de l'assistant
        setMessages((prev) => {
          const filtered = prev.filter((msg) => msg.id !== tempUserMessage.id)
          // Ajouter le message de l'utilisateur réel si disponible (depuis la base de données)
          const userMsg = data.userMessage ? data.userMessage : tempUserMessage
          return [...filtered, userMsg, data.message]
        })
      }

      // Stocker les questions suggérées pour affichage
      console.log('📥 Questions suggérées reçues de l\'API:', data.suggestedQuestions)
      
      if (data.suggestedQuestions && data.suggestedQuestions.length > 0) {
        // Convertir les anciennes questions (strings) en nouveau format si nécessaire
        const formattedQuestions = data.suggestedQuestions.map((q: any) => {
          if (typeof q === 'string') {
            // Si c'est une string, créer un objet avec des options par défaut
            return { 
              question: q, 
              options: ['Oui', 'Non', 'Je ne sais pas'] 
            }
          }
          // Si c'est un objet mais sans options, ajouter des options par défaut
          if (typeof q === 'object' && q.question) {
            if (!q.options || !Array.isArray(q.options) || q.options.length === 0) {
              console.warn(`⚠️ Question sans options détectée: "${q.question}", ajout d'options par défaut`)
              return {
                question: q.question,
                options: ['Oui', 'Non', 'Je ne sais pas']
              }
            }
          }
          console.log('  Question formatée:', q)
          return q
        })
        console.log('✅ Questions formatées pour affichage:', formattedQuestions)
        setSuggestedQuestions(formattedQuestions)
        setSelectedAnswers(new Map()) // Réinitialiser les sélections pour les nouvelles questions
      } else {
        console.log('ℹ️ Aucune question suggérée reçue')
        setSuggestedQuestions([])
        setSelectedAnswers(new Map()) // Réinitialiser les sélections
      }

      // Vérifier si l'API est disponible
      // L'API est disponible si on a une réponse (même avec warnings)
      if (data.message && data.message.content) {
        setApiAvailable(true)
      }
      
      // Si on a des warnings mais aussi une réponse, afficher un toast non bloquant
      if (data.warnings && Array.isArray(data.warnings) && data.warnings.length > 0 && data.message && data.message.content) {
        try {
          data.warnings.forEach((warning: string) => {
            if (warning === 'OPENROUTER_AUTH') {
              toast({
                title: "Avertissement",
                description: "Erreur d'authentification OpenRouter détectée. La réponse peut être limitée.",
                variant: "destructive",
              })
            } else {
              toast({
                title: "Avertissement",
                description: `Warning: ${warning}`,
                variant: "default",
              })
            }
          })
        } catch (toastError: any) {
          console.error('❌ Erreur lors de l\'affichage du toast:', toastError)
        }
      }
      
      // Log de la réponse complète pour débogage
      console.log('✅ Réponse complète de l\'API:', {
        success: data.success,
        hasMessage: !!data.message,
        hasAnalysis: !!data.analysis,
        analysis: data.analysis,
        hasSuggestedQuestions: !!data.suggestedQuestions,
        suggestedQuestionsCount: data.suggestedQuestions?.length || 0,
      })
    } catch (error: any) {
      console.error('❌ ERREUR CAPTURÉE dans sendMessage:', error)
      console.error('❌ Détails de l\'erreur:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        response: error.response,
        status: error.status,
      })
      console.error('❌ Erreur lors de l\'envoi du message:', error)
      
      // Afficher un message d'erreur
      let errorContent = 'Une erreur est survenue. Veuillez réessayer.'
      
      if (error.message?.includes('RATE_LIMIT') || error.message?.includes('429')) {
        errorContent = '⚠️ Les services IA sont temporairement surchargés. Tous les modèles gratuits ont atteint leur limite de requêtes. Veuillez réessayer dans quelques minutes.'
      } else if (error.message?.includes('API key')) {
        errorContent = 'Le service de diagnostic IA est momentanément indisponible. Veuillez réessayer plus tard ou contacter directement un garage.'
      } else if (error.message?.includes('Configuration serveur')) {
        errorContent = '⚠️ Configuration serveur manquante. Veuillez contacter le support technique.'
      } else if (error.message?.includes('tables de base de données')) {
        errorContent = '⚠️ Les tables de base de données n\'existent pas. Veuillez appliquer la migration SQL dans Supabase.'
      } else if (error.message) {
        errorContent = error.message
      }
      
      const errorMessage: AIChatMessage = {
        id: `error-${Date.now()}`,
        conversation_id: conversationId || '',
        role: 'assistant',
        content: errorContent,
        created_at: new Date().toISOString(),
      }
      
      setMessages((prev) => {
        const filtered = prev.filter((msg) => msg.id !== tempUserMessage.id)
        return [...filtered, errorMessage]
      })

      if (error.message?.includes('API key')) {
        setApiAvailable(false)
      }

      toast({
        title: "Erreur",
        description: error.message || "Impossible d'envoyer le message",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [user, isLoading, conversationId, vehicles, profile, toast, selectedVehicle, inputMessage, router])

  const loadConversation = async (convId: string) => {
    if (!user) return

    try {
      setIsLoading(true)
      
      // Charger les messages depuis Supabase directement
      const { data: messagesData, error: messagesError } = await supabase
        .from('ai_chat_messages')
        .select('*')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true })

      if (messagesError) {
        throw new Error('Erreur lors du chargement de la conversation')
      }

      const data = { messages: messagesData || [] }
      
      if (data.messages && data.messages.length > 0) {
        setMessages(data.messages)
        setConversationId(convId)
        setShowConversationsList(false)
        
        // Charger les questions suggérées de la dernière réponse
        const lastMessage = data.messages[data.messages.length - 1]
        if (lastMessage.role === 'assistant' && lastMessage.ai_analysis) {
          const analysis = lastMessage.ai_analysis as any
          if (analysis.needs_more_info && analysis.suggested_questions) {
            const formattedQuestions = analysis.suggested_questions.map((q: any) => {
              if (typeof q === 'string') {
                return { question: q, options: ['Oui', 'Non', 'Je ne sais pas'] }
              }
              if (typeof q === 'object' && q.question) {
                if (!q.options || !Array.isArray(q.options) || q.options.length === 0) {
                  return { question: q.question, options: ['Oui', 'Non', 'Je ne sais pas'] }
                }
              }
              return q
            })
            setSuggestedQuestions(formattedQuestions)
          }
        }
      }
    } catch (error) {
      console.error('❌ Erreur lors du chargement de la conversation:', error)
      toast({
        title: "Erreur",
        description: "Impossible de charger la conversation",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const reloadConversations = async () => {
    if (!user) return

    const { data: flyAccount } = await supabase
      .from('fly_accounts')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (!flyAccount) return

    const fifteenDaysAgo = new Date()
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15)

    // Supprimer automatiquement les conversations de plus de 15 jours
    await supabase
      .from('ai_chat_conversations')
      .delete()
      .eq('flynesis_user_id', flyAccount.id)
      .lt('created_at', fifteenDaysAgo.toISOString())

    const { data: conversationsData } = await supabase
      .from('ai_chat_conversations')
      .select('id, created_at, updated_at')
      .eq('flynesis_user_id', flyAccount.id)
      .order('updated_at', { ascending: false })

    if (conversationsData && conversationsData.length > 0) {
      const conversationsWithCount = await Promise.all(
        conversationsData.map(async (conv) => {
          const { count } = await supabase
            .from('ai_chat_messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)

          return {
            id: conv.id,
            created_at: conv.created_at,
            updated_at: conv.updated_at,
            message_count: count || 0,
          }
        })
      )
      setConversations(conversationsWithCount)
    } else {
      setConversations([])
    }
  }

  const deleteMessage = (messageId: string) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== messageId))
    toast({
      title: "Message supprimé",
      description: "Le message a été supprimé",
    })
  }

  const deleteConversation = async (convId?: string) => {
    const idToDelete = convId || conversationId
    if (!idToDelete || !user) return

    try {
      setIsLoading(true)

      const response = await fetch('/api/ai-chat', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId: idToDelete,
          userId: user.id,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Erreur lors de la suppression de la conversation')
      }

      // Si c'est la conversation active, réinitialiser l'état
      if (idToDelete === conversationId) {
        setMessages([])
        setConversationId(null)
        setSuggestedQuestions([])
      }

      // Recharger la liste des conversations
      await reloadConversations()

      toast({
        title: "Conversation supprimée",
        description: convId ? "La conversation a été supprimée" : "Une nouvelle conversation sera créée au prochain message",
      })
    } catch (error) {
      console.error('❌ Erreur lors de la suppression:', error)
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de supprimer la conversation",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const deleteSelectedConversations = async () => {
    if (selectedConversations.size === 0 || !user) return

    try {
      setIsLoading(true)

      const conversationIds = Array.from(selectedConversations)

      // Supprimer chaque conversation via l'API
      const deletePromises = conversationIds.map(convId =>
        fetch('/api/ai-chat', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            conversationId: convId,
            userId: user.id,
          }),
        })
      )

      const results = await Promise.all(deletePromises)
      const failed = results.filter(r => !r.ok)

      if (failed.length > 0) {
        throw new Error(`${failed.length} conversation(s) n'ont pas pu être supprimée(s)`)
      }

      // Sauvegarder le nombre de conversations supprimées avant de réinitialiser
      const deletedCount = selectedConversations.size
      const wasActiveSelected = selectedConversations.has(conversationId || '')

      // Si la conversation active était sélectionnée, réinitialiser
      if (wasActiveSelected) {
        setMessages([])
        setConversationId(null)
        setSuggestedQuestions([])
      }

      // Réinitialiser la sélection et recharger
      setSelectedConversations(new Set())
      setIsSelectionMode(false)
      await reloadConversations()

      toast({
        title: "Conversations supprimées",
        description: `${deletedCount} conversation(s) supprimée(s) avec succès`,
      })
    } catch (error) {
      console.error('❌ Erreur lors de la suppression:', error)
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de supprimer les conversations",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const deleteAllConversations = async () => {
    if (conversations.length === 0 || !user) return

    if (!confirm(`Êtes-vous sûr de vouloir supprimer toutes les ${conversations.length} conversation(s) ?`)) {
      return
    }

    try {
      setIsLoading(true)

      const conversationIds = conversations.map(conv => conv.id)

      // Supprimer chaque conversation via l'API
      const deletePromises = conversationIds.map(convId =>
        fetch('/api/ai-chat', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            conversationId: convId,
            userId: user.id,
          }),
        })
      )

      const results = await Promise.all(deletePromises)
      const failed = results.filter(r => !r.ok)

      if (failed.length > 0) {
        throw new Error(`${failed.length} conversation(s) n'ont pas pu être supprimée(s)`)
      }

      // Réinitialiser l'état
      setMessages([])
      setConversationId(null)
      setSuggestedQuestions([])
      setConversations([])
      setSelectedConversations(new Set())
      setIsSelectionMode(false)
      setShowConversationsList(false)

      toast({
        title: "Toutes les conversations supprimées",
        description: `${conversations.length} conversation(s) supprimée(s) avec succès`,
      })
    } catch (error) {
      console.error('❌ Erreur lors de la suppression:', error)
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de supprimer les conversations",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const toggleConversationSelection = (convId: string) => {
    const newSelection = new Set(selectedConversations)
    if (newSelection.has(convId)) {
      newSelection.delete(convId)
    } else {
      newSelection.add(convId)
    }
    setSelectedConversations(newSelection)
  }

  const handleReservation = (analysis: AIChatMessage['ai_analysis']) => {
    if (!analysis || !analysis.recommended_service) return

    // Mapper le service recommandé vers l'ID de service CarsLink (correspond au mapping de la page de réservation)
    const serviceMapping: Record<string, string> = {
      'contrôle freinage': 'controle',
      'contrôle technique': 'controle',
      'diagnostic électronique': 'diagnostic',
      'diagnostic': 'diagnostic',
      'vidange': 'vidange',
      'vidange & entretien': 'vidange',
      'réparation moteur': 'moteur',
      'réparation carrosserie': 'carrosserie',
      'nettoyage': 'nettoyage',
      'dépannage': 'depannage',
      'permutation': 'permutation',
      'polissage': 'polissage',
      'devis': 'devis',
      'freinage': 'freinage',
      'freins': 'freinage',
      'plaquettes': 'freinage',
      'révision': 'revision',
      'révision complète': 'revision',
      'entretien': 'revision',
    }
    
    const serviceName = analysis.recommended_service.toLowerCase().trim()
    let serviceId = analysis.service_id || serviceMapping[serviceName]
    
    // Si pas de mapping exact, essayer de trouver une correspondance partielle
    if (!serviceId) {
      for (const [key, value] of Object.entries(serviceMapping)) {
        if (serviceName.includes(key.toLowerCase()) || key.toLowerCase().includes(serviceName)) {
          serviceId = value
          break
        }
      }
    }
    
    // Fallback : utiliser le nom du service tel quel
    if (!serviceId) {
      serviceId = serviceName.replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
    }
    
    // Rediriger vers la réservation avec le service pré-sélectionné (étape 1)
    router.push(`/reservation?service=${encodeURIComponent(serviceId)}`)
  }

  const getUrgencyBadge = (urgency?: string) => {
    switch (urgency) {
      case 'urgent':
        return (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-50 border border-red-200/50 text-red-700 text-xs font-medium">
            <AlertCircle className="h-3 w-3" />
            Urgent
          </div>
        )
      case 'moderate':
        return (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-yellow-50 border border-yellow-200/50 text-yellow-700 text-xs font-medium">
            <Clock className="h-3 w-3" />
            Modéré
          </div>
        )
      case 'low':
        return (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-50 border border-green-200/50 text-green-700 text-xs font-medium">
            <CheckCircle className="h-3 w-3" />
            Faible
          </div>
        )
      default:
        return null
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Chargement...</div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 w-full h-screen bg-gradient-to-br from-blue-50/40 via-white to-purple-50/20 flex flex-col">
      {/* Sélecteur de véhicule */}
      <Dialog open={showVehicleSelector} onOpenChange={(open) => {
        // Si on essaie de fermer et qu'aucun véhicule n'est sélectionné, retourner en arrière
        if (!open && vehicles.length > 0 && !selectedVehicle) {
          router.back()
          return
        }
        // Si on essaie de fermer et qu'il n'y a pas de véhicules, retourner en arrière
        if (!open && vehicles.length === 0) {
          router.back()
          return
        }
        setShowVehicleSelector(open)
      }}>
        <DialogContent 
          className="sm:max-w-md relative [&>button.rounded-sm]:hidden"
          onEscapeKeyDown={(e) => {
            if (vehicles.length > 0 && !selectedVehicle) {
              e.preventDefault()
              router.back()
            } else if (vehicles.length === 0) {
              e.preventDefault()
              router.back()
            }
          }}
          onPointerDownOutside={(e) => {
            if (vehicles.length > 0 && !selectedVehicle) {
              e.preventDefault()
              router.back()
            } else if (vehicles.length === 0) {
              e.preventDefault()
              router.back()
            }
          }}
        >
          {/* Croix personnalisée */}
          <button
            onClick={() => {
              if (vehicles.length > 0 && !selectedVehicle) {
                router.back()
              } else if (vehicles.length === 0) {
                router.back()
              } else {
                setShowVehicleSelector(false)
              }
            }}
            className="absolute right-4 top-4 z-50 h-8 w-8 rounded-lg bg-gray-100 hover:bg-gray-200 active:bg-gray-300 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 group shadow-sm"
            title="Fermer"
          >
            <X className="h-4 w-4 text-gray-600 group-hover:text-gray-900 transition-colors" />
          </button>
          
          <DialogHeader>
            <DialogTitle className="text-xl font-medium text-gray-900">Sélectionner un véhicule</DialogTitle>
            <DialogDescription className="text-sm text-gray-600">
              Pour quel véhicule souhaitez-vous faire un diagnostic ?
            </DialogDescription>
          </DialogHeader>
          
          {vehicles.length === 0 ? (
            <div className="py-8 text-center">
              <Car className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-sm text-gray-600 mb-4">
                Aucun véhicule trouvé dans votre profil.
              </p>
              <Button
                onClick={() => router.push("/profile")}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
              >
                Ajouter un véhicule
              </Button>
            </div>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto py-2">
              {vehicles.map((vehicle) => (
                <motion.button
                  key={vehicle.id}
                  onClick={() => {
                    setSelectedVehicle(vehicle)
                    setShowVehicleSelector(false)
                    toast({
                      title: "Véhicule sélectionné",
                      description: `${vehicle.brand} ${vehicle.model}${vehicle.year ? ` (${vehicle.year})` : ''}`,
                    })
                  }}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                    selectedVehicle?.id === vehicle.id
                      ? 'border-blue-500 bg-blue-50/50'
                      : 'border-gray-200 bg-white/60 hover:border-blue-300 hover:bg-blue-50/30'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-start gap-3">
                    <div className={`flex-shrink-0 h-10 w-10 rounded-lg flex items-center justify-center ${
                      selectedVehicle?.id === vehicle.id
                        ? 'bg-gradient-to-br from-blue-500 to-purple-500'
                        : 'bg-gray-100'
                    }`}>
                      <Car className={`h-5 w-5 ${
                        selectedVehicle?.id === vehicle.id ? 'text-white' : 'text-gray-600'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">
                        {vehicle.brand} {vehicle.model}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        {vehicle.year && (
                          <span className="text-xs text-gray-500">{vehicle.year}</span>
                        )}
                        {vehicle.license_plate && (
                          <>
                            {vehicle.year && <span className="text-xs text-gray-400">•</span>}
                            <span className="text-xs text-gray-500 font-mono">{vehicle.license_plate}</span>
                          </>
                        )}
                        {vehicle.fuel_type && (
                          <>
                            {(vehicle.year || vehicle.license_plate) && <span className="text-xs text-gray-400">•</span>}
                            <span className="text-xs text-gray-500 capitalize">{vehicle.fuel_type}</span>
                          </>
                        )}
                      </div>
                    </div>
                    {selectedVehicle?.id === vehicle.id && (
                      <Check className="h-5 w-5 text-blue-600 flex-shrink-0" />
                    )}
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Sidebar pour l'historique */}
      <AnimatePresence>
        {showConversationsList && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowConversationsList(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
              style={{ pointerEvents: showConversationsList ? 'auto' : 'none' }}
            />
            {/* Sidebar */}
            <motion.div
              initial={{ x: 320 }}
              animate={{ x: 0 }}
              exit={{ x: 320 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-80 bg-white/90 backdrop-blur-xl border-l border-white/40 shadow-2xl z-50 flex flex-col pb-24"
            >
              {/* Header du sidebar */}
              <div className="px-4 py-5 border-b border-gray-200/50">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-medium text-gray-900">Historique</h2>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowConversationsList(false)}
                    className="h-8 w-8 rounded-lg hover:bg-gray-100"
                    title="Fermer"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-gray-500 font-light mb-4">
                  Les conversations sont conservées pendant 15 jours
                </p>
                <Button
                  onClick={() => {
                    setMessages([])
                    setConversationId(null)
                    setSuggestedQuestions([])
                    setShowConversationsList(false)
                  }}
                  className="w-full h-10 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-medium text-sm flex items-center justify-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Nouvelle conversation
                </Button>
              </div>

              {/* Liste des conversations */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
                {conversations.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-sm text-gray-500">Aucune conversation récente</p>
                  </div>
                ) : (
                  conversations.map((conv) => (
                    <motion.div
                      key={conv.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        loadConversation(conv.id)
                        setShowConversationsList(false)
                      }}
                      className={`p-3 rounded-lg cursor-pointer transition-all ${
                        conversationId === conv.id
                          ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-2 border-blue-400/50'
                          : 'bg-white/60 backdrop-blur-sm border border-gray-200/50 hover:bg-white/80'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-900 truncate">
                            {new Date(conv.updated_at).toLocaleString('fr-FR', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                          <p className="text-[10px] text-gray-500 mt-1">
                            {conv.message_count} message{conv.message_count > 1 ? 's' : ''}
                          </p>
                        </div>
                        {conversationId === conv.id && (
                          <div className="h-2 w-2 rounded-full bg-blue-600 flex-shrink-0 mt-1" />
                        )}
                      </div>
                    </motion.div>
                  ))
                )}
              </div>

              {/* Section Paramètres */}
              <div className="px-4 py-4 border-t border-gray-200/50">
                <div className="flex items-center gap-2 mb-3">
                  <Settings className="h-4 w-4 text-gray-600" />
                  <h3 className="text-sm font-medium text-gray-900">Paramètres</h3>
                </div>
                <div className="space-y-3">
                  {/* Sélecteur de modèle IA */}
                  <div>
                    <label className="text-xs font-medium text-gray-700 mb-2 block">
                      Modèle IA
                    </label>
                    <Select value={selectedModel || "default"} onValueChange={(value) => setSelectedModel(value === "default" ? undefined : value as ModelId)}>
                      <SelectTrigger className="h-10 w-full text-sm border-gray-200/50 bg-white/60 backdrop-blur-sm">
                        <SelectValue placeholder="Modèle">
                          {selectedModel 
                            ? selectedModel.split('/')[1]?.split(':')[0] || selectedModel.split('/')[0]
                            : "Par défaut (auto)"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">Par défaut (auto)</SelectItem>
                        {FREE_MODELS.map((model) => {
                          const displayName = model.split('/')[1]?.split(':')[0] || model.split('/')[0];
                          return (
                            <SelectItem key={model} value={model}>
                              {displayName}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 mt-1.5">
                      Le système basculera automatiquement si le modèle sélectionné n'est pas disponible
                    </p>
                  </div>
                </div>
              </div>

              {/* Footer du sidebar */}
              {conversations.length > 0 && (
                <div className="px-4 py-4 border-t border-gray-200/50">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm(`Supprimer toutes les ${conversations.length} conversation(s) ?`)) {
                        deleteAllConversations()
                      }
                    }}
                    className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                    disabled={isLoading}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Tout supprimer
                  </Button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Contenu principal */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 z-30 bg-white/40 backdrop-blur-xl border-b border-white/20 px-4 py-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/")}
              className="h-10 w-10 rounded-full hover:bg-gray-100/80 transition-all text-gray-700"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-xl font-light text-gray-900">Assistant IA</h1>
              <p className="text-xs text-gray-500 font-light">
                {selectedVehicle 
                  ? `${selectedVehicle.brand} ${selectedVehicle.model}${selectedVehicle.year ? ` (${selectedVehicle.year})` : ''}`
                  : "Diagnostic automobile intelligent"
                }
              </p>
            </div>
            {selectedVehicle && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowVehicleSelector(true)}
                className="text-xs px-2 py-1 h-8 rounded-lg hover:bg-gray-100/80"
                title="Changer de véhicule"
              >
                <Car className="h-3 w-3 mr-1" />
                Changer
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowConversationsList(!showConversationsList)}
              className="h-10 w-10 rounded-lg hover:bg-gray-100/80"
              title={showConversationsList ? "Fermer l'historique" : "Ouvrir l'historique"}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-6 space-y-6 pb-4" style={{ WebkitOverflowScrolling: 'touch' }}>
        {messages.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-full py-12 px-4"
          >
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full blur-2xl" />
              <div className="relative h-20 w-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                <Bot className="h-10 w-10 text-white" />
              </div>
            </div>
            <h2 className="text-2xl font-light text-gray-900 mb-3">
              Bonjour ! 👋
            </h2>
            <p className="text-sm text-gray-600 mb-8 max-w-md mx-auto text-center font-light">
              Je vais vous poser quelques questions pour diagnostiquer votre problème automobile. 
              Répondez simplement et je vous proposerai le service adapté avec un rendez-vous.
            </p>
            
            {/* Propositions de premiers messages */}
            <div className="space-y-4 max-w-2xl w-full mx-auto">
              <p className="text-xs text-gray-500 font-light mb-4 text-center">Ou commencez par choisir un problème :</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  "J'ai un bruit au freinage",
                  "Un voyant s'allume sur mon tableau de bord",
                  "Ma voiture fait des à-coups",
                  "J'ai une odeur de brûlé quand je roule",
                  "Ma voiture démarre mal le matin",
                  "J'ai une fuite d'huile sous ma voiture",
                  "Le volant tremble quand je roule",
                  "Ma clim ne fait plus de froid",
                  "Ma voiture cale à l'arrêt",
                  "Mon témoin ABS s'est allumé"
                ].map((suggestion, index) => (
                  <motion.button
                    key={index}
                    onClick={async () => {
                      if (!user || isLoading) return
                      
                      // Attendre que les véhicules soient chargés (maximum 5 secondes)
                      let waitCount = 0
                      while ((!vehicles || vehicles.length === 0) && waitCount < 50) {
                        await new Promise(resolve => setTimeout(resolve, 100))
                        waitCount++
                      }
                      
                      // Vérifier qu'un véhicule est sélectionné
                      if (!selectedVehicle) {
                        // Si aucun véhicule n'est disponible, permettre quand même l'envoi
                        if (vehicles.length === 0) {
                          toast({
                            title: "Aucun véhicule",
                            description: "Vous pouvez quand même poser une question, mais le diagnostic sera plus général.",
                            variant: "default",
                          })
                          // Continuer sans véhicule
                        } else {
                          // Si des véhicules existent mais aucun n'est sélectionné, ouvrir le sélecteur
                          toast({
                            title: "Véhicule requis",
                            description: "Veuillez sélectionner un véhicule pour commencer une conversation.",
                            variant: "destructive",
                          })
                          setShowVehicleSelector(true)
                          return
                        }
                      }
                      
                      setIsLoading(true)
                      const userMessage = suggestion.trim()
                      
                      // Ajouter le message de l'utilisateur à l'interface
                      const tempUserMessage: AIChatMessage = {
                        id: `temp-${Date.now()}`,
                        conversation_id: conversationId || '',
                        role: 'user',
                        content: userMessage,
                        created_at: new Date().toISOString(),
                      }
                      setMessages((prev) => [...prev, tempUserMessage])
                      
                      try {
                        
                        // Préparer le véhicule sélectionné à envoyer (ou un tableau vide si aucun véhicule)
                        const vehiclesPayload = selectedVehicle ? [selectedVehicle].map(v => ({
                          id: v.id,
                          brand: v.brand || 'Marque inconnue',
                          model: v.model || 'Modèle inconnu',
                          license_plate: v.license_plate || null,
                          year: v.year || null,
                          fuel_type: v.fuel_type || null,
                        })) : []
                        
                        // Appeler l'API IA
                        const response = await fetch('/api/ai-chat', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({
                            conversationId,
                            message: userMessage,
                            userId: user.id,
                            vehicles: vehiclesPayload,
                            model: selectedModel,
                            profile: profile ? {
                              first_name: profile.first_name,
                              last_name: profile.last_name,
                              email: profile.email,
                              phone: profile.phone,
                            } : null,
                          }),
                        })

                        const contentType = response.headers.get('content-type')
                        if (!contentType || !contentType.includes('application/json')) {
                          const text = await response.text()
                          console.error('❌ Réponse non-JSON reçue:', text.substring(0, 200))
                          throw new Error('Le serveur a retourné une réponse invalide.')
                        }

                        if (!response.ok) {
                          let errorData
                          try {
                            errorData = await response.json()
                          } catch (e) {
                            throw new Error(`Erreur HTTP ${response.status}: ${response.statusText}`)
                          }
                          
                          if (errorData.error === 'Server configuration error') {
                            throw new Error('Configuration serveur manquante.')
                          }
                          
                          if (errorData.code === 'TABLE_NOT_FOUND') {
                            throw new Error('Les tables de base de données n\'existent pas.')
                          }
                          
                          throw new Error(errorData.details || errorData.error || 'Erreur lors de l\'envoi du message')
                        }

                        let data
                        try {
                          data = await response.json()
                        } catch (e) {
                          console.error('❌ Erreur lors du parsing JSON:', e)
                          throw new Error('Réponse invalide du serveur')
                        }

                        if (data.conversationId && !conversationId) {
                          setConversationId(data.conversationId)
                        }

                        // Remplacer le message temporaire par le message réel de l'utilisateur et ajouter le message de l'assistant
                        setMessages((prev) => {
                          const filtered = prev.filter((msg) => msg.id !== tempUserMessage.id)
                          // Ajouter le message de l'utilisateur réel si disponible (depuis la base de données)
                          const userMsg = data.userMessage ? data.userMessage : tempUserMessage
                          return [...filtered, userMsg, data.message]
                        })

                        if (data.suggestedQuestions && data.suggestedQuestions.length > 0) {
                          const formattedQuestions = data.suggestedQuestions.map((q: any) => {
                            if (typeof q === 'string') {
                              return { 
                                question: q, 
                                options: ['Oui', 'Non', 'Je ne sais pas'] 
                              }
                            }
                            if (typeof q === 'object' && q.question) {
                              if (!q.options || !Array.isArray(q.options) || q.options.length === 0) {
                                return {
                                  question: q.question,
                                  options: ['Oui', 'Non', 'Je ne sais pas']
                                }
                              }
                            }
                            return q
                          })
                          setSuggestedQuestions(formattedQuestions)
                          setSelectedAnswers(new Map()) // Réinitialiser les sélections pour les nouvelles questions
                        } else {
                          setSuggestedQuestions([])
                          setSelectedAnswers(new Map()) // Réinitialiser les sélections
                        }

                        // Vérifier si l'API a retourné un message d'erreur générique
                        if (data.message?.content?.includes('temporairement indisponible') || 
                            (data.analysis?.error_details && !data.analysis.recommended_service)) {
                          console.warn('⚠️ Message d\'erreur détecté dans la réponse:', data.message?.content)
                          console.warn('⚠️ Détails de l\'erreur:', data.analysis?.error_details)
                          
                          // Afficher un message d'erreur plus informatif
                          const errorDetails = data.analysis?.error_details
                          let errorContent = 'Une erreur est survenue lors de la communication avec l\'IA. Veuillez réessayer dans quelques instants.'
                          
                          if (errorDetails?.message) {
                            if (errorDetails.message.includes('429') || errorDetails.message.includes('rate limit')) {
                              errorContent = '⚠️ Le service est temporairement surchargé. Veuillez réessayer dans quelques instants.'
                            } else if (errorDetails.message.includes('401') || errorDetails.message.includes('403')) {
                              errorContent = '⚠️ Erreur d\'authentification avec le service IA. Veuillez contacter le support.'
                            } else if (errorDetails.message.includes('timeout')) {
                              errorContent = '⚠️ La requête a pris trop de temps. Veuillez réessayer.'
                            } else {
                              errorContent = `⚠️ Erreur: ${errorDetails.message}`
                            }
                          }
                          
                          const errorMessage: AIChatMessage = {
                            id: `error-${Date.now()}`,
                            conversation_id: conversationId || '',
                            role: 'assistant',
                            content: errorContent,
                            created_at: new Date().toISOString(),
                          }
                          
                          setMessages((prev) => {
                            const filtered = prev.filter((msg) => msg.id !== tempUserMessage.id)
                            return [...filtered, errorMessage]
                          })
                          
                          setIsLoading(false)
                          return
                        }
                        
                        if (data.analysis && data.analysis.recommended_service) {
                          setApiAvailable(true)
                        }
                      } catch (error: any) {
                        console.error('❌ Erreur lors de l\'envoi du message:', error)
                        
                        let errorContent = 'Une erreur est survenue. Veuillez réessayer.'
                        
                        if (error.message?.includes('API key')) {
                          errorContent = 'Le service de diagnostic IA est momentanément indisponible.'
                        } else if (error.message?.includes('Configuration serveur')) {
                          errorContent = '⚠️ Configuration serveur manquante.'
                        } else if (error.message?.includes('tables de base de données')) {
                          errorContent = '⚠️ Les tables de base de données n\'existent pas.'
                        } else if (error.message) {
                          errorContent = error.message
                        }
                        
                        const errorMessage: AIChatMessage = {
                          id: `error-${Date.now()}`,
                          conversation_id: conversationId || '',
                          role: 'assistant',
                          content: errorContent,
                          created_at: new Date().toISOString(),
                        }
                        
                        setMessages((prev) => {
                          const filtered = prev.filter((msg) => msg.id !== tempUserMessage.id)
                          return [...filtered, errorMessage]
                        })

                        if (error.message?.includes('API key')) {
                          setApiAvailable(false)
                        }
                      } finally {
                        setIsLoading(false)
                      }
                    }}
                    className="text-left text-xs px-4 py-3 bg-white/60 backdrop-blur-sm hover:bg-white/80 border border-gray-200/50 hover:border-blue-300/50 rounded-lg transition-all text-gray-700 shadow-sm hover:shadow-md font-light"
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {suggestion}
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        ) : (
          <AnimatePresence>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'} items-start group`}
              >
                {message.role === 'assistant' && (
                  <div className="flex-shrink-0 h-9 w-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-md">
                    <Bot className="h-5 w-5 text-white" />
                  </div>
                )}
                <div className="relative max-w-[85%] sm:max-w-[75%]">
                  <div
                    className={`rounded-lg px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
                        : 'bg-white/60 backdrop-blur-sm border border-white/40 text-gray-900 shadow-sm'
                    }`}
                  >
                    <div className="text-sm whitespace-pre-wrap font-light leading-relaxed">{message.content}</div>
                    
                    {/* Bouton de suppression - visible uniquement au survol */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        if (confirm("Supprimer ce message ?")) {
                          deleteMessage(message.id)
                        }
                      }}
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500 hover:bg-red-600 active:bg-red-700 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md z-10 touch-manipulation"
                      title="Supprimer ce message"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  
                  {/* Analyse IA (uniquement si ce n'est pas une salutation) */}
                  {message.role === 'assistant' && message.ai_analysis && !(message.ai_analysis as any)?.is_greeting && (
                    <div className="mt-4 pt-4 border-t border-gray-200/50 space-y-3">
                      {/* Causes probables */}
                      {message.ai_analysis.causes && message.ai_analysis.causes.length > 0 && (
                        <div className="bg-blue-50/50 rounded-lg p-3 border border-blue-100/50">
                          <p className="text-xs font-medium text-gray-700 mb-2">Causes probables :</p>
                          <ul className="text-xs text-gray-600 space-y-1.5 font-light">
                            {message.ai_analysis.causes.map((cause, index) => (
                              <li key={index} className="flex items-start gap-2">
                                <span className="text-blue-500 mt-0.5 flex-shrink-0">•</span>
                                <span>{cause}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Urgence et service recommandé */}
                      {((message.ai_analysis as any)?.diagnostic_complete || message.ai_analysis.urgency) && (
                        <div className="flex items-center gap-2 flex-wrap">
                          {message.ai_analysis.urgency && getUrgencyBadge(message.ai_analysis.urgency)}
                          {message.ai_analysis.recommended_service && (
                            <span className="text-xs text-gray-600 font-light">
                              Service : <span className="font-medium text-gray-900">{message.ai_analysis.recommended_service}</span>
                            </span>
                          )}
                        </div>
                      )}

                      {/* Bouton de réservation et message d'avertissement (uniquement pour diagnostic complet) */}
                      {message.ai_analysis.recommended_service && (message.ai_analysis as any)?.diagnostic_complete && (
                        <>
                          {/* Message d'avertissement */}
                          <div className="p-3 bg-red-50/80 backdrop-blur-sm border border-red-200/50 rounded-lg">
                            <div className="flex items-start gap-2">
                              <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                              <p className="text-xs text-red-700 leading-relaxed font-light">
                                <span className="font-medium">⚠️ Avertissement :</span> Ce diagnostic est fourni par une intelligence artificielle à titre indicatif uniquement. Il ne remplace pas l'expertise d'un professionnel. Veuillez consulter un mécanicien qualifié lors de votre rendez-vous pour un diagnostic précis et une réparation appropriée.
                              </p>
                            </div>
                          </div>

                          {/* Bouton de réservation */}
                          <motion.button
                            onClick={() => handleReservation(message.ai_analysis)}
                            className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:shadow-md transition-all"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <Calendar className="h-4 w-4" />
                            Réserver un rendez-vous
                          </motion.button>
                        </>
                      )}
                    </div>
                  )}

                  {/* Questions suggérées avec options */}
                  {message.role === 'assistant' && (message.ai_analysis as any)?.needs_more_info && suggestedQuestions.length > 0 && message.id === messages[messages.length - 1]?.id && (
                    <div className="mt-4 pt-4 border-t border-gray-200/50 space-y-4">
                      {suggestedQuestions.map((qObj, qIndex) => (
                        <div key={qIndex} className="space-y-2.5">
                          <p className="text-xs font-medium text-gray-700">
                            {qObj.question}
                            {selectedAnswers.has(qIndex) && (
                              <span className="ml-2 text-green-600 text-[10px] font-light">✓ Sélectionné</span>
                            )}
                          </p>
                          {qObj.options && qObj.options.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {qObj.options.map((option, oIndex) => {
                                const isSelected = selectedAnswers.get(qIndex) === option
                                return (
                                  <motion.button
                                    key={oIndex}
                                    onClick={() => {
                                      // Sélectionner/désélectionner l'option pour cette question
                                      const newSelectedAnswers = new Map(selectedAnswers)
                                      if (isSelected) {
                                        newSelectedAnswers.delete(qIndex)
                                      } else {
                                        newSelectedAnswers.set(qIndex, option)
                                      }
                                      setSelectedAnswers(newSelectedAnswers)
                                    }}
                                    className={`text-xs px-3 py-1.5 border rounded-lg transition-all font-light ${
                                      isSelected
                                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white border-transparent shadow-sm'
                                        : 'bg-white/60 backdrop-blur-sm hover:bg-white/80 border-gray-200/50 text-gray-700'
                                    }`}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                  >
                                    {option}
                                  </motion.button>
                                )
                              })}
                            </div>
                          ) : null}
                        </div>
                      ))}
                      
                      {/* Message d'information */}
                      {suggestedQuestions.length > 0 && selectedAnswers.size === 0 && (
                        <div className="pt-2">
                          <p className="text-xs text-gray-500 italic font-light">
                            💡 Sélectionnez une option pour chaque question, puis cliquez sur "Envoyer toutes les réponses"
                          </p>
                        </div>
                      )}
                      
                      {/* Bouton pour envoyer toutes les réponses */}
                      {selectedAnswers.size > 0 && (
                        <div className="pt-3 border-t border-gray-200/50">
                          <motion.button
                            onClick={async () => {
                              if (!user || isLoading || selectedAnswers.size === 0) return
                              
                              setIsLoading(true)
                              
                              // Construire le message combiné avec toutes les réponses
                              const combinedAnswers = suggestedQuestions
                                .map((qObj, qIndex) => {
                                  const answer = selectedAnswers.get(qIndex)
                                  if (answer) {
                                    return `${qObj.question}: ${answer}`
                                  }
                                  return null
                                })
                                .filter(Boolean)
                                .join('\n')
                              
                              const userMessage = combinedAnswers
                              
                              // Ajouter le message de l'utilisateur à l'interface
                              const tempUserMessage: AIChatMessage = {
                                id: `temp-${Date.now()}`,
                                conversation_id: conversationId || '',
                                role: 'user',
                                content: userMessage,
                                created_at: new Date().toISOString(),
                              }
                              setMessages((prev) => [...prev, tempUserMessage])
                              
                              // Ne pas réinitialiser les questions ici, elles seront mises à jour par la réponse de l'IA
                              // setSelectedAnswers(new Map())
                              // setSuggestedQuestions([])
                              
                              try {
                                // Vérifier qu'un véhicule est sélectionné
                                if (!selectedVehicle) {
                                  // Si aucun véhicule n'est disponible, permettre quand même l'envoi
                                  if (vehicles.length === 0) {
                                    toast({
                                      title: "Aucun véhicule",
                                      description: "Vous pouvez quand même poser une question, mais le diagnostic sera plus général.",
                                      variant: "default",
                                    })
                                    // Continuer sans véhicule
                                  } else {
                                    // Si des véhicules existent mais aucun n'est sélectionné, ouvrir le sélecteur
                                    toast({
                                      title: "Véhicule requis",
                                      description: "Veuillez sélectionner un véhicule pour continuer.",
                                      variant: "destructive",
                                    })
                                    setShowVehicleSelector(true)
                                    setIsLoading(false)
                                    return
                                  }
                                }
                                
                                // Préparer le véhicule sélectionné à envoyer (ou un tableau vide si aucun véhicule)
                                const vehiclesPayload = selectedVehicle ? [selectedVehicle].map(v => ({
                                  id: v.id,
                                  brand: v.brand || 'Marque inconnue',
                                  model: v.model || 'Modèle inconnu',
                                  license_plate: v.license_plate || null,
                                  year: v.year || null,
                                  fuel_type: v.fuel_type || null,
                                })) : []
                                
                                // Appeler l'API IA
                                const response = await fetch('/api/ai-chat', {
                                  method: 'POST',
                                  headers: {
                                    'Content-Type': 'application/json',
                                  },
                                  body: JSON.stringify({
                                    conversationId,
                                    message: userMessage,
                                    userId: user.id,
                                    vehicles: vehiclesPayload,
                                    model: selectedModel,
                                    profile: profile ? {
                                      first_name: profile.first_name,
                                      last_name: profile.last_name,
                                      email: profile.email,
                                      phone: profile.phone,
                                    } : null,
                                  }),
                                })

                                const contentType = response.headers.get('content-type')
                                if (!contentType || !contentType.includes('application/json')) {
                                  const text = await response.text()
                                  console.error('❌ Réponse non-JSON reçue:', text.substring(0, 200))
                                  throw new Error('Le serveur a retourné une réponse invalide.')
                                }

                                if (!response.ok) {
                                  let errorData
                                  try {
                                    errorData = await response.json()
                                  } catch (e) {
                                    throw new Error(`Erreur HTTP ${response.status}: ${response.statusText}`)
                                  }
                                  
                                  if (errorData.error === 'Server configuration error') {
                                    throw new Error('Configuration serveur manquante.')
                                  }
                                  
                                  if (errorData.code === 'TABLE_NOT_FOUND') {
                                    throw new Error('Les tables de base de données n\'existent pas.')
                                  }
                                  
                                  throw new Error(errorData.details || errorData.error || 'Erreur lors de l\'envoi du message')
                                }

                                let data
                                try {
                                  data = await response.json()
                                } catch (e) {
                                  console.error('❌ Erreur lors du parsing JSON:', e)
                                  throw new Error('Réponse invalide du serveur')
                                }

                                if (data.conversationId && !conversationId) {
                                  setConversationId(data.conversationId)
                                }

                                // Remplacer le message temporaire par le message réel de l'utilisateur et ajouter le message de l'assistant
                                setMessages((prev) => {
                                  const filtered = prev.filter((msg) => msg.id !== tempUserMessage.id)
                                  const userMsg = data.userMessage ? data.userMessage : tempUserMessage
                                  return [...filtered, userMsg, data.message]
                                })

                                if (data.suggestedQuestions && data.suggestedQuestions.length > 0) {
                                  const formattedQuestions = data.suggestedQuestions.map((q: any) => {
                                    if (typeof q === 'string') {
                                      return { 
                                        question: q, 
                                        options: ['Oui', 'Non', 'Je ne sais pas'] 
                                      }
                                    }
                                    if (typeof q === 'object' && q.question) {
                                      if (!q.options || !Array.isArray(q.options) || q.options.length === 0) {
                                        return {
                                          question: q.question,
                                          options: ['Oui', 'Non', 'Je ne sais pas']
                                        }
                                      }
                                    }
                                    return q
                                  })
                                  setSuggestedQuestions(formattedQuestions)
                                  setSelectedAnswers(new Map()) // Réinitialiser les sélections pour les nouvelles questions
                                } else {
                                  setSuggestedQuestions([])
                                  setSelectedAnswers(new Map()) // Réinitialiser les sélections
                                }

                                if (data.analysis && data.analysis.recommended_service) {
                                  setApiAvailable(true)
                                }
                              } catch (error: any) {
                                console.error('❌ Erreur lors de l\'envoi du message:', error)
                                
                                let errorContent = 'Une erreur est survenue. Veuillez réessayer.'
                                
                                if (error.message?.includes('API key')) {
                                  errorContent = 'Le service de diagnostic IA est momentanément indisponible.'
                                } else if (error.message?.includes('Configuration serveur')) {
                                  errorContent = '⚠️ Configuration serveur manquante.'
                                } else if (error.message?.includes('tables de base de données')) {
                                  errorContent = '⚠️ Les tables de base de données n\'existent pas.'
                                } else if (error.message) {
                                  errorContent = error.message
                                }
                                
                                const errorMessage: AIChatMessage = {
                                  id: `error-${Date.now()}`,
                                  conversation_id: conversationId || '',
                                  role: 'assistant',
                                  content: errorContent,
                                  created_at: new Date().toISOString(),
                                }
                                
                                setMessages((prev) => {
                                  const filtered = prev.filter((msg) => msg.id !== tempUserMessage.id)
                                  return [...filtered, errorMessage]
                                })

                                if (error.message?.includes('API key')) {
                                  setApiAvailable(false)
                                }
                              } finally {
                                setIsLoading(false)
                              }
                            }}
                            disabled={isLoading}
                            className="w-full px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-medium text-sm shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <Send className="h-4 w-4" />
                            Envoyer toutes les réponses ({selectedAnswers.size}/{suggestedQuestions.length})
                          </motion.button>
                        </div>
                      )}
                    </div>
                  )}
                  </div>
                </div>
                {message.role === 'user' && (
                  <div className="flex-shrink-0 h-9 w-9 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center shadow-md">
                    <User className="h-5 w-5 text-gray-600" />
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        )}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-3 justify-start items-start"
          >
            <div className="flex-shrink-0 h-9 w-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-md">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div className="bg-white/60 backdrop-blur-sm border border-white/40 rounded-lg px-4 py-3 shadow-sm">
              <div className="flex gap-1.5">
                <div className="h-2 w-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="h-2 w-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="h-2 w-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <AnimatePresence>
          {!showConversationsList && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="flex-shrink-0 bg-white/40 backdrop-blur-xl border-t border-white/20 px-4 py-4 pb-20 sm:pb-24 z-[60] relative"
            >
              <div className="flex gap-2 items-end">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      sendMessage()
                    }
                  }}
                  placeholder="Décrivez votre problème..."
                  disabled={isLoading}
                  className="flex-1 min-h-[44px] text-sm bg-white/60 backdrop-blur-sm border-white/40 rounded-lg relative z-[70]"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                  data-form-type="other"
                  data-lpignore="true"
                  data-1p-ignore="true"
                />
                <Button
                  onClick={() => sendMessage()}
                  disabled={!inputMessage.trim() || isLoading}
                  className="h-[44px] w-[44px] rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-md hover:shadow-lg transition-all flex-shrink-0 relative z-[70]"
                >
                  <Send className="h-4 w-4 text-white" />
                </Button>
              </div>
              {!apiAvailable && (
                <p className="text-xs text-gray-500 mt-2 text-center font-light">
                  Le service de diagnostic IA est momentanément indisponible
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <BottomNavigation />
    </div>
  )
}

