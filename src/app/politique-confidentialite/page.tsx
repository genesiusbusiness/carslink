"use client"

import { ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

export default function PolitiqueConfidentialitePage() {
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
          <h1 className="text-3xl font-light text-gray-900 mb-2">Politique de Confidentialité</h1>
          <p className="text-sm text-gray-500 mb-8">Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}</p>

          <section className="space-y-4">
            <h2 className="text-xl font-medium text-gray-900">1. Introduction</h2>
            <div className="text-sm text-gray-700 space-y-2">
              <p>
                Flynesis SAS, éditeur de la plateforme CarsLink, s'engage à protéger la confidentialité et la sécurité des données personnelles 
                de ses utilisateurs conformément au Règlement Général sur la Protection des Données (RGPD) et à la loi Informatique et Libertés.
              </p>
              <p>
                La présente politique de confidentialité vous informe sur la manière dont nous collectons, utilisons, stockons et protégeons 
                vos données personnelles lorsque vous utilisez notre plateforme.
              </p>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-medium text-gray-900">2. Responsable du traitement</h2>
            <div className="text-sm text-gray-700 space-y-2">
              <p><strong>Responsable du traitement :</strong> Flynesis SAS</p>
              <p><strong>Adresse :</strong> Paris, France</p>
              <p><strong>Email :</strong> contact@flynesis.com</p>
              <p><strong>Délégué à la protection des données (DPO) :</strong> dpo@flynesis.com</p>
              <p>
                Pour toute information complémentaire, veuillez nous contacter à l'adresse email ci-dessus.
              </p>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-medium text-gray-900">3. Données collectées</h2>
            <div className="text-sm text-gray-700 space-y-2">
              <p>Nous collectons les données personnelles suivantes :</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><strong>Données d'identification :</strong> nom, prénom, adresse email, numéro de téléphone</li>
                <li><strong>Données de connexion :</strong> adresse IP, logs de connexion, identifiants de connexion</li>
                <li><strong>Données relatives aux véhicules :</strong> marque, modèle, année, plaque d'immatriculation, type de carburant</li>
                <li><strong>Données de navigation :</strong> pages visitées, durée de visite, préférences</li>
                <li><strong>Données de réservation :</strong> historique des rendez-vous, préférences de services</li>
                <li><strong>Données de communication :</strong> messages échangés via le chat IA, tickets de support</li>
              </ul>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-medium text-gray-900">4. Finalités du traitement</h2>
            <div className="text-sm text-gray-700 space-y-2">
              <p>Vos données personnelles sont traitées pour les finalités suivantes :</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Gestion de votre compte utilisateur et authentification</li>
                <li>Mise en relation avec les garages partenaires</li>
                <li>Gestion des réservations et rendez-vous</li>
                <li>Fourniture du service de diagnostic IA</li>
                <li>Amélioration de nos services et personnalisation de l'expérience utilisateur</li>
                <li>Envoi de communications commerciales (avec votre consentement)</li>
                <li>Respect de nos obligations légales et réglementaires</li>
                <li>Gestion des réclamations et du support client</li>
              </ul>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-medium text-gray-900">5. Base légale du traitement</h2>
            <div className="text-sm text-gray-700 space-y-2">
              <p>Le traitement de vos données personnelles est fondé sur :</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><strong>L'exécution d'un contrat :</strong> pour la fourniture de nos services</li>
                <li><strong>Votre consentement :</strong> pour les communications commerciales et certains cookies</li>
                <li><strong>Notre intérêt légitime :</strong> pour l'amélioration de nos services et la sécurité</li>
                <li><strong>Le respect d'une obligation légale :</strong> pour la conservation de certaines données</li>
              </ul>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-medium text-gray-900">6. Destinataires des données</h2>
            <div className="text-sm text-gray-700 space-y-2">
              <p>Vos données personnelles peuvent être communiquées aux destinataires suivants :</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Les garages partenaires avec lesquels vous prenez rendez-vous</li>
                <li>Nos prestataires techniques (hébergement, services cloud, analyse de données)</li>
                <li>Nos prestataires de paiement (pour le traitement des transactions)</li>
                <li>Les autorités compétentes en cas d'obligation légale</li>
              </ul>
              <p>
                Nous nous assurons que tous nos partenaires respectent la réglementation en vigueur en matière de protection des données.
              </p>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-medium text-gray-900">7. Hébergement des données</h2>
            <div className="text-sm text-gray-700 space-y-2">
              <p><strong>Hébergeur des données :</strong> Supabase</p>
              <p>
                Les données de la plateforme CarsLink sont hébergées par Supabase. 
                Pour plus d'informations concernant l'hébergement, veuillez nous contacter à contact@flynesis.com.
              </p>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-medium text-gray-900">8. Durée de conservation</h2>
            <div className="text-sm text-gray-700 space-y-2">
              <p>Vos données personnelles sont conservées pour les durées suivantes :</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><strong>Données de compte :</strong> pendant la durée de votre compte, puis 3 ans après sa fermeture</li>
                <li><strong>Données de réservation :</strong> 5 ans à compter de la dernière réservation (obligation comptable)</li>
                <li><strong>Données de connexion :</strong> 12 mois</li>
                <li><strong>Données de communication :</strong> 3 ans à compter de la dernière interaction</li>
                <li><strong>Données de diagnostic IA :</strong> 15 jours pour les conversations, puis suppression automatique</li>
              </ul>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-medium text-gray-900">9. Vos droits</h2>
            <div className="text-sm text-gray-700 space-y-2">
              <p>Conformément au RGPD, vous disposez des droits suivants :</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><strong>Droit d'accès :</strong> vous pouvez obtenir une copie de vos données personnelles</li>
                <li><strong>Droit de rectification :</strong> vous pouvez corriger vos données inexactes ou incomplètes</li>
                <li><strong>Droit à l'effacement :</strong> vous pouvez demander la suppression de vos données</li>
                <li><strong>Droit à la limitation :</strong> vous pouvez demander la limitation du traitement de vos données</li>
                <li><strong>Droit à la portabilité :</strong> vous pouvez récupérer vos données dans un format structuré</li>
                <li><strong>Droit d'opposition :</strong> vous pouvez vous opposer au traitement de vos données</li>
                <li><strong>Droit de retirer votre consentement :</strong> à tout moment pour les traitements basés sur le consentement</li>
              </ul>
              <p>
                Pour exercer vos droits, vous pouvez nous contacter à l'adresse : <strong>dpo@flynesis.com</strong>
              </p>
              <p>
                Vous avez également le droit d'introduire une réclamation auprès de la CNIL (Commission Nationale de l'Informatique et des Libertés) 
                si vous estimez que vos droits ne sont pas respectés.
              </p>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-medium text-gray-900">10. Sécurité des données</h2>
            <div className="text-sm text-gray-700 space-y-2">
              <p>
                Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données personnelles 
                contre tout accès non autorisé, perte, destruction ou altération.
              </p>
              <p>Ces mesures incluent notamment :</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Chiffrement des données sensibles</li>
                <li>Authentification sécurisée</li>
                <li>Surveillance et détection des intrusions</li>
                <li>Sauvegardes régulières</li>
                <li>Formation du personnel</li>
              </ul>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-medium text-gray-900">11. Cookies</h2>
            <div className="text-sm text-gray-700 space-y-2">
              <p>
                Notre site utilise des cookies pour améliorer votre expérience de navigation. 
                Vous pouvez gérer vos préférences de cookies dans les paramètres de votre navigateur.
              </p>
              <p>Pour plus d'informations, consultez notre politique de cookies.</p>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-medium text-gray-900">12. Transferts internationaux</h2>
            <div className="text-sm text-gray-700 space-y-2">
              <p>
                Vos données peuvent être transférées vers des pays situés en dehors de l'Union Européenne. 
                Dans ce cas, nous nous assurons que des garanties appropriées sont mises en place 
                (clauses contractuelles types, Privacy Shield, etc.).
              </p>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-medium text-gray-900">13. Modifications</h2>
            <div className="text-sm text-gray-700 space-y-2">
              <p>
                Nous nous réservons le droit de modifier la présente politique de confidentialité à tout moment. 
                Toute modification sera publiée sur cette page avec la date de mise à jour.
              </p>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-medium text-gray-900">14. Contact</h2>
            <div className="text-sm text-gray-700 space-y-2">
              <p>Pour toute question concernant cette politique de confidentialité :</p>
              <p><strong>Email :</strong> contact@flynesis.com</p>
              <p><strong>Email DPO :</strong> dpo@flynesis.com</p>
              <p><strong>Adresse :</strong> Paris, France</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

