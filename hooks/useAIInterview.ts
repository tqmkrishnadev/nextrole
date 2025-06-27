import { useState, useCallback, useRef, useEffect } from 'react';
import { Platform } from 'react-native';
import ElevenLabsAgentService, { AgentConversationState, ConversationMessage } from '@/services/elevenLabsAgentService';
import { useAuth } from '@/hooks/useAuth';

export interface UseAIInterviewReturn {
  // State
  isConnected: boolean;
  isAgentSpeaking: boolean;
  isUserSpeaking: boolean;
  conversationHistory: ConversationMessage[];
  interviewStarted: boolean;
  interviewTimeRemaining: number;
  error: string | null;
  
  // Actions
  startInterview: (type: 'behavioral' | 'technical' | 'leadership') => Promise<void>;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  finishInterview: () => Promise<void>;
  resetInterview: () => void;
}

export function useAIInterview(): UseAIInterviewReturn {
  const { user, profile } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [interviewTimeRemaining, setInterviewTimeRemaining] = useState(600); // 10 minutes
  const [error, setError] = useState<string | null>(null);
  
  const agentService = ElevenLabsAgentService.getInstance();
  const interviewTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Cleanup function to mark component as unmounted
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Set up agent service callbacks
  useEffect(() => {
    agentService.setStateChangeCallback((state: AgentConversationState) => {
      if (!isMountedRef.current) return;
      
      setIsConnected(state.isConnected);
      setIsAgentSpeaking(state.isAgentSpeaking);
      setIsUserSpeaking(state.isUserSpeaking);
      
      if (state.error) {
        setError(state.error);
      }
    });

    agentService.setMessageCallback((message: ConversationMessage) => {
      if (!isMountedRef.current) return;
      
      setConversationHistory(prev => [...prev, message]);
    });

    return () => {
      agentService.setStateChangeCallback(() => {});
      agentService.setMessageCallback(() => {});
    };
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
    if (!isMountedRef.current) return;
    
    try {
      console.log('Starting ElevenLabs Agent interview with type:', type);
      
      setError(null);
      setConversationHistory([]);
      setInterviewStarted(true);
      setInterviewTimeRemaining(600); // Reset to 10 minutes
      
      // Prepare user profile for the agent
      const userProfile = {
        name: profile?.name || user?.email?.split('@')[0] || 'User',
        email: profile?.email || user?.email || '',
        role: profile?.role || 'candidate',
        interviewType: type,
        experience: 'Software development and product management', // This could come from profile
        skills: ['JavaScript', 'React', 'Node.js', 'Product Strategy'], // This could come from profile
      };

      console.log('User profile for agent:', userProfile);
      
      const success = await agentService.startConversation(userProfile);
      
      if (!success) {
        setError('Failed to start conversation with AI agent');
        setInterviewStarted(false);
        return;
      }

      // Start the interview timer
      startInterviewTimer();
      
      console.log('ElevenLabs Agent interview started successfully');
      
    } catch (error) {
      console.error('Error starting interview:', error);
      setError('Failed to start interview. Please try again.');
      setInterviewStarted(false);
    }
  }, [profile, user, startInterviewTimer]);

  const startRecording = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    try {
      console.log('Starting recording...');
      
      if (!isConnected) {
        setError('Not connected to AI agent');
        return;
      }

      if (isUserSpeaking) {
        console.log('Already recording');
        return;
      }

      if (isAgentSpeaking) {
        console.log('Agent is speaking, cannot start recording');
        return;
      }

      const success = await agentService.startRecording();
      
      if (!success) {
        setError('Failed to start recording. Please check microphone permissions.');
      }
      
    } catch (error) {
      console.error('Error starting recording:', error);
      setError('Failed to start recording');
    }
  }, [isConnected, isUserSpeaking, isAgentSpeaking]);

  const stopRecording = useCallback(() => {
    if (!isMountedRef.current) return;
    
    try {
      console.log('Stopping recording...');
      agentService.stopRecording();
    } catch (error) {
      console.error('Error stopping recording:', error);
    }
  }, []);

  const finishInterview = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    console.log('Finishing interview...');
    
    // Clear the timer
    if (interviewTimerRef.current) {
      clearInterval(interviewTimerRef.current);
      interviewTimerRef.current = null;
    }
    
    // End the agent conversation
    agentService.endConversation();
    
    setInterviewStarted(false);
    setIsConnected(false);
    setIsAgentSpeaking(false);
    setIsUserSpeaking(false);
    
    // In a real implementation, you might want to save the conversation history
    // to Supabase or generate feedback based on the conversation
    console.log('Interview completed with', conversationHistory.length, 'messages');
  }, [conversationHistory.length]);

  const resetInterview = useCallback(() => {
    if (!isMountedRef.current) return;
    
    console.log('Resetting interview...');
    
    // Clear timer
    if (interviewTimerRef.current) {
      clearInterval(interviewTimerRef.current);
      interviewTimerRef.current = null;
    }
    
    // End agent conversation
    agentService.endConversation();
    
    // Reset all state
    setIsConnected(false);
    setIsAgentSpeaking(false);
    setIsUserSpeaking(false);
    setConversationHistory([]);
    setInterviewStarted(false);
    setInterviewTimeRemaining(600);
    setError(null);
  }, []);

  return {
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
  };
}