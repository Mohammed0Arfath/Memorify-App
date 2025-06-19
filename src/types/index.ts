export interface DiaryEntry {
  id: string;
  date: Date;
  chatMessages: ChatMessage[];
  generatedEntry: string;
  emotion: Emotion;
  photo?: string;
  summary: string;
}

export interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export interface Emotion {
  primary: EmotionType;
  intensity: number; // 0-1
  secondary?: EmotionType;
  color: string;
  emoji: string;
}

export type EmotionType = 
  | 'joy' 
  | 'gratitude' 
  | 'calm' 
  | 'melancholy' 
  | 'anxiety' 
  | 'excitement' 
  | 'reflection' 
  | 'hope' 
  | 'nostalgia' 
  | 'contentment';

export type ViewMode = 'chat' | 'timeline' | 'calendar' | 'agent';