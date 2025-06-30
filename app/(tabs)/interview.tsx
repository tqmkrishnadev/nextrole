import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
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
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { 
  Mic, 
  Brain, 
  MessageCircle, 
  Target, 
  Zap, 
  Award, 
  Smartphone, 
  ArrowRight,
  RefreshCw,
  Shield,
  Wifi
} from 'lucide-react-native';
import { AuthGuard } from '@/components/AuthGuard';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

// Interview types configuration
const interviewTypeCards = [
  {
    type: 'behavioral' as const,
    title: 'Behavioral Interview',
    description: 'Practice answering questions about your past experiences and how you handle various situations.',
    icon: MessageCircle,
    color: '#667eea',
    gradient: ['#667eea', '#764ba2']
  },
  {
    type: 'technical' as const,
    title: 'Technical Interview',
    description: 'Test your technical knowledge and problem-solving skills in your field of expertise.',
    icon: Brain,
    color: '#f093fb',
    gradient: ['#f093fb', '#f5576c']
  },
  {
    type: 'leadership' as const,
    title: 'Leadership Interview',
    description: 'Demonstrate your leadership abilities and experience managing teams and projects.',
    icon: Target,
    color: '#4ecdc4',
    gradient: ['#4ecdc4', '#44a08d']
  }
];

function InterviewContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [selectedCard, setSelectedCard] = useState<string | null>(null);

  const handleStartInterview = useCallback(async (type: 'behavioral' | 'technical' | 'leadership') => {
    try {
      console.log('Starting interview:', type);
      
      // Set selected card for visual feedback
      setSelectedCard(type);
      
      const userId = user?.id || 'anonymous';
      
      // Navigate to the interview session page with parameters
      router.push({
        pathname: '/interview-session',
        params: {
          type: type,
          userId: userId
        }
      });
      
    } catch (error) {
      console.error('Error starting interview:', error);
      
      Alert.alert(
        'Unable to Start Interview',
        'There was an issue starting the interview. Please try again.',
        [
          {
            text: 'Retry',
            onPress: () => handleStartInterview(type)
          },
          {
            text: 'Cancel',
            style: 'cancel'
          }
        ]
      );
    } finally {
      // Reset selected card after a short delay
      setTimeout(() => {
        setSelectedCard(null);
      }, 1000);
    }
  }, [user, router]);

  // Memoized interview card component
  const InterviewCard = React.memo(({ card }: { card: typeof interviewTypeCards[0] }) => {
    const scale = useSharedValue(1);
    const opacity = useSharedValue(1);
    const IconComponent = card.icon;
    const isSelected = selectedCard === card.type;

    const cardTap = Gesture.Tap()
      .onStart(() => {
        scale.value = withSpring(0.95);
        opacity.value = withTiming(0.8);
      })
      .onEnd(() => {
        scale.value = withSpring(1);
        opacity.value = withTiming(1);
        handleStartInterview(card.type);
      });

    const animatedStyle = useAnimatedStyle(() => {
      return {
        transform: [{ scale: scale.value }],
        opacity: opacity.value,
      };
    });

    return (
      <GestureDetector gesture={cardTap}>
        <Animated.View style={[styles.typeCard, animatedStyle]}>
          <TouchableOpacity
            style={styles.typeCardTouchable}
            onPress={() => handleStartInterview(card.type)}
            disabled={isSelected}
            activeOpacity={0.8}
          >
            <BlurView intensity={20} style={styles.typeCardBlur}>
              <LinearGradient
                colors={[`${card.color}20`, `${card.color}10`]}
                style={styles.typeCardGradient}
              >
                <View style={styles.typeCardContent}>
                  {/* Card Header */}
                  <View style={styles.typeCardHeader}>
                    <View style={[styles.typeCardIcon, { backgroundColor: `${card.color}20` }]}>
                      <IconComponent color={card.color} size={24} strokeWidth={2} />
                    </View>
                    <View style={styles.platformIndicator}>
                      <Smartphone color={card.color} size={16} strokeWidth={2} />
                      <Text style={[styles.platformText, { color: card.color }]}>In-App</Text>
                    </View>
                  </View>

                  {/* Card Content */}
                  <Text style={styles.typeCardTitle}>{card.title}</Text>
                  <Text style={styles.typeCardDescription}>{card.description}</Text>

                  {/* Action Button */}
                  <View style={styles.actionButtonContainer}>
                    <LinearGradient
                      colors={card.gradient}
                      style={styles.actionButton}
                    >
                      <Text style={styles.actionButtonText}>
                        {isSelected ? 'Starting...' : 'Start Interview'}
                      </Text>
                      {!isSelected && (
                        <ArrowRight color="white" size={16} strokeWidth={2} />
                      )}
                    </LinearGradient>
                  </View>

                  {/* Loading State */}
                  {isSelected && (
                    <View style={styles.cardLoadingOverlay}>
                      <Text style={styles.cardLoadingText}>Opening interview...</Text>
                    </View>
                  )}
                </View>
              </LinearGradient>
            </BlurView>
          </TouchableOpacity>
        </Animated.View>
      </GestureDetector>
    );
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <LinearGradient
            colors={['#667eea', '#764ba2', '#f093fb']}
            style={styles.logoGradient}
          >
            <Brain color="white" size={32} strokeWidth={2} />
          </LinearGradient>
        </View>
        <Text style={styles.title}>AI Mock Interview</Text>
        <Text style={styles.subtitle}>
          Choose your interview type. The session will open in a dedicated interview page with full WebView support.
        </Text>
      </View>

      {/* Interview Type Cards */}
      <View style={styles.typeCards}>
        {interviewTypeCards.map((card) => (
          <InterviewCard key={card.type} card={card} />
        ))}
      </View>

      {/* Features Section */}
      <View style={styles.features}>
        <Text style={styles.featuresTitle}>What to Expect</Text>
        <View style={styles.featuresList}>
          <View style={styles.feature}>
            <Zap color="#f093fb" size={20} strokeWidth={2} />
            <Text style={styles.featureText}>Real-time AI Conversation</Text>
          </View>
          <View style={styles.feature}>
            <Brain color="#667eea" size={20} strokeWidth={2} />
            <Text style={styles.featureText}>Natural Voice Interaction</Text>
          </View>
          <View style={styles.feature}>
            <Award color="#4ecdc4" size={20} strokeWidth={2} />
            <Text style={styles.featureText}>Personalized Questions</Text>
          </View>
        </View>
      </View>

      {/* In-App Experience Info */}
      <View style={styles.appInfo}>
        <View style={styles.appInfoHeader}>
          <Smartphone color="#4ecdc4" size={20} strokeWidth={2} />
          <Text style={styles.appInfoTitle}>In-App Interview Experience</Text>
        </View>
        <Text style={styles.appInfoText}>
          Your interview will open in a dedicated page within the app using WebView technology. This provides a seamless experience while maintaining access to all interview features.
        </Text>
        
        <View style={styles.appSupport}>
          <View style={styles.supportItem}>
            <Smartphone color="#4ecdc4" size={16} strokeWidth={2} />
            <Text style={styles.supportText}>Native Integration</Text>
          </View>
          <View style={styles.supportItem}>
            <Mic color="#4ecdc4" size={16} strokeWidth={2} />
            <Text style={styles.supportText}>Voice Enabled</Text>
          </View>
          <View style={styles.supportItem}>
            <Shield color="#4ecdc4" size={16} strokeWidth={2} />
            <Text style={styles.supportText}>Secure Connection</Text>
          </View>
        </View>
      </View>

      {/* Instructions */}
      <View style={styles.instructions}>
        <Text style={styles.instructionsTitle}>How it Works</Text>
        <View style={styles.instructionsList}>
          <View style={styles.instructionItem}>
            <View style={styles.instructionNumber}>
              <Text style={styles.instructionNumberText}>1</Text>
            </View>
            <Text style={styles.instructionText}>Select your interview type above</Text>
          </View>
          <View style={styles.instructionItem}>
            <View style={styles.instructionNumber}>
              <Text style={styles.instructionNumberText}>2</Text>
            </View>
            <Text style={styles.instructionText}>Interview opens in dedicated page within the app</Text>
          </View>
          <View style={styles.instructionItem}>
            <View style={styles.instructionNumber}>
              <Text style={styles.instructionNumberText}>3</Text>
            </View>
            <Text style={styles.instructionText}>Allow microphone access when prompted</Text>
          </View>
          <View style={styles.instructionItem}>
            <View style={styles.instructionNumber}>
              <Text style={styles.instructionNumberText}>4</Text>
            </View>
            <Text style={styles.instructionText}>Complete your interview with AI agent</Text>
          </View>
          <View style={styles.instructionItem}>
            <View style={styles.instructionNumber}>
              <Text style={styles.instructionNumberText}>5</Text>
            </View>
            <Text style={styles.instructionText}>Return to main app when finished</Text>
          </View>
        </View>
      </View>

      {/* Troubleshooting */}
      <View style={styles.troubleshooting}>
        <Text style={styles.troubleshootingTitle}>Troubleshooting</Text>
        <View style={styles.troubleshootingList}>
          <View style={styles.troubleshootingItem}>
            <Wifi color="rgba(255, 255, 255, 0.6)" size={16} strokeWidth={2} />
            <Text style={styles.troubleshootingText}>Ensure stable internet connection</Text>
          </View>
          <View style={styles.troubleshootingItem}>
            <Mic color="rgba(255, 255, 255, 0.6)" size={16} strokeWidth={2} />
            <Text style={styles.troubleshootingText}>Allow microphone permissions when prompted</Text>
          </View>
          <View style={styles.troubleshootingItem}>
            <RefreshCw color="rgba(255, 255, 255, 0.6)" size={16} strokeWidth={2} />
            <Text style={styles.troubleshootingText}>Use refresh button if page doesn't load</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

export default function InterviewScreen() {
  return (
    <AuthGuard>
      <SafeAreaView style={styles.safeArea}>
        <LinearGradient
          colors={['#0a0a0a', '#1a1a2e', '#16213e']}
          style={styles.gradient}
        >
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <InterviewContent />
          </ScrollView>
        </LinearGradient>
      </SafeAreaView>
    </AuthGuard>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  gradient: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120, // Extra padding for tab bar
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  
  // Header Styles
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
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
    paddingHorizontal: 20,
  },

  // Interview Cards Styles
  typeCards: {
    gap: 20,
    marginBottom: 40,
  },
  typeCard: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  typeCardTouchable: {
    borderRadius: 20,
  },
  typeCardBlur: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  typeCardGradient: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  typeCardContent: {
    padding: 24,
    position: 'relative',
  },
  typeCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  typeCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  platformIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  platformText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    marginLeft: 4,
  },
  typeCardTitle: {
    fontSize: 20,
    fontFamily: 'SpaceGrotesk-SemiBold',
    color: 'white',
    marginBottom: 8,
  },
  typeCardDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 20,
    marginBottom: 20,
  },
  actionButtonContainer: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  actionButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: 'white',
    marginRight: 8,
  },
  cardLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  cardLoadingText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: 'white',
  },

  // Features Styles
  features: {
    marginBottom: 32,
  },
  featuresTitle: {
    fontSize: 20,
    fontFamily: 'SpaceGrotesk-SemiBold',
    color: 'white',
    marginBottom: 16,
    textAlign: 'center',
  },
  featuresList: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  feature: {
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

  // App Info Styles
  appInfo: {
    backgroundColor: 'rgba(78, 205, 196, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(78, 205, 196, 0.2)',
  },
  appInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  appInfoTitle: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-SemiBold',
    color: '#4ecdc4',
    marginLeft: 8,
  },
  appInfoText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 20,
    marginBottom: 16,
  },
  appSupport: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    gap: 8,
  },
  supportItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  supportText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#4ecdc4',
    marginLeft: 6,
  },

  // Instructions Styles
  instructions: {
    marginBottom: 32,
  },
  instructionsTitle: {
    fontSize: 20,
    fontFamily: 'SpaceGrotesk-SemiBold',
    color: 'white',
    marginBottom: 20,
    textAlign: 'center',
  },
  instructionsList: {
    gap: 16,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  instructionNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  instructionNumberText: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: 'white',
  },
  instructionText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: 'rgba(255, 255, 255, 0.8)',
    flex: 1,
  },

  // Troubleshooting Styles
  troubleshooting: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  troubleshootingTitle: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-SemiBold',
    color: 'white',
    marginBottom: 16,
    textAlign: 'center',
  },
  troubleshootingList: {
    gap: 12,
  },
  troubleshootingItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  troubleshootingText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.6)',
    marginLeft: 12,
    flex: 1,
  },
});