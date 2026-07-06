export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ad_campaigns: {
        Row: {
          cost_pi: number
          created_at: string
          duration_days: number
          ends_at: string
          id: string
          pi_uid: string
          pi_username: string
          placement: string
          starts_at: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          cost_pi: number
          created_at?: string
          duration_days: number
          ends_at: string
          id?: string
          pi_uid: string
          pi_username: string
          placement: string
          starts_at?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          cost_pi?: number
          created_at?: string
          duration_days?: number
          ends_at?: string
          id?: string
          pi_uid?: string
          pi_username?: string
          placement?: string
          starts_at?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      ad_contracts: {
        Row: {
          activated_at: string | null
          advertiser_pi_uid: string
          advertiser_pi_username: string
          body_text: string
          contract_hash: string
          contract_json: Json
          cost_pi: number
          created_at: string
          duration_days: number
          ends_at: string | null
          id: string
          image_url: string | null
          pi_payment_id: string | null
          pi_txid: string | null
          placements: string[]
          status: string
          target_venues: number
          tier: string
          title: string
          updated_at: string
        }
        Insert: {
          activated_at?: string | null
          advertiser_pi_uid: string
          advertiser_pi_username: string
          body_text: string
          contract_hash: string
          contract_json: Json
          cost_pi: number
          created_at?: string
          duration_days: number
          ends_at?: string | null
          id?: string
          image_url?: string | null
          pi_payment_id?: string | null
          pi_txid?: string | null
          placements: string[]
          status?: string
          target_venues: number
          tier: string
          title: string
          updated_at?: string
        }
        Update: {
          activated_at?: string | null
          advertiser_pi_uid?: string
          advertiser_pi_username?: string
          body_text?: string
          contract_hash?: string
          contract_json?: Json
          cost_pi?: number
          created_at?: string
          duration_days?: number
          ends_at?: string | null
          id?: string
          image_url?: string | null
          pi_payment_id?: string | null
          pi_txid?: string | null
          placements?: string[]
          status?: string
          target_venues?: number
          tier?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      ad_placements: {
        Row: {
          ai_match_score: number
          ai_reasoning: string | null
          contract_id: string
          created_at: string
          id: string
          scheduled_end: string
          scheduled_start: string
          sport: string
          status: string
          venue_code: string
          venue_name: string
        }
        Insert: {
          ai_match_score: number
          ai_reasoning?: string | null
          contract_id: string
          created_at?: string
          id?: string
          scheduled_end: string
          scheduled_start: string
          sport: string
          status?: string
          venue_code: string
          venue_name: string
        }
        Update: {
          ai_match_score?: number
          ai_reasoning?: string | null
          contract_id?: string
          created_at?: string
          id?: string
          scheduled_end?: string
          scheduled_start?: string
          sport?: string
          status?: string
          venue_code?: string
          venue_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_placements_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "ad_contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_plays: {
        Row: {
          id: string
          impressions: number
          placement_id: string
          played_at: string
        }
        Insert: {
          id?: string
          impressions?: number
          placement_id: string
          played_at?: string
        }
        Update: {
          id?: string
          impressions?: number
          placement_id?: string
          played_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_plays_placement_id_fkey"
            columns: ["placement_id"]
            isOneToOne: false
            referencedRelation: "ad_placements"
            referencedColumns: ["id"]
          },
        ]
      }
      pi_balances: {
        Row: {
          balance: number
          created_at: string
          pi_uid: string
          pi_username: string
          updated_at: string
        }
        Insert: {
          balance?: number
          created_at?: string
          pi_uid: string
          pi_username: string
          updated_at?: string
        }
        Update: {
          balance?: number
          created_at?: string
          pi_uid?: string
          pi_username?: string
          updated_at?: string
        }
        Relationships: []
      }
      pi_payments: {
        Row: {
          amount: number
          created_at: string
          memo: string | null
          payment_id: string
          pi_uid: string
          txid: string
        }
        Insert: {
          amount: number
          created_at?: string
          memo?: string | null
          payment_id: string
          pi_uid: string
          txid: string
        }
        Update: {
          amount?: number
          created_at?: string
          memo?: string | null
          payment_id?: string
          pi_uid?: string
          txid?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      credit_pi_balance: {
        Args: { p_amount: number; p_pi_uid: string; p_pi_username: string }
        Returns: number
      }
      purchase_ad_campaign: {
        Args: {
          p_cost_pi: number
          p_duration_days: number
          p_pi_uid: string
          p_pi_username: string
          p_placement: string
          p_title: string
        }
        Returns: {
          campaign_id: string
          new_balance: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
