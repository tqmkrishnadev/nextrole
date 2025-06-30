import React, { useState, useCallback, useMemo } from 'react';
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
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Mic, MicOff, RotateCcw, Brain, Clock, MessageCircle, User, Bot, Award, TrendingUp, Target, Zap, Volume2, VolumeX, Smartphone, Globe } from 'lucide-react-native';
import { useAIInterview } from '@/hooks/useAIInterview';
import { AuthGuard } from '@/components/AuthGuard';
import ElevenLabsAgentService from '@/services/elevenLabsAgentService';

const { width, height } = Dimensions.get('window');

// Memoized conversation item component to prevent unnecessary re-renders
const ConversationItem = React.memo(({ item, index }: { item: any; index: number }) => {
  const isAI = item.type === 'agent';
  const itemOpacity = useSharedValue(0);
  const itemTranslateY = useSharedValue(20);

  React.useEffect(() => {
    setTimeout(() => {
      itemOpacity.value = withTiming(1, { duration: 500 });
      itemTranslateY.value = withSpring(0, { damping: 15 });
    }, index * 100);
  }, []);

  const itemStyle = useAnimatedStyle(() => {
    return {
      opacity: itemOpacity.value,
      transform: [{ translateY: itemTranslateY.value }],
    };
  });

  return (
    <Animated.View style={[styles.conversationItem, itemStyle]}>
      <View style={[styles.messageContainer, isAI ? styles.aiMessage : styles.userMessage]}>
        <View style={styles.messageHeader}>
          <View style={[styles.avatarContainer, isAI ? styles.aiAvatar : styles.userAvatar]}>
            {isAI ? (
              <Bot color="white" size={16} strokeWidth={2} />
            ) : (
              <User color="white" size={16} strokeWidth={2} />
            )}
          </View>
          <Text style={styles.messageSender}>
            {isAI ? 'AI Interviewer' : 'You'}
          </Text>
          <Text style={styles.messageTime}>
            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        <Text style={styles.messageText}>{item.content}</Text>
      </View>
    </Animated.View>
  );
});

// Memoized timer component to isolate timer updates
const InterviewTimer = React.memo(({ timeRemaining }: { timeRemaining: number }) => {
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const isLowTime = timeRemaining < 60;

  const timerStyle = useAnimatedStyle(() => {
    const scale = isLowTime ? 
      interpolate(timeRemaining % 2, [0, 1], [1, 1.05], Extrapolate.CLAMP) : 1;
    
    return {
      transform: [{ scale }],
    };
  });

  return (
    <Animated.View style={[styles.timerContainer, timerStyle]}>
      <Clock color={isLowTime ? "#ff6b6b" : "#4ecdc4"} size={16} strokeWidth={2} />
      <Text style={[styles.timerText, isLowTime && styles.timerTextLow]}>
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </Text>
    </Animated.View>
  );
});

// Memoized conversation list component
const ConversationList = React.memo(({ conversationHistory }: { conversationHistory: any[] }) => {
  return (
    <ScrollView 
      style={styles.conversationList}
      contentContainerStyle={styles.conversationContent}
      showsVerticalScrollIndicator={false}
    >
      {conversationHistory.map((item, index) => (
        <ConversationItem key={item.id} item={item} index={index} />
      ))}
    </ScrollView>
  );
});

function InterviewContent() {
  const [selectedType, setSelectedType] = useState<'behavioral' | 'technical' | 'leadership' | null>(null);

  // Use the AI interview hook with ElevenLabs Agent integration
  const {
    isConnected,
    isAgentSpeaking,
    isUserSpeaking,
    conversationHistory,
    interviewStarted,
    interviewTimeRemaining,
    error,
    startInterview,
    startRecording,
    stopRecording,
    finishInterview,
    resetInterview,
  } = useAIInterview();

  const handleStartInterview = useCallback(async (type: 'behavioral' | 'technical' | 'leadership') => {
    setSelectedType(type);
    
    // Enable audio playback for mobile devices
    const agentService = ElevenLabsAgentService.getInstance();
    await agentService.enableAudioPlayback();
    
    await startInterview(type);
  }, [startInterview]);

  const handleFinishInterview = useCallback(async () => {
    await finishInterview();
  }, [finishInterview]);

  const handleResetInterview = useCallback(() => {
    resetInterview();
    setSelectedType(null);
  }, [resetInterview]);

  // Memoize the interview type cards to prevent unnecessary re-renders
  const interviewTypeCards = useMemo(() => [
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
  ], []);

  // Show interview type selection
  if (!interviewStarted) {
    return (
      <View style={styles.selectionContainer}>
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
            Choose your interview type and practice with our AI interviewer powered by ElevenLabs
          </Text>
        </View>

        <View style={styles.typeCards}>
          {interviewTypeCards.map((card) => {
            const IconComponent = card.icon;
            return (
              <TouchableOpacity
                key={card.type}
                style={styles.typeCard}
                onPress={() => handleStartInterview(card.type)}
              >
                <BlurView intensity={20} style={styles.typeCardBlur}>
                  <LinearGradient
                    colors={[`${card.color}20`, `${card.color}10`]}
                    style={styles.typeCardGradient}
                  >
                    <View style={styles.typeCardContent}>
                      <View style={[styles.typeCardIcon, { backgroundColor: `${card.color}20` }]}>
                        <IconComponent color={card.color} size={24} strokeWidth={2} />
                      </View>
                      <Text style={styles.typeCardTitle}>{card.title}</Text>
                      <Text style={styles.typeCardDescription}>{card.description}</Text>
                    </View>
                  </LinearGradient>
                </BlurView>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.features}>
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

        {/* Platform Support Info */}
        <View style={styles.platformInfo}>
          <View style={styles.platformSupport}>
            <Globe color="#4ecdc4" size={16} strokeWidth={2} />
            <Text style={styles.platformSupportText}>Web Browser</Text>
          </View>
          <View style={styles.platformSupport}>
            <Smartphone color="#4ecdc4" size={16} strokeWidth={2} />
            <Text style={styles.platformSupportText}>Mobile App</Text>
          </View>
        </View>
      </View>
    );
  }

  // Show interview screen
  return (
    <View style={styles.interviewContainer}>
      {/* Header with timer and connection status */}
      <View style={styles.interviewHeader}>
        <View style={styles.connectionStatus}>
          <View style={[styles.connectionDot, { backgroundColor: isConnected ? '#4ecdc4' : '#ff6b6b' }]} />
          <Text style={styles.connectionText}>
            {isConnected ? 'Connected to AI Agent' : 'Connecting...'}
          </Text>
        </View>
        
        <InterviewTimer timeRemaining={interviewTimeRemaining} />
      </View>

      {/* Error Display */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          {error.includes('Microphone') && (
            <Text style={styles.errorHint}>
              Please allow microphone access in your browser settings and refresh the page.
            </Text>
          )}
        </View>
      )}

      {/* Current Status */}
      <View style={styles.statusContainer}>
        <BlurView intensity={20} style={styles.statusBlur}>
          <LinearGradient
            colors={['rgba(102, 126, 234, 0.1)', 'rgba(118, 75, 162, 0.1)']}
            style={styles.statusGradient}
          >
            <View style={styles.statusContent}>
              <View style={styles.statusHeader}>
                <Bot color="#667eea" size={24} strokeWidth={2} />
                <Text style={styles.statusLabel}>Interview Status</Text>
              </View>
              <Text style={styles.statusText}>
                {isAgentSpeaking ? 'AI is speaking...' :
                 isUserSpeaking ? 'Listening to your response...' :
                 isConnected ? 'Ready for your response' :
                 'Connecting to AI agent...'}
              </Text>
              
              {isAgentSpeaking && (
                <View style={styles.speakingIndicator}>
                  <Volume2 color="#4ecdc4" size={20} strokeWidth={2} />
                  <Text style={styles.speakingText}>Agent is speaking</Text>
                </View>
              )}
            </View>
          </LinearGradient>
        </BlurView>
      </View>

      {/* Recording Controls */}
      <View style={styles.controlsContainer}>
        <View style={styles.recordingSection}>
          <Text style={styles.recordingLabel}>
            {isUserSpeaking ? 'Recording your response...' : 
             isAgentSpeaking ? 'AI is speaking, please wait...' :
             Platform.OS === 'web' ? 'Tap and hold to speak' : 'Tap and hold to speak'}
          </Text>

          <View style={styles.recordingControls}>
            <TouchableOpacity
              style={[
                styles.recordButton,
                isUserSpeaking && styles.recordButtonActive,
                (isAgentSpeaking || !isConnected) && styles.recordButtonDisabled
              ]}
              onPressIn={startRecording}
              onPressOut={stopRecording}
              disabled={isAgentSpeaking || !isConnected}
            >
              <LinearGradient
                colors={isUserSpeaking ? ['#ff6b6b', '#ee5a52'] : ['#4ecdc4', '#44a08d']}
                style={styles.recordButtonGradient}
              >
                {isUserSpeaking ? (
                  <MicOff color="white" size={24} strokeWidth={2} />
                ) : (
                  <Mic color="white" size={24} strokeWidth={2} />
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <Text style={styles.recordingHint}>
            {isConnected ? 'Hold to speak, release to send' : 'Waiting for connection...'}
          </Text>
          
          {Platform.OS !== 'web' && (
            <Text style={styles.mobileHint}>
              📱 Make sure to allow microphone permissions when prompted
            </Text>
          )}
        </View>

        <View style={styles.navigationControls}>
          <TouchableOpacity
            style={styles.finishButton}
            onPress={handleFinishInterview}
          >
            <Text style={styles.finishButtonText}>Finish Interview</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.resetButton}
            onPress={handleResetInterview}
          >
            <RotateCcw color="rgba(255, 255, 255, 0.8)" size={20} strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Conversation History */}
      <View style={styles.conversationContainer}>
        <View style={styles.conversationHeader}>
          <MessageCircle color="#667eea" size={20} strokeWidth={2} />
          <Text style={styles.conversationTitle}>Conversation</Text>
          <Text style={styles.conversationCount}>({conversationHistory.length})</Text>
        </View>
        
        <ConversationList conversationHistory={conversationHistory} />
      </View>
    </View>
  );
}

export default function InterviewScreen() {
  return (
    <AuthGuard>
      <SafeAreaView style={styles.container}>
        <ScrollView >
        <LinearGradient
          colors={['#0a0a0a', '#1a1a2e', '#16213e']}
          style={styles.gradient}
        >
          <InterviewContent />
        </LinearGradient>
          </ScrollView>
      </SafeAreaView>
    </AuthGuard>
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
  
  // Selection Screen Styles
  selectionContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
  },
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
  },
  typeCards: {
    flex: 1,
    gap: 20,
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
    alignItems: 'center',
  },
  typeCardIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  typeCardTitle: {
    fontSize: 20,
    fontFamily: 'SpaceGrotesk-SemiBold',
    color: 'white',
    marginBottom: 8,
    textAlign: 'center',
  },
  typeCardDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 20,
  },
  features: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    marginTop: 20,
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
  platformInfo: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(78, 205, 196, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(78, 205, 196, 0.2)',
  },
  platformSupport: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  platformSupportText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#4ecdc4',
  },

  // Interview Screen Styles
  interviewContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  interviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  connectionText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  timerText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#4ecdc4',
    marginLeft: 6,
  },
  timerTextLow: {
    color: '#ff6b6b',
  },

  // Error Styles
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
    marginBottom: 4,
  },
  errorHint: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 107, 107, 0.8)',
    textAlign: 'center',
  },

  // Status Styles
  statusContainer: {
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  statusBlur: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  statusGradient: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statusContent: {
    padding: 20,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusLabel: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: 'white',
    marginLeft: 8,
  },
  statusText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 20,
  },
  speakingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    backgroundColor: 'rgba(78, 205, 196, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  speakingText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#4ecdc4',
    marginLeft: 6,
  },

  // Controls Styles
  controlsContainer: {
    marginBottom: 20,
  },
  recordingSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  recordingLabel: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 16,
  },
  recordingControls: {
    alignItems: 'center',
    marginBottom: 12,
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    shadowColor: '#4ecdc4',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  recordButtonActive: {
    shadowColor: '#ff6b6b',
  },
  recordButtonDisabled: {
    opacity: 0.5,
    shadowOpacity: 0.1,
  },
  recordButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingHint: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
  },
  mobileHint: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    marginTop: 4,
  },
  navigationControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  finishButton: {
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
    flex: 1,
    marginRight: 12,
  },
  finishButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#ff6b6b',
    textAlign: 'center',
  },
  resetButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },

  // Conversation Styles
  conversationContainer: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  conversationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  conversationTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: 'white',
    marginLeft: 8,
    flex: 1,
  },
  conversationCount: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  conversationList: {
    flex: 1,
  },
  conversationContent: {
    padding: 16,
    paddingBottom: 100, // Extra padding for tab bar
  },
  conversationItem: {
    marginBottom: 16,
  },
  messageContainer: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  aiMessage: {
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    borderColor: 'rgba(102, 126, 234, 0.2)',
    marginRight: 40,
  },
  userMessage: {
    backgroundColor: 'rgba(78, 205, 196, 0.1)',
    borderColor: 'rgba(78, 205, 196, 0.2)',
    marginLeft: 40,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatarContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  aiAvatar: {
    backgroundColor: '#667eea',
  },
  userAvatar: {
    backgroundColor: '#4ecdc4',
  },
  messageSender: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: 'rgba(255, 255, 255, 0.8)',
    flex: 1,
  },
  messageTime: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.5)',
  },
  messageText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 20,
  },
});