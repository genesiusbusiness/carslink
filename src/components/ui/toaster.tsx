"use client"

import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { useToast } from "@/components/ui/use-toast"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider swipeDirection="right">
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="flex-1 grid gap-1.5">
              {title && (
                typeof title === 'string' ? (
                  <ToastTitle>{title}</ToastTitle>
                ) : (
                  <div className="text-base font-semibold tracking-tight text-gray-900">{title}</div>
                )
              )}
              {description && (
                typeof description === 'string' ? (
                  <ToastDescription>{description}</ToastDescription>
                ) : (
                  <div className="text-sm leading-relaxed text-gray-600 mt-1">{description}</div>
                )
              )}
            </div>
            {action && <div className="flex-shrink-0">{action}</div>}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}

