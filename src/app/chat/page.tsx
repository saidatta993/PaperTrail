"use client"
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Chat is now embedded in the main two-panel layout at /
// This route redirects there to preserve any existing links.
export default function ChatRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/') }, [router])
  return null
}
