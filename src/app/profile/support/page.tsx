"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Send, HelpCircle, AlertCircle, FileText, MessageCircle, CreditCard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useAuth } from "@/lib/hooks/use-auth"
import { supabase } from "@/lib/supabase/client"
import { useToast } from "@/components/ui/use-toast"
import { showElegantToast } from "@/components/ui/elegant-toast"
import { BottomNavigation } from "@/components/layout/BottomNavigation"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const categories = [
  { value: "technical", label: "Problème technique", icon: AlertCircle, color: "text-red-600" },
  { value: "client", label: "Question client", icon: MessageCircle, color: "text-blue-600" },
  { value: "garage", label: "Question garage", icon: FileText, color: "text-green-600" },
  { value: "billing", label: "Facturation", icon: CreditCard, color: "text-purple-600" },
  { value: "other", label: "Autre", icon: HelpCircle, color: "text-gray-600" },
]

export default function SupportPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    subject: "",
    message: "",
    category: "other",
  })

  useEffect(() => {
    if (authLoading) {
      return
    }

    if (!user) {
      router.push("/login")
      return
    }
  }, [user, router, authLoading])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.subject.trim() || !formData.message.trim()) {
      showElegantToast({
        title: "Champs requis",
        message: "Veuillez remplir tous les champs",
        variant: "error",
      })
      return
    }

    setLoading(true)

    try {
      // Récupérer le token d'accès depuis la session Supabase
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        showElegantToast({
          title: "Non authentifié",
          message: "Veuillez vous reconnecter",
          variant: "error",
        })
        router.push("/login")
        return
      }

      const response = await fetch("/api/support/tickets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          subject: formData.subject.trim(),
          message: formData.message.trim(),
          category: formData.category,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de la création du ticket")
      }

      showElegantToast({
        title: "Ticket créé avec succès",
        message: "Votre demande de support a été envoyée. Nous vous répondrons dans les plus brefs délais.",
        variant: "success",
      })

      // Réinitialiser le formulaire
      setFormData({
        subject: "",
        message: "",
        category: "other",
      })

      // Rediriger vers le profil après 1.5 secondes
      setTimeout(() => {
        router.push("/profile")
      }, 1500)
    } catch (error: any) {
      console.error("Error creating ticket:", error)
      showElegantToast({
        title: "Erreur",
        message: error.message || "Une erreur est survenue lors de l'envoi de votre demande",
        variant: "error",
      })
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Chargement...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const selectedCategory = categories.find((cat) => cat.value === formData.category)

  return (
    <div className="h-full w-full bg-gradient-to-br from-blue-50/40 via-white to-purple-50/20 overflow-y-auto pb-20 safe-area-top safe-area-bottom">
      <div className="w-full h-full bg-white/70 backdrop-blur-2xl overflow-y-auto">
        <div className="px-6 py-6">
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
              <h1 className="text-2xl font-bold text-gray-900">Support</h1>
              <p className="text-sm text-gray-500">Nous sommes là pour vous aider</p>
            </div>
          </div>

          {/* Card principale */}
          <Card className="mb-4 border-2 border-gray-200 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-t-lg">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-lg">
                  <HelpCircle className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl">Créer un ticket de support</CardTitle>
                  <CardDescription>
                    Décrivez votre problème ou votre question
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Catégorie */}
                <div className="space-y-3">
                  <Label htmlFor="category" className="text-sm font-medium text-gray-700">
                    Catégorie
                  </Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger className="h-14 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      <SelectValue placeholder="Sélectionnez une catégorie">
                        {selectedCategory && (
                          <div className="flex items-center gap-2">
                            <selectedCategory.icon className={`h-5 w-5 ${selectedCategory.color}`} />
                            <span>{selectedCategory.label}</span>
                          </div>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => {
                        const Icon = category.icon
                        return (
                          <SelectItem key={category.value} value={category.value}>
                            <div className="flex items-center gap-2">
                              <Icon className={`h-5 w-5 ${category.color}`} />
                              <span>{category.label}</span>
                            </div>
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {/* Sujet */}
                <div className="space-y-3">
                  <Label htmlFor="subject" className="text-sm font-medium text-gray-700">
                    Sujet
                  </Label>
                  <Input
                    id="subject"
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData((prev) => ({ ...prev, subject: e.target.value }))}
                    placeholder="Ex: Problème de connexion, Question sur un rendez-vous..."
                    className="h-14 px-4 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    maxLength={200}
                  />
                  <p className="text-xs text-gray-500">
                    {formData.subject.length}/200 caractères
                  </p>
                </div>

                {/* Message */}
                <div className="space-y-3">
                  <Label htmlFor="message" className="text-sm font-medium text-gray-700">
                    Description détaillée
                  </Label>
                  <Textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => setFormData((prev) => ({ ...prev, message: e.target.value }))}
                    placeholder="Décrivez votre problème ou votre question en détail. Plus vous fournissez d'informations, plus nous pourrons vous aider rapidement..."
                    className="min-h-[200px] px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                    maxLength={2000}
                  />
                  <p className="text-xs text-gray-500">
                    {formData.message.length}/2000 caractères
                  </p>
                </div>

                {/* Astuce */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-1">Conseil</p>
                      <p>
                        Pour une réponse plus rapide, incluez des détails comme :
                        le numéro de rendez-vous, la date du problème, ou des captures d'écran si possible.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Submit */}
                <div className="pt-4">
                  <Button
                    type="submit"
                    disabled={loading || !formData.subject.trim() || !formData.message.trim()}
                    className="w-full h-14 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl transition-all shadow-lg hover:shadow-xl active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      "Envoi en cours..."
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Envoyer le ticket
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      <BottomNavigation />
    </div>
  )
}

