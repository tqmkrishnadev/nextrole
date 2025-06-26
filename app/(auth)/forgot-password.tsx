import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  ScrollView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Mail, ArrowLeft, Brain, CircleCheck as CheckCircle } from 'lucide-react-native';
import { SafeButton } from '@/components/SafeButton';
import { useSafeNavigation } from '@/hooks/useSafeNavigation';
import { supabase } from '@/lib/supabase';

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const { safePush, safeBack } = useSafeNavigation();
  
  const formOpacity = useSharedValue(0);
  const formTranslateY = useSharedValue(50);

  React.useEffect(() => {
    formOpacity.value = withTiming(1, { duration: 800 });
    formTranslateY.value = withSpring(0, { damping: 15 });
  }, []);

  const handleResetPassword = async () => {
    setError(null);
    
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    if (!email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);

    try {
      const redirectBaseUrl = process.env.EXPO_PUBLIC_SUPABASE_WEB_REDIRECT_BASE_URL || 'https://localhost:8081';
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${redirectBaseUrl}/reset-password`,
      });

      if (error) {
        setError(error.message);
      } else {
        setSuccess(true);
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formStyle = useAnimatedStyle(() => {
    return {
      opacity: formOpacity.value,
      transform: [{ translateY: formTranslateY.value }],
    };
  });

  if (success) {
    return (
      <SafeAreaView style={styles.container}>
        <AnimatedLinearGradient
          colors={['#0a0a0a', '#1a1a2e', '#16213e']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardView}
          >
            <ScrollView 
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Success State */}
              <Animated.View style={[styles.successContainer, formStyle]}>
                <View style={styles.successIconContainer}>
                  <LinearGradient
                    colors={['#4ecdc4', '#44a08d']}
                    style={styles.successIconGradient}
                  >
                    <CheckCircle color="white" size={32} strokeWidth={2} />
                  </LinearGradient>
                </View>
                
                <Text style={styles.successTitle}>Check Your Email</Text>
                <Text style={styles.successSubtitle}>
                  We've sent a password reset link to {email}
                </Text>
                <Text style={styles.successDescription}>
                  Click the link in your email to reset your password. If you don't see the email, check your spam folder.
                </Text>

                <SafeButton
                  title="Back to Sign In"
                  onPress={() => safePush('/(auth)/signin')}
                  style={styles.backButton}
                />

                <SafeButton
                  title="Resend Email"
                  onPress={handleResetPassword}
                  variant="secondary"
                  style={styles.resendButton}
                  textStyle={styles.resendButtonText}
                  loading={loading}
                />
              </Animated.View>
            </ScrollView>
          </KeyboardAvoidingView>
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
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <Animated.View style={[styles.header, formStyle]}>
              <SafeButton
                title=""
                onPress={safeBack}
                style={styles.backButtonHeader}
                variant="secondary"
                hapticFeedback={false}
                icon={<ArrowLeft color="rgba(255, 255, 255, 0.7)" size={24} />}
              />

              <View style={styles.logoContainer}>
                <LinearGradient
                  colors={['#667eea', '#764ba2', '#f093fb']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.logoGradient}
                >
                  <Brain color="white" size={24} strokeWidth={2} />
                </LinearGradient>
              </View>
              
              <Text style={styles.title}>Reset Password</Text>
              <Text style={styles.subtitle}>
                Enter your email address and we'll send you a link to reset your password
              </Text>
            </Animated.View>

            {/* Reset Password Form */}
            <Animated.View style={[styles.formContainer, formStyle]}>
              <BlurView intensity={20} style={styles.formBlur}>
                <LinearGradient
                  colors={['rgba(102, 126, 234, 0.05)', 'rgba(118, 75, 162, 0.05)']}
                  style={styles.formGradient}
                >
                  <View style={styles.form}>
                    {/* Error Display */}
                    {error && (
                      <View style={styles.errorContainer}>
                        <Text style={styles.errorText}>{error}</Text>
                      </View>
                    )}

                    {/* Email Input */}
                    <View style={styles.inputContainer}>
                      <View style={styles.inputIconContainer}>
                        <Mail color="#667eea" size={20} strokeWidth={2} />
                      </View>
                      <TextInput
                        style={styles.input}
                        placeholder="Email address"
                        placeholderTextColor="rgba(255, 255, 255, 0.5)"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        editable={!loading}
                      />
                    </View>

                    {/* Reset Password Button */}
                    <SafeButton
                      title={loading ? 'Sending...' : 'Send Reset Link'}
                      onPress={handleResetPassword}
                      style={styles.resetButton}
                      loading={loading}
                      disabled={loading}
                    />

                    {/* Additional Info */}
                    <Text style={styles.infoText}>
                      Remember your password?{' '}
                      <Text 
                        style={styles.linkText}
                        onPress={() => safePush('/(auth)/signin')}
                      >
                        Sign In
                      </Text>
                    </Text>
                  </View>
                </LinearGradient>
              </BlurView>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
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
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  backButtonHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: 'transparent',
    borderWidth: 0,
    paddingHorizontal: 0,
    paddingVertical: 8,
  },
  logoContainer: {
    marginBottom: 24,
    marginTop: 40,
  },
  logoGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    fontSize: 28,
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
    lineHeight: 24,
  },
  formContainer: {
    marginBottom: 32,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 20,
  },
  formBlur: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  formGradient: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  form: {
    padding: 32,
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  errorText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#ff6b6b',
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  inputIconContainer: {
    paddingLeft: 16,
    paddingRight: 12,
  },
  input: {
    flex: 1,
    height: 56,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: 'white',
  },
  resetButton: {
    marginTop: 8,
    marginBottom: 24,
  },
  infoText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  linkText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#667eea',
  },
  // Success State Styles
  successContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  successIconContainer: {
    marginBottom: 32,
  },
  successIconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4ecdc4',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  successTitle: {
    fontSize: 28,
    fontFamily: 'SpaceGrotesk-Bold',
    color: 'white',
    marginBottom: 12,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 16,
  },
  successDescription: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  backButton: {
    marginBottom: 16,
    width: '100%',
  },
  resendButton: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    width: '100%',
  },
  resendButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: 'rgba(255, 255, 255, 0.7)',
  },
});