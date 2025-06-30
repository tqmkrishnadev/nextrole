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

  // Generate the HTML page for the mock interview
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
        }
        
        .container {
            max-width: 600px;
            width: 100%;
            text-align: center;
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(20px);
            border-radius: 24px;
            padding: 40px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
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
        }
        
        .status-title {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 8px;
            color: #667eea;
        }
        
        .status-text {
            color: rgba(255, 255, 255, 0.8);
            line-height: 1.5;
        }
        
        .features {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 16px;
            margin-bottom: 32px;
        }
        
        .feature {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 12px;
            padding: 16px;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .feature-icon {
            font-size: 24px;
            margin-bottom: 8px;
        }
        
        .feature-text {
            font-size: 14px;
            color: rgba(255, 255, 255, 0.8);
        }
        
        .instructions {
            text-align: left;
            background: rgba(78, 205, 196, 0.1);
            border: 1px solid rgba(78, 205, 196, 0.2);
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 32px;
        }
        
        .instructions h3 {
            color: #4ecdc4;
            margin-bottom: 12px;
            font-size: 16px;
        }
        
        .instructions ol {
            color: rgba(255, 255, 255, 0.8);
            line-height: 1.6;
            padding-left: 20px;
        }
        
        .instructions li {
            margin-bottom: 8px;
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
        
        .button.secondary {
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .footer {
            margin-top: 32px;
            padding-top: 20px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            color: rgba(255, 255, 255, 0.6);
            font-size: 14px;
        }
        
        @media (max-width: 768px) {
            .container {
                padding: 24px;
                margin: 10px;
            }
            
            h1 {
                font-size: 24px;
            }
            
            .features {
                grid-template-columns: 1fr;
            }
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
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">🧠</div>
        <h1>${type.charAt(0).toUpperCase() + type.slice(1)} Interview</h1>
        <p class="subtitle">AI-powered mock interview session</p>
        
        <div class="status">
            <div class="status-title">🚀 Coming Soon</div>
            <div class="status-text">
                ElevenLabs Agent integration is currently being set up for this interview experience. 
                This page will soon feature real-time voice conversations with our AI interviewer.
            </div>
        </div>
        
        <div class="features">
            <div class="feature">
                <div class="feature-icon">⚡</div>
                <div class="feature-text">Real-time AI Conversation</div>
            </div>
            <div class="feature">
                <div class="feature-icon">🎤</div>
                <div class="feature-text">Natural Voice Interaction</div>
            </div>
            <div class="feature">
                <div class="feature-icon">🏆</div>
                <div class="feature-text">Personalized Questions</div>
            </div>
        </div>
        
        <div class="instructions">
            <h3>📋 What to Expect</h3>
            <ol>
                <li>The AI interviewer will ask you relevant ${type} questions</li>
                <li>Speak naturally - the AI understands conversational responses</li>
                <li>Take your time to think before answering</li>
                <li>The session will be recorded for feedback purposes</li>
                <li>You'll receive detailed feedback after completion</li>
            </ol>
        </div>
        
        <div style="margin: 24px 0;">
            <button class="button" onclick="startInterview()">
                <span class="loading" id="loading" style="display: none;"></span>
                <span id="button-text">Start Interview</span>
            </button>
            <br>
            <a href="#" class="button secondary" onclick="goBack()">Return to App</a>
        </div>
        
        <div class="footer">
            <p>User ID: ${userId} | Interview Type: ${type}</p>
            <p>Powered by ElevenLabs AI Agents</p>
        </div>
    </div>
    
    <script>
        function startInterview() {
            const button = document.querySelector('.button');
            const loading = document.getElementById('loading');
            const buttonText = document.getElementById('button-text');
            
            loading.style.display = 'inline-block';
            buttonText.textContent = 'Initializing...';
            button.disabled = true;
            
            // Simulate initialization
            setTimeout(() => {
                buttonText.textContent = 'Interview Starting Soon...';
                
                // Here you would integrate with ElevenLabs Agent
                // For now, show a placeholder message
                setTimeout(() => {
                    alert('ElevenLabs Agent integration will be implemented here. This is where the real-time voice conversation will take place.');
                    
                    // Reset button
                    loading.style.display = 'none';
                    buttonText.textContent = 'Start Interview';
                    button.disabled = false;
                }, 2000);
            }, 1000);
        }
        
        function goBack() {
            // Try to close the browser tab/window
            if (window.history.length > 1) {
                window.history.back();
            } else {
                window.close();
            }
        }
        
        // Auto-focus and prepare for interview
        document.addEventListener('DOMContentLoaded', function() {
            console.log('Mock Interview Page Loaded');
            console.log('User ID:', '${userId}');
            console.log('Interview Type:', '${type}');
            
            // You can add ElevenLabs Agent initialization here
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