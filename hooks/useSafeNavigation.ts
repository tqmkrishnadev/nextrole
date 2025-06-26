import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { safeAsyncHandler } from '@/utils/safeAsyncHandler';

export const useSafeNavigation = () => {
  const router = useRouter();

  const safePush = useCallback((href: string) => {
    return safeAsyncHandler(
      async () => {
        router.push(href as any);
      },
      {
        action: `navigation_push_${href}`,
        fallback: () => {
          console.warn(`Failed to navigate to ${href}`);
        }
      }
    );
  }, [router]);

  const safeReplace = useCallback((href: string) => {
    return safeAsyncHandler(
      async () => {
        router.replace(href as any);
      },
      {
        action: `navigation_replace_${href}`,
        fallback: () => {
          console.warn(`Failed to replace with ${href}`);
        }
      }
    );
  }, [router]);

  const safeBack = useCallback(() => {
    return safeAsyncHandler(
      async () => {
        router.back();
      },
      {
        action: 'navigation_back',
        fallback: () => {
          console.warn('Failed to go back');
        }
      }
    );
  }, [router]);

  return {
    safePush,
    safeReplace,
    safeBack
  };
};