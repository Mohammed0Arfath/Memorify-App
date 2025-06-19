import { TOGETHER_CONFIG } from '../config/together';
import { ChatMessage, Emotion, DiaryEntry } from '../types';
import { AgentSettings, WeeklyInsight } from '../types/agent';
import { analyzeEmotion } from './emotions';

export class TogetherService {
  private static instance: TogetherService;
  
  public static getInstance(): TogetherService {
    if (!TogetherService.instance) {
      TogetherService.instance = new TogetherService();
    }
    return TogetherService.instance;
  }

  private async makeRequest(messages: any[], options: any = {}) {
    if (!TOGETHER_CONFIG.apiKey) {
      throw new Error('TOGETHER_API_KEY_MISSING');
    }

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
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      if (response.status === 429) {
        throw new Error('QUOTA_EXCEEDED');
      } else if (response.status === 401) {
        throw new Error('INVALID_API_KEY');
      } else if (response.status === 403) {
        throw new Error('FORBIDDEN');
      } else {
        console.warn('Together.ai API Error:', errorData);
        throw new Error('API_ERROR');
      }
    }

    const data = await response.json();
    return data;
  }

  async generateAIResponse(userMessage: string, conversationHistory: ChatMessage[] = []): Promise<string> {
    try {
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
      return data.choices[0]?.message?.content || "I'm here to listen. Please tell me more about your day.";
    } catch (error) {
      console.warn('Together.ai API Error:', error);
      throw error;
    }
  }

  async generateDiaryEntry(messages: ChatMessage[]): Promise<string> {
    try {
      const userMessages = messages.filter(msg => msg.isUser).map(msg => msg.text).join('\n');
      const aiMessages = messages.filter(msg => !msg.isUser).map(msg => msg.text).join('\n');

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
      return data.choices[0]?.message?.content || "Today was a day of reflection and growth. The conversations I had helped me understand myself better and appreciate the journey I'm on.";
    } catch (error) {
      console.warn('Together.ai API Error:', error);
      throw error;
    }
  }

  async analyzeEmotionWithAI(text: string): Promise<Emotion> {
    try {
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
        { role: 'user', content: `Analyze the emotional content of this text: "${text}"` }
      ];

      const data = await this.makeRequest(messages, { maxTokens: 100, temperature: 0.3 });
      const response = data.choices[0]?.message?.content;
      
      if (response) {
        try {
          const emotionData = JSON.parse(response);
          return this.createEmotionObject(emotionData.primary, emotionData.intensity, emotionData.secondary);
        } catch (parseError) {
          console.warn('Failed to parse AI emotion response, falling back to rule-based analysis');
        }
      }
    } catch (error) {
      console.warn('Together.ai Emotion Analysis Error:', error);
      throw error;
    }

    // Fallback to rule-based analysis
    return analyzeEmotion(text);
  }

  // New Agent-specific methods
  async generateCheckinMessage(triggerType: string, context: any, settings: AgentSettings): Promise<string> {
    try {
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
      return data.choices[0]?.message?.content || "How are you doing today?";
    } catch (error) {
      console.warn('Together.ai Check-in Generation Error:', error);
      throw error;
    }
  }

  async generateWeeklyInsight(entries: DiaryEntry[]): Promise<Partial<WeeklyInsight>> {
    try {
      const entriesText = entries.map(entry => 
        `Date: ${entry.date.toDateString()}\nEmotion: ${entry.emotion.primary}\nEntry: ${entry.generatedEntry.slice(0, 200)}...`
      ).join('\n\n');

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
          return JSON.parse(response);
        } catch (parseError) {
          console.warn('Failed to parse AI weekly insight response');
        }
      }
    } catch (error) {
      console.warn('Together.ai Weekly Insight Error:', error);
      throw error;
    }

    // Fallback
    throw new Error('Failed to generate weekly insight');
  }

  async extractMemoryPatterns(text: string, emotion: Emotion): Promise<Array<{type: string, content: string, importance: number}>> {
    try {
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
        { role: 'user', content: `Extract patterns from this reflection (emotion: ${emotion.primary}):\n\n${text}` }
      ];

      const data = await this.makeRequest(messages, { maxTokens: 300, temperature: 0.6 });
      const response = data.choices[0]?.message?.content;
      
      if (response) {
        try {
          return JSON.parse(response);
        } catch (parseError) {
          console.warn('Failed to parse AI pattern extraction response');
        }
      }
    } catch (error) {
      console.warn('Together.ai Pattern Extraction Error:', error);
      throw error;
    }

    // Fallback
    throw new Error('Failed to extract patterns');
  }

  async generateImagePrompt(emotion: Emotion, diaryContent: string): Promise<string> {
    try {
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
      return data.choices[0]?.message?.content || `Abstract ${emotion.primary} mood in soft watercolor style with ${emotion.color} tones`;
    } catch (error) {
      console.warn('Together.ai Image Prompt Error:', error);
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