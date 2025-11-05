"use client"

import { useRouter } from 'next/navigation'
import { AlertCircle, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function AuthCodeErrorPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <AlertCircle className="h-6 w-6 text-red-600" />
            <CardTitle>Erreur de confirmation</CardTitle>
          </div>
          <CardDescription>
            Impossible de confirmer votre email
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            Le lien de confirmation est invalide ou a expiré. Cela peut arriver si :
          </p>
          <ul className="list-disc list-inside text-sm text-gray-600 space-y-1 ml-2">
            <li>Le lien a déjà été utilisé</li>
            <li>Le lien a expiré (valide 24h)</li>
            <li>Le lien est incorrect ou incomplet</li>
          </ul>
          <div className="pt-4 space-y-2">
            <Button
              onClick={() => router.push('/login')}
              className="w-full"
            >
              Retour à la connexion
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/')}
              className="w-full"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour à l'accueil
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

