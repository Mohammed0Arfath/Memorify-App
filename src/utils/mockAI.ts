import { analyzeEmotion } from './emotions';
import { ChatMessage, DiaryEntry, Emotion } from '../types';
import { togetherService } from './togetherService';

export async function generateDiaryEntry(messages: ChatMessage[]): Promise<string> {
  // Check if Together.ai API key is available
  if (import.meta.env.VITE_TOGETHER_API_KEY) {
    try {
      return await togetherService.generateDiaryEntry(messages);
    } catch (error) {
      console.warn('Together.ai service failed, falling back to mock generation:', error);
      // Continue to fallback generation below
    }
  }

  // Fallback to mock generation
  const userMessages = messages.filter(msg => msg.isUser).map(msg => msg.text).join(' ');
  
  const templates = [
    "Today brought a mix of emotions and experiences. {reflection} The day reminded me of the importance of {insight}, and I'm grateful for {gratitude}.",
    "Reflecting on today, I feel {emotion}. {reflection} This experience taught me {lesson}, and I'm looking forward to {future}.",
    "Today was a day of {theme}. {reflection} I'm learning to appreciate {appreciation} and finding peace in {peace}.",
    "As I think about my day, {emotion} comes to mind. {reflection} There's something beautiful about {beauty}, and I'm reminded that {wisdom}.",
  ];

  const template = templates[Math.floor(Math.random() * templates.length)];
  
  return template
    .replace('{reflection}', getRandomReflection(userMessages))
    .replace('{emotion}', getEmotionPhrase(userMessages))
    .replace('{insight}', 'staying present in the moment')
    .replace('{gratitude}', 'the small moments that bring joy')
    .replace('{lesson}', 'to trust the process')
    .replace('{future}', 'tomorrow\'s possibilities')
    .replace('{theme}', getTheme(userMessages))
    .replace('{appreciation}', 'life\'s simple pleasures')
    .replace('{peace}', 'quiet moments of self-care')
    .replace('{beauty}', 'unexpected connections')
    .replace('{wisdom}', 'growth comes in many forms');
}

function getRandomReflection(text: string): string {
  const reflections = [
    "The conversations and moments throughout the day shaped my perspective in meaningful ways.",
    "I found myself noticing details I might have otherwise missed.",
    "There were moments that challenged me to think differently about things.",
    "The day unfolded with a gentle rhythm that I'm learning to appreciate.",
    "I discovered something new about myself through today's experiences.",
  ];
  return reflections[Math.floor(Math.random() * reflections.length)];
}

function getEmotionPhrase(text: string): string {
  const emotion = analyzeEmotion(text);
  const phrases = {
    joy: 'a sense of lightness and happiness',
    gratitude: 'deep appreciation and thankfulness',
    calm: 'peaceful serenity',
    melancholy: 'quiet contemplation',
    anxiety: 'the need for grounding and breath',
    excitement: 'vibrant energy and enthusiasm',
    reflection: 'thoughtful introspection',
    hope: 'renewed optimism',
    nostalgia: 'warm memories and connection to the past',
    contentment: 'settled satisfaction',
  };
  return phrases[emotion.primary];
}

function getTheme(text: string): string {
  const themes = ['growth', 'connection', 'discovery', 'mindfulness', 'gratitude', 'reflection'];
  return themes[Math.floor(Math.random() * themes.length)];
}

export async function generateAIResponse(userMessage: string, conversationHistory: ChatMessage[] = []): Promise<string> {
  // Check if Together.ai API key is available
  if (import.meta.env.VITE_TOGETHER_API_KEY) {
    try {
      return await togetherService.generateAIResponse(userMessage, conversationHistory);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.warn('Together.ai service failed, falling back to mock responses:', errorMessage);
      
      // If it's a quota exceeded error, we'll still fall back but could show a different message
      if (errorMessage === 'QUOTA_EXCEEDED') {
        console.warn('Together.ai API quota exceeded, using fallback responses');
      }
      // Continue to fallback responses below
    }
  }

  // Fallback to mock responses
  const responses = [
    "That sounds like a meaningful experience. How did that make you feel in the moment?",
    "I can sense there's something deeper here. What stood out to you most about today?",
    "Thank you for sharing that with me. What emotions are you noticing as you reflect on this?",
    "It sounds like today brought some important insights. What would you like to explore further?",
    "I'm hearing both challenge and growth in what you're sharing. How are you processing all of this?",
    "That's a beautiful way to look at it. What does this experience teach you about yourself?",
    "I appreciate you being so open. How do you want to carry this feeling forward?",
    "There's wisdom in your reflection. What part of today are you most grateful for?",
  ];
  
  return responses[Math.floor(Math.random() * responses.length)];
}

export async function analyzeEmotionWithAI(text: string): Promise<Emotion> {
  // Check if Together.ai API key is available
  if (import.meta.env.VITE_TOGETHER_API_KEY) {
    try {
      return await togetherService.analyzeEmotionWithAI(text);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.warn('Together.ai emotion analysis failed, falling back to rule-based analysis:', errorMessage);
      // Continue to fallback analysis below
    }
  }

  // Fallback to rule-based analysis
  return analyzeEmotion(text);
}