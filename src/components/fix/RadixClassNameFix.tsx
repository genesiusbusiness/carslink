"use client"

import { useEffect } from 'react'

/**
 * Fix pour le problème "className.split is not a function" avec Radix UI
 * 
 * Radix UI essaie d'utiliser el.className.split() mais className peut être
 * un DOMTokenList ou autre chose. Ce fix patche HTMLElement.prototype.className
 * pour qu'il retourne toujours une chaîne de caractères.
 */
export function RadixClassNameFix() {
  useEffect(() => {
    // Sauvegarder le descripteur original
    const originalDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'className') ||
      Object.getOwnPropertyDescriptor(Element.prototype, 'className')

    if (originalDescriptor) {
      // Patcher la propriété className pour qu'elle retourne toujours une chaîne
      Object.defineProperty(HTMLElement.prototype, 'className', {
        get: function() {
          // Si c'est déjà une chaîne, la retourner
          if (typeof originalDescriptor.get === 'function') {
            const value = originalDescriptor.get.call(this)
            if (typeof value === 'string') {
              return value
            }
          }
          
          // Sinon, récupérer depuis l'attribut class
          const classAttr = this.getAttribute('class')
          return typeof classAttr === 'string' ? classAttr : ''
        },
        set: originalDescriptor.set,
        configurable: true,
        enumerable: true,
      })
    } else {
      // Fallback : créer une propriété si elle n'existe pas
      Object.defineProperty(HTMLElement.prototype, 'className', {
        get: function() {
          const classAttr = this.getAttribute('class')
          return typeof classAttr === 'string' ? classAttr : ''
        },
        set: function(value: string) {
          this.setAttribute('class', value || '')
        },
        configurable: true,
        enumerable: true,
      })
    }

    // S'assurer que tous les éléments existants ont un className valide
    const fixAllElements = () => {
      document.querySelectorAll('*').forEach((el) => {
        if (el instanceof HTMLElement) {
          // Forcer la conversion en chaîne
          try {
            const current = el.className
            if (typeof current !== 'string') {
              el.className = el.getAttribute('class') || ''
            }
          } catch (e) {
            // Ignorer les erreurs
          }
        }
      })
    }

    // Fixer les éléments existants
    fixAllElements()

    // Observer les nouveaux éléments
    const observer = new MutationObserver(() => {
      fixAllElements()
    })

    if (document.body) {
      observer.observe(document.body, {
        childList: true,
        subtree: true,
      })
    }

    // Nettoyage
    return () => {
      observer.disconnect()
      // Restaurer le descripteur original si possible
      if (originalDescriptor) {
        try {
          Object.defineProperty(HTMLElement.prototype, 'className', originalDescriptor)
        } catch (e) {
          // Ignorer si la restauration échoue
        }
      }
    }
  }, [])

  return null
}

