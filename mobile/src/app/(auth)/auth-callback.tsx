import { useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';

import { LoadingState } from '@/components/ui/States';
import { useAuth } from '@/auth/AuthProvider';

/**
 * Fallback for the Google sign-in deep link (consultapsi://auth-callback?token=...).
 * Normally openAuthSessionAsync captures it in the login screen; on some Android
 * devices the link opens the app directly and lands here.
 */
export default function AuthCallbackScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const { signInWithToken } = useAuth();

  useEffect(() => {
    if (!token) {
      router.replace('/login');
      return;
    }
    signInWithToken(token).catch(() => router.replace('/login'));
  }, [token, signInWithToken]);

  return <LoadingState label="Entrando..." />;
}
