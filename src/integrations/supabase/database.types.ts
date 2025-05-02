export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      estimate_items: {
        Row: {
          created_at: string | null
          description: string | null
          estimate_id: string | null
          id: string
          pricing_id: string | null
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          estimate_id?: string | null
          id?: string
          pricing_id?: string | null
          quantity: number
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string | null
          description?: string | null
          estimate_id?: string | null
          id?: string
          pricing_id?: string | null
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: []
      }
      estimates: {
        Row: {
          calculated_labor_cost: number | null
          calculated_material_cost: number | null
          calculated_profit_amount: number | null
          calculated_subtotal: number | null
          created_at: string | null
          customer_address: string
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          id: string
          insurance_company: string | null
          is_sold: boolean
          job_type: string | null
          labor_rates: Json
          materials: Json
          measurement_id: string | null
          measurements: Json
          notes: string | null
          pdf_generated: boolean | null
          profit_margin: number
          quantities: Json
          sold_at: string | null
          status: string
          total_price: number
          updated_at: string | null
        }
        Insert: {
          calculated_labor_cost?: number | null
          calculated_material_cost?: number | null
          calculated_profit_amount?: number | null
          calculated_subtotal?: number | null
          created_at?: string | null
          customer_address: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          insurance_company?: string | null
          is_sold?: boolean
          job_type?: string | null
          labor_rates: Json
          materials: Json
          measurement_id?: string | null
          measurements: Json
          notes?: string | null
          pdf_generated?: boolean | null
          profit_margin: number
          quantities: Json
          sold_at?: string | null
          status: string
          total_price: number
          updated_at?: string | null
        }
        Update: {
          calculated_labor_cost?: number | null
          calculated_material_cost?: number | null
          calculated_profit_amount?: number | null
          calculated_subtotal?: number | null
          created_at?: string | null
          customer_address?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          insurance_company?: string | null
          is_sold?: boolean
          job_type?: string | null
          labor_rates?: Json
          materials?: Json
          measurement_id?: string | null
          measurements?: Json
          notes?: string | null
          pdf_generated?: boolean | null
          profit_margin?: number
          quantities?: Json
          sold_at?: string | null
          status?: string
          total_price?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      measurements: {
        Row: {
          areas_per_pitch: Json | null
          created_at: string | null
          debug_info: Json | null
          eaves: number | null
          filename: string
          flashing: number | null
          hips: number | null
          id: string
          length_measurements: Json | null
          penetrations: number | null
          penetrations_perimeter: number | null
          predominant_pitch: string
          property_address: string | null
          rakes: number | null
          raw_text: string | null
          ridges: number | null
          step_flashing: number | null
          suggested_waste_percentage: number | null
          total_area: number
          total_squares: number | null
          updated_at: string | null
          valleys: number | null
          waste_percentage: number | null
        }
        Insert: {
          areas_per_pitch?: Json | null
          created_at?: string | null
          debug_info?: Json | null
          eaves?: number | null
          filename: string
          flashing?: number | null
          hips?: number | null
          id?: string
          length_measurements?: Json | null
          penetrations?: number | null
          penetrations_perimeter?: number | null
          predominant_pitch: string
          property_address?: string | null
          rakes?: number | null
          raw_text?: string | null
          ridges?: number | null
          step_flashing?: number | null
          suggested_waste_percentage?: number | null
          total_area: number
          total_squares?: number | null
          updated_at?: string | null
          valleys?: number | null
          waste_percentage?: number | null
        }
        Update: {
          areas_per_pitch?: Json | null
          created_at?: string | null
          debug_info?: Json | null
          eaves?: number | null
          filename?: string
          flashing?: number | null
          hips?: number | null
          id?: string
          length_measurements?: Json | null
          penetrations?: number | null
          penetrations_perimeter?: number | null
          predominant_pitch?: string
          property_address?: string | null
          rakes?: number | null
          raw_text?: string | null
          ridges?: number | null
          step_flashing?: number | null
          suggested_waste_percentage?: number | null
          total_area?: number
          total_squares?: number | null
          updated_at?: string | null
          valleys?: number | null
          waste_percentage?: number | null
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
          materials?: Json
          name?: string
          profit_margin?: number
          quantities?: Json
          updated_at?: string | null
        }
        Relationships: []
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
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
