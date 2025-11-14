import React from 'react'
import ChatPageClient from './page.client'

// Nécessaire pour l'export statique avec routes dynamiques
export function generateStaticParams() {
  return []
}

export default function ChatPage() {
  return <ChatPageClient />
}

