'use client'

import { useEffect } from 'react'
import { toast } from 'sonner'

export default function Error({
  error,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    toast.error('Something went wrong', {
      description: 'An unexpected error occurred. Please try again.',
    })
  }, [error])

  return null
}
