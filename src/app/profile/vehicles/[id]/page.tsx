import EditVehiclePageClient from './page.client'

// Nécessaire pour l'export statique avec routes dynamiques
export function generateStaticParams() {
  return []
}

export default function EditVehiclePage() {
  return <EditVehiclePageClient />
}

