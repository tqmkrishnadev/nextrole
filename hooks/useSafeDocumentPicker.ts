import { Platform } from 'react-native';
import { useCallback } from 'react';
import { safeAsyncHandler } from '@/utils/safeAsyncHandler';

export interface DocumentPickerResult {
  success: boolean;
  file?: any;
  error?: string;
}

export const useSafeDocumentPicker = () => {
  const pickDocument = useCallback(async (): Promise<DocumentPickerResult> => {
    if (Platform.OS === 'web') {
      return {
        success: false,
        error: 'Document picker not available on web platform'
      };
    }

    const result = await safeAsyncHandler(
      async () => {
        const DocumentPicker = await import('expo-document-picker');
        
        if (!DocumentPicker || !DocumentPicker.getDocumentAsync) {
          throw new Error('Document picker not available');
        }

        const pickerResult = await DocumentPicker.getDocumentAsync({
          type: [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          ],
          copyToCacheDirectory: true,
          multiple: false,
        });

        if (pickerResult.canceled) {
          return { success: false, error: 'User cancelled' };
        }

        if (!pickerResult.assets || pickerResult.assets.length === 0) {
          return { success: false, error: 'No file selected' };
        }

        const file = pickerResult.assets[0];
        
        // Validate file
        if (!file.name || !file.uri) {
          return { success: false, error: 'Invalid file selected' };
        }

        // Check file size (limit to 10MB)
        if (file.size && file.size > 10 * 1024 * 1024) {
          return { success: false, error: 'File size too large (max 10MB)' };
        }

        return { success: true, file };
      },
      {
        action: 'document_picker',
        showError: true
      }
    );

    return result || { success: false, error: 'Unknown error occurred' };
  }, []);

  return { pickDocument };
};