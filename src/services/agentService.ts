import { supabase } from '../lib/supabase';
import { AgentMemory, AgentCheckin, WeeklyInsight, AgentSettings } from '../types/agent';
import { DiaryEntry } from '../types';
import { togetherService } from '../utils/togetherService';

export class AgentService {
  // Add a static flag to prevent concurrent agent loops
  private static isRunningAgentLoop = false;

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
      console.warn('Error checking for existing check-ins:', checkError);
    } else if (existingCheckins && existingCheckins.length > 0) {
      console.log(`Skipping duplicate check-in of type '${checkin.trigger_type}' - already exists in last 24 hours`);
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

    console.log(`Generating weekly insight for: ${weekStart.toDateString()} to ${weekEnd.toDateString()}`);

    // Filter entries for the current week
    const weekEntries = entries.filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate >= weekStart && entryDate <= weekEnd;
    });

    console.log(`Found ${weekEntries.length} entries for this week`);

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
    // Prevent concurrent agent loops
    if (this.isRunningAgentLoop) {
      console.log('Agent loop already running, skipping...');
      return;
    }

    this.isRunningAgentLoop = true;

    try {
      const settings = await this.getSettings();
      
      if (!settings.is_agentic_mode_enabled) {
        console.log('Agentic mode disabled, skipping agent loop');
        return;
      }

      // Check for triggers with error handling for each
      await this.safeCheckTrigger(() => this.checkInactivityTrigger(entries, settings), 'inactivity');
      await this.safeCheckTrigger(() => this.checkEmotionalPatterns(entries, settings), 'emotional_pattern');
      await this.safeCheckTrigger(() => this.checkMilestones(entries, settings), 'milestone');
      
      // Update memories based on recent entries
      await this.safeCheckTrigger(() => this.updateMemoriesFromEntries(entries.slice(0, 5)), 'memory_update');
      
    } catch (error) {
      console.error('Agent loop error:', error);
    } finally {
      this.isRunningAgentLoop = false;
    }
  }

  private static async safeCheckTrigger(triggerFn: () => Promise<void>, triggerName: string): Promise<void> {
    try {
      await triggerFn();
    } catch (error) {
      if (error instanceof Error && error.message === 'DUPLICATE_CHECKIN') {
        console.log(`Skipped duplicate ${triggerName} check-in`);
      } else {
        console.warn(`${triggerName} trigger failed:`, error);
      }
    }
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
      console.log(`Milestone reached: ${consecutiveDays} consecutive days`);
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
      console.log(`Milestone reached: ${totalEntries} total entries`);
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
      console.warn('AI weekly insight generation failed, using enhanced fallback analysis');
      
      // Enhanced fallback analysis with more sophisticated logic
      const emotions = entries.map(e => e.emotion.primary);
      const emotionCounts = emotions.reduce((acc, emotion) => {
        acc[emotion] = (acc[emotion] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Get dominant emotions (top 3)
      const dominantEmotions = Object.entries(emotionCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([emotion]) => emotion);

      // Extract themes from diary content
      const allContent = entries.map(e => e.generatedEntry + ' ' + e.summary).join(' ').toLowerCase();
      const themes = this.extractThemesFromContent(allContent);

      // Generate growth observations based on emotional patterns
      const growthObservations = this.generateGrowthObservations(entries, emotionCounts);

      // Generate recommended actions based on patterns
      const recommendedActions = this.generateRecommendedActions(dominantEmotions, entries.length);

      // Determine mood trend
      const moodTrend = this.calculateMoodTrend(entries);

      return {
        dominant_emotions: dominantEmotions,
        emotion_distribution: emotionCounts,
        key_themes: themes,
        growth_observations: growthObservations,
        recommended_actions: recommendedActions,
        mood_trend: moodTrend
      };
    }
  }

  private static extractThemesFromContent(content: string): string[] {
    const themeKeywords = {
      'relationships': ['friend', 'family', 'love', 'relationship', 'partner', 'social', 'connection'],
      'work': ['work', 'job', 'career', 'project', 'meeting', 'colleague', 'professional'],
      'health': ['exercise', 'sleep', 'tired', 'energy', 'healthy', 'wellness', 'body'],
      'creativity': ['creative', 'art', 'music', 'write', 'design', 'imagination', 'inspire'],
      'learning': ['learn', 'study', 'read', 'knowledge', 'skill', 'understand', 'discover'],
      'mindfulness': ['meditation', 'present', 'mindful', 'breath', 'awareness', 'calm', 'peace'],
      'challenges': ['difficult', 'struggle', 'problem', 'challenge', 'stress', 'overcome'],
      'gratitude': ['grateful', 'thankful', 'appreciate', 'blessed', 'fortunate', 'positive'],
      'goals': ['goal', 'plan', 'future', 'dream', 'ambition', 'achieve', 'progress'],
      'nature': ['nature', 'outdoor', 'walk', 'garden', 'sky', 'weather', 'natural']
    };

    const foundThemes: string[] = [];
    
    Object.entries(themeKeywords).forEach(([theme, keywords]) => {
      const matches = keywords.filter(keyword => content.includes(keyword)).length;
      if (matches >= 2) { // Require at least 2 keyword matches
        foundThemes.push(theme);
      }
    });

    // If no themes found, use default based on emotions
    if (foundThemes.length === 0) {
      foundThemes.push('self-reflection', 'personal growth');
    }

    return foundThemes.slice(0, 4); // Limit to 4 themes
  }

  private static generateGrowthObservations(entries: DiaryEntry[], emotionCounts: Record<string, number>): string[] {
    const observations: string[] = [];
    
    // Analyze emotional diversity
    const emotionTypes = Object.keys(emotionCounts).length;
    if (emotionTypes >= 4) {
      observations.push('You experienced a rich variety of emotions this week, showing emotional depth and awareness');
    }

    // Check for positive emotions
    const positiveEmotions = ['joy', 'gratitude', 'excitement', 'hope', 'contentment'];
    const positiveCount = positiveEmotions.filter(e => emotionCounts[e] > 0).length;
    if (positiveCount >= 2) {
      observations.push('You cultivated multiple positive emotional states, indicating good emotional balance');
    }

    // Check for reflection
    if (emotionCounts['reflection'] > 0) {
      observations.push('Your commitment to self-reflection is evident and valuable for personal growth');
    }

    // Analyze entry frequency
    if (entries.length >= 5) {
      observations.push('Your consistent journaling practice this week shows dedication to self-awareness');
    } else if (entries.length >= 3) {
      observations.push('You maintained a good journaling rhythm this week');
    }

    // Check for emotional processing
    const challengingEmotions = ['anxiety', 'melancholy'];
    const challengingCount = challengingEmotions.filter(e => emotionCounts[e] > 0).length;
    if (challengingCount > 0 && positiveCount > 0) {
      observations.push('You navigated both challenging and positive emotions, showing emotional resilience');
    }

    return observations.slice(0, 3); // Limit to 3 observations
  }

  private static generateRecommendedActions(dominantEmotions: string[], entryCount: number): string[] {
    const actions: string[] = [];

    // Based on dominant emotions
    if (dominantEmotions.includes('anxiety')) {
      actions.push('Consider incorporating breathing exercises or mindfulness practices into your routine');
    }
    
    if (dominantEmotions.includes('gratitude')) {
      actions.push('Continue your gratitude practice - perhaps expand it to include gratitude letters or sharing appreciation with others');
    }
    
    if (dominantEmotions.includes('excitement')) {
      actions.push('Channel your excitement into creative projects or new learning opportunities');
    }
    
    if (dominantEmotions.includes('melancholy')) {
      actions.push('Gentle self-care activities like nature walks or connecting with supportive friends might be helpful');
    }
    
    if (dominantEmotions.includes('reflection')) {
      actions.push('Your reflective nature is a strength - consider setting aside time for deeper contemplation or meditation');
    }

    // Based on journaling frequency
    if (entryCount < 3) {
      actions.push('Try to maintain a more consistent journaling practice to deepen your self-awareness');
    } else if (entryCount >= 5) {
      actions.push('Your consistent journaling is excellent - consider exploring different writing prompts or formats');
    }

    // General wellness actions
    actions.push('Remember to celebrate small wins and practice self-compassion in your journey');

    return actions.slice(0, 3); // Limit to 3 actions
  }

  private static calculateMoodTrend(entries: DiaryEntry[]): 'improving' | 'declining' | 'stable' {
    if (entries.length < 2) return 'stable';

    // Sort entries by date
    const sortedEntries = [...entries].sort((a, b) => a.date.getTime() - b.date.getTime());
    
    // Calculate average intensity for first half vs second half
    const midpoint = Math.floor(sortedEntries.length / 2);
    const firstHalf = sortedEntries.slice(0, midpoint);
    const secondHalf = sortedEntries.slice(midpoint);
    
    const firstHalfAvg = firstHalf.reduce((sum, entry) => sum + entry.emotion.intensity, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, entry) => sum + entry.emotion.intensity, 0) / secondHalf.length;
    
    const difference = secondHalfAvg - firstHalfAvg;
    
    if (difference > 0.1) return 'improving';
    if (difference < -0.1) return 'declining';
    return 'stable';
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