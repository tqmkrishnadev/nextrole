import { useState, useCallback, useRef } from 'react';
import { Platform, Alert } from 'react-native';
import AIInterviewService, { InterviewQuestion, InterviewResponse, InterviewFeedback, ConversationTurn } from '@/services/aiInterviewService';
import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';

export interface UseAIInterviewReturn {
  // State
  currentQuestion: InterviewQuestion | null;
  currentQuestionIndex: number;
  totalQuestions: number;
  isRecording: boolean;
  isPlaying: boolean;
  isProcessing: boolean;
  responses: InterviewResponse[];
  feedback: InterviewFeedback | null;
  permissionsGranted: boolean;
  interviewStarted: boolean;
  conversationState: 'idle' | 'ai_speaking' | 'waiting_for_response' | 'user_speaking' | 'processing_response' | 'generating_followup';
  conversationHistory: ConversationTurn[];
  interviewTimeRemaining: number;
  currentTranscript: string;
  
  // Actions
  startInterview: (type: 'behavioral' | 'technical' | 'leadership') => Promise<void>;
  nextQuestion: () => void;
  previousQuestion: () => void;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  playQuestion: () => Promise<void>;
  stopPlaying: () => void;
  submitResponse: (response: string) => void;
  finishInterview: () => Promise<void>;
  resetInterview: () => void;
  requestPermissions: () => Promise<boolean>;
}

export function useAIInterview(): UseAIInterviewReturn {
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [responses, setResponses] = useState<InterviewResponse[]>([]);
  const [feedback, setFeedback] = useState<InterviewFeedback | null>(null);
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [conversationState, setConversationState] = useState<'idle' | 'ai_speaking' | 'waiting_for_response' | 'user_speaking' | 'processing_response' | 'generating_followup'>('idle');
  const [conversationHistory, setConversationHistory] = useState<ConversationTurn[]>([]);
  const [interviewTimeRemaining, setInterviewTimeRemaining] = useState(600); // 10 minutes
  const [currentTranscript, setCurrentTranscript] = useState('');
  
  const aiService = AIInterviewService.getInstance();
  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const recordingStartTime = useRef<number>(0);
  const speechRecognitionRef = useRef<any>(null);
  const isRecordingRef = useRef(false);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const interviewTimerRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const currentQuestion = questions[currentQuestionIndex] || null;
  const totalQuestions = questions.length;

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    try {
      if (Platform.OS === 'web') {
        if ('navigator' in window && 'mediaDevices' in navigator) {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop());
            setPermissionsGranted(true);
            return true;
          } catch (error) {
            console.error('Microphone permission denied:', error);
            setPermissionsGranted(false);
            return false;
          }
        }
        setPermissionsGranted(false);
        return false;
      } else {
        const { status } = await Audio.requestPermissionsAsync();
        const granted = status === 'granted';
        setPermissionsGranted(granted);
        
        if (!granted) {
          Alert.alert(
            'Audio Permission Required',
            'Please allow microphone access to record your interview responses.',
            [
              { text: 'Cancel', style: 'cancel' },
              { 
                text: 'Settings', 
                onPress: () => {
                  if (Platform.OS === 'ios') {
                    Alert.alert(
                      'Enable Microphone Access',
                      'Go to Settings > Privacy & Security > Microphone > Next-Role.AI and enable access.',
                      [{ text: 'OK' }]
                    );
                  }
                }
              }
            ]
          );
        }
        
        return granted;
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
      setPermissionsGranted(false);
      return false;
    }
  }, []);

  const startInterviewTimer = useCallback(() => {
    if (interviewTimerRef.current) {
      clearInterval(interviewTimerRef.current);
    }

    interviewTimerRef.current = setInterval(() => {
      setInterviewTimeRemaining(prev => {
        if (prev <= 1) {
          finishInterview();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const startInterview = useCallback(async (type: 'behavioral' | 'technical' | 'leadership') => {
    try {
      console.log('Starting interview with type:', type);
      
      const interviewQuestions = aiService.generateQuestions(type, 5);
      console.log('Generated questions:', interviewQuestions.length);
      
      if (interviewQuestions.length === 0) {
        Alert.alert(
          'Error',
          'Failed to generate interview questions. Please try again.',
          [{ text: 'OK' }]
        );
        return;
      }

      setQuestions(interviewQuestions);
      setCurrentQuestionIndex(0);
      setResponses([]);
      setFeedback(null);
      setInterviewStarted(true);
      setConversationState('idle');
      setConversationHistory([]);
      setInterviewTimeRemaining(600); // Reset to 10 minutes
      aiService.clearConversationHistory();
      
      console.log('Interview started successfully');
      
      // Request permissions
      const hasPermissions = await requestPermissions();
      if (!hasPermissions) {
        console.log('Permissions not granted, but interview can continue with manual input');
      }

      // Start the interview timer
      startInterviewTimer();

      // Start with AI introduction
      setTimeout(() => {
        playIntroduction(type);
      }, 1000);
      
    } catch (error) {
      console.error('Error starting interview:', error);
      Alert.alert(
        'Error',
        'Failed to start interview. Please try again.',
        [{ text: 'OK' }]
      );
    }
  }, [requestPermissions, startInterviewTimer]);

  const playIntroduction = useCallback(async (type: string) => {
    const introText = `Hello! I'm your AI interviewer today. We'll be conducting a ${type} interview that will last about 10 minutes. I'll ask you several questions and follow up based on your responses. Let's begin with our first question.`;
    
    const introTurn: ConversationTurn = {
      id: `intro_${Date.now()}`,
      type: 'ai_question',
      content: introText,
      timestamp: new Date().toISOString()
    };

    setConversationHistory(prev => [...prev, introTurn]);
    aiService.addConversationTurn(introTurn);

    await playAIResponse(introText);
    
    // After introduction, ask the first question
    setTimeout(() => {
      playCurrentQuestion();
    }, 1000);
  }, []);

  const playCurrentQuestion = useCallback(async () => {
    if (!currentQuestion || isPlaying || conversationState === 'ai_speaking') return;

    try {
      console.log('Playing current question:', currentQuestion.question.substring(0, 50) + '...');
      
      const questionTurn: ConversationTurn = {
        id: `question_${currentQuestion.id}_${Date.now()}`,
        type: 'ai_question',
        content: currentQuestion.question,
        timestamp: new Date().toISOString()
      };

      setConversationHistory(prev => [...prev, questionTurn]);
      aiService.addConversationTurn(questionTurn);

      await playAIResponse(currentQuestion.question);
      
    } catch (error) {
      console.error('Error playing question:', error);
      setConversationState('waiting_for_response');
    }
  }, [currentQuestion, isPlaying, conversationState]);

  const playAIResponse = useCallback(async (text: string) => {
    setConversationState('ai_speaking');
    setIsPlaying(true);

    try {
      if (Platform.OS === 'web') {
        // Try ElevenLabs first, then fallback to browser speech
        try {
          const audioUrl = await aiService.textToSpeech(text);
          if (audioUrl && audioUrl.startsWith('data:')) {
            const audio = new Audio(audioUrl);
            audio.onended = () => {
              setIsPlaying(false);
              setConversationState('waiting_for_response');
              console.log('AI finished speaking, waiting for user response');
            };
            audio.onerror = () => {
              setIsPlaying(false);
              fallbackToWebSpeech(text);
            };
            await audio.play();
          } else {
            fallbackToWebSpeech(text);
          }
        } catch (error) {
          console.error('ElevenLabs TTS error:', error);
          fallbackToWebSpeech(text);
        }
      } else {
        // Use Expo Speech for mobile
        const speechOptions = {
          language: 'en-US',
          pitch: 1.0,
          rate: 0.85,
          quality: Speech.VoiceQuality.Enhanced,
          onDone: () => {
            setIsPlaying(false);
            setConversationState('waiting_for_response');
            console.log('AI finished speaking, waiting for user response');
          },
          onError: (error: any) => {
            console.error('Speech error:', error);
            setIsPlaying(false);
            setConversationState('waiting_for_response');
          },
          onStopped: () => {
            setIsPlaying(false);
            setConversationState('waiting_for_response');
          },
        };

        await Speech.speak(text, speechOptions);
      }
    } catch (error) {
      console.error('Error playing AI response:', error);
      setIsPlaying(false);
      setConversationState('waiting_for_response');
    }
  }, []);

  const fallbackToWebSpeech = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      // Cancel any existing speech
      speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.85;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      utterance.lang = 'en-US';
      
      utterance.onstart = () => {
        console.log('Web speech started');
      };
      
      utterance.onend = () => {
        setIsPlaying(false);
        setConversationState('waiting_for_response');
        console.log('AI finished speaking, waiting for user response');
        currentUtteranceRef.current = null;
      };
      
      utterance.onerror = (error) => {
        console.error('Web speech error:', error);
        setIsPlaying(false);
        setConversationState('waiting_for_response');
        currentUtteranceRef.current = null;
      };
      
      currentUtteranceRef.current = utterance;
      speechSynthesis.speak(utterance);
    } else {
      setIsPlaying(false);
      setConversationState('waiting_for_response');
    }
  }, []);

  const nextQuestion = useCallback(() => {
    if (currentQuestionIndex < questions.length - 1) {
      console.log('Moving to next question');
      setCurrentQuestionIndex(prev => prev + 1);
      setConversationState('idle');
      
      // Auto-play the next question after a short delay
      setTimeout(() => {
        playCurrentQuestion();
      }, 1000);
    } else {
      console.log('Interview complete, finishing...');
      finishInterview();
    }
  }, [currentQuestionIndex, questions.length, playCurrentQuestion]);

  const previousQuestion = useCallback(() => {
    if (currentQuestionIndex > 0) {
      console.log('Moving to previous question');
      setCurrentQuestionIndex(prev => prev - 1);
      setConversationState('idle');
      
      // Auto-play the previous question after a short delay
      setTimeout(() => {
        playCurrentQuestion();
      }, 1000);
    }
  }, [currentQuestionIndex, playCurrentQuestion]);

  const playQuestion = useCallback(async () => {
    await playCurrentQuestion();
  }, [playCurrentQuestion]);

  const stopPlaying = useCallback(() => {
    try {
      if (Platform.OS === 'web') {
        if ('speechSynthesis' in window) {
          speechSynthesis.cancel();
        }
        if (currentUtteranceRef.current) {
          currentUtteranceRef.current = null;
        }
      } else {
        Speech.stop();
      }
    } catch (error) {
      console.error('Error stopping speech:', error);
    } finally {
      setIsPlaying(false);
      if (conversationState === 'ai_speaking') {
        setConversationState('waiting_for_response');
      }
    }
  }, [conversationState]);

  const startRecording = useCallback(async () => {
    try {
      console.log('Starting recording...');
      
      if (isRecording || isRecordingRef.current) {
        console.log('Recording already in progress');
        return;
      }

      if (conversationState !== 'waiting_for_response') {
        console.log('Not ready for recording, current state:', conversationState);
        return;
      }

      if (!permissionsGranted) {
        console.log('Permissions not granted, requesting...');
        const hasPermissions = await requestPermissions();
        if (!hasPermissions) {
          Alert.alert(
            'Permission Required',
            'Microphone access is required to record your response. Please grant permission or use manual text input.',
            [{ text: 'OK' }]
          );
          return;
        }
      }

      // Stop any playing audio before recording
      stopPlaying();

      setIsRecording(true);
      isRecordingRef.current = true;
      recordingStartTime.current = Date.now();
      setConversationState('user_speaking');
      setCurrentTranscript('');

      if (Platform.OS === 'web') {
        // Use MediaRecorder for better audio quality
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            }
          });
          
          audioChunksRef.current = [];
          const mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'audio/webm;codecs=opus'
          });
          
          mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              audioChunksRef.current.push(event.data);
            }
          };
          
          mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' });
            
            // Try to transcribe with OpenAI Whisper
            const transcript = await aiService.speechToText(audioBlob);
            
            if (transcript && transcript.trim()) {
              setCurrentTranscript(transcript);
              submitResponse(transcript.trim());
            } else {
              // Fallback to speech recognition
              startWebSpeechRecognition();
            }
            
            // Clean up
            stream.getTracks().forEach(track => track.stop());
          };
          
          mediaRecorderRef.current = mediaRecorder;
          mediaRecorder.start();
          
        } catch (error) {
          console.error('MediaRecorder error:', error);
          // Fallback to speech recognition
          startWebSpeechRecognition();
        }
      } else {
        // Mobile recording with Expo Audio
        try {
          console.log('Setting up mobile recording...');
          
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: true,
            playsInSilentModeIOS: true,
            shouldDuckAndroid: true,
            playThroughEarpieceAndroid: false,
            staysActiveInBackground: false,
          });

          const recording = new Audio.Recording();
          
          const recordingOptions = {
            ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
            android: {
              extension: '.m4a',
              outputFormat: Audio.AndroidOutputFormat.MPEG_4,
              audioEncoder: Audio.AndroidAudioEncoder.AAC,
              sampleRate: 44100,
              numberOfChannels: 2,
              bitRate: 128000,
            },
            ios: {
              extension: '.m4a',
              outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
              audioQuality: Audio.IOSAudioQuality.HIGH,
              sampleRate: 44100,
              numberOfChannels: 2,
              bitRate: 128000,
              linearPCMBitDepth: 16,
              linearPCMIsBigEndian: false,
              linearPCMIsFloat: false,
            },
            web: {
              mimeType: 'audio/webm;codecs=opus',
              bitsPerSecond: 128000,
            },
          };

          await recording.prepareToRecordAsync(recordingOptions);
          await recording.startAsync();
          
          recordingRef.current = recording;
          console.log('Mobile recording started successfully');
          
        } catch (error) {
          console.error('Error starting mobile recording:', error);
          setIsRecording(false);
          isRecordingRef.current = false;
          recordingRef.current = null;
          setConversationState('waiting_for_response');
          
          Alert.alert(
            'Recording Error',
            'Unable to start recording. Please check your microphone permissions and try again.',
            [{ text: 'OK' }]
          );
        }
      }
    } catch (error) {
      console.error('Error starting recording:', error);
      setIsRecording(false);
      isRecordingRef.current = false;
      recordingRef.current = null;
      setConversationState('waiting_for_response');
    }
  }, [isRecording, permissionsGranted, requestPermissions, stopPlaying, conversationState]);

  const startWebSpeechRecognition = useCallback(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;

      let finalTranscript = '';

      recognition.onstart = () => {
        console.log('Speech recognition started');
      };

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        
        setCurrentTranscript(finalTranscript + interimTranscript);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
        isRecordingRef.current = false;
        speechRecognitionRef.current = null;
        setConversationState('waiting_for_response');
        
        if (event.error === 'not-allowed') {
          Alert.alert(
            'Microphone Access Denied',
            'Please allow microphone access and try again.',
            [{ text: 'OK' }]
          );
        } else if (event.error === 'no-speech') {
          Alert.alert(
            'No Speech Detected',
            'Please speak clearly and try again.',
            [{ text: 'OK' }]
          );
        }
      };

      recognition.onend = () => {
        console.log('Speech recognition ended');
        if (finalTranscript.trim()) {
          submitResponse(finalTranscript.trim());
        }
        setIsRecording(false);
        isRecordingRef.current = false;
        speechRecognitionRef.current = null;
      };

      speechRecognitionRef.current = recognition;
      recognition.start();
    } else {
      setIsRecording(false);
      isRecordingRef.current = false;
      setConversationState('waiting_for_response');
      Alert.alert(
        'Speech Recognition Not Supported',
        'Your browser does not support speech recognition. Please type your response instead.',
        [{ text: 'OK' }]
      );
    }
  }, []);

  const stopRecording = useCallback(async () => {
    try {
      console.log('Stopping recording...');
      
      setIsRecording(false);
      isRecordingRef.current = false;
      const duration = Date.now() - recordingStartTime.current;

      if (Platform.OS === 'web') {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
        
        if (speechRecognitionRef.current) {
          speechRecognitionRef.current.stop();
          speechRecognitionRef.current = null;
        }
      } else {
        // Mobile recording cleanup
        const currentRecording = recordingRef.current;
        recordingRef.current = null;
        
        if (currentRecording) {
          try {
            console.log('Stopping mobile recording...');
            
            await currentRecording.stopAndUnloadAsync();
            const uri = currentRecording.getURI();
            
            console.log('Recording saved to:', uri);
            
            // Generate a simulated response for mobile (since we don't have Whisper integration for mobile files)
            const simulatedResponse = generateSimulatedResponse(duration);
            console.log('Generated simulated response:', simulatedResponse);
            
            submitResponse(simulatedResponse);
            
          } catch (error) {
            console.error('Error stopping recording:', error);
            
            if (error instanceof Error && error.message.includes('Recorder does not exist')) {
              console.log('Recorder was already cleaned up, continuing normally');
            } else {
              Alert.alert(
                'Recording Error',
                'There was an issue with your recording. Please try again.',
                [{ text: 'OK' }]
              );
            }
          } finally {
            try {
              await Audio.setAudioModeAsync({
                allowsRecordingIOS: false,
                playsInSilentModeIOS: true,
                shouldDuckAndroid: true,
                playThroughEarpieceAndroid: false,
                staysActiveInBackground: false,
              });
            } catch (audioModeError) {
              console.error('Error resetting audio mode:', audioModeError);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error stopping recording:', error);
      setIsRecording(false);
      isRecordingRef.current = false;
      recordingRef.current = null;
      setConversationState('waiting_for_response');
    }
  }, []);

  const generateSimulatedResponse = useCallback((duration: number) => {
    const responses = [
      "In my previous role as a product manager, I faced a challenging situation where our team had conflicting priorities and tight deadlines. I organized a stakeholder meeting to align on objectives, created a clear roadmap with milestones, and established regular check-ins to track progress. This approach helped us deliver the project on time and improved team collaboration.",
      
      "I encountered this challenge when working on a cross-functional project with engineering and design teams. The key was establishing clear communication channels and setting realistic expectations. I implemented daily standups and weekly retrospectives, which helped identify blockers early and maintain momentum throughout the project.",
      
      "This reminds me of a situation where I had to learn a new technology stack quickly to meet project requirements. I dedicated time each day to hands-on practice, found a mentor within the team, and applied the new skills to small tasks before taking on larger responsibilities. This systematic approach helped me become proficient within the timeline.",
      
      "I faced a similar challenge when managing a team through a major organizational change. I focused on transparent communication, provided regular updates about the transition, and created opportunities for team members to voice their concerns. By maintaining open dialogue and supporting individual needs, we successfully navigated the change with minimal disruption.",
      
      "In my experience, this type of situation requires a balance of technical skills and interpersonal communication. I typically start by gathering all relevant information, consulting with subject matter experts, and then developing a comprehensive plan with clear timelines and deliverables. Regular progress reviews help ensure we stay on track and can adjust as needed."
    ];
    
    const baseIndex = Math.floor(duration / 10000) % responses.length;
    const randomOffset = Math.floor(Math.random() * 2);
    const selectedIndex = (baseIndex + randomOffset) % responses.length;
    
    return responses[selectedIndex];
  }, []);

  const submitResponse = useCallback(async (response: string) => {
    if (!currentQuestion || conversationState === 'processing_response') return;

    console.log('Submitting response:', response);
    
    setConversationState('processing_response');
    setCurrentTranscript('');
    
    const duration = Date.now() - recordingStartTime.current;
    const newResponse: InterviewResponse = {
      questionId: currentQuestion.id,
      question: currentQuestion.question,
      response,
      duration: Math.floor(duration / 1000),
      timestamp: new Date().toISOString(),
    };

    // Add user response to conversation history
    const responseTurn: ConversationTurn = {
      id: `response_${currentQuestion.id}_${Date.now()}`,
      type: 'user_response',
      content: response,
      timestamp: new Date().toISOString(),
      duration: Math.floor(duration / 1000)
    };

    setConversationHistory(prev => [...prev, responseTurn]);
    aiService.addConversationTurn(responseTurn);

    setResponses(prev => {
      const filtered = prev.filter(r => r.questionId !== currentQuestion.id);
      return [...filtered, newResponse];
    });

    if (isRecording) {
      setIsRecording(false);
      isRecordingRef.current = false;
    }

    // Generate AI follow-up response
    setConversationState('generating_followup');
    
    try {
      const followUpResponse = await aiService.generateDynamicFollowUp(
        response, 
        currentQuestion.question, 
        currentQuestion.category
      );
      
      const followUpTurn: ConversationTurn = {
        id: `followup_${currentQuestion.id}_${Date.now()}`,
        type: 'ai_followup',
        content: followUpResponse,
        timestamp: new Date().toISOString()
      };

      setConversationHistory(prev => [...prev, followUpTurn]);
      aiService.addConversationTurn(followUpTurn);

      // Play the follow-up response
      await playAIResponse(followUpResponse);
      
    } catch (error) {
      console.error('Error generating follow-up:', error);
      setConversationState('waiting_for_response');
    }
  }, [currentQuestion, conversationState, isRecording, playAIResponse]);

  const finishInterview = useCallback(async () => {
    if (responses.length === 0) return;

    console.log('Finishing interview with', responses.length, 'responses');
    
    // Clear the timer
    if (interviewTimerRef.current) {
      clearInterval(interviewTimerRef.current);
      interviewTimerRef.current = null;
    }
    
    setIsProcessing(true);
    setConversationState('processing_response');
    
    try {
      const interviewFeedback = await aiService.analyzeResponses(responses);
      setFeedback(interviewFeedback);
      setInterviewStarted(false);
      setConversationState('idle');
    } catch (error) {
      console.error('Error analyzing responses:', error);
      Alert.alert(
        'Analysis Error',
        'Unable to analyze your responses. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsProcessing(false);
    }
  }, [responses]);

  const resetInterview = useCallback(() => {
    console.log('Resetting interview...');
    
    // Clear timer
    if (interviewTimerRef.current) {
      clearInterval(interviewTimerRef.current);
      interviewTimerRef.current = null;
    }
    
    // Clean up recording
    const currentRecording = recordingRef.current;
    recordingRef.current = null;
    
    if (currentRecording) {
      currentRecording.stopAndUnloadAsync().catch((error) => {
        if (error instanceof Error && error.message.includes('Recorder does not exist')) {
          console.log('Recorder was already cleaned up during reset');
        } else {
          console.error('Error cleaning up recording during reset:', error);
        }
      });
    }
    
    // Clean up speech recognition
    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.stop();
      speechRecognitionRef.current = null;
    }
    
    // Clean up media recorder
    if (mediaRecorderRef.current) {
      if (mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      mediaRecorderRef.current = null;
    }
    
    // Clean up speech synthesis
    if (Platform.OS === 'web' && 'speechSynthesis' in window) {
      speechSynthesis.cancel();
    }
    if (currentUtteranceRef.current) {
      currentUtteranceRef.current = null;
    }
    
    stopPlaying();
    
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setResponses([]);
    setFeedback(null);
    setIsRecording(false);
    isRecordingRef.current = false;
    setIsPlaying(false);
    setIsProcessing(false);
    setInterviewStarted(false);
    setConversationState('idle');
    setConversationHistory([]);
    setInterviewTimeRemaining(600);
    setCurrentTranscript('');
    aiService.clearConversationHistory();
  }, [stopPlaying]);

  return {
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
  };
}