import React from 'react'
import SuiviPageClient from './page.client'

// Nécessaire pour l'export statique avec routes dynamiques
export function generateStaticParams() {
  return []
}

export default function SuiviPage() {
  return <SuiviPageClient />
}

