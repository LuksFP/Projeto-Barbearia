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
      ai_rate_limit: {
        Row: {
          count: number
          fn: string
          user_id: string
          window_start: string
        }
        Insert: {
          count?: number
          fn: string
          user_id: string
          window_start?: string
        }
        Update: {
          count?: number
          fn?: string
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
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
          duration_min: number
          id: string
          membership_type: string | null
          notes: string | null
          paid_at: string | null
          payment_method: string | null
          payment_status: string | null
          price: number | null
          rating: number | null
          review: string | null
          service_category: string | null
          service_id: string | null
          service_name: string
          status: string
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
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
          duration_min?: number
          id?: string
          membership_type?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_status?: string | null
          price?: number | null
          rating?: number | null
          review?: string | null
          service_category?: string | null
          service_id?: string | null
          service_name: string
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
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
          duration_min?: number
          id?: string
          membership_type?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_status?: string | null
          price?: number | null
          rating?: number | null
          review?: string | null
          service_category?: string | null
          service_id?: string | null
          service_name?: string
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
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
      auth_audit_log: {
        Row: {
          created_at: string
          email: string
          event: string
          id: string
          ip: string | null
        }
        Insert: {
          created_at?: string
          email: string
          event: string
          id?: string
          ip?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          event?: string
          id?: string
          ip?: string | null
        }
        Relationships: []
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
          commission_percent: number
          cut_duration_minutes: number
          id: string
          joined_at: string
          name: string
          role: string
          specialty: string
          user_id: string | null
        }
        Insert: {
          active?: boolean
          avatar?: string | null
          barbershop_id: string
          bio?: string
          commission_percent?: number
          cut_duration_minutes?: number
          id?: string
          joined_at?: string
          name: string
          role?: string
          specialty?: string
          user_id?: string | null
        }
        Update: {
          active?: boolean
          avatar?: string | null
          barbershop_id?: string
          bio?: string
          commission_percent?: number
          cut_duration_minutes?: number
          id?: string
          joined_at?: string
          name?: string
          role?: string
          specialty?: string
          user_id?: string | null
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
          close_time: string
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
          open_time: string
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
          close_time?: string
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
          open_time?: string
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
          close_time?: string
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
          open_time?: string
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
      frete_log_registros: {
        Row: {
          caminhao_desc: string | null
          caminhao_placa: string | null
          container1: string | null
          container2: string | null
          created_at: string | null
          data: string | null
          destino: string | null
          id: string
          janela_fim: string | null
          janela_ini: string | null
          motorista: string | null
          observacoes: string | null
          origem: string | null
          terminal: string | null
          terminal_ativo: boolean | null
          tipo_calculo: string | null
          tipo_trabalho: string | null
          titulo: string
          updated_at: string | null
          user_id: string
          valor_bruto: number | null
        }
        Insert: {
          caminhao_desc?: string | null
          caminhao_placa?: string | null
          container1?: string | null
          container2?: string | null
          created_at?: string | null
          data?: string | null
          destino?: string | null
          id?: string
          janela_fim?: string | null
          janela_ini?: string | null
          motorista?: string | null
          observacoes?: string | null
          origem?: string | null
          terminal?: string | null
          terminal_ativo?: boolean | null
          tipo_calculo?: string | null
          tipo_trabalho?: string | null
          titulo?: string
          updated_at?: string | null
          user_id: string
          valor_bruto?: number | null
        }
        Update: {
          caminhao_desc?: string | null
          caminhao_placa?: string | null
          container1?: string | null
          container2?: string | null
          created_at?: string | null
          data?: string | null
          destino?: string | null
          id?: string
          janela_fim?: string | null
          janela_ini?: string | null
          motorista?: string | null
          observacoes?: string | null
          origem?: string | null
          terminal?: string | null
          terminal_ativo?: boolean | null
          tipo_calculo?: string | null
          tipo_trabalho?: string | null
          titulo?: string
          updated_at?: string | null
          user_id?: string
          valor_bruto?: number | null
        }
        Relationships: []
      }
      frete_log_terminais: {
        Row: {
          created_at: string | null
          id: string
          nome: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          nome: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          nome?: string
          user_id?: string
        }
        Relationships: []
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
      processed_stripe_events: {
        Row: {
          event_id: string
          processed_at: string
          type: string | null
        }
        Insert: {
          event_id: string
          processed_at?: string
          type?: string | null
        }
        Update: {
          event_id?: string
          processed_at?: string
          type?: string | null
        }
        Relationships: []
      }
      saas_accounts: {
        Row: {
          barbershop_id: string | null
          barbershop_name: string
          barbershop_slug: string
          cancel_at: string | null
          created_at: string
          id: string
          last_login_at: string | null
          owner_name: string
          plan: string | null
          plan_started_at: string | null
          plan_status: string | null
          seen_announcements: string[]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_ends_at: string | null
          trial_reminder_sent_at: string | null
          user_id: string
        }
        Insert: {
          barbershop_id?: string | null
          barbershop_name: string
          barbershop_slug: string
          cancel_at?: string | null
          created_at?: string
          id?: string
          last_login_at?: string | null
          owner_name: string
          plan?: string | null
          plan_started_at?: string | null
          plan_status?: string | null
          seen_announcements?: string[]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          trial_reminder_sent_at?: string | null
          user_id: string
        }
        Update: {
          barbershop_id?: string | null
          barbershop_name?: string
          barbershop_slug?: string
          cancel_at?: string | null
          created_at?: string
          id?: string
          last_login_at?: string | null
          owner_name?: string
          plan?: string | null
          plan_started_at?: string | null
          plan_status?: string | null
          seen_announcements?: string[]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          trial_reminder_sent_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saas_accounts_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
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
      ai_gate: { Args: { p_fn: string; p_limit: number }; Returns: string }
      appointment_time_range: {
        Args: { p_date: string; p_dur: number; p_time: string }
        Returns: unknown
      }
      assert_barbershop_owner: {
        Args: { p_barbershop_id: string }
        Returns: undefined
      }
      create_saas_account: {
        Args: {
          p_barb_name: string
          p_barb_slug: string
          p_embed_key: string
          p_owner_name: string
          p_user_id: string
        }
        Returns: {
          barbershop_id: string | null
          barbershop_name: string
          barbershop_slug: string
          cancel_at: string | null
          created_at: string
          id: string
          last_login_at: string | null
          owner_name: string
          plan: string | null
          plan_started_at: string | null
          plan_status: string | null
          seen_announcements: string[]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_ends_at: string | null
          trial_reminder_sent_at: string | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "saas_accounts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      mark_announcement_seen: { Args: { p_key: string }; Returns: undefined }
      my_barbershop_ids: { Args: never; Returns: string[] }
      public_barber_busy_slots: {
        Args: { p_barber_id: string; p_barbershop_id: string; p_date: string }
        Returns: {
          slot_duration: number
          slot_time: string
        }[]
      }
      public_barbershop_reviews: {
        Args: { p_barbershop_id: string }
        Returns: {
          client_label: string
          rating: number
          review: string
          review_date: string
        }[]
      }
      search_appointments_by_contact: {
        Args: { p_email?: string; p_phone?: string }
        Returns: {
          appointment_date: string
          appointment_time: string
          barber_name: string
          id: string
          payment_status: string
          rating: number
          review: string
          service_name: string
          status: string
        }[]
      }
      submit_public_appointment_review: {
        Args: {
          p_appointment_id: string
          p_email?: string
          p_phone?: string
          p_rating: number
          p_review?: string
        }
        Returns: {
          id: string
          rating: number
          review: string
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
    Enums: {},
  },
} as const
