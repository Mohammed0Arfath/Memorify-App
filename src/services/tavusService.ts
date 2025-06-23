import { TAVUS_CONFIG, VIDEO_SETTINGS } from '../config/tavus';
import { DiaryEntry, Emotion } from '../types';

export interface VideoGenerationRequest {
  script: string;
  background: string;
  pace: string;
  emotion: string;
  username?: string;
}

export interface VideoGenerationResponse {
  video_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  download_url?: string;
  preview_url?: string;
  created_at: string;
  estimated_completion?: string;
}

export class TavusService {
  private static instance: TavusService;
  
  public static getInstance(): TavusService {
    if (!TavusService.instance) {
      TavusService.instance = new TavusService();
    }
    return TavusService.instance;
  }

  private async makeRequest(endpoint: string, options: any = {}) {
    if (!TAVUS_CONFIG.apiKey) {
      throw new Error('TAVUS_API_KEY_MISSING');
    }

    const response = await fetch(`${TAVUS_CONFIG.baseURL}${endpoint}`, {
      method: 'POST',
      headers: TAVUS_CONFIG.headers,
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      if (response.status === 429) {
        throw new Error('TAVUS_QUOTA_EXCEEDED');
      } else if (response.status === 401) {
        throw new Error('TAVUS_INVALID_API_KEY');
      } else if (response.status === 403) {
        throw new Error('TAVUS_FORBIDDEN');
      } else {
        console.warn('Tavus API Error:', errorData);
        throw new Error('TAVUS_API_ERROR');
      }
    }

    return await response.json();
  }

  async generatePersonalizedVideo(
    entry: DiaryEntry, 
    username?: string
  ): Promise<VideoGenerationResponse> {
    try {
      const script = this.generateVideoScript(entry, username);
      const background = this.getEmotionBackground(entry.emotion);
      const pace = this.getEmotionPace(entry.emotion);

      const requestData = {
        replica_id: TAVUS_CONFIG.replicaId,
        script: script,
        background: background,
        properties: {
          pace: pace,
          emotion_tone: entry.emotion.primary,
          duration_preference: 'medium', // 30-60 seconds
          voice_style: 'empathetic',
          background_music: this.getBackgroundMusic(entry.emotion),
          text_overlay: false
        },
        callback_url: null // We'll poll for status instead
      };

      console.log('Generating Tavus video with request:', requestData);

      const response = await this.makeRequest('/videos', {
        body: JSON.stringify(requestData)
      });

      return {
        video_id: response.video_id,
        status: response.status || 'pending',
        download_url: response.download_url,
        preview_url: response.preview_url,
        created_at: response.created_at || new Date().toISOString(),
        estimated_completion: response.estimated_completion
      };
    } catch (error) {
      console.error('Tavus video generation failed:', error);
      throw error;
    }
  }

  async getVideoStatus(videoId: string): Promise<VideoGenerationResponse> {
    try {
      const response = await fetch(`${TAVUS_CONFIG.baseURL}/videos/${videoId}`, {
        headers: {
          'x-api-key': TAVUS_CONFIG.apiKey
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch video status');
      }

      const data = await response.json();
      
      return {
        video_id: data.video_id,
        status: data.status,
        download_url: data.download_url,
        preview_url: data.preview_url,
        created_at: data.created_at,
        estimated_completion: data.estimated_completion
      };
    } catch (error) {
      console.error('Failed to get video status:', error);
      throw error;
    }
  }

  private generateVideoScript(entry: DiaryEntry, username?: string): string {
    const name = username ? username.split('@')[0] : 'friend';
    const emotion = entry.emotion.primary;
    const intensity = Math.round(entry.emotion.intensity * 100);
    
    // Extract key themes from diary entry
    const entryText = entry.generatedEntry.toLowerCase();
    const themes = this.extractThemes(entryText);
    
    const scripts = {
      joy: [
        `Hi ${name}! I can feel the joy radiating from your day. ${themes} Your happiness is contagious, and it's wonderful to see you embracing these positive moments. Keep shining!`,
        `${name}, what a beautiful day you've had! ${themes} Your joy reminds us all to celebrate the good times. I'm so happy for you!`,
        `Hey there, ${name}! Your joyful energy is absolutely infectious. ${themes} These are the moments that make life truly special. Treasure this feeling!`
      ],
      gratitude: [
        `${name}, your grateful heart is truly inspiring. ${themes} The way you appreciate life's blessings shows such wisdom and grace. Thank you for sharing this beautiful perspective.`,
        `Hi ${name}! Your gratitude is a gift to everyone around you. ${themes} It's amazing how appreciation can transform ordinary moments into extraordinary ones.`,
        `${name}, your thankful spirit lights up everything around you. ${themes} Gratitude like yours makes the world a brighter place.`
      ],
      calm: [
        `Hello ${name}. I can sense the peaceful energy in your reflection. ${themes} This tranquility you've found is precious. Let it anchor you through whatever comes next.`,
        `${name}, your calm presence is like a gentle breeze. ${themes} In our busy world, finding this peace is a true accomplishment. Breathe it in.`,
        `Hi ${name}. The serenity in your words is beautiful. ${themes} This inner peace you've cultivated is a strength that will serve you well.`
      ],
      melancholy: [
        `${name}, I hear you, and I want you to know that what you're feeling is valid. ${themes} Sometimes we need these quieter moments to process and heal. You're not alone in this.`,
        `Hi ${name}. It's okay to feel this way sometimes. ${themes} Your sensitivity and depth are actually gifts, even when they feel heavy. Be gentle with yourself.`,
        `${name}, I'm here with you in this moment. ${themes} These feelings are part of your journey, and they don't define your worth. Tomorrow can be different.`
      ],
      anxiety: [
        `${name}, I can feel your worry, and I want you to know that you're stronger than you realize. ${themes} Take a deep breath with me. You've overcome challenges before, and you will again.`,
        `Hi ${name}. When anxiety visits, remember that it's temporary. ${themes} You have tools and strength within you. One breath at a time, one moment at a time.`,
        `${name}, your concerns show how much you care. ${themes} That caring heart of yours is a strength. Let's focus on what you can control right now.`
      ],
      excitement: [
        `${name}! Your excitement is absolutely electric! ${themes} This energy you have is amazing - channel it into all the wonderful things ahead of you!`,
        `Hi ${name}! I love your enthusiasm! ${themes} Your excitement is the fuel for amazing adventures. Keep that fire burning bright!`,
        `${name}, your vibrant energy is contagious! ${themes} This excitement you feel is life calling you toward something wonderful. Embrace it!`
      ],
      reflection: [
        `${name}, your thoughtful nature is one of your greatest strengths. ${themes} The way you examine your experiences shows real wisdom. Keep exploring these insights.`,
        `Hi ${name}. Your reflective spirit is beautiful to witness. ${themes} This self-awareness you're developing is a powerful tool for growth.`,
        `${name}, I admire how deeply you think about your experiences. ${themes} This reflection is how we turn experiences into wisdom.`
      ],
      hope: [
        `${name}, your hope is like a beacon of light. ${themes} Even in uncertainty, you choose to believe in better days. That's incredibly powerful.`,
        `Hi ${name}! Your hopeful spirit is inspiring. ${themes} Hope is the bridge between where you are and where you're going. Keep believing.`,
        `${name}, your optimism is a gift to the world. ${themes} Hope like yours has the power to create the very future you're dreaming of.`
      ],
      nostalgia: [
        `${name}, there's something beautiful about how you honor your memories. ${themes} The past has shaped you, but it doesn't limit your future. Carry the love forward.`,
        `Hi ${name}. Your connection to meaningful memories shows a heart that values deep experiences. ${themes} These memories are treasures that enrich your present.`,
        `${name}, the way you cherish your past experiences is touching. ${themes} These memories are part of your story, adding depth to who you are today.`
      ],
      contentment: [
        `${name}, your sense of contentment is truly peaceful. ${themes} Finding satisfaction in life's simple moments is a rare and beautiful gift.`,
        `Hi ${name}. Your contentment radiates such calm energy. ${themes} This inner satisfaction you've found is something many people spend their whole lives seeking.`,
        `${name}, your peaceful contentment is inspiring. ${themes} You've found something precious - the ability to be truly present and satisfied.`
      ]
    };

    const emotionScripts = scripts[emotion] || scripts.reflection;
    const selectedScript = emotionScripts[Math.floor(Math.random() * emotionScripts.length)];
    
    return selectedScript.replace('{themes}', themes);
  }

  private extractThemes(entryText: string): string {
    const themePatterns = {
      relationships: ['friend', 'family', 'love', 'relationship', 'connection'],
      work: ['work', 'job', 'project', 'meeting', 'career'],
      growth: ['learn', 'grow', 'understand', 'realize', 'discover'],
      nature: ['walk', 'outside', 'nature', 'garden', 'sky'],
      creativity: ['create', 'art', 'music', 'write', 'design'],
      health: ['exercise', 'sleep', 'energy', 'healthy', 'body'],
      mindfulness: ['meditation', 'present', 'mindful', 'breath', 'aware']
    };

    const foundThemes: string[] = [];
    
    Object.entries(themePatterns).forEach(([theme, keywords]) => {
      const matches = keywords.filter(keyword => entryText.includes(keyword)).length;
      if (matches > 0) {
        foundThemes.push(theme);
      }
    });

    if (foundThemes.length === 0) {
      return "Your journey of self-reflection continues to inspire.";
    }

    const themeMessages = {
      relationships: "The connections in your life are clearly meaningful to you.",
      work: "Your dedication to your work and goals is admirable.",
      growth: "Your commitment to personal growth shines through.",
      nature: "Your connection to the natural world brings you peace.",
      creativity: "Your creative spirit adds beauty to your days.",
      health: "Taking care of yourself shows real self-love.",
      mindfulness: "Your mindful approach to life is truly wise."
    };

    const primaryTheme = foundThemes[0];
    return themeMessages[primaryTheme as keyof typeof themeMessages] || "Your thoughtful approach to life is inspiring.";
  }

  private getEmotionBackground(emotion: Emotion): string {
    return VIDEO_SETTINGS.emotionBackgrounds[emotion.primary] || VIDEO_SETTINGS.defaultBackground;
  }

  private getEmotionPace(emotion: Emotion): string {
    return VIDEO_SETTINGS.emotionPaces[emotion.primary] || 'thoughtful';
  }

  private getBackgroundMusic(emotion: Emotion): string {
    const musicMap = {
      joy: 'uplifting_acoustic',
      gratitude: 'warm_piano',
      calm: 'ambient_nature',
      melancholy: 'gentle_strings',
      anxiety: 'soft_meditation',
      excitement: 'energetic_positive',
      reflection: 'contemplative_piano',
      hope: 'inspiring_orchestral',
      nostalgia: 'nostalgic_acoustic',
      contentment: 'peaceful_ambient'
    };

    return musicMap[emotion.primary] || 'soft_ambient';
  }

  // Fallback method for when Tavus quota is exceeded
  generateFallbackQuote(emotion: Emotion, username?: string): string {
    const name = username ? username.split('@')[0] : 'friend';
    
    const quotes = {
      joy: `"${name}, your joy today reminds us that happiness is not a destination, but a way of traveling through life."`,
      gratitude: `"${name}, gratitude turns what we have into enough, and you've mastered this beautiful art today."`,
      calm: `"${name}, in the midst of movement and chaos, you found stillness within yourself. That's true strength."`,
      melancholy: `"${name}, even in quiet moments like these, you're growing. Sometimes the soul needs to rest in the shadows to appreciate the light."`,
      anxiety: `"${name}, remember that you've survived 100% of your difficult days so far. You're stronger than you know."`,
      excitement: `"${name}, your enthusiasm is the electricity of life! Let it power your dreams and light up your path."`,
      reflection: `"${name}, the unexamined life is not worth living, and you're living yours with beautiful intention and awareness."`,
      hope: `"${name}, hope is the thing with feathers that perches in the soul. Your hope today is taking flight."`,
      nostalgia: `"${name}, memories are the treasures that we keep locked deep within the storehouse of our souls. Honor them."`,
      contentment: `"${name}, contentment is not the fulfillment of what you want, but the realization of how much you already have."`
    };

    return quotes[emotion.primary] || quotes.reflection;
  }
}

export const tavusService = TavusService.getInstance();