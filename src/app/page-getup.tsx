"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

/**
 * Redirection vers GETUP! Brand Showcase
 * 
 * Cette page redirige automatiquement vers /getup-brand
 * Pour restaurer CarsLink, renommez ce fichier et restaurez page.tsx
 */
export default function HomePageRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/getup-brand")
  }, [router])

  return (
    <div className="min-h-screen bg-[#0B0B0D] flex items-center justify-center">
      <div className="text-center text-[#F5F7FA]">
        <p className="text-xl">Redirection vers GETUP!...</p>
      </div>
    </div>
  )
}

