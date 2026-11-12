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
      admin_invite_tokens: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          label: string | null
          token_hash: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          label?: string | null
          token_hash: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          label?: string | null
          token_hash?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      ads: {
        Row: {
          advertiser: string | null
          body: string | null
          category_id: string | null
          city_id: string | null
          click_count: number
          created_at: string
          created_by: string | null
          ends_at: string | null
          governorate_id: string | null
          id: string
          image_url: string | null
          impression_count: number
          is_active: boolean
          placement: Database["public"]["Enums"]["ad_placement"]
          priority: number
          starts_at: string
          target_url: string
          title: string
          updated_at: string
        }
        Insert: {
          advertiser?: string | null
          body?: string | null
          category_id?: string | null
          city_id?: string | null
          click_count?: number
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          governorate_id?: string | null
          id?: string
          image_url?: string | null
          impression_count?: number
          is_active?: boolean
          placement?: Database["public"]["Enums"]["ad_placement"]
          priority?: number
          starts_at?: string
          target_url: string
          title: string
          updated_at?: string
        }
        Update: {
          advertiser?: string | null
          body?: string | null
          category_id?: string | null
          city_id?: string | null
          click_count?: number
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          governorate_id?: string | null
          id?: string
          image_url?: string | null
          impression_count?: number
          is_active?: boolean
          placement?: Database["public"]["Enums"]["ad_placement"]
          priority?: number
          starts_at?: string
          target_url?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ads_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ads_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ads_governorate_id_fkey"
            columns: ["governorate_id"]
            isOneToOne: false
            referencedRelation: "governorates"
            referencedColumns: ["id"]
          },
        ]
      }
      business_branches: {
        Row: {
          address: string | null
          business_id: string
          city_id: string | null
          created_at: string
          governorate_id: string | null
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          phone: string | null
          sort_order: number
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          business_id: string
          city_id?: string | null
          created_at?: string
          governorate_id?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          phone?: string | null
          sort_order?: number
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          business_id?: string
          city_id?: string | null
          created_at?: string
          governorate_id?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          phone?: string | null
          sort_order?: number
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_branches_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_branches_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_branches_governorate_id_fkey"
            columns: ["governorate_id"]
            isOneToOne: false
            referencedRelation: "governorates"
            referencedColumns: ["id"]
          },
        ]
      }
      business_events: {
        Row: {
          business_id: string
          city_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          ends_at: string | null
          external_url: string | null
          governorate_id: string | null
          id: string
          image_url: string | null
          is_featured: boolean
          is_published: boolean
          kind: Database["public"]["Enums"]["event_kind"]
          price_info: string | null
          rejection_reason: string | null
          starts_at: string
          status: Database["public"]["Enums"]["business_status"]
          title: string
          updated_at: string
          venue: string | null
        }
        Insert: {
          business_id: string
          city_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          external_url?: string | null
          governorate_id?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean
          is_published?: boolean
          kind?: Database["public"]["Enums"]["event_kind"]
          price_info?: string | null
          rejection_reason?: string | null
          starts_at?: string
          status?: Database["public"]["Enums"]["business_status"]
          title: string
          updated_at?: string
          venue?: string | null
        }
        Update: {
          business_id?: string
          city_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          external_url?: string | null
          governorate_id?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean
          is_published?: boolean
          kind?: Database["public"]["Enums"]["event_kind"]
          price_info?: string | null
          rejection_reason?: string | null
          starts_at?: string
          status?: Database["public"]["Enums"]["business_status"]
          title?: string
          updated_at?: string
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_events_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_events_governorate_id_fkey"
            columns: ["governorate_id"]
            isOneToOne: false
            referencedRelation: "governorates"
            referencedColumns: ["id"]
          },
        ]
      }
      business_hours: {
        Row: {
          business_id: string
          closes_at: string | null
          day_of_week: number
          id: string
          is_closed: boolean
          opens_at: string | null
        }
        Insert: {
          business_id: string
          closes_at?: string | null
          day_of_week: number
          id?: string
          is_closed?: boolean
          opens_at?: string | null
        }
        Update: {
          business_id?: string
          closes_at?: string | null
          day_of_week?: number
          id?: string
          is_closed?: boolean
          opens_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_hours_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_images: {
        Row: {
          business_id: string
          created_at: string
          id: string
          sort_order: number
          url: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          sort_order?: number
          url: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          sort_order?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_images_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_jobs: {
        Row: {
          business_id: string
          contact: string | null
          created_at: string
          description: string | null
          employment_type: string | null
          id: string
          is_active: boolean
          salary_range: string | null
          title: string
          updated_at: string
        }
        Insert: {
          business_id: string
          contact?: string | null
          created_at?: string
          description?: string | null
          employment_type?: string | null
          id?: string
          is_active?: boolean
          salary_range?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          contact?: string | null
          created_at?: string
          description?: string | null
          employment_type?: string | null
          id?: string
          is_active?: boolean
          salary_range?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_jobs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_managers: {
        Row: {
          business_id: string
          created_at: string
          created_by: string | null
          id: string
          user_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          user_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_managers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_message_replies: {
        Row: {
          body: string
          created_at: string
          from_business: boolean
          id: string
          message_id: string
          sender_id: string | null
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          from_business: boolean
          id?: string
          message_id: string
          sender_id?: string | null
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          from_business?: boolean
          id?: string
          message_id?: string
          sender_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_message_replies_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "business_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      business_messages: {
        Row: {
          body: string
          business_id: string
          created_at: string
          id: string
          is_read: boolean
          kind: string
          last_reply_at: string | null
          sender_email: string | null
          sender_id: string | null
          sender_name: string
          sender_phone: string | null
          unread_for_sender: boolean
          updated_at: string
        }
        Insert: {
          body: string
          business_id: string
          created_at?: string
          id?: string
          is_read?: boolean
          kind?: string
          last_reply_at?: string | null
          sender_email?: string | null
          sender_id?: string | null
          sender_name: string
          sender_phone?: string | null
          unread_for_sender?: boolean
          updated_at?: string
        }
        Update: {
          body?: string
          business_id?: string
          created_at?: string
          id?: string
          is_read?: boolean
          kind?: string
          last_reply_at?: string | null
          sender_email?: string | null
          sender_id?: string | null
          sender_name?: string
          sender_phone?: string | null
          unread_for_sender?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_messages_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_moderation_log: {
        Row: {
          actor_id: string | null
          business_id: string
          created_at: string
          from_status: Database["public"]["Enums"]["business_status"] | null
          id: string
          reason: string | null
          to_status: Database["public"]["Enums"]["business_status"]
        }
        Insert: {
          actor_id?: string | null
          business_id: string
          created_at?: string
          from_status?: Database["public"]["Enums"]["business_status"] | null
          id?: string
          reason?: string | null
          to_status: Database["public"]["Enums"]["business_status"]
        }
        Update: {
          actor_id?: string | null
          business_id?: string
          created_at?: string
          from_status?: Database["public"]["Enums"]["business_status"] | null
          id?: string
          reason?: string | null
          to_status?: Database["public"]["Enums"]["business_status"]
        }
        Relationships: [
          {
            foreignKeyName: "business_moderation_log_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_page_events: {
        Row: {
          business_id: string
          created_at: string
          event_type: string
          id: string
          label: string | null
          source: string
        }
        Insert: {
          business_id: string
          created_at?: string
          event_type: string
          id?: string
          label?: string | null
          source?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          event_type?: string
          id?: string
          label?: string | null
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_page_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_reports: {
        Row: {
          admin_note: string | null
          business_id: string
          created_at: string
          details: string | null
          id: string
          reason: string
          reporter_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          business_id: string
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reporter_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          business_id?: string
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reporter_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_reports_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_username_history: {
        Row: {
          business_id: string
          changed_by: string | null
          created_at: string
          id: string
          username: string
        }
        Insert: {
          business_id: string
          changed_by?: string | null
          created_at?: string
          id?: string
          username: string
        }
        Update: {
          business_id?: string
          changed_by?: string | null
          created_at?: string
          id?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_username_history_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          address: string | null
          amenities: string[]
          category_id: string | null
          city_id: string | null
          city_ids: string[]
          cover_image_url: string | null
          cover_thumb_url: string | null
          created_at: string
          description: string | null
          email: string | null
          facebook: string | null
          good_for: string[]
          governorate_id: string | null
          governorate_ids: string[]
          id: string
          instagram: string | null
          is_featured: boolean
          is_hiring: boolean
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          name: string
          occasions: string[]
          owner_id: string | null
          payment_methods: string[]
          phone: string | null
          price_level: number | null
          products: string[]
          rejection_reason: string | null
          search_norm: string
          search_text: string
          status: Database["public"]["Enums"]["business_status"]
          theme_bg: string | null
          theme_button: string
          theme_contrast: boolean
          theme_font: string
          theme_primary: string | null
          theme_style: string
          updated_at: string
          username: string
          vibes: string[]
          view_count: number
          website: string | null
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          amenities?: string[]
          category_id?: string | null
          city_id?: string | null
          city_ids?: string[]
          cover_image_url?: string | null
          cover_thumb_url?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          facebook?: string | null
          good_for?: string[]
          governorate_id?: string | null
          governorate_ids?: string[]
          id?: string
          instagram?: string | null
          is_featured?: boolean
          is_hiring?: boolean
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          name: string
          occasions?: string[]
          owner_id?: string | null
          payment_methods?: string[]
          phone?: string | null
          price_level?: number | null
          products?: string[]
          rejection_reason?: string | null
          search_norm?: string
          search_text?: string
          status?: Database["public"]["Enums"]["business_status"]
          theme_bg?: string | null
          theme_button?: string
          theme_contrast?: boolean
          theme_font?: string
          theme_primary?: string | null
          theme_style?: string
          updated_at?: string
          username?: string
          vibes?: string[]
          view_count?: number
          website?: string | null
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          amenities?: string[]
          category_id?: string | null
          city_id?: string | null
          city_ids?: string[]
          cover_image_url?: string | null
          cover_thumb_url?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          facebook?: string | null
          good_for?: string[]
          governorate_id?: string | null
          governorate_ids?: string[]
          id?: string
          instagram?: string | null
          is_featured?: boolean
          is_hiring?: boolean
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          name?: string
          occasions?: string[]
          owner_id?: string | null
          payment_methods?: string[]
          phone?: string | null
          price_level?: number | null
          products?: string[]
          rejection_reason?: string | null
          search_norm?: string
          search_text?: string
          status?: Database["public"]["Enums"]["business_status"]
          theme_bg?: string | null
          theme_button?: string
          theme_contrast?: boolean
          theme_font?: string
          theme_primary?: string | null
          theme_style?: string
          updated_at?: string
          username?: string
          vibes?: string[]
          view_count?: number
          website?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "businesses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "businesses_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "businesses_governorate_id_fkey"
            columns: ["governorate_id"]
            isOneToOne: false
            referencedRelation: "governorates"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          name: string
          name_norm: string | null
          parent_id: string | null
          slug: string
          sort_order: number
          status: Database["public"]["Enums"]["business_status"]
          suggested_by: string | null
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          name_norm?: string | null
          parent_id?: string | null
          slug: string
          sort_order?: number
          status?: Database["public"]["Enums"]["business_status"]
          suggested_by?: string | null
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          name_norm?: string | null
          parent_id?: string | null
          slug?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["business_status"]
          suggested_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      cities: {
        Row: {
          created_at: string
          governorate_id: string
          id: string
          is_active: boolean
          is_new_city: boolean
          name: string
          name_norm: string | null
          slug: string
        }
        Insert: {
          created_at?: string
          governorate_id: string
          id?: string
          is_active?: boolean
          is_new_city?: boolean
          name: string
          name_norm?: string | null
          slug: string
        }
        Update: {
          created_at?: string
          governorate_id?: string
          id?: string
          is_active?: boolean
          is_new_city?: boolean
          name?: string
          name_norm?: string | null
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "cities_governorate_id_fkey"
            columns: ["governorate_id"]
            isOneToOne: false
            referencedRelation: "governorates"
            referencedColumns: ["id"]
          },
        ]
      }
      event_reminders: {
        Row: {
          created_at: string
          event_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_reminders_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "business_events"
            referencedColumns: ["id"]
          },
        ]
      }
      governorates: {
        Row: {
          created_at: string
          id: string
          name: string
          name_norm: string | null
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          name_norm?: string | null
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          name_norm?: string | null
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      list_items: {
        Row: {
          business_id: string
          created_at: string
          id: string
          list_id: string
          note: string | null
          sort_order: number
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          list_id: string
          note?: string | null
          sort_order?: number
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          list_id?: string
          note?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "list_items_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "list_items_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "lists"
            referencedColumns: ["id"]
          },
        ]
      }
      lists: {
        Row: {
          city_id: string | null
          cover_image_url: string | null
          created_at: string
          description: string | null
          id: string
          is_public: boolean
          slug: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          city_id?: string | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          slug: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          city_id?: string | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          slug?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lists_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_settings: {
        Row: {
          created_at: string
          notify_approved_email: boolean
          notify_approved_inapp: boolean
          notify_contact_clicks: boolean
          notify_messages: boolean
          notify_rejected_email: boolean
          notify_rejected_inapp: boolean
          notify_withdrawn_email: boolean
          notify_withdrawn_inapp: boolean
          push_enabled: boolean
          sound_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          notify_approved_email?: boolean
          notify_approved_inapp?: boolean
          notify_contact_clicks?: boolean
          notify_messages?: boolean
          notify_rejected_email?: boolean
          notify_rejected_inapp?: boolean
          notify_withdrawn_email?: boolean
          notify_withdrawn_inapp?: boolean
          push_enabled?: boolean
          sound_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          notify_approved_email?: boolean
          notify_approved_inapp?: boolean
          notify_contact_clicks?: boolean
          notify_messages?: boolean
          notify_rejected_email?: boolean
          notify_rejected_inapp?: boolean
          notify_withdrawn_email?: boolean
          notify_withdrawn_inapp?: boolean
          push_enabled?: boolean
          sound_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          business_id: string | null
          created_at: string
          id: string
          is_read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          business_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          body?: string | null
          business_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          author_name: string | null
          business_id: string
          comment: string | null
          created_at: string
          id: string
          rating: number
          rejection_reason: string | null
          status: Database["public"]["Enums"]["business_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          author_name?: string | null
          business_id: string
          comment?: string | null
          created_at?: string
          id?: string
          rating: number
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["business_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          author_name?: string | null
          business_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["business_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      search_queries: {
        Row: {
          category: string | null
          city: string | null
          created_at: string
          id: string
          results_count: number
          term: string
        }
        Insert: {
          category?: string | null
          city?: string | null
          created_at?: string
          id?: string
          results_count?: number
          term: string
        }
        Update: {
          category?: string | null
          city?: string | null
          created_at?: string
          id?: string
          results_count?: number
          term?: string
        }
        Relationships: []
      }
      service_providers: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string | null
          phone: string
          service_type: string
          status: Database["public"]["Enums"]["business_status"]
          user_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string | null
          phone: string
          service_type: string
          status?: Database["public"]["Enums"]["business_status"]
          user_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string | null
          phone?: string
          service_type?: string
          status?: Database["public"]["Enums"]["business_status"]
          user_id?: string | null
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          accent_color: string
          ad_positions: string
          adsense_client: string | null
          adsense_enabled: boolean
          adsense_every: number
          adsense_slot: string | null
          adsense_slot_business: string | null
          adsense_slot_search: string | null
          hero_subtitle: string
          hero_title: string
          icon_url: string | null
          id: string
          logo_dark_url: string | null
          logo_url: string | null
          primary_color: string
          site_name: string
          tagline: string
          updated_at: string
        }
        Insert: {
          accent_color?: string
          ad_positions?: string
          adsense_client?: string | null
          adsense_enabled?: boolean
          adsense_every?: number
          adsense_slot?: string | null
          adsense_slot_business?: string | null
          adsense_slot_search?: string | null
          hero_subtitle?: string
          hero_title?: string
          icon_url?: string | null
          id?: string
          logo_dark_url?: string | null
          logo_url?: string | null
          primary_color?: string
          site_name?: string
          tagline?: string
          updated_at?: string
        }
        Update: {
          accent_color?: string
          ad_positions?: string
          adsense_client?: string | null
          adsense_enabled?: boolean
          adsense_every?: number
          adsense_slot?: string | null
          adsense_slot_business?: string | null
          adsense_slot_search?: string | null
          hero_subtitle?: string
          hero_title?: string
          icon_url?: string | null
          id?: string
          logo_dark_url?: string | null
          logo_url?: string | null
          primary_color?: string
          site_name?: string
          tagline?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_visits: {
        Row: {
          created_at: string
          id: string
          path: string
          source: string
          visitor_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          path: string
          source?: string
          visitor_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          path?: string
          source?: string
          visitor_id?: string | null
        }
        Relationships: []
      }
      store_products: {
        Row: {
          business_id: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          sort_order: number
        }
        Insert: {
          business_id: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          sort_order?: number
        }
        Update: {
          business_id?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "store_products_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      store_settings: {
        Row: {
          business_id: string
          instapay_handle: string | null
          is_enabled: boolean
          notes: string | null
          payment_methods: string[]
          shipping_prepay_required: boolean
          updated_at: string
          wallet_number: string | null
        }
        Insert: {
          business_id: string
          instapay_handle?: string | null
          is_enabled?: boolean
          notes?: string | null
          payment_methods?: string[]
          shipping_prepay_required?: boolean
          updated_at?: string
          wallet_number?: string | null
        }
        Update: {
          business_id?: string
          instapay_handle?: string | null
          is_enabled?: boolean
          notes?: string | null
          payment_methods?: string[]
          shipping_prepay_required?: boolean
          updated_at?: string
          wallet_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_settings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      store_shipping_methods: {
        Row: {
          business_id: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          notes: string | null
          price: number
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          price?: number
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          price?: number
        }
        Relationships: [
          {
            foreignKeyName: "store_shipping_methods_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      store_variants: {
        Row: {
          business_id: string
          color: string | null
          created_at: string
          id: string
          original_price: number | null
          price: number
          product_id: string
          size: string | null
          stock: number
        }
        Insert: {
          business_id: string
          color?: string | null
          created_at?: string
          id?: string
          original_price?: number | null
          price?: number
          product_id: string
          size?: string | null
          stock?: number
        }
        Update: {
          business_id?: string
          color?: string | null
          created_at?: string
          id?: string
          original_price?: number | null
          price?: number
          product_id?: string
          size?: string | null
          stock?: number
        }
        Relationships: [
          {
            foreignKeyName: "store_variants_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "store_products"
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_directory_stats: { Args: { _days?: number }; Returns: Json }
      admin_list_users: {
        Args: never
        Returns: {
          banned_until: string
          created_at: string
          email: string
          full_name: string
          id: string
          is_admin: boolean
          is_banned: boolean
          last_sign_in_at: string
        }[]
      }
      admin_set_admin_role: {
        Args: { _grant: boolean; _user_id: string }
        Returns: boolean
      }
      admin_set_business_owner: {
        Args: { _business_id: string; _email: string }
        Returns: boolean
      }
      admin_traffic_stats: { Args: { _days?: number }; Returns: Json }
      ar_norm: { Args: { _t: string }; Returns: string }
      business_add_manager: {
        Args: { _business_id: string; _email: string }
        Returns: boolean
      }
      business_list_managers: {
        Args: { _business_id: string }
        Returns: {
          created_at: string
          email: string
          full_name: string
          user_id: string
        }[]
      }
      business_page_events_export: {
        Args: { _business_id: string; _days?: number }
        Returns: {
          created_at: string
          event_type: string
          label: string
          source: string
        }[]
      }
      business_page_stats: {
        Args: { _business_id: string; _days?: number }
        Returns: Json
      }
      business_recent_contacts: {
        Args: { _since?: string }
        Returns: {
          business_id: string
          business_name: string
          created_at: string
          id: string
          label: string
          source: string
          username: string
        }[]
      }
      business_remove_manager: {
        Args: { _business_id: string; _user_id: string }
        Returns: boolean
      }
      business_withdraw: { Args: { _business_id: string }; Returns: boolean }
      can_manage_business: {
        Args: { _business_id: string; _user_id: string }
        Returns: boolean
      }
      can_view_message: {
        Args: { _message_id: string; _user_id: string }
        Returns: boolean
      }
      claim_admin_invite: { Args: { _token: string }; Returns: boolean }
      create_admin_invite: {
        Args: { _days?: number; _label?: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_business_manager: {
        Args: { _business_id: string; _user_id: string }
        Returns: boolean
      }
      is_business_owner: {
        Args: { _business_id: string; _user_id: string }
        Returns: boolean
      }
      log_search_query: {
        Args: {
          _category?: string
          _city?: string
          _results: number
          _term: string
        }
        Returns: undefined
      }
      make_slug: { Args: { v: string }; Returns: string }
      normalize_username: { Args: { v: string }; Returns: string }
      owns_list: {
        Args: { _list_id: string; _user_id: string }
        Returns: boolean
      }
      random_username: { Args: never; Returns: string }
      refresh_business_locations: {
        Args: { _business_id: string }
        Returns: undefined
      }
      resolve_legacy_handle: { Args: { _username: string }; Returns: string }
      run_event_reminders: { Args: { _hours?: number }; Returns: number }
      search_term_stats: {
        Args: { _days?: number; _limit?: number }
        Returns: {
          avg_results: number
          last_results: number
          last_searched: string
          searches: number
          term: string
          zero_rate: number
        }[]
      }
      store_is_public: { Args: { _business_id: string }; Returns: boolean }
      suggest_city: {
        Args: { _governorate_id: string; _name: string }
        Returns: Json
      }
      track_ad_click: { Args: { _ad_id: string }; Returns: undefined }
      track_ad_impression: { Args: { _ad_id: string }; Returns: undefined }
      track_business_event: {
        Args: {
          _business_id: string
          _event_type: string
          _label?: string
          _source?: string
        }
        Returns: undefined
      }
      track_site_visit: {
        Args: { _path: string; _source?: string; _visitor: string }
        Returns: undefined
      }
    }
    Enums: {
      ad_placement: "home" | "search" | "business"
      app_role: "admin" | "moderator" | "user"
      business_status: "pending" | "approved" | "rejected"
      event_kind: "offer" | "party" | "opening" | "match" | "event"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      ad_placement: ["home", "search", "business"],
      app_role: ["admin", "moderator", "user"],
      business_status: ["pending", "approved", "rejected"],
      event_kind: ["offer", "party", "opening", "match", "event"],
    },
  },
} as const
