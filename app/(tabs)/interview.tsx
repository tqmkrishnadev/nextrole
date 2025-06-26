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
import { Mic, MicOff, Play, Pause, RotateCcw, Send, Brain, Clock, MessageCircle, User, Bot, CircleCheck as CheckCircle, CircleAlert as AlertCircle, Award, TrendingUp, Target, Zap } from 'lucide-react-native';
import { useAIInterview } from '@/hooks/useAIInterview';
import { AuthGuard } from '@/components/AuthGuard';

const { width, height } = Dimensions.get('window');

// Memoized conversation item component to prevent unnecessary re-renders
const ConversationItem = React.memo(({ item, index }: { item: any; index: number }) => {
  const isAI = item.type === 'ai_question' || item.type === 'ai_followup';
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
          {item.duration && (
            <View style={styles.durationBadge}>
              <Clock color="rgba(255, 255, 255, 0.6)" size={12} />
              <Text style={styles.durationText}>{item.duration}s</Text>
            </View>
          )}
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
  const [manualResponse, setManualResponse] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  // Use the AI interview hook
  const {
    currentQuestion,
    currentQuestionIndex,
    totalQuestions,
    isRecording,
    isPlaying,
    isProcessing,
    responses,
    feedback,
    permissionsGranted,
    interviewStarted,
    conversationState,
    conversationHistory,
    interviewTimeRemaining,
    currentTranscript,
    startInterview,
    nextQuestion,
    previousQuestion,
    startRecording,
    stopRecording,
    playQuestion,
    stopPlaying,
    submitResponse,
    finishInterview,
    resetInterview,
    requestPermissions,
  } = useAIInterview();

  const handleStartInterview = useCallback(async (type: 'behavioral' | 'technical' | 'leadership') => {
    setSelectedType(type);
    setShowFeedback(false);
    await startInterview(type);
  }, [startInterview]);

  const handleSubmitManualResponse = useCallback(() => {
    if (manualResponse.trim()) {
      submitResponse(manualResponse.trim());
      setManualResponse('');
      setShowManualInput(false);
    }
  }, [manualResponse, submitResponse]);

  const handleFinishInterview = useCallback(async () => {
    await finishInterview();
    setShowFeedback(true);
  }, [finishInterview]);

  const handleResetInterview = useCallback(() => {
    resetInterview();
    setSelectedType(null);
    setManualResponse('');
    setShowManualInput(false);
    setShowFeedback(false);
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
  if (!interviewStarted && !showFeedback) {
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
            Choose your interview type and practice with our AI interviewer
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
            <Text style={styles.featureText}>AI-Powered Questions</Text>
          </View>
          <View style={styles.feature}>
            <Brain color="#667eea" size={20} strokeWidth={2} />
            <Text style={styles.featureText}>Real-time Feedback</Text>
          </View>
          <View style={styles.feature}>
            <Award color="#4ecdc4" size={20} strokeWidth={2} />
            <Text style={styles.featureText}>Performance Analysis</Text>
          </View>
        </View>
      </View>
    );
  }

  // Show feedback screen
  if (showFeedback && feedback) {
    return (
      <View style={styles.feedbackContainer}>
        <ScrollView 
          style={styles.feedbackScroll}
          contentContainerStyle={styles.feedbackContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.feedbackHeader}>
            <View style={styles.scoreContainer}>
              <Text style={styles.scoreValue}>{feedback.overallScore}</Text>
              <Text style={styles.scoreLabel}>Overall Score</Text>
            </View>
            <Text style={styles.feedbackTitle}>Interview Complete!</Text>
            <Text style={styles.feedbackSubtitle}>
              Here's your detailed performance analysis
            </Text>
          </View>

          {/* Strengths */}
          <View style={styles.feedbackSection}>
            <View style={styles.sectionHeader}>
              <CheckCircle color="#4ecdc4" size={20} strokeWidth={2} />
              <Text style={styles.sectionTitle}>Strengths</Text>
            </View>
            {feedback.strengths.map((strength, index) => (
              <View key={index} style={styles.feedbackItem}>
                <Text style={styles.feedbackItemText}>{strength}</Text>
              </View>
            ))}
          </View>

          {/* Areas for Improvement */}
          <View style={styles.feedbackSection}>
            <View style={styles.sectionHeader}>
              <TrendingUp color="#f093fb" size={20} strokeWidth={2} />
              <Text style={styles.sectionTitle}>Areas for Improvement</Text>
            </View>
            {feedback.improvements.map((improvement, index) => (
              <View key={index} style={styles.feedbackItem}>
                <Text style={styles.feedbackItemText}>{improvement}</Text>
              </View>
            ))}
          </View>

          {/* Recommendations */}
          <View style={styles.feedbackSection}>
            <View style={styles.sectionHeader}>
              <Target color="#667eea" size={20} strokeWidth={2} />
              <Text style={styles.sectionTitle}>Recommendations</Text>
            </View>
            {feedback.recommendations.map((recommendation, index) => (
              <View key={index} style={styles.feedbackItem}>
                <Text style={styles.feedbackItemText}>{recommendation}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.restartButton} onPress={handleResetInterview}>
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              style={styles.restartButtonGradient}
            >
              <RotateCcw color="white" size={20} strokeWidth={2} />
              <Text style={styles.restartButtonText}>Start New Interview</Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // Show interview screen
  return (
    <View style={styles.interviewContainer}>
      {/* Header with timer and progress */}
      <View style={styles.interviewHeader}>
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            Question {currentQuestionIndex + 1} of {totalQuestions}
          </Text>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%` }
              ]} 
            />
          </View>
        </View>
        
        <InterviewTimer timeRemaining={interviewTimeRemaining} />
      </View>

      {/* Current Question */}
      {currentQuestion && (
        <View style={styles.questionContainer}>
          <BlurView intensity={20} style={styles.questionBlur}>
            <LinearGradient
              colors={['rgba(102, 126, 234, 0.1)', 'rgba(118, 75, 162, 0.1)']}
              style={styles.questionGradient}
            >
              <View style={styles.questionContent}>
                <View style={styles.questionHeader}>
                  <Bot color="#667eea" size={24} strokeWidth={2} />
                  <Text style={styles.questionLabel}>Current Question</Text>
                </View>
                <Text style={styles.questionText}>{currentQuestion.question}</Text>
                
                <View style={styles.questionActions}>
                  <TouchableOpacity 
                    style={styles.playButton}
                    onPress={isPlaying ? stopPlaying : playQuestion}
                  >
                    {isPlaying ? (
                      <Pause color="#667eea" size={20} strokeWidth={2} />
                    ) : (
                      <Play color="#667eea" size={20} strokeWidth={2} />
                    )}
                    <Text style={styles.playButtonText}>
                      {isPlaying ? 'Stop' : 'Play'} Question
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </LinearGradient>
          </BlurView>
        </View>
      )}

      {/* Recording Controls */}
      <View style={styles.controlsContainer}>
        <View style={styles.recordingSection}>
          <Text style={styles.recordingLabel}>
            {conversationState === 'ai_speaking' ? 'AI is speaking...' :
             conversationState === 'user_speaking' ? 'Recording your response...' :
             conversationState === 'processing_response' ? 'Processing...' :
             conversationState === 'generating_followup' ? 'Generating follow-up...' :
             'Ready for your response'}
          </Text>
          
          {currentTranscript && (
            <View style={styles.transcriptContainer}>
              <Text style={styles.transcriptText}>{currentTranscript}</Text>
            </View>
          )}

          <View style={styles.recordingControls}>
            <TouchableOpacity
              style={[
                styles.recordButton,
                isRecording && styles.recordButtonActive,
                (conversationState !== 'waiting_for_response' && !isRecording) && styles.recordButtonDisabled
              ]}
              onPress={isRecording ? stopRecording : startRecording}
              disabled={conversationState !== 'waiting_for_response' && !isRecording}
            >
              <LinearGradient
                colors={isRecording ? ['#ff6b6b', '#ee5a52'] : ['#4ecdc4', '#44a08d']}
                style={styles.recordButtonGradient}
              >
                {isRecording ? (
                  <MicOff color="white" size={24} strokeWidth={2} />
                ) : (
                  <Mic color="white" size={24} strokeWidth={2} />
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.manualInputButton}
              onPress={() => setShowManualInput(!showManualInput)}
            >
              <Text style={styles.manualInputButtonText}>Type Response</Text>
            </TouchableOpacity>
          </View>

          {showManualInput && (
            <View style={styles.manualInputContainer}>
              <Text style={styles.manualInputLabel}>Type your response:</Text>
              <View style={styles.manualInputWrapper}>
                <Text 
                  style={styles.manualInput}
                  onPress={() => {
                    if (Platform.OS === 'web') {
                      const response = prompt('Enter your response:');
                      if (response) {
                        setManualResponse(response);
                      }
                    } else {
                      Alert.prompt(
                        'Your Response',
                        'Enter your response:',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { 
                            text: 'Submit', 
                            onPress: (text) => {
                              if (text) {
                                setManualResponse(text);
                              }
                            }
                          }
                        ],
                        'plain-text',
                        manualResponse
                      );
                    }
                  }}
                >
                  {manualResponse || 'Tap to enter your response...'}
                </Text>
                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={handleSubmitManualResponse}
                  disabled={!manualResponse.trim()}
                >
                  <Send color={manualResponse.trim() ? "#667eea" : "rgba(255, 255, 255, 0.3)"} size={20} strokeWidth={2} />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        <View style={styles.navigationControls}>
          <TouchableOpacity
            style={[styles.navButton, currentQuestionIndex === 0 && styles.navButtonDisabled]}
            onPress={previousQuestion}
            disabled={currentQuestionIndex === 0}
          >
            <Text style={styles.navButtonText}>Previous</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.finishButton}
            onPress={handleFinishInterview}
          >
            <Text style={styles.finishButtonText}>Finish Interview</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navButton, currentQuestionIndex >= totalQuestions - 1 && styles.navButtonDisabled]}
            onPress={nextQuestion}
            disabled={currentQuestionIndex >= totalQuestions - 1}
          >
            <Text style={styles.navButtonText}>Next</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Conversation History */}
      <View style={styles.conversationContainer}>
        <View style={styles.conversationHeader}>
          <MessageCircle color="#667eea" size={20} strokeWidth={2} />
          <Text style={styles.conversationTitle}>Conversation</Text>
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
        <LinearGradient
          colors={['#0a0a0a', '#1a1a2e', '#16213e']}
          style={styles.gradient}
        >
          <InterviewContent />
        </LinearGradient>
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
  progressContainer: {
    flex: 1,
    marginRight: 16,
  },
  progressText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#667eea',
    borderRadius: 2,
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

  // Question Styles
  questionContainer: {
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  questionBlur: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  questionGradient: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  questionContent: {
    padding: 20,
  },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  questionLabel: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: 'white',
    marginLeft: 8,
  },
  questionText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 24,
    marginBottom: 16,
  },
  questionActions: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(102, 126, 234, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(102, 126, 234, 0.3)',
  },
  playButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#667eea',
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
  transcriptContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    minHeight: 60,
    justifyContent: 'center',
  },
  transcriptText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 20,
  },
  recordingControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
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
  manualInputButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  manualInputButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  manualInputContainer: {
    marginTop: 20,
    width: '100%',
  },
  manualInputLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
  },
  manualInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  manualInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: 'white',
    padding: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  submitButton: {
    padding: 16,
  },
  navigationControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  finishButton: {
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
  },
  finishButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#ff6b6b',
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
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  durationText: {
    fontSize: 10,
    fontFamily: 'Inter-Medium',
    color: 'rgba(255, 255, 255, 0.6)',
    marginLeft: 2,
  },
  messageText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 20,
  },

  // Feedback Screen Styles
  feedbackContainer: {
    flex: 1,
  },
  feedbackScroll: {
    flex: 1,
  },
  feedbackContent: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 100,
  },
  feedbackHeader: {
    alignItems: 'center',
    marginBottom: 40,
  },
  scoreContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  scoreValue: {
    fontSize: 48,
    fontFamily: 'SpaceGrotesk-Bold',
    color: '#4ecdc4',
  },
  scoreLabel: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 4,
  },
  feedbackTitle: {
    fontSize: 28,
    fontFamily: 'SpaceGrotesk-Bold',
    color: 'white',
    marginBottom: 8,
    textAlign: 'center',
  },
  feedbackSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 24,
  },
  feedbackSection: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'SpaceGrotesk-SemiBold',
    color: 'white',
    marginLeft: 8,
  },
  feedbackItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  feedbackItemText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 20,
  },
  restartButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    marginTop: 20,
  },
  restartButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  restartButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: 'white',
    marginLeft: 8,
  },
});