"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Upload, X, Camera, Video, FileText, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BottomNavigation } from "@/components/layout/BottomNavigation"
import { useAuth } from "@/lib/hooks/use-auth"
import { supabase } from "@/lib/supabase/client"
import { useToast } from "@/components/ui/use-toast"

export default function DiagnosticPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const [description, setDescription] = useState("")
  const [photos, setPhotos] = useState<File[]>([])
  const [videos, setVideos] = useState<File[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    }
  }, [user, authLoading, router])

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Chargement...</div>
      </div>
    )
  }

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setPhotos([...photos, ...files])
  }

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setVideos([...videos, ...files])
  }

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index))
  }

  const removeVideo = (index: number) => {
    setVideos(videos.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!description.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer une description",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      // Upload photos to Supabase Storage
      const photoUrls: string[] = []
      for (const photo of photos) {
        const fileExt = photo.name.split(".").pop()
        const fileName = `${user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
        const { data, error } = await supabase.storage
          .from("diagnostics")
          .upload(fileName, photo)

        if (!error && data) {
          const { data: urlData } = supabase.storage
            .from("diagnostics")
            .getPublicUrl(fileName)
          if (urlData?.publicUrl) {
            photoUrls.push(urlData.publicUrl)
          }
        }
      }

      // Upload videos similarly (placeholder)
      const videoUrls: string[] = []

      // Save diagnostic request
      const { error } = await supabase.from("client_requests").insert({
        flynesis_user_id: user.id,
        description,
        photos: photoUrls,
        videos: videoUrls,
        type: "diagnostic",
      })

      if (error) throw error

      toast({
        title: "Diagnostic envoyé",
        description: "Votre demande de diagnostic a été envoyée avec succès",
        variant: "default",
      })

      router.push("/appointments")
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de l'envoi du diagnostic",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 w-full h-full overflow-y-auto bg-gray-50 pb-28 sm:pb-32 safe-area-top safe-area-bottom">
      <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 py-4 sm:py-6 pb-28 sm:pb-32">
        <Card>
          <CardHeader>
            <CardTitle>Diagnostic</CardTitle>
            <CardDescription>
              Décrivez le problème avec votre véhicule et ajoutez des photos/vidéos si nécessaire
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Description du problème
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full min-h-[150px] p-3 border border-input rounded-lg resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Ex: Ma voiture fait un bruit étrange quand je freine..."
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Photos ({photos.length})
                </label>
                <div className="flex flex-wrap gap-3 mb-3">
                  {photos.map((photo, index) => (
                    <div key={index} className="relative">
                      <img
                        src={URL.createObjectURL(photo)}
                        alt={`Photo ${index + 1}`}
                        className="h-24 w-24 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute -top-2 -right-2 h-6 w-6 bg-red-500 text-white rounded-full flex items-center justify-center"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                  <Button type="button" variant="outline" className="w-full">
                    <Camera className="h-4 w-4 mr-2" />
                    Ajouter des photos
                  </Button>
                </label>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Vidéos ({videos.length})
                </label>
                <div className="flex flex-wrap gap-3 mb-3">
                  {videos.map((video, index) => (
                    <div key={index} className="relative">
                      <div className="h-24 w-24 bg-gray-100 rounded-lg flex items-center justify-center">
                        <Video className="h-8 w-8 text-gray-400" />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeVideo(index)}
                        className="absolute -top-2 -right-2 h-6 w-6 bg-red-500 text-white rounded-full flex items-center justify-center"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="video/*"
                    multiple
                    onChange={handleVideoUpload}
                    className="hidden"
                  />
                  <Button type="button" variant="outline" className="w-full">
                    <Video className="h-4 w-4 mr-2" />
                    Ajouter des vidéos
                  </Button>
                </label>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                <Send className="h-4 w-4 mr-2" />
                {loading ? "Envoi en cours..." : "Envoyer le diagnostic"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <BottomNavigation />
    </div>
  )
}

