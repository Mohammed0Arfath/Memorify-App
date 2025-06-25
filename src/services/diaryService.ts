import { supabase } from '../lib/supabase';
import { DiaryEntry, ChatMessage } from '../types';
import { Database } from '../lib/database.types';
import { errorHandler } from '../utils/errorHandler';

type DiaryEntryRow = Database['public']['Tables']['diary_entries']['Row'];
type DiaryEntryInsert = Database['public']['Tables']['diary_entries']['Insert'];

export class DiaryService {
  static async createEntry(entry: DiaryEntry): Promise<DiaryEntry> {
    return errorHandler.withRetry(
      async () => {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
          throw new Error(`Authentication failed: ${userError.message}`);
        }
        
        if (!user) {
          throw new Error('User not authenticated');
        }

        // Validate entry data
        this.validateEntry(entry);

        const insertData: DiaryEntryInsert = {
          user_id: user.id,
          date: entry.date.toISOString(),
          chat_messages: entry.chatMessages as any,
          generated_entry: entry.generatedEntry,
          emotion_primary: entry.emotion.primary,
          emotion_intensity: entry.emotion.intensity,
          emotion_secondary: entry.emotion.secondary || null,
          emotion_color: entry.emotion.color,
          emotion_emoji: entry.emotion.emoji,
          photo: entry.photo || null,
          summary: entry.summary,
        };

        const { data, error } = await supabase
          .from('diary_entries')
          .insert(insertData)
          .select()
          .single();

        if (error) {
          throw new Error(`Database error: ${error.message}`);
        }

        if (!data) {
          throw new Error('No data returned from database');
        }

        return this.mapRowToEntry(data);
      },
      {
        maxAttempts: 3,
        delay: 1000,
        backoff: true,
        context: {
          userId: entry.id,
          action: 'create_diary_entry',
          component: 'DiaryService',
          additionalData: { entryId: entry.id }
        }
      }
    );
  }

  static async getEntries(): Promise<DiaryEntry[]> {
    return errorHandler.withRetry(
      async () => {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
          throw new Error(`Authentication failed: ${userError.message}`);
        }
        
        if (!user) {
          throw new Error('User not authenticated');
        }

        const { data, error } = await supabase
          .from('diary_entries')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: false });

        if (error) {
          throw new Error(`Failed to fetch diary entries: ${error.message}`);
        }

        if (!data) {
          return [];
        }

        return data.map(this.mapRowToEntry);
      },
      {
        maxAttempts: 3,
        delay: 1000,
        backoff: true,
        context: {
          action: 'get_diary_entries',
          component: 'DiaryService'
        }
      }
    );
  }

  static async updateEntry(id: string, updates: Partial<DiaryEntry>): Promise<DiaryEntry> {
    return errorHandler.withRetry(
      async () => {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
          throw new Error(`Authentication failed: ${userError.message}`);
        }
        
        if (!user) {
          throw new Error('User not authenticated');
        }

        if (!id) {
          throw new Error('Entry ID is required');
        }

        // Validate updates
        this.validatePartialEntry(updates);

        const updateData: any = {};
        
        if (updates.date) updateData.date = updates.date.toISOString();
        if (updates.chatMessages) updateData.chat_messages = updates.chatMessages;
        if (updates.generatedEntry) updateData.generated_entry = updates.generatedEntry;
        if (updates.emotion) {
          updateData.emotion_primary = updates.emotion.primary;
          updateData.emotion_intensity = updates.emotion.intensity;
          updateData.emotion_secondary = updates.emotion.secondary || null;
          updateData.emotion_color = updates.emotion.color;
          updateData.emotion_emoji = updates.emotion.emoji;
        }
        if (updates.photo !== undefined) updateData.photo = updates.photo;
        if (updates.summary) updateData.summary = updates.summary;

        const { data, error } = await supabase
          .from('diary_entries')
          .update(updateData)
          .eq('id', id)
          .eq('user_id', user.id)
          .select()
          .single();

        if (error) {
          throw new Error(`Failed to update diary entry: ${error.message}`);
        }

        if (!data) {
          throw new Error('Entry not found or update failed');
        }

        return this.mapRowToEntry(data);
      },
      {
        maxAttempts: 2,
        delay: 1000,
        context: {
          action: 'update_diary_entry',
          component: 'DiaryService',
          additionalData: { entryId: id }
        }
      }
    );
  }

  static async deleteEntry(id: string): Promise<void> {
    return errorHandler.withRetry(
      async () => {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
          throw new Error(`Authentication failed: ${userError.message}`);
        }
        
        if (!user) {
          throw new Error('User not authenticated');
        }

        if (!id) {
          throw new Error('Entry ID is required');
        }

        const { error } = await supabase
          .from('diary_entries')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id);

        if (error) {
          throw new Error(`Failed to delete diary entry: ${error.message}`);
        }
      },
      {
        maxAttempts: 2,
        delay: 1000,
        context: {
          action: 'delete_diary_entry',
          component: 'DiaryService',
          additionalData: { entryId: id }
        }
      }
    );
  }

  // Safe wrapper methods for UI components
  static async safeCreateEntry(entry: DiaryEntry): Promise<{ data: DiaryEntry | null; error: string | null }> {
    return errorHandler.safeAsync(
      () => this.createEntry(entry),
      {
        action: 'create_diary_entry',
        component: 'DiaryService',
        additionalData: { entryId: entry.id }
      }
    );
  }

  static async safeGetEntries(): Promise<{ data: DiaryEntry[] | null; error: string | null }> {
    return errorHandler.safeAsync(
      () => this.getEntries(),
      {
        action: 'get_diary_entries',
        component: 'DiaryService'
      },
      [] // fallback to empty array
    );
  }

  static async safeUpdateEntry(id: string, updates: Partial<DiaryEntry>): Promise<{ data: DiaryEntry | null; error: string | null }> {
    return errorHandler.safeAsync(
      () => this.updateEntry(id, updates),
      {
        action: 'update_diary_entry',
        component: 'DiaryService',
        additionalData: { entryId: id }
      }
    );
  }

  static async safeDeleteEntry(id: string): Promise<{ data: null; error: string | null }> {
    return errorHandler.safeAsync(
      () => this.deleteEntry(id),
      {
        action: 'delete_diary_entry',
        component: 'DiaryService',
        additionalData: { entryId: id }
      }
    );
  }

  // Validation methods
  private static validateEntry(entry: DiaryEntry): void {
    if (!entry.id) {
      throw new Error('Entry ID is required');
    }
    if (!entry.date || !(entry.date instanceof Date)) {
      throw new Error('Valid date is required');
    }
    if (!entry.chatMessages || !Array.isArray(entry.chatMessages)) {
      throw new Error('Chat messages must be an array');
    }
    if (!entry.generatedEntry || typeof entry.generatedEntry !== 'string') {
      throw new Error('Generated entry must be a non-empty string');
    }
    if (!entry.emotion || !entry.emotion.primary) {
      throw new Error('Emotion data is required');
    }
    if (typeof entry.emotion.intensity !== 'number' || entry.emotion.intensity < 0 || entry.emotion.intensity > 1) {
      throw new Error('Emotion intensity must be a number between 0 and 1');
    }
    if (!entry.summary || typeof entry.summary !== 'string') {
      throw new Error('Summary must be a non-empty string');
    }
  }

  private static validatePartialEntry(updates: Partial<DiaryEntry>): void {
    if (updates.date && !(updates.date instanceof Date)) {
      throw new Error('Date must be a valid Date object');
    }
    if (updates.chatMessages && !Array.isArray(updates.chatMessages)) {
      throw new Error('Chat messages must be an array');
    }
    if (updates.generatedEntry !== undefined && typeof updates.generatedEntry !== 'string') {
      throw new Error('Generated entry must be a string');
    }
    if (updates.emotion) {
      if (!updates.emotion.primary) {
        throw new Error('Emotion primary is required');
      }
      if (typeof updates.emotion.intensity !== 'number' || updates.emotion.intensity < 0 || updates.emotion.intensity > 1) {
        throw new Error('Emotion intensity must be a number between 0 and 1');
      }
    }
    if (updates.summary !== undefined && typeof updates.summary !== 'string') {
      throw new Error('Summary must be a string');
    }
  }

  private static mapRowToEntry(row: DiaryEntryRow): DiaryEntry {
    try {
      return {
        id: row.id,
        date: new Date(row.date),
        chatMessages: (row.chat_messages as ChatMessage[]).map(msg => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        })),
        generatedEntry: row.generated_entry,
        emotion: {
          primary: row.emotion_primary as any,
          intensity: row.emotion_intensity,
          secondary: row.emotion_secondary as any,
          color: row.emotion_color,
          emoji: row.emotion_emoji,
        },
        photo: row.photo || undefined,
        summary: row.summary,
      };
    } catch (error) {
      errorHandler.logError(
        error instanceof Error ? error : new Error('Failed to map database row to entry'),
        {
          action: 'map_row_to_entry',
          component: 'DiaryService',
          additionalData: { rowId: row.id }
        },
        'medium'
      );
      throw new Error('Failed to process diary entry data');
    }
  }
}