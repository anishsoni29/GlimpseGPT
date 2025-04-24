'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../../../backend/lib/supabase';

export default function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleAuth = async () => {
      try {
        // Get the auth code from URL search params (this should be present in magic link redirects)
        const code = searchParams.get('code');
        
        // If code exists, exchange it for a session
        if (code) {
          // Process the code to establish session
          await supabase.auth.exchangeCodeForSession(code);
        }
        
        // Now check if session exists
        const { data } = await supabase.auth.getSession();
        
        if (data?.session) {
          console.log('Session found, redirecting to home');
          router.push('/'); // ✅ redirect after login
        } else {
          console.log('No session found, redirecting to login');
          router.push('/login'); // ❌ fallback
        }
      } catch (error) {
        console.error('Auth error:', error);
        router.push('/login'); // Redirect to login on error
      }
    };

    handleAuth();
  }, [router, searchParams]);

  return (
    <div className="flex items-center justify-center h-screen bg-background">
      <div className="flex flex-col items-center space-y-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Finishing login... Please wait.</p>
      </div>
    </div>
  );
}
