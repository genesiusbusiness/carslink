"use client"

import { ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

export default function MentionsLegalesPage() {
  const router = useRouter()

  return (
    <div className="fixed inset-0 w-full h-full overflow-y-auto bg-gradient-to-br from-blue-50/40 via-white to-purple-50/20">
      <div className="max-w-4xl mx-auto px-4 py-8 pb-16">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="mb-6"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <div className="bg-white/60 backdrop-blur-sm rounded-lg shadow-sm border border-white/40 p-8 space-y-8">
          <h1 className="text-3xl font-light text-gray-900 mb-2">Mentions Légales</h1>
          <p className="text-sm text-gray-500 mb-8">Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}</p>

          <section className="space-y-4">
            <h2 className="text-xl font-medium text-gray-900">1. Informations sur l'éditeur</h2>
            <div className="text-sm text-gray-700 space-y-2">
              <p><strong>Dénomination sociale :</strong> Flynesis SAS</p>
              <p><strong>Adresse :</strong> Paris, France</p>
              <p><strong>Email :</strong> contact@flynesis.com</p>
              <p>
                Pour toute information complémentaire, veuillez nous contacter à l'adresse email ci-dessus.
              </p>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-medium text-gray-900">2. Hébergement des données</h2>
            <div className="text-sm text-gray-700 space-y-2">
              <p><strong>Hébergeur des données :</strong> Supabase</p>
              <p>
                Les données de la plateforme CarsLink sont hébergées par Supabase. 
                Pour plus d'informations concernant l'hébergement, veuillez nous contacter à contact@flynesis.com.
              </p>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-medium text-gray-900">3. Propriété intellectuelle</h2>
            <div className="text-sm text-gray-700 space-y-2">
              <p>
                L'ensemble de ce site relève de la législation française et internationale sur le droit d'auteur et la propriété intellectuelle. 
                Tous les droits de reproduction sont réservés, y compris pour les documents téléchargeables et les représentations iconographiques et photographiques.
              </p>
              <p>
                La reproduction de tout ou partie de ce site sur un support électronique ou autre est formellement interdite sauf autorisation expresse de l'éditeur.
              </p>
              <p>
                Les marques, logos, signes distinctifs et tout autre contenu du site sont la propriété exclusive de Flynesis SAS ou de ses partenaires.
              </p>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-medium text-gray-900">4. Responsabilité</h2>
            <div className="text-sm text-gray-700 space-y-2">
              <p>
                Les informations contenues sur ce site sont aussi précises que possible et le site est périodiquement remis à jour, 
                mais peut toutefois contenir des inexactitudes, des omissions ou des lacunes.
              </p>
              <p>
                Flynesis SAS ne pourra être tenu responsable des dommages directs et indirects causés au matériel de l'utilisateur, 
                lors de l'accès au site, et résultant soit de l'utilisation d'un matériel ne répondant pas aux spécifications, 
                soit de l'apparition d'un bug ou d'une incompatibilité.
              </p>
              <p>
                Flynesis SAS ne pourra également être tenu responsable des dommages indirects consécutifs à l'utilisation du site.
              </p>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-medium text-gray-900">5. Liens hypertextes</h2>
            <div className="text-sm text-gray-700 space-y-2">
              <p>
                Le site peut contenir des liens hypertextes vers d'autres sites présents sur le réseau Internet. 
                Les liens vers ces autres ressources vous font quitter le site CarsLink.
              </p>
              <p>
                Il est possible de créer un lien vers la page de présentation de ce site sans autorisation expresse de l'éditeur. 
                Aucune autorisation ni demande d'information préalable ne peut être exigée par l'éditeur à l'égard d'un site qui souhaite établir un lien vers le site de l'éditeur.
              </p>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-medium text-gray-900">6. Droit applicable</h2>
            <div className="text-sm text-gray-700 space-y-2">
              <p>
                Les présentes mentions légales sont régies par le droit français. 
                En cas de litige et à défaut d'accord amiable, le litige sera porté devant les tribunaux français conformément aux règles de compétence en vigueur.
              </p>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-medium text-gray-900">7. Contact</h2>
            <div className="text-sm text-gray-700 space-y-2">
              <p>
                Pour toute question concernant les présentes mentions légales, vous pouvez nous contacter à :
              </p>
              <p>
                <strong>Email :</strong> contact@flynesis.com
              </p>
              <p>
                <strong>Adresse :</strong> Paris, France
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

