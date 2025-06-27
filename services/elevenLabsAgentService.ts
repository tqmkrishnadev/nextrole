import { Platform } from 'react-native';
import { Audio } from 'expo-av';

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
  
  // React Native specific properties
  private recording: Audio.Recording | null = null;
  private sound: Audio.Sound | null = null;

  static getInstance(): ElevenLabsAgentService {
    if (!ElevenLabsAgentService.instance) {
      ElevenLabsAgentService.instance = new ElevenLabsAgentService();
    }
    return ElevenLabsAgentService.instance;
  }

  constructor() {
    this.apiKey = process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY || null;
    this.agentId = process.env.EXPO_PUBLIC_ELEVENLABS_AGENT_ID || null;
    
    // Initialize audio context for web only
    if (Platform.OS === 'web' && typeof window !== 'undefined' && (window.AudioContext || (window as any).webkitAudioContext)) {
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

  private async checkSupport(): Promise<{ supported: boolean; error?: string }> {
    if (Platform.OS === 'web') {
      return this.checkBrowserSupport();
    } else {
      return this.checkMobileSupport();
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

  private async checkMobileSupport(): Promise<{ supported: boolean; error?: string }> {
    try {
      // Check if Audio permissions are available
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        return { supported: false, error: 'Microphone permission required' };
      }

      // Check if WebSocket is available (it should be in React Native)
      if (typeof WebSocket === 'undefined') {
        return { supported: false, error: 'WebSocket not available' };
      }

      return { supported: true };
    } catch (error) {
      return { supported: false, error: 'Failed to check mobile support' };
    }
  }

  async startConversation(userProfile: any): Promise<boolean> {
    if (!this.apiKey || !this.agentId) {
      this.updateState({ error: 'ElevenLabs API key or Agent ID not configured' });
      return false;
    }

    // Check platform support
    const supportCheck = await this.checkSupport();
    if (!supportCheck.supported) {
      this.updateState({ error: `Platform not supported: ${supportCheck.error}` });
      return false;
    }

    try {
      // Set up audio mode for mobile
      if (Platform.OS !== 'web') {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
          staysActiveInBackground: false,
        });
      }

      // Test microphone access
      if (Platform.OS === 'web') {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 16000
          }
        });
        stream.getTracks().forEach(track => track.stop());
      } else {
        // For mobile, we'll test recording when we actually start recording
        console.log('Mobile platform detected, will test recording on demand');
      }

      console.log('Microphone access confirmed');

      // Resume audio context if needed (web only)
      if (Platform.OS === 'web' && this.audioContext && this.audioContext.state === 'suspended') {
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
    if (Platform.OS === 'web') {
      if (this.currentAudio) {
        this.currentAudio.pause();
        this.currentAudio = null;
      }
    } else {
      if (this.sound) {
        this.sound.stopAsync();
        this.sound = null;
      }
    }
    this.updateState({ isAgentSpeaking: false });
  }

  private async playAgentAudio(audioBase64: string) {
    try {
      console.log('Playing agent audio...');
      
      if (Platform.OS === 'web') {
        await this.playAgentAudioWeb(audioBase64);
      } else {
        await this.playAgentAudioMobile(audioBase64);
      }
    } catch (error) {
      console.error('Error playing agent audio:', error);
      this.updateState({ isAgentSpeaking: false });
    }
  }

  private async playAgentAudioWeb(audioBase64: string) {
    const audioBlob = this.base64ToBlob(audioBase64, 'audio/mpeg');
    const audioUrl = URL.createObjectURL(audioBlob);
    
    // Stop any currently playing audio
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }
    
    this.currentAudio = new Audio(audioUrl);
    
    // Set up audio event handlers
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
      this.updateState({ isAgentSpeaking: false });
    }
  }

  private async playAgentAudioMobile(audioBase64: string) {
    try {
      // Stop any currently playing audio
      if (this.sound) {
        await this.sound.stopAsync();
        await this.sound.unloadAsync();
        this.sound = null;
      }

      // Convert base64 to blob and create a temporary URI
      const audioBlob = this.base64ToBlob(audioBase64, 'audio/mpeg');
      
      // For React Native, we need to create a data URI
      const reader = new FileReader();
      const audioUri = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(audioBlob);
      });

      // Create and load the sound
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        { shouldPlay: true, isLooping: false }
      );

      this.sound = sound;

      // Set up playback status update
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          if (status.isPlaying) {
            this.updateState({ isAgentSpeaking: true });
          } else if (status.didJustFinish) {
            this.updateState({ isAgentSpeaking: false });
            // Clean up
            sound.unloadAsync();
            this.sound = null;
          }
        }
      });

      console.log('Mobile audio playback started');
    } catch (error) {
      console.error('Error playing mobile audio:', error);
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
      
      if (Platform.OS === 'web') {
        return await this.startRecordingWeb();
      } else {
        return await this.startRecordingMobile();
      }
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

  private async startRecordingWeb(): Promise<boolean> {
    // Resume audio context if suspended
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

    this.mediaRecorder = new MediaRecorder(stream, {
      mimeType: mimeType || undefined
    });

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    this.mediaRecorder.onstop = () => {
      this.sendAudioToAgent();
      
      // Clean up the stream
      if (this.recordingStream) {
        this.recordingStream.getTracks().forEach(track => track.stop());
        this.recordingStream = null;
      }
    };

    this.mediaRecorder.start(250);
    this.isRecording = true;
    this.updateState({ isUserSpeaking: true });
    
    return true;
  }

  private async startRecordingMobile(): Promise<boolean> {
    try {
      // Request permissions
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Microphone permission not granted');
      }

      // Set audio mode for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
      });

      // Create recording
      this.recording = new Audio.Recording();
      
      const recordingOptions = {
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 128000,
        },
      };

      await this.recording.prepareToRecordAsync(recordingOptions);
      await this.recording.startAsync();
      
      this.isRecording = true;
      this.updateState({ isUserSpeaking: true });
      
      console.log('Mobile recording started successfully');
      return true;
    } catch (error) {
      console.error('Error starting mobile recording:', error);
      this.recording = null;
      throw error;
    }
  }

  stopRecording() {
    if (!this.isRecording) {
      console.log('Cannot stop recording: not currently recording');
      return;
    }

    console.log('Stopping recording...');
    
    try {
      if (Platform.OS === 'web') {
        this.stopRecordingWeb();
      } else {
        this.stopRecordingMobile();
      }
    } catch (error) {
      console.error('Error stopping recording:', error);
      this.isRecording = false;
      this.updateState({ isUserSpeaking: false });
    }
  }

  private stopRecordingWeb() {
    if (this.mediaRecorder) {
      this.mediaRecorder.stop();
    }
    this.isRecording = false;
    this.updateState({ isUserSpeaking: false });
  }

  private async stopRecordingMobile() {
    if (this.recording) {
      try {
        await this.recording.stopAndUnloadAsync();
        const uri = this.recording.getURI();
        
        // Convert the recorded audio to base64 and send to agent
        if (uri) {
          await this.sendMobileAudioToAgent(uri);
        }
        
        this.recording = null;
      } catch (error) {
        console.error('Error stopping mobile recording:', error);
        this.recording = null;
      }
    }
    
    this.isRecording = false;
    this.updateState({ isUserSpeaking: false });
    
    // Reset audio mode
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
      });
    } catch (error) {
      console.error('Error resetting audio mode:', error);
    }
  }

  private async sendAudioToAgent() {
    if (this.audioChunks.length === 0 || !this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
      console.log('Cannot send audio: no chunks or websocket not ready');
      return;
    }

    try {
      const audioBlob = new Blob(this.audioChunks, { type: this.mediaRecorder?.mimeType || 'audio/webm' });
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

  private async sendMobileAudioToAgent(uri: string) {
    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
      console.log('Cannot send mobile audio: websocket not ready');
      return;
    }

    try {
      // Read the file as base64
      const response = await fetch(uri);
      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

      const message = {
        type: 'user_audio_chunk',
        audio_event: {
          audio_base_64: base64Audio,
          audio_format: 'm4a'
        }
      };

      this.websocket.send(JSON.stringify(message));
      console.log('Mobile audio sent to agent successfully');
    } catch (error) {
      console.error('Error sending mobile audio to agent:', error);
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
    if (this.isRecording) {
      if (Platform.OS === 'web' && this.mediaRecorder) {
        try {
          this.mediaRecorder.stop();
        } catch (error) {
          console.error('Error stopping media recorder during cleanup:', error);
        }
      } else if (Platform.OS !== 'web' && this.recording) {
        this.recording.stopAndUnloadAsync().catch(error => {
          console.error('Error stopping mobile recording during cleanup:', error);
        });
      }
    }
    
    // Stop recording stream (web)
    if (this.recordingStream) {
      this.recordingStream.getTracks().forEach(track => track.stop());
      this.recordingStream = null;
    }
    
    // Stop audio playback
    if (Platform.OS === 'web') {
      if (this.currentAudio) {
        this.currentAudio.pause();
        this.currentAudio = null;
      }
    } else {
      if (this.sound) {
        this.sound.stopAsync().then(() => {
          this.sound?.unloadAsync();
          this.sound = null;
        }).catch(error => {
          console.error('Error stopping mobile audio during cleanup:', error);
        });
      }
    }
    
    // Clean up WebSocket
    this.websocket = null;
    this.mediaRecorder = null;
    this.recording = null;
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
    if (Platform.OS === 'web') {
      if (this.audioContext && this.audioContext.state === 'suspended') {
        try {
          await this.audioContext.resume();
          console.log('Audio context resumed');
        } catch (error) {
          console.error('Error resuming audio context:', error);
        }
      }
    } else {
      // For mobile, ensure audio mode is set correctly
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
          staysActiveInBackground: false,
        });
        console.log('Mobile audio mode enabled');
      } catch (error) {
        console.error('Error enabling mobile audio:', error);
      }
    }
  }
}

export default ElevenLabsAgentService;