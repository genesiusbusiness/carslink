"use client"

import React from 'react'
import { AlertCircle, Mail, Shield, CheckCircle2, XCircle } from 'lucide-react'
import { toast } from './use-toast'
import { ToastAction, type ToastActionElement } from './toast'

type ToastVariant = 'success' | 'error' | 'info' | 'warning'

interface ElegantToastOptions {
  title: string
  message?: string
  subMessage?: string
  variant?: ToastVariant
  action?: ToastActionElement
}

export function showElegantToast(options: ElegantToastOptions) {
  const { title, message, subMessage, variant = 'info', action } = options
  
  toast({
    title,
    description: message || subMessage,
    variant: variant === 'error' ? 'destructive' : variant === 'success' ? 'default' : 'default',
    action,
  })
}

// Helpers spécifiques pour différents types de messages
export const elegantToasts = {
  accountNotFound: () => showElegantToast({
    title: 'Compte introuvable',
    message: 'Aucun compte n\'a été trouvé avec cet email.',
    subMessage: 'Vérifiez votre adresse email ou créez un nouveau compte.',
    variant: 'error',
  }),
  
  loginSuccess: () => showElegantToast({
    title: 'Connexion réussie',
    message: 'Vous êtes maintenant connecté.',
    variant: 'success',
  }),
  
  wrongPassword: () => showElegantToast({
    title: 'Mot de passe incorrect',
    message: 'Le mot de passe que vous avez saisi est incorrect.',
    subMessage: 'Veuillez réessayer.',
    variant: 'error',
  }),
  
  emailNotConfirmed: (onConfirm?: () => void, confirming?: boolean) => showElegantToast({
    title: 'Email non confirmé',
    message: 'Votre email n\'a pas encore été confirmé.',
    subMessage: confirming ? 'Confirmation en cours...' : 'Cliquez pour confirmer automatiquement.',
    variant: 'warning',
    action: onConfirm && !confirming ? (
      <ToastAction altText="Confirmer" onClick={onConfirm}>
        Confirmer
      </ToastAction>
    ) : undefined,
  }),
  
  tooManyRequests: () => showElegantToast({
    title: 'Trop de tentatives',
    message: 'Vous avez effectué trop de tentatives de connexion.',
    subMessage: 'Veuillez patienter quelques minutes avant de réessayer.',
    variant: 'error',
  }),
  
  connectionError: () => showElegantToast({
    title: 'Erreur de connexion',
    message: 'Une erreur est survenue lors de la connexion.',
    subMessage: 'Veuillez réessayer plus tard.',
    variant: 'error',
  }),
  
  comingSoon: () => showElegantToast({
    title: 'Bientôt disponible',
    message: 'Cette fonctionnalité sera bientôt disponible.',
    variant: 'info',
  }),
}
