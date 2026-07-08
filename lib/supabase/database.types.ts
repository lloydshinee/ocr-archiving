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
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json
          id: string
          resource_id: string | null
          resource_type: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json
          id?: string
          resource_id?: string | null
          resource_type: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json
          id?: string
          resource_id?: string | null
          resource_type?: string
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          content: string
          created_at: string
          document_id: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          document_id: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          document_id?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      document_tags: {
        Row: {
          document_id: string
          tag_id: string
        }
        Insert: {
          document_id: string
          tag_id: string
        }
        Update: {
          document_id?: string
          tag_id?: string
        }
        Relationships: []
      }
      document_types: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      document_versions: {
        Row: {
          created_at: string
          created_by: string
          document_id: string
          file_path: string
          file_size: number
          file_type: string
          id: string
          ocr_status: string
          ocr_text: string | null
          search_vector: unknown
          version_number: number
        }
        Insert: {
          created_at?: string
          created_by: string
          document_id: string
          file_path: string
          file_size: number
          file_type: string
          id?: string
          ocr_status?: string
          ocr_text?: string | null
          search_vector?: unknown
          version_number: number
        }
        Update: {
          created_at?: string
          created_by?: string
          document_id?: string
          file_path?: string
          file_size?: number
          file_type?: string
          id?: string
          ocr_status?: string
          ocr_text?: string | null
          search_vector?: unknown
          version_number?: number
        }
        Relationships: []
      }
      documents: {
        Row: {
          archived_at: string | null
          archived_by: string | null
          category_id: string | null
          created_at: string
          current_version_id: string | null
          db_previously_archived: boolean | null
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          document_type_id: string | null
          file_name: string
          file_size: number
          file_type: string
          folder_id: string
          id: string
          is_archived: boolean
          owner_id: string
          title: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          archived_by?: string | null
          category_id?: string | null
          created_at?: string
          current_version_id?: string | null
          db_previously_archived?: boolean | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          document_type_id?: string | null
          file_name: string
          file_size: number
          file_type: string
          folder_id: string
          id?: string
          is_archived?: boolean
          owner_id: string
          title: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          archived_by?: string | null
          category_id?: string | null
          created_at?: string
          current_version_id?: string | null
          db_previously_archived?: boolean | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          document_type_id?: string | null
          file_name?: string
          file_size?: number
          file_type?: string
          folder_id?: string
          id?: string
          is_archived?: boolean
          owner_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      folders: {
        Row: {
          archived_at: string | null
          archived_by: string | null
          category_id: string | null
          created_at: string
          created_by: string | null
          db_previously_archived: boolean | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          inherit_permissions: boolean
          is_archived: boolean
          is_locked: boolean
          locked_at: string | null
          locked_by: string | null
          name: string
          owner_id: string
          parent_id: string | null
          program_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          archived_at?: string | null
          archived_by?: string | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          db_previously_archived?: boolean | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          inherit_permissions?: boolean
          is_archived?: boolean
          is_locked?: boolean
          locked_at?: string | null
          locked_by?: string | null
          name: string
          owner_id: string
          parent_id?: string | null
          program_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          archived_at?: string | null
          archived_by?: string | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          db_previously_archived?: boolean | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          inherit_permissions?: boolean
          is_archived?: boolean
          is_locked?: boolean
          locked_at?: string | null
          locked_by?: string | null
          name?: string
          owner_id?: string
          parent_id?: string | null
          program_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          is_read: boolean
          resource_id: string | null
          resource_type: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          resource_id?: string | null
          resource_type?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          resource_id?: string | null
          resource_type?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      permissions: {
        Row: {
          actions: string[]
          assigned_by: string
          created_at: string
          document_id: string | null
          folder_id: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          actions: string[]
          assigned_by: string
          created_at?: string
          document_id?: string | null
          folder_id?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          actions?: string[]
          assigned_by?: string
          created_at?: string
          document_id?: string | null
          folder_id?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      programs: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string
          created_by: string | null
          deactivated_at: string | null
          email: string
          full_name: string
          id: string
          is_deactivated: boolean
          program_id: string | null
          role: "dean" | "program_head" | "faculty" | "student_assistant"
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deactivated_at?: string | null
          email: string
          full_name: string
          id: string
          is_deactivated?: boolean
          program_id?: string | null
          role: "dean" | "program_head" | "faculty" | "student_assistant"
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deactivated_at?: string | null
          email?: string
          full_name?: string
          id?: string
          is_deactivated?: boolean
          program_id?: string | null
          role?: "dean" | "program_head" | "faculty" | "student_assistant"
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      get_program_folder_subtree: {
        Args: { p_program_id: string }
        Returns: Database["public"]["Tables"]["folders"]["Row"][]
      }
    }
    Enums: {
      user_role: "dean" | "program_head" | "faculty" | "student_assistant"
    }
    CompositeTypes: Record<string, never>
  }
}
