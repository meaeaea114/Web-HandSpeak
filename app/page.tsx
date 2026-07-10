'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Page() {
  const router = useRouter()

  useEffect(() => {
    // Redirects to your login page instead of the dashboard
    router.push('/login')
  }, [router])

  return null
}