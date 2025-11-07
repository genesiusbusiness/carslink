import { useEffect } from 'react'
import type { FeedbackMessage } from '@/lib/utils-flynesis'

interface FeedbackProps {
  message: FeedbackMessage | null
  onClose: () => void
}