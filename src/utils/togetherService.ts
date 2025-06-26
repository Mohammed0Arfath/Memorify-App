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

      // Extract comprehensive data from entries
      const emotionCounts: Record<string, number> = {};
      const allThemes: string[] = [];
      const entryTexts: string[] = [];

      entries.forEach(entry => {
        // Count emotions
        emotionCounts[entry.emotion.primary] = (emotionCounts[entry.emotion.primary] || 0) + 1;
        
        // Extract text content
        const userMessages = entry.chatMessages
          .filter(msg => msg.isUser)
          .map(msg => msg.text)
          .join(' ');
        
        entryTexts.push(`${entry.generatedEntry} ${userMessages}`);
        
        // Extract potential themes from entry content
        const words = entry.generatedEntry.toLowerCase().split(/\s+/);
        const themeWords = words.filter(word => 
          word.length > 4 && 
          !['today', 'feeling', 'think', 'about', 'really', 'would', 'could', 'should'].includes(word)
        );
        allThemes.push(...themeWords.slice(0, 3)); // Top 3 theme words per entry
      });

      // Create comprehensive analysis text
      const analysisText = `
Weekly Diary Analysis:
Total entries: ${entries.length}
Date range: ${entries[entries.length - 1]?.date.toDateString()} to ${entries[0]?.date.toDateString()}

Emotions observed: ${Object.entries(emotionCounts).map(([emotion, count]) => `${emotion} (${count} times)`).join(', ')}

Entry contents for analysis:
${entryTexts.join('\n\n---\n\n')}
      `.trim();

      if (!TOGETHER_CONFIG.apiKey) {
        // Fallback analysis when no API key
        return this.generateFallbackInsight(entries, emotionCounts);
      }

      const systemPrompt = `You are an expert emotional intelligence analyst specializing in personal growth insights. Analyze the provided weekly diary data and generate meaningful insights.

CRITICAL: Return ONLY a valid JSON object with this exact structure:
{
  "dominant_emotions": ["emotion1", "emotion2", "emotion3"],
  "emotion_distribution": {"joy": 2, "reflection": 3, "calm": 1},
  "key_themes": ["personal growth", "relationships", "work-life balance"],
  "growth_observations": ["You've shown increased self-awareness this week", "Your emotional vocabulary is expanding"],
  "recommended_actions": ["Continue journaling daily", "Practice mindfulness meditation"],
  "mood_trend": "improving",
  "generated_visual_prompt": "A serene watercolor painting showing gentle waves of emotion flowing through a peaceful landscape, with warm colors representing growth and cool tones for reflection"
}

Guidelines:
- dominant_emotions: Top 2-3 emotions from the data, most frequent first
- emotion_distribution: Exact counts from the entries
- key_themes: 2-4 meaningful themes extracted from content (not just emotions)
- growth_observations: 2-3 specific, personalized insights about their emotional journey
- recommended_actions: 2-3 actionable suggestions for continued growth
- mood_trend: "improving", "declining", or "stable" based on emotional patterns
- generated_visual_prompt: Artistic description for mood visualization (abstract, no people)

Be specific, personal, and encouraging. Focus on growth and positive patterns while acknowledging challenges.`;

      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Analyze this weekly diary data and provide insights:\n\n${analysisText}` }
      ];

      const data = await this.makeRequest(messages, { maxTokens: 600, temperature: 0.7 });
      const response = data.choices[0]?.message?.content;
      
      if (response) {
        try {
          // Clean the response to ensure it's valid JSON
          const cleanedResponse = response.trim();
          const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
          
          if (!jsonMatch) {
            throw new Error('No JSON object found in response');
          }

          const insight = JSON.parse(jsonMatch[0]);
          
          // Validate and ensure all required fields exist
          const validatedInsight = {
            dominant_emotions: Array.isArray(insight.dominant_emotions) ? insight.dominant_emotions : Object.keys(emotionCounts).slice(0, 3),
            emotion_distribution: insight.emotion_distribution && typeof insight.emotion_distribution === 'object' ? insight.emotion_distribution : emotionCounts,
            key_themes: Array.isArray(insight.key_themes) ? insight.key_themes : ['personal reflection', 'emotional awareness'],
            growth_observations: Array.isArray(insight.growth_observations) ? insight.growth_observations : ['You\'re developing greater emotional awareness through consistent journaling'],
            recommended_actions: Array.isArray(insight.recommended_actions) ? insight.recommended_actions : ['Continue your daily reflection practice'],
            mood_trend: ['improving', 'declining', 'stable'].includes(insight.mood_trend) ? insight.mood_trend : 'stable',
            generated_visual_prompt: typeof insight.generated_visual_prompt === 'string' ? insight.generated_visual_prompt : 'A gentle abstract representation of emotional growth and self-discovery'
          };

          return validatedInsight;
        } catch (parseError) {
          errorHandler.logError(parseError instanceof Error ? parseError : new Error('Failed to parse weekly insight'), {
            action: 'parse_weekly_insight',
            component: 'TogetherService',
            additionalData: { response: response.slice(0, 200) }
          }, 'medium');
          
          // Return fallback insight on parse error
          return this.generateFallbackInsight(entries, emotionCounts);
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
      
      // Return fallback insight on any error
      const emotionCounts: Record<string, number> = {};
      entries.forEach(entry => {
        emotionCounts[entry.emotion.primary] = (emotionCounts[entry.emotion.primary] || 0) + 1;
      });
      
      return this.generateFallbackInsight(entries, emotionCounts);
    }
  }

  private generateFallbackInsight(entries: DiaryEntry[], emotionCounts: Record<string, number>): Partial<WeeklyInsight> {
    // Generate meaningful fallback insights based on actual data
    const dominantEmotions = Object.entries(emotionCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([emotion]) => emotion);

    const totalEntries = entries.length;
    const avgIntensity = entries.reduce((sum, entry) => sum + entry.emotion.intensity, 0) / totalEntries;

    // Determine mood trend based on emotion intensity over time
    const firstHalf = entries.slice(Math.floor(totalEntries / 2));
    const secondHalf = entries.slice(0, Math.floor(totalEntries / 2));
    
    const firstHalfAvg = firstHalf.reduce((sum, entry) => sum + entry.emotion.intensity, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, entry) => sum + entry.emotion.intensity, 0) / secondHalf.length;
    
    let moodTrend: 'improving' | 'declining' | 'stable' = 'stable';
    if (secondHalfAvg > firstHalfAvg + 0.1) moodTrend = 'improving';
    else if (secondHalfAvg < firstHalfAvg - 0.1) moodTrend = 'declining';

    // Extract themes from entry content
    const allText = entries.map(entry => entry.generatedEntry + ' ' + entry.summary).join(' ').toLowerCase();
    const commonThemes = ['personal growth', 'self-reflection', 'emotional awareness', 'mindfulness', 'relationships', 'work-life balance'];
    const detectedThemes = commonThemes.filter(theme => 
      allText.includes(theme.replace('-', ' ')) || 
      allText.includes(theme.split(' ')[0]) || 
      allText.includes(theme.split(' ')[1])
    ).slice(0, 3);

    return {
      dominant_emotions: dominantEmotions,
      emotion_distribution: emotionCounts,
      key_themes: detectedThemes.length > 0 ? detectedThemes : ['personal reflection', 'emotional awareness'],
      growth_observations: [
        `You've maintained consistent journaling with ${totalEntries} entries this week`,
        avgIntensity > 0.7 ? 'Your emotional experiences have been quite intense, showing deep engagement with your feelings' : 'You\'ve shown balanced emotional awareness throughout the week',
        dominantEmotions.includes('reflection') ? 'Your reflective nature is helping you process experiences thoughtfully' : `Your primary emotional theme of ${dominantEmotions[0]} suggests meaningful personal experiences`
      ],
      recommended_actions: [
        'Continue your consistent journaling practice',
        moodTrend === 'improving' ? 'Build on the positive momentum you\'ve created' : 'Focus on self-care and emotional balance',
        'Consider exploring the themes that emerged in your reflections more deeply'
      ],
      mood_trend: moodTrend,
      generated_visual_prompt: `A ${moodTrend === 'improving' ? 'uplifting' : moodTrend === 'declining' ? 'gentle and supportive' : 'balanced and serene'} abstract watercolor composition representing ${dominantEmotions[0]} and personal growth, with flowing organic shapes in warm and cool tones`
    };
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