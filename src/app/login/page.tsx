"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Wrench } from "lucide-react"
import { useAuth } from "@/lib/hooks/use-auth"
import { LoginForm } from "@/components/auth/LoginForm"
import { RegisterForm } from "@/components/auth/RegisterForm"

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true)
  const router = useRouter()
  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      router.push("/")
    }
  }, [user, router])

  // Exposer setIsLogin pour permettre la navigation depuis RegisterForm
  const handleSwitchToLogin = () => {
    setIsLogin(true)
  }

  return (
    <div className="h-full w-full bg-gradient-to-br from-blue-600 via-blue-500 to-purple-600 flex items-center justify-center p-4 safe-area-all overflow-y-auto">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Wrench className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">CarsLink</h1>
          <p className="text-blue-100">
            {isLogin ? "Connectez-vous à votre compte" : "Créez votre compte"}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl p-8 shadow-2xl">
          {/* Tabs */}
          <div className="flex mb-6 border-b border-gray-200">
            <button
              type="button"
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-3 text-center font-medium transition-colors ${
                isLogin
                  ? "text-black border-b-2 border-black"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              Connexion
            </button>
            <button
              type="button"
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-3 text-center font-medium transition-colors ${
                !isLogin
                  ? "text-black border-b-2 border-black"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              Inscription
            </button>
          </div>

          {/* Form */}
          {isLogin ? (
            <LoginForm />
          ) : (
            <RegisterForm onSwitchToLogin={() => setIsLogin(true)} />
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-white/80 text-sm mt-6">
          © 2024 CarsLink. Tous droits réservés.
        </p>
      </div>
    </div>
  )
}

