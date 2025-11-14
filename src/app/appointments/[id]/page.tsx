import React from 'react'

// Nécessaire pour l'export statique avec routes dynamiques
export function generateStaticParams() {
  return []
}

export default function AppointmentPage() {
  // Cette page ne devrait pas être accessible directement
  // Elle existe uniquement pour satisfaire Next.js
  return <div></div>
}

