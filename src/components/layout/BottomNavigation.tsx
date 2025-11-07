"use client"

import { Home as HomeIcon, Calendar, User } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

export function BottomNavigation() {
  const pathname = usePathname()
  const router = useRouter()

  const navItems = [
    { icon: HomeIcon, path: "/" },
    { icon: Calendar, path: "/appointments" },
    { icon: User, path: "/profile" },
  ]

  // Vérifier si la route actuelle correspond (avec gestion des sous-routes)
  const isActive = (path: string) => {
    if (path === "/") {
      return pathname === "/"
    }
    return pathname.startsWith(path)
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 w-full bg-white/95 backdrop-blur-md border-t border-gray-200 px-4 sm:px-6 py-3 sm:py-4 shadow-lg z-50 safe-area-bottom">
      <div className="flex items-center justify-around max-w-[428px] mx-auto">
        {navItems.map((item, index) => {
          const Icon = item.icon
          const active = isActive(item.path)

          return (
            <motion.button
              key={item.path}
              onClick={() => router.push(item.path)}
              className="relative flex items-center justify-center"
              whileTap={{ scale: 0.9 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="relative p-2.5 sm:p-3 rounded-full transition-all duration-200">
                {active && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
                <Icon
                  className={cn(
                    "relative h-5 w-5 sm:h-6 sm:w-6 z-10 transition-all duration-200",
                    active ? "text-white" : "text-gray-400"
                  )}
                />
              </div>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}

