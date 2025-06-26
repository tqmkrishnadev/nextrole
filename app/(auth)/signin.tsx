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
import { Mail, Lock, Eye, EyeOff, ArrowRight, Brain } from 'lucide-react-native';
import { SafeButton } from '@/components/SafeButton';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const { signIn, loading } = useAuth();
  
  const formOpacity = useSharedValue(0);
  const formTranslateY = useSharedValue(50);

  React.useEffect(() => {
    formOpacity.value = withTiming(1, { duration: 800 });
    formTranslateY.value = withSpring(0, { damping: 15 });
  }, []);

  const handleSignIn = async () => {
    setError(null);
    
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    if (!email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    const result = await signIn(email, password);
    
    if (!result.success) {
      setError(result.error || 'Sign in failed. Please try again.');
      return;
    }

    // Navigation will be handled automatically by auth state change
    router.replace('/(tabs)');
  };

  const handleForgotPassword = () => {
    router.push('/(auth)/forgot-password');
  };

  const handleSignUp = () => {
    router.push('/(auth)/signup');
  };

  const formStyle = useAnimatedStyle(() => {
    return {
      opacity: formOpacity.value,
      transform: [{ translateY: formTranslateY.value }],
    };
  });

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
              
              <Text style={styles.title}>Welcome Back</Text>
              <Text style={styles.subtitle}>
                Your cinematic profile is ready to shine
              </Text>
            </Animated.View>

            {/* Sign In Form */}
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
                        onChangeText={(text) => {
                          setEmail(text);
                          if (error) setError(null); // Clear error when user starts typing
                        }}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        editable={!loading}
                      />
                    </View>

                    {/* Password Input */}
                    <View style={styles.inputContainer}>
                      <View style={styles.inputIconContainer}>
                        <Lock color="#667eea" size={20} strokeWidth={2} />
                      </View>
                      <TextInput
                        style={styles.input}
                        placeholder="Password"
                        placeholderTextColor="rgba(255, 255, 255, 0.5)"
                        value={password}
                        onChangeText={(text) => {
                          setPassword(text);
                          if (error) setError(null); // Clear error when user starts typing
                        }}
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
                        autoCorrect={false}
                        editable={!loading}
                      />
                      <SafeButton
                        title=""
                        onPress={() => setShowPassword(!showPassword)}
                        style={styles.eyeIcon}
                        variant="secondary"
                        hapticFeedback={false}
                        icon={showPassword ? (
                          <EyeOff color="rgba(255, 255, 255, 0.5)" size={20} />
                        ) : (
                          <Eye color="rgba(255, 255, 255, 0.5)" size={20} />
                        )}
                      />
                    </View>

                    {/* Sign In Button */}
                    <SafeButton
                      title={loading ? 'Signing In...' : 'Sign In'}
                      onPress={handleSignIn}
                      style={styles.signInButton}
                      loading={loading}
                      disabled={loading}
                      icon={!loading ? <ArrowRight color="white" size={20} strokeWidth={2} /> : undefined}
                    />

                    {/* Forgot Password */}
                    <SafeButton
                      title="Forgot your password?"
                      onPress={handleForgotPassword}
                      variant="secondary"
                      style={styles.forgotPassword}
                      textStyle={styles.forgotPasswordText}
                      hapticFeedback={false}
                    />
                  </View>
                </LinearGradient>
              </BlurView>
            </Animated.View>

            {/* Sign Up Link */}
            <View style={styles.signUpContainer}>
              <Text style={styles.signUpText}>Don't have an account? </Text>
              <SafeButton
                title="Sign Up"
                onPress={handleSignUp}
                variant="secondary"
                textStyle={styles.signUpLink}
                hapticFeedback={false}
              />
            </View>
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
  logoContainer: {
    marginBottom: 24,
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
  eyeIcon: {
    paddingHorizontal: 16,
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  signInButton: {
    marginTop: 8,
  },
  forgotPassword: {
    alignSelf: 'center',
    marginTop: 24,
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  signUpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signUpText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  signUpLink: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#667eea',
  },
});