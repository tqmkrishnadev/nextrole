export async function GET(request: Request) {
  const url = new URL(request.url);
  const userId = url.searchParams.get('userId');
  const type = url.searchParams.get('type');

  // Validate parameters
  if (!userId || !type) {
    return new Response('Missing required parameters: userId and type', {
      status: 400,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  // Validate interview type
  const validTypes = ['behavioral', 'technical', 'leadership'];
  if (!validTypes.includes(type)) {
    return new Response('Invalid interview type', {
      status: 400,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  // Get environment variables for the client
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
  const elevenLabsApiKey = process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY || '';
  const elevenLabsAgentId = process.env.EXPO_PUBLIC_ELEVENLABS_AGENT_ID || '';

  // Generate the HTML page for the mock interview with full ElevenLabs integration
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Mock Interview - ${type.charAt(0).toUpperCase() + type.slice(1)}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%);
            color: white;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 20px;
            overflow-x: hidden;
        }
        
        .container {
            max-width: 800px;
            width: 100%;
            text-align: center;
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(20px);
            border-radius: 24px;
            padding: 40px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
            position: relative;
        }
        
        .logo {
            width: 80px;
            height: 80px;
            background: linear-gradient(135deg, #667eea, #764ba2, #f093fb);
            border-radius: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 24px;
            font-size: 32px;
            animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
        }
        
        h1 {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 12px;
            background: linear-gradient(135deg, #667eea, #f093fb);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        
        .subtitle {
            font-size: 16px;
            color: rgba(255, 255, 255, 0.7);
            margin-bottom: 32px;
            line-height: 1.5;
        }
        
        .status {
            background: rgba(102, 126, 234, 0.1);
            border: 1px solid rgba(102, 126, 234, 0.3);
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 32px;
            transition: all 0.3s ease;
        }
        
        .status.connected {
            background: rgba(78, 205, 196, 0.1);
            border-color: rgba(78, 205, 196, 0.3);
        }
        
        .status.error {
            background: rgba(255, 107, 107, 0.1);
            border-color: rgba(255, 107, 107, 0.3);
        }
        
        .status-title {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 8px;
            color: #667eea;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }
        
        .status.connected .status-title {
            color: #4ecdc4;
        }
        
        .status.error .status-title {
            color: #ff6b6b;
        }
        
        .status-text {
            color: rgba(255, 255, 255, 0.8);
            line-height: 1.5;
        }
        
        .controls {
            display: flex;
            flex-direction: column;
            gap: 20px;
            margin: 32px 0;
        }
        
        .recording-section {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 16px;
        }
        
        .record-button {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            border: none;
            background: linear-gradient(135deg, #4ecdc4, #44a08d);
            color: white;
            font-size: 24px;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 8px 16px rgba(78, 205, 196, 0.3);
        }
        
        .record-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 12px 24px rgba(78, 205, 196, 0.4);
        }
        
        .record-button.recording {
            background: linear-gradient(135deg, #ff6b6b, #ee5a52);
            animation: recordingPulse 1s infinite;
        }
        
        .record-button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
        }
        
        @keyframes recordingPulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
        }
        
        .recording-hint {
            font-size: 14px;
            color: rgba(255, 255, 255, 0.7);
            text-align: center;
        }
        
        .conversation {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 16px;
            padding: 20px;
            margin: 24px 0;
            max-height: 300px;
            overflow-y: auto;
            text-align: left;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .conversation-title {
            font-size: 16px;
            font-weight: 600;
            color: #667eea;
            margin-bottom: 16px;
            text-align: center;
        }
        
        .message {
            margin-bottom: 16px;
            padding: 12px 16px;
            border-radius: 12px;
            max-width: 80%;
        }
        
        .message.ai {
            background: rgba(102, 126, 234, 0.2);
            border: 1px solid rgba(102, 126, 234, 0.3);
            margin-right: auto;
        }
        
        .message.user {
            background: rgba(78, 205, 196, 0.2);
            border: 1px solid rgba(78, 205, 196, 0.3);
            margin-left: auto;
        }
        
        .message-header {
            font-size: 12px;
            font-weight: 600;
            margin-bottom: 4px;
            opacity: 0.8;
        }
        
        .message-content {
            font-size: 14px;
            line-height: 1.4;
        }
        
        .button {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            border: none;
            border-radius: 12px;
            padding: 16px 32px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s;
            margin: 8px;
            text-decoration: none;
            display: inline-block;
        }
        
        .button:hover {
            transform: translateY(-2px);
        }
        
        .button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
        }
        
        .button.secondary {
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .button.danger {
            background: linear-gradient(135deg, #ff6b6b, #ee5a52);
        }
        
        .timer {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 20px;
            padding: 8px 16px;
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 16px;
            display: inline-block;
        }
        
        .timer.warning {
            background: rgba(255, 193, 7, 0.2);
            color: #ffc107;
        }
        
        .loading {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 3px solid rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            border-top-color: #667eea;
            animation: spin 1s ease-in-out infinite;
            margin-right: 8px;
        }
        
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        
        .hidden {
            display: none;
        }
        
        .error-message {
            background: rgba(255, 107, 107, 0.1);
            border: 1px solid rgba(255, 107, 107, 0.3);
            border-radius: 12px;
            padding: 16px;
            margin: 16px 0;
            color: #ff6b6b;
            text-align: center;
        }
        
        @media (max-width: 768px) {
            .container {
                padding: 24px;
                margin: 10px;
            }
            
            h1 {
                font-size: 24px;
            }
            
            .record-button {
                width: 70px;
                height: 70px;
                font-size: 20px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">🧠</div>
        <h1>${type.charAt(0).toUpperCase() + type.slice(1)} Interview</h1>
        <p class="subtitle">AI-powered mock interview with ElevenLabs Agent</p>
        
        <div id="timer" class="timer hidden">
            ⏱️ <span id="timer-text">10:00</span>
        </div>
        
        <div id="status" class="status">
            <div class="status-title">
                <span id="status-icon">🔄</span>
                <span id="status-title-text">Initializing</span>
            </div>
            <div id="status-text" class="status-text">
                Connecting to ElevenLabs Agent and preparing your interview session...
            </div>
        </div>
        
        <div id="error-container" class="hidden">
            <div class="error-message" id="error-message"></div>
        </div>
        
        <div id="controls" class="controls hidden">
            <div class="recording-section">
                <button id="record-button" class="record-button" onclick="toggleRecording()">
                    🎤
                </button>
                <div id="recording-hint" class="recording-hint">
                    Click and hold to speak, release to send
                </div>
            </div>
            
            <div>
                <button id="end-interview" class="button danger" onclick="endInterview()">
                    End Interview
                </button>
                <button class="button secondary" onclick="goBack()">
                    Return to App
                </button>
            </div>
        </div>
        
        <div id="conversation" class="conversation hidden">
            <div class="conversation-title">💬 Conversation</div>
            <div id="messages"></div>
        </div>
    </div>
    
    <!-- Supabase Client -->
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
    
    <script>
        // Configuration
        const CONFIG = {
            supabaseUrl: '${supabaseUrl}',
            supabaseAnonKey: '${supabaseAnonKey}',
            elevenLabsApiKey: '${elevenLabsApiKey}',
            elevenLabsAgentId: '${elevenLabsAgentId}',
            userId: '${userId}',
            interviewType: '${type}'
        };
        
        // Global state
        let supabase;
        let websocket;
        let mediaRecorder;
        let audioChunks = [];
        let isRecording = false;
        let isConnected = false;
        let conversationId = null;
        let interviewTimer = null;
        let timeRemaining = 600; // 10 minutes
        let userProfile = null;
        
        // DOM elements
        const statusEl = document.getElementById('status');
        const statusIconEl = document.getElementById('status-icon');
        const statusTitleEl = document.getElementById('status-title-text');
        const statusTextEl = document.getElementById('status-text');
        const controlsEl = document.getElementById('controls');
        const recordButtonEl = document.getElementById('record-button');
        const recordingHintEl = document.getElementById('recording-hint');
        const conversationEl = document.getElementById('conversation');
        const messagesEl = document.getElementById('messages');
        const timerEl = document.getElementById('timer');
        const timerTextEl = document.getElementById('timer-text');
        const errorContainerEl = document.getElementById('error-container');
        const errorMessageEl = document.getElementById('error-message');
        
        // Initialize the application
        async function init() {
            try {
                // Validate configuration
                if (!CONFIG.supabaseUrl || !CONFIG.supabaseAnonKey) {
                    throw new Error('Supabase configuration missing');
                }
                
                if (!CONFIG.elevenLabsApiKey || !CONFIG.elevenLabsAgentId) {
                    throw new Error('ElevenLabs configuration missing');
                }
                
                // Initialize Supabase
                supabase = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey);
                
                // Load user profile
                await loadUserProfile();
                
                // Check microphone permissions
                await checkMicrophonePermissions();
                
                // Connect to ElevenLabs Agent
                await connectToAgent();
                
            } catch (error) {
                console.error('Initialization error:', error);
                showError('Failed to initialize interview: ' + error.message);
            }
        }
        
        // Load user profile from Supabase
        async function loadUserProfile() {
            try {
                updateStatus('🔍', 'Loading Profile', 'Fetching your profile information...');
                
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', CONFIG.userId)
                    .single();
                
                if (error) {
                    console.warn('Profile not found, using defaults:', error);
                    userProfile = {
                        id: CONFIG.userId,
                        name: 'User',
                        email: 'user@example.com',
                        role: 'candidate'
                    };
                } else {
                    userProfile = data;
                }
                
                console.log('User profile loaded:', userProfile);
            } catch (error) {
                console.error('Error loading profile:', error);
                // Continue with default profile
                userProfile = {
                    id: CONFIG.userId,
                    name: 'User',
                    email: 'user@example.com',
                    role: 'candidate'
                };
            }
        }
        
        // Check microphone permissions
        async function checkMicrophonePermissions() {
            try {
                updateStatus('🎤', 'Checking Permissions', 'Requesting microphone access...');
                
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true,
                        sampleRate: 16000
                    }
                });
                
                // Stop the stream immediately
                stream.getTracks().forEach(track => track.stop());
                
                console.log('Microphone access granted');
            } catch (error) {
                console.error('Microphone permission error:', error);
                throw new Error('Microphone access is required for the interview. Please allow microphone permissions and refresh the page.');
            }
        }
        
        // Connect to ElevenLabs Agent
        async function connectToAgent() {
            try {
                updateStatus('🔗', 'Connecting', 'Establishing connection to AI agent...');
                
                const wsUrl = \`wss://api.elevenlabs.io/v1/convai/conversation?agent_id=\${CONFIG.elevenLabsAgentId}\`;
                websocket = new WebSocket(wsUrl);
                
                websocket.onopen = () => {
                    console.log('Connected to ElevenLabs Agent');
                    isConnected = true;
                    updateStatus('✅', 'Connected', 'Successfully connected to AI agent. Ready to start interview!', true);
                    showControls();
                    sendUserProfile();
                };
                
                websocket.onmessage = (event) => {
                    handleWebSocketMessage(event);
                };
                
                websocket.onerror = (error) => {
                    console.error('WebSocket error:', error);
                    showError('Failed to connect to AI agent. Please check your internet connection and try again.');
                };
                
                websocket.onclose = (event) => {
                    console.log('Disconnected from ElevenLabs Agent', event.code, event.reason);
                    isConnected = false;
                    updateStatus('❌', 'Disconnected', 'Connection to AI agent lost.');
                };
                
            } catch (error) {
                console.error('Agent connection error:', error);
                throw new Error('Failed to connect to AI agent: ' + error.message);
            }
        }
        
        // Send user profile to agent
        function sendUserProfile() {
            if (!websocket || websocket.readyState !== WebSocket.OPEN) return;
            
            const profileMessage = {
                type: 'user_profile',
                data: {
                    name: userProfile.name,
                    email: userProfile.email,
                    experience: 'Software development and product management',
                    skills: ['JavaScript', 'React', 'Node.js', 'Product Strategy'],
                    role: userProfile.role || 'candidate',
                    interviewType: CONFIG.interviewType,
                    message: \`Hello! I'm \${userProfile.name}. I'm here for a \${CONFIG.interviewType} mock interview. Please ask me relevant questions based on my profile and experience.\`
                }
            };
            
            console.log('Sending user profile to agent:', profileMessage);
            websocket.send(JSON.stringify(profileMessage));
        }
        
        // Handle WebSocket messages
        function handleWebSocketMessage(event) {
            try {
                const data = JSON.parse(event.data);
                console.log('Received WebSocket message:', data.type);
                
                switch (data.type) {
                    case 'conversation_initiation_metadata':
                        conversationId = data.conversation_id;
                        console.log('Conversation initiated:', conversationId);
                        startInterviewTimer();
                        break;
                        
                    case 'agent_response':
                        handleAgentResponse(data);
                        break;
                        
                    case 'agent_response_audio_start':
                        updateRecordingHint('AI is speaking, please wait...');
                        recordButtonEl.disabled = true;
                        break;
                        
                    case 'agent_response_audio_end':
                        updateRecordingHint('Click and hold to speak, release to send');
                        recordButtonEl.disabled = false;
                        break;
                        
                    case 'user_transcript':
                        handleUserTranscript(data);
                        break;
                        
                    case 'ping':
                        if (websocket && websocket.readyState === WebSocket.OPEN) {
                            websocket.send(JSON.stringify({ type: 'pong' }));
                        }
                        break;
                        
                    default:
                        console.log('Unknown message type:', data.type, data);
                }
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        }
        
        // Handle agent response
        async function handleAgentResponse(data) {
            console.log('Handling agent response:', data);
            
            if (data.audio_event && data.audio_event.audio_base_64) {
                await playAgentAudio(data.audio_event.audio_base_64);
            }
            
            if (data.agent_response) {
                addMessage('ai', data.agent_response);
            }
        }
        
        // Handle user transcript
        function handleUserTranscript(data) {
            console.log('User transcript received:', data);
            
            if (data.user_transcript) {
                addMessage('user', data.user_transcript);
            }
        }
        
        // Play agent audio
        async function playAgentAudio(audioBase64) {
            try {
                const audioBlob = base64ToBlob(audioBase64, 'audio/mpeg');
                const audioUrl = URL.createObjectURL(audioBlob);
                const audio = new Audio(audioUrl);
                
                audio.onended = () => {
                    URL.revokeObjectURL(audioUrl);
                };
                
                await audio.play();
            } catch (error) {
                console.error('Error playing agent audio:', error);
            }
        }
        
        // Convert base64 to blob
        function base64ToBlob(base64, mimeType) {
            const byteCharacters = atob(base64);
            const byteNumbers = new Array(byteCharacters.length);
            
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            
            const byteArray = new Uint8Array(byteNumbers);
            return new Blob([byteArray], { type: mimeType });
        }
        
        // Toggle recording
        async function toggleRecording() {
            if (isRecording) {
                stopRecording();
            } else {
                await startRecording();
            }
        }
        
        // Start recording
        async function startRecording() {
            if (!isConnected || isRecording) return;
            
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true,
                        sampleRate: 16000,
                        channelCount: 1
                    }
                });
                
                audioChunks = [];
                
                let mimeType = 'audio/webm;codecs=opus';
                if (!MediaRecorder.isTypeSupported(mimeType)) {
                    mimeType = 'audio/webm';
                    if (!MediaRecorder.isTypeSupported(mimeType)) {
                        mimeType = 'audio/mp4';
                        if (!MediaRecorder.isTypeSupported(mimeType)) {
                            mimeType = '';
                        }
                    }
                }
                
                mediaRecorder = new MediaRecorder(stream, {
                    mimeType: mimeType || undefined
                });
                
                mediaRecorder.ondataavailable = (event) => {
                    if (event.data.size > 0) {
                        audioChunks.push(event.data);
                    }
                };
                
                mediaRecorder.onstop = () => {
                    sendAudioToAgent();
                    stream.getTracks().forEach(track => track.stop());
                };
                
                mediaRecorder.start(250);
                isRecording = true;
                
                recordButtonEl.classList.add('recording');
                recordButtonEl.innerHTML = '🔴';
                updateRecordingHint('Recording... Release to send');
                
            } catch (error) {
                console.error('Error starting recording:', error);
                showError('Failed to start recording: ' + error.message);
            }
        }
        
        // Stop recording
        function stopRecording() {
            if (!isRecording || !mediaRecorder) return;
            
            mediaRecorder.stop();
            isRecording = false;
            
            recordButtonEl.classList.remove('recording');
            recordButtonEl.innerHTML = '🎤';
            updateRecordingHint('Processing...');
        }
        
        // Send audio to agent
        async function sendAudioToAgent() {
            if (audioChunks.length === 0 || !websocket || websocket.readyState !== WebSocket.OPEN) {
                updateRecordingHint('Click and hold to speak, release to send');
                return;
            }
            
            try {
                const audioBlob = new Blob(audioChunks, { type: mediaRecorder?.mimeType || 'audio/webm' });
                const arrayBuffer = await audioBlob.arrayBuffer();
                const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
                
                const message = {
                    type: 'user_audio_chunk',
                    audio_event: {
                        audio_base_64: base64Audio,
                        audio_format: mediaRecorder?.mimeType || 'webm'
                    }
                };
                
                websocket.send(JSON.stringify(message));
                console.log('Audio sent to agent successfully');
                updateRecordingHint('Click and hold to speak, release to send');
                
            } catch (error) {
                console.error('Error sending audio to agent:', error);
                showError('Failed to send audio to agent');
                updateRecordingHint('Click and hold to speak, release to send');
            }
        }
        
        // Add message to conversation
        function addMessage(type, content) {
            const messageEl = document.createElement('div');
            messageEl.className = \`message \${type}\`;
            
            const headerEl = document.createElement('div');
            headerEl.className = 'message-header';
            headerEl.textContent = type === 'ai' ? 'AI Interviewer' : 'You';
            
            const contentEl = document.createElement('div');
            contentEl.className = 'message-content';
            contentEl.textContent = content;
            
            messageEl.appendChild(headerEl);
            messageEl.appendChild(contentEl);
            
            messagesEl.appendChild(messageEl);
            conversationEl.classList.remove('hidden');
            
            // Scroll to bottom
            conversationEl.scrollTop = conversationEl.scrollHeight;
        }
        
        // Start interview timer
        function startInterviewTimer() {
            timerEl.classList.remove('hidden');
            
            interviewTimer = setInterval(() => {
                timeRemaining--;
                
                const minutes = Math.floor(timeRemaining / 60);
                const seconds = timeRemaining % 60;
                timerTextEl.textContent = \`\${minutes}:\${seconds.toString().padStart(2, '0')}\`;
                
                if (timeRemaining <= 60) {
                    timerEl.classList.add('warning');
                }
                
                if (timeRemaining <= 0) {
                    endInterview();
                }
            }, 1000);
        }
        
        // End interview
        function endInterview() {
            if (interviewTimer) {
                clearInterval(interviewTimer);
                interviewTimer = null;
            }
            
            if (websocket && websocket.readyState === WebSocket.OPEN) {
                websocket.send(JSON.stringify({ type: 'end_conversation' }));
                websocket.close();
            }
            
            updateStatus('✅', 'Interview Complete', 'Thank you for completing the mock interview!');
            controlsEl.classList.add('hidden');
            
            // Save interview data to Supabase (optional)
            saveInterviewData();
        }
        
        // Save interview data
        async function saveInterviewData() {
            try {
                if (!supabase || !conversationId) return;
                
                const interviewData = {
                    user_id: CONFIG.userId,
                    interview_type: CONFIG.interviewType,
                    conversation_id: conversationId,
                    duration: 600 - timeRemaining,
                    completed_at: new Date().toISOString()
                };
                
                // You can create an 'interviews' table in Supabase to store this data
                console.log('Interview data to save:', interviewData);
                
            } catch (error) {
                console.error('Error saving interview data:', error);
            }
        }
        
        // Utility functions
        function updateStatus(icon, title, text, isConnected = false) {
            statusIconEl.textContent = icon;
            statusTitleEl.textContent = title;
            statusTextEl.textContent = text;
            
            statusEl.className = 'status';
            if (isConnected) {
                statusEl.classList.add('connected');
            }
        }
        
        function showControls() {
            controlsEl.classList.remove('hidden');
        }
        
        function updateRecordingHint(text) {
            recordingHintEl.textContent = text;
        }
        
        function showError(message) {
            errorMessageEl.textContent = message;
            errorContainerEl.classList.remove('hidden');
            statusEl.classList.add('error');
            updateStatus('❌', 'Error', message);
        }
        
        function goBack() {
            if (window.history.length > 1) {
                window.history.back();
            } else {
                window.close();
            }
        }
        
        // Mouse events for recording button
        recordButtonEl.addEventListener('mousedown', (e) => {
            e.preventDefault();
            if (!isRecording && isConnected) {
                startRecording();
            }
        });
        
        recordButtonEl.addEventListener('mouseup', (e) => {
            e.preventDefault();
            if (isRecording) {
                stopRecording();
            }
        });
        
        recordButtonEl.addEventListener('mouseleave', (e) => {
            if (isRecording) {
                stopRecording();
            }
        });
        
        // Touch events for mobile
        recordButtonEl.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (!isRecording && isConnected) {
                startRecording();
            }
        });
        
        recordButtonEl.addEventListener('touchend', (e) => {
            e.preventDefault();
            if (isRecording) {
                stopRecording();
            }
        });
        
        // Initialize when page loads
        document.addEventListener('DOMContentLoaded', init);
        
        // Cleanup on page unload
        window.addEventListener('beforeunload', () => {
            if (websocket && websocket.readyState === WebSocket.OPEN) {
                websocket.close();
            }
            if (interviewTimer) {
                clearInterval(interviewTimer);
            }
        });
    </script>
</body>
</html>
  `;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html',
      'Cache-Control': 'no-cache',
    },
  });
}