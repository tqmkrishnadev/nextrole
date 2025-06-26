import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Image,
  Platform,
  TextInput,
  Modal,
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
  withSequence,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Mic, Video, Brain, Play, Pause, Volume2, Settings, Star, Clock, Users, TrendingUp, Award, Zap, ArrowRight, ArrowLeft, Square, RotateCcw, MessageSquare, CircleCheck as CheckCircle, CircleAlert as AlertCircle, Target, BookOpen, Send, Shield, Loader, Timer } from 'lucide-react-native';
import { useAIInterview } from '@/hooks/useAIInterview';

const { width, height } = Dimensions.get('window');

const interviewTypes = [
  {
    id: 'technical',
    title: 'Technical Interview',
    description: 'Practice coding problems and technical questions',
    icon: Brain,
    color: '#667eea',
    difficulty: 'Advanced',
    duration: '10 min',
    questions: 5
  },
  {
    id: 'behavioral',
    title: 'Behavioral Interview',
    description: 'Master STAR method and soft skills',
    icon: Users,
    color: '#f093fb',
    difficulty: 'Intermediate',
    duration: '10 min',
    questions: 5
  },
  {
    id: 'leadership',
    title: 'Leadership Interview',
    description: 'Executive and management focused questions',
    icon: Award,
    color: '#4ecdc4',
    difficulty: 'Expert',
    duration: '10 min',
    questions: 5
  },
];

const recentSessions = [
  {
    id: '1',
    type: 'Technical Interview',
    score: 87,
    date: '2 hours ago',
    feedback: 'Great problem-solving approach',
    avatar: 'https://images.pexels.com/photos/3184292/pexels-photo-3184292.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop'
  },
  {
    id: '2',
    type: 'Behavioral Interview',
    score: 92,
    date: 'Yesterday',
    feedback: 'Excellent STAR examples',
    avatar: 'https://images.pexels.com/photos/3184297/pexels-photo-3184297.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop'
  },
];

export default function InterviewScreen() {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualResponse, setManualResponse] = useState('');
  const [showPermissionModal, setShowPermissionModal] = useState(false);

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

  const pulseScale = useSharedValue(1);
  const recordScale = useSharedValue(1);
  const headerOpacity = useSharedValue(0);
  const cardsOpacity = useSharedValue(0);

  React.useEffect(() => {
    headerOpacity.value = withTiming(1, { duration: 800 });
    setTimeout(() => {
      cardsOpacity.value = withTiming(1, { duration: 800 });
    }, 200);

    // Pulse animation for mic when recording
    const interval = setInterval(() => {
      if (isRecording) {
        pulseScale.value = withSequence(
          withTiming(1.1, { duration: 600 }),
          withTiming(1, { duration: 600 })
        );
      }
    }, 1200);

    return () => clearInterval(interval);
  }, [isRecording]);

  const handleStartInterview = async (type: any) => {
    console.log('Interview type selected:', type.id);
    setSelectedType(type.id);
    
    try {
      await startInterview(type.id as 'behavioral' | 'technical' | 'leadership');
      console.log('Interview started successfully');
    } catch (error) {
      console.error('Failed to start interview:', error);
      Alert.alert(
        'Error',
        'Failed to start the interview. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const handlePermissionRequest = async () => {
    const granted = await requestPermissions();
    setShowPermissionModal(false);
    
    if (!granted) {
      Alert.alert(
        'Permission Required',
        'Microphone access is needed for the best interview experience. You can still continue with manual text input.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleRecordToggle = async () => {
    if (conversationState !== 'waiting_for_response') {
      console.log('Cannot record in current state:', conversationState);
      return;
    }

    if (isRecording) {
      await stopRecording();
    } else {
      await startRecording();
    }
    recordScale.value = withSpring(isRecording ? 1 : 0.9);
  };

  const handleManualSubmit = () => {
    if (manualResponse.trim()) {
      submitResponse(manualResponse.trim());
      setManualResponse('');
      setShowManualInput(false);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      nextQuestion();
    } else {
      finishInterview();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const headerStyle = useAnimatedStyle(() => {
    return {
      opacity: headerOpacity.value,
    };
  });

  const cardsStyle = useAnimatedStyle(() => {
    return {
      opacity: cardsOpacity.value,
    };
  });

  const pulseStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: pulseScale.value }],
    };
  });

  const recordStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: recordScale.value }],
    };
  });

  // Get conversation state display
  const getConversationStateDisplay = () => {
    switch (conversationState) {
      case 'ai_speaking':
        return { text: 'AI is speaking...', color: '#f093fb' };
      case 'waiting_for_response':
        return { text: 'Your turn to speak', color: '#4ecdc4' };
      case 'user_speaking':
        return { text: 'Listening...', color: '#667eea' };
      case 'processing_response':
        return { text: 'Processing your answer...', color: '#feca57' };
      case 'generating_followup':
        return { text: 'Generating follow-up...', color: '#f093fb' };
      default:
        return { text: 'Ready', color: '#667eea' };
    }
  };

  // Permission Modal
  const PermissionModal = () => (
    <Modal
      visible={showPermissionModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowPermissionModal(false)}
    >
      <View style={styles.modalOverlay}>
        <BlurView intensity={20} style={styles.permissionModalBlur}>
          <View style={styles.permissionModalContent}>
            <View style={styles.permissionIconContainer}>
              <Shield color="#667eea" size={48} strokeWidth={2} />
            </View>
            
            <Text style={styles.permissionModalTitle}>Microphone Access Required</Text>
            <Text style={styles.permissionModalText}>
              To provide the best interview experience, we need access to your microphone to record your responses.
            </Text>
            
            <View style={styles.permissionFeatures}>
              <View style={styles.permissionFeature}>
                <Mic color="#4ecdc4" size={20} strokeWidth={2} />
                <Text style={styles.permissionFeatureText}>Record your responses</Text>
              </View>
              <View style={styles.permissionFeature}>
                <Brain color="#f093fb" size={20} strokeWidth={2} />
                <Text style={styles.permissionFeatureText}>AI-powered feedback</Text>
              </View>
              <View style={styles.permissionFeature}>
                <Shield color="#667eea" size={20} strokeWidth={2} />
                <Text style={styles.permissionFeatureText}>Your privacy is protected</Text>
              </View>
            </View>
            
            <View style={styles.permissionModalActions}>
              <TouchableOpacity 
                style={styles.permissionCancelButton}
                onPress={() => setShowPermissionModal(false)}
              >
                <Text style={styles.permissionCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.permissionAllowButton}
                onPress={handlePermissionRequest}
              >
                <LinearGradient
                  colors={['#667eea', '#764ba2']}
                  style={styles.permissionAllowButtonGradient}
                >
                  <Text style={styles.permissionAllowButtonText}>Allow Access</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      </View>
    </Modal>
  );

  // Conversation History Component
  const ConversationHistory = () => (
    <View style={styles.conversationHistory}>
      <Text style={styles.conversationHistoryTitle}>Conversation</Text>
      <ScrollView style={styles.conversationScrollView} showsVerticalScrollIndicator={false}>
        {conversationHistory.map((turn, index) => (
          <View key={turn.id} style={styles.conversationTurn}>
            <View style={[
              styles.conversationBubble,
              turn.type === 'user_response' ? styles.userBubble : styles.aiBubble
            ]}>
              <Text style={[
                styles.conversationText,
                turn.type === 'user_response' ? styles.userText : styles.aiText
              ]}>
                {turn.content}
              </Text>
              {turn.duration && (
                <Text style={styles.conversationDuration}>
                  {Math.floor(turn.duration / 60)}:{(turn.duration % 60).toString().padStart(2, '0')}
                </Text>
              )}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );

  // Feedback Screen
  if (feedback) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={['#0a0a0a', '#1a1a2e', '#16213e']}
          style={styles.gradient}
        >
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            <View style={styles.feedbackContainer}>
              {/* Header */}
              <View style={styles.feedbackHeader}>
                <View style={styles.feedbackIconContainer}>
                  <LinearGradient
                    colors={['#4ecdc4', '#44a08d']}
                    style={styles.feedbackIconGradient}
                  >
                    <CheckCircle color="white" size={32} strokeWidth={2} />
                  </LinearGradient>
                </View>
                <Text style={styles.feedbackTitle}>Interview Complete!</Text>
                <Text style={styles.feedbackSubtitle}>Here's your detailed feedback</Text>
              </View>

              {/* Overall Score */}
              <View style={styles.scoreCard}>
                <BlurView intensity={20} style={styles.scoreCardBlur}>
                  <LinearGradient
                    colors={['rgba(102, 126, 234, 0.1)', 'rgba(118, 75, 162, 0.1)']}
                    style={styles.scoreCardGradient}
                  >
                    <View style={styles.scoreCardContent}>
                      <Text style={styles.scoreLabel}>Overall Score</Text>
                      <Text style={styles.scoreValue}>{feedback.overallScore}</Text>
                      <Text style={styles.scoreOutOf}>out of 100</Text>
                      
                      <View style={styles.scoreBar}>
                        <View 
                          style={[
                            styles.scoreBarFill, 
                            { width: `${feedback.overallScore}%` }
                          ]} 
                        />
                      </View>
                    </View>
                  </LinearGradient>
                </BlurView>
              </View>

              {/* Strengths */}
              <View style={styles.feedbackSection}>
                <Text style={styles.sectionTitle}>
                  <CheckCircle color="#4ecdc4" size={20} strokeWidth={2} /> Strengths
                </Text>
                {feedback.strengths.map((strength, index) => (
                  <View key={index} style={styles.feedbackItem}>
                    <Text style={styles.feedbackItemText}>{strength}</Text>
                  </View>
                ))}
              </View>

              {/* Areas for Improvement */}
              <View style={styles.feedbackSection}>
                <Text style={styles.sectionTitle}>
                  <Target color="#f093fb" size={20} strokeWidth={2} /> Areas for Improvement
                </Text>
                {feedback.improvements.map((improvement, index) => (
                  <View key={index} style={styles.feedbackItem}>
                    <Text style={styles.feedbackItemText}>{improvement}</Text>
                  </View>
                ))}
              </View>

              {/* Detailed Question Feedback */}
              <View style={styles.feedbackSection}>
                <Text style={styles.sectionTitle}>
                  <MessageSquare color="#667eea" size={20} strokeWidth={2} /> Question-by-Question Feedback
                </Text>
                {feedback.detailedFeedback.map((item, index) => (
                  <View key={index} style={styles.questionFeedbackCard}>
                    <BlurView intensity={20} style={styles.questionFeedbackBlur}>
                      <View style={styles.questionFeedbackContent}>
                        <View style={styles.questionFeedbackHeader}>
                          <Text style={styles.questionNumber}>Question {index + 1}</Text>
                          <Text style={styles.questionScore}>{item.score}/100</Text>
                        </View>
                        <Text style={styles.questionFeedbackText}>{item.feedback}</Text>
                        <View style={styles.suggestions}>
                          {item.suggestions.map((suggestion, suggestionIndex) => (
                            <Text key={suggestionIndex} style={styles.suggestionText}>
                              <Text>• {suggestion}</Text>
                            </Text>
                          ))}
                        </View>
                      </View>
                    </BlurView>
                  </View>
                ))}
              </View>

              {/* Recommendations */}
              <View style={styles.feedbackSection}>
                <Text style={styles.sectionTitle}>
                  <BookOpen color="#feca57" size={20} strokeWidth={2} /> Recommendations
                </Text>
                {feedback.recommendations.map((recommendation, index) => (
                  <View key={index} style={styles.recommendationItem}>
                    <Text style={styles.recommendationText}>{recommendation}</Text>
                  </View>
                ))}
              </View>

              {/* Action Buttons */}
              <View style={styles.feedbackActions}>
                <TouchableOpacity style={styles.primaryActionButton} onPress={resetInterview}>
                  <LinearGradient
                    colors={['#667eea', '#764ba2']}
                    style={styles.primaryActionButtonGradient}
                  >
                    <RotateCcw color="white" size={20} strokeWidth={2} />
                    <Text style={styles.primaryActionButtonText}>Start New Interview</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity style={styles.secondaryActionButton}>
                  <Text style={styles.secondaryActionButtonText}>Share Results</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  // Interview Session Screen
  if (interviewStarted && currentQuestion) {
    const progress = totalQuestions > 0 ? (currentQuestionIndex + 1) / totalQuestions : 0;
    const hasResponse = responses.some(r => r.questionId === currentQuestion?.id);
    const stateDisplay = getConversationStateDisplay();

    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={['#0a0a0a', '#1a1a2e', '#16213e']}
          style={styles.gradient}
        >
          <View style={styles.sessionContainer}>
            {/* Session Header */}
            <View style={styles.sessionHeader}>
              <TouchableOpacity 
                style={styles.exitButton}
                onPress={resetInterview}
              >
                <Text style={styles.exitButtonText}>End Session</Text>
              </TouchableOpacity>
              
              <View style={styles.progressContainer}>
                <Text style={styles.progressText}>
                  {currentQuestionIndex + 1} of {totalQuestions}
                </Text>
                <View style={styles.progressBar}>
                  <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
                </View>
              </View>
              
              <View style={styles.timerContainer}>
                <Timer color="#667eea" size={16} strokeWidth={2} />
                <Text style={styles.timerText}>{formatTime(interviewTimeRemaining)}</Text>
              </View>
            </View>

            {/* Conversation State Indicator */}
            <View style={styles.conversationStateContainer}>
              <View style={[styles.conversationStateIndicator, { backgroundColor: `${stateDisplay.color}20` }]}>
                {conversationState === 'processing_response' || conversationState === 'generating_followup' ? (
                  <Loader color={stateDisplay.color} size={16} strokeWidth={2} />
                ) : (
                  <Brain color={stateDisplay.color} size={16} strokeWidth={2} />
                )}
                <Text style={[styles.conversationStateText, { color: stateDisplay.color }]}>
                  {stateDisplay.text}
                </Text>
              </View>
            </View>

            {/* AI Interviewer */}
            <View style={styles.interviewerContainer}>
              <View style={styles.interviewerAvatar}>
                <LinearGradient
                  colors={['#667eea', '#764ba2']}
                  style={styles.interviewerGradient}
                >
                  <Brain color="white" size={48} strokeWidth={2} />
                </LinearGradient>
              </View>
              <Text style={styles.interviewerName}>AI Interviewer</Text>
              <Text style={styles.interviewerRole}>Senior Technical Recruiter</Text>
            </View>

            {/* Current Question */}
            <View style={styles.questionContainer}>
              <BlurView intensity={20} style={styles.questionBlur}>
                <View style={styles.questionContent}>
                  <Text style={styles.questionText}>
                    {currentQuestion?.question}
                  </Text>
                  
                  <TouchableOpacity 
                    style={styles.playQuestionButton}
                    onPress={isPlaying ? stopPlaying : playQuestion}
                    disabled={conversationState === 'ai_speaking'}
                  >
                    <LinearGradient
                      colors={['rgba(102, 126, 234, 0.2)', 'rgba(118, 75, 162, 0.2)']}
                      style={styles.playQuestionButtonGradient}
                    >
                      {isPlaying ? (
                        <Pause color="#667eea" size={20} strokeWidth={2} />
                      ) : (
                        <Play color="#667eea" size={20} strokeWidth={2} />
                      )}
                      <Text style={styles.playQuestionButtonText}>
                        {isPlaying ? 'Stop' : 'Replay Question'}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </BlurView>
            </View>

            {/* Current Transcript */}
            {currentTranscript && (
              <View style={styles.transcriptContainer}>
                <Text style={styles.transcriptLabel}>Live Transcript:</Text>
                <Text style={styles.transcriptText}>{currentTranscript}</Text>
              </View>
            )}

            {/* Recording Controls */}
            <View style={styles.recordingControls}>
              {currentQuestionIndex > 0 && (
                <TouchableOpacity 
                  style={styles.navButton} 
                  onPress={previousQuestion}
                  disabled={conversationState !== 'waiting_for_response'}
                >
                  <ArrowLeft color={conversationState === 'waiting_for_response' ? "rgba(255, 255, 255, 0.8)" : "rgba(255, 255, 255, 0.3)"} size={24} strokeWidth={2} />
                </TouchableOpacity>
              )}
              
              <View style={styles.recordingButtonContainer}>
                <GestureDetector gesture={Gesture.Tap().onEnd(() => runOnJS(handleRecordToggle)())}>
                  <Animated.View style={[styles.recordButton, recordStyle]}>
                    <TouchableOpacity 
                      onPress={handleRecordToggle}
                      disabled={conversationState !== 'waiting_for_response'}
                    >
                      <LinearGradient
                        colors={isRecording ? ['#ff6b6b', '#ff8e8e'] : ['#667eea', '#764ba2']}
                        style={[
                          styles.recordButtonGradient,
                          conversationState !== 'waiting_for_response' && styles.recordButtonDisabled
                        ]}
                      >
                        <Animated.View style={pulseStyle}>
                          {isRecording ? (
                            <Square color="white" size={32} strokeWidth={2} />
                          ) : (
                            <Mic color="white" size={32} strokeWidth={2} />
                          )}
                        </Animated.View>
                      </LinearGradient>
                    </TouchableOpacity>
                  </Animated.View>
                </GestureDetector>
                
                <TouchableOpacity 
                  style={styles.manualInputButton}
                  onPress={() => setShowManualInput(true)}
                  disabled={conversationState !== 'waiting_for_response'}
                >
                  <MessageSquare color={conversationState === 'waiting_for_response' ? "rgba(255, 255, 255, 0.7)" : "rgba(255, 255, 255, 0.3)"} size={20} strokeWidth={2} />
                </TouchableOpacity>
              </View>
              
              <TouchableOpacity 
                style={[styles.navButton, !hasResponse && styles.navButtonDisabled]} 
                onPress={handleNextQuestion}
                disabled={!hasResponse || conversationState !== 'waiting_for_response'}
              >
                {currentQuestionIndex === totalQuestions - 1 ? (
                  <CheckCircle color={hasResponse && conversationState === 'waiting_for_response' ? "#4ecdc4" : "rgba(255, 255, 255, 0.3)"} size={24} strokeWidth={2} />
                ) : (
                  <ArrowRight color={hasResponse && conversationState === 'waiting_for_response' ? "rgba(255, 255, 255, 0.8)" : "rgba(255, 255, 255, 0.3)"} size={24} strokeWidth={2} />
                )}
              </TouchableOpacity>
            </View>

            {/* Recording Status */}
            {isRecording && (
              <View style={styles.recordingStatus}>
                <View style={styles.recordingIndicator}>
                  <Animated.View style={[styles.recordingDot, pulseStyle]} />
                  <Text style={styles.recordingText}>
                    {Platform.OS === 'web' ? 'Listening...' : 'Recording...'}
                  </Text>
                </View>
              </View>
            )}

            {/* Response Status */}
            {hasResponse && (
              <View style={styles.responseStatus}>
                <CheckCircle color="#4ecdc4" size={16} strokeWidth={2} />
                <Text style={styles.responseStatusText}>Response recorded</Text>
              </View>
            )}

            {/* Conversation History */}
            {conversationHistory.length > 0 && (
              <ConversationHistory />
            )}
          </View>

          {/* Manual Input Modal */}
          <Modal
            visible={showManualInput}
            transparent
            animationType="slide"
            onRequestClose={() => setShowManualInput(false)}
          >
            <View style={styles.modalOverlay}>
              <BlurView intensity={20} style={styles.modalBlur}>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Type Your Response</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Enter your response here..."
                    placeholderTextColor="rgba(255, 255, 255, 0.5)"
                    value={manualResponse}
                    onChangeText={setManualResponse}
                    multiline
                    numberOfLines={6}
                    textAlignVertical="top"
                  />
                  <View style={styles.modalActions}>
                    <TouchableOpacity 
                      style={styles.modalCancelButton}
                      onPress={() => setShowManualInput(false)}
                    >
                      <Text style={styles.modalCancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.modalSubmitButton}
                      onPress={handleManualSubmit}
                    >
                      <LinearGradient
                        colors={['#667eea', '#764ba2']}
                        style={styles.modalSubmitButtonGradient}
                      >
                        <Send color="white" size={16} strokeWidth={2} />
                        <Text style={styles.modalSubmitButtonText}>Submit</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>
              </BlurView>
            </View>
          </Modal>

          {/* Permission Modal */}
          <PermissionModal />
        </LinearGradient>
      </SafeAreaView>
    );
  }

  // Main Interview Selection Screen
  const InterviewTypeCard = ({ type, onPress }: { type: any; onPress: (type: any) => void }) => {
    const scale = useSharedValue(1);

    const cardTap = Gesture.Tap()
      .onStart(() => {
        scale.value = withSpring(0.95);
      })
      .onEnd(() => {
        scale.value = withSpring(1);
        runOnJS(onPress)(type);
      });

    const animatedStyle = useAnimatedStyle(() => {
      return {
        transform: [{ scale: scale.value }],
      };
    });

    return (
      <GestureDetector gesture={cardTap}>
        <Animated.View style={[styles.typeCard, animatedStyle]}>
          <BlurView intensity={20} style={styles.typeCardBlur}>
            <LinearGradient
              colors={[`${type.color}20`, `${type.color}10`]}
              style={styles.typeCardGradient}
            >
              <View style={styles.typeCardContent}>
                <View style={styles.typeCardHeader}>
                  <View style={[styles.typeIcon, { backgroundColor: `${type.color}20` }]}>
                    <type.icon color={type.color} size={24} strokeWidth={2} />
                  </View>
                  <View style={styles.typeCardMeta}>
                    <Text style={styles.typeDifficulty}>{type.difficulty}</Text>
                    <Text style={styles.typeDuration}>{type.duration}</Text>
                  </View>
                </View>
                
                <Text style={styles.typeTitle}>{type.title}</Text>
                <Text style={styles.typeDescription}>{type.description}</Text>
                
                <View style={styles.typeStats}>
                  <View style={styles.typeStat}>
                    <Clock color="rgba(255, 255, 255, 0.6)" size={16} />
                    <Text style={styles.typeStatText}>{type.duration}</Text>
                  </View>
                  <View style={styles.typeStat}>
                    <Brain color="rgba(255, 255, 255, 0.6)" size={16} />
                    <Text style={styles.typeStatText}>{type.questions} questions</Text>
                  </View>
                </View>
              </View>
            </LinearGradient>
          </BlurView>
        </Animated.View>
      </GestureDetector>
    );
  };

  const SessionCard = ({ session }: { session: any }) => {
    const getScoreColor = (score: number) => {
      if (score >= 90) return '#4ecdc4';
      if (score >= 80) return '#667eea';
      if (score >= 70) return '#f093fb';
      return '#ff6b6b';
    };

    return (
      <View style={styles.sessionCard}>
        <BlurView intensity={20} style={styles.sessionCardBlur}>
          <LinearGradient
            colors={['rgba(102, 126, 234, 0.1)', 'rgba(118, 75, 162, 0.1)']}
            style={styles.sessionCardGradient}
          >
            <View style={styles.sessionCardContent}>
              <Image source={{ uri: session.avatar }} style={styles.sessionAvatar} />
              <View style={styles.sessionInfo}>
                <Text style={styles.sessionType}>{session.type}</Text>
                <Text style={styles.sessionFeedback}>{session.feedback}</Text>
                <Text style={styles.sessionDate}>{session.date}</Text>
              </View>
              <View style={styles.sessionScore}>
                <Text style={[styles.sessionScoreText, { color: getScoreColor(session.score) }]}>
                  {session.score}
                </Text>
                <Text style={styles.sessionScoreLabel}>Score</Text>
              </View>
            </View>
          </LinearGradient>
        </BlurView>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#0a0a0a', '#1a1a2e', '#16213e']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header */}
          <Animated.View style={[styles.header, headerStyle]}>
            <Text style={styles.headerTitle}>AI Mock Interview</Text>
            <Text style={styles.headerSubtitle}>
              Practice with AI-powered interviewers and get instant feedback
            </Text>
          </Animated.View>

          {/* Interview Types */}
          <Animated.View style={[styles.typesSection, cardsStyle]}>
            <Text style={styles.sectionTitle}>Choose Interview Type</Text>
            {interviewTypes.map((type) => (
              <InterviewTypeCard
                key={type.id}
                type={type}
                onPress={handleStartInterview}
              />
            ))}
          </Animated.View>

          {/* Recent Sessions */}
          <Animated.View style={[styles.sessionsSection, cardsStyle]}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Sessions</Text>
              <TouchableOpacity>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>
            
            {recentSessions.map((session) => (
              <SessionCard key={session.id} session={session} />
            ))}
          </Animated.View>

          {/* Performance Stats */}
          <Animated.View style={[styles.statsSection, cardsStyle]}>
            <Text style={styles.sectionTitle}>Your Progress</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <TrendingUp color="#4ecdc4" size={24} />
                <Text style={styles.statValue}>89</Text>
                <Text style={styles.statLabel}>Avg Score</Text>
              </View>
              <View style={styles.statCard}>
                <Clock color="#667eea" size={24} />
                <Text style={styles.statValue}>24</Text>
                <Text style={styles.statLabel}>Hours Practiced</Text>
              </View>
              <View style={styles.statCard}>
                <Zap color="#f093fb" size={24} />
                <Text style={styles.statValue}>156</Text>
                <Text style={styles.statLabel}>Questions Answered</Text>
              </View>
            </View>
          </Animated.View>
        </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 32,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: 'SpaceGrotesk-Bold',
    color: 'white',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 24,
  },
  typesSection: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'SpaceGrotesk-SemiBold',
    color: 'white',
    marginBottom: 20,
  },
  typeCard: {
    marginBottom: 16,
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
  },
  typeCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  typeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeCardMeta: {
    alignItems: 'flex-end',
  },
  typeDifficulty: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#667eea',
    marginBottom: 4,
  },
  typeDuration: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  typeTitle: {
    fontSize: 18,
    fontFamily: 'SpaceGrotesk-SemiBold',
    color: 'white',
    marginBottom: 8,
  },
  typeDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 20,
    marginBottom: 16,
  },
  typeStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  typeStat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeStatText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: 'rgba(255, 255, 255, 0.6)',
    marginLeft: 6,
  },
  sessionsSection: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  viewAllText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#667eea',
  },
  sessionCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  sessionCardBlur: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  sessionCardGradient: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  sessionCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  sessionAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 16,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionType: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-SemiBold',
    color: 'white',
    marginBottom: 4,
  },
  sessionFeedback: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  sessionDate: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  sessionScore: {
    alignItems: 'center',
  },
  sessionScoreText: {
    fontSize: 24,
    fontFamily: 'SpaceGrotesk-Bold',
    marginBottom: 4,
  },
  sessionScoreLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  statsSection: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statValue: {
    fontSize: 24,
    fontFamily: 'SpaceGrotesk-Bold',
    color: 'white',
    marginTop: 12,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
  },
  // Session Screen Styles
  sessionContainer: {
    flex: 1,
    paddingHorizontal: 24,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 20,
  },
  exitButton: {
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
  },
  exitButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#ff6b6b',
  },
  progressContainer: {
    alignItems: 'center',
    flex: 1,
  },
  progressText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: 'white',
    marginBottom: 8,
  },
  progressBar: {
    width: 120,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#667eea',
    borderRadius: 2,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(102, 126, 234, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  timerText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#667eea',
    marginLeft: 6,
  },
  conversationStateContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  conversationStateIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  conversationStateText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    marginLeft: 8,
  },
  interviewerContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  interviewerAvatar: {
    marginBottom: 16,
  },
  interviewerGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.4,
    shadowRadius: 30,
    elevation: 20,
  },
  interviewerName: {
    fontSize: 20,
    fontFamily: 'SpaceGrotesk-SemiBold',
    color: 'white',
    marginBottom: 4,
  },
  interviewerRole: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  questionContainer: {
    marginBottom: 32,
  },
  questionBlur: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  questionContent: {
    padding: 24,
  },
  questionText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: 'white',
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 20,
  },
  playQuestionButton: {
    alignSelf: 'center',
    borderRadius: 12,
    overflow: 'hidden',
  },
  playQuestionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(102, 126, 234, 0.3)',
  },
  playQuestionButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#667eea',
    marginLeft: 8,
  },
  transcriptContainer: {
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(102, 126, 234, 0.2)',
  },
  transcriptLabel: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#667eea',
    marginBottom: 8,
  },
  transcriptText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'white',
    lineHeight: 20,
  },
  recordingControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  navButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  recordingButtonContainer: {
    alignItems: 'center',
  },
  recordButton: {
    borderRadius: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 20,
    marginBottom: 12,
  },
  recordButtonGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordButtonDisabled: {
    opacity: 0.5,
  },
  manualInputButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  recordingStatus: {
    alignItems: 'center',
    marginBottom: 20,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ff6b6b',
    marginRight: 8,
  },
  recordingText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#ff6b6b',
  },
  responseStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(78, 205, 196, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(78, 205, 196, 0.3)',
    marginBottom: 20,
  },
  responseStatusText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#4ecdc4',
    marginLeft: 8,
  },
  conversationHistory: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginTop: 20,
    maxHeight: 200,
  },
  conversationHistoryTitle: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-SemiBold',
    color: 'white',
    marginBottom: 12,
  },
  conversationScrollView: {
    flex: 1,
  },
  conversationTurn: {
    marginBottom: 12,
  },
  conversationBubble: {
    padding: 12,
    borderRadius: 12,
    maxWidth: '80%',
  },
  userBubble: {
    backgroundColor: 'rgba(102, 126, 234, 0.2)',
    alignSelf: 'flex-end',
  },
  aiBubble: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignSelf: 'flex-start',
  },
  conversationText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    lineHeight: 18,
  },
  userText: {
    color: 'white',
  },
  aiText: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
  conversationDuration: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 4,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalBlur: {
    borderRadius: 20,
    overflow: 'hidden',
    width: '100%',
    maxWidth: 400,
  },
  modalContent: {
    backgroundColor: 'rgba(26, 26, 46, 0.95)',
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'SpaceGrotesk-SemiBold',
    color: 'white',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: 'white',
    minHeight: 120,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    marginRight: 12,
  },
  modalCancelButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  modalSubmitButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalSubmitButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  modalSubmitButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: 'white',
    marginLeft: 8,
  },
  // Permission Modal Styles
  permissionModalBlur: {
    borderRadius: 24,
    overflow: 'hidden',
    width: '100%',
    maxWidth: 400,
  },
  permissionModalContent: {
    backgroundColor: 'rgba(26, 26, 46, 0.95)',
    padding: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  permissionIconContainer: {
    marginBottom: 24,
  },
  permissionModalTitle: {
    fontSize: 22,
    fontFamily: 'SpaceGrotesk-Bold',
    color: 'white',
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionModalText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  permissionFeatures: {
    width: '100%',
    marginBottom: 32,
  },
  permissionFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  permissionFeatureText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: 'rgba(255, 255, 255, 0.8)',
    marginLeft: 12,
  },
  permissionModalActions: {
    flexDirection: 'row',
    width: '100%',
  },
  permissionCancelButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    marginRight: 12,
  },
  permissionCancelButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  permissionAllowButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  permissionAllowButtonGradient: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  permissionAllowButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: 'white',
  },
  // Feedback Screen Styles
  feedbackContainer: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
  },
  feedbackHeader: {
    alignItems: 'center',
    marginBottom: 40,
  },
  feedbackIconContainer: {
    marginBottom: 24,
  },
  feedbackIconGradient: {
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
  feedbackTitle: {
    fontSize: 28,
    fontFamily: 'SpaceGrotesk-Bold',
    color: 'white',
    marginBottom: 8,
    textAlign: 'center',
  },
  feedbackSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  scoreCard: {
    marginBottom: 32,
    borderRadius: 20,
    overflow: 'hidden',
  },
  scoreCardBlur: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  scoreCardGradient: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  scoreCardContent: {
    padding: 32,
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 8,
  },
  scoreValue: {
    fontSize: 48,
    fontFamily: 'SpaceGrotesk-Bold',
    color: 'white',
    marginBottom: 4,
  },
  scoreOutOf: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 20,
  },
  scoreBar: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: '100%',
    backgroundColor: '#4ecdc4',
    borderRadius: 4,
  },
  feedbackSection: {
    marginBottom: 32,
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
  questionFeedbackCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  questionFeedbackBlur: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  questionFeedbackContent: {
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  questionFeedbackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  questionNumber: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-SemiBold',
    color: 'white',
  },
  questionScore: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Bold',
    color: '#4ecdc4',
  },
  questionFeedbackText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 20,
    marginBottom: 16,
  },
  suggestions: {
    paddingLeft: 16,
  },
  suggestionText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 18,
    marginBottom: 4,
  },
  recommendationItem: {
    backgroundColor: 'rgba(254, 202, 87, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(254, 202, 87, 0.2)',
  },
  recommendationText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 20,
  },
  feedbackActions: {
    marginTop: 20,
  },
  primaryActionButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  primaryActionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  primaryActionButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: 'white',
    marginLeft: 8,
  },
  secondaryActionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  secondaryActionButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
});