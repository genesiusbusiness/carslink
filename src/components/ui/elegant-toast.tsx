"use client"

import React from 'react'
import { AlertCircle, Mail, Shield, CheckCircle2, XCircle } from 'lucide-react'
import { toast } from './use-toast'
import { ToastAction, type ToastActionElement } from './toast'

type ToastVariant = 'success' | 'error' | 'info' | 'warning'

interface ElegantToastOptions {
  title: string
  message: string
  subMessage?: string
  variant?: ToastVariant
  action?: ToastActionElement
}

const iconMap = {
  success: CheckCircle2,
  error: XCircle,
  info: Mail,
  warning: AlertCircle,
}

const iconColorMap = {
  success: 'text-green-600',
  error: 'text-red-600',
  info: 'text-blue-600',
  warning: 'text-orange-600',
}

export function showElegantToast({
  title,
  message,
  subMessage,
  variant = 'error',
  action,
}: ElegantToastOptions) {
  const Icon = iconMap[variant]
  const iconColor = iconColorMap[variant]
  
  const isError = variant === 'error'
  
  toast({
    title: (
      <div className="flex items-center gap-2.5">
        <Icon className={`h-5 w-5 ${iconColor} flex-shrink-0`} />
        <span className="font-semibold">{title}</span>
      </div>
    ) as any,
    description: (
      <div className="space-y-1.5 mt-1.5">
        <p className="text-sm leading-relaxed text-gray-800 font-medium">{message}</p>
        {subMessage && (
          <p className="text-xs leading-relaxed text-gray-600 italic font-normal">
            {subMessage}
          </p>
        )}
      </div>
    ) as any,
    variant: isError ? 'destructive' : 'default',
    action,
  })
}

// Helpers spécifiques pour différents types de messages
export const elegantToasts = {
  accountNotFound: () => showElegantToast({
    title: 'Compte introuvable',
    message: 'Nous n\'avons trouvé aucun compte FlyID associé à cette adresse email.',
    subMessage: 'Veuillez vérifier votre saisie ou créer un nouveau compte.',
    variant: 'error',
  }),

  wrongPassword: () => showElegantToast({
    title: 'Authentification échouée',
    message: 'Le mot de passe saisi est incorrect.',
    subMessage: 'Vérifiez votre saisie ou utilisez la réinitialisation de mot de passe.',
    variant: 'error',
  }),

  emailNotConfirmed: (onConfirm?: () => void, isConfirming?: boolean) => showElegantToast({
    title: 'Confirmation requise',
    message: 'Votre compte nécessite une confirmation de votre adresse email.',
    subMessage: 'Cliquez sur le bouton ci-contre pour confirmer automatiquement votre compte.',
    variant: 'warning',
    action: onConfirm ? (
      <ToastAction
        altText="Confirmer automatiquement l'email"
        onClick={onConfirm}
        disabled={isConfirming}
        className="bg-gradient-to-r from-blue-600 to-blue-500 text-white px-4 py-2 rounded-xl font-medium hover:from-blue-700 hover:to-blue-600 transition-all shadow-sm text-sm disabled:opacity-50 disabled:cursor-not-allowed border-0"
      >
        {isConfirming ? 'Confirmation...' : 'Confirmer'}
      </ToastAction>
    ) : undefined,
  }),

  tooManyRequests: () => showElegantToast({
    title: 'Trop de tentatives',
    message: 'Trop de tentatives de connexion ont été effectuées.',
    subMessage: 'Veuillez patienter quelques instants avant de réessayer.',
    variant: 'warning',
  }),

  connectionError: () => showElegantToast({
    title: 'Problème de connexion',
    message: 'Une erreur inattendue s\'est produite lors de la connexion.',
    subMessage: 'Veuillez réessayer dans quelques instants.',
    variant: 'error',
  }),

  loginSuccess: () => showElegantToast({
    title: 'Connexion réussie',
    message: 'Bienvenue ! Vous êtes maintenant connecté à votre compte CarsLink.',
    variant: 'success',
  }),

  comingSoon: () => showElegantToast({
    title: 'Fonctionnalité à venir',
    message: 'Cette fonctionnalité sera disponible prochainement.',
    subMessage: 'Merci de votre patience.',
    variant: 'info',
  }),
}

