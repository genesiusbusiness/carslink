"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Car } from "lucide-react"
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
    <div className="fixed inset-0 w-full h-full overflow-y-auto bg-gradient-to-br from-blue-600 via-blue-500 to-purple-600 flex items-start sm:items-center justify-center px-5 sm:px-6 py-8 sm:py-12 safe-area-all">
      <div className="w-full max-w-md mt-auto sm:mt-0 mb-auto sm:mb-0">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-10">
          <div className="flex justify-center mb-5 sm:mb-6">
            <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-full bg-white/25 backdrop-blur-md flex items-center justify-center shadow-xl ring-4 ring-white/20">
              <Car className="h-10 w-10 sm:h-12 sm:w-12 text-white" />
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3 sm:mb-4 tracking-tight">CarsLink</h1>
          <p className="text-base sm:text-lg text-blue-100/90 font-light">
            {isLogin ? "Connectez-vous à votre compte" : "Créez votre compte"}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl sm:rounded-[2rem] p-7 sm:p-9 md:p-12 shadow-2xl border border-white/50">
          {/* Tabs */}
          <div className="flex mb-7 sm:mb-9 border-b-2 border-gray-100">
            <button
              type="button"
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-4 sm:py-5 text-base sm:text-lg text-center font-semibold transition-all duration-200 relative ${
                isLogin
                  ? "text-black"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              Connexion
              {isLogin && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full"></span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-4 sm:py-5 text-base sm:text-lg text-center font-semibold transition-all duration-200 relative ${
                !isLogin
                  ? "text-black"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              Inscription
              {!isLogin && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full"></span>
              )}
            </button>
          </div>

          {/* Form */}
          <div className="min-h-[300px]">
            {isLogin ? (
              <LoginForm />
            ) : (
              <RegisterForm onSwitchToLogin={() => setIsLogin(true)} />
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-white/70 text-xs sm:text-sm mt-8 sm:mt-10 font-light">
          © 2024 CarsLink. Tous droits réservés.
        </p>
      </div>
    </div>
  )
}

