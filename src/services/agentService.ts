import { supabase } from '../lib/supabase';
import { AgentMemory, AgentCheckin, WeeklyInsight, AgentSettings } from '../types/agent';
import { DiaryEntry } from '../types';
import { togetherService } from '../utils/togetherService';
import { errorHandler } from '../utils/errorHandler';

export class AgentService {
  // Add a static flag to prevent concurrent agent loops
  private static isRunningAgentLoop = false;

  // Memory Management with error handling
  static async createMemory(memory: Omit<AgentMemory, 'id' | 'user_id' | 'created_at' | 'last_accessed' | 'access_count'>): Promise<AgentMemory> {
    return errorHandler.withRetry(
      async () => {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw new Error(`Authentication failed: ${userError.message}`);
        if (!user) throw new Error('User not authenticated');

        // Validate memory data
        this.validateMemoryData(memory);

        const { data, error } = await supabase
          .from('agent_memories')
          .insert({
            user_id: user.id,
            ...memory,
          })
          .select()
          .single();

        if (error) throw new Error(`Failed to create memory: ${error.message}`);
        if (!data) throw new Error('No data returned from memory creation');

        return this.mapMemoryRow(data);
      },
      {
        maxAttempts: 2,
        delay: 1000,
        context: {
          action: 'create_agent_memory',
          component: 'AgentService',
          additionalData: { memoryType: memory.memory_type }
        }
      }
    );
  }

  static async getMemories(limit = 50): Promise<AgentMemory[]> {
    return errorHandler.withRetry(
      async () => {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw new Error(`Authentication failed: ${userError.message}`);
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
          .from('agent_memories')
          .select('*')
          .eq('user_id', user.id)
          .order('importance_score', { ascending: false })
          .order('last_accessed', { ascending: false })
          .limit(Math.max(1, Math.min(100, limit))); // Ensure reasonable limits

        if (error) throw new Error(`Failed to fetch memories: ${error.message}`);
        return (data || []).map(this.mapMemoryRow);
      },
      {
        maxAttempts: 3,
        delay: 1000,
        context: {
          action: 'get_agent_memories',
          component: 'AgentService',
          additionalData: { limit }
        }
      }
    );
  }

  static async updateMemoryAccess(memoryId: string): Promise<void> {
    return errorHandler.withRetry(
      async () => {
        if (!memoryId) throw new Error('Memory ID is required');

        const { error } = await supabase
          .from('agent_memories')
          .update({
            last_accessed: new Date().toISOString(),
            access_count: supabase.sql`access_count + 1`
          })
          .eq('id', memoryId);

        if (error) throw new Error(`Failed to update memory access: ${error.message}`);
      },
      {
        maxAttempts: 2,
        delay: 500,
        context: {
          action: 'update_memory_access',
          component: 'AgentService',
          additionalData: { memoryId }
        }
      }
    );
  }

  // Check-in Management with error handling
  static async createCheckin(checkin: Omit<AgentCheckin, 'id' | 'user_id' | 'created_at' | 'is_read'>): Promise<AgentCheckin> {
    return errorHandler.withRetry(
      async () => {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw new Error(`Authentication failed: ${userError.message}`);
        if (!user) throw new Error('User not authenticated');

        // Validate checkin data
        this.validateCheckinData(checkin);

        // Enhanced duplicate prevention - check for similar check-ins in the last 24 hours
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        
        const { data: existingCheckins, error: checkError } = await supabase
          .from('agent_checkins')
          .select('id, trigger_type, created_at')
          .eq('user_id', user.id)
          .eq('trigger_type', checkin.trigger_type)
          .gte('created_at', oneDayAgo)
          .limit(1);

        if (checkError) {
          errorHandler.logError(checkError, {
            action: 'check_existing_checkins',
            component: 'AgentService',
            additionalData: { triggerType: checkin.trigger_type }
          }, 'medium');
        } else if (existingCheckins && existingCheckins.length > 0) {
          // For milestone triggers, allow if it's a different milestone
          if (checkin.trigger_type === 'milestone') {
            // Check if the milestone message is different (different achievement)
            const existingCheckin = existingCheckins[0];
            const timeDiff = new Date().getTime() - new Date(existingCheckin.created_at).getTime();
            
            // Allow new milestone if it's been at least 1 hour (different milestone)
            if (timeDiff < 60 * 60 * 1000) {
              throw new Error('DUPLICATE_CHECKIN');
            }
          } else {
            throw new Error('DUPLICATE_CHECKIN');
          }
        }

        const { data, error } = await supabase
          .from('agent_checkins')
          .insert({
            user_id: user.id,
            ...checkin,
          })
          .select()
          .single();

        if (error) throw new Error(`Failed to create check-in: ${error.message}`);
        if (!data) throw new Error('No data returned from check-in creation');

        return this.mapCheckinRow(data);
      },
      {
        maxAttempts: 1, // Don't retry duplicate checkins
        context: {
          action: 'create_agent_checkin',
          component: 'AgentService',
          additionalData: { triggerType: checkin.trigger_type }
        },
        expectedErrors: ['DUPLICATE_CHECKIN']
      }
    );
  }

  static async getPendingCheckins(): Promise<AgentCheckin[]> {
    return errorHandler.withRetry(
      async () => {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw new Error(`Authentication failed: ${userError.message}`);
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
          .from('agent_checkins')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_read', false)
          .order('created_at', { ascending: false });

        if (error) throw new Error(`Failed to fetch pending check-ins: ${error.message}`);
        return (data || []).map(this.mapCheckinRow);
      },
      {
        maxAttempts: 3,
        delay: 1000,
        context: {
          action: 'get_pending_checkins',
          component: 'AgentService'
        }
      }
    );
  }

  static async markCheckinRead(checkinId: string): Promise<void> {
    return errorHandler.withRetry(
      async () => {
        if (!checkinId) throw new Error('Check-in ID is required');

        const { error } = await supabase
          .from('agent_checkins')
          .update({
            is_read: true,
            responded_at: new Date().toISOString()
          })
          .eq('id', checkinId);

        if (error) throw new Error(`Failed to mark check-in as read: ${error.message}`);
      },
      {
        maxAttempts: 2,
        delay: 500,
        context: {
          action: 'mark_checkin_read',
          component: 'AgentService',
          additionalData: { checkinId }
        }
      }
    );
  }

  // Settings Management with error handling
  static async getSettings(): Promise<AgentSettings> {
    return errorHandler.withRetry(
      async () => {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw new Error(`Authentication failed: ${userError.message}`);
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
          .from('agent_settings')
          .select('*')
          .eq('user_id', user.id)
          .limit(1);

        if (error) {
          throw new Error(`Failed to fetch agent settings: ${error.message}`);
        }

        if (!data || data.length === 0) {
          // Create default settings
          return await this.createDefaultSettings();
        }

        return this.mapSettingsRow(data[0]);
      },
      {
        maxAttempts: 3,
        delay: 1000,
        context: {
          action: 'get_agent_settings',
          component: 'AgentService'
        }
      }
    );
  }

  static async updateSettings(updates: Partial<AgentSettings>): Promise<AgentSettings> {
    return errorHandler.withRetry(
      async () => {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw new Error(`Authentication failed: ${userError.message}`);
        if (!user) throw new Error('User not authenticated');

        // Validate settings updates
        this.validateSettingsUpdates(updates);

        const { data, error } = await supabase
          .from('agent_settings')
          .update(updates)
          .eq('user_id', user.id)
          .select()
          .single();

        if (error) throw new Error(`Failed to update agent settings: ${error.message}`);
        if (!data) throw new Error('Settings not found or update failed');

        return this.mapSettingsRow(data);
      },
      {
        maxAttempts: 2,
        delay: 1000,
        context: {
          action: 'update_agent_settings',
          component: 'AgentService'
        }
      }
    );
  }

  private static async createDefaultSettings(): Promise<AgentSettings> {
    return errorHandler.withRetry(
      async () => {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw new Error(`Authentication failed: ${userError.message}`);
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
          .from('agent_settings')
          .insert({
            user_id: user.id,
          })
          .select()
          .single();

        if (error) throw new Error(`Failed to create default settings: ${error.message}`);
        if (!data) throw new Error('No data returned from settings creation');

        return this.mapSettingsRow(data);
      },
      {
        maxAttempts: 2,
        delay: 1000,
        context: {
          action: 'create_default_settings',
          component: 'AgentService'
        }
      }
    );
  }

  // Weekly Insights with enhanced error handling and better fallback
  static async generateWeeklyInsight(entries: DiaryEntry[]): Promise<WeeklyInsight> {
    return errorHandler.withRetry(
      async () => {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw new Error(`Authentication failed: ${userError.message}`);
        if (!user) throw new Error('User not authenticated');

        if (!entries || entries.length === 0) {
          throw new Error('No entries provided for insight generation');
        }

        // Calculate proper week boundaries
        const now = new Date();
        const currentDayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
        
        // Calculate the start of the current week (Sunday)
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - currentDayOfWeek);
        weekStart.setHours(0, 0, 0, 0);
        
        // Calculate the end of the current week (Saturday)
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        // Filter entries for the current week
        const weekEntries = entries.filter(entry => {
          const entryDate = new Date(entry.date);
          return entryDate >= weekStart && entryDate <= weekEnd;
        });

        if (weekEntries.length === 0) {
          throw new Error('No entries found for the current week');
        }

        // Generate comprehensive insights with enhanced error handling
        let insight: Partial<WeeklyInsight>;
        
        try {
          insight = await togetherService.generateWeeklyInsight(weekEntries);
        } catch (aiError) {
          errorHandler.logError(aiError instanceof Error ? aiError : new Error('AI insight generation failed'), {
            action: 'ai_weekly_insight_generation',
            component: 'AgentService',
            additionalData: { entryCount: weekEntries.length }
          }, 'medium');
          
          // Generate fallback insight based on actual data
          insight = this.generateLocalWeeklyInsight(weekEntries);
        }

        // Ensure all required fields are present
        const completeInsight = {
          user_id: user.id,
          week_start: weekStart.toISOString(),
          week_end: weekEnd.toISOString(),
          dominant_emotions: insight.dominant_emotions || [],
          emotion_distribution: insight.emotion_distribution || {},
          key_themes: insight.key_themes || [],
          growth_observations: insight.growth_observations || [],
          recommended_actions: insight.recommended_actions || [],
          mood_trend: insight.mood_trend || 'stable',
          generated_visual_prompt: insight.generated_visual_prompt || null,
        };

        const { data, error } = await supabase
          .from('weekly_insights')
          .insert(completeInsight)
          .select()
          .single();

        if (error) throw new Error(`Failed to create weekly insight: ${error.message}`);
        if (!data) throw new Error('No data returned from insight creation');

        return this.mapInsightRow(data);
      },
      {
        maxAttempts: 2,
        delay: 2000,
        context: {
          action: 'generate_weekly_insight',
          component: 'AgentService',
          additionalData: { entryCount: entries.length }
        }
      }
    );
  }

  // Enhanced local insight generation for fallback
  private static generateLocalWeeklyInsight(entries: DiaryEntry[]): Partial<WeeklyInsight> {
    // Analyze emotions
    const emotionCounts: Record<string, number> = {};
    let totalIntensity = 0;
    
    entries.forEach(entry => {
      emotionCounts[entry.emotion.primary] = (emotionCounts[entry.emotion.primary] || 0) + 1;
      totalIntensity += entry.emotion.intensity;
    });

    const avgIntensity = totalIntensity / entries.length;
    const dominantEmotions = Object.entries(emotionCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([emotion]) => emotion);

    // Analyze mood trend
    const firstHalf = entries.slice(Math.floor(entries.length / 2));
    const secondHalf = entries.slice(0, Math.floor(entries.length / 2));
    
    const firstHalfAvg = firstHalf.reduce((sum, entry) => sum + entry.emotion.intensity, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, entry) => sum + entry.emotion.intensity, 0) / secondHalf.length;
    
    let moodTrend: 'improving' | 'declining' | 'stable' = 'stable';
    if (secondHalfAvg > firstHalfAvg + 0.15) moodTrend = 'improving';
    else if (secondHalfAvg < firstHalfAvg - 0.15) moodTrend = 'declining';

    // Extract themes from content
    const allText = entries.map(entry => 
      `${entry.generatedEntry} ${entry.summary} ${entry.chatMessages.filter(m => m.isUser).map(m => m.text).join(' ')}`
    ).join(' ').toLowerCase();

    const themeKeywords = {
      'personal growth': ['growth', 'learning', 'development', 'progress', 'improve'],
      'relationships': ['friend', 'family', 'relationship', 'connect', 'social'],
      'work-life balance': ['work', 'job', 'career', 'balance', 'stress'],
      'mindfulness': ['mindful', 'present', 'meditation', 'awareness', 'calm'],
      'creativity': ['creative', 'art', 'music', 'write', 'express'],
      'health & wellness': ['health', 'exercise', 'sleep', 'energy', 'wellness'],
      'gratitude': ['grateful', 'thankful', 'appreciate', 'blessing', 'grateful'],
      'challenges': ['difficult', 'challenge', 'struggle', 'overcome', 'tough']
    };

    const detectedThemes = Object.entries(themeKeywords)
      .filter(([theme, keywords]) => 
        keywords.some(keyword => allText.includes(keyword))
      )
      .map(([theme]) => theme)
      .slice(0, 4);

    // Generate personalized observations
    const observations = [
      `You've maintained consistent journaling with ${entries.length} entries this week, showing dedication to self-reflection`,
    ];

    if (avgIntensity > 0.7) {
      observations.push('Your emotional experiences have been quite intense, indicating deep engagement with your feelings and experiences');
    } else if (avgIntensity < 0.4) {
      observations.push('You\'ve experienced relatively calm emotions this week, suggesting a period of stability and balance');
    } else {
      observations.push('You\'ve shown balanced emotional awareness throughout the week, processing both highs and lows thoughtfully');
    }

    if (dominantEmotions.includes('reflection')) {
      observations.push('Your reflective nature is helping you process experiences thoughtfully and gain deeper insights');
    } else if (dominantEmotions.includes('gratitude')) {
      observations.push('Your focus on gratitude is creating a positive foundation for personal growth and wellbeing');
    } else if (dominantEmotions.includes('joy')) {
      observations.push('The joy you\'ve experienced this week highlights the positive aspects of your journey');
    }

    // Generate actionable recommendations
    const recommendations = [
      'Continue your consistent journaling practice as it\'s clearly supporting your emotional awareness',
    ];

    if (moodTrend === 'improving') {
      recommendations.push('Build on the positive momentum you\'ve created by identifying what\'s working well');
    } else if (moodTrend === 'declining') {
      recommendations.push('Focus on self-care and consider reaching out for support if needed');
    } else {
      recommendations.push('Maintain the emotional balance you\'ve achieved while staying open to growth opportunities');
    }

    if (detectedThemes.includes('mindfulness')) {
      recommendations.push('Continue exploring mindfulness practices as they seem to resonate with your current journey');
    } else {
      recommendations.push('Consider incorporating mindfulness or meditation to deepen your self-awareness');
    }

    return {
      dominant_emotions: dominantEmotions,
      emotion_distribution: emotionCounts,
      key_themes: detectedThemes.length > 0 ? detectedThemes : ['personal reflection', 'emotional awareness'],
      growth_observations: observations,
      recommended_actions: recommendations,
      mood_trend: moodTrend,
      generated_visual_prompt: `A ${moodTrend === 'improving' ? 'uplifting and bright' : moodTrend === 'declining' ? 'gentle and supportive' : 'balanced and serene'} abstract watercolor composition representing ${dominantEmotions[0]} and personal growth, with flowing organic shapes in harmonious colors that reflect emotional depth and self-discovery`
    };
  }

  static async getWeeklyInsights(limit = 10): Promise<WeeklyInsight[]> {
    return errorHandler.withRetry(
      async () => {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw new Error(`Authentication failed: ${userError.message}`);
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
          .from('weekly_insights')
          .select('*')
          .eq('user_id', user.id)
          .order('week_start', { ascending: false })
          .limit(Math.max(1, Math.min(50, limit))); // Ensure reasonable limits

        if (error) throw new Error(`Failed to fetch weekly insights: ${error.message}`);
        return (data || []).map(this.mapInsightRow);
      },
      {
        maxAttempts: 3,
        delay: 1000,
        context: {
          action: 'get_weekly_insights',
          component: 'AgentService',
          additionalData: { limit }
        }
      }
    );
  }

  // Agent Loop Functions with comprehensive error handling
  static async runAgentLoop(entries: DiaryEntry[]): Promise<void> {
    // Prevent concurrent agent loops
    if (this.isRunningAgentLoop) {
      errorHandler.logError('Agent loop already running', {
        action: 'run_agent_loop',
        component: 'AgentService'
      }, 'low');
      return;
    }

    this.isRunningAgentLoop = true;

    try {
      const { data: settings, error: settingsError } = await errorHandler.safeAsync(
        () => this.getSettings(),
        {
          action: 'get_settings_for_agent_loop',
          component: 'AgentService'
        }
      );

      if (settingsError || !settings) {
        errorHandler.logError('Failed to get settings for agent loop', {
          action: 'run_agent_loop',
          component: 'AgentService'
        }, 'medium');
        return;
      }
      
      if (!settings.is_agentic_mode_enabled) {
        return;
      }

      // Check for triggers with error handling for each
      await this.safeCheckTrigger(() => this.checkInactivityTrigger(entries, settings), 'inactivity');
      await this.safeCheckTrigger(() => this.checkEmotionalPatterns(entries, settings), 'emotional_pattern');
      await this.safeCheckTrigger(() => this.checkMilestones(entries, settings), 'milestone');
      
      // Update memories based on recent entries
      await this.safeCheckTrigger(() => this.updateMemoriesFromEntries(entries.slice(0, 5)), 'memory_update');
      
    } catch (error) {
      errorHandler.logError(error instanceof Error ? error : new Error('Agent loop failed'), {
        action: 'run_agent_loop',
        component: 'AgentService',
        additionalData: { entryCount: entries.length }
      }, 'high');
    } finally {
      this.isRunningAgentLoop = false;
    }
  }

  private static async safeCheckTrigger(triggerFn: () => Promise<void>, triggerName: string): Promise<void> {
    try {
      await triggerFn();
    } catch (error) {
      if (error instanceof Error && error.message === 'DUPLICATE_CHECKIN') {
        // This is expected behavior, not an error
        return;
      }
      
      errorHandler.logError(error instanceof Error ? error : new Error(`${triggerName} trigger failed`), {
        action: `check_${triggerName}_trigger`,
        component: 'AgentService',
        additionalData: { triggerName }
      }, 'medium');
    }
  }

  // Safe wrapper methods for UI components
  static async safeCreateMemory(memory: Omit<AgentMemory, 'id' | 'user_id' | 'created_at' | 'last_accessed' | 'access_count'>): Promise<{ data: AgentMemory | null; error: string | null }> {
    return errorHandler.safeAsync(
      () => this.createMemory(memory),
      {
        action: 'create_agent_memory',
        component: 'AgentService',
        additionalData: { memoryType: memory.memory_type }
      }
    );
  }

  static async safeGetMemories(limit = 50): Promise<{ data: AgentMemory[] | null; error: string | null }> {
    return errorHandler.safeAsync(
      () => this.getMemories(limit),
      {
        action: 'get_agent_memories',
        component: 'AgentService'
      },
      [] // fallback to empty array
    );
  }

  static async safeGetPendingCheckins(): Promise<{ data: AgentCheckin[] | null; error: string | null }> {
    return errorHandler.safeAsync(
      () => this.getPendingCheckins(),
      {
        action: 'get_pending_checkins',
        component: 'AgentService'
      },
      [] // fallback to empty array
    );
  }

  static async safeGetWeeklyInsights(limit = 10): Promise<{ data: WeeklyInsight[] | null; error: string | null }> {
    return errorHandler.safeAsync(
      () => this.getWeeklyInsights(limit),
      {
        action: 'get_weekly_insights',
        component: 'AgentService'
      },
      [] // fallback to empty array
    );
  }

  static async safeGetSettings(): Promise<{ data: AgentSettings | null; error: string | null }> {
    return errorHandler.safeAsync(
      () => this.getSettings(),
      {
        action: 'get_agent_settings',
        component: 'AgentService'
      }
    );
  }

  // Validation methods
  private static validateMemoryData(memory: any): void {
    if (!memory.memory_type || !['pattern', 'preference', 'milestone', 'concern'].includes(memory.memory_type)) {
      throw new Error('Invalid memory type');
    }
    if (!memory.content || typeof memory.content !== 'string') {
      throw new Error('Memory content is required and must be a string');
    }
    if (typeof memory.importance_score !== 'number' || memory.importance_score < 0 || memory.importance_score > 1) {
      throw new Error('Importance score must be a number between 0 and 1');
    }
  }

  private static validateCheckinData(checkin: any): void {
    if (!checkin.trigger_type || !['inactivity', 'emotional_pattern', 'milestone', 'scheduled'].includes(checkin.trigger_type)) {
      throw new Error('Invalid trigger type');
    }
    if (!checkin.message || typeof checkin.message !== 'string') {
      throw new Error('Check-in message is required and must be a string');
    }
  }

  private static validateSettingsUpdates(updates: any): void {
    if (updates.personality_type && !['therapist', 'poet', 'coach', 'friend', 'philosopher'].includes(updates.personality_type)) {
      throw new Error('Invalid personality type');
    }
    if (updates.check_in_frequency && !['daily', 'every_2_days', 'weekly', 'as_needed'].includes(updates.check_in_frequency)) {
      throw new Error('Invalid check-in frequency');
    }
    if (updates.is_agentic_mode_enabled !== undefined && typeof updates.is_agentic_mode_enabled !== 'boolean') {
      throw new Error('Agentic mode enabled must be a boolean');
    }
  }

  // IMPROVED CHECK-IN TRIGGER METHODS

  private static async checkInactivityTrigger(entries: DiaryEntry[], settings: AgentSettings): Promise<void> {
    if (entries.length === 0) {
      // No entries at all - send welcome check-in after 2 days
      const accountAge = new Date().getTime() - settings.created_at.getTime();
      const twoDaysInMs = 2 * 24 * 60 * 60 * 1000;
      
      if (accountAge > twoDaysInMs) {
        const message = await this.generateCheckinMessage('inactivity', { 
          daysSinceLastEntry: Math.floor(accountAge / (24 * 60 * 60 * 1000)),
          isFirstTime: true 
        }, settings);
        
        await this.createCheckin({
          trigger_type: 'inactivity',
          message,
          emotional_context: 'New user - no entries yet'
        });
      }
      return;
    }

    const lastEntry = entries[0];
    const now = new Date();
    const lastEntryDate = new Date(lastEntry.date);
    
    // Calculate days since last entry with timezone consideration
    const daysSinceLastEntry = Math.floor(
      (now.getTime() - lastEntryDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Enhanced thresholds based on user preferences
    const thresholds = {
      daily: 2,        // Allow 1 day grace period
      every_2_days: 3, // Allow 1 day grace period
      weekly: 8,       // Allow 1 day grace period
      as_needed: 14    // More lenient for as-needed users
    };

    const threshold = thresholds[settings.check_in_frequency];
    
    if (daysSinceLastEntry >= threshold) {
      // Check user's typical journaling pattern to personalize message
      const recentEntries = entries.slice(0, 10);
      const avgDaysBetweenEntries = this.calculateAverageDaysBetweenEntries(recentEntries);
      
      const message = await this.generateCheckinMessage('inactivity', { 
        daysSinceLastEntry,
        avgDaysBetweenEntries,
        isUnusualGap: daysSinceLastEntry > avgDaysBetweenEntries * 2
      }, settings);
      
      await this.createCheckin({
        trigger_type: 'inactivity',
        message,
        emotional_context: `${daysSinceLastEntry} days since last entry (usual: ${avgDaysBetweenEntries} days)`
      });
    }
  }

  private static async checkEmotionalPatterns(entries: DiaryEntry[], settings: AgentSettings): Promise<void> {
    if (entries.length < 3) return;

    const recentEntries = entries.slice(0, 5); // Look at last 5 entries
    const recentEmotions = recentEntries.map(e => e.emotion.primary);
    
    // Enhanced pattern detection
    const concerningPatterns = ['anxiety', 'melancholy'];
    const positivePatterns = ['joy', 'gratitude', 'contentment'];
    
    const concerningCount = recentEmotions.filter(e => concerningPatterns.includes(e)).length;
    const positiveCount = recentEmotions.filter(e => positivePatterns.includes(e)).length;
    
    // Check for concerning patterns (3+ concerning emotions in last 5 entries)
    if (concerningCount >= 3) {
      // Also check emotional intensity
      const avgIntensity = recentEntries
        .filter(e => concerningPatterns.includes(e.emotion.primary))
        .reduce((sum, e) => sum + e.emotion.intensity, 0) / concerningCount;
      
      const message = await this.generateCheckinMessage('emotional_pattern', { 
        pattern: recentEmotions.slice(0, 3).join(', '),
        concern: true,
        intensity: avgIntensity,
        patternLength: concerningCount
      }, settings);
      
      await this.createCheckin({
        trigger_type: 'emotional_pattern',
        message,
        emotional_context: `Concerning pattern: ${concerningCount}/${recentEntries.length} entries with ${concerningPatterns.join('/')}`
      });
    }
    // Check for positive patterns to celebrate
    else if (positiveCount >= 4) {
      const message = await this.generateCheckinMessage('emotional_pattern', { 
        pattern: recentEmotions.slice(0, 3).join(', '),
        concern: false,
        celebration: true,
        patternLength: positiveCount
      }, settings);
      
      await this.createCheckin({
        trigger_type: 'emotional_pattern',
        message,
        emotional_context: `Positive pattern: ${positiveCount}/${recentEntries.length} entries with positive emotions`
      });
    }
  }

  private static async checkMilestones(entries: DiaryEntry[], settings: AgentSettings): Promise<void> {
    if (entries.length === 0) return;

    // Calculate consecutive journaling days with improved logic
    const consecutiveDays = this.calculateConsecutiveDaysImproved(entries);
    const totalEntries = entries.length;

    // Enhanced milestone definitions
    const milestones = [
      // Consecutive days milestones
      { type: 'consecutive_days', count: 3, message: "3 days in a row! 🌱 You're building a beautiful habit!" },
      { type: 'consecutive_days', count: 7, message: "One week of consistent journaling! 🌟 That's an amazing streak!" },
      { type: 'consecutive_days', count: 14, message: "Two weeks straight! 🎉 Your dedication is truly inspiring!" },
      { type: 'consecutive_days', count: 21, message: "21 days! 🏆 You've officially built a habit - this is incredible!" },
      { type: 'consecutive_days', count: 30, message: "30 days straight! 🎊 You're a journaling champion!" },
      { type: 'consecutive_days', count: 50, message: "50 consecutive days! 🌟 Your commitment is extraordinary!" },
      { type: 'consecutive_days', count: 100, message: "100 days in a row! 🏆 You've achieved something truly remarkable!" },
      
      // Total entries milestones
      { type: 'total_entries', count: 5, message: "5 diary entries! 📝 You're getting into the rhythm!" },
      { type: 'total_entries', count: 10, message: "10 entries! 📚 Your reflection journey is taking shape!" },
      { type: 'total_entries', count: 25, message: "25 entries! 🌱 What a beautiful collection of thoughts and growth!" },
      { type: 'total_entries', count: 50, message: "50 diary entries! 📖 You're building an incredible story of self-discovery!" },
      { type: 'total_entries', count: 100, message: "100 entries! 🎊 You've created a treasure trove of personal insights!" },
      { type: 'total_entries', count: 200, message: "200 entries! 📚 Your dedication to self-reflection is inspiring!" },
      { type: 'total_entries', count: 365, message: "365 entries! 🎉 A full year's worth of wisdom and growth!" },
      
      // Special milestones
      { type: 'first_month', count: 30, message: "Your first month of journaling! 🌟 What an incredible start!" },
      { type: 'emotional_variety', count: 8, message: "You've explored 8 different emotions! 🎨 Your emotional awareness is expanding!" }
    ];

    // Check consecutive days milestones
    const consecutiveMilestone = milestones.find(m => 
      m.type === 'consecutive_days' && m.count === consecutiveDays
    );
    
    if (consecutiveMilestone) {
      const message = await this.generateCheckinMessage('milestone', { 
        count: consecutiveDays,
        type: 'consecutive_days',
        achievement: consecutiveMilestone.message,
        isPersonalBest: consecutiveDays > this.getPersonalBestStreak(entries)
      }, settings);
      
      await this.createCheckin({
        trigger_type: 'milestone',
        message,
        emotional_context: `Milestone: ${consecutiveDays} consecutive days`
      });
      return; // Only trigger one milestone at a time
    }

    // Check total entries milestones
    const totalMilestone = milestones.find(m => 
      m.type === 'total_entries' && m.count === totalEntries
    );
    
    if (totalMilestone) {
      const message = await this.generateCheckinMessage('milestone', { 
        count: totalEntries,
        type: 'total_entries',
        achievement: totalMilestone.message,
        averagePerWeek: this.calculateAverageEntriesPerWeek(entries)
      }, settings);
      
      await this.createCheckin({
        trigger_type: 'milestone',
        message,
        emotional_context: `Milestone: ${totalEntries} total entries`
      });
      return;
    }

    // Check for emotional variety milestone
    const uniqueEmotions = new Set(entries.map(e => e.emotion.primary)).size;
    const emotionalVarietyMilestone = milestones.find(m => 
      m.type === 'emotional_variety' && m.count === uniqueEmotions
    );
    
    if (emotionalVarietyMilestone) {
      const message = await this.generateCheckinMessage('milestone', { 
        count: uniqueEmotions,
        type: 'emotional_variety',
        achievement: emotionalVarietyMilestone.message,
        emotions: Array.from(new Set(entries.map(e => e.emotion.primary))).slice(0, 5)
      }, settings);
      
      await this.createCheckin({
        trigger_type: 'milestone',
        message,
        emotional_context: `Milestone: ${uniqueEmotions} unique emotions explored`
      });
    }
  }

  // IMPROVED HELPER METHODS

  private static calculateConsecutiveDaysImproved(entries: DiaryEntry[]): number {
    if (entries.length === 0) return 0;

    // Sort entries by date (most recent first)
    const sortedEntries = [...entries].sort((a, b) => b.date.getTime() - a.date.getTime());
    
    // Group entries by date (handle multiple entries per day)
    const entriesByDate = new Map<string, DiaryEntry[]>();
    sortedEntries.forEach(entry => {
      const dateKey = entry.date.toISOString().split('T')[0]; // YYYY-MM-DD
      if (!entriesByDate.has(dateKey)) {
        entriesByDate.set(dateKey, []);
      }
      entriesByDate.get(dateKey)!.push(entry);
    });

    const uniqueDates = Array.from(entriesByDate.keys()).sort().reverse(); // Most recent first
    
    if (uniqueDates.length === 0) return 0;

    let consecutiveDays = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Start checking from today or the most recent entry date
    const mostRecentEntryDate = new Date(uniqueDates[0]);
    const daysSinceLastEntry = Math.floor((today.getTime() - mostRecentEntryDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // If the most recent entry is more than 1 day old, no current streak
    if (daysSinceLastEntry > 1) {
      return 0;
    }
    
    // Start from the most recent entry date and work backwards
    let checkDate = new Date(mostRecentEntryDate);
    
    for (const dateStr of uniqueDates) {
      const entryDate = new Date(dateStr);
      
      // If this date matches what we're checking for
      if (entryDate.toISOString().split('T')[0] === checkDate.toISOString().split('T')[0]) {
        consecutiveDays++;
        // Move to the previous day
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        // Check if there's a gap
        const expectedDateStr = checkDate.toISOString().split('T')[0];
        if (dateStr !== expectedDateStr) {
          // There's a gap in the streak
          break;
        }
      }
    }
    
    return consecutiveDays;
  }

  private static calculateAverageDaysBetweenEntries(entries: DiaryEntry[]): number {
    if (entries.length < 2) return 1;

    const sortedEntries = [...entries].sort((a, b) => a.date.getTime() - b.date.getTime());
    let totalDays = 0;
    let gaps = 0;

    for (let i = 1; i < sortedEntries.length; i++) {
      const daysBetween = Math.floor(
        (sortedEntries[i].date.getTime() - sortedEntries[i-1].date.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysBetween > 0) {
        totalDays += daysBetween;
        gaps++;
      }
    }

    return gaps > 0 ? Math.round(totalDays / gaps) : 1;
  }

  private static getPersonalBestStreak(entries: DiaryEntry[]): number {
    // Calculate the longest streak in the user's history
    if (entries.length === 0) return 0;

    const sortedEntries = [...entries].sort((a, b) => a.date.getTime() - b.date.getTime());
    const entriesByDate = new Map<string, boolean>();
    
    sortedEntries.forEach(entry => {
      const dateKey = entry.date.toISOString().split('T')[0];
      entriesByDate.set(dateKey, true);
    });

    const dates = Array.from(entriesByDate.keys()).sort();
    let maxStreak = 0;
    let currentStreak = 0;
    let previousDate: Date | null = null;

    for (const dateStr of dates) {
      const currentDate = new Date(dateStr);
      
      if (previousDate) {
        const daysDiff = Math.floor((currentDate.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysDiff === 1) {
          currentStreak++;
        } else {
          maxStreak = Math.max(maxStreak, currentStreak);
          currentStreak = 1;
        }
      } else {
        currentStreak = 1;
      }
      
      previousDate = currentDate;
    }

    return Math.max(maxStreak, currentStreak);
  }

  private static calculateAverageEntriesPerWeek(entries: DiaryEntry[]): number {
    if (entries.length === 0) return 0;

    const sortedEntries = [...entries].sort((a, b) => a.date.getTime() - b.date.getTime());
    const firstEntry = sortedEntries[0];
    const lastEntry = sortedEntries[sortedEntries.length - 1];
    
    const totalDays = Math.floor((lastEntry.date.getTime() - firstEntry.date.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const totalWeeks = Math.max(1, totalDays / 7);
    
    return Math.round((entries.length / totalWeeks) * 10) / 10; // Round to 1 decimal place
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
              const { error } = await this.safeCreateMemory({
                memory_type: pattern.type as any,
                content: pattern.content,
                emotional_context: [entry.emotion.primary],
                importance_score: pattern.importance
              });
              
              if (error) {
                errorHandler.logError(error, {
                  action: 'create_memory_from_entry',
                  component: 'AgentService',
                  additionalData: { entryId: entry.id, patternType: pattern.type }
                }, 'low');
              }
            }
          }
        } catch (error) {
          errorHandler.logError(error instanceof Error ? error : new Error('Failed to extract patterns'), {
            action: 'extract_patterns_from_entry',
            component: 'AgentService',
            additionalData: { entryId: entry.id }
          }, 'low');
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
      errorHandler.logError(error instanceof Error ? error : new Error('Failed to generate checkin message'), {
        action: 'generate_checkin_message',
        component: 'AgentService',
        additionalData: { triggerType }
      }, 'medium');
      
      // Enhanced fallback messages with context
      const fallbacks = {
        inactivity: context.isFirstTime 
          ? `Welcome to your journaling journey! I noticed you haven't created your first entry yet. I'm here whenever you're ready to start reflecting. How are you feeling today?`
          : context.isUnusualGap
          ? `Hey there! It's been ${context.daysSinceLastEntry} days since we last connected - longer than your usual ${context.avgDaysBetweenEntries} days. I'm thinking of you and wondering how you've been. What's been on your mind lately?`
          : `Hi! I noticed it's been ${context.daysSinceLastEntry} days since your last reflection. How are you feeling today?`,
        
        emotional_pattern: context.concern
          ? `I've been reflecting on our recent conversations, and I noticed you've been experiencing some challenging emotions like ${context.pattern}. Your feelings are completely valid, and I'm here to support you. How are you taking care of yourself during this time?`
          : `I've noticed such a beautiful pattern in your recent reflections - lots of ${context.pattern}! It's wonderful to see these positive emotions flowing through your journey. What's been contributing to this uplifting energy?`,
        
        milestone: context.type === 'consecutive_days'
          ? `🎉 ${context.achievement} ${context.isPersonalBest ? "That's a new personal record! " : ""}Your consistency in self-reflection shows real commitment to your growth. How does it feel to reach this milestone?`
          : context.type === 'total_entries'
          ? `🎊 ${context.achievement} You're averaging about ${context.averagePerWeek} entries per week, which shows wonderful dedication. What insights have you gained from this journey so far?`
          : `🌟 ${context.achievement} Your emotional awareness and willingness to explore different feelings is truly inspiring. What have you learned about yourself?`,
        
        scheduled: `Good morning! How are you starting your day today? I'm here if you'd like to reflect on anything that's on your mind.`
      };
      
      return fallbacks[triggerType as keyof typeof fallbacks] || "How are you doing today? I'm here to listen and support your reflection journey.";
    }
  }

  private static async extractPatterns(userMessages: string, emotion: any): Promise<any[]> {
    try {
      return await togetherService.extractMemoryPatterns(userMessages, emotion);
    } catch (error) {
      errorHandler.logError(error instanceof Error ? error : new Error('Failed to extract patterns'), {
        action: 'extract_patterns',
        component: 'AgentService'
      }, 'low');
      
      // Return empty patterns array as fallback
      return [];
    }
  }

  // Mapping methods for database rows
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
      responded_at: row.responded_at ? new Date(row.responded_at) : null
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