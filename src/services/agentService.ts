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

        // Check if a similar check-in already exists in the last 24 hours
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        
        const { data: existingCheckins, error: checkError } = await supabase
          .from('agent_checkins')
          .select('id')
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
          throw new Error('DUPLICATE_CHECKIN');
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

  // Weekly Insights with error handling
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

        // Generate comprehensive insights
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

  // Continue with existing methods but add error handling...
  // (The rest of the methods remain the same but with added error handling where appropriate)

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
    if (entries.length === 0) return;

    // Calculate consecutive journaling days
    const consecutiveDays = this.calculateConsecutiveDays(entries);
    const totalEntries = entries.length;

    // Define milestones with both consecutive days and total entries
    const milestones = [
      { 
        type: 'consecutive_days', 
        count: 7, 
        message: "You've journaled for 7 consecutive days! 🌟 That's an amazing streak!" 
      },
      { 
        type: 'consecutive_days', 
        count: 14, 
        message: "Two weeks of consistent journaling! 🎉 Your dedication is inspiring!" 
      },
      { 
        type: 'consecutive_days', 
        count: 30, 
        message: "30 days straight! 🏆 You've built an incredible habit!" 
      },
      { 
        type: 'total_entries', 
        count: 10, 
        message: "You've created 10 diary entries! 📚 Your journey is taking shape!" 
      },
      { 
        type: 'total_entries', 
        count: 25, 
        message: "25 entries of reflection and growth! 🌱 What a beautiful collection!" 
      },
      { 
        type: 'total_entries', 
        count: 50, 
        message: "50 diary entries! 📖 You're building an incredible story of self-discovery!" 
      },
      { 
        type: 'total_entries', 
        count: 100, 
        message: "100 entries! 🎊 You've created a treasure trove of personal insights!" 
      }
    ];

    // Check for consecutive days milestones
    const consecutiveMilestone = milestones.find(m => 
      m.type === 'consecutive_days' && m.count === consecutiveDays
    );
    
    if (consecutiveMilestone) {
      const message = await this.generateCheckinMessage('milestone', { 
        count: consecutiveDays,
        type: 'consecutive_days',
        achievement: consecutiveMilestone.message 
      }, settings);
      
      await this.createCheckin({
        trigger_type: 'milestone',
        message,
        emotional_context: `Milestone: ${consecutiveDays} consecutive days`
      });
      return; // Only trigger one milestone at a time
    }

    // Check for total entries milestones
    const totalMilestone = milestones.find(m => 
      m.type === 'total_entries' && m.count === totalEntries
    );
    
    if (totalMilestone) {
      const message = await this.generateCheckinMessage('milestone', { 
        count: totalEntries,
        type: 'total_entries',
        achievement: totalMilestone.message 
      }, settings);
      
      await this.createCheckin({
        trigger_type: 'milestone',
        message,
        emotional_context: `Milestone: ${totalEntries} total entries`
      });
    }
  }

  private static calculateConsecutiveDays(entries: DiaryEntry[]): number {
    if (entries.length === 0) return 0;

    // Sort entries by date (most recent first)
    const sortedEntries = [...entries].sort((a, b) => b.date.getTime() - a.date.getTime());
    
    let consecutiveDays = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0); // Start of today
    
    // Check if there's an entry for today or yesterday to start the streak
    const mostRecentEntry = sortedEntries[0];
    const mostRecentDate = new Date(mostRecentEntry.date);
    mostRecentDate.setHours(0, 0, 0, 0);
    
    const daysDiff = Math.floor((currentDate.getTime() - mostRecentDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // If the most recent entry is more than 1 day old, no current streak
    if (daysDiff > 1) {
      return 0;
    }
    
    // Start checking from the most recent entry date
    let checkDate = new Date(mostRecentDate);
    
    for (const entry of sortedEntries) {
      const entryDate = new Date(entry.date);
      entryDate.setHours(0, 0, 0, 0);
      
      // If this entry matches the date we're checking
      if (entryDate.getTime() === checkDate.getTime()) {
        consecutiveDays++;
        // Move to the previous day
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (entryDate.getTime() < checkDate.getTime()) {
        // There's a gap in the streak
        break;
      }
      // If entryDate > checkDate, continue to next entry (multiple entries same day)
    }
    
    return consecutiveDays;
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
      errorHandler.logError(error instanceof Error ? error : new Error('Failed to analyze weekly patterns'), {
        action: 'analyze_weekly_patterns',
        component: 'AgentService',
        additionalData: { entryCount: entries.length }
      }, 'medium');
      
      // Return fallback insight data
      return {
        dominant_emotions: [],
        emotion_distribution: {},
        key_themes: [],
        growth_observations: [],
        recommended_actions: [],
        mood_trend: 'stable',
        generated_visual_prompt: null
      };
    }
  }

  private static async extractPatterns(userMessages: string, emotion: any): Promise<any[]> {
    try {
      return await togetherService.extractPatterns(userMessages, emotion);
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