import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
  Alert,
  Modal,
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
import { Mic, Brain, MessageCircle, Target, Zap, Award, Globe, Smartphone, X, ArrowLeft, RefreshCw, ExternalLink, TriangleAlert as AlertTriangle, Wifi, Shield } from 'lucide-react-native';
import { AuthGuard } from '@/components/AuthGuard';
import { useAuth } from '@/hooks/useAuth';

// Conditionally import WebView only for mobile platforms
let WebView: any = null;
if (Platform.OS !== 'web') {
  try {
    const RNWebView = require('react-native-webview');
    WebView = RNWebView.WebView;
  } catch (error) {
    console.warn('WebView not available:', error);
  }
}

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

// Mobile WebView Component (only used on mobile platforms)
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
  const webViewRef = React.useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [canGoBack, setCanGoBack] = useState(false);
  const [loadAttempts, setLoadAttempts] = useState(0);

  // Only render on mobile platforms
  if (Platform.OS === 'web' || !WebView) {
    return null;
  }

  // Use HTTP instead of HTTPS for better compatibility
  const interviewUrl = `http://31.97.135.155:5173/?userId=${encodeURIComponent(userId)}&type=${encodeURIComponent(interviewType)}`;

  const handleNavigationStateChange = (navState: any) => {
    console.log('Navigation state changed:', navState);
    setCanGoBack(navState.canGoBack);
    
    // Check for specific error conditions
    if (navState.url && navState.url.includes('error')) {
      setHasError(true);
      setErrorMessage('Failed to load interview page');
    }
  };

  const handleLoadStart = (syntheticEvent: any) => {
    console.log('WebView load started:', syntheticEvent.nativeEvent);
    setIsLoading(true);
    setHasError(false);
    setErrorMessage('');
  };

  const handleLoadEnd = (syntheticEvent: any) => {
    console.log('WebView load ended:', syntheticEvent.nativeEvent);
    setIsLoading(false);
    
    // Check if the page loaded successfully
    const { url, title } = syntheticEvent.nativeEvent;
    if (url && !url.includes('error') && !title?.includes('error')) {
      setHasError(false);
    }
  };

  const handleError = (syntheticEvent: any) => {
    console.error('WebView error:', syntheticEvent.nativeEvent);
    setIsLoading(false);
    setHasError(true);
    
    const { description, code } = syntheticEvent.nativeEvent;
    let userFriendlyMessage = 'Unable to load the interview page.';
    
    if (code === -1009 || description?.includes('offline')) {
      userFriendlyMessage = 'No internet connection. Please check your network and try again.';
    } else if (code === -1200 || description?.includes('SSL')) {
      userFriendlyMessage = 'Security certificate issue. The interview server may be temporarily unavailable.';
    } else if (code === -1001 || description?.includes('timeout')) {
      userFriendlyMessage = 'Connection timeout. Please check your internet connection and try again.';
    } else if (description?.includes('host')) {
      userFriendlyMessage = 'Cannot reach the interview server. Please try again later.';
    }
    
    setErrorMessage(userFriendlyMessage);
  };

  const handleHttpError = (syntheticEvent: any) => {
    console.error('WebView HTTP error:', syntheticEvent.nativeEvent);
    setIsLoading(false);
    setHasError(true);
    
    const { statusCode, description } = syntheticEvent.nativeEvent;
    let userFriendlyMessage = 'Server error occurred.';
    
    if (statusCode === 404) {
      userFriendlyMessage = 'Interview page not found. Please try again later.';
    } else if (statusCode === 500) {
      userFriendlyMessage = 'Server is temporarily unavailable. Please try again later.';
    } else if (statusCode === 503) {
      userFriendlyMessage = 'Service is temporarily unavailable. Please try again later.';
    }
    
    setErrorMessage(userFriendlyMessage);
  };

  const handleRefresh = () => {
    console.log('Refreshing WebView...');
    setLoadAttempts(prev => prev + 1);
    setHasError(false);
    setErrorMessage('');
    setIsLoading(true);
    
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

  const handleOpenInBrowser = () => {
    Alert.alert(
      'Open in Browser',
      'Would you like to open the interview in your default browser instead?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Open Browser', 
          onPress: () => {
            Linking.openURL(interviewUrl);
            onClose();
          }
        }
      ]
    );
  };

  // Show alternative options if too many failed attempts
  if (loadAttempts >= 3 && hasError) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={onClose}
      >
        <SafeAreaView style={styles.webViewContainer}>
          <View style={styles.webViewHeader}>
            <TouchableOpacity 
              style={styles.webViewHeaderButton}
              onPress={onClose}
            >
              <ArrowLeft color="white" size={24} strokeWidth={2} />
            </TouchableOpacity>
            
            <View style={styles.webViewHeaderTitle}>
              <Text style={styles.webViewHeaderText}>Interview Unavailable</Text>
            </View>
            
            <TouchableOpacity 
              style={styles.webViewHeaderButton}
              onPress={onClose}
            >
              <X color="white" size={24} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          <View style={styles.alternativeContainer}>
            <View style={styles.alternativeContent}>
              <AlertTriangle color="#ff6b6b" size={64} strokeWidth={2} />
              
              <Text style={styles.alternativeTitle}>Interview Temporarily Unavailable</Text>
              <Text style={styles.alternativeText}>
                We're having trouble loading the interview in the app. This might be due to network issues or server maintenance.
              </Text>

              <View style={styles.alternativeOptions}>
                <TouchableOpacity style={styles.alternativeButton} onPress={handleOpenInBrowser}>
                  <LinearGradient
                    colors={['#667eea', '#764ba2']}
                    style={styles.alternativeButtonGradient}
                  >
                    <Globe color="white" size={20} strokeWidth={2} />
                    <Text style={styles.alternativeButtonText}>Open in Browser</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity style={styles.alternativeButtonSecondary} onPress={handleRefresh}>
                  <RefreshCw color="#667eea" size={20} strokeWidth={2} />
                  <Text style={styles.alternativeButtonSecondaryText}>Try Again</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.alternativeButtonSecondary} onPress={onClose}>
                  <ArrowLeft color="rgba(255, 255, 255, 0.7)" size={20} strokeWidth={2} />
                  <Text style={styles.alternativeButtonSecondaryText}>Back to App</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.troubleshootingTips}>
                <Text style={styles.troubleshootingTitle}>Troubleshooting Tips:</Text>
                <View style={styles.troubleshootingList}>
                  <View style={styles.troubleshootingItem}>
                    <Wifi color="#4ecdc4" size={16} strokeWidth={2} />
                    <Text style={styles.troubleshootingItemText}>Check your internet connection</Text>
                  </View>
                  <View style={styles.troubleshootingItem}>
                    <Shield color="#4ecdc4" size={16} strokeWidth={2} />
                    <Text style={styles.troubleshootingItemText}>Try using your browser instead</Text>
                  </View>
                  <View style={styles.troubleshootingItem}>
                    <RefreshCw color="#4ecdc4" size={16} strokeWidth={2} />
                    <Text style={styles.troubleshootingItemText}>Wait a few minutes and try again</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    );
  }

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
              <AlertTriangle color="#ff6b6b" size={48} strokeWidth={2} />
              <Text style={styles.errorTitle}>Connection Error</Text>
              <Text style={styles.errorText}>{errorMessage}</Text>
              
              <View style={styles.errorActions}>
                <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
                  <LinearGradient
                    colors={['#667eea', '#764ba2']}
                    style={styles.retryButtonGradient}
                  >
                    <RefreshCw color="white" size={20} strokeWidth={2} />
                    <Text style={styles.retryButtonText}>Retry</Text>
                  </LinearGradient>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.browserButton} onPress={handleOpenInBrowser}>
                  <Globe color="#667eea" size={20} strokeWidth={2} />
                  <Text style={styles.browserButtonText}>Open in Browser</Text>
                </TouchableOpacity>
              </View>
              
              <Text style={styles.errorHint}>
                If the problem persists, try opening the interview in your browser for the best experience.
              </Text>
            </View>
          ) : (
            <WebView
              ref={webViewRef}
              source={{ uri: interviewUrl }}
              style={styles.webView}
              onLoadStart={handleLoadStart}
              onLoadEnd={handleLoadEnd}
              onError={handleError}
              onHttpError={handleHttpError}
              onNavigationStateChange={handleNavigationStateChange}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              mediaPlaybackRequiresUserAction={false}
              allowsInlineMediaPlayback={true}
              mixedContentMode="compatibility"
              originWhitelist={['*']}
              startInLoadingState={true}
              scalesPageToFit={true}
              bounces={false}
              scrollEnabled={true}
              automaticallyAdjustContentInsets={false}
              contentInset={{ top: 0, left: 0, bottom: 0, right: 0 }}
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
                  {loadAttempts > 0 && (
                    <Text style={styles.loadingAttempts}>
                      Attempt {loadAttempts + 1}
                    </Text>
                  )}
                </View>
              )}
              onMessage={(event) => {
                console.log('WebView message:', event.nativeEvent.data);
              }}
              userAgent={Platform.select({
                ios: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1 NextRoleAI/1.0',
                android: 'Mozilla/5.0 (Linux; Android 11; SM-G975F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36 NextRoleAI/1.0',
                default: undefined
              })}
              // Enhanced error handling
              onShouldStartLoadWithRequest={(request) => {
                console.log('Should start load with request:', request);
                return true;
              }}
              // Memory management
              cacheEnabled={false}
              incognito={false}
              // Security settings
              allowsBackForwardNavigationGestures={true}
              allowsLinkPreview={false}
              allowFileAccess={false}
              allowUniversalAccessFromFileURLs={false}
              allowFileAccessFromFileURLs={false}
              // Performance settings
              androidHardwareAccelerationDisabled={false}
              androidLayerType="hardware"
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
              {loadAttempts > 0 && (
                <Text style={styles.loadingAttempts}>
                  Attempt {loadAttempts + 1}
                </Text>
              )}
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
      
      const userId = user?.id || 'anonymous';
      
      if (Platform.OS === 'web') {
        // For web platform, open in new tab
        const interviewUrl = `/mock-interview?userId=${encodeURIComponent(userId)}&type=${encodeURIComponent(type)}`;
        
        // Open in new tab/window
        const newWindow = window.open(interviewUrl, '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
        
        if (!newWindow) {
          // Fallback if popup blocked
          Alert.alert(
            'Interview Ready',
            'Your interview is ready to start. Click OK to open it in a new tab.',
            [
              {
                text: 'Cancel',
                style: 'cancel'
              },
              {
                text: 'Open Interview',
                onPress: () => {
                  Linking.openURL(interviewUrl);
                }
              }
            ]
          );
        } else {
          // Focus the new window
          newWindow.focus();
        }
      } else {
        // For mobile platforms, use WebView
        setCurrentInterviewType(type);
        setShowWebView(true);
      }
      
      // Reset selected card after a short delay
      setTimeout(() => {
        setSelectedCard(null);
      }, 1000);
      
    } catch (error) {
      console.error('Error starting interview:', error);
      
      // Reset selected card
      setSelectedCard(null);
      
      // Show error message with more options
      Alert.alert(
        'Unable to Start Interview',
        'We encountered an error starting the interview. Would you like to try opening it in your browser instead?',
        [
          {
            text: 'Try Browser',
            onPress: () => {
              const interviewUrl = `http://31.97.135.155:5173/?userId=${encodeURIComponent(user?.id || 'anonymous')}&type=${encodeURIComponent(type)}`;
              Linking.openURL(interviewUrl);
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
    }
  }, [user]);

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
                    <View style={styles.platformIndicator}>
                      {Platform.OS === 'web' ? (
                        <>
                          <ExternalLink color={card.color} size={16} strokeWidth={2} />
                          <Text style={[styles.platformText, { color: card.color }]}>New Tab</Text>
                        </>
                      ) : (
                        <>
                          <Smartphone color={card.color} size={16} strokeWidth={2} />
                          <Text style={[styles.platformText, { color: card.color }]}>In-App</Text>
                        </>
                      )}
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
                    <View style={styles.cardLoadingOverlay}>
                      <Text style={styles.cardLoadingText}>Starting interview...</Text>
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
          Choose your interview type. {Platform.OS === 'web' 
            ? 'The session will open in a new tab for the best experience.' 
            : 'The session will open within the app. If you experience issues, we\'ll offer to open it in your browser.'}
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
          {Platform.OS === 'web' ? (
            <Globe color="#4ecdc4" size={20} strokeWidth={2} />
          ) : (
            <Smartphone color="#4ecdc4" size={20} strokeWidth={2} />
          )}
          <Text style={styles.platformInfoTitle}>
            {Platform.OS === 'web' ? 'Web Browser Experience' : 'Flexible Experience'}
          </Text>
        </View>
        <Text style={styles.platformInfoText}>
          {Platform.OS === 'web' 
            ? 'Your interview will open in a new browser tab optimized for ElevenLabs AI agents. This provides the best audio and microphone experience for web browsers.'
            : 'Your interview will first try to open within the app. If there are any issues, you can easily switch to your browser for the best experience with ElevenLabs AI agents.'
          }
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
          {Platform.OS !== 'web' && (
            <View style={styles.supportItem}>
              <Shield color="#4ecdc4" size={16} strokeWidth={2} />
              <Text style={styles.supportText}>Fallback Options</Text>
            </View>
          )}
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
            <Text style={styles.instructionText}>
              {Platform.OS === 'web' 
                ? 'Interview opens in a new browser tab'
                : 'Interview opens within the app (or browser if needed)'
              }
            </Text>
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

      {/* WebView Modal (Mobile Only) */}
      {Platform.OS !== 'web' && WebView && (
        <InterviewWebView
          visible={showWebView}
          onClose={handleCloseWebView}
          interviewType={currentInterviewType}
          userId={user?.id || 'anonymous'}
        />
      )}
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

  // WebView Styles (Mobile Only)
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
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  loadingSubtext: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 8,
    textAlign: 'center',
  },
  loadingAttempts: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 8,
  },
  loadingContent: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
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
    marginTop: 16,
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
  errorActions: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
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
  browserButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(102, 126, 234, 0.3)',
  },
  browserButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#667eea',
    marginLeft: 8,
  },
  errorHint: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    lineHeight: 18,
  },

  // Alternative Container Styles
  alternativeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
    paddingHorizontal: 24,
  },
  alternativeContent: {
    alignItems: 'center',
    maxWidth: 400,
  },
  alternativeTitle: {
    fontSize: 24,
    fontFamily: 'SpaceGrotesk-Bold',
    color: 'white',
    marginTop: 24,
    marginBottom: 16,
    textAlign: 'center',
  },
  alternativeText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  alternativeOptions: {
    width: '100%',
    gap: 16,
    marginBottom: 32,
  },
  alternativeButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  alternativeButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  alternativeButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: 'white',
    marginLeft: 8,
  },
  alternativeButtonSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  alternativeButtonSecondaryText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: 'rgba(255, 255, 255, 0.8)',
    marginLeft: 8,
  },
  troubleshootingTips: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 20,
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
  troubleshootingItemText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
    marginLeft: 12,
    flex: 1,
  },
});