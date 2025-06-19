import { Emotion, EmotionType } from '../types';

export const emotionConfig: Record<EmotionType, { color: string; emoji: string; bgColor: string }> = {
  joy: { color: '#F59E0B', emoji: '😊', bgColor: 'bg-amber-50' },
  gratitude: { color: '#10B981', emoji: '🙏', bgColor: 'bg-emerald-50' },
  calm: { color: '#6366F1', emoji: '😌', bgColor: 'bg-indigo-50' },
  melancholy: { color: '#6B7280', emoji: '😔', bgColor: 'bg-gray-50' },
  anxiety: { color: '#EF4444', emoji: '😰', bgColor: 'bg-red-50' },
  excitement: { color: '#EC4899', emoji: '🤩', bgColor: 'bg-pink-50' },
  reflection: { color: '#8B5CF6', emoji: '🤔', bgColor: 'bg-purple-50' },
  hope: { color: '#06B6D4', emoji: '🌟', bgColor: 'bg-cyan-50' },
  nostalgia: { color: '#D97706', emoji: '🍂', bgColor: 'bg-orange-50' },
  contentment: { color: '#059669', emoji: '☺️', bgColor: 'bg-green-50' },
};

export function analyzeEmotion(text: string): Emotion {
  const cleanedText = text.toLowerCase().replace(/[^\w\s]/gi, ''); // Remove punctuation
  const words = cleanedText.split(/\s+/);

  const emotionKeywords: Record<EmotionType, string[]> = {
    joy: ['happy', 'excited', 'amazing', 'wonderful', 'great', 'fantastic', 'love', 'perfect'],
    gratitude: ['thankful', 'grateful', 'blessed', 'appreciate', 'thank', 'fortunate'],
    calm: ['peaceful', 'relaxed', 'serene', 'quiet', 'tranquil', 'meditation', 'breathing'],
    melancholy: ['sad', 'down', 'disappointed', 'lonely', 'tired', 'difficult', 'hard'],
    anxiety: ['worried', 'stressed', 'nervous', 'anxious', 'overwhelming', 'panic', 'scared'],
    excitement: ['thrilled', 'pumped', 'energetic', 'awesome', 'incredible', 'amazing'],
    reflection: ['thinking', 'wondering', 'contemplating', 'realize', 'learned', 'growth'],
    hope: ['hopeful', 'optimistic', 'future', 'dreams', 'possibilities', 'believe'],
    nostalgia: ['remember', 'childhood', 'past', 'miss', 'memories', 'used to'],
    contentment: ['satisfied', 'fulfilled', 'peaceful', 'enough', 'balanced', 'steady'],
  };

  let bestMatch: EmotionType = 'reflection';
  let maxScore = 0;

  Object.entries(emotionKeywords).forEach(([emotion, keywords]) => {
    const score = keywords.reduce((acc, keyword) => acc + (words.includes(keyword) ? 1 : 0), 0);
    if (score > maxScore) {
      bestMatch = emotion as EmotionType;
      maxScore = score;
    }
  });

  // Always define `config` before using it!
  const config = emotionConfig[bestMatch];
  const intensity = Math.min(1, Math.max(0.3, maxScore / 3));

  return {
    primary: bestMatch,
    intensity,
    color: config.color,
    emoji: config.emoji,
  };
}
