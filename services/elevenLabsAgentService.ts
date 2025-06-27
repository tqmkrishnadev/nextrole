import { Platform } from 'react-native';

export interface AgentConversationState {
  isConnected: boolean;
  isAgentSpeaking: boolean;
  isUserSpeaking: boolean;
  conversationId: string | null;
  error: string | null;
}

export interface ConversationMessage {
  id: string;
  type: 'agent' | 'user';
  content: string;
  timestamp: string;
  audioUrl?: string;
}

class ElevenLabsAgentService {
  private static instance: ElevenLabsAgentService;
  private apiKey: string | null = null;
  private agentId: string | null = null;
  private websocket: WebSocket | null = null;
  private conversationId: string | null = null;
  private audioContext: AudioContext | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private isRecording = false;
  private onStateChange: ((state: AgentConversationState) => void) | null = null;
  private onMessage: ((message: ConversationMessage) => void) | null = null;
  private currentAudio: HTMLAudioElement | null = null;
  private recordingStream: MediaStream | null = null;

  static getInstance(): ElevenLabsAgentService {
    if (!ElevenLabsAgentService.instance) {
      ElevenLabsAgentService.instance = new ElevenLabsAgentService();
    }
    return ElevenLabsAgentService.instance;
  }

  constructor() {
    this.apiKey = process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY || null;
    this.agentId = process.env.EXPO_PUBLIC_ELEVENLABS_AGENT_ID || null;
    
    // Initialize audio context for both web and mobile
    if (typeof window !== 'undefined' && (window.AudioContext || (window as any).webkitAudioContext)) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  setStateChangeCallback(callback: (state: AgentConversationState) => void) {
    this.onStateChange = callback;
  }

  setMessageCallback(callback: (message: ConversationMessage) => void) {
    this.onMessage = callback;
  }

  private updateState(updates: Partial<AgentConversationState>) {
    if (this.onStateChange) {
      const currentState: AgentConversationState = {
        isConnected: this.websocket?.readyState === WebSocket.OPEN,
        isAgentSpeaking: false,
        isUserSpeaking: this.isRecording,
        conversationId: this.conversationId,
        error: null,
        ...updates
      };
      this.onStateChange(currentState);
    }
  }

  private async checkBrowserSupport(): Promise<{ supported: boolean; error?: string }> {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      return { supported: false, error: 'Not running in browser environment' };
    }

    // Check WebSocket support
    if (!window.WebSocket) {
      return { supported: false, error: 'WebSocket not supported' };
    }

    // Check MediaDevices API
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return { supported: false, error: 'Microphone access not supported' };
    }

    // Check MediaRecorder API
    if (!window.MediaRecorder) {
      return { supported: false, error: 'Audio recording not supported' };
    }

    // Check Audio API
    if (!window.Audio) {
      return { supported: false, error: 'Audio playback not supported' };
    }

    return { supported: true };
  }

  async startConversation(userProfile: any): Promise<boolean> {
    if (!this.apiKey || !this.agentId) {
      this.updateState({ error: 'ElevenLabs API key or Agent ID not configured' });
      return false;
    }

    // Check browser support instead of platform restriction
    const supportCheck = await this.checkBrowserSupport();
    if (!supportCheck.supported) {
      this.updateState({ error: `Browser not supported: ${supportCheck.error}` });
      return false;
    }

    try {
      // Request microphone permissions first
      console.log('Requesting microphone permissions...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000
        }
      });
      
      // Test successful, stop the stream for now
      stream.getTracks().forEach(track => track.stop());
      console.log('Microphone permissions granted');

      // Resume audio context if needed (especially important on mobile)
      if (this.audioContext && this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // Create WebSocket connection to ElevenLabs Agent
      console.log('Connecting to ElevenLabs Agent...');
      const wsUrl = `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${this.agentId}`;
      
      this.websocket = new WebSocket(wsUrl);

      // Set up WebSocket event handlers
      this.websocket.onopen = () => {
        console.log('Connected to ElevenLabs Agent');
        this.updateState({ isConnected: true, error: null });
        
        // Send initial user profile information
        this.sendUserProfile(userProfile);
      };

      this.websocket.onmessage = (event) => {
        this.handleWebSocketMessage(event);
      };

      this.websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.updateState({ error: 'Failed to connect to ElevenLabs Agent' });
      };

      this.websocket.onclose = (event) => {
        console.log('Disconnected from ElevenLabs Agent', event.code, event.reason);
        this.updateState({ isConnected: false });
        this.cleanup();
      };

      return true;
    } catch (error) {
      console.error('Error starting conversation:', error);
      
      let errorMessage = 'Failed to start conversation';
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage = 'Microphone access denied. Please allow microphone permissions and try again.';
        } else if (error.name === 'NotFoundError') {
          errorMessage = 'No microphone found. Please connect a microphone and try again.';
        } else if (error.name === 'NotSupportedError') {
          errorMessage = 'Microphone not supported on this device.';
        } else {
          errorMessage = error.message;
        }
      }
      
      this.updateState({ error: errorMessage });
      return false;
    }
  }

  private sendUserProfile(userProfile: any) {
    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) return;

    const profileMessage = {
      type: 'user_profile',
      data: {
        name: userProfile.name,
        email: userProfile.email,
        experience: userProfile.experience || 'Not specified',
        skills: userProfile.skills || [],
        role: userProfile.role || 'candidate',
        interviewType: userProfile.interviewType || 'general',
        message: `Hello! I'm ${userProfile.name}. I'm here for a ${userProfile.interviewType} mock interview. Please ask me relevant questions based on my profile and experience in ${userProfile.experience}.`
      }
    };

    console.log('Sending user profile to agent:', profileMessage);
    this.websocket.send(JSON.stringify(profileMessage));
  }

  private handleWebSocketMessage(event: MessageEvent) {
    try {
      const data = JSON.parse(event.data);
      console.log('Received WebSocket message:', data.type);
      
      switch (data.type) {
        case 'conversation_initiation_metadata':
          this.conversationId = data.conversation_id;
          this.updateState({ conversationId: data.conversation_id });
          console.log('Conversation initiated:', data.conversation_id);
          break;
          
        case 'agent_response':
          this.handleAgentResponse(data);
          break;
          
        case 'agent_response_audio_start':
          this.updateState({ isAgentSpeaking: true });
          break;
          
        case 'agent_response_audio_end':
          this.updateState({ isAgentSpeaking: false });
          break;
          
        case 'user_transcript':
          this.handleUserTranscript(data);
          break;
          
        case 'interruption':
          this.handleInterruption();
          break;
          
        case 'ping':
          // Respond to ping to keep connection alive
          if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            this.websocket.send(JSON.stringify({ type: 'pong' }));
          }
          break;
          
        default:
          console.log('Unknown message type:', data.type, data);
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }

  private async handleAgentResponse(data: any) {
    console.log('Handling agent response:', data);
    
    if (data.audio_event && data.audio_event.audio_base_64) {
      this.updateState({ isAgentSpeaking: true });
      // Play agent audio
      await this.playAgentAudio(data.audio_event.audio_base_64);
    }
    
    // Add agent message to conversation
    if (data.agent_response && this.onMessage) {
      const message: ConversationMessage = {
        id: `agent_${Date.now()}`,
        type: 'agent',
        content: data.agent_response,
        timestamp: new Date().toISOString()
      };
      this.onMessage(message);
    }
  }

  private handleUserTranscript(data: any) {
    console.log('User transcript received:', data);
    
    if (data.user_transcript && this.onMessage) {
      const message: ConversationMessage = {
        id: `user_${Date.now()}`,
        type: 'user',
        content: data.user_transcript,
        timestamp: new Date().toISOString()
      };
      this.onMessage(message);
    }
  }

  private handleInterruption() {
    console.log('Handling interruption');
    
    // Stop current audio playback if agent is interrupted
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }
    this.updateState({ isAgentSpeaking: false });
  }

  private async playAgentAudio(audioBase64: string) {
    try {
      console.log('Playing agent audio...');
      
      const audioBlob = this.base64ToBlob(audioBase64, 'audio/mpeg');
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Stop any currently playing audio
      if (this.currentAudio) {
        this.currentAudio.pause();
        this.currentAudio = null;
      }
      
      this.currentAudio = new Audio(audioUrl);
      
      // Set up audio event handlers
      this.currentAudio.onloadstart = () => {
        console.log('Audio loading started');
      };
      
      this.currentAudio.oncanplay = () => {
        console.log('Audio can play');
      };
      
      this.currentAudio.onplay = () => {
        console.log('Audio playback started');
        this.updateState({ isAgentSpeaking: true });
      };
      
      this.currentAudio.onended = () => {
        console.log('Audio playback ended');
        URL.revokeObjectURL(audioUrl);
        this.currentAudio = null;
        this.updateState({ isAgentSpeaking: false });
      };
      
      this.currentAudio.onerror = (error) => {
        console.error('Audio playback error:', error);
        URL.revokeObjectURL(audioUrl);
        this.currentAudio = null;
        this.updateState({ isAgentSpeaking: false });
      };
      
      // For mobile devices, we might need user interaction to play audio
      try {
        await this.currentAudio.play();
      } catch (playError) {
        console.error('Audio play error:', playError);
        
        // If autoplay is blocked, we'll need to handle this gracefully
        if (playError instanceof Error && playError.name === 'NotAllowedError') {
          console.log('Autoplay blocked, audio will play when user interacts');
          // The audio will be ready to play when user next interacts
        }
        
        this.updateState({ isAgentSpeaking: false });
      }
    } catch (error) {
      console.error('Error playing agent audio:', error);
      this.updateState({ isAgentSpeaking: false });
    }
  }

  private base64ToBlob(base64: string, mimeType: string): Blob {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }

  async startRecording(): Promise<boolean> {
    if (this.isRecording || !this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
      console.log('Cannot start recording:', { 
        isRecording: this.isRecording, 
        websocketReady: this.websocket?.readyState === WebSocket.OPEN 
      });
      return false;
    }

    try {
      console.log('Starting audio recording...');
      
      // Resume audio context if suspended (important for mobile)
      if (this.audioContext && this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
          channelCount: 1
        }
      });

      this.recordingStream = stream;
      this.audioChunks = [];

      // Check for supported MIME types
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'audio/mp4';
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = ''; // Let browser choose
          }
        }
      }

      console.log('Using MIME type:', mimeType);

      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType || undefined
      });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
          console.log('Audio chunk received:', event.data.size, 'bytes');
        }
      };

      this.mediaRecorder.onstop = () => {
        console.log('MediaRecorder stopped, sending audio to agent');
        this.sendAudioToAgent();
        
        // Clean up the stream
        if (this.recordingStream) {
          this.recordingStream.getTracks().forEach(track => track.stop());
          this.recordingStream = null;
        }
      };

      this.mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        this.updateState({ error: 'Recording error occurred' });
      };

      this.mediaRecorder.start(250); // Collect data every 250ms for better real-time performance
      this.isRecording = true;
      this.updateState({ isUserSpeaking: true });
      
      console.log('Recording started successfully');
      return true;
    } catch (error) {
      console.error('Error starting recording:', error);
      
      let errorMessage = 'Failed to start recording';
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage = 'Microphone access denied. Please allow microphone permissions.';
        } else if (error.name === 'NotFoundError') {
          errorMessage = 'No microphone found. Please connect a microphone.';
        } else {
          errorMessage = error.message;
        }
      }
      
      this.updateState({ error: errorMessage });
      return false;
    }
  }

  stopRecording() {
    if (!this.isRecording || !this.mediaRecorder) {
      console.log('Cannot stop recording: not currently recording');
      return;
    }

    console.log('Stopping recording...');
    
    try {
      this.mediaRecorder.stop();
      this.isRecording = false;
      this.updateState({ isUserSpeaking: false });
    } catch (error) {
      console.error('Error stopping recording:', error);
      this.isRecording = false;
      this.updateState({ isUserSpeaking: false });
    }
  }

  private async sendAudioToAgent() {
    if (this.audioChunks.length === 0 || !this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
      console.log('Cannot send audio: no chunks or websocket not ready');
      return;
    }

    try {
      console.log('Sending audio to agent, chunks:', this.audioChunks.length);
      
      const audioBlob = new Blob(this.audioChunks, { type: this.mediaRecorder?.mimeType || 'audio/webm' });
      console.log('Audio blob size:', audioBlob.size, 'bytes');
      
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

      const message = {
        type: 'user_audio_chunk',
        audio_event: {
          audio_base_64: base64Audio,
          audio_format: this.mediaRecorder?.mimeType || 'webm'
        }
      };

      this.websocket.send(JSON.stringify(message));
      console.log('Audio sent to agent successfully');
    } catch (error) {
      console.error('Error sending audio to agent:', error);
      this.updateState({ error: 'Failed to send audio to agent' });
    }
  }

  endConversation() {
    console.log('Ending conversation...');
    
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      // Send end conversation message
      this.websocket.send(JSON.stringify({ type: 'end_conversation' }));
      this.websocket.close();
    }
    
    this.cleanup();
  }

  private cleanup() {
    console.log('Cleaning up ElevenLabs Agent service...');
    
    // Stop recording if active
    if (this.isRecording && this.mediaRecorder) {
      try {
        this.mediaRecorder.stop();
      } catch (error) {
        console.error('Error stopping media recorder during cleanup:', error);
      }
    }
    
    // Stop recording stream
    if (this.recordingStream) {
      this.recordingStream.getTracks().forEach(track => track.stop());
      this.recordingStream = null;
    }
    
    // Stop audio playback
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }
    
    // Clean up WebSocket
    this.websocket = null;
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.isRecording = false;
    this.conversationId = null;
    
    this.updateState({ 
      isConnected: false, 
      isAgentSpeaking: false, 
      isUserSpeaking: false,
      conversationId: null 
    });
  }

  isConnected(): boolean {
    return this.websocket?.readyState === WebSocket.OPEN || false;
  }

  getConversationId(): string | null {
    return this.conversationId;
  }

  // Method to enable audio playback on mobile (call this on user interaction)
  async enableAudioPlayback() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
        console.log('Audio context resumed');
      } catch (error) {
        console.error('Error resuming audio context:', error);
      }
    }
  }
}

export default ElevenLabsAgentService;