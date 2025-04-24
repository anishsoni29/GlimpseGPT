// app/auth/callback/page.tsx
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export default function Callback() {
  const router = useRouter()
  const supabase = createClientComponentClient()

  useEffect(() => {
    const finishAuth = async () => {
      const { error } = await supabase.auth.getSession()

      if (error) {
        console.error('Error getting session:', error.message)
      }

      // ✅ Redirect to your homepage or dashboard
      router.push('/')
    }

    finishAuth()
  }, [router, supabase])

  return (
    <div className="flex items-center justify-center h-screen">
      <p className="text-xl font-medium">Logging you in...</p>
    </div>
  )
}
