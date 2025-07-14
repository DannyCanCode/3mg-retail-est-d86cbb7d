export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      estimate_drafts: {
        Row: {
          created_at: string
          estimate_data: Json
          id: string
          updated_at: string
          user_id: string | null
          version: number
        }
        Insert: {
          created_at?: string
          estimate_data: Json
          id: string
          updated_at?: string
          user_id?: string | null
          version?: number
        }
        Update: {
          created_at?: string
          estimate_data?: Json
          id?: string
          updated_at?: string
          user_id?: string | null
          version?: number
        }
        Relationships: []
      }
      estimates: {
        Row: {
          approved_by: string | null
          calculated_labor_cost: number | null
          calculated_material_cost: number | null
          calculated_profit_amount: number | null
          calculated_subtotal: number | null
          created_at: string | null
          created_by: string | null
          creator_name: string | null
          creator_role: string | null
          customer_address: string
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          deleted_at: string | null
          deleted_by: string | null
          estimate_type: string | null
          id: string
          insurance_company: string | null
          is_sold: boolean | null
          job_type: string | null
          labor_rates: Json
          materials: Json
          measurement_id: string | null
          measurements: Json
          notes: string | null
          org_id: string | null
          owner_id: string | null
          package_type: string | null
          pdf_generated: boolean | null
          peel_stick_addon_cost: number | null
          profit_margin: number
          quantities: Json
          rejected_by: string | null
          rejection_reason: string | null
          selected_subtrades: Json | null
          sold_at: string | null
          status: string
          subtrade_notes: string | null
          subtrade_pricing: Json | null
          subtrade_requirements: Json | null
          subtrade_status: string | null
          territory_id: string | null
          total_price: number
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          approved_by?: string | null
          calculated_labor_cost?: number | null
          calculated_material_cost?: number | null
          calculated_profit_amount?: number | null
          calculated_subtotal?: number | null
          created_at?: string | null
          created_by?: string | null
          creator_name?: string | null
          creator_role?: string | null
          customer_address: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          estimate_type?: string | null
          id?: string
          insurance_company?: string | null
          is_sold?: boolean | null
          job_type?: string | null
          labor_rates: Json
          materials: Json
          measurement_id?: string | null
          measurements: Json
          notes?: string | null
          org_id?: string | null
          owner_id?: string | null
          package_type?: string | null
          pdf_generated?: boolean | null
          peel_stick_addon_cost?: number | null
          profit_margin: number
          quantities: Json
          rejected_by?: string | null
          rejection_reason?: string | null
          selected_subtrades?: Json | null
          sold_at?: string | null
          status?: string
          subtrade_notes?: string | null
          subtrade_pricing?: Json | null
          subtrade_requirements?: Json | null
          subtrade_status?: string | null
          territory_id?: string | null
          total_price: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          approved_by?: string | null
          calculated_labor_cost?: number | null
          calculated_material_cost?: number | null
          calculated_profit_amount?: number | null
          calculated_subtotal?: number | null
          created_at?: string | null
          created_by?: string | null
          creator_name?: string | null
          creator_role?: string | null
          customer_address?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          estimate_type?: string | null
          id?: string
          insurance_company?: string | null
          is_sold?: boolean | null
          job_type?: string | null
          labor_rates?: Json
          materials?: Json
          measurement_id?: string | null
          measurements?: Json
          notes?: string | null
          org_id?: string | null
          owner_id?: string | null
          package_type?: string | null
          pdf_generated?: boolean | null
          peel_stick_addon_cost?: number | null
          profit_margin?: number
          quantities?: Json
          rejected_by?: string | null
          rejection_reason?: string | null
          selected_subtrades?: Json | null
          sold_at?: string | null
          status?: string
          subtrade_notes?: string | null
          subtrade_pricing?: Json | null
          subtrade_requirements?: Json | null
          subtrade_status?: string | null
          territory_id?: string | null
          total_price?: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "estimates_territory_fk"
            columns: ["territory_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
        ]
      }
      material_waste_percentage: {
        Row: {
          created_at: string | null
          id: number
          material_id: string
          updated_at: string | null
          waste_percentage: number
        }
        Insert: {
          created_at?: string | null
          id?: number
          material_id: string
          updated_at?: string | null
          waste_percentage: number
        }
        Update: {
          created_at?: string | null
          id?: number
          material_id?: string
          updated_at?: string | null
          waste_percentage?: number
        }
        Relationships: []
      }
      measurements: {
        Row: {
          areas_per_pitch: Json | null
          created_at: string | null
          created_by: string | null
          debug_info: Json | null
          deleted_at: string | null
          deleted_by: string | null
          eaves: number | null
          filename: string
          flashing: number | null
          hips: number | null
          id: string
          length_measurements: Json | null
          org_id: string | null
          penetrations: number | null
          penetrations_area: number | null
          penetrations_perimeter: number | null
          predominant_pitch: string
          property_address: string | null
          rakes: number | null
          raw_text: string | null
          ridges: number | null
          step_flashing: number | null
          suggested_waste_percentage: number | null
          territory_id: string | null
          total_area: number
          total_squares: number | null
          updated_at: string | null
          updated_by: string | null
          valleys: number | null
          waste_percentage: number | null
        }
        Insert: {
          areas_per_pitch?: Json | null
          created_at?: string | null
          created_by?: string | null
          debug_info?: Json | null
          deleted_at?: string | null
          deleted_by?: string | null
          eaves?: number | null
          filename: string
          flashing?: number | null
          hips?: number | null
          id?: string
          length_measurements?: Json | null
          org_id?: string | null
          penetrations?: number | null
          penetrations_area?: number | null
          penetrations_perimeter?: number | null
          predominant_pitch: string
          property_address?: string | null
          rakes?: number | null
          raw_text?: string | null
          ridges?: number | null
          step_flashing?: number | null
          suggested_waste_percentage?: number | null
          territory_id?: string | null
          total_area: number
          total_squares?: number | null
          updated_at?: string | null
          updated_by?: string | null
          valleys?: number | null
          waste_percentage?: number | null
        }
        Update: {
          areas_per_pitch?: Json | null
          created_at?: string | null
          created_by?: string | null
          debug_info?: Json | null
          deleted_at?: string | null
          deleted_by?: string | null
          eaves?: number | null
          filename?: string
          flashing?: number | null
          hips?: number | null
          id?: string
          length_measurements?: Json | null
          org_id?: string | null
          penetrations?: number | null
          penetrations_area?: number | null
          penetrations_perimeter?: number | null
          predominant_pitch?: string
          property_address?: string | null
          rakes?: number | null
          raw_text?: string | null
          ridges?: number | null
          step_flashing?: number | null
          suggested_waste_percentage?: number | null
          territory_id?: string | null
          total_area?: number
          total_squares?: number | null
          updated_at?: string | null
          updated_by?: string | null
          valleys?: number | null
          waste_percentage?: number | null
        }
        Relationships: []
      }
      package_materials: {
        Row: {
          is_required: boolean | null
          material_id: string
          package_id: number
        }
        Insert: {
          is_required?: boolean | null
          material_id: string
          package_id: number
        }
        Update: {
          is_required?: boolean | null
          material_id?: string
          package_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "package_materials_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      packages: {
        Row: {
          description: string | null
          id: number
          is_active: boolean | null
          name: string
        }
        Insert: {
          description?: string | null
          id?: number
          is_active?: boolean | null
          name: string
        }
        Update: {
          description?: string | null
          id?: number
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      pricing_lists: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_default: boolean | null
          labor: Json
          materials: Json
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          labor: Json
          materials: Json
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          labor?: Json
          materials?: Json
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      pricing_templates: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_default: boolean | null
          labor_rates: Json
          material_categories: Json | null
          materials: Json
          name: string
          profit_margin: number
          quantities: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          labor_rates: Json
          material_categories?: Json | null
          materials: Json
          name: string
          profit_margin?: number
          quantities: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          labor_rates?: Json
          material_categories?: Json | null
          materials?: Json
          name?: string
          profit_margin?: number
          quantities?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          completed: boolean | null
          completed_onboarding: boolean | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          is_admin: boolean | null
          job_title: string | null
          org_id: string | null
          phone_number: string | null
          role: string | null
          territory_id: string | null
        }
        Insert: {
          completed?: boolean | null
          completed_onboarding?: boolean | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          is_admin?: boolean | null
          job_title?: string | null
          org_id?: string | null
          phone_number?: string | null
          role?: string | null
          territory_id?: string | null
        }
        Update: {
          completed?: boolean | null
          completed_onboarding?: boolean | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_admin?: boolean | null
          job_title?: string | null
          org_id?: string | null
          phone_number?: string | null
          role?: string | null
          territory_id?: string | null
        }
        Relationships: []
      }
      territories: {
        Row: {
          address: string | null
          created_at: string | null
          id: string
          name: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          id?: string
          name: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_analytics: {
        Row: {
          created_at: string | null
          event_name: string | null
          id: string
          properties: Json | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_name?: string | null
          id?: string
          properties?: Json | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_name?: string | null
          id?: string
          properties?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      warranties: {
        Row: {
          description: string | null
          id: number
          is_active: boolean | null
          name: string
          package_id: number | null
        }
        Insert: {
          description?: string | null
          id?: number
          is_active?: boolean | null
          name: string
          package_id?: number | null
        }
        Update: {
          description?: string | null
          id?: number
          is_active?: boolean | null
          name?: string
          package_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "warranties_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      warranty_requirements: {
        Row: {
          material_id: string
          warranty_id: number
        }
        Insert: {
          material_id: string
          warranty_id: number
        }
        Update: {
          material_id?: string
          warranty_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "warranty_requirements_warranty_id_fkey"
            columns: ["warranty_id"]
            isOneToOne: false
            referencedRelation: "warranties"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_list_users: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          email: string
          role: string
          territory_id: string
          last_sign_in_at: string
        }[]
      }
      current_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      current_user_is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      current_user_is_admin_direct: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      save_estimate_with_version: {
        Args: { p_id: string; p_data: Json; p_expected_version: number }
        Returns: {
          success: boolean
          new_version: number
          conflict_data: Json
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
