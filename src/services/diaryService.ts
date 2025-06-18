import { supabase } from '../lib/supabase';
import { DiaryEntry, ChatMessage } from '../types';
import { Database } from '../lib/database.types';

type DiaryEntryRow = Database['public']['Tables']['diary_entries']['Row'];
type DiaryEntryInsert = Database['public']['Tables']['diary_entries']['Insert'];

export class DiaryService {
  static async createEntry(entry: DiaryEntry): Promise<DiaryEntry> {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

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
      throw new Error(`Failed to create diary entry: ${error.message}`);
    }

    return this.mapRowToEntry(data);
  }

  static async getEntries(): Promise<DiaryEntry[]> {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
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

    return data.map(this.mapRowToEntry);
  }

  static async updateEntry(id: string, updates: Partial<DiaryEntry>): Promise<DiaryEntry> {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

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

    return this.mapRowToEntry(data);
  }

  static async deleteEntry(id: string): Promise<void> {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    const { error } = await supabase
      .from('diary_entries')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      throw new Error(`Failed to delete diary entry: ${error.message}`);
    }
  }

  private static mapRowToEntry(row: DiaryEntryRow): DiaryEntry {
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
  }
}