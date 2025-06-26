import { Platform } from 'react-native';
import CrashLogger from './crashLogger';

export interface SafeAsyncOptions {
  fallback?: () => void;
  showError?: boolean;
  logError?: boolean;
  action?: string;
}

/**
 * Safely executes async functions with comprehensive error handling
 */
export const safeAsyncHandler = async (
  asyncFn: () => Promise<any>,
  options: SafeAsyncOptions = {}
): Promise<any> => {
  const {
    fallback,
    showError = false,
    logError = true,
    action = 'unknown'
  } = options;

  try {
    return await asyncFn();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    if (logError) {
      CrashLogger.getInstance().log(error as Error, action);
    }

    if (__DEV__) {
      console.error(`[SAFE ASYNC] Error in ${action}:`, error);
    }

    if (showError && Platform.OS !== 'web') {
      // Show user-friendly error message
      try {
        const { Alert } = require('react-native');
        Alert.alert(
          'Something went wrong',
          'We encountered an issue. Please try again.',
          [{ text: 'OK' }]
        );
      } catch (alertError) {
        console.error('Failed to show alert:', alertError);
      }
    }

    if (fallback) {
      try {
        fallback();
      } catch (fallbackError) {
        console.error('Fallback function failed:', fallbackError);
      }
    }

    return null;
  }
};

/**
 * Creates a safe version of any async function
 */
export const makeSafeAsync = <T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: SafeAsyncOptions = {}
): T => {
  return ((...args: Parameters<T>) => {
    return safeAsyncHandler(() => fn(...args), options);
  }) as T;
};