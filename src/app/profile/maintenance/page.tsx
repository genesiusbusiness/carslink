"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Plus, FileText, Trash2, Download, Car, UploadCloud, Edit, Check } from "lucide-react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { BottomNavigation } from "@/components/layout/BottomNavigation"
import { useAuth } from "@/lib/hooks/use-auth"
import { supabase } from "@/lib/supabase/client"
import { showElegantToast } from "@/components/ui/elegant-toast"
import { formatDate } from "@/lib/utils"
import type { Vehicle } from "@/lib/types/database"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface VehicleDocument {
  id: string
  vehicle_id: string
  file_name: string
  display_name?: string | null
  file_url: string
  file_type: string
  file_size?: number | null
  created_at: string
}

interface VehicleWithDocuments extends Vehicle {
  id: string
  brand?: string | null
  model?: string | null
  license_plate?: string | null
  year?: number | null
  documents: VehicleDocument[]
}

const ACCEPTED_DOCUMENT_FORMATS = [
  '.pdf', '.doc', '.docx', '.txt', '.rtf',
  '.xls', '.xlsx', '.csv', '.odt', '.ods', '.odp'
]

const ACCEPTED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'application/rtf',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'application/vnd.oasis.opendocument.text',
  'application/vnd.oasis.opendocument.spreadsheet',
  'application/vnd.oasis.opendocument.presentation'
]

export default function MaintenancePage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [vehicles, setVehicles] = useState<VehicleWithDocuments[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [documentToDelete, setDocumentToDelete] = useState<VehicleDocument | null>(null)
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const [documentToRename, setDocumentToRename] = useState<VehicleDocument | null>(null)
  const [newDisplayName, setNewDisplayName] = useState("")

  const loadData = useCallback(async () => {
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      // Récupérer le flynesis_user_id
      const { data: flyAccount, error: flyAccountError } = await supabase
        .from("fly_accounts")
        .select("id")
        .eq("auth_user_id", user.id)
        .single()

      if (flyAccountError || !flyAccount) {
        throw new Error("Compte FlyID introuvable")
      }

      // Charger les véhicules avec leurs documents
      const { data: vehiclesData, error: vehiclesError } = await supabase
        .from("vehicles")
        .select(`
          *,
          documents:vehicle_documents(*)
        `)
        .eq("flynesis_user_id", flyAccount.id)
        .order("created_at", { ascending: false })

      if (vehiclesError) {
        throw vehiclesError
      }

      if (vehiclesData) {
        // Trier les documents par date décroissante pour chaque véhicule
        const vehiclesWithSortedDocs = vehiclesData.map(vehicle => ({
          ...vehicle,
          documents: (vehicle.documents || []).sort((a: VehicleDocument, b: VehicleDocument) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )
        }))
        setVehicles(vehiclesWithSortedDocs as VehicleWithDocuments[])
      }
    } catch (error: any) {
      setError(error.message || "Impossible de charger les documents techniques")
      showElegantToast({
        title: "Erreur",
        message: error.message || "Erreur lors du chargement",
        variant: "error",
      })
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      router.push("/login")
      return
    }

    loadData()
  }, [user, authLoading, router, loadData])

  const validateFile = (file: File): boolean => {
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
    const isValidExtension = ACCEPTED_DOCUMENT_FORMATS.includes(fileExtension)
    const isValidMimeType = ACCEPTED_MIME_TYPES.includes(file.type)

    if (!isValidExtension && !isValidMimeType) {
      showElegantToast({
        title: "Format non supporté",
        message: "Veuillez sélectionner un fichier au format PDF, DOC, DOCX, TXT, RTF, XLS, XLSX, CSV, ODT, ODS ou ODP",
        variant: "error",
      })
      return false
    }
    return true
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, vehicleId: string) => {
    if (!user || !event.target.files || event.target.files.length === 0) return

    const file = event.target.files[0]
    
    // Valider le format du fichier
    if (!validateFile(file)) {
      event.target.value = '' // Réinitialiser l'input seulement en cas d'erreur
      return
    }

    setUploading(true)
    try {
      const fileName = `${vehicleId}/${Date.now()}_${file.name}`
      const filePath = `maintenance/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('carslink-maintenance')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('carslink-maintenance')
        .getPublicUrl(filePath)

      // Récupérer le flynesis_user_id
      const { data: flyAccount } = await supabase
        .from("fly_accounts")
        .select("id")
        .eq("auth_user_id", user.id)
        .single()

      if (!flyAccount) {
        throw new Error("Compte FlyID introuvable")
      }

      const { data: insertedDocument, error: insertError } = await supabase
        .from("vehicle_documents")
        .insert({
          vehicle_id: vehicleId,
          file_name: file.name,
          file_url: publicUrl,
          file_type: 'document',
          file_size: file.size,
          flynesis_user_id: flyAccount.id,
        })
        .select()
        .single()

      if (insertError) throw insertError

      // Réinitialiser l'input AVANT d'ouvrir le dialog
      event.target.value = ''

      // Ouvrir automatiquement le dialog de renommage après l'upload réussi
      if (insertedDocument) {
        setDocumentToRename(insertedDocument as VehicleDocument)
        setNewDisplayName(file.name) // Pré-remplir avec le nom du fichier
        setRenameDialogOpen(true)
      }

      showElegantToast({
        title: "Document ajouté",
        message: "Le document a été ajouté avec succès",
        variant: "success",
      })
      // Recharger les données après la fermeture du dialog (dans handleRenameDocument)
    } catch (error: any) {
      event.target.value = '' // Réinitialiser l'input en cas d'erreur
      
      // Message d'erreur spécifique pour le bucket manquant
      if (error.message && error.message.includes("Bucket not found")) {
        showElegantToast({
          title: "Bucket de stockage manquant",
          message: "Le bucket de stockage n'existe pas. Veuillez contacter le support.",
          variant: "error",
        })
      } else {
        showElegantToast({
          title: "Erreur",
          message: error.message || "Erreur lors de l'upload du document",
          variant: "error",
        })
      }
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteClick = (document: VehicleDocument) => {
    setDocumentToDelete(document)
    setDeleteDialogOpen(true)
  }

  const handleDeleteDocument = async () => {
    if (!documentToDelete) return

    setLoading(true)
    try {
      // Supprimer le fichier du storage
      const filePath = documentToDelete.file_url.split('carslink-maintenance/')[1]
      const { error: storageError } = await supabase.storage
        .from('carslink-maintenance')
        .remove([filePath])

      if (storageError) throw storageError

      // Supprimer l'entrée de la base de données
      const { error: dbError } = await supabase
        .from("vehicle_documents")
        .delete()
        .eq("id", documentToDelete.id)

      if (dbError) throw dbError

      showElegantToast({
        title: "Document supprimé",
        message: "Le document a été supprimé avec succès",
        variant: "success",
      })

      setDeleteDialogOpen(false)
      setDocumentToDelete(null)
      loadData()
    } catch (error: any) {
      showElegantToast({
        title: "Erreur",
        message: error.message || "Erreur lors de la suppression",
        variant: "error",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRenameClick = (document: VehicleDocument) => {
    setDocumentToRename(document)
    setNewDisplayName(document.display_name || document.file_name)
    setRenameDialogOpen(true)
  }

  const handleRenameDocument = async () => {
    if (!documentToRename || !newDisplayName.trim()) return

    try {
      const { error } = await supabase
        .from("vehicle_documents")
        .update({ display_name: newDisplayName.trim() })
        .eq("id", documentToRename.id)

      if (error) throw error

      showElegantToast({
        title: "Document renommé",
        message: "Le document a été renommé avec succès",
        variant: "success",
      })

      setRenameDialogOpen(false)
      setDocumentToRename(null)
      setNewDisplayName("")
      loadData() // Recharger les données après le renommage
    } catch (error: any) {
      showElegantToast({
        title: "Erreur",
        message: error.message || "Erreur lors du renommage",
        variant: "error",
      })
    }
  }

  const getDocumentDisplayName = (doc: VehicleDocument): string => {
    return doc.display_name || doc.file_name
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50/40 via-white to-purple-50/20 flex items-center justify-center">
        <div className="text-gray-600">Chargement...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50/40 via-white to-purple-50/20 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => { setError(null); loadData(); }}>
            Réessayer
          </Button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="fixed inset-0 w-full h-full overflow-y-auto bg-gradient-to-br from-blue-50/40 via-white to-purple-50/20 pb-32 sm:pb-40 safe-area-top safe-area-bottom">
        <div className="w-full max-w-7xl mx-auto bg-white/70 backdrop-blur-2xl pb-32 sm:pb-40">
          {/* Header */}
          <div className="px-6 py-6 bg-white/40 backdrop-blur-xl border-b border-white/20">
            <div className="flex items-center gap-4 mb-6">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push("/profile")}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex-1">
                <h1 className="text-2xl font-light text-gray-900">Documentation technique</h1>
                <p className="text-sm text-gray-600 mt-1">Gérez vos documents de véhicules</p>
              </div>
            </div>
          </div>

          {/* Contenu */}
          <div className="px-4 sm:px-6 py-6 sm:py-8 space-y-6 pb-12 sm:pb-16">
            {vehicles.length === 0 ? (
              <Card className="bg-white/60 backdrop-blur-xl border border-white/40">
                <CardContent className="p-12 text-center">
                  <Car className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Aucun véhicule enregistré
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Ajoutez un véhicule pour commencer à gérer ses documents
                  </p>
                  <Button
                    onClick={() => router.push("/profile/vehicles/new")}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter un véhicule
                  </Button>
                </CardContent>
              </Card>
            ) : (
              vehicles.map((vehicle) => (
                <Card
                  key={vehicle.id}
                  className="bg-white/60 backdrop-blur-xl border border-white/40 shadow-[0_4px_20px_rgba(0,0,0,0.08)]"
                >
                  <CardHeader className="p-4 sm:p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                            <Car className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <CardTitle className="text-lg sm:text-xl">
                              {vehicle.brand} {vehicle.model}
                            </CardTitle>
                            {vehicle.license_plate && (
                              <CardDescription className="text-xs sm:text-sm mt-1">
                                <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">
                                  {vehicle.license_plate}
                                </span>
                              </CardDescription>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6">
                    {/* Zone d'upload de documents */}
                    <div
                      className="relative flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-xl text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all group mb-6"
                      onClick={() => document.getElementById(`file-upload-${vehicle.id}`)?.click()}
                    >
                      <UploadCloud className="h-10 w-10 text-gray-400 group-hover:text-blue-600 mb-3" />
                      <p className="text-sm font-medium text-gray-700 mb-1">Déposez vos documents ici</p>
                      <p className="text-xs text-gray-500">ou cliquez pour sélectionner</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Formats acceptés : PDF, DOC, DOCX, TXT, RTF, XLS, XLSX, CSV, ODT, ODS, ODP
                      </p>
                      <input
                        id={`file-upload-${vehicle.id}`}
                        type="file"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={(e) => handleFileUpload(e, vehicle.id)}
                        disabled={uploading}
                        accept={ACCEPTED_DOCUMENT_FORMATS.join(',')}
                        onClick={(e) => {
                          // Réinitialiser l'input si on clique dessus pendant qu'il est vide
                          // Cela évite les problèmes de double-clic
                          if (!uploading && e.currentTarget.value === '') {
                            // Ne rien faire, laisser le navigateur ouvrir le sélecteur de fichiers
                          }
                        }}
                      />
                    </div>

                    {/* Liste des documents */}
                    {(!vehicle.documents || vehicle.documents.filter(doc => doc.file_type === 'document').length === 0) ? (
                      <p className="text-gray-600 text-sm text-center py-4">Aucun document enregistré pour ce véhicule.</p>
                    ) : (
                      <div className="space-y-3">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <FileText className="h-5 w-5 text-blue-600" />
                          Documents ({vehicle.documents.filter(doc => doc.file_type === 'document').length})
                        </h3>
                        {vehicle.documents
                          .filter(doc => doc && doc.file_type === 'document')
                          .map((doc) => (
                          <motion.div
                            key={doc.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all group"
                          >
                            <FileText className="h-5 w-5 text-blue-500 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {getDocumentDisplayName(doc)}
                              </p>
                              <p className="text-xs text-gray-500">
                                {doc.created_at ? formatDate(doc.created_at) : 'Date inconnue'}
                                {doc.file_size && ` • ${(doc.file_size / 1024).toFixed(1)} KB`}
                                {doc.display_name && doc.display_name !== doc.file_name && (
                                  <span className="ml-2 text-gray-400">({doc.file_name})</span>
                                )}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-gray-500 hover:text-blue-600"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleRenameClick(doc)
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <a
                                href={doc.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Download className="h-4 w-4 text-blue-600" />
                              </a>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-gray-500 hover:text-red-600"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteClick(doc)
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>

      <BottomNavigation />

      {/* Dialog de confirmation de suppression */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-red-100">
              <Trash2 className="h-8 w-8 text-red-600" />
            </div>
            <AlertDialogTitle className="text-center">
              Supprimer le document ?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              {documentToDelete && (
                <>
                  Êtes-vous sûr de vouloir supprimer{" "}
                  <span className="font-semibold text-gray-900">
                    {documentToDelete ? getDocumentDisplayName(documentToDelete) : ''}
                  </span>
                  ?
                  <br />
                  <span className="text-red-600 font-medium mt-2 block">
                    Cette action est irréversible.
                  </span>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:flex-row gap-3 mt-2">
            <AlertDialogCancel className="flex-1 sm:flex-initial">
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDocument}
              className="flex-1 sm:flex-initial bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Supprimer définitivement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de renommage */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Renommer le document</DialogTitle>
            <DialogDescription>
              Entrez un nouveau nom pour ce document
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newDisplayName}
              onChange={(e) => setNewDisplayName(e.target.value)}
              placeholder="Nom du document"
              className="w-full"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleRenameDocument()
                }
              }}
            />
            {documentToRename && documentToRename.display_name !== documentToRename.file_name && (
              <p className="text-xs text-gray-500 mt-2">
                Nom original : {documentToRename.file_name}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRenameDialogOpen(false)
                setDocumentToRename(null)
                setNewDisplayName("")
                // Si le document vient d'être uploadé, recharger les données même si on annule
                if (documentToRename && !documentToRename.display_name) {
                  loadData()
                }
              }}
            >
              Annuler
            </Button>
            <Button
              onClick={handleRenameDocument}
              disabled={!newDisplayName.trim()}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
            >
              <Check className="h-4 w-4 mr-2" />
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </>
  )
}
