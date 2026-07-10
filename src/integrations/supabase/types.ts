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
          {
            foreignKeyName: "ad_approval_requests_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "public_ad_partners"
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
          owner_pi_uid: string | null
          owner_pi_username: string | null
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
          owner_pi_uid?: string | null
          owner_pi_username?: string | null
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
          owner_pi_uid?: string | null
          owner_pi_username?: string | null
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
          {
            foreignKeyName: "ad_placements_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "public_ad_partners"
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
      ad_proposals: {
        Row: {
          created_at: string
          discount_pct: number
          estimated_impressions: number
          id: string
          notes: string | null
          partner_id: string
          price_pi: number
          proposed_end: string
          proposed_start: string
          rfp_id: string
          status: string
          updated_at: string
          valid_until: string | null
          venue_ids: string[]
        }
        Insert: {
          created_at?: string
          discount_pct?: number
          estimated_impressions: number
          id?: string
          notes?: string | null
          partner_id: string
          price_pi: number
          proposed_end: string
          proposed_start: string
          rfp_id: string
          status?: string
          updated_at?: string
          valid_until?: string | null
          venue_ids: string[]
        }
        Update: {
          created_at?: string
          discount_pct?: number
          estimated_impressions?: number
          id?: string
          notes?: string | null
          partner_id?: string
          price_pi?: number
          proposed_end?: string
          proposed_start?: string
          rfp_id?: string
          status?: string
          updated_at?: string
          valid_until?: string | null
          venue_ids?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "ad_proposals_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "ad_partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_proposals_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "public_ad_partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_proposals_rfp_id_fkey"
            columns: ["rfp_id"]
            isOneToOne: false
            referencedRelation: "ad_rfps"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_rfps: {
        Row: {
          advertiser_pi_uid: string
          advertiser_pi_username: string | null
          brief: string
          budget_pi: number
          campaign_name: string
          created_at: string
          creative_id: string | null
          end_date: string
          id: string
          objective: string | null
          preferred_formats: string[] | null
          start_date: string
          status: string
          target_audience: string | null
          target_cities: string[] | null
          target_countries: string[] | null
          updated_at: string
        }
        Insert: {
          advertiser_pi_uid: string
          advertiser_pi_username?: string | null
          brief: string
          budget_pi: number
          campaign_name: string
          created_at?: string
          creative_id?: string | null
          end_date: string
          id?: string
          objective?: string | null
          preferred_formats?: string[] | null
          start_date: string
          status?: string
          target_audience?: string | null
          target_cities?: string[] | null
          target_countries?: string[] | null
          updated_at?: string
        }
        Update: {
          advertiser_pi_uid?: string
          advertiser_pi_username?: string | null
          brief?: string
          budget_pi?: number
          campaign_name?: string
          created_at?: string
          creative_id?: string | null
          end_date?: string
          id?: string
          objective?: string | null
          preferred_formats?: string[] | null
          start_date?: string
          status?: string
          target_audience?: string | null
          target_cities?: string[] | null
          target_countries?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_rfps_creative_id_fkey"
            columns: ["creative_id"]
            isOneToOne: false
            referencedRelation: "creatives"
            referencedColumns: ["id"]
          },
        ]
      }
      billboard_locations: {
        Row: {
          active: boolean
          city: string
          country: string
          created_at: string
          daily_impressions: number
          hourly_pi_rate: number
          id: string
          image_url: string | null
          is_programmatic: boolean
          lat: number | null
          lng: number | null
          name: string
          partner_id: string | null
          resolution: string | null
          size_meters: string | null
          slot_seconds: number
          slug: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          city: string
          country: string
          created_at?: string
          daily_impressions?: number
          hourly_pi_rate?: number
          id?: string
          image_url?: string | null
          is_programmatic?: boolean
          lat?: number | null
          lng?: number | null
          name: string
          partner_id?: string | null
          resolution?: string | null
          size_meters?: string | null
          slot_seconds?: number
          slug: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          city?: string
          country?: string
          created_at?: string
          daily_impressions?: number
          hourly_pi_rate?: number
          id?: string
          image_url?: string | null
          is_programmatic?: boolean
          lat?: number | null
          lng?: number | null
          name?: string
          partner_id?: string | null
          resolution?: string | null
          size_meters?: string | null
          slot_seconds?: number
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "billboard_locations_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "ad_partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billboard_locations_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "public_ad_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          advertiser_pi_uid: string
          advertiser_pi_username: string | null
          campaign_id: string | null
          created_at: string
          hours: number
          id: string
          invoice_id: string | null
          location_id: string
          notes: string | null
          platform_fee_pi: number
          quoted_pi: number
          starts_at: string
          status: string
          total_pi: number
          updated_at: string
        }
        Insert: {
          advertiser_pi_uid: string
          advertiser_pi_username?: string | null
          campaign_id?: string | null
          created_at?: string
          hours: number
          id?: string
          invoice_id?: string | null
          location_id: string
          notes?: string | null
          platform_fee_pi: number
          quoted_pi: number
          starts_at: string
          status?: string
          total_pi: number
          updated_at?: string
        }
        Update: {
          advertiser_pi_uid?: string
          advertiser_pi_username?: string | null
          campaign_id?: string | null
          created_at?: string
          hours?: number
          id?: string
          invoice_id?: string | null
          location_id?: string
          notes?: string | null
          platform_fee_pi?: number
          quoted_pi?: number
          starts_at?: string
          status?: string
          total_pi?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ad_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "billboard_locations"
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
      insertion_orders: {
        Row: {
          advertiser_pi_uid: string
          advertiser_pi_username: string | null
          agency_commission_pct: number
          campaign_name: string
          contract_id: string | null
          created_at: string
          flight_end: string
          flight_start: string
          gross_pi: number
          id: string
          io_number: string
          net_pi: number
          partner_id: string
          payment_terms: string
          proposal_id: string | null
          signed_by_advertiser_at: string | null
          signed_by_partner_at: string | null
          status: string
          terms_json: Json
          updated_at: string
        }
        Insert: {
          advertiser_pi_uid: string
          advertiser_pi_username?: string | null
          agency_commission_pct?: number
          campaign_name: string
          contract_id?: string | null
          created_at?: string
          flight_end: string
          flight_start: string
          gross_pi: number
          id?: string
          io_number: string
          net_pi: number
          partner_id: string
          payment_terms?: string
          proposal_id?: string | null
          signed_by_advertiser_at?: string | null
          signed_by_partner_at?: string | null
          status?: string
          terms_json?: Json
          updated_at?: string
        }
        Update: {
          advertiser_pi_uid?: string
          advertiser_pi_username?: string | null
          agency_commission_pct?: number
          campaign_name?: string
          contract_id?: string | null
          created_at?: string
          flight_end?: string
          flight_start?: string
          gross_pi?: number
          id?: string
          io_number?: string
          net_pi?: number
          partner_id?: string
          payment_terms?: string
          proposal_id?: string | null
          signed_by_advertiser_at?: string | null
          signed_by_partner_at?: string | null
          status?: string
          terms_json?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "insertion_orders_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "ad_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insertion_orders_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "ad_partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insertion_orders_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "public_ad_partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insertion_orders_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "ad_proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          advertiser_pi_uid: string
          advertiser_pi_username: string | null
          booking_id: string | null
          contract_id: string | null
          created_at: string
          due_at: string
          id: string
          insertion_order_id: string | null
          invoice_number: string
          issued_at: string
          line_items: Json
          paid_at: string | null
          partner_id: string | null
          pi_txid: string | null
          status: string
          subtotal_pi: number
          tax_pi: number
          total_pi: number
          updated_at: string
        }
        Insert: {
          advertiser_pi_uid: string
          advertiser_pi_username?: string | null
          booking_id?: string | null
          contract_id?: string | null
          created_at?: string
          due_at: string
          id?: string
          insertion_order_id?: string | null
          invoice_number: string
          issued_at?: string
          line_items?: Json
          paid_at?: string | null
          partner_id?: string | null
          pi_txid?: string | null
          status?: string
          subtotal_pi: number
          tax_pi?: number
          total_pi: number
          updated_at?: string
        }
        Update: {
          advertiser_pi_uid?: string
          advertiser_pi_username?: string | null
          booking_id?: string | null
          contract_id?: string | null
          created_at?: string
          due_at?: string
          id?: string
          insertion_order_id?: string | null
          invoice_number?: string
          issued_at?: string
          line_items?: Json
          paid_at?: string | null
          partner_id?: string | null
          pi_txid?: string | null
          status?: string
          subtotal_pi?: number
          tax_pi?: number
          total_pi?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "ad_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_insertion_order_id_fkey"
            columns: ["insertion_order_id"]
            isOneToOne: false
            referencedRelation: "insertion_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "ad_partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "public_ad_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      make_goods: {
        Row: {
          compensation_type: string
          compensation_value: number
          contract_id: string | null
          created_at: string
          id: string
          original_placement_id: string
          partner_id: string | null
          reason: string
          replacement_placement_id: string | null
          shortfall_impressions: number
          status: string
          updated_at: string
        }
        Insert: {
          compensation_type?: string
          compensation_value: number
          contract_id?: string | null
          created_at?: string
          id?: string
          original_placement_id: string
          partner_id?: string | null
          reason: string
          replacement_placement_id?: string | null
          shortfall_impressions?: number
          status?: string
          updated_at?: string
        }
        Update: {
          compensation_type?: string
          compensation_value?: number
          contract_id?: string | null
          created_at?: string
          id?: string
          original_placement_id?: string
          partner_id?: string | null
          reason?: string
          replacement_placement_id?: string | null
          shortfall_impressions?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "make_goods_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "ad_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "make_goods_original_placement_id_fkey"
            columns: ["original_placement_id"]
            isOneToOne: false
            referencedRelation: "ad_placements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "make_goods_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "ad_partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "make_goods_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "public_ad_partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "make_goods_replacement_placement_id_fkey"
            columns: ["replacement_placement_id"]
            isOneToOne: false
            referencedRelation: "ad_placements"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_admin_assignments: {
        Row: {
          created_at: string
          id: string
          partner_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          partner_id: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          partner_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_admin_assignments_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "ad_partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_admin_assignments_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "public_ad_partners"
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
      plays: {
        Row: {
          booking_id: string
          created_at: string
          id: string
          impressions: number
          location_id: string
          played_at: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          id?: string
          impressions?: number
          location_id: string
          played_at: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          id?: string
          impressions?: number
          location_id?: string
          played_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plays_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plays_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "billboard_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      proof_of_plays: {
        Row: {
          contract_id: string | null
          created_at: string
          device_id: string | null
          duration_sec: number
          id: string
          impressions: number
          photo_url: string | null
          placement_id: string
          played_at: string
          signature: string | null
          venue_id: string | null
        }
        Insert: {
          contract_id?: string | null
          created_at?: string
          device_id?: string | null
          duration_sec: number
          id?: string
          impressions?: number
          photo_url?: string | null
          placement_id: string
          played_at?: string
          signature?: string | null
          venue_id?: string | null
        }
        Update: {
          contract_id?: string | null
          created_at?: string
          device_id?: string | null
          duration_sec?: number
          id?: string
          impressions?: number
          photo_url?: string | null
          placement_id?: string
          played_at?: string
          signature?: string | null
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proof_of_plays_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "ad_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proof_of_plays_placement_id_fkey"
            columns: ["placement_id"]
            isOneToOne: false
            referencedRelation: "ad_placements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proof_of_plays_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
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
      venue_creative_specs: {
        Row: {
          accepted_mime_types: string[]
          aspect_ratio: string
          color_profile: string | null
          created_at: string
          format: string
          height_px: number
          id: string
          max_duration_sec: number | null
          max_file_size_mb: number
          notes: string | null
          updated_at: string
          venue_id: string
          width_px: number
        }
        Insert: {
          accepted_mime_types?: string[]
          aspect_ratio: string
          color_profile?: string | null
          created_at?: string
          format: string
          height_px: number
          id?: string
          max_duration_sec?: number | null
          max_file_size_mb?: number
          notes?: string | null
          updated_at?: string
          venue_id: string
          width_px: number
        }
        Update: {
          accepted_mime_types?: string[]
          aspect_ratio?: string
          color_profile?: string | null
          created_at?: string
          format?: string
          height_px?: number
          id?: string
          max_duration_sec?: number | null
          max_file_size_mb?: number
          notes?: string | null
          updated_at?: string
          venue_id?: string
          width_px?: number
        }
        Relationships: [
          {
            foreignKeyName: "venue_creative_specs_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_rate_cards: {
        Row: {
          active: boolean
          cpm_pi: number
          created_at: string
          daily_rate_pi: number | null
          effective_from: string
          effective_to: string | null
          id: string
          label: string
          min_booking_days: number
          monthly_rate_pi: number | null
          partner_id: string
          season_multiplier: number
          updated_at: string
          venue_id: string
          weekly_rate_pi: number | null
        }
        Insert: {
          active?: boolean
          cpm_pi: number
          created_at?: string
          daily_rate_pi?: number | null
          effective_from?: string
          effective_to?: string | null
          id?: string
          label: string
          min_booking_days?: number
          monthly_rate_pi?: number | null
          partner_id: string
          season_multiplier?: number
          updated_at?: string
          venue_id: string
          weekly_rate_pi?: number | null
        }
        Update: {
          active?: boolean
          cpm_pi?: number
          created_at?: string
          daily_rate_pi?: number | null
          effective_from?: string
          effective_to?: string | null
          id?: string
          label?: string
          min_booking_days?: number
          monthly_rate_pi?: number | null
          partner_id?: string
          season_multiplier?: number
          updated_at?: string
          venue_id?: string
          weekly_rate_pi?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "venue_rate_cards_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "ad_partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_rate_cards_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "public_ad_partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_rate_cards_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
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
          {
            foreignKeyName: "venues_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "public_ad_partners"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      public_ad_partners: {
        Row: {
          billboards_summary: string | null
          company_name: string | null
          country: string | null
          created_at: string | null
          id: string | null
          revenue_share_pct: number | null
          status: string | null
          website: string | null
        }
        Insert: {
          billboards_summary?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string | null
          id?: string | null
          revenue_share_pct?: number | null
          status?: string | null
          website?: string | null
        }
        Update: {
          billboards_summary?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string | null
          id?: string | null
          revenue_share_pct?: number | null
          status?: string | null
          website?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      create_booking: {
        Args: {
          p_campaign_id: string
          p_hours: number
          p_location_id: string
          p_pi_uid: string
          p_pi_username: string
          p_starts_at: string
        }
        Returns: {
          booking_id: string
          invoice_id: string
          total_pi: number
        }[]
      }
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
      is_partner_staff: {
        Args: { _partner: string; _user: string }
        Returns: boolean
      }
      pay_booking_invoice: {
        Args: { p_invoice_id: string; p_pi_uid: string }
        Returns: {
          new_balance: number
          plays_created: number
        }[]
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
