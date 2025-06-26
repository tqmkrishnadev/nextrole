import { Platform } from 'react-native';

export interface InterviewQuestion {
  id: string;
  question: string;
  category: 'behavioral' | 'technical' | 'leadership';
  difficulty: 'easy' | 'medium' | 'hard';
  expectedDuration: number; // in seconds
  followUpQuestions?: string[];
}

export interface InterviewResponse {
  questionId: string;
  question: string;
  response: string;
  duration: number;
  timestamp: string;
  audioUrl?: string;
}

export interface InterviewFeedback {
  overallScore: number;
  strengths: string[];
  improvements: string[];
  detailedFeedback: {
    questionId: string;
    score: number;
    feedback: string;
    suggestions: string[];
  }[];
  recommendations: string[];
}

export interface ConversationTurn {
  id: string;
  type: 'ai_question' | 'user_response' | 'ai_followup';
  content: string;
  timestamp: string;
  duration?: number;
}

class AIInterviewService {
  private static instance: AIInterviewService;
  private elevenLabsApiKey: string | null = null;
  private openAIApiKey: string | null = null;
  private conversationHistory: ConversationTurn[] = [];

  static getInstance(): AIInterviewService {
    if (!AIInterviewService.instance) {
      AIInterviewService.instance = new AIInterviewService();
    }
    return AIInterviewService.instance;
  }

  constructor() {
    this.elevenLabsApiKey = process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY || null;
    this.openAIApiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY || null;
  }

  generateQuestions(type: 'behavioral' | 'technical' | 'leadership', count: number = 5): InterviewQuestion[] {
    const questionBank = this.getQuestionBank();
    const filteredQuestions = questionBank.filter(q => q.category === type);
    
    const shuffled = filteredQuestions.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  async generateDynamicFollowUp(userResponse: string, originalQuestion: string, category: string): Promise<string> {
    if (!this.openAIApiKey) {
      return this.generateStaticFollowUp(userResponse, category);
    }

    try {
      const prompt = `
You are an experienced interviewer conducting a ${category} interview. 
The candidate just answered: "${originalQuestion}"
Their response was: "${userResponse}"

Generate a natural, conversational follow-up question that:
1. Builds on their specific response
2. Digs deeper into their experience
3. Feels like a natural conversation
4. Is appropriate for a ${category} interview
5. Is concise (1-2 sentences max)

Respond only with the follow-up question, no additional text.
`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.openAIApiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'You are an expert interviewer. Generate natural, conversational follow-up questions based on candidate responses.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 150,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0].message.content.trim();
    } catch (error) {
      console.error('Dynamic follow-up generation error:', error);
      return this.generateStaticFollowUp(userResponse, category);
    }
  }

  private generateStaticFollowUp(userResponse: string, category: string): string {
    const responseWords = userResponse.toLowerCase();
    
    if (category === 'behavioral') {
      if (responseWords.includes('team') || responseWords.includes('collaboration')) {
        return "That's interesting. How did you handle any conflicts or differing opinions within the team during this situation?";
      } else if (responseWords.includes('challenge') || responseWords.includes('difficult')) {
        return "It sounds like you navigated that well. What specific skills did you develop from this experience that you still use today?";
      } else if (responseWords.includes('project') || responseWords.includes('deadline')) {
        return "Great approach. How did you measure the success of this project, and what would you do differently next time?";
      } else {
        return "Thank you for that example. Can you walk me through what you learned from this experience and how it has influenced your approach since then?";
      }
    } else if (category === 'technical') {
      if (responseWords.includes('debug') || responseWords.includes('problem')) {
        return "That's a solid approach. Can you give me an example of a particularly challenging technical issue you solved recently?";
      } else if (responseWords.includes('code') || responseWords.includes('review')) {
        return "Code quality is important. How do you balance writing clean, maintainable code with meeting tight deadlines?";
      } else {
        return "That demonstrates good technical thinking. How do you stay updated with new technologies and decide which ones to learn?";
      }
    } else { // leadership
      if (responseWords.includes('motivate') || responseWords.includes('team')) {
        return "Leadership styles vary. Can you describe a time when you had to adapt your approach for different team members?";
      } else if (responseWords.includes('decision') || responseWords.includes('difficult')) {
        return "Decision-making is crucial. How do you gather input from your team when making important decisions?";
      } else {
        return "That shows strong leadership. How do you measure your effectiveness as a leader?";
      }
    }
  }

  async textToSpeech(text: string, voiceId: string = 'pNInz6obpgDQGcFmaJgB'): Promise<string | null> {
    if (!this.elevenLabsApiKey) {
      console.warn('ElevenLabs API key not configured, using fallback');
      return null;
    }

    try {
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': this.elevenLabsApiKey,
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.6,
            similarity_boost: 0.8,
            style: 0.2,
            use_speaker_boost: true,
          },
        }),
      });

      if (!response.ok) {
        console.warn(`ElevenLabs API error: ${response.status}, falling back to browser speech`);
        return null;
      }

      const audioBlob = await response.blob();
      
      if (Platform.OS === 'web') {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(audioBlob);
        });
      }

      return URL.createObjectURL(audioBlob);
    } catch (error) {
      console.error('Text-to-speech error:', error);
      return null;
    }
  }

  async speechToText(audioBlob: Blob): Promise<string | null> {
    if (!this.openAIApiKey) {
      console.warn('OpenAI API key not configured for speech-to-text');
      return null;
    }

    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'audio.webm');
      formData.append('model', 'whisper-1');
      formData.append('language', 'en');

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openAIApiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`OpenAI Whisper API error: ${response.status}`);
      }

      const data = await response.json();
      return data.text;
    } catch (error) {
      console.error('Speech-to-text error:', error);
      return null;
    }
  }

  async analyzeResponses(responses: InterviewResponse[]): Promise<InterviewFeedback> {
    if (!this.openAIApiKey) {
      console.warn('OpenAI API key not configured, using mock feedback');
      return this.generateMockFeedback(responses);
    }

    try {
      const prompt = this.buildAnalysisPrompt(responses);
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.openAIApiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'You are an expert interview coach and HR professional. Analyze interview responses and provide constructive, actionable feedback that helps candidates improve their interview performance.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 2000,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const analysis = data.choices[0].message.content;
      
      return this.parseFeedbackResponse(analysis, responses);
    } catch (error) {
      console.error('Response analysis error:', error);
      return this.generateMockFeedback(responses);
    }
  }

  addConversationTurn(turn: ConversationTurn) {
    this.conversationHistory.push(turn);
  }

  getConversationHistory(): ConversationTurn[] {
    return [...this.conversationHistory];
  }

  clearConversationHistory() {
    this.conversationHistory = [];
  }

  async startSpeechRecognition(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (Platform.OS !== 'web' || !('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
        reject(new Error('Speech recognition not supported'));
        return;
      }

      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognition = new SpeechRecognition();

      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;

      let finalTranscript = '';
      let timeoutId: NodeJS.Timeout;

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

        // Clear existing timeout
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        // Set new timeout for silence detection
        timeoutId = setTimeout(() => {
          if (finalTranscript.trim() || interimTranscript.trim()) {
            recognition.stop();
            resolve((finalTranscript + interimTranscript).trim());
          }
        }, 2000); // 2 seconds of silence
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        reject(new Error(`Speech recognition error: ${event.error}`));
      };

      recognition.onend = () => {
        console.log('Speech recognition ended');
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        if (finalTranscript.trim()) {
          resolve(finalTranscript.trim());
        }
      };

      recognition.start();
    });
  }

  private getQuestionBank(): InterviewQuestion[] {
    return [
      // Behavioral Questions
      {
        id: 'beh_001',
        question: "Tell me about a time when you had to work with a difficult team member. How did you handle the situation and what was the outcome?",
        category: 'behavioral',
        difficulty: 'medium',
        expectedDuration: 120,
        followUpQuestions: [
          "What would you do differently if faced with a similar situation?",
          "How did this experience change your approach to teamwork?"
        ]
      },
      {
        id: 'beh_002',
        question: "Describe a situation where you had to meet a tight deadline with limited resources. What steps did you take to ensure success?",
        category: 'behavioral',
        difficulty: 'medium',
        expectedDuration: 90,
      },
      {
        id: 'beh_003',
        question: "Tell me about a time when you failed at something important. How did you handle it and what did you learn from the experience?",
        category: 'behavioral',
        difficulty: 'hard',
        expectedDuration: 150,
      },
      {
        id: 'beh_004',
        question: "Describe a situation where you had to adapt to significant changes at work. How did you manage the transition and help others adapt?",
        category: 'behavioral',
        difficulty: 'medium',
        expectedDuration: 120,
      },
      {
        id: 'beh_005',
        question: "Tell me about a time when you had to convince someone to see things your way. What approach did you take and what was the result?",
        category: 'behavioral',
        difficulty: 'hard',
        expectedDuration: 135,
      },
      {
        id: 'beh_006',
        question: "Describe a situation where you went above and beyond what was expected of you. What motivated you to do so?",
        category: 'behavioral',
        difficulty: 'medium',
        expectedDuration: 110,
      },
      {
        id: 'beh_007',
        question: "Tell me about a time when you had to give difficult feedback to a colleague or team member. How did you approach it?",
        category: 'behavioral',
        difficulty: 'hard',
        expectedDuration: 140,
      },

      // Technical Questions
      {
        id: 'tech_001',
        question: "Walk me through your approach to debugging a complex technical issue. What tools and methodologies do you use to identify and resolve problems?",
        category: 'technical',
        difficulty: 'medium',
        expectedDuration: 180,
      },
      {
        id: 'tech_002',
        question: "How do you stay current with new technologies and industry trends? Can you give me an example of something you've learned recently and how you applied it?",
        category: 'technical',
        difficulty: 'easy',
        expectedDuration: 90,
      },
      {
        id: 'tech_003',
        question: "Describe a technical project you're particularly proud of. What challenges did you face and how did you overcome them?",
        category: 'technical',
        difficulty: 'medium',
        expectedDuration: 200,
      },
      {
        id: 'tech_004',
        question: "How do you approach code reviews? What do you look for when reviewing someone else's code, and how do you handle feedback on your own code?",
        category: 'technical',
        difficulty: 'medium',
        expectedDuration: 120,
      },
      {
        id: 'tech_005',
        question: "Explain how you would design a system to handle high traffic loads. What considerations would you make for scalability and performance?",
        category: 'technical',
        difficulty: 'hard',
        expectedDuration: 240,
      },
      {
        id: 'tech_006',
        question: "Tell me about a time when you had to learn a new technology quickly for a project. How did you approach the learning process?",
        category: 'technical',
        difficulty: 'medium',
        expectedDuration: 130,
      },
      {
        id: 'tech_007',
        question: "How do you ensure code quality and maintainability in your projects? What practices and tools do you use?",
        category: 'technical',
        difficulty: 'medium',
        expectedDuration: 150,
      },

      // Leadership Questions
      {
        id: 'lead_001',
        question: "Describe your leadership style. How do you motivate and guide your team members to achieve their best performance?",
        category: 'leadership',
        difficulty: 'medium',
        expectedDuration: 150,
      },
      {
        id: 'lead_002',
        question: "Tell me about a time when you had to make a difficult decision that affected your team. How did you approach it and communicate the decision?",
        category: 'leadership',
        difficulty: 'hard',
        expectedDuration: 180,
      },
      {
        id: 'lead_003',
        question: "How do you handle conflicts within your team? Can you give me a specific example of how you resolved a team conflict?",
        category: 'leadership',
        difficulty: 'hard',
        expectedDuration: 160,
      },
      {
        id: 'lead_004',
        question: "Describe how you set goals and expectations for your team. How do you track progress and provide meaningful feedback?",
        category: 'leadership',
        difficulty: 'medium',
        expectedDuration: 140,
      },
      {
        id: 'lead_005',
        question: "Tell me about a time when you had to lead a team through a major change or transformation. What was your approach and what challenges did you face?",
        category: 'leadership',
        difficulty: 'hard',
        expectedDuration: 200,
      },
      {
        id: 'lead_006',
        question: "How do you develop and mentor team members? Can you share an example of someone you helped grow in their career?",
        category: 'leadership',
        difficulty: 'medium',
        expectedDuration: 170,
      },
      {
        id: 'lead_007',
        question: "Describe a situation where you had to influence stakeholders without direct authority. How did you gain their buy-in?",
        category: 'leadership',
        difficulty: 'hard',
        expectedDuration: 160,
      },
    ];
  }

  private buildAnalysisPrompt(responses: InterviewResponse[]): string {
    let prompt = "Please analyze the following interview responses and provide detailed, constructive feedback:\n\n";
    
    responses.forEach((response, index) => {
      prompt += `Question ${index + 1}: ${response.question}\n`;
      prompt += `Response: ${response.response}\n`;
      prompt += `Duration: ${response.duration} seconds\n\n`;
    });

    prompt += `
Please provide feedback in the following JSON format:
{
  "overallScore": 85,
  "strengths": ["strength1", "strength2", "strength3"],
  "improvements": ["improvement1", "improvement2", "improvement3"],
  "detailedFeedback": [
    {
      "questionId": "question_id",
      "score": 80,
      "feedback": "detailed feedback",
      "suggestions": ["suggestion1", "suggestion2"]
    }
  ],
  "recommendations": ["recommendation1", "recommendation2", "recommendation3"]
}

Focus on:
- Communication clarity and structure
- Use of specific examples and STAR method
- Depth of insight and self-awareness
- Professional demeanor and confidence
- Relevance to the question asked
- Quantifiable results and impact
`;

    return prompt;
  }

  private parseFeedbackResponse(analysis: string, responses: InterviewResponse[]): InterviewFeedback {
    try {
      // Try to parse JSON response
      const jsonMatch = analysis.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          overallScore: parsed.overallScore || 75,
          strengths: parsed.strengths || [],
          improvements: parsed.improvements || [],
          detailedFeedback: parsed.detailedFeedback || [],
          recommendations: parsed.recommendations || []
        };
      }
    } catch (error) {
      console.error('Error parsing AI feedback:', error);
    }

    // Fallback to text parsing
    const lines = analysis.split('\n').filter(line => line.trim());
    
    const scoreMatch = analysis.match(/(\d{1,3})(?:\s*\/\s*100|\s*%|\s*out of 100)/i);
    const overallScore = scoreMatch ? Math.min(100, parseInt(scoreMatch[1])) : 75;

    const strengths = [
      "Clear communication style and good articulation",
      "Effective use of specific examples to illustrate points",
      "Professional demeanor and confident delivery"
    ];

    const improvements = [
      "Provide more quantifiable results and metrics",
      "Structure responses using the STAR method more consistently",
      "Include more details about lessons learned and personal growth"
    ];

    const detailedFeedback = responses.map((response, index) => ({
      questionId: response.questionId,
      score: Math.floor(Math.random() * 25) + 70,
      feedback: `Your response demonstrated good understanding of the situation. The example you provided was relevant and showed key competencies. Consider adding more specific metrics and outcomes to strengthen your answer.`,
      suggestions: [
        "Use the STAR method (Situation, Task, Action, Result) for better structure",
        "Include specific numbers or percentages where possible",
        "Explain the broader impact of your actions on the team or organization"
      ]
    }));

    const recommendations = [
      "Practice the STAR method for behavioral questions",
      "Prepare 5-7 strong examples that can answer multiple question types",
      "Research the company and role to tailor your responses",
      "Practice speaking clearly and at an appropriate pace",
      "Prepare thoughtful questions to ask the interviewer"
    ];

    return {
      overallScore,
      strengths,
      improvements,
      detailedFeedback,
      recommendations
    };
  }

  private generateMockFeedback(responses: InterviewResponse[]): InterviewFeedback {
    const baseScore = 75;
    const scoreVariation = Math.floor(Math.random() * 20) - 10;
    const overallScore = Math.max(50, Math.min(100, baseScore + scoreVariation));

    const strengths = [
      "Clear and articulate communication throughout the interview",
      "Good use of specific examples to demonstrate competencies",
      "Professional demeanor and confident delivery",
      "Strong problem-solving approach and analytical thinking",
      "Demonstrates self-awareness and ability to learn from experiences"
    ].slice(0, 3);

    const improvements = [
      "Provide more quantifiable results and specific metrics",
      "Structure responses using STAR method more consistently",
      "Include more leadership examples and team collaboration",
      "Elaborate on lessons learned and personal development",
      "Connect experiences more directly to role requirements"
    ].slice(0, 3);

    const detailedFeedback = responses.map(response => ({
      questionId: response.questionId,
      score: Math.floor(Math.random() * 25) + 70,
      feedback: `Your response showed good understanding and provided a relevant example. The situation you described demonstrated key skills effectively. Consider adding more specific outcomes and metrics to strengthen your answer further.`,
      suggestions: [
        "Use the STAR method for better structure and clarity",
        "Include specific numbers, percentages, or measurable outcomes",
        "Explain the broader impact of your actions on the organization"
      ]
    }));

    const recommendations = [
      "Practice the STAR method (Situation, Task, Action, Result) for all behavioral questions",
      "Prepare 5-7 strong examples that can answer multiple question types",
      "Research the company and role thoroughly to tailor your responses",
      "Practice speaking clearly and maintaining appropriate pace",
      "Prepare thoughtful questions to ask the interviewer about the role and company"
    ];

    return {
      overallScore,
      strengths,
      improvements,
      detailedFeedback,
      recommendations
    };
  }
}

export default AIInterviewService;