import { Platform } from 'react-native';
import { useCallback } from 'react';
import { safeAsyncHandler } from '@/utils/safeAsyncHandler';

export const useSafeHaptics = () => {
  const triggerHaptics = useCallback((intensity: 'light' | 'medium' | 'heavy' = 'medium') => {
    if (Platform.OS === 'web') {
      // Web fallback - could add vibration API here
      return;
    }

    return safeAsyncHandler(
      async () => {
        const Haptics = await import('expo-haptics');
        
        switch (intensity) {
          case 'light':
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            break;
          case 'heavy':
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            break;
          default:
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
      },
      {
        action: `haptics_${intensity}`,
        logError: false // Don't log haptics errors as they're not critical
      }
    );
  }, []);

  return { triggerHaptics };
};