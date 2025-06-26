import { useState, useCallback, useRef } from 'react';
import { Platform, Alert } from 'react-native';
import AIInterviewService, { InterviewQuestion, InterviewResponse, InterviewFeedback } from '@/services/aiInterviewService';
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
  conversationState: 'waiting_for_question' | 'question_playing' | 'waiting_for_response' | 'processing_response' | 'ai_responding';
  
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
  const [conversationState, setConversationState] = useState<'waiting_for_question' | 'question_playing' | 'waiting_for_response' | 'processing_response' | 'ai_responding'>('waiting_for_question');
  
  const aiService = AIInterviewService.getInstance();
  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const recordingStartTime = useRef<number>(0);
  const speechRecognitionRef = useRef<any>(null);
  const isRecordingRef = useRef(false);
  const autoPlayTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isProcessingResponseRef = useRef(false);
  const conversationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

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
      setConversationState('waiting_for_question');
      
      console.log('Interview started successfully');
      
      // Request permissions
      const hasPermissions = await requestPermissions();
      if (!hasPermissions) {
        console.log('Permissions not granted, but interview can continue with manual input');
      }

      // Start the conversation flow with the first question
      setTimeout(() => {
        playCurrentQuestion();
      }, 1500);
      
    } catch (error) {
      console.error('Error starting interview:', error);
      Alert.alert(
        'Error',
        'Failed to start interview. Please try again.',
        [{ text: 'OK' }]
      );
    }
  }, [requestPermissions]);

  const playCurrentQuestion = useCallback(async () => {
    if (!currentQuestion || isPlaying || conversationState === 'question_playing') return;

    try {
      console.log('Playing current question:', currentQuestion.question.substring(0, 50) + '...');
      
      // Stop any currently playing audio
      stopPlaying();
      
      setIsPlaying(true);
      setConversationState('question_playing');

      if (Platform.OS === 'web') {
        // Try ElevenLabs first, then fallback to browser speech
        try {
          const audioUrl = await aiService.textToSpeech(currentQuestion.question);
          if (audioUrl && audioUrl.startsWith('data:')) {
            const audio = new Audio(audioUrl);
            audio.onended = () => {
              setIsPlaying(false);
              setConversationState('waiting_for_response');
              console.log('Question finished playing, waiting for user response');
            };
            audio.onerror = () => {
              setIsPlaying(false);
              fallbackToWebSpeech();
            };
            await audio.play();
          } else {
            fallbackToWebSpeech();
          }
        } catch (error) {
          console.error('ElevenLabs TTS error:', error);
          fallbackToWebSpeech();
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
            console.log('Question finished playing, waiting for user response');
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

        await Speech.speak(currentQuestion.question, speechOptions);
      }
    } catch (error) {
      console.error('Error playing question:', error);
      setIsPlaying(false);
      setConversationState('waiting_for_response');
    }
  }, [currentQuestion, isPlaying, conversationState]);

  const fallbackToWebSpeech = useCallback(() => {
    if (!currentQuestion) return;
    
    if ('speechSynthesis' in window) {
      // Cancel any existing speech
      speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(currentQuestion.question);
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
        console.log('Question finished playing, waiting for user response');
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
  }, [currentQuestion]);

  const nextQuestion = useCallback(() => {
    if (currentQuestionIndex < questions.length - 1) {
      console.log('Moving to next question');
      setCurrentQuestionIndex(prev => prev + 1);
      setConversationState('waiting_for_question');
      
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
      setConversationState('waiting_for_question');
      
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
      if (conversationState === 'question_playing') {
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

      // Clean up any existing recording object before starting a new one
      if (recordingRef.current) {
        console.log('Cleaning up existing recording object...');
        try {
          await recordingRef.current.stopAndUnloadAsync();
        } catch (cleanupError) {
          console.log('Recording cleanup completed or was already cleaned up');
        }
        recordingRef.current = null;
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
      setConversationState('waiting_for_response'); // Keep in response mode while recording

      if (Platform.OS === 'web') {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
          const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
          const recognition = new SpeechRecognition();
          
          recognition.continuous = true;
          recognition.interimResults = false;
          recognition.lang = 'en-US';
          recognition.maxAlternatives = 1;

          recognition.onstart = () => {
            console.log('Speech recognition started');
          };

          recognition.onresult = (event: any) => {
            console.log('Speech recognition result received');
            let transcript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
              transcript += event.results[i][0].transcript;
            }
            
            if (transcript.trim()) {
              console.log('Transcript:', transcript.trim());
              submitResponse(transcript.trim());
            }
          };

          recognition.onerror = (event: any) => {
            console.error('Speech recognition error:', event.error);
            setIsRecording(false);
            isRecordingRef.current = false;
            speechRecognitionRef.current = null;
            
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
            } else {
              Alert.alert(
                'Speech Recognition Error',
                'Unable to recognize speech. Please try typing your response instead.',
                [{ text: 'OK' }]
              );
            }
          };

          recognition.onend = () => {
            console.log('Speech recognition ended');
            setIsRecording(false);
            isRecordingRef.current = false;
            speechRecognitionRef.current = null;
          };

          speechRecognitionRef.current = recognition;
          recognition.start();
        } else {
          setIsRecording(false);
          isRecordingRef.current = false;
          Alert.alert(
            'Speech Recognition Not Supported',
            'Your browser does not support speech recognition. Please type your response instead.',
            [{ text: 'OK' }]
          );
        }
      } else {
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
    }
  }, [isRecording, permissionsGranted, requestPermissions, stopPlaying, conversationState]);

  const stopRecording = useCallback(async () => {
    try {
      console.log('Stopping recording...');
      
      setIsRecording(false);
      isRecordingRef.current = false;
      const duration = Date.now() - recordingStartTime.current;

      if (Platform.OS === 'web') {
        if (speechRecognitionRef.current) {
          speechRecognitionRef.current.stop();
          speechRecognitionRef.current = null;
        }
      } else {
        // Capture the current recording reference and immediately clear it
        const currentRecording = recordingRef.current;
        recordingRef.current = null;
        
        if (currentRecording) {
          try {
            console.log('Stopping mobile recording...');
            
            // Always call stopAndUnloadAsync to properly clean up the recording object
            await currentRecording.stopAndUnloadAsync();
            const uri = currentRecording.getURI();
            
            console.log('Recording saved to:', uri);
            
            // Generate a more realistic simulated response based on duration
            const simulatedResponse = generateSimulatedResponse(duration);
            console.log('Generated simulated response:', simulatedResponse);
            
            // Submit the response which will trigger AI follow-up
            submitResponse(simulatedResponse);
            
          } catch (error) {
            console.error('Error stopping recording:', error);
            
            // Check if the error is about recorder not existing (already cleaned up)
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
    }
  }, []);

  // Generate a more realistic simulated response based on recording duration
  const generateSimulatedResponse = useCallback((duration: number) => {
    const responses = [
      "In my previous role as a product manager, I faced a challenging situation where our team had conflicting priorities and tight deadlines. I organized a stakeholder meeting to align on objectives, created a clear roadmap with milestones, and established regular check-ins to track progress. This approach helped us deliver the project on time and improved team collaboration.",
      
      "I encountered this challenge when working on a cross-functional project with engineering and design teams. The key was establishing clear communication channels and setting realistic expectations. I implemented daily standups and weekly retrospectives, which helped identify blockers early and maintain momentum throughout the project.",
      
      "This reminds me of a situation where I had to learn a new technology stack quickly to meet project requirements. I dedicated time each day to hands-on practice, found a mentor within the team, and applied the new skills to small tasks before taking on larger responsibilities. This systematic approach helped me become proficient within the timeline.",
      
      "I faced a similar challenge when managing a team through a major organizational change. I focused on transparent communication, provided regular updates about the transition, and created opportunities for team members to voice their concerns. By maintaining open dialogue and supporting individual needs, we successfully navigated the change with minimal disruption.",
      
      "In my experience, this type of situation requires a balance of technical skills and interpersonal communication. I typically start by gathering all relevant information, consulting with subject matter experts, and then developing a comprehensive plan with clear timelines and deliverables. Regular progress reviews help ensure we stay on track and can adjust as needed."
    ];
    
    // Select response based on duration and add some randomness
    const baseIndex = Math.floor(duration / 10000) % responses.length;
    const randomOffset = Math.floor(Math.random() * 2);
    const selectedIndex = (baseIndex + randomOffset) % responses.length;
    
    return responses[selectedIndex];
  }, []);

  const submitResponse = useCallback((response: string) => {
    if (!currentQuestion || isProcessingResponseRef.current || conversationState === 'processing_response') return;

    console.log('Submitting response:', response);
    
    // Prevent multiple simultaneous submissions
    isProcessingResponseRef.current = true;
    setConversationState('processing_response');
    
    const duration = Date.now() - recordingStartTime.current;
    const newResponse: InterviewResponse = {
      questionId: currentQuestion.id,
      question: currentQuestion.question,
      response,
      duration: Math.floor(duration / 1000),
      timestamp: new Date().toISOString(),
    };

    setResponses(prev => {
      const filtered = prev.filter(r => r.questionId !== currentQuestion.id);
      return [...filtered, newResponse];
    });

    if (isRecording) {
      setIsRecording(false);
      isRecordingRef.current = false;
    }

    // Generate AI follow-up response with a slight delay for realism
    setTimeout(() => {
      generateAIFollowUp(response);
    }, 1000);
  }, [currentQuestion, isRecording, conversationState]);

  const generateAIFollowUp = useCallback((userResponse: string) => {
    console.log('Generating AI follow-up for response:', userResponse.substring(0, 50) + '...');
    
    setConversationState('ai_responding');
    
    // Enhanced follow-up responses based on response content and question type
    const getContextualFollowUp = () => {
      if (!currentQuestion) return "Thank you for sharing that experience.";
      
      const responseWords = userResponse.toLowerCase();
      const questionCategory = currentQuestion.category;
      
      // Behavioral question follow-ups
      if (questionCategory === 'behavioral') {
        if (responseWords.includes('team') || responseWords.includes('collaboration')) {
          return "That's a great example of teamwork. Can you tell me more about how you handled any conflicts or differing opinions within the team during this situation?";
        } else if (responseWords.includes('challenge') || responseWords.includes('difficult')) {
          return "It sounds like you navigated that challenge well. What specific skills or strategies did you develop from this experience that you still use today?";
        } else if (responseWords.includes('project') || responseWords.includes('deadline')) {
          return "Excellent project management approach. How did you measure the success of this project, and what would you do differently if faced with a similar situation?";
        } else if (responseWords.includes('learn') || responseWords.includes('new')) {
          return "That shows great adaptability. How do you typically approach learning new skills or technologies, and how do you stay current in your field?";
        } else {
          return "Thank you for that detailed example. Can you walk me through what you learned from this experience and how it has influenced your approach to similar situations since then?";
        }
      }
      
      // Technical question follow-ups
      else if (questionCategory === 'technical') {
        if (responseWords.includes('debug') || responseWords.includes('problem')) {
          return "That's a solid debugging approach. Can you give me an example of a particularly challenging technical issue you solved and what tools or methodologies were most helpful?";
        } else if (responseWords.includes('code') || responseWords.includes('review')) {
          return "Code quality is crucial. How do you balance writing clean, maintainable code with meeting tight deadlines? Can you share your approach to technical debt management?";
        } else if (responseWords.includes('scale') || responseWords.includes('performance')) {
          return "Scalability is always important. What specific metrics do you use to measure system performance, and how do you identify potential bottlenecks before they become critical issues?";
        } else {
          return "That demonstrates strong technical thinking. How do you stay updated with new technologies and decide which ones are worth investing time to learn for your role?";
        }
      }
      
      // Leadership question follow-ups
      else if (questionCategory === 'leadership') {
        if (responseWords.includes('motivate') || responseWords.includes('team')) {
          return "Leadership styles can vary greatly. Can you describe a time when you had to adapt your leadership approach for different team members or situations?";
        } else if (responseWords.includes('decision') || responseWords.includes('difficult')) {
          return "Decision-making is a key leadership skill. How do you gather input from your team when making important decisions, and how do you handle situations where not everyone agrees?";
        } else if (responseWords.includes('conflict') || responseWords.includes('resolve')) {
          return "Conflict resolution is challenging. What strategies do you use to ensure all parties feel heard, and how do you prevent similar conflicts from arising in the future?";
        } else {
          return "That shows strong leadership qualities. How do you measure your effectiveness as a leader, and what feedback mechanisms do you have in place with your team?";
        }
      }
      
      // Default follow-up
      return "Thank you for sharing that experience. Can you elaborate on the key lessons you learned and how they've shaped your professional approach?";
    };

    const followUpResponse = getContextualFollowUp();
    
    // Simulate AI thinking time (1.5-3 seconds)
    const thinkingTime = 1500 + Math.random() * 1500;
    
    conversationTimeoutRef.current = setTimeout(() => {
      console.log('AI Follow-up:', followUpResponse);
      
      // Play the AI follow-up response
      if (Platform.OS === 'web') {
        if ('speechSynthesis' in window) {
          // Stop any currently playing speech
          speechSynthesis.cancel();
          
          const utterance = new SpeechSynthesisUtterance(followUpResponse);
          utterance.rate = 0.85;
          utterance.pitch = 1.0;
          utterance.volume = 1.0;
          utterance.lang = 'en-US';
          
          utterance.onstart = () => {
            console.log('AI response started playing');
            setIsPlaying(true);
          };
          
          utterance.onend = () => {
            console.log('AI response finished playing');
            setIsPlaying(false);
            setConversationState('waiting_for_response');
            isProcessingResponseRef.current = false;
          };
          
          utterance.onerror = (error) => {
            console.error('Speech synthesis error:', error);
            setIsPlaying(false);
            setConversationState('waiting_for_response');
            isProcessingResponseRef.current = false;
          };
          
          currentUtteranceRef.current = utterance;
          speechSynthesis.speak(utterance);
        } else {
          // No speech synthesis available, just reset state
          setConversationState('waiting_for_response');
          isProcessingResponseRef.current = false;
        }
      } else {
        Speech.speak(followUpResponse, {
          language: 'en-US',
          pitch: 1.0,
          rate: 0.85,
          quality: Speech.VoiceQuality.Enhanced,
          onStart: () => {
            console.log('AI response started playing');
            setIsPlaying(true);
          },
          onDone: () => {
            console.log('AI response finished playing');
            setIsPlaying(false);
            setConversationState('waiting_for_response');
            isProcessingResponseRef.current = false;
          },
          onError: (error: any) => {
            console.error('Speech error:', error);
            setIsPlaying(false);
            setConversationState('waiting_for_response');
            isProcessingResponseRef.current = false;
          },
        });
      }
    }, thinkingTime);
  }, [currentQuestion]);

  const finishInterview = useCallback(async () => {
    if (responses.length === 0) return;

    console.log('Finishing interview with', responses.length, 'responses');
    setIsProcessing(true);
    setConversationState('processing_response');
    
    try {
      const interviewFeedback = await aiService.analyzeResponses(responses);
      setFeedback(interviewFeedback);
      setInterviewStarted(false);
      setConversationState('waiting_for_question');
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
    
    // Clear all timeouts
    if (autoPlayTimeoutRef.current) {
      clearTimeout(autoPlayTimeoutRef.current);
      autoPlayTimeoutRef.current = null;
    }
    
    if (conversationTimeoutRef.current) {
      clearTimeout(conversationTimeoutRef.current);
      conversationTimeoutRef.current = null;
    }
    
    // Capture the current recording reference and immediately clear it
    const currentRecording = recordingRef.current;
    recordingRef.current = null;
    
    // Clean up any existing recording with enhanced error handling
    if (currentRecording) {
      currentRecording.stopAndUnloadAsync().catch((error) => {
        // Specifically handle the "Recorder does not exist" error gracefully
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
    isProcessingResponseRef.current = false;
    setIsPlaying(false);
    setIsProcessing(false);
    setInterviewStarted(false);
    setConversationState('waiting_for_question');
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