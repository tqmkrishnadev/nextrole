import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
  Linking,
  BackHandler
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, RefreshCw, ExternalLink, Globe, TriangleAlert as AlertTriangle, Wifi, Shield, Brain } from 'lucide-react-native';
import { WebView } from 'react-native-webview';

export default function InterviewSessionScreen() {
  const router = useRouter();
  const { type, userId } = useLocalSearchParams<{ type: string; userId: string }>();
  
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [canGoBack, setCanGoBack] = useState(false);
  const [loadAttempts, setLoadAttempts] = useState(0);
  const [showFallback, setShowFallback] = useState(false);
  
  const webViewRef = useRef<WebView>(null);
  const maxRetries = 3;

  // Interview URL
  const interviewUrl = `https://31.97.135.155:5173/?userId=${encodeURIComponent(userId || 'anonymous')}&type=${encodeURIComponent(type || 'behavioral')}`;

  // Handle Android back button
  useEffect(() => {
    const backAction = () => {
      if (canGoBack && webViewRef.current) {
        webViewRef.current.goBack();
        return true;
      } else {
        router.back();
        return true;
      }
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [canGoBack, router]);

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
      setLoadAttempts(0);
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
    setLoadAttempts(prev => prev + 1);

    // Show fallback options after max retries
    if (loadAttempts >= maxRetries - 1) {
      setShowFallback(true);
    }
  };

  const handleHttpError = (syntheticEvent: any) => {
    console.error('WebView HTTP error:', syntheticEvent.nativeEvent);
    setIsLoading(false);
    setHasError(true);
    
    const { statusCode } = syntheticEvent.nativeEvent;
    let userFriendlyMessage = 'Server error occurred.';
    
    if (statusCode === 404) {
      userFriendlyMessage = 'Interview page not found. Please try again later.';
    } else if (statusCode === 500) {
      userFriendlyMessage = 'Server is temporarily unavailable. Please try again later.';
    } else if (statusCode === 503) {
      userFriendlyMessage = 'Service is temporarily unavailable. Please try again later.';
    }
    
    setErrorMessage(userFriendlyMessage);
    setLoadAttempts(prev => prev + 1);

    if (loadAttempts >= maxRetries - 1) {
      setShowFallback(true);
    }
  };

  const handleRefresh = () => {
    console.log('Refreshing WebView...');
    setHasError(false);
    setErrorMessage('');
    setIsLoading(true);
    setShowFallback(false);
    
    if (webViewRef.current) {
      webViewRef.current.reload();
    }
  };

  const handleGoBack = () => {
    if (canGoBack && webViewRef.current) {
      webViewRef.current.goBack();
    } else {
      router.back();
    }
  };

  const handleOpenInBrowser = async () => {
    try {
      const supported = await Linking.canOpenURL(interviewUrl);
      if (supported) {
        await Linking.openURL(interviewUrl);
        
        Alert.alert(
          'Interview Opened in Browser',
          'Your interview has opened in your browser. You can return to the app when finished.',
          [
            {
              text: 'Stay in App',
              style: 'cancel'
            },
            {
              text: 'Close Interview',
              onPress: () => router.back()
            }
          ]
        );
      } else {
        Alert.alert(
          'Cannot Open Browser',
          'Unable to open the interview in your browser. Please try refreshing the page.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error opening browser:', error);
      Alert.alert(
        'Error',
        'Failed to open interview in browser. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const getInterviewTypeTitle = () => {
    switch (type) {
      case 'behavioral':
        return 'Behavioral Interview';
      case 'technical':
        return 'Technical Interview';
      case 'leadership':
        return 'Leadership Interview';
      default:
        return 'AI Interview';
    }
  };

  // Show fallback screen if too many errors
  if (showFallback) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={['#0a0a0a', '#1a1a2e', '#16213e']}
          style={styles.gradient}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
              <ArrowLeft color="white" size={24} strokeWidth={2} />
            </TouchableOpacity>
            
            <View style={styles.headerTitle}>
              <Text style={styles.headerText}>Interview Unavailable</Text>
            </View>
            
            <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.fallbackContainer}>
            <View style={styles.fallbackContent}>
              <AlertTriangle color="#ff6b6b" size={64} strokeWidth={2} />
              
              <Text style={styles.fallbackTitle}>Interview Temporarily Unavailable</Text>
              <Text style={styles.fallbackText}>
                We're having trouble loading the interview in the app. This might be due to network issues or server maintenance.
              </Text>

              <View style={styles.fallbackOptions}>
                <TouchableOpacity style={styles.primaryButton} onPress={handleOpenInBrowser}>
                  <LinearGradient
                    colors={['#667eea', '#764ba2']}
                    style={styles.primaryButtonGradient}
                  >
                    <Globe color="white" size={20} strokeWidth={2} />
                    <Text style={styles.primaryButtonText}>Open in Browser</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity style={styles.secondaryButton} onPress={handleRefresh}>
                  <RefreshCw color="#667eea" size={20} strokeWidth={2} />
                  <Text style={styles.secondaryButtonText}>Try Again</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.secondaryButton} onPress={() => router.back()}>
                  <ArrowLeft color="rgba(255, 255, 255, 0.7)" size={20} strokeWidth={2} />
                  <Text style={styles.secondaryButtonText}>Back to App</Text>
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
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#0a0a0a', '#1a1a2e', '#16213e']}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={handleGoBack}>
            <ArrowLeft color="white" size={24} strokeWidth={2} />
          </TouchableOpacity>
          
          <View style={styles.headerTitle}>
            <Text style={styles.headerText}>{getInterviewTypeTitle()}</Text>
            {isLoading && (
              <Text style={styles.headerSubtext}>Loading...</Text>
            )}
          </View>
          
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerButton} onPress={handleRefresh}>
              <RefreshCw color="white" size={20} strokeWidth={2} />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.headerButton} onPress={handleOpenInBrowser}>
              <ExternalLink color="white" size={20} strokeWidth={2} />
            </TouchableOpacity>
          </View>
        </View>

        {/* WebView Content */}
        <View style={styles.webViewContainer}>
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
                Attempt {loadAttempts} of {maxRetries}. If the problem persists, try opening the interview in your browser.
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
              onShouldStartLoadWithRequest={(request) => {
                console.log('Should start load with request:', request);
                return true;
              }}
              cacheEnabled={false}
              incognito={false}
              allowsBackForwardNavigationGestures={true}
              allowsLinkPreview={false}
              allowFileAccess={false}
              allowUniversalAccessFromFileURLs={false}
              allowFileAccessFromFileURLs={false}
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
      </LinearGradient>
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
  
  // Header Styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(10, 10, 10, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  headerText: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-SemiBold',
    color: 'white',
  },
  headerSubtext: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  closeText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: 'white',
  },

  // WebView Styles
  webViewContainer: {
    flex: 1,
  },
  webView: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },

  // Loading Styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
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
  loadingContent: {
    alignItems: 'center',
    paddingHorizontal: 40,
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

  // Error Styles
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

  // Fallback Styles
  fallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  fallbackContent: {
    alignItems: 'center',
    maxWidth: 400,
  },
  fallbackTitle: {
    fontSize: 24,
    fontFamily: 'SpaceGrotesk-Bold',
    color: 'white',
    marginTop: 24,
    marginBottom: 16,
    textAlign: 'center',
  },
  fallbackText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  fallbackOptions: {
    width: '100%',
    gap: 16,
    marginBottom: 32,
  },
  primaryButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  primaryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  primaryButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: 'white',
    marginLeft: 8,
  },
  secondaryButton: {
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
  secondaryButtonText: {
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