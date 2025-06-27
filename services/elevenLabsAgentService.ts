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

  static getInstance(): ElevenLabsAgentService {
    if (!ElevenLabsAgentService.instance) {
      ElevenLabsAgentService.instance = new ElevenLabsAgentService();
    }
    return ElevenLabsAgentService.instance;
  }

  constructor() {
    this.apiKey = process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY || null;
    this.agentId = process.env.EXPO_PUBLIC_ELEVENLABS_AGENT_ID || null;
    
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
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

  async startConversation(userProfile: any): Promise<boolean> {
    if (!this.apiKey || !this.agentId) {
      this.updateState({ error: 'ElevenLabs API key or Agent ID not configured' });
      return false;
    }

    if (Platform.OS !== 'web') {
      this.updateState({ error: 'ElevenLabs Agents are only supported on web platform' });
      return false;
    }

    try {
      // Request microphone permissions
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop()); // Stop the test stream

      // Create WebSocket connection to ElevenLabs Agent
      const wsUrl = `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${this.agentId}`;
      this.websocket = new WebSocket(wsUrl);

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

      this.websocket.onclose = () => {
        console.log('Disconnected from ElevenLabs Agent');
        this.updateState({ isConnected: false });
        this.cleanup();
      };

      return true;
    } catch (error) {
      console.error('Error starting conversation:', error);
      this.updateState({ error: 'Failed to start conversation. Please check microphone permissions.' });
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
        message: `Hello! I'm ${userProfile.name}. I'm here for a mock interview. Please ask me relevant questions based on my profile and experience.`
      }
    };

    this.websocket.send(JSON.stringify(profileMessage));
  }

  private handleWebSocketMessage(event: MessageEvent) {
    try {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'conversation_initiation_metadata':
          this.conversationId = data.conversation_id;
          this.updateState({ conversationId: data.conversation_id });
          break;
          
        case 'agent_response':
          this.handleAgentResponse(data);
          break;
          
        case 'user_transcript':
          this.handleUserTranscript(data);
          break;
          
        case 'interruption':
          this.handleInterruption();
          break;
          
        case 'ping':
          // Respond to ping to keep connection alive
          if (this.websocket) {
            this.websocket.send(JSON.stringify({ type: 'pong' }));
          }
          break;
          
        default:
          console.log('Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }

  private async handleAgentResponse(data: any) {
    this.updateState({ isAgentSpeaking: true });
    
    if (data.audio_event && data.audio_event.audio_base_64) {
      // Play agent audio
      await this.playAgentAudio(data.audio_event.audio_base_64);
    }
    
    if (data.agent_response_audio_end) {
      this.updateState({ isAgentSpeaking: false });
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
    // Stop current audio playback if agent is interrupted
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }
    this.updateState({ isAgentSpeaking: false });
  }

  private async playAgentAudio(audioBase64: string) {
    try {
      const audioBlob = this.base64ToBlob(audioBase64, 'audio/mpeg');
      const audioUrl = URL.createObjectURL(audioBlob);
      
      this.currentAudio = new Audio(audioUrl);
      this.currentAudio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        this.currentAudio = null;
        this.updateState({ isAgentSpeaking: false });
      };
      
      this.currentAudio.onerror = (error) => {
        console.error('Audio playback error:', error);
        this.updateState({ isAgentSpeaking: false });
      };
      
      await this.currentAudio.play();
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
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000
        }
      });

      this.audioChunks = [];
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        this.sendAudioToAgent();
        stream.getTracks().forEach(track => track.stop());
      };

      this.mediaRecorder.start(100); // Collect data every 100ms
      this.isRecording = true;
      this.updateState({ isUserSpeaking: true });
      
      return true;
    } catch (error) {
      console.error('Error starting recording:', error);
      this.updateState({ error: 'Failed to start recording. Please check microphone permissions.' });
      return false;
    }
  }

  stopRecording() {
    if (!this.isRecording || !this.mediaRecorder) return;

    this.mediaRecorder.stop();
    this.isRecording = false;
    this.updateState({ isUserSpeaking: false });
  }

  private async sendAudioToAgent() {
    if (this.audioChunks.length === 0 || !this.websocket) return;

    try {
      const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm;codecs=opus' });
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

      const message = {
        type: 'user_audio_chunk',
        audio_event: {
          audio_base_64: base64Audio,
          audio_format: 'webm'
        }
      };

      this.websocket.send(JSON.stringify(message));
    } catch (error) {
      console.error('Error sending audio to agent:', error);
    }
  }

  endConversation() {
    if (this.websocket) {
      this.websocket.close();
    }
    this.cleanup();
  }

  private cleanup() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
    }
    
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }
    
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
}

export default ElevenLabsAgentService;