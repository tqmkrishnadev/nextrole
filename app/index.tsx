import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Image,
  Platform,
  Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Upload, Sparkles, Zap, Brain, FileText, ArrowRight } from 'lucide-react-native';
import { SafeButton } from '@/components/SafeButton';
import { useSafeNavigation } from '@/hooks/useSafeNavigation';
import { useSafeDocumentPicker } from '@/hooks/useSafeDocumentPicker';
import { safeAsyncHandler } from '@/utils/safeAsyncHandler';
import { useAuth } from '@/hooks/useAuth';

const { width, height } = Dimensions.get('window');

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

export default function WelcomeScreen() {
  const [uploadedFile, setUploadedFile] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { safePush } = useSafeNavigation();
  const { pickDocument } = useSafeDocumentPicker();
  const { user, loading } = useAuth();
  
  const pulseScale = useSharedValue(1);
  const shimmerX = useSharedValue(-width);

  // Don't redirect authenticated users here - let NavigationHandler handle it
  // This prevents the flash of welcome screen for authenticated users

  const handleResumeUpload = async () => {
    setError(null);
    
    if (Platform.OS === 'web') {
      Alert.alert(
        'Upload Feature',
        'File upload is available on mobile devices. For now, you can continue to explore the app.',
        [
          { text: 'Continue', onPress: () => safePush('/(auth)/signin') }
        ]
      );
      return;
    }

    await safeAsyncHandler(
      async () => {
        setIsProcessing(true);
        
        const result = await pickDocument();
        
        if (!result.success) {
          if (result.error && result.error !== 'User cancelled') {
            setError(result.error);
          }
          setIsProcessing(false);
          return;
        }

        setUploadedFile(result.file);
        
        // Simulate AI processing
        setTimeout(() => {
          setIsProcessing(false);
          safePush('/(auth)/signin');
        }, 3000);
      },
      {
        action: 'resume_upload',
        showError: true,
        fallback: () => {
          setIsProcessing(false);
          setError('Failed to upload resume. Please try again.');
        }
      }
    );
  };

  const handleSkip = () => {
    safePush('/(auth)/signin');
  };

  const pulseStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: pulseScale.value }],
    };
  });

  const shimmerStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: shimmerX.value }],
    };
  });

  React.useEffect(() => {
    // Pulse animation
    pulseScale.value = withSequence(
      withTiming(1.05, { duration: 2000 }),
      withTiming(1, { duration: 2000 })
    );
    
    // Shimmer animation
    shimmerX.value = withSequence(
      withTiming(width, { duration: 2000 }),
      withTiming(-width, { duration: 0 })
    );
    
    const interval = setInterval(() => {
      pulseScale.value = withSequence(
        withTiming(1.05, { duration: 2000 }),
        withTiming(1, { duration: 2000 })
      );
      shimmerX.value = withSequence(
        withTiming(width, { duration: 2000 }),
        withTiming(-width, { duration: 0 })
      );
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  // Show loading while checking auth state
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <AnimatedLinearGradient
          colors={['#0a0a0a', '#1a1a2e', '#16213e']}
          style={styles.gradient}
        >
          <View style={styles.loadingContainer}>
            <Brain color="#667eea" size={48} strokeWidth={2} />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        </AnimatedLinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <AnimatedLinearGradient
        colors={['#0a0a0a', '#1a1a2e', '#16213e']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.content}>
          {/* Header */}
          <Animated.View style={[styles.header, pulseStyle]}>
            <View style={styles.logoContainer}>
              <LinearGradient
                colors={['#667eea', '#764ba2', '#f093fb']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.logoGradient}
              >
                <Brain color="white" size={32} strokeWidth={2} />
              </LinearGradient>
              
              <Animated.View style={[styles.shimmerContainer, shimmerStyle]}>
                <LinearGradient
                  colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.3)', 'rgba(255,255,255,0)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.shimmer}
                />
              </Animated.View>
            </View>
            
            <Text style={styles.title}>Next-Role.AI</Text>
            <Text style={styles.subtitle}>Your Cinematic Career Profile</Text>
          </Animated.View>

          {/* Main Upload Card */}
          <View style={styles.uploadCard}>
            <BlurView intensity={20} style={styles.cardBlur}>
              <LinearGradient
                colors={['rgba(102, 126, 234, 0.1)', 'rgba(118, 75, 162, 0.1)']}
                style={styles.cardGradient}
              >
                <View style={styles.cardContent}>
                  <View style={styles.iconContainer}>
                    {isProcessing ? (
                      <Animated.View style={pulseStyle}>
                        <Sparkles color="#667eea" size={48} strokeWidth={2} />
                      </Animated.View>
                    ) : (
                      <Upload color="#667eea" size={48} strokeWidth={2} />
                    )}
                  </View>
                  
                  <Text style={styles.cardTitle}>
                    {isProcessing ? 'AI is analyzing your resume...' : 'Upload Your Resume'}
                  </Text>
                  
                  <Text style={styles.cardSubtitle}>
                    {isProcessing 
                      ? 'Creating your cinematic profile with AI magic' 
                      : 'Transform your experience into a cinematic digital profile'
                    }
                  </Text>
                  
                  {/* Error Display */}
                  {error && (
                    <View style={styles.errorContainer}>
                      <Text style={styles.errorText}>{error}</Text>
                    </View>
                  )}
                  
                  {uploadedFile && !isProcessing && !error && (
                    <View style={styles.fileInfo}>
                      <FileText color="#667eea" size={16} />
                      <Text style={styles.fileName}>{uploadedFile.name}</Text>
                    </View>
                  )}
                  
                  {!isProcessing && (
                    <SafeButton
                      title={Platform.OS === 'web' ? 'Continue to App' : 'Upload Resume'}
                      onPress={handleResumeUpload}
                      style={styles.uploadButton}
                      icon={<ArrowRight color="white" size={20} />}
                      loading={isProcessing}
                    />
                  )}

                  {/* Alternative Upload Methods */}
                  {!isProcessing && (
                    <View style={styles.alternativeOptions}>
                      <Text style={styles.alternativeText}>
                        {Platform.OS === 'web' 
                          ? 'File upload available on mobile devices'
                          : 'Supported formats: PDF, DOC, DOCX'
                        }
                      </Text>
                      <SafeButton
                        title="Skip for now"
                        onPress={handleSkip}
                        variant="secondary"
                        style={styles.skipButton}
                      />
                    </View>
                  )}
                </View>
              </LinearGradient>
            </BlurView>
          </View>

          {/* Feature Preview */}
          <View style={styles.features}>
            <View style={styles.featureItem}>
              <Zap color="#f093fb" size={20} />
              <Text style={styles.featureText}>AI-Powered Analysis</Text>
            </View>
            <View style={styles.featureItem}>
              <Brain color="#667eea" size={20} />
              <Text style={styles.featureText}>Smart Interview Prep</Text>
            </View>
            <View style={styles.featureItem}>
              <Sparkles color="#764ba2" size={20} />
              <Text style={styles.featureText}>Cinematic Profiles</Text>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Join thousands of professionals who've transformed their careers
            </Text>
          </View>
        </View>
      </AnimatedLinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  gradient: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 16,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingTop: 40,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    position: 'relative',
    marginBottom: 24,
  },
  logoGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  shimmerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 40,
    overflow: 'hidden',
  },
  shimmer: {
    width: 40,
    height: '100%',
  },
  title: {
    fontSize: 32,
    fontFamily: 'SpaceGrotesk-Bold',
    color: 'white',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  uploadCard: {
    marginVertical: 40,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 20,
  },
  cardBlur: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  cardGradient: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardContent: {
    padding: 32,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 24,
    fontFamily: 'SpaceGrotesk-SemiBold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 12,
  },
  cardSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    width: '100%',
  },
  errorText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#ff6b6b',
    textAlign: 'center',
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 24,
  },
  fileName: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#667eea',
    marginLeft: 8,
  },
  uploadButton: {
    marginBottom: 20,
  },
  alternativeOptions: {
    alignItems: 'center',
    width: '100%',
  },
  alternativeText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    marginBottom: 12,
  },
  skipButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  features: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 20,
  },
  featureItem: {
    alignItems: 'center',
    flex: 1,
  },
  featureText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginTop: 8,
  },
  footer: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  footerText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    lineHeight: 20,
  },
});