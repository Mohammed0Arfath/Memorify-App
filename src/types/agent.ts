export interface AgentMemory {
  id: string;
  user_id: string;
  memory_type: 'pattern' | 'preference' | 'milestone' | 'concern';
  content: string;
  emotional_context: string[];
  importance_score: number; // 0-1
  created_at: Date;
  last_accessed: Date;
  access_count: number;
}

export interface AgentCheckin {
  id: string;
  user_id: string;
  trigger_type: 'inactivity' | 'emotional_pattern' | 'milestone' | 'scheduled';
  message: string;
  emotional_context?: string;
  is_read: boolean;
  created_at: Date;
  responded_at?: Date;
}

export interface WeeklyInsight {
  id: string;
  user_id: string;
  week_start: Date;
  week_end: Date;
  dominant_emotions: string[];
  emotion_distribution: Record<string, number>;
  key_themes: string[];
  growth_observations: string[];
  recommended_actions: string[];
  mood_trend?: 'improving' | 'declining' | 'stable';
  generated_visual_prompt?: string;
  created_at: Date;
}

export interface AgentSettings {
  id: string;
  user_id: string;
  is_agentic_mode_enabled: boolean;
  personality_type: 'therapist' | 'poet' | 'coach' | 'friend' | 'philosopher';
  check_in_frequency: 'daily' | 'every_2_days' | 'weekly' | 'as_needed';
  proactive_insights: boolean;
  visual_generation: boolean;
  last_check_in: Date;
  created_at: Date;
  updated_at: Date;
}

export interface AgentState {
  memories: AgentMemory[];
  settings: AgentSettings;
  pendingCheckins: AgentCheckin[];
  weeklyInsights: WeeklyInsight[];
}