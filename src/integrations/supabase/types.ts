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
      ad_approval_requests: {
        Row: {
          contract_id: string
          created_at: string
          id: string
          partner_id: string
          reviewed_at: string | null
          reviewer_notes: string | null
          status: string
          updated_at: string
        }
        Insert: {
          contract_id: string
          created_at?: string
          id?: string
          partner_id: string
          reviewed_at?: string | null
          reviewer_notes?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          contract_id?: string
          created_at?: string
          id?: string
          partner_id?: string
          reviewed_at?: string | null
          reviewer_notes?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_approval_requests_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "ad_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_approval_requests_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "ad_partners"
            referencedColumns: ["id"]
          },
        ]
      }
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
          creative_id: string | null
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
          creative_id?: string | null
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
          creative_id?: string | null
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
        Relationships: [
          {
            foreignKeyName: "ad_contracts_creative_id_fkey"
            columns: ["creative_id"]
            isOneToOne: false
            referencedRelation: "creatives"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_partners: {
        Row: {
          billboards_summary: string | null
          company_name: string
          contact_email: string
          country: string
          created_at: string
          id: string
          owner_user_id: string | null
          revenue_share_pct: number
          status: string
          updated_at: string
          website: string | null
        }
        Insert: {
          billboards_summary?: string | null
          company_name: string
          contact_email: string
          country: string
          created_at?: string
          id?: string
          owner_user_id?: string | null
          revenue_share_pct?: number
          status?: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          billboards_summary?: string | null
          company_name?: string
          contact_email?: string
          country?: string
          created_at?: string
          id?: string
          owner_user_id?: string | null
          revenue_share_pct?: number
          status?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      ad_placements: {
        Row: {
          ai_match_score: number
          ai_reasoning: string | null
          approval_request_id: string | null
          contract_id: string
          created_at: string
          id: string
          partner_id: string | null
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
          approval_request_id?: string | null
          contract_id: string
          created_at?: string
          id?: string
          partner_id?: string | null
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
          approval_request_id?: string | null
          contract_id?: string
          created_at?: string
          id?: string
          partner_id?: string | null
          scheduled_end?: string
          scheduled_start?: string
          sport?: string
          status?: string
          venue_code?: string
          venue_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_placements_approval_request_id_fkey"
            columns: ["approval_request_id"]
            isOneToOne: false
            referencedRelation: "ad_approval_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_placements_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "ad_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_placements_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "ad_partners"
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
      brand_presets: {
        Row: {
          created_at: string
          font_family: string | null
          logo_url: string | null
          pi_uid: string
          pi_username: string
          primary_color: string | null
          secondary_color: string | null
          tagline: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          font_family?: string | null
          logo_url?: string | null
          pi_uid: string
          pi_username: string
          primary_color?: string | null
          secondary_color?: string | null
          tagline?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          font_family?: string | null
          logo_url?: string | null
          pi_uid?: string
          pi_username?: string
          primary_color?: string | null
          secondary_color?: string | null
          tagline?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      creatives: {
        Row: {
          created_at: string
          id: string
          kind: string
          name: string
          pi_uid: string
          pi_username: string
          preview_url: string | null
          spec: Json
          thumbnail_url: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          name: string
          pi_uid: string
          pi_username: string
          preview_url?: string | null
          spec: Json
          thumbnail_url?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          name?: string
          pi_uid?: string
          pi_username?: string
          preview_url?: string | null
          spec?: Json
          thumbnail_url?: string | null
          updated_at?: string
        }
        Relationships: []
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
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      venues: {
        Row: {
          active: boolean
          base_rate_pi: number
          city: string | null
          code: string
          country: string | null
          created_at: string
          daily_impressions: number
          id: string
          name: string
          partner_id: string | null
          placement: string
          region: string | null
          sport: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          base_rate_pi?: number
          city?: string | null
          code: string
          country?: string | null
          created_at?: string
          daily_impressions?: number
          id?: string
          name: string
          partner_id?: string | null
          placement: string
          region?: string | null
          sport: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          base_rate_pi?: number
          city?: string | null
          code?: string
          country?: string | null
          created_at?: string
          daily_impressions?: number
          id?: string
          name?: string
          partner_id?: string | null
          placement?: string
          region?: string | null
          sport?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "venues_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "ad_partners"
            referencedColumns: ["id"]
          },
        ]
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
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
      app_role: "admin" | "partner" | "user"
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
    Enums: {
      app_role: ["admin", "partner", "user"],
    },
  },
} as const
