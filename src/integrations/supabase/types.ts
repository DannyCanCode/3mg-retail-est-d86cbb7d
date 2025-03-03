export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
        Relationships: [
          {
            foreignKeyName: "estimate_items_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimate_items_pricing_id_fkey"
            columns: ["pricing_id"]
            isOneToOne: false
            referencedRelation: "pricing"
            referencedColumns: ["id"]
          },
        ]
      }
      estimates: {
        Row: {
          created_at: string | null
          customer_address: string | null
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          id: string
          measurement_id: string | null
          notes: string | null
          status: string | null
          total_price: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          customer_address?: string | null
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          id?: string
          measurement_id?: string | null
          notes?: string | null
          status?: string | null
          total_price?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          customer_address?: string | null
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          id?: string
          measurement_id?: string | null
          notes?: string | null
          status?: string | null
          total_price?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "estimates_measurement_id_fkey"
            columns: ["measurement_id"]
            isOneToOne: false
            referencedRelation: "measurements"
            referencedColumns: ["id"]
          },
        ]
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
      pricing: {
        Row: {
          base_price: number
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          item_name: string
          markup_percentage: number | null
          unit: string
          updated_at: string | null
        }
        Insert: {
          base_price: number
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          item_name: string
          markup_percentage?: number | null
          unit: string
          updated_at?: string | null
        }
        Update: {
          base_price?: number
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          item_name?: string
          markup_percentage?: number | null
          unit?: string
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

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
