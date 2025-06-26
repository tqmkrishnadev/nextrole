import React, { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';

interface NavigationHandlerProps {
  children: React.ReactNode;
}

export function NavigationHandler({ children }: NavigationHandlerProps) {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return; // Don't navigate while auth is loading

    const inAuthGroup = segments[0] === '(auth)';
    const inTabsGroup = segments[0] === '(tabs)';
    const onWelcomeScreen = segments.length === 0 || segments[0] === 'index';

    console.log('Navigation check:', { 
      user: !!user, 
      segments, 
      inAuthGroup, 
      inTabsGroup, 
      onWelcomeScreen 
    });

    if (user) {
      // User is authenticated
      if (inAuthGroup || onWelcomeScreen) {
        // Redirect authenticated users away from auth screens and welcome screen
        console.log('Redirecting authenticated user to tabs');
        router.replace('/(tabs)');
      }
    } else {
      // User is not authenticated
      if (inTabsGroup) {
        // Redirect unauthenticated users away from protected screens
        console.log('Redirecting unauthenticated user to welcome');
        router.replace('/');
      }
    }
  }, [user, loading, segments, router]);

  return <>{children}</>;
}