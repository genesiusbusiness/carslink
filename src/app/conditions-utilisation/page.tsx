"use client"

import { ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

export default function ConditionsUtilisationPage() {
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
          <h1 className="text-3xl font-light text-gray-900 mb-2">Conditions Générales d'Utilisation</h1>
          <p className="text-sm text-gray-500 mb-8">Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}</p>

          <section className="space-y-4">
            <h2 className="text-xl font-medium text-gray-900">1. Objet</h2>
            <div className="text-sm text-gray-700 space-y-2">
              <p>
                Les présentes Conditions Générales d'Utilisation (ci-après "CGU") ont pour objet de définir les conditions 
                et modalités d'utilisation de la plateforme CarsLink (ci-après "la Plateforme") éditée par Flynesis SAS.
              </p>
              <p>
                L'utilisation de la Plateforme implique l'acceptation pleine et entière des présentes CGU. 
                Si vous n'acceptez pas ces conditions, vous ne devez pas utiliser la Plateforme.
              </p>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-medium text-gray-900">2. Acceptation des CGU</h2>
            <div className="text-sm text-gray-700 space-y-2">
              <p>
                En accédant et en utilisant la Plateforme, vous reconnaissez avoir lu, compris et accepté les présentes CGU. 
                Ces conditions s'appliquent à tous les utilisateurs de la Plateforme, y compris les visiteurs, les clients et les garages partenaires.
              </p>
              <p className="font-semibold text-gray-900">
                L'utilisation de la Plateforme est autorisée aux personnes âgées d'au moins 14 ans. 
                En utilisant la Plateforme, vous déclarez et garantissez que vous avez au moins 14 ans.
              </p>
              <p className="text-sm text-gray-700 mt-2">
                <strong>Utilisateurs mineurs (14-17 ans) :</strong> Les mineurs de moins de 18 ans peuvent utiliser la Plateforme, 
                notamment l'assistant IA de pré-diagnostic et consulter les informations disponibles. 
                Cependant, pour effectuer des réservations de rendez-vous ou toute transaction nécessitant un engagement contractuel, 
                l'autorisation et la présence d'un parent ou tuteur légal sont requises. 
                Les mineurs reconnaissent qu'ils utilisent la Plateforme sous la responsabilité de leurs parents ou tuteurs légaux.
              </p>
              <p>
                Flynesis SAS se réserve le droit de modifier les présentes CGU à tout moment. 
                Les modifications entrent en vigueur dès leur publication sur la Plateforme. 
                Il est de votre responsabilité de consulter régulièrement les CGU.
              </p>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-medium text-gray-900">3. Description du service</h2>
            <div className="text-sm text-gray-700 space-y-2">
              <p>
                <strong>CarsLink est une plateforme de booking et de mise en relation</strong> entre les propriétaires de véhicules 
                et les garages automobiles indépendants. Flynesis SAS agit exclusivement en tant qu'intermédiaire technique 
                et n'intervient pas dans l'exécution des prestations réalisées par les garages.
              </p>
              <p>
                La Plateforme propose notamment :
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Un service de recherche et de réservation de rendez-vous auprès de garages partenaires indépendants</li>
                <li>Un assistant IA de pré-diagnostic automobile (service en version BETA, à titre indicatif uniquement)</li>
                <li>Un suivi des rendez-vous et des interventions</li>
                <li>Un historique des factures et des entretiens</li>
                <li>Un système de notifications et de communication</li>
              </ul>
              <p className="mt-4 font-semibold text-gray-900">
                ⚠️ IMPORTANT : Flynesis SAS n'est pas un prestataire de services automobiles. 
                La Plateforme se contente de mettre en relation les utilisateurs avec des garages indépendants. 
                Toute prestation réalisée par un garage partenaire est sous la seule responsabilité de ce garage.
              </p>
              <p className="mt-4">
                <strong>Assistant IA :</strong> L'assistant IA de pré-diagnostic est fourni à titre indicatif uniquement. 
                Il ne remplace pas l'expertise d'un professionnel et ne constitue pas un diagnostic définitif. 
                Le diagnostic final doit être effectué par un garagiste qualifié lors de votre rendez-vous.
              </p>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-medium text-gray-900">4. Inscription et compte utilisateur</h2>
            <div className="text-sm text-gray-700 space-y-2">
              <p>
                Pour utiliser certains services de la Plateforme, vous devez créer un compte utilisateur. 
                Vous vous engagez à :
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Fournir des informations exactes, complètes et à jour</li>
                <li>Maintenir la sécurité de votre compte et de votre mot de passe</li>
                <li>Notifier immédiatement toute utilisation non autorisée de votre compte</li>
                <li>Être responsable de toutes les activités effectuées sous votre compte</li>
              </ul>
              <p>
                Vous pouvez supprimer votre compte à tout moment depuis les paramètres de votre profil.
              </p>
              
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Compte FlyID</h3>
                <p className="text-sm text-gray-700">
                  Votre compte CarsLink est lié à votre compte FlyID (Flynesis ID), qui est votre identifiant unique 
                  pour l'ensemble des services Flynesis. En créant un compte sur CarsLink, vous acceptez également 
                  les conditions d'utilisation du compte FlyID et des services Flynesis.
                </p>
                <p className="text-sm text-gray-700 mt-2">
                  Le compte FlyID vous permet d'accéder à plusieurs services de l'écosystème Flynesis. 
                  La gestion de votre compte FlyID se fait via la plateforme Flynesis Account accessible 
                  depuis les paramètres de votre profil CarsLink.
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-medium text-gray-900">5. Utilisation de la Plateforme</h2>
            <div className="text-sm text-gray-700 space-y-2">
              <p>Vous vous engagez à utiliser la Plateforme de manière licite et conformément aux présentes CGU. Il est notamment interdit de :</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Utiliser la Plateforme à des fins illégales ou frauduleuses</li>
                <li>Perturber le fonctionnement de la Plateforme ou des serveurs</li>
                <li>Tenter d'accéder de manière non autorisée à la Plateforme ou à des comptes d'autres utilisateurs</li>
                <li>Transmettre des virus, chevaux de Troie ou tout autre code malveillant</li>
                <li>Collecter ou utiliser des données d'autres utilisateurs sans autorisation</li>
                <li>Reproduire, copier ou revendre tout ou partie de la Plateforme</li>
                <li>Utiliser des robots, scripts ou autres moyens automatisés pour accéder à la Plateforme</li>
              </ul>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-medium text-gray-900">6. Réservations et rendez-vous</h2>
            <div className="text-sm text-gray-700 space-y-2">
              <p>
                La Plateforme vous permet de réserver des rendez-vous auprès de garages partenaires indépendants. 
                <strong className="font-semibold"> Flynesis SAS agit uniquement en tant qu'intermédiaire technique de booking et </strong>
                ne participe pas à l'exécution des prestations.
              </p>
              <p className="font-semibold text-gray-900 mt-3">
                ⚠️ EXCLUSION DE RESPONSABILITÉ IMPORTANTE :
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>La réservation est soumise à confirmation par le garage partenaire indépendant</li>
                <li>Vous êtes responsable de respecter les horaires de rendez-vous convenus</li>
                <li>En cas d'annulation, vous devez respecter les délais et conditions d'annulation du garage partenaire</li>
                <li>Les tarifs, conditions de service, garanties et délais sont définis UNIQUEMENT par chaque garage partenaire</li>
                <li><strong>Flynesis SAS n'est en AUCUN CAS responsable des prestations réalisées par les garages partenaires</strong></li>
                <li><strong>Flynesis SAS n'est pas responsable de la qualité, de la conformité ou de l'exécution des services automobiles</strong></li>
                <li><strong>Flynesis SAS n'est pas responsable des dommages causés à votre véhicule par un garage partenaire</strong></li>
                <li><strong>Flynesis SAS n'est pas responsable des retards, annulations ou modifications de rendez-vous par les garages</strong></li>
                <li>Tout litige concernant une prestation doit être réglé directement entre vous et le garage partenaire concerné</li>
                <li>Flynesis SAS se réserve le droit de retirer un garage partenaire de la Plateforme sans préavis</li>
              </ul>
              <p className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <strong>En réservant un rendez-vous via CarsLink, vous reconnaissez que la relation contractuelle 
                est établie directement entre vous et le garage partenaire, et non avec Flynesis SAS.</strong>
              </p>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-medium text-gray-900">7. Assistant IA de pré-diagnostic</h2>
            <div className="text-sm text-gray-700 space-y-2">
              <p>
                L'assistant IA de pré-diagnostic est un service en version BETA fourni à titre indicatif. 
                Vous reconnaissez et acceptez que :
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Le diagnostic fourni par l'IA est indicatif et ne constitue pas un diagnostic professionnel</li>
                <li>Le diagnostic final doit être effectué par un garagiste qualifié</li>
                <li>Flynesis SAS ne peut être tenu responsable des conséquences d'un diagnostic erroné de l'IA</li>
                <li>Le service peut être interrompu ou modifié à tout moment</li>
                <li>Les conversations de diagnostic sont conservées pendant 15 jours puis supprimées automatiquement</li>
              </ul>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-medium text-gray-900">8. Propriété intellectuelle</h2>
            <div className="text-sm text-gray-700 space-y-2">
              <p>
                La Plateforme et l'ensemble de son contenu (textes, images, logos, icônes, graphismes, etc.) 
                sont la propriété exclusive de Flynesis SAS ou de ses partenaires et sont protégés par les lois françaises 
                et internationales relatives à la propriété intellectuelle.
              </p>
              <p>
                Toute reproduction, représentation, modification, publication ou adaptation de tout ou partie des éléments 
                de la Plateforme est interdite sans autorisation écrite préalable de Flynesis SAS.
              </p>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-medium text-gray-900">9. Disponibilité du service</h2>
            <div className="text-sm text-gray-700 space-y-2">
              <p>
                Flynesis SAS s'efforce d'assurer une disponibilité continue de la Plateforme. 
                Cependant, la Plateforme peut être temporairement indisponible pour des raisons de maintenance, 
                de mise à jour ou en cas de force majeure.
              </p>
              <p>
                Flynesis SAS ne peut garantir une disponibilité absolue et ne saurait être tenu responsable 
                des dommages résultant d'une indisponibilité temporaire de la Plateforme.
              </p>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-medium text-gray-900">10. Limitation de responsabilité</h2>
            <div className="text-sm text-gray-700 space-y-2">
              <p className="font-semibold text-gray-900">
                Flynesis SAS agit EXCLUSIVEMENT en tant qu'intermédiaire technique de booking et de mise en relation. 
                La Plateforme CarsLink est un simple outil de réservation en ligne et ne fournit aucun service automobile.
              </p>
              
              <p className="mt-3 font-semibold text-red-700">
                EXCLUSION TOTALE DE RESPONSABILITÉ CONCERNANT LES GARAGES PARTENAIRES :
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4 font-medium">
                <li>Flynesis SAS n'est en AUCUN CAS responsable des prestations réalisées par les garages partenaires</li>
                <li>Flynesis SAS n'est pas responsable de la qualité, conformité, sécurité ou exécution des services automobiles</li>
                <li>Flynesis SAS n'est pas responsable des dommages causés à votre véhicule par un garage partenaire</li>
                <li>Flynesis SAS n'est pas responsable des erreurs de diagnostic, réparations incorrectes ou malfaçons</li>
                <li>Flynesis SAS n'est pas responsable des retards, annulations, modifications de rendez-vous ou indisponibilités des garages</li>
                <li>Flynesis SAS n'est pas responsable des tarifs, facturations ou litiges financiers avec les garages</li>
                <li>Flynesis SAS n'est pas responsable des garanties offertes par les garages (garantie constructeur, garantie pièces, etc.)</li>
                <li>Flynesis SAS n'est pas responsable des informations erronées, incomplètes ou obsolètes fournies par les garages</li>
                <li>Tout litige concernant une prestation doit être réglé directement entre vous et le garage partenaire concerné</li>
              </ul>

              <p className="mt-3 font-semibold text-gray-900">
                AUTRES EXCLUSIONS DE RESPONSABILITÉ :
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Des dommages directs, indirects, accessoires ou consécutifs (perte de données, perte de clientèle, perte de revenus, etc.)</li>
                <li>Des actes de tiers, cas de force majeure, ou événements indépendants de la volonté de Flynesis SAS</li>
                <li>Des diagnostics erronés, incomplets ou imprécis fournis par l'assistant IA (service BETA)</li>
                <li>Des interruptions, dysfonctionnements ou indisponibilités temporaires de la Plateforme</li>
                <li>Des pertes de données, erreurs techniques ou bugs affectant la Plateforme</li>
                <li>Des conséquences de l'utilisation ou de l'impossibilité d'utiliser la Plateforme</li>
                <li>Des dommages résultant d'une utilisation non conforme de la Plateforme</li>
              </ul>

              <p className="mt-4 p-4 bg-red-50 border-2 border-red-300 rounded-lg font-semibold text-red-900">
                ⚠️ EN UTILISANT LA PLATEFORME CARSLINK, VOUS RECONNAISSEZ ET ACCEPTEZ QUE FLYNESIS SAS N'EST EN AUCUN CAS 
                RESPONSABLE DES PRESTATIONS RÉALISÉES PAR LES GARAGES PARTENAIRES. LA RELATION CONTRACTUELLE EST ÉTABLIE 
                UNIQUEMENT ENTRE VOUS ET LE GARAGE PARTENAIRE.
              </p>

              <p className="mt-3">
                Dans la mesure permise par la loi applicable, la responsabilité totale de Flynesis SAS, 
                quel que soit le fondement juridique, est limitée au montant des commissions perçues par Flynesis SAS 
                au titre de la réservation concernée, et en aucun cas ne pourra excéder 100 euros.
              </p>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-medium text-gray-900">11. Protection des données personnelles</h2>
            <div className="text-sm text-gray-700 space-y-2">
              <p>
                Le traitement de vos données personnelles est régi par notre Politique de Confidentialité, 
                qui fait partie intégrante des présentes CGU. 
                En utilisant la Plateforme, vous acceptez le traitement de vos données conformément à cette politique.
              </p>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-medium text-gray-900">12. Résiliation</h2>
            <div className="text-sm text-gray-700 space-y-2">
              <p>
                Vous pouvez résilier votre compte à tout moment depuis les paramètres de votre profil. 
                La résiliation entraîne la suppression de vos données personnelles conformément à notre Politique de Confidentialité.
              </p>
              <p>
                Flynesis SAS se réserve le droit de suspendre ou résilier votre compte en cas de violation des présentes CGU, 
                sans préavis ni remboursement.
              </p>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-medium text-gray-900">13. Droit applicable et juridiction</h2>
            <div className="text-sm text-gray-700 space-y-2">
              <p>
                Les présentes CGU sont régies par le droit français. 
                En cas de litige et à défaut d'accord amiable, le litige sera porté devant les tribunaux français 
                conformément aux règles de compétence en vigueur.
              </p>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-medium text-gray-900">14. Contact</h2>
            <div className="text-sm text-gray-700 space-y-2">
              <p>Pour toute question concernant les présentes CGU :</p>
              <p><strong>Email :</strong> contact@flynesis.com</p>
              <p><strong>Adresse postale :</strong> Flynesis SAS, Paris, France</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

