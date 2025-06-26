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
import { Mail, Lock, Eye, EyeOff, User, ArrowRight, Brain } from 'lucide-react-native';
import { SafeButton } from '@/components/SafeButton';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

export default function SignUpScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const { signUp, loading } = useAuth();
  
  const formOpacity = useSharedValue(0);
  const formTranslateY = useSharedValue(50);

  React.useEffect(() => {
    formOpacity.value = withTiming(1, { duration: 800 });
    formTranslateY.value = withSpring(0, { damping: 15 });
  }, []);

  const handleSignUp = async () => {
    setError(null);
    
    if (!name || !email || !password) {
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

    if (name.trim().length < 2) {
      setError('Name must be at least 2 characters');
      return;
    }

    const result = await signUp(email, password, name);
    
    if (!result.success) {
      setError(result.error || 'Sign up failed. Please try again.');
      return;
    }

    // Navigation will be handled automatically by auth state change
    router.replace('/(tabs)');
  };

  const handleSignIn = () => {
    router.push('/(auth)/signin');
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
              
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>
                Join the future of professional networking
              </Text>
            </Animated.View>

            {/* Sign Up Form */}
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

                    {/* Name Input */}
                    <View style={styles.inputContainer}>
                      <View style={styles.inputIconContainer}>
                        <User color="#667eea" size={20} strokeWidth={2} />
                      </View>
                      <TextInput
                        style={styles.input}
                        placeholder="Full name"
                        placeholderTextColor="rgba(255, 255, 255, 0.5)"
                        value={name}
                        onChangeText={setName}
                        autoCapitalize="words"
                        autoCorrect={false}
                        editable={!loading}
                      />
                    </View>

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

                    {/* Password Input */}
                    <View style={styles.inputContainer}>
                      <View style={styles.inputIconContainer}>
                        <Lock color="#667eea" size={20} strokeWidth={2} />
                      </View>
                      <TextInput
                        style={styles.input}
                        placeholder="Password (min 6 characters)"
                        placeholderTextColor="rgba(255, 255, 255, 0.5)"
                        value={password}
                        onChangeText={setPassword}
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

                    {/* Sign Up Button */}
                    <SafeButton
                      title={loading ? 'Creating Account...' : 'Create Account'}
                      onPress={handleSignUp}
                      style={styles.signUpButton}
                      loading={loading}
                      disabled={loading}
                      icon={!loading ? <ArrowRight color="white" size={20} strokeWidth={2} /> : undefined}
                    />

                    {/* Terms */}
                    <Text style={styles.termsText}>
                      By creating an account, you agree to our Terms of Service and Privacy Policy
                    </Text>
                  </View>
                </LinearGradient>
              </BlurView>
            </Animated.View>

            {/* Sign In Link */}
            <View style={styles.signInContainer}>
              <Text style={styles.signInText}>Already have an account? </Text>
              <SafeButton
                title="Sign In"
                onPress={handleSignIn}
                variant="secondary"
                textStyle={styles.signInLink}
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
  signUpButton: {
    marginTop: 8,
  },
  termsText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 18,
  },
  signInContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signInText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  signInLink: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#667eea',
  },
});