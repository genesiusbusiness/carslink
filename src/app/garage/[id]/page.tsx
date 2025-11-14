import React from 'react'
import GarageDetailPageClient from './page.client'

// Nécessaire pour l'export statique avec routes dynamiques
export function generateStaticParams() {
  return []
}

export default function GarageDetailPage() {
  return <GarageDetailPageClient />
}

