import { supabase } from '../lib/supabase';
import { AgentMemory, AgentCheckin, WeeklyInsight, AgentSettings } from '../types/agent';
import { DiaryEntry } from '../types';
import { togetherService } from '../utils/togetherService';

export class AgentService {
  // Memory Management
  static async createMemory(memory: Omit<AgentMemory, 'id' | 'user_id' | 'created_at' | 'last_accessed' | 'access_count'>): Promise<AgentMemory> {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('agent_memories')
      .insert({
        user_id: user.id,
        ...memory,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create memory: ${error.message}`);
    return this.mapMemoryRow(data);
  }

  static async getMemories(limit = 50): Promise<AgentMemory[]> {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('agent_memories')
      .select('*')
      .eq('user_id', user.id)
      .order('importance_score', { ascending: false })
      .order('last_accessed', { ascending: false })
      .limit(limit);

    if (error) throw new Error(`Failed to fetch memories: ${error.message}`);
    return data.map(this.mapMemoryRow);
  }

  static async updateMemoryAccess(memoryId: string): Promise<void> {
    const { error } = await supabase
      .from('agent_memories')
      .update({
        last_accessed: new Date().toISOString(),
        access_count: supabase.sql`access_count + 1`
      })
      .eq('id', memoryId);

    if (error) throw new Error(`Failed to update memory access: ${error.message}`);
  }

  // Check-in Management
  static async createCheckin(checkin: Omit<AgentCheckin, 'id' | 'user_id' | 'created_at' | 'is_read'>): Promise<AgentCheckin> {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('agent_checkins')
      .insert({
        user_id: user.id,
        ...checkin,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create check-in: ${error.message}`);
    return this.mapCheckinRow(data);
  }

  static async getPendingCheckins(): Promise<AgentCheckin[]> {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('agent_checkins')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_read', false)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch pending check-ins: ${error.message}`);
    return data.map(this.mapCheckinRow);
  }

  static async markCheckinRead(checkinId: string): Promise<void> {
    const { error } = await supabase
      .from('agent_checkins')
      .update({
        is_read: true,
        responded_at: new Date().toISOString()
      })
      .eq('id', checkinId);

    if (error) throw new Error(`Failed to mark check-in as read: ${error.message}`);
  }

  // Settings Management
  static async getSettings(): Promise<AgentSettings> {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('agent_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch agent settings: ${error.message}`);
    }

    if (!data) {
      // Create default settings
      return await this.createDefaultSettings();
    }

    return this.mapSettingsRow(data);
  }

  static async updateSettings(updates: Partial<AgentSettings>): Promise<AgentSettings> {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('agent_settings')
      .update(updates)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update agent settings: ${error.message}`);
    return this.mapSettingsRow(data);
  }

  private static async createDefaultSettings(): Promise<AgentSettings> {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('agent_settings')
      .insert({
        user_id: user.id,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create default settings: ${error.message}`);
    return this.mapSettingsRow(data);
  }

  // Weekly Insights
  static async generateWeeklyInsight(entries: DiaryEntry[]): Promise<WeeklyInsight> {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('User not authenticated');

    const now = new Date();
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekEnd = now;

    // Analyze entries from the past week
    const weekEntries = entries.filter(entry => 
      entry.date >= weekStart && entry.date <= weekEnd
    );

    if (weekEntries.length === 0) {
      throw new Error('No entries found for the past week');
    }

    // Generate insights using AI
    const insight = await this.analyzeWeeklyPatterns(weekEntries);

    const { data, error } = await supabase
      .from('weekly_insights')
      .insert({
        user_id: user.id,
        week_start: weekStart.toISOString(),
        week_end: weekEnd.toISOString(),
        ...insight,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create weekly insight: ${error.message}`);
    return this.mapInsightRow(data);
  }

  static async getWeeklyInsights(limit = 10): Promise<WeeklyInsight[]> {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('weekly_insights')
      .select('*')
      .eq('user_id', user.id)
      .order('week_start', { ascending: false })
      .limit(limit);

    if (error) throw new Error(`Failed to fetch weekly insights: ${error.message}`);
    return data.map(this.mapInsightRow);
  }

  // Agent Loop Functions
  static async runAgentLoop(entries: DiaryEntry[]): Promise<void> {
    const settings = await this.getSettings();
    
    if (!settings.is_agentic_mode_enabled) return;

    // Check for triggers
    await this.checkInactivityTrigger(entries, settings);
    await this.checkEmotionalPatterns(entries, settings);
    await this.checkMilestones(entries, settings);
    
    // Update memories based on recent entries
    await this.updateMemoriesFromEntries(entries.slice(0, 5)); // Last 5 entries
  }

  private static async checkInactivityTrigger(entries: DiaryEntry[], settings: AgentSettings): Promise<void> {
    const lastEntry = entries[0];
    if (!lastEntry) return;

    const daysSinceLastEntry = Math.floor(
      (new Date().getTime() - lastEntry.date.getTime()) / (1000 * 60 * 60 * 24)
    );

    const thresholds = {
      daily: 1,
      every_2_days: 2,
      weekly: 7,
      as_needed: 14
    };

    const threshold = thresholds[settings.check_in_frequency];
    
    if (daysSinceLastEntry >= threshold) {
      const message = await this.generateCheckinMessage('inactivity', { daysSinceLastEntry }, settings);
      await this.createCheckin({
        trigger_type: 'inactivity',
        message,
        emotional_context: `${daysSinceLastEntry} days since last entry`
      });
    }
  }

  private static async checkEmotionalPatterns(entries: DiaryEntry[], settings: AgentSettings): Promise<void> {
    if (entries.length < 3) return;

    const recentEmotions = entries.slice(0, 3).map(e => e.emotion.primary);
    const concerningPatterns = ['anxiety', 'melancholy'];
    
    const concerningCount = recentEmotions.filter(e => concerningPatterns.includes(e)).length;
    
    if (concerningCount >= 2) {
      const message = await this.generateCheckinMessage('emotional_pattern', { 
        pattern: recentEmotions.join(', '),
        concern: true 
      }, settings);
      
      await this.createCheckin({
        trigger_type: 'emotional_pattern',
        message,
        emotional_context: `Recent pattern: ${recentEmotions.join(', ')}`
      });
    }
  }

  private static async checkMilestones(entries: DiaryEntry[], settings: AgentSettings): Promise<void> {
    const milestones = [
      { count: 7, message: "You've been journaling for a week! 🌟" },
      { count: 30, message: "30 days of reflection - incredible dedication! 🎉" },
      { count: 100, message: "100 entries! You're building a beautiful story of growth 📚" }
    ];

    const currentCount = entries.length;
    const milestone = milestones.find(m => m.count === currentCount);
    
    if (milestone) {
      const message = await this.generateCheckinMessage('milestone', { 
        count: currentCount,
        achievement: milestone.message 
      }, settings);
      
      await this.createCheckin({
        trigger_type: 'milestone',
        message,
        emotional_context: `Milestone: ${currentCount} entries`
      });
    }
  }

  private static async updateMemoriesFromEntries(entries: DiaryEntry[]): Promise<void> {
    // Define allowed memory types based on database schema
    const allowedMemoryTypes = ['pattern', 'preference', 'milestone', 'concern'];
    
    for (const entry of entries) {
      // Extract patterns and preferences
      const userMessages = entry.chatMessages.filter(m => m.isUser).map(m => m.text).join(' ');
      
      if (userMessages.length > 50) { // Only process substantial entries
        try {
          const patterns = await this.extractPatterns(userMessages, entry.emotion);
          
          for (const pattern of patterns) {
            // Validate memory type before creating memory
            if (allowedMemoryTypes.includes(pattern.type)) {
              await this.createMemory({
                memory_type: pattern.type as any,
                content: pattern.content,
                emotional_context: [entry.emotion.primary],
                importance_score: pattern.importance
              });
            } else {
              console.warn(`Skipping memory creation: invalid memory type '${pattern.type}'`);
            }
          }
        } catch (error) {
          console.warn('Failed to extract patterns from entry:', error);
        }
      }
    }
  }

  private static async generateCheckinMessage(
    triggerType: string, 
    context: any, 
    settings: AgentSettings
  ): Promise<string> {
    try {
      return await togetherService.generateCheckinMessage(triggerType, context, settings);
    } catch (error) {
      // Fallback messages
      const fallbacks = {
        inactivity: `Hey there! I noticed it's been ${context.daysSinceLastEntry} days since we last talked. How are you feeling today?`,
        emotional_pattern: `I've been thinking about our recent conversations. It seems like you've been experiencing some challenging emotions. Want to talk about it?`,
        milestone: `${context.achievement} I'm so proud of your commitment to self-reflection. How does it feel to reach this milestone?`,
        scheduled: `Good morning! How are you starting your day today?`
      };
      
      return fallbacks[triggerType as keyof typeof fallbacks] || "How are you doing today?";
    }
  }

  private static async analyzeWeeklyPatterns(entries: DiaryEntry[]): Promise<Partial<WeeklyInsight>> {
    try {
      return await togetherService.generateWeeklyInsight(entries);
    } catch (error) {
      // Fallback analysis
      const emotions = entries.map(e => e.emotion.primary);
      const emotionCounts = emotions.reduce((acc, emotion) => {
        acc[emotion] = (acc[emotion] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const dominantEmotions = Object.entries(emotionCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([emotion]) => emotion);

      return {
        dominant_emotions: dominantEmotions,
        emotion_distribution: emotionCounts,
        key_themes: ['reflection', 'growth'],
        growth_observations: ['Continued commitment to self-reflection'],
        recommended_actions: ['Keep up the great work with journaling'],
        mood_trend: 'stable'
      };
    }
  }

  private static async extractPatterns(text: string, emotion: any): Promise<Array<{type: string, content: string, importance: number}>> {
    try {
      return await togetherService.extractMemoryPatterns(text, emotion);
    } catch (error) {
      // Simple fallback pattern extraction
      const patterns = [];
      
      if (text.includes('always') || text.includes('usually') || text.includes('often')) {
        patterns.push({
          type: 'pattern',
          content: `User tends to ${text.slice(0, 100)}...`,
          importance: 0.6
        });
      }
      
      if (text.includes('love') || text.includes('enjoy') || text.includes('like')) {
        patterns.push({
          type: 'preference',
          content: `User enjoys ${text.slice(0, 100)}...`,
          importance: 0.5
        });
      }
      
      return patterns;
    }
  }

  // Mapping functions
  private static mapMemoryRow(row: any): AgentMemory {
    return {
      id: row.id,
      user_id: row.user_id,
      memory_type: row.memory_type,
      content: row.content,
      emotional_context: row.emotional_context || [],
      importance_score: row.importance_score,
      created_at: new Date(row.created_at),
      last_accessed: new Date(row.last_accessed),
      access_count: row.access_count
    };
  }

  private static mapCheckinRow(row: any): AgentCheckin {
    return {
      id: row.id,
      user_id: row.user_id,
      trigger_type: row.trigger_type,
      message: row.message,
      emotional_context: row.emotional_context,
      is_read: row.is_read,
      created_at: new Date(row.created_at),
      responded_at: row.responded_at ? new Date(row.responded_at) : undefined
    };
  }

  private static mapSettingsRow(row: any): AgentSettings {
    return {
      id: row.id,
      user_id: row.user_id,
      is_agentic_mode_enabled: row.is_agentic_mode_enabled,
      personality_type: row.personality_type,
      check_in_frequency: row.check_in_frequency,
      proactive_insights: row.proactive_insights,
      visual_generation: row.visual_generation,
      last_check_in: new Date(row.last_check_in),
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    };
  }

  private static mapInsightRow(row: any): WeeklyInsight {
    return {
      id: row.id,
      user_id: row.user_id,
      week_start: new Date(row.week_start),
      week_end: new Date(row.week_end),
      dominant_emotions: row.dominant_emotions || [],
      emotion_distribution: row.emotion_distribution || {},
      key_themes: row.key_themes || [],
      growth_observations: row.growth_observations || [],
      recommended_actions: row.recommended_actions || [],
      mood_trend: row.mood_trend,
      generated_visual_prompt: row.generated_visual_prompt,
      created_at: new Date(row.created_at)
    };
  }
}