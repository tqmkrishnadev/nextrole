import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
  Alert,
  Modal
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
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
  X,
  ArrowLeft,
  RefreshCw
} from 'lucide-react-native';
import { AuthGuard } from '@/components/AuthGuard';
import { useAuth } from '@/hooks/useAuth';

const { width, height } = Dimensions.get('window');

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

function InterviewWebView({ 
  visible, 
  onClose, 
  interviewType, 
  userId 
}: {
  visible: boolean;
  onClose: () => void;
  interviewType: string;
  userId: string;
}) {
  const webViewRef = useRef<WebView>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);

  // Construct the interview URL
  const interviewUrl = `https://31.97.135.155:5173/`;

  const handleNavigationStateChange = (navState: any) => {
    setCanGoBack(navState.canGoBack);
  };

  const handleLoadStart = () => {
    setIsLoading(true);
    setHasError(false);
  };

  const handleLoadEnd = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  const handleRefresh = () => {
    if (webViewRef.current) {
      webViewRef.current.reload();
    }
  };

  const handleGoBack = () => {
    if (canGoBack && webViewRef.current) {
      webViewRef.current.goBack();
    } else {
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.webViewContainer}>
        {/* Header */}
        <View style={styles.webViewHeader}>
          <TouchableOpacity 
            style={styles.webViewHeaderButton}
            onPress={handleGoBack}
          >
            <ArrowLeft color="white" size={24} strokeWidth={2} />
          </TouchableOpacity>
          
          <View style={styles.webViewHeaderTitle}>
            <Text style={styles.webViewHeaderText}>
              {interviewType.charAt(0).toUpperCase() + interviewType.slice(1)} Interview
            </Text>
            {isLoading && (
              <Text style={styles.webViewHeaderSubtext}>Loading...</Text>
            )}
          </View>
          
          <View style={styles.webViewHeaderActions}>
            <TouchableOpacity 
              style={styles.webViewHeaderButton}
              onPress={handleRefresh}
            >
              <RefreshCw color="white" size={20} strokeWidth={2} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.webViewHeaderButton}
              onPress={onClose}
            >
              <X color="white" size={24} strokeWidth={2} />
            </TouchableOpacity>
          </View>
        </View>

        {/* WebView */}
        <View style={styles.webViewContent}>
          {hasError ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorTitle}>Connection Error</Text>
              <Text style={styles.errorText}>
                Unable to load the interview page. Please check your internet connection and try again.
              </Text>
              <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
                <LinearGradient
                  colors={['#667eea', '#764ba2']}
                  style={styles.retryButtonGradient}
                >
                  <RefreshCw color="white" size={20} strokeWidth={2} />
                  <Text style={styles.retryButtonText}>Retry</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            <WebView
              ref={webViewRef}
              source={{ uri: interviewUrl }}
              style={styles.webView}
              onLoadStart={handleLoadStart}
              onLoadEnd={handleLoadEnd}
              onError={handleError}
              onNavigationStateChange={handleNavigationStateChange}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              mediaPlaybackRequiresUserAction={false}
              allowsInlineMediaPlayback={true}
              mixedContentMode="compatibility"
              originWhitelist={['*']}
              startInLoadingState={true}
              renderLoading={() => (
                <View style={styles.loadingContainer}>
                  <LinearGradient
                    colors={['#667eea', '#764ba2', '#f093fb']}
                    style={styles.loadingLogo}
                  >
                    <Brain color="white" size={32} strokeWidth={2} />
                  </LinearGradient>
                  <Text style={styles.loadingText}>Loading Interview...</Text>
                  <Text style={styles.loadingSubtext}>
                    Connecting to ElevenLabs AI Agent
                  </Text>
                </View>
              )}
              onMessage={(event) => {
                // Handle messages from the WebView if needed
                console.log('WebView message:', event.nativeEvent.data);
              }}
              userAgent={Platform.select({
                ios: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
                android: 'Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36',
                default: undefined
              })}
            />
          )}
        </View>

        {/* Loading Overlay */}
        {isLoading && !hasError && (
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingContent}>
              <LinearGradient
                colors={['#667eea', '#764ba2', '#f093fb']}
                style={styles.loadingLogo}
              >
                <Brain color="white" size={32} strokeWidth={2} />
              </LinearGradient>
              <Text style={styles.loadingText}>Loading Interview...</Text>
              <Text style={styles.loadingSubtext}>
                Preparing your AI-powered mock interview
              </Text>
            </View>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

function InterviewContent() {
  const { user, profile } = useAuth();
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [showWebView, setShowWebView] = useState(false);
  const [currentInterviewType, setCurrentInterviewType] = useState<string>('');

  const handleStartInterview = useCallback(async (type: 'behavioral' | 'technical' | 'leadership') => {
    try {
      console.log('Starting interview:', type);
      
      // Set selected card for visual feedback
      setSelectedCard(type);
      
      // Set current interview type and show WebView
      setCurrentInterviewType(type);
      setShowWebView(true);
      
      // Reset selected card after a short delay
      setTimeout(() => {
        setSelectedCard(null);
      }, 1000);
      
    } catch (error) {
      console.error('Error starting interview:', error);
      
      // Reset selected card
      setSelectedCard(null);
      
      // Show error message
      Alert.alert(
        'Unable to Start Interview',
        'We encountered an error starting the interview. Please try again.',
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
    }
  }, []);

  const handleCloseWebView = useCallback(() => {
    setShowWebView(false);
    setCurrentInterviewType('');
  }, []);

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
                    <View style={styles.inAppIndicator}>
                      <Smartphone color={card.color} size={16} strokeWidth={2} />
                      <Text style={[styles.inAppText, { color: card.color }]}>In-App</Text>
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
                        <Mic color="white" size={16} strokeWidth={2} />
                      )}
                    </LinearGradient>
                  </View>

                  {/* Loading State */}
                  {isSelected && (
                    <View style={styles.loadingOverlay}>
                      <Text style={styles.loadingText}>Starting interview...</Text>
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
          Choose your interview type. The session will open within the app for seamless experience.
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

      {/* Platform Info */}
      <View style={styles.platformInfo}>
        <View style={styles.platformInfoHeader}>
          <Smartphone color="#4ecdc4" size={20} strokeWidth={2} />
          <Text style={styles.platformInfoTitle}>In-App Experience</Text>
        </View>
        <Text style={styles.platformInfoText}>
          Your interview will open within the app using an integrated web view. This provides the best experience with ElevenLabs AI agents while keeping you in the app.
        </Text>
        
        <View style={styles.platformSupport}>
          <View style={styles.supportItem}>
            <Globe color="#4ecdc4" size={16} strokeWidth={2} />
            <Text style={styles.supportText}>Web Technology</Text>
          </View>
          <View style={styles.supportItem}>
            <Mic color="#4ecdc4" size={16} strokeWidth={2} />
            <Text style={styles.supportText}>Voice Enabled</Text>
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
            <Text style={styles.instructionText}>Interview opens within the app</Text>
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
        </View>
      </View>

      {/* WebView Modal */}
      <InterviewWebView
        visible={showWebView}
        onClose={handleCloseWebView}
        interviewType={currentInterviewType}
        userId={user?.id || 'anonymous'}
      />
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
  inAppIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  inAppText: {
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
  loadingOverlay: {
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
  loadingText: {
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

  // Platform Info Styles
  platformInfo: {
    backgroundColor: 'rgba(78, 205, 196, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(78, 205, 196, 0.2)',
  },
  platformInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  platformInfoTitle: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-SemiBold',
    color: '#4ecdc4',
    marginLeft: 8,
  },
  platformInfoText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 20,
    marginBottom: 16,
  },
  platformSupport: {
    flexDirection: 'row',
    justifyContent: 'space-around',
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

  // WebView Styles
  webViewContainer: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  webViewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 10, 10, 0.95)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  webViewHeaderButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  webViewHeaderTitle: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  webViewHeaderText: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-SemiBold',
    color: 'white',
  },
  webViewHeaderSubtext: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 2,
  },
  webViewHeaderActions: {
    flexDirection: 'row',
    gap: 8,
  },
  webViewContent: {
    flex: 1,
  },
  webView: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
  },
  loadingLogo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  loadingSubtext: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 8,
    textAlign: 'center',
  },
  loadingContent: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
    paddingHorizontal: 40,
  },
  errorTitle: {
    fontSize: 24,
    fontFamily: 'SpaceGrotesk-Bold',
    color: '#ff6b6b',
    marginBottom: 16,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  retryButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  retryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  retryButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: 'white',
    marginLeft: 8,
  },
});