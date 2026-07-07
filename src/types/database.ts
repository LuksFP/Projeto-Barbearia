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
      appointments: {
        Row: {
          barber_id: string | null
          barber_name: string
          barbershop_id: string
          client_email: string | null
          client_name: string
          client_phone: string
          created_at: string
          date: string
          id: string
          membership_type: string | null
          price: number | null
          payment_method: string | null
          payment_status: string | null
          rating: number | null
          review: string | null
          paid_at: string | null
          service_category: string | null
          service_id: string | null
          service_name: string
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          status: string
          time: string
          user_id: string | null
        }
        Insert: {
          barber_id?: string | null
          barber_name: string
          barbershop_id: string
          client_email?: string | null
          client_name: string
          client_phone: string
          created_at?: string
          date: string
          id?: string
          membership_type?: string | null
          price?: number | null
          payment_method?: string | null
          payment_status?: string | null
          rating?: number | null
          review?: string | null
          paid_at?: string | null
          service_category?: string | null
          service_id?: string | null
          service_name: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          status?: string
          time: string
          user_id?: string | null
        }
        Update: {
          barber_id?: string | null
          barber_name?: string
          barbershop_id?: string
          client_email?: string | null
          client_name?: string
          client_phone?: string
          created_at?: string
          date?: string
          id?: string
          membership_type?: string | null
          price?: number | null
          payment_method?: string | null
          payment_status?: string | null
          rating?: number | null
          review?: string | null
          paid_at?: string | null
          service_category?: string | null
          service_id?: string | null
          service_name?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          status?: string
          time?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbershop_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      barbershop_invites: {
        Row: {
          barbershop_id: string
          bio: string
          created_at: string
          email: string
          expires_at: string
          id: string
          name: string
          role: string
          specialty: string
          status: string
          token: string
        }
        Insert: {
          barbershop_id: string
          bio?: string
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          name: string
          role?: string
          specialty?: string
          status?: string
          token?: string
        }
        Update: {
          barbershop_id?: string
          bio?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          name?: string
          role?: string
          specialty?: string
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "barbershop_invites_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      barbershop_members: {
        Row: {
          active: boolean
          avatar: string | null
          barbershop_id: string
          bio: string
          id: string
          joined_at: string
          name: string
          role: string
          specialty: string
          user_id: string
        }
        Insert: {
          active?: boolean
          avatar?: string | null
          barbershop_id: string
          bio?: string
          id?: string
          joined_at?: string
          name: string
          role?: string
          specialty?: string
          user_id: string
        }
        Update: {
          active?: boolean
          avatar?: string | null
          barbershop_id?: string
          bio?: string
          id?: string
          joined_at?: string
          name?: string
          role?: string
          specialty?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "barbershop_members_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      barbershops: {
        Row: {
          accent_color: string
          active: boolean
          address: string
          cancellation_policy: Json | null
          city: string
          club_pix_key: string
          cover_image: string | null
          created_at: string
          custom_domain: string | null
          description: string
          embed_key: string
          id: string
          instagram: string
          logo_text: string
          name: string
          phone: string
          primary_color: string
          saas_account_id: string
          site_type: string
          slug: string
          state: string
          tagline: string
          whatsapp: string
        }
        Insert: {
          accent_color?: string
          active?: boolean
          address?: string
          cancellation_policy?: Json | null
          city?: string
          club_pix_key?: string
          cover_image?: string | null
          created_at?: string
          custom_domain?: string | null
          description?: string
          embed_key: string
          id?: string
          instagram?: string
          logo_text?: string
          name: string
          phone?: string
          primary_color?: string
          saas_account_id: string
          site_type?: string
          slug: string
          state?: string
          tagline?: string
          whatsapp?: string
        }
        Update: {
          accent_color?: string
          active?: boolean
          address?: string
          cancellation_policy?: Json | null
          city?: string
          club_pix_key?: string
          cover_image?: string | null
          created_at?: string
          custom_domain?: string | null
          description?: string
          embed_key?: string
          id?: string
          instagram?: string
          logo_text?: string
          name?: string
          phone?: string
          primary_color?: string
          saas_account_id?: string
          site_type?: string
          slug?: string
          state?: string
          tagline?: string
          whatsapp?: string
        }
        Relationships: [
          {
            foreignKeyName: "barbershops_saas_account_id_fkey"
            columns: ["saas_account_id"]
            isOneToOne: false
            referencedRelation: "saas_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      client_memberships: {
        Row: {
          barbershop_id: string
          cancelled_at: string | null
          client_id: string
          id: string
          membership_id: string
          renewed_at: string | null
          started_at: string
          status: string
          stripe_subscription_id: string | null
        }
        Insert: {
          barbershop_id: string
          cancelled_at?: string | null
          client_id: string
          id?: string
          membership_id: string
          renewed_at?: string | null
          started_at?: string
          status?: string
          stripe_subscription_id?: string | null
        }
        Update: {
          barbershop_id?: string
          cancelled_at?: string | null
          client_id?: string
          id?: string
          membership_id?: string
          renewed_at?: string | null
          started_at?: string
          status?: string
          stripe_subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_memberships_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_memberships_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_memberships_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          barbershop_id: string
          created_at: string
          email: string | null
          id: string
          last_visit: string | null
          membership_type: string | null
          name: string
          notes: string | null
          phone: string
          total_visits: number
        }
        Insert: {
          barbershop_id: string
          created_at?: string
          email?: string | null
          id?: string
          last_visit?: string | null
          membership_type?: string | null
          name: string
          notes?: string | null
          phone: string
          total_visits?: number
        }
        Update: {
          barbershop_id?: string
          created_at?: string
          email?: string | null
          id?: string
          last_visit?: string | null
          membership_type?: string | null
          name?: string
          notes?: string | null
          phone?: string
          total_visits?: number
        }
        Relationships: [
          {
            foreignKeyName: "clients_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      club_subscribers: {
        Row: {
          active: boolean
          barbershop_id: string
          billing_day: number
          created_at: string
          id: string
          membership_id: string | null
          name: string
          paid_until: string | null
          phone: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          barbershop_id: string
          billing_day?: number
          created_at?: string
          id?: string
          membership_id?: string | null
          name: string
          paid_until?: string | null
          phone?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          barbershop_id?: string
          billing_day?: number
          created_at?: string
          id?: string
          membership_id?: string | null
          name?: string
          paid_until?: string | null
          phone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_subscribers_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_subscribers_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          active: boolean
          barbershop_id: string
          benefits: string[]
          created_at: string
          id: string
          name: string
          period: string
          price: number
          stripe_price_id: string | null
          subscriber_count: number
        }
        Insert: {
          active?: boolean
          barbershop_id: string
          benefits?: string[]
          created_at?: string
          id?: string
          name: string
          period: string
          price: number
          stripe_price_id?: string | null
          subscriber_count?: number
        }
        Update: {
          active?: boolean
          barbershop_id?: string
          benefits?: string[]
          created_at?: string
          id?: string
          name?: string
          period?: string
          price?: number
          stripe_price_id?: string | null
          subscriber_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "memberships_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      saas_accounts: {
        Row: {
          barbershop_id: string | null
          barbershop_name: string
          barbershop_slug: string
          cancel_at: string | null
          created_at: string
          id: string
          owner_name: string
          plan: string | null
          plan_started_at: string | null
          plan_status: string | null
          seen_announcements: string[]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_ends_at: string | null
          user_id: string
        }
        Insert: {
          barbershop_id?: string | null
          barbershop_name: string
          barbershop_slug: string
          cancel_at?: string | null
          created_at?: string
          id?: string
          owner_name: string
          plan?: string | null
          plan_started_at?: string | null
          plan_status?: string | null
          seen_announcements?: string[]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          user_id: string
        }
        Update: {
          barbershop_id?: string | null
          barbershop_name?: string
          barbershop_slug?: string
          cancel_at?: string | null
          created_at?: string
          id?: string
          owner_name?: string
          plan?: string | null
          plan_started_at?: string | null
          plan_status?: string | null
          seen_announcements?: string[]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          active: boolean
          barbershop_id: string
          category: string
          created_at: string
          description: string
          duration_min: number
          id: string
          name: string
          price: number
        }
        Insert: {
          active?: boolean
          barbershop_id: string
          category?: string
          created_at?: string
          description?: string
          duration_min: number
          id?: string
          name: string
          price: number
        }
        Update: {
          active?: boolean
          barbershop_id?: string
          category?: string
          created_at?: string
          description?: string
          duration_min?: number
          id?: string
          name?: string
          price?: number
        }
        Relationships: [
          {
            foreignKeyName: "services_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      my_barbershop_ids: { Args: never; Returns: string[] }
      mark_announcement_seen: { Args: { p_key: string }; Returns: undefined }
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
