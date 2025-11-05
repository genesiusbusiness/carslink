import { useEffect } from 'react'
import type { FeedbackMessage } from '@/lib/utils-flynesis'

interface FeedbackProps {
  message: FeedbackMessage | null
  onClose: () => void
  duration?: number
}

export function Feedback({ message, onClose, duration = 5000 }: FeedbackProps) {
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        onClose()
      }, duration)

      return () => clearTimeout(timer)
    }
  }, [message, duration, onClose])

  if (!message) return null

  const styles = {
    success: 'bg-green-500 text-white',
    error: 'bg-red-500 text-white',
    info: 'bg-blue-500 text-white',
    warning: 'bg-yellow-500 text-black'
  }

  return (
    <div className={`fixed bottom-4 right-4 p-4 rounded-lg shadow-lg ${styles[message.type]}`}>
      <div className="flex items-center justify-between">
        <p>{message.message}</p>
        <button onClick={onClose} className="ml-4 text-xl">
          ×
        </button>
      </div>
    </div>
  )
}

