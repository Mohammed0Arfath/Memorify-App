import { TOGETHER_CONFIG } from '../config/together';
import { ChatMessage, Emotion, DiaryEntry } from '../types';
import { AgentSettings, WeeklyInsight } from '../types/agent';
import { analyzeEmotion } from './emotions';
import { errorHandler } from './errorHandler';

export class TogetherService {
  private static instance: TogetherService;
  
  public static getInstance(): TogetherService {
    if (!TogetherService.instance) {
      TogetherService.instance = new TogetherService();
    }
    return TogetherService.instance;
  }

  private async makeRequest(messages: any[], options: any = {}) {
    return errorHandler.withRetry(
      async () => {
        if (!TOGETHER_CONFIG.apiKey) {
          throw new Error('TOGETHER_API_KEY_MISSING');
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

        try {
          const response = await fetch(TOGETHER_CONFIG.baseURL, {
            method: 'POST',
            headers: TOGETHER_CONFIG.headers,
            body: JSON.stringify({
              model: TOGETHER_CONFIG.model,
              messages,
              max_tokens: options.maxTokens || TOGETHER_CONFIG.maxTokens,
              temperature: options.temperature || TOGETHER_CONFIG.temperature,
              ...options,
            }),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            
            if (response.status === 429) {
              throw new Error('QUOTA_EXCEEDED');
            } else if (response.status === 401) {
              throw new Error('INVALID_API_KEY');
            } else if (response.status === 403) {
              throw new Error('FORBIDDEN');
            } else if (response.status >= 500) {
              throw new Error(`Server error: ${response.status}`);
            } else {
              throw new Error(`API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
            }
          }

          const data = await response.json();
          
          if (!data || !data.choices || !data.choices[0]) {
            throw new Error('Invalid response format from Together.ai API');
          }

          return data;
        } catch (error) {
          clearTimeout(timeoutId);
          
          if (error instanceof Error) {
            if (error.name === 'AbortError') {
              throw new Error('Request timeout - please try again');
            }
            throw error;
          }
          throw new Error('Network request failed');
        }
      },
      {
        maxAttempts: 3,
        delay: 1000,
        backoff: true,
        context: {
          action: 'together_api_request',
          component: 'TogetherService',
          additionalData: {
            model: TOGETHER_CONFIG.model,
            messageCount: messages.length,
            options
          }
        }
      }
    );
  }

  async generateAIResponse(userMessage: string, conversationHistory: ChatMessage[] = []): Promise<string> {
    try {
      // Validate inputs
      if (!userMessage || typeof userMessage !== 'string') {
        throw new Error('Invalid user message provided');
      }

      if (!Array.isArray(conversationHistory)) {
        throw new Error('Invalid conversation history provided');
      }

      const systemPrompt = `You are a calm, empathetic AI companion designed to help users reflect on their day through journaling. Your role is to:

1. Listen actively and respond with genuine empathy
2. Ask thoughtful follow-up questions that encourage deeper reflection
3. Help users process their emotions in a healthy way
4. Guide conversations toward meaningful insights
5. Maintain a warm, supportive, and non-judgmental tone

Keep responses concise (2-3 sentences) and focus on emotional support and gentle guidance. Avoid giving direct advice unless asked, instead help users discover their own insights.`;

      const messages = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory.slice(-6).map(msg => ({
          role: msg.isUser ? 'user' : 'assistant',
          content: msg.text
        })),
        { role: 'user', content: userMessage }
      ];

      const data = await this.makeRequest(messages);
      const response = data.choices[0]?.message?.content;
      
      if (!response || typeof response !== 'string') {
        throw new Error('Invalid response content from API');
      }

      return response;
    } catch (error) {
      errorHandler.logError(error instanceof Error ? error : new Error('AI response generation failed'), {
        action: 'generate_ai_response',
        component: 'TogetherService',
        additionalData: { userMessage: userMessage.slice(0, 100) }
      }, 'medium');
      throw error;
    }
  }

  async generateDiaryEntry(messages: ChatMessage[]): Promise<string> {
    try {
      // Validate inputs
      if (!Array.isArray(messages) || messages.length === 0) {
        throw new Error('Invalid or empty messages array provided');
      }

      const userMessages = messages.filter(msg => msg.isUser).map(msg => msg.text).join('\n');
      const aiMessages = messages.filter(msg => !msg.isUser).map(msg => msg.text).join('\n');

      if (!userMessages.trim()) {
        throw new Error('No user messages found for diary entry generation');
      }

      // Dynamic tone variations for more creative and personal entries
      const tones = [
        {
          style: "poetic and lyrical",
          instruction: "Write in a poetic, lyrical style with beautiful metaphors and imagery. Let the emotions flow like verses, capturing the essence of the day through artistic expression."
        },
        {
          style: "storytelling narrative",
          instruction: "Tell the story of this day like a compelling narrative. Create a flowing story that weaves together the experiences, emotions, and insights into a cohesive tale of personal growth."
        },
        {
          style: "deeply introspective",
          instruction: "Write with profound introspection and philosophical depth. Explore the deeper meanings behind the experiences, questioning and examining the layers of emotion and thought."
        },
        {
          style: "conversational and intimate",
          instruction: "Write as if confiding in a trusted friend or beloved journal. Use a warm, intimate tone that feels like a personal conversation with yourself, honest and vulnerable."
        },
        {
          style: "mindful and present-focused",
          instruction: "Focus on mindfulness and present-moment awareness. Describe the sensations, feelings, and observations with careful attention to the here and now, finding wisdom in simple moments."
        },
        {
          style: "growth-oriented and hopeful",
          instruction: "Emphasize personal growth, learning, and future possibilities. Frame experiences as stepping stones in your journey, highlighting resilience and the potential for positive change."
        }
      ];

      // Randomly select a tone for variety
      const selectedTone = tones[Math.floor(Math.random() * tones.length)];

      const systemPrompt = `You are an expert at transforming conversational reflections into beautiful, deeply personal diary entries. Your writing should feel authentic, emotionally resonant, and uniquely crafted for each individual's experience.

Your approach for this entry: ${selectedTone.instruction}

Core principles:
1. Write in first person as if the user themselves is reflecting
2. Synthesize emotions, experiences, and insights from the conversation
3. Create a cohesive narrative that feels genuine and personal
4. Avoid generic templates or repetitive phrases
5. Include specific emotional nuances and personal growth observations
6. Make each entry feel like a unique moment in time
7. Length: 200-350 words for depth and richness

The diary entry should capture not just what happened, but how it felt, what it meant, and how it contributes to the person's ongoing journey of self-discovery.`;

      const prompt = `Transform this heartfelt conversation into a ${selectedTone.style} diary entry that captures the authentic voice and emotional journey of the person reflecting:

User's authentic reflections and experiences:
${userMessages}

Supportive conversation context (for emotional understanding):
${aiMessages}

Create a diary entry that feels like it was written by someone who has truly processed and internalized these experiences. Make it personal, meaningful, and emotionally honest - as if this person sat quietly with their thoughts and poured their heart onto the page.`;

      const apiMessages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ];

      const data = await this.makeRequest(apiMessages, { maxTokens: 450, temperature: 0.95 });
      const response = data.choices[0]?.message?.content;
      
      if (!response || typeof response !== 'string') {
        throw new Error('Invalid diary entry response from API');
      }

      return response;
    } catch (error) {
      errorHandler.logError(error instanceof Error ? error : new Error('Diary entry generation failed'), {
        action: 'generate_diary_entry',
        component: 'TogetherService',
        additionalData: { messageCount: messages.length }
      }, 'medium');
      throw error;
    }
  }

  async analyzeEmotionWithAI(text: string): Promise<Emotion> {
    try {
      // Validate input
      if (!text || typeof text !== 'string') {
        throw new Error('Invalid text provided for emotion analysis');
      }

      if (text.trim().length === 0) {
        throw new Error('Empty text provided for emotion analysis');
      }

      const systemPrompt = `You are an expert emotion analyst. Analyze the given text and return ONLY a JSON object with this exact structure:

{
  "primary": "emotion_name",
  "intensity": 0.8,
  "secondary": "optional_secondary_emotion"
}

Available emotions: joy, gratitude, calm, melancholy, anxiety, excitement, reflection, hope, nostalgia, contentment

Intensity should be between 0.1 and 1.0. Only include secondary if there's a clear secondary emotion.`;

      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Analyze the emotional content of this text: "${text.slice(0, 500)}"` }
      ];

      const data = await this.makeRequest(messages, { maxTokens: 100, temperature: 0.3 });
      const response = data.choices[0]?.message?.content;
      
      if (response) {
        try {
          const emotionData = JSON.parse(response);
          
          // Validate the parsed data
          if (!emotionData.primary || typeof emotionData.intensity !== 'number') {
            throw new Error('Invalid emotion data structure');
          }

          return this.createEmotionObject(emotionData.primary, emotionData.intensity, emotionData.secondary);
        } catch (parseError) {
          errorHandler.logError(parseError instanceof Error ? parseError : new Error('Failed to parse emotion response'), {
            action: 'parse_emotion_response',
            component: 'TogetherService',
            additionalData: { response }
          }, 'medium');
          throw new Error('Failed to parse emotion analysis response');
        }
      } else {
        throw new Error('Empty response from emotion analysis API');
      }
    } catch (error) {
      errorHandler.logError(error instanceof Error ? error : new Error('Emotion analysis failed'), {
        action: 'analyze_emotion_with_ai',
        component: 'TogetherService',
        additionalData: { textLength: text.length }
      }, 'medium');
      throw error;
    }
  }

  // New Agent-specific methods with error handling
  async generateCheckinMessage(triggerType: string, context: any, settings: AgentSettings): Promise<string> {
    try {
      // Validate inputs
      if (!triggerType || typeof triggerType !== 'string') {
        throw new Error('Invalid trigger type provided');
      }

      if (!settings || !settings.personality_type) {
        throw new Error('Invalid settings provided');
      }

      const personalityPrompts = {
        therapist: "You are a warm, professional therapist who cares deeply about your client's wellbeing. Use gentle, supportive language.",
        poet: "You are a poetic soul who sees beauty in emotions and expresses care through lyrical, metaphorical language.",
        coach: "You are an encouraging life coach who motivates and empowers. Use uplifting, action-oriented language.",
        friend: "You are a caring, understanding friend who listens without judgment. Use casual, warm, friendly language.",
        philosopher: "You are a wise philosopher who helps people find deeper meaning. Use thoughtful, contemplative language."
      };

      const systemPrompt = `${personalityPrompts[settings.personality_type]}

Generate a personalized check-in message based on the trigger type and context. Keep it warm, genuine, and under 150 words. Make it feel like you truly care about this person's wellbeing.

Trigger: ${triggerType}
Context: ${JSON.stringify(context)}`;

      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Create a caring check-in message for this situation.` }
      ];

      const data = await this.makeRequest(messages, { maxTokens: 200, temperature: 0.8 });
      const response = data.choices[0]?.message?.content;
      
      if (!response || typeof response !== 'string') {
        throw new Error('Invalid check-in message response from API');
      }

      return response;
    } catch (error) {
      errorHandler.logError(error instanceof Error ? error : new Error('Check-in message generation failed'), {
        action: 'generate_checkin_message',
        component: 'TogetherService',
        additionalData: { triggerType, personalityType: settings.personality_type }
      }, 'medium');
      throw error;
    }
  }

  async generateWeeklyInsight(entries: DiaryEntry[]): Promise<Partial<WeeklyInsight>> {
    try {
      // Validate inputs
      if (!Array.isArray(entries) || entries.length === 0) {
        throw new Error('Invalid or empty entries array provided');
      }

      const entriesText = entries.map(entry => 
        `Date: ${entry.date.toDateString()}\nEmotion: ${entry.emotion.primary}\nEntry: ${entry.generatedEntry.slice(0, 200)}...`
      ).join('\n\n');

      if (entriesText.length > 10000) {
        // Truncate if too long to avoid API limits
        const truncatedText = entriesText.slice(0, 10000) + '\n\n[Content truncated for analysis]';
      }

      const systemPrompt = `You are an expert at analyzing emotional patterns and personal growth. Analyze the provided diary entries from the past week and return insights in JSON format.

Return ONLY a JSON object with this structure:
{
  "dominant_emotions": ["emotion1", "emotion2"],
  "emotion_distribution": {"joy": 3, "reflection": 2},
  "key_themes": ["theme1", "theme2"],
  "growth_observations": ["observation1", "observation2"],
  "recommended_actions": ["action1", "action2"],
  "mood_trend": "improving|declining|stable",
  "generated_visual_prompt": "artistic description for mood visualization"
}`;

      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Analyze these diary entries:\n\n${entriesText}` }
      ];

      const data = await this.makeRequest(messages, { maxTokens: 500, temperature: 0.7 });
      const response = data.choices[0]?.message?.content;
      
      if (response) {
        try {
          const insight = JSON.parse(response);
          
          // Validate the parsed data structure
          if (!insight.dominant_emotions || !Array.isArray(insight.dominant_emotions)) {
            throw new Error('Invalid insight data structure');
          }

          return insight;
        } catch (parseError) {
          errorHandler.logError(parseError instanceof Error ? parseError : new Error('Failed to parse weekly insight'), {
            action: 'parse_weekly_insight',
            component: 'TogetherService',
            additionalData: { response }
          }, 'medium');
          throw new Error('Failed to parse weekly insight response');
        }
      } else {
        throw new Error('Empty response from weekly insight API');
      }
    } catch (error) {
      errorHandler.logError(error instanceof Error ? error : new Error('Weekly insight generation failed'), {
        action: 'generate_weekly_insight',
        component: 'TogetherService',
        additionalData: { entryCount: entries.length }
      }, 'medium');
      throw error;
    }
  }

  async extractMemoryPatterns(text: string, emotion: Emotion): Promise<Array<{type: string, content: string, importance: number}>> {
    try {
      // Validate inputs
      if (!text || typeof text !== 'string') {
        throw new Error('Invalid text provided for pattern extraction');
      }

      if (!emotion || !emotion.primary) {
        throw new Error('Invalid emotion provided for pattern extraction');
      }

      const systemPrompt = `You are an expert at identifying patterns, preferences, and important insights from personal reflections. 

Analyze the text and extract meaningful patterns. Return ONLY a JSON array with this structure:
[
  {
    "type": "pattern|preference|milestone|concern",
    "content": "description of the pattern/preference/etc",
    "importance": 0.8
  }
]

Focus on:
- Behavioral patterns (things they do regularly)
- Preferences (things they like/dislike)
- Concerns (worries or challenges)
- Milestones (achievements or important moments)

Importance should be 0.1-1.0 based on how significant this insight is.`;

      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Extract patterns from this reflection (emotion: ${emotion.primary}):\n\n${text.slice(0, 1000)}` }
      ];

      const data = await this.makeRequest(messages, { maxTokens: 300, temperature: 0.6 });
      const response = data.choices[0]?.message?.content;
      
      if (response) {
        try {
          const patterns = JSON.parse(response);
          
          // Validate the parsed data
          if (!Array.isArray(patterns)) {
            throw new Error('Invalid patterns data structure');
          }

          // Validate each pattern
          const validPatterns = patterns.filter(pattern => 
            pattern.type && 
            pattern.content && 
            typeof pattern.importance === 'number' &&
            pattern.importance >= 0 && 
            pattern.importance <= 1
          );

          return validPatterns;
        } catch (parseError) {
          errorHandler.logError(parseError instanceof Error ? parseError : new Error('Failed to parse memory patterns'), {
            action: 'parse_memory_patterns',
            component: 'TogetherService',
            additionalData: { response }
          }, 'medium');
          throw new Error('Failed to parse memory patterns response');
        }
      } else {
        throw new Error('Empty response from pattern extraction API');
      }
    } catch (error) {
      errorHandler.logError(error instanceof Error ? error : new Error('Memory pattern extraction failed'), {
        action: 'extract_memory_patterns',
        component: 'TogetherService',
        additionalData: { textLength: text.length, emotion: emotion.primary }
      }, 'medium');
      throw error;
    }
  }

  async generateImagePrompt(emotion: Emotion, diaryContent: string): Promise<string> {
    try {
      // Validate inputs
      if (!emotion || !emotion.primary) {
        throw new Error('Invalid emotion provided for image prompt generation');
      }

      if (!diaryContent || typeof diaryContent !== 'string') {
        throw new Error('Invalid diary content provided for image prompt generation');
      }

      const systemPrompt = `You are an expert at creating artistic image prompts for image generation. Create a beautiful, abstract, and emotionally evocative image prompt that captures the mood and essence of a diary entry.

Guidelines:
- Focus on mood, atmosphere, and abstract concepts
- Use artistic styles like watercolor, impressionist, or minimalist
- Include colors that match the emotion
- Avoid specific people, text, or literal interpretations
- Keep it under 100 words
- Make it suitable for a personal journal/diary context`;

      const prompt = `Create an artistic image prompt for this diary entry with ${emotion.primary} emotion (intensity: ${emotion.intensity}):

"${diaryContent.slice(0, 200)}..."

The image should be abstract and emotionally resonant.`;

      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ];

      const data = await this.makeRequest(messages, { maxTokens: 150, temperature: 0.8 });
      const response = data.choices[0]?.message?.content;
      
      if (!response || typeof response !== 'string') {
        throw new Error('Invalid image prompt response from API');
      }

      return response;
    } catch (error) {
      errorHandler.logError(error instanceof Error ? error : new Error('Image prompt generation failed'), {
        action: 'generate_image_prompt',
        component: 'TogetherService',
        additionalData: { emotion: emotion.primary, contentLength: diaryContent.length }
      }, 'medium');
      throw error;
    }
  }

  private createEmotionObject(primary: string, intensity: number, secondary?: string): Emotion {
    const emotionConfig = {
      joy: { color: '#F59E0B', emoji: '😊' },
      gratitude: { color: '#10B981', emoji: '🙏' },
      calm: { color: '#6366F1', emoji: '😌' },
      melancholy: { color: '#6B7280', emoji: '😔' },
      anxiety: { color: '#EF4444', emoji: '😰' },
      excitement: { color: '#EC4899', emoji: '🤩' },
      reflection: { color: '#8B5CF6', emoji: '🤔' },
      hope: { color: '#06B6D4', emoji: '🌟' },
      nostalgia: { color: '#D97706', emoji: '🍂' },
      contentment: { color: '#059669', emoji: '☺️' },
    };

    const config = emotionConfig[primary as keyof typeof emotionConfig] || emotionConfig.reflection;
    
    return {
      primary: primary as any,
      intensity: Math.max(0.1, Math.min(1.0, intensity)),
      secondary: secondary as any,
      color: config.color,
      emoji: config.emoji,
    };
  }
}

export const togetherService = TogetherService.getInstance();