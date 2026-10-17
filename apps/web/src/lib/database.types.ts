
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "audit_log": {
                  Row: {
                    "action": string,"actor_auth_id": string | null,"actor_person": string | null,"at": string,"changes": NonNullable<Json>,"id": number,"org_id": string,"row_id": string,"table_name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor_auth_id"?: string | null,"actor_person"?: string | null,"at"?: string,"changes": NonNullable<Json>,"id"?: never,"org_id": string,"row_id": string,"table_name": string
                  }
                  Update: {
                    "action"?: string,"actor_auth_id"?: string | null,"actor_person"?: string | null,"at"?: string,"changes"?: NonNullable<Json>,"id"?: never,"org_id"?: string,"row_id"?: string,"table_name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"holidays": {
                  Row: {
                    "day": string,"label": string | null,"org_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "day": string,"label"?: string | null,"org_id": string
                  }
                  Update: {
                    "day"?: string,"label"?: string | null,"org_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "holidays_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "orgs"
      referencedColumns: ["id"]
    }
                  ]
                },"orgs": {
                  Row: {
                    "created_at": string,"id": string,"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"name": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"packages": {
                  Row: {
                    "code": Database["public"]['Enums']["package_code"],"created_at": string,"id": string,"issued_at": string | null,"org_id": string,"project_id": string,"target_issue": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "code": Database["public"]['Enums']["package_code"],"created_at"?: string,"id"?: string,"issued_at"?: string | null,"org_id": string,"project_id": string,"target_issue"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "code"?: Database["public"]['Enums']["package_code"],"created_at"?: string,"id"?: string,"issued_at"?: string | null,"org_id"?: string,"project_id"?: string,"target_issue"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "packages_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "orgs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "packages_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    }
                  ]
                },"people": {
                  Row: {
                    "active": boolean,"auth_user_id": string | null,"capacity": number,"created_at": string,"email": string,"id": string,"name": string,"org_id": string,"role": Database["public"]['Enums']["person_role"],"sort_order": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"auth_user_id"?: string | null,"capacity"?: number,"created_at"?: string,"email": string,"id"?: string,"name": string,"org_id": string,"role": Database["public"]['Enums']["person_role"],"sort_order"?: number,"updated_at"?: string
                  }
                  Update: {
                    "active"?: boolean,"auth_user_id"?: string | null,"capacity"?: number,"created_at"?: string,"email"?: string,"id"?: string,"name"?: string,"org_id"?: string,"role"?: Database["public"]['Enums']["person_role"],"sort_order"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "people_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "orgs"
      referencedColumns: ["id"]
    }
                  ]
                },"projects": {
                  Row: {
                    "client": string | null,"code": string | null,"created_at": string,"id": string,"lead_id": string | null,"name": string,"notes": string | null,"org_id": string,"priority": number | null,"project_type": string | null,"target_date": string | null,"tier": Database["public"]['Enums']["project_tier"],"tier_since": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "client"?: string | null,"code"?: string | null,"created_at"?: string,"id"?: string,"lead_id"?: string | null,"name": string,"notes"?: string | null,"org_id": string,"priority"?: number | null,"project_type"?: string | null,"target_date"?: string | null,"tier"?: Database["public"]['Enums']["project_tier"],"tier_since"?: string,"updated_at"?: string
                  }
                  Update: {
                    "client"?: string | null,"code"?: string | null,"created_at"?: string,"id"?: string,"lead_id"?: string | null,"name"?: string,"notes"?: string | null,"org_id"?: string,"priority"?: number | null,"project_type"?: string | null,"target_date"?: string | null,"tier"?: Database["public"]['Enums']["project_tier"],"tier_since"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "projects_lead_id_fkey"
      columns: ["lead_id"]
isOneToOne: false
      referencedRelation: "people"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "projects_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "orgs"
      referencedColumns: ["id"]
    }
                  ]
                },"settings": {
                  Row: {
                    "dev_limit": number,"dormant_days": number,"hours_per_day": number,"org_id": string,"per_lead_slots": number,"ready_limit": number,"slot_limit": number,"updated_at": string,"workdays": (number)[]
                  }
                  ComputedFields: never
                  Insert: {
                    "dev_limit"?: number,"dormant_days"?: number,"hours_per_day"?: number,"org_id": string,"per_lead_slots"?: number,"ready_limit"?: number,"slot_limit"?: number,"updated_at"?: string,"workdays"?: (number)[]
                  }
                  Update: {
                    "dev_limit"?: number,"dormant_days"?: number,"hours_per_day"?: number,"org_id"?: string,"per_lead_slots"?: number,"ready_limit"?: number,"slot_limit"?: number,"updated_at"?: string,"workdays"?: (number)[]
                  }
                  Relationships: [
                    {
      foreignKeyName: "settings_org_id_fkey"
      columns: ["org_id"]
isOneToOne: true
      referencedRelation: "orgs"
      referencedColumns: ["id"]
    }
                  ]
                },"task_schedule": {
                  Row: {
                    "computed_at": string,"end_date": string | null,"late_days": number,"org_id": string,"reason": string | null,"start_date": string | null,"task_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "computed_at"?: string,"end_date"?: string | null,"late_days"?: number,"org_id": string,"reason"?: string | null,"start_date"?: string | null,"task_id": string
                  }
                  Update: {
                    "computed_at"?: string,"end_date"?: string | null,"late_days"?: number,"org_id"?: string,"reason"?: string | null,"start_date"?: string | null,"task_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "task_schedule_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "orgs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "task_schedule_task_id_fkey"
      columns: ["task_id"]
isOneToOne: true
      referencedRelation: "tasks"
      referencedColumns: ["id"]
    }
                  ]
                },"tasks": {
                  Row: {
                    "assignee_id": string | null,"created_at": string,"created_by": string | null,"done_at": string | null,"due_date": string | null,"hours": number,"id": string,"org_id": string,"package_id": string,"project_id": string,"sort_order": number,"start_after": string | null,"status": Database["public"]['Enums']["task_status"],"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "assignee_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"done_at"?: string | null,"due_date"?: string | null,"hours"?: number,"id"?: string,"org_id": string,"package_id": string,"project_id": string,"sort_order"?: number,"start_after"?: string | null,"status"?: Database["public"]['Enums']["task_status"],"title": string,"updated_at"?: string
                  }
                  Update: {
                    "assignee_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"done_at"?: string | null,"due_date"?: string | null,"hours"?: number,"id"?: string,"org_id"?: string,"package_id"?: string,"project_id"?: string,"sort_order"?: number,"start_after"?: string | null,"status"?: Database["public"]['Enums']["task_status"],"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "tasks_assignee_id_fkey"
      columns: ["assignee_id"]
isOneToOne: false
      referencedRelation: "people"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tasks_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "people"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tasks_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "orgs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tasks_package_id_fkey"
      columns: ["package_id"]
isOneToOne: false
      referencedRelation: "packages"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tasks_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            [_ in never]: never
          }
          Enums: {
            "package_code": "P01"|"P02"|"P03"|"P04"|"P05"|"CS"|"SV"|"TD"|"ADD","person_role": "principal"|"director"|"lead"|"junior"|"technical","project_tier": "development"|"ready_to_release"|"response_awaited"|"dormant","task_status": "todo"|"in_progress"|"for_check"|"checked"|"issued"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "package_code": ["P01", "P02", "P03", "P04", "P05", "CS", "SV", "TD", "ADD"],"person_role": ["principal", "director", "lead", "junior", "technical"],"project_tier": ["development", "ready_to_release", "response_awaited", "dormant"],"task_status": ["todo", "in_progress", "for_check", "checked", "issued"]
          }
        }
} as const
