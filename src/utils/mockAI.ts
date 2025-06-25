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

  // Fallback to contextual responses based on user input
  const lowerMessage = userMessage.toLowerCase();
  
  // Emotion-based responses
  if (lowerMessage.includes('sad') || lowerMessage.includes('down') || lowerMessage.includes('depressed')) {
    const responses = [
      "I hear that you're going through a difficult time. It's okay to feel sad - these emotions are valid and part of being human. What's been weighing on your heart?",
      "Thank you for sharing something so personal with me. Sadness can be heavy to carry. Would you like to talk about what's contributing to these feelings?",
      "It sounds like you're experiencing some deep emotions right now. Sometimes just acknowledging these feelings can be the first step. What would help you feel supported today?"
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }
  
  if (lowerMessage.includes('happy') || lowerMessage.includes('excited') || lowerMessage.includes('joy')) {
    const responses = [
      "I can feel the positive energy in your words! It's wonderful to hear about moments that bring you joy. What made this experience particularly special for you?",
      "Your happiness is contagious! I love hearing about the things that light you up. How are you planning to carry this feeling forward?",
      "There's something beautiful about genuine happiness. What aspects of this experience do you want to remember and cherish?"
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }
  
  if (lowerMessage.includes('anxious') || lowerMessage.includes('worried') || lowerMessage.includes('stress')) {
    const responses = [
      "Anxiety can feel overwhelming, but you're not alone in this. Taking time to reflect like this shows real self-awareness. What's been on your mind lately?",
      "I can sense the weight of what you're carrying. Sometimes talking through our worries can help us see them more clearly. What feels most pressing right now?",
      "Thank you for trusting me with your concerns. Anxiety often comes from caring deeply about things. What would help you feel more grounded today?"
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }
  
  if (lowerMessage.includes('grateful') || lowerMessage.includes('thankful') || lowerMessage.includes('appreciate')) {
    const responses = [
      "Gratitude has such a powerful way of shifting our perspective. I'm curious about what sparked this feeling of appreciation for you today.",
      "There's something deeply moving about genuine gratitude. It sounds like you've noticed something meaningful. What made this moment stand out?",
      "I love hearing about the things that fill your heart with gratitude. These moments often reveal what matters most to us. What does this tell you about yourself?"
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }
  
  // Topic-based responses
  if (lowerMessage.includes('work') || lowerMessage.includes('job') || lowerMessage.includes('career')) {
    const responses = [
      "Work can be such a significant part of our lives, bringing both challenges and fulfillment. How are you feeling about your professional journey right now?",
      "I'm interested in hearing more about your work experience. What aspects of your professional life are you reflecting on today?",
      "Career thoughts often connect to our deeper values and aspirations. What's been on your mind about your work lately?"
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }
  
  if (lowerMessage.includes('relationship') || lowerMessage.includes('friend') || lowerMessage.includes('family')) {
    const responses = [
      "Relationships shape so much of our emotional landscape. It sounds like there's something meaningful you'd like to explore about your connections with others.",
      "The people in our lives can bring both joy and complexity. What's been on your heart regarding your relationships lately?",
      "Human connections are such a rich source of reflection. I'm here to listen to whatever you'd like to share about the people who matter to you."
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }
  
  // General thoughtful responses
  const generalResponses = [
    "That sounds like something worth exploring further. What emotions are coming up for you as you think about this?",
    "I can sense there's something deeper here. What stands out to you most about this experience?",
    "Thank you for sharing that with me. How are you processing these thoughts and feelings?",
    "It sounds like today brought some important insights. What would you like to understand better about this situation?",
    "I'm hearing both complexity and growth in what you're sharing. What feels most significant to you right now?",
    "There's wisdom in taking time to reflect like this. What part of this experience do you want to explore more deeply?",
    "I appreciate you being so open with me. How do you want to carry these thoughts and feelings forward?",
    "What you're describing sounds meaningful. What does this experience teach you about yourself?",
  ];
  
  return generalResponses[Math.floor(Math.random() * generalResponses.length)];
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