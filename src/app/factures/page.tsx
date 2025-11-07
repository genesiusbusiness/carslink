"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { FileText, Download, CheckCircle, Clock, XCircle, ArrowLeft } from "lucide-react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BottomNavigation } from "@/components/layout/BottomNavigation"
import { useAuth } from "@/lib/hooks/use-auth"
import { supabase } from "@/lib/supabase/client"
import { formatDate, formatCurrency } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"
import type { Invoice } from "@/lib/types/database"

export default function FacturesPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Attendre que l'auth soit vérifiée
    if (authLoading) {
      return
    }

    if (!user) {
      router.push("/login")
      return
    }

    loadInvoices()
  }, [user, router, authLoading])

  const loadInvoices = async () => {
    if (!user) return
    
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("flynesis_user_id", user.id)
        .order("created_at", { ascending: false })

      if (error) {
        toast({
          title: "Erreur",
          description: "Erreur lors du chargement des factures",
          variant: "destructive",
        })
      } else if (data) {
        setInvoices(data)
      }
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Erreur lors du chargement des factures",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async (invoice: Invoice) => {
    if (invoice.pdf_url) {
      window.open(invoice.pdf_url, "_blank")
    } else {
      // Generate PDF (placeholder)
      alert("Génération du PDF en cours...")
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "paid":
        return (<CheckCircle className="h-4 w-4 text-green-600" />)
      case "pending":
        return (<Clock className="h-4 w-4 text-yellow-600" />)
      case "refunded":
        return (<XCircle className="h-4 w-4 text-red-600" />)
      default:
        return null
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "paid":
        return "Payée"
      case "pending":
        return "En attente"
      case "refunded":
        return "Remboursée"
      default:
        return status
    }
  }

  // Afficher le chargement pendant la vérification d'auth ou le chargement des données
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-600 mb-2">Chargement des factures...</div>
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
                <h1 className="text-2xl font-light text-gray-900">Mes factures</h1>
                <p className="text-sm text-gray-500 font-light mt-1">
                  {invoices.length} facture{invoices.length > 1 ? "s" : ""}
                </p>
              </div>
            </div>
          </div>

          {/* Contenu */}
          <div className="px-4 sm:px-6 py-6 sm:py-8 pb-28 sm:pb-32 bg-white/30 backdrop-blur-sm">
          {invoices.length > 0 ? (
            <div className="space-y-3">
              {invoices.map((invoice) => (
                <motion.div
                  key={invoice.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="mb-4"
                >
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/10 to-blue-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="relative bg-white/60 backdrop-blur-xl border border-white/40 rounded-2xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.08)] group-hover:shadow-[0_12px_40px_rgba(59,130,246,0.2)] group-hover:border-blue-300/50 transition-all duration-300">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <FileText className="h-5 w-5 text-gray-400" />
                            <h3 className="font-light text-gray-900">
                              Facture #{invoice.id.slice(0, 8)}
                            </h3>
                          </div>
                          <div className="text-sm text-gray-500 font-light">
                            {invoice.created_at ? formatDate(invoice.created_at) : 'N/A'}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <div className="text-lg font-light text-gray-900">
                            {invoice.total_amount ? formatCurrency(invoice.total_amount) : 'N/A'}
                          </div>
                          <Badge
                            variant={
                              invoice.status === "paid"
                                ? "default"
                                : invoice.status === "pending"
                                ? "secondary"
                                : "destructive"
                            }
                            className="flex items-center gap-1"
                          >
                            {invoice.status && getStatusIcon(invoice.status)}
                            {invoice.status && getStatusLabel(invoice.status)}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-3 border-t border-gray-100">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 rounded-xl"
                          onClick={() => handleDownload(invoice)}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Télécharger
                        </Button>
                        {invoice.status === "pending" && (
                          <Button
                            size="sm"
                            className="flex-1 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600"
                            onClick={() => router.push(`/payment?invoice=${invoice.id}`)}
                          >
                            Payer
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="relative border-2 border-dashed border-white/60 rounded-2xl p-12 text-center bg-white/40 backdrop-blur-md">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-light text-gray-900 mb-2">
                Aucune facture
              </h3>
              <p className="text-gray-500 font-light">
                Vos factures apparaîtront ici après vos rendez-vous
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

