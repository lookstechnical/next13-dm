export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      clubs: {
        Row: {
          id: string;
          name: string;
          type: "professional" | "amateur" | "school" | "youth" | "other";
          location: string | null;
          founded: string | null;
          website: string | null;
          status: "active" | "inactive";
          created_at: string;
          created_by: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          type?: "professional" | "amateur" | "school" | "youth" | "other";
          location?: string | null;
          founded?: string | null;
          website?: string | null;
          status?: "active" | "inactive";
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          type?: "professional" | "amateur" | "school" | "youth" | "other";
          location?: string | null;
          founded?: string | null;
          website?: string | null;
          status?: "active" | "inactive";
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
        };
      };
      events: {
        Row: {
          id: string;
          team_id: string;
          name: string;
          description: string;
          date: string;
          end_date: string | null;
          location: string;
          age_group: string;
          max_participants: number | null;
          registration_deadline: string;
          cost: number | null;
          requirements: string | null;
          scout_id: string;
          status: "upcoming" | "ongoing" | "completed" | "cancelled";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          team_id: string;
          name: string;
          description: string;
          date: string;
          end_date?: string | null;
          location: string;
          age_group: string;
          max_participants?: number | null;
          registration_deadline: string;
          cost?: number | null;
          requirements?: string | null;
          scout_id: string;
          status?: "upcoming" | "ongoing" | "completed" | "cancelled";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          team_id?: string;
          name?: string;
          description?: string;
          date?: string;
          end_date?: string | null;
          location?: string;
          age_group?: string;
          max_participants?: number | null;
          registration_deadline?: string;
          cost?: number | null;
          requirements?: string | null;
          scout_id?: string;
          status?: "upcoming" | "ongoing" | "completed" | "cancelled";
          created_at?: string;
          updated_at?: string;
        };
      };
      event_registrations: {
        Row: {
          id: string;
          event_id: string;
          player_id: string;
          status: "registered" | "confirmed" | "attended" | "no_show";
          email: string | null;
          notes: string | null;
          registered_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          player_id: string;
          status?: "registered" | "confirmed" | "attended" | "no_show";
          email?: string | null;
          notes?: string | null;
          registered_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          player_id?: string;
          status?: "registered" | "confirmed" | "attended" | "no_show";
          email?: string | null;
          notes?: string | null;
          registered_at?: string;
          updated_at?: string;
        };
      };
      invitations: {
        Row: {
          id: string;
          email: string;
          role: "ADMIN" | "HEAD_OF_DEPARTMENT" | "SCOUT" | "COACH";
          team_id: string | null;
          token: string;
          invited_by: string;
          invited_at: string;
          expires_at: string;
          status: "pending" | "accepted" | "expired";
        };
        Insert: {
          id?: string;
          email: string;
          role: "ADMIN" | "HEAD_OF_DEPARTMENT" | "SCOUT" | "COACH";
          team_id?: string | null;
          token: string;
          invited_by: string;
          invited_at?: string;
          expires_at: string;
          status?: "pending" | "accepted" | "expired";
        };
        Update: {
          id?: string;
          email?: string;
          role?: "ADMIN" | "HEAD_OF_DEPARTMENT" | "SCOUT" | "COACH";
          team_id?: string | null;
          token?: string;
          invited_by?: string;
          invited_at?: string;
          expires_at?: string;
          status?: "pending" | "accepted" | "expired";
        };
      };
      matches: {
        Row: {
          id: string;
          team_id: string;
          date: string;
          home_team: string;
          away_team: string;
          venue: string | null;
          competition: string | null;
          age_group: string;
          notes: string | null;
          scout_id: string;
          assigned_scout_id: string | null;
          status: "pending" | "in_progress" | "completed";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          team_id: string;
          date: string;
          home_team: string;
          away_team: string;
          venue?: string | null;
          competition?: string | null;
          age_group: string;
          notes?: string | null;
          scout_id: string;
          assigned_scout_id?: string | null;
          status?: "pending" | "in_progress" | "completed";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          team_id?: string;
          date?: string;
          home_team?: string;
          away_team?: string;
          venue?: string | null;
          competition?: string | null;
          age_group?: string;
          notes?: string | null;
          scout_id?: string;
          assigned_scout_id?: string | null;
          status?: "pending" | "in_progress" | "completed";
          created_at?: string;
          updated_at?: string;
        };
      };
      players: {
        Row: {
          id: string;
          team_id: string;
          name: string;
          position: string;
          secondary_position: string | null;
          date_of_birth: string | null;
          nationality: string | null;
          club: string | null;
          school: string | null;
          height: string | null;
          foot: string | null;
          photo_url: string | null;
          email: string | null;
          scout_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          team_id: string;
          name: string;
          position: string;
          secondary_position?: string | null;
          date_of_birth?: string | null;
          nationality?: string | null;
          club?: string | null;
          school?: string | null;
          height?: string | null;
          foot?: string | null;
          photo_url?: string | null;
          email?: string | null;
          scout_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          team_id?: string;
          name?: string;
          position?: string;
          secondary_position?: string | null;
          date_of_birth?: string | null;
          nationality?: string | null;
          club?: string | null;
          school?: string | null;
          height?: string | null;
          foot?: string | null;
          photo_url?: string | null;
          email?: string | null;
          scout_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      player_groups: {
        Row: {
          id: string;
          team_id: string;
          name: string;
          description: string | null;
          type: "selection" | "squad" | "program" | "other";
          status: "active" | "inactive";
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          team_id: string;
          name: string;
          description?: string | null;
          type?: "selection" | "squad" | "program" | "other";
          status?: "active" | "inactive";
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          team_id?: string;
          name?: string;
          description?: string | null;
          type?: "selection" | "squad" | "program" | "other";
          status?: "active" | "inactive";
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      player_group_members: {
        Row: {
          id: string;
          group_id: string;
          player_id: string;
          added_at: string;
          added_by: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          player_id: string;
          added_at?: string;
          added_by: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          player_id?: string;
          added_at?: string;
          added_by?: string;
        };
      };
      player_reports: {
        Row: {
          id: string;
          player_id: string;
          match_id: string | null;
          event_id: string | null;
          scout_id: string;
          position: string;
          suggested_position: string | null;
          minutes_from: number;
          minutes_to: number;
          rating_technique: number;
          rating_physical: number;
          rating_tactical: number;
          rating_mental: number;
          rating_potential: number;
          notes: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          player_id: string;
          match_id?: string | null;
          event_id?: string | null;
          scout_id: string;
          position: string;
          suggested_position?: string | null;
          minutes_from?: number;
          minutes_to?: number;
          rating_technique: number;
          rating_physical: number;
          rating_tactical: number;
          rating_mental: number;
          rating_potential: number;
          notes: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          player_id?: string;
          match_id?: string | null;
          event_id?: string | null;
          scout_id?: string;
          position?: string;
          suggested_position?: string | null;
          minutes_from?: number;
          minutes_to?: number;
          rating_technique?: number;
          rating_physical?: number;
          rating_tactical?: number;
          rating_mental?: number;
          rating_potential?: number;
          notes?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      teams: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          type: "mens" | "womens" | "youth" | "junior" | "academy" | "other";
          created_at: string;
          created_by: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          type?: "mens" | "womens" | "youth" | "junior" | "academy" | "other";
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          type?: "mens" | "womens" | "youth" | "junior" | "academy" | "other";
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
        };
      };
      team_memberships: {
        Row: {
          id: string;
          user_id: string;
          team_id: string;
          role: "ADMIN" | "HEAD_OF_DEPARTMENT" | "SCOUT" | "COACH";
          joined_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          team_id: string;
          role?: "ADMIN" | "HEAD_OF_DEPARTMENT" | "SCOUT" | "COACH";
          joined_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          team_id?: string;
          role?: "ADMIN" | "HEAD_OF_DEPARTMENT" | "SCOUT" | "COACH";
          joined_at?: string;
          created_at?: string;
        };
      };
      users: {
        Row: {
          id: string;
          name: string;
          email: string;
          role: "ADMIN" | "HEAD_OF_DEPARTMENT" | "SCOUT" | "COACH";
          avatar: string | null;
          status: "active" | "pending" | "inactive";
          invited_by: string | null;
          invited_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          email: string;
          role?: "ADMIN" | "HEAD_OF_DEPARTMENT" | "SCOUT" | "COACH";
          avatar?: string | null;
          status?: "active" | "pending" | "inactive";
          invited_by?: string | null;
          invited_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          role?: "ADMIN" | "HEAD_OF_DEPARTMENT" | "SCOUT" | "COACH";
          avatar?: string | null;
          status?: "active" | "pending" | "inactive";
          invited_by?: string | null;
          invited_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      validation_codes: {
        Row: {
          id: string;
          email: string;
          code: string;
          player_id: string;
          expires_at: string;
          used: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          code: string;
          player_id: string;
          expires_at: string;
          used?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          code?: string;
          player_id?: string;
          expires_at?: string;
          used?: boolean;
          created_at?: string;
        };
      };
      report_attributes: {
          id: string;
          name: string;
          description: string;
          active: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description: string;
          active?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string;
          active?: string;
          created_at?: string;
        };
      }
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      club_status: "active" | "inactive";
      club_type: "professional" | "amateur" | "school" | "youth" | "other";
      event_status: "upcoming" | "ongoing" | "completed" | "cancelled";
      group_status: "active" | "inactive";
      group_type: "selection" | "squad" | "program" | "other";
      invitation_status: "pending" | "accepted" | "expired";
      match_status: "pending" | "in_progress" | "completed";
      registration_status: "registered" | "confirmed" | "attended" | "no_show";
      team_type: "mens" | "womens" | "youth" | "junior" | "academy" | "other";
      user_role: "ADMIN" | "HEAD_OF_DEPARTMENT" | "SCOUT" | "COACH";
      user_status: "active" | "pending" | "inactive";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
