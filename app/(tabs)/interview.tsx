import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
  Alert,
  Linking
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
  Globe, 
  Smartphone, 
  ArrowRight,
  ExternalLink,
  Shield,
  Wifi,
  RefreshCw
} from 'lucide-react-native';
import { AuthGuard } from '@/components/AuthGuard';
import { useAuth } from '@/hooks/useAuth';

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
  const [selectedCard, setSelectedCard] = useState<string | null>(null);

  const handleStartInterview = useCallback(async (type: 'behavioral' | 'technical' | 'leadership') => {
    try {
      console.log('Starting interview:', type);
      
      // Set selected card for visual feedback
      setSelectedCard(type);
      
      const userId = user?.id || 'anonymous';
      const interviewUrl = `https://31.97.135.155:5173/?userId=${encodeURIComponent(userId)}&type=${encodeURIComponent(type)}`;
      
      // Always use external browser for maximum compatibility
      const supported = await Linking.canOpenURL(interviewUrl);
      
      if (supported) {
        await Linking.openURL(interviewUrl);
        
        // Show success message
        Alert.alert(
          'Interview Started',
          'Your AI mock interview has opened in your browser. Complete the interview there and return to the app when finished.',
          [{ text: 'OK' }]
        );
      } else {
        throw new Error('Cannot open interview URL');
      }
      
    } catch (error) {
      console.error('Error starting interview:', error);
      
      // Show error with manual URL option
      Alert.alert(
        'Unable to Start Interview',
        'There was an issue opening the interview. You can manually visit the interview page in your browser.',
        [
          {
            text: 'Copy URL',
            onPress: () => {
              const interviewUrl = `https://31.97.135.155:5173/?userId=${encodeURIComponent(user?.id || 'anonymous')}&type=${encodeURIComponent(type)}`;
              // On web, we could copy to clipboard, but for mobile we'll show the URL
              Alert.alert(
                'Interview URL',
                `Please visit this URL in your browser:\n\n${interviewUrl}`,
                [{ text: 'OK' }]
              );
            }
          },
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
  }, [user]);

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
                      <ExternalLink color={card.color} size={16} strokeWidth={2} />
                      <Text style={[styles.platformText, { color: card.color }]}>Browser</Text>
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
                      <Text style={styles.cardLoadingText}>Opening in browser...</Text>
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
          Choose your interview type. The session will open in your browser for the best experience with voice interaction.
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

      {/* Browser Experience Info */}
      <View style={styles.browserInfo}>
        <View style={styles.browserInfoHeader}>
          <Globe color="#4ecdc4" size={20} strokeWidth={2} />
          <Text style={styles.browserInfoTitle}>Browser Experience</Text>
        </View>
        <Text style={styles.browserInfoText}>
          Your interview will open in your device's browser for optimal performance with ElevenLabs AI agents. This ensures the best audio quality and microphone access for voice interactions.
        </Text>
        
        <View style={styles.browserSupport}>
          <View style={styles.supportItem}>
            <Globe color="#4ecdc4" size={16} strokeWidth={2} />
            <Text style={styles.supportText}>Web Optimized</Text>
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
            <Text style={styles.instructionText}>Interview opens in your browser automatically</Text>
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
            <Text style={styles.instructionText}>Return to the app when finished</Text>
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
            <Text style={styles.troubleshootingText}>Allow microphone permissions in browser</Text>
          </View>
          <View style={styles.troubleshootingItem}>
            <RefreshCw color="rgba(255, 255, 255, 0.6)" size={16} strokeWidth={2} />
            <Text style={styles.troubleshootingText}>Refresh browser if audio issues occur</Text>
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

  // Browser Info Styles
  browserInfo: {
    backgroundColor: 'rgba(78, 205, 196, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(78, 205, 196, 0.2)',
  },
  browserInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  browserInfoTitle: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-SemiBold',
    color: '#4ecdc4',
    marginLeft: 8,
  },
  browserInfoText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 20,
    marginBottom: 16,
  },
  browserSupport: {
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