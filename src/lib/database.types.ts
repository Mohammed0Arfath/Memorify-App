export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      diary_entries: {
        Row: {
          id: string
          user_id: string
          date: string
          chat_messages: Json
          generated_entry: string
          emotion_primary: string
          emotion_intensity: number
          emotion_secondary: string | null
          emotion_color: string
          emotion_emoji: string
          photo: string | null
          summary: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date?: string
          chat_messages?: Json
          generated_entry?: string
          emotion_primary?: string
          emotion_intensity?: number
          emotion_secondary?: string | null
          emotion_color?: string
          emotion_emoji?: string
          photo?: string | null
          summary?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          chat_messages?: Json
          generated_entry?: string
          emotion_primary?: string
          emotion_intensity?: number
          emotion_secondary?: string | null
          emotion_color?: string
          emotion_emoji?: string
          photo?: string | null
          summary?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}