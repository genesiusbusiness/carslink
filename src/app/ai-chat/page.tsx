"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowLeft, Send, Bot, User, AlertCircle, Clock, CheckCircle, Calendar, X, Check, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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
  const [profile, setProfile] = useState<Profile | null>(null)
  const [conversations, setConversations] = useState<Array<{id: string, created_at: string, updated_at: string, message_count: number}>>([])
  const [showConversationsList, setShowConversationsList] = useState(false)
  const [selectedConversations, setSelectedConversations] = useState<Set<string>>(new Set())
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [selectedAnswers, setSelectedAnswers] = useState<Map<number, string>>(new Map())
  const messagesEndRef = useRef<HTMLDivElement>(null)

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
            setVehicles(vehiclesData as Vehicle[])
          } else {
            console.log('ℹ️ Aucun véhicule trouvé dans le profil CarsLink')
          }
        }
      } catch (error) {
        console.error('❌ Erreur lors du chargement du profil:', error)
      }
    }

    loadUserData()
  }, [user])

  // Charger l'historique des conversations (24h)
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

        // Récupérer les conversations des dernières 24h
        const yesterday = new Date()
        yesterday.setHours(yesterday.getHours() - 24)

        const { data: conversationsData, error } = await supabase
          .from('ai_chat_conversations')
          .select('id, created_at, updated_at')
          .eq('flynesis_user_id', flyAccount.id)
          .gte('created_at', yesterday.toISOString())
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
          
          // Si on a une conversation active, ne pas afficher la liste
          if (conversationId) {
            setShowConversationsList(false)
          } else if (conversationsWithCount.length > 0) {
            // Afficher la liste si on n'a pas de conversation active
            setShowConversationsList(true)
          }
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

  const sendMessage = async (messageToSend?: string) => {
    const message = messageToSend || inputMessage.trim()
    if (!message || !user || isLoading) return

    const userMessage = message.trim()
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
      // Vérifier que les véhicules sont bien chargés
      console.log('🔍 État des véhicules avant envoi:', {
        vehiclesState: vehicles,
        vehiclesLength: vehicles.length,
        vehiclesIsArray: Array.isArray(vehicles)
      })
      
      if (!vehicles || vehicles.length === 0) {
        console.error('❌ ERREUR: Aucun véhicule dans le state ! Vérifiez le chargement depuis Supabase.')
        toast({
          title: "Aucun véhicule trouvé",
          description: "Veuillez ajouter un véhicule dans votre profil.",
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }
      
      // Préparer les véhicules à envoyer
      const vehiclesPayload = vehicles.map(v => ({
        id: v.id,
        brand: v.brand || 'Marque inconnue',
        model: v.model || 'Modèle inconnu',
        license_plate: v.license_plate || null,
        year: v.year || null,
        fuel_type: v.fuel_type || null,
      }))
      
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
      // MAIS afficher quand même la réponse si elle existe
      if (data.message && data.message.content && data.message.content.includes('temporairement indisponible')) {
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
              title: "Erreur d'authentification OpenRouter",
              description: "La clé API OpenRouter n'est pas valide. Vérifiez la configuration.",
              variant: "destructive",
            })
          } catch (toastError: any) {
            console.error('❌ Erreur lors de l\'affichage du toast:', toastError)
          }
        }
      }
      
      // Remplacer le message temporaire par le message réel de l'utilisateur et ajouter le message de l'assistant
      setMessages((prev) => {
        const filtered = prev.filter((msg) => msg.id !== tempUserMessage.id)
        // Ajouter le message de l'utilisateur réel si disponible (depuis la base de données)
        const userMsg = data.userMessage ? data.userMessage : tempUserMessage
        return [...filtered, userMsg, data.message]
      })

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
      
      if (error.message?.includes('API key')) {
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
  }

  const loadConversation = async (convId: string) => {
    if (!user) return

    try {
      setIsLoading(true)
      
      const response = await fetch(`/api/ai-chat?conversationId=${convId}&userId=${user.id}`)
      
      if (!response.ok) {
        throw new Error('Erreur lors du chargement de la conversation')
      }

      const data = await response.json()
      
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

    const yesterday = new Date()
    yesterday.setHours(yesterday.getHours() - 24)

    const { data: conversationsData } = await supabase
      .from('ai_chat_conversations')
      .select('id, created_at, updated_at')
      .eq('flynesis_user_id', flyAccount.id)
      .gte('created_at', yesterday.toISOString())
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
        throw new Error('Erreur lors de la suppression de la conversation')
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
        description: "Impossible de supprimer la conversation",
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

      // Supprimer toutes les conversations sélectionnées
      const deletePromises = Array.from(selectedConversations).map(convId => 
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

      // Supprimer toutes les conversations
      const deletePromises = conversations.map(conv => 
        fetch('/api/ai-chat', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            conversationId: conv.id,
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
          <Badge variant="destructive" className="text-[9px] px-1.5 py-0.5">
            <AlertCircle className="h-2.5 w-2.5 mr-1" />
            Urgent
          </Badge>
        )
      case 'moderate':
        return (
          <Badge variant="default" className="bg-yellow-500 text-white text-[9px] px-1.5 py-0.5">
            <Clock className="h-2.5 w-2.5 mr-1" />
            Modéré
          </Badge>
        )
      case 'low':
        return (
          <Badge variant="default" className="bg-green-500 text-white text-[9px] px-1.5 py-0.5">
            <CheckCircle className="h-2.5 w-2.5 mr-1" />
            Faible
          </Badge>
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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/")}
            className="h-10 w-10 rounded-full hover:bg-gray-100 transition-all text-gray-700"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-gray-900">Assistant IA</h1>
            <p className="text-xs text-gray-500">Diagnostic automobile intelligent</p>
          </div>
          {conversationId && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => deleteConversation()}
              className="h-8 w-8 rounded-full hover:bg-red-100 transition-all text-red-600"
              title="Supprimer cette conversation"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          {conversations.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowConversationsList(!showConversationsList)}
              className="text-xs px-2 py-1"
            >
              Historique
            </Button>
          )}
          {!apiAvailable && (
            <Badge variant="secondary" className="text-[9px] px-2 py-0.5">
              Service indisponible
            </Badge>
          )}
        </div>
      </div>

      {/* Liste des conversations */}
      {showConversationsList && conversations.length > 0 && (
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-700">Conversations récentes (24h)</p>
            <div className="flex items-center gap-2">
              {isSelectionMode ? (
                <>
                  {selectedConversations.size > 0 && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={deleteSelectedConversations}
                      className="text-xs h-6 px-2"
                      disabled={isLoading}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Supprimer ({selectedConversations.size})
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={deleteAllConversations}
                    className="text-xs h-6 px-2"
                    disabled={isLoading}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Tout supprimer
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsSelectionMode(false)
                      setSelectedConversations(new Set())
                    }}
                    className="text-xs h-6 px-2"
                  >
                    Annuler
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsSelectionMode(true)}
                    className="text-xs h-6 px-2"
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Sélectionner
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowConversationsList(false)}
                    className="text-xs h-6 px-2"
                  >
                    Fermer
                  </Button>
                </>
              )}
            </div>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {conversations.map((conv) => (
              <motion.div
                key={conv.id}
                className={`w-full px-3 py-2 rounded-lg border transition-all ${
                  conversationId === conv.id
                    ? 'bg-blue-50 border-blue-300 text-blue-700'
                    : 'bg-white border-gray-200'
                } ${isSelectionMode ? 'cursor-pointer' : ''}`}
                whileHover={!isSelectionMode ? { scale: 1.02 } : {}}
                whileTap={!isSelectionMode ? { scale: 0.98 } : {}}
              >
                <div className="flex items-center gap-2">
                  {isSelectionMode && (
                    <div
                      onClick={() => toggleConversationSelection(conv.id)}
                      className={`flex-shrink-0 h-5 w-5 rounded border-2 flex items-center justify-center cursor-pointer transition-all ${
                        selectedConversations.has(conv.id)
                          ? 'bg-blue-600 border-blue-600'
                          : 'border-gray-300 bg-white'
                      }`}
                    >
                      {selectedConversations.has(conv.id) && (
                        <Check className="h-3 w-3 text-white" />
                      )}
                    </div>
                  )}
                  <div
                    className={`flex-1 ${!isSelectionMode ? 'cursor-pointer' : ''}`}
                    onClick={() => {
                      if (!isSelectionMode) {
                        loadConversation(conv.id)
                      } else {
                        toggleConversationSelection(conv.id)
                      }
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-xs font-medium">
                          {new Date(conv.updated_at).toLocaleString('fr-FR', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                        <p className="text-[10px] text-gray-500 mt-0.5">
                          {conv.message_count} message{conv.message_count > 1 ? 's' : ''}
                        </p>
                      </div>
                      {!isSelectionMode && conversationId === conv.id && (
                        <Badge variant="default" className="text-[9px] px-1.5 py-0.5 bg-blue-600">
                          Actif
                        </Badge>
                      )}
                      {isSelectionMode && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteConversation(conv.id)
                          }}
                          className="h-6 w-6 text-red-600 hover:text-red-700 hover:bg-red-50"
                          disabled={isLoading}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="px-4 py-6 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
        {messages.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <Bot className="h-16 w-16 text-blue-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Bonjour ! 👋
            </h2>
            <p className="text-sm text-gray-600 mb-6 max-w-md mx-auto">
              Décrivez votre problème automobile et je vais vous aider à identifier les causes probables, 
              le niveau d'urgence et vous recommander le service approprié.
            </p>
            
            {/* Propositions de premiers messages */}
            <div className="space-y-3 max-w-md mx-auto mt-8">
              <p className="text-xs text-gray-500 font-medium mb-3">Ou commencez par choisir un problème :</p>
              <div className="grid grid-cols-1 gap-2">
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
                      
                      // Vérifier que les véhicules sont bien chargés après l'attente
                      if (!vehicles || vehicles.length === 0) {
                        toast({
                          title: "Aucun véhicule trouvé",
                          description: "Veuillez ajouter un véhicule dans votre profil avant de commencer une conversation.",
                          variant: "destructive",
                        })
                        return
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
                        
                        // Préparer les véhicules à envoyer
                        const vehiclesPayload = vehicles.map(v => ({
                          id: v.id,
                          brand: v.brand || 'Marque inconnue',
                          model: v.model || 'Modèle inconnu',
                          license_plate: v.license_plate || null,
                          year: v.year || null,
                          fuel_type: v.fuel_type || null,
                        }))
                        
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
                    className="text-left text-xs px-4 py-3 bg-white hover:bg-blue-50 border border-gray-200 hover:border-blue-300 rounded-lg transition-all text-gray-700 shadow-sm hover:shadow-md"
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
                className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' && (
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                      : 'bg-white border border-gray-200 text-gray-900 shadow-sm'
                  }`}
                >
                  <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                  
                  {/* Analyse IA (uniquement si ce n'est pas une salutation) */}
                  {message.role === 'assistant' && message.ai_analysis && !(message.ai_analysis as any)?.is_greeting && (
                    <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                      {/* Causes probables */}
                      {message.ai_analysis.causes && message.ai_analysis.causes.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-gray-700 mb-1.5">Causes probables :</p>
                          <ul className="text-xs text-gray-600 space-y-1">
                            {message.ai_analysis.causes.map((cause, index) => (
                              <li key={index} className="flex items-start gap-2">
                                <span className="text-blue-500 mt-0.5">•</span>
                                <span>{cause}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Urgence et service recommandé */}
                      {((message.ai_analysis as any)?.diagnostic_complete || message.ai_analysis.urgency) && (
                        <div className="flex items-center justify-between gap-2 pt-2">
                          <div className="flex items-center gap-2">
                            {message.ai_analysis.urgency && getUrgencyBadge(message.ai_analysis.urgency)}
                            {message.ai_analysis.recommended_service && (
                              <span className="text-xs text-gray-600">
                                Service : <span className="font-semibold">{message.ai_analysis.recommended_service}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Bouton de réservation et message d'avertissement (uniquement pour diagnostic complet) */}
                      {message.ai_analysis.recommended_service && (message.ai_analysis as any)?.diagnostic_complete && (
                        <>
                          {/* Message d'avertissement */}
                          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <div className="flex items-start gap-2">
                              <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                              <p className="text-xs text-red-700 leading-relaxed">
                                <span className="font-semibold">⚠️ Avertissement :</span> Ce diagnostic est fourni par une intelligence artificielle à titre indicatif uniquement. Il ne remplace pas l'expertise d'un professionnel. Veuillez consulter un mécanicien qualifié lors de votre rendez-vous pour un diagnostic précis et une réparation appropriée.
                              </p>
                            </div>
                          </div>

                          {/* Bouton de réservation */}
                          <motion.button
                            onClick={() => handleReservation(message.ai_analysis)}
                            className="w-full mt-3 py-2.5 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 hover:shadow-md transition-all"
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
                    <div className="mt-3 pt-3 border-t border-gray-200 space-y-4">
                      {suggestedQuestions.map((qObj, qIndex) => (
                        <div key={qIndex} className="space-y-2">
                          <p className="text-xs font-semibold text-gray-700">
                            {qObj.question}
                            {selectedAnswers.has(qIndex) && (
                              <span className="ml-2 text-green-600 text-[10px]">✓ Sélectionné</span>
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
                                    className={`text-xs px-3 py-1.5 border rounded-lg transition-colors font-medium ${
                                      isSelected
                                        ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
                                        : 'bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700'
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
                          <p className="text-xs text-gray-500 italic">
                            💡 Sélectionnez une option pour chaque question, puis cliquez sur "Envoyer toutes les réponses"
                          </p>
                        </div>
                      )}
                      
                      {/* Bouton pour envoyer toutes les réponses */}
                      {selectedAnswers.size > 0 && (
                        <div className="pt-3 border-t border-gray-200">
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
                                // Vérifier que les véhicules sont bien chargés
                                if (!vehicles || vehicles.length === 0) {
                                  toast({
                                    title: "Aucun véhicule trouvé",
                                    description: "Veuillez ajouter un véhicule dans votre profil.",
                                    variant: "destructive",
                                  })
                                  setIsLoading(false)
                                  return
                                }
                                
                                // Préparer les véhicules à envoyer
                                const vehiclesPayload = vehicles.map(v => ({
                                  id: v.id,
                                  brand: v.brand || 'Marque inconnue',
                                  model: v.model || 'Modèle inconnu',
                                  license_plate: v.license_plate || null,
                                  year: v.year || null,
                                  fuel_type: v.fuel_type || null,
                                }))
                                
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
                            className="w-full mt-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-semibold text-sm shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <Send className="h-4 w-4 inline mr-2" />
                            Envoyer toutes les réponses ({selectedAnswers.size}/{suggestedQuestions.length})
                          </motion.button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {message.role === 'user' && (
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                    <User className="h-4 w-4 text-gray-600" />
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
            className="flex gap-3 justify-start"
          >
            <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm">
              <div className="flex gap-1">
                <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="fixed bottom-20 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 px-4 py-3">
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
            className="flex-1 min-h-[44px] text-sm"
          />
          <Button
            onClick={() => sendMessage()}
            disabled={!inputMessage.trim() || isLoading}
            className="h-[44px] w-[44px] rounded-full bg-gradient-to-r from-blue-600 to-purple-600 hover:shadow-lg transition-all"
          >
            <Send className="h-4 w-4 text-white" />
          </Button>
        </div>
        {!apiAvailable && (
          <p className="text-xs text-gray-500 mt-2 text-center">
            Le service de diagnostic IA est momentanément indisponible
          </p>
        )}
      </div>

      <BottomNavigation />
    </div>
  )
}

