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
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
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
      audit_logs: {
        Row: {
          action: string
          actor_user_id: string | null
          id: string
          metadata: Json | null
          occurred_at: string
          subject_id: string
          subject_label: string
          subject_type: string
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          id?: string
          metadata?: Json | null
          occurred_at?: string
          subject_id: string
          subject_label: string
          subject_type: string
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          id?: string
          metadata?: Json | null
          occurred_at?: string
          subject_id?: string
          subject_label?: string
          subject_type?: string
        }
        Relationships: []
      }
      contribution_capacities: {
        Row: {
          description: string | null
          is_active: boolean
          key: string
          label: string
          sort_order: number
        }
        Insert: {
          description?: string | null
          is_active?: boolean
          key: string
          label: string
          sort_order?: number
        }
        Update: {
          description?: string | null
          is_active?: boolean
          key?: string
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
      contribution_events: {
        Row: {
          contribution_id: string
          created_at: string
          event_id: string
          id: string
        }
        Insert: {
          contribution_id: string
          created_at?: string
          event_id: string
          id?: string
        }
        Update: {
          contribution_id?: string
          created_at?: string
          event_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contribution_events_contribution_id_fkey"
            columns: ["contribution_id"]
            isOneToOne: false
            referencedRelation: "contributions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contribution_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      contribution_kinds: {
        Row: {
          description: string | null
          is_active: boolean
          key: string
          label: string
          sort_order: number
        }
        Insert: {
          description?: string | null
          is_active?: boolean
          key: string
          label: string
          sort_order?: number
        }
        Update: {
          description?: string | null
          is_active?: boolean
          key?: string
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
      contribution_narrative: {
        Row: {
          authored_by_user_id: string | null
          body: string
          contribution_id: string
          created_at: string
          id: string
          kind: string
          source_type: string
          updated_at: string
          verification_status: string
        }
        Insert: {
          authored_by_user_id?: string | null
          body: string
          contribution_id: string
          created_at?: string
          id?: string
          kind: string
          source_type: string
          updated_at?: string
          verification_status?: string
        }
        Update: {
          authored_by_user_id?: string | null
          body?: string
          contribution_id?: string
          created_at?: string
          id?: string
          kind?: string
          source_type?: string
          updated_at?: string
          verification_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "contribution_narrative_contribution_id_fkey"
            columns: ["contribution_id"]
            isOneToOne: false
            referencedRelation: "contributions"
            referencedColumns: ["id"]
          },
        ]
      }
      contributions: {
        Row: {
          contribution_kind: string
          created_at: string
          created_by_user_id: string | null
          date_is_uncertain: boolean
          date_is_unknown: boolean
          description: string | null
          end_date: string | null
          end_precision: string | null
          id: string
          is_demo: boolean
          is_approximate: boolean
          is_ongoing: boolean
          place: string | null
          source_type: string
          start_date: string | null
          start_precision: string | null
          title: string
          updated_at: string
          verification_status: string
        }
        Insert: {
          contribution_kind: string
          created_at?: string
          created_by_user_id?: string | null
          date_is_uncertain?: boolean
          date_is_unknown?: boolean
          description?: string | null
          end_date?: string | null
          end_precision?: string | null
          id?: string
          is_demo?: boolean
          is_approximate?: boolean
          is_ongoing?: boolean
          place?: string | null
          source_type: string
          start_date?: string | null
          start_precision?: string | null
          title: string
          updated_at?: string
          verification_status?: string
        }
        Update: {
          contribution_kind?: string
          created_at?: string
          created_by_user_id?: string | null
          date_is_uncertain?: boolean
          date_is_unknown?: boolean
          description?: string | null
          end_date?: string | null
          end_precision?: string | null
          id?: string
          is_demo?: boolean
          is_approximate?: boolean
          is_ongoing?: boolean
          place?: string | null
          source_type?: string
          start_date?: string | null
          start_precision?: string | null
          title?: string
          updated_at?: string
          verification_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "contributions_contribution_kind_fkey"
            columns: ["contribution_kind"]
            isOneToOne: false
            referencedRelation: "contribution_kinds"
            referencedColumns: ["key"]
          },
        ]
      }
      event_kinds: {
        Row: {
          description: string | null
          is_active: boolean
          key: string
          label: string
          sort_order: number
        }
        Insert: {
          description?: string | null
          is_active?: boolean
          key: string
          label: string
          sort_order?: number
        }
        Update: {
          description?: string | null
          is_active?: boolean
          key?: string
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
      events: {
        Row: {
          created_at: string
          created_by_user_id: string | null
          date_is_uncertain: boolean
          date_is_unknown: boolean
          end_date: string | null
          end_precision: string | null
          event_kind: string
          id: string
          is_demo: boolean
          is_approximate: boolean
          is_ongoing: boolean
          place: string | null
          source_type: string
          start_date: string | null
          start_precision: string | null
          summary: string | null
          title: string
          updated_at: string
          verification_status: string
        }
        Insert: {
          created_at?: string
          created_by_user_id?: string | null
          date_is_uncertain?: boolean
          date_is_unknown?: boolean
          end_date?: string | null
          end_precision?: string | null
          event_kind: string
          id?: string
          is_demo?: boolean
          is_approximate?: boolean
          is_ongoing?: boolean
          place?: string | null
          source_type: string
          start_date?: string | null
          start_precision?: string | null
          summary?: string | null
          title: string
          updated_at?: string
          verification_status?: string
        }
        Update: {
          created_at?: string
          created_by_user_id?: string | null
          date_is_uncertain?: boolean
          date_is_unknown?: boolean
          end_date?: string | null
          end_precision?: string | null
          event_kind?: string
          id?: string
          is_demo?: boolean
          is_approximate?: boolean
          is_ongoing?: boolean
          place?: string | null
          source_type?: string
          start_date?: string | null
          start_precision?: string | null
          summary?: string | null
          title?: string
          updated_at?: string
          verification_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_event_kind_fkey"
            columns: ["event_kind"]
            isOneToOne: false
            referencedRelation: "event_kinds"
            referencedColumns: ["key"]
          },
        ]
      }
      organization_contributions: {
        Row: {
          attribution_note: string | null
          capacity: string
          contribution_id: string
          created_at: string
          id: string
          organization_id: string
          sort_order: number
          source_type: string
          verification_status: string
        }
        Insert: {
          attribution_note?: string | null
          capacity: string
          contribution_id: string
          created_at?: string
          id?: string
          organization_id: string
          sort_order?: number
          source_type: string
          verification_status?: string
        }
        Update: {
          attribution_note?: string | null
          capacity?: string
          contribution_id?: string
          created_at?: string
          id?: string
          organization_id?: string
          sort_order?: number
          source_type?: string
          verification_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_contributions_capacity_fkey"
            columns: ["capacity"]
            isOneToOne: false
            referencedRelation: "contribution_capacities"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "organization_contributions_contribution_id_fkey"
            columns: ["contribution_id"]
            isOneToOne: false
            referencedRelation: "contributions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_contributions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_events: {
        Row: {
          created_at: string
          event_id: string
          id: string
          organization_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          organization_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_external_identifiers: {
        Row: {
          created_at: string
          id: string
          identifier_value: string
          organization_id: string
          scheme: string
          source_type: string
          url: string | null
          verification_status: string
        }
        Insert: {
          created_at?: string
          id?: string
          identifier_value: string
          organization_id: string
          scheme: string
          source_type: string
          url?: string | null
          verification_status?: string
        }
        Update: {
          created_at?: string
          id?: string
          identifier_value?: string
          organization_id?: string
          scheme?: string
          source_type?: string
          url?: string | null
          verification_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_external_identifiers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_names: {
        Row: {
          created_at: string
          end_date: string | null
          end_precision: string | null
          id: string
          language: string | null
          name: string
          name_type: string
          organization_id: string
          source_type: string
          start_date: string | null
          start_precision: string | null
          verification_status: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          end_precision?: string | null
          id?: string
          language?: string | null
          name: string
          name_type: string
          organization_id: string
          source_type: string
          start_date?: string | null
          start_precision?: string | null
          verification_status?: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          end_precision?: string | null
          id?: string
          language?: string | null
          name?: string
          name_type?: string
          organization_id?: string
          source_type?: string
          start_date?: string | null
          start_precision?: string | null
          verification_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_names_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_narrative: {
        Row: {
          authored_by_user_id: string | null
          body: string
          created_at: string
          id: string
          kind: string
          organization_id: string
          source_type: string
          updated_at: string
          verification_status: string
        }
        Insert: {
          authored_by_user_id?: string | null
          body: string
          created_at?: string
          id?: string
          kind: string
          organization_id: string
          source_type: string
          updated_at?: string
          verification_status?: string
        }
        Update: {
          authored_by_user_id?: string | null
          body?: string
          created_at?: string
          id?: string
          kind?: string
          organization_id?: string
          source_type?: string
          updated_at?: string
          verification_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_narrative_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_relationship_kinds: {
        Row: {
          description: string | null
          is_active: boolean
          is_directional: boolean
          key: string
          label: string
          sort_order: number
          source_role_label: string
          source_role_label_plural: string
          target_role_label: string
          target_role_label_plural: string
        }
        Insert: {
          description?: string | null
          is_active?: boolean
          is_directional: boolean
          key: string
          label: string
          sort_order?: number
          source_role_label: string
          source_role_label_plural: string
          target_role_label: string
          target_role_label_plural: string
        }
        Update: {
          description?: string | null
          is_active?: boolean
          is_directional?: boolean
          key?: string
          label?: string
          sort_order?: number
          source_role_label?: string
          source_role_label_plural?: string
          target_role_label?: string
          target_role_label_plural?: string
        }
        Relationships: []
      }
      organization_relationships: {
        Row: {
          created_at: string
          created_by_user_id: string | null
          date_is_uncertain: boolean
          date_is_unknown: boolean
          end_date: string | null
          end_precision: string | null
          id: string
          is_approximate: boolean
          is_directional: boolean
          is_ongoing: boolean
          kind: string
          note: string | null
          source_organization_id: string
          source_type: string
          start_date: string | null
          start_precision: string | null
          target_organization_id: string
          updated_at: string
          verification_status: string
        }
        Insert: {
          created_at?: string
          created_by_user_id?: string | null
          date_is_uncertain?: boolean
          date_is_unknown?: boolean
          end_date?: string | null
          end_precision?: string | null
          id?: string
          is_approximate?: boolean
          is_directional: boolean
          is_ongoing?: boolean
          kind: string
          note?: string | null
          source_organization_id: string
          source_type: string
          start_date?: string | null
          start_precision?: string | null
          target_organization_id: string
          updated_at?: string
          verification_status?: string
        }
        Update: {
          created_at?: string
          created_by_user_id?: string | null
          date_is_uncertain?: boolean
          date_is_unknown?: boolean
          end_date?: string | null
          end_precision?: string | null
          id?: string
          is_approximate?: boolean
          is_directional?: boolean
          is_ongoing?: boolean
          kind?: string
          note?: string | null
          source_organization_id?: string
          source_type?: string
          start_date?: string | null
          start_precision?: string | null
          target_organization_id?: string
          updated_at?: string
          verification_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_relationships_kind_fkey"
            columns: ["kind", "is_directional"]
            isOneToOne: false
            referencedRelation: "organization_relationship_kinds"
            referencedColumns: ["key", "is_directional"]
          },
          {
            foreignKeyName: "organization_relationships_source_organization_id_fkey"
            columns: ["source_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_relationships_target_organization_id_fkey"
            columns: ["target_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_types: {
        Row: {
          description: string | null
          is_active: boolean
          key: string
          label: string
          sort_order: number
        }
        Insert: {
          description?: string | null
          is_active?: boolean
          key: string
          label: string
          sort_order?: number
        }
        Update: {
          description?: string | null
          is_active?: boolean
          key?: string
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
      organizations: {
        Row: {
          closure_date: string | null
          closure_precision: string | null
          created_at: string
          founding_date: string | null
          founding_is_approximate: boolean
          founding_precision: string | null
          id: string
          is_demo: boolean
          location: string | null
          name: string
          outcomes_public: boolean
          outcomes_published_at: string | null
          outcomes_published_by_user_id: string | null
          organization_type: string | null
          short_name: string | null
          source_type: string
          status: string
          updated_at: string
          verification_status: string
          website: string | null
        }
        Insert: {
          closure_date?: string | null
          closure_precision?: string | null
          created_at?: string
          founding_date?: string | null
          founding_is_approximate?: boolean
          founding_precision?: string | null
          id?: string
          is_demo?: boolean
          location?: string | null
          name: string
          outcomes_public?: boolean
          outcomes_published_at?: string | null
          outcomes_published_by_user_id?: string | null
          organization_type?: string | null
          short_name?: string | null
          source_type?: string
          status?: string
          updated_at?: string
          verification_status?: string
          website?: string | null
        }
        Update: {
          closure_date?: string | null
          closure_precision?: string | null
          created_at?: string
          founding_date?: string | null
          founding_is_approximate?: boolean
          founding_precision?: string | null
          id?: string
          is_demo?: boolean
          location?: string | null
          name?: string
          outcomes_public?: boolean
          outcomes_published_at?: string | null
          outcomes_published_by_user_id?: string | null
          organization_type?: string | null
          short_name?: string | null
          source_type?: string
          status?: string
          updated_at?: string
          verification_status?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organizations_organization_type_fkey"
            columns: ["organization_type"]
            isOneToOne: false
            referencedRelation: "organization_types"
            referencedColumns: ["key"]
          },
        ]
      }
      participation_capacities: {
        Row: {
          description: string | null
          is_active: boolean
          key: string
          label: string
          sort_order: number
        }
        Insert: {
          description?: string | null
          is_active?: boolean
          key: string
          label: string
          sort_order?: number
        }
        Update: {
          description?: string | null
          is_active?: boolean
          key?: string
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
      participations: {
        Row: {
          capacity: string
          created_at: string
          created_by_user_id: string | null
          date_is_uncertain: boolean
          date_is_unknown: boolean
          end_date: string | null
          end_precision: string | null
          id: string
          is_approximate: boolean
          is_ongoing: boolean
          organization_id: string
          person_id: string
          source_type: string
          start_date: string | null
          start_precision: string | null
          summary: string | null
          updated_at: string
          verification_status: string
        }
        Insert: {
          capacity: string
          created_at?: string
          created_by_user_id?: string | null
          date_is_uncertain?: boolean
          date_is_unknown?: boolean
          end_date?: string | null
          end_precision?: string | null
          id?: string
          is_approximate?: boolean
          is_ongoing?: boolean
          organization_id: string
          person_id: string
          source_type: string
          start_date?: string | null
          start_precision?: string | null
          summary?: string | null
          updated_at?: string
          verification_status?: string
        }
        Update: {
          capacity?: string
          created_at?: string
          created_by_user_id?: string | null
          date_is_uncertain?: boolean
          date_is_unknown?: boolean
          end_date?: string | null
          end_precision?: string | null
          id?: string
          is_approximate?: boolean
          is_ongoing?: boolean
          organization_id?: string
          person_id?: string
          source_type?: string
          start_date?: string | null
          start_precision?: string | null
          summary?: string | null
          updated_at?: string
          verification_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "participations_capacity_fkey"
            columns: ["capacity"]
            isOneToOne: false
            referencedRelation: "participation_capacities"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "participations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participations_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      people: {
        Row: {
          biography: string | null
          created_at: string
          created_by_user_id: string | null
          date_of_birth: string | null
          date_of_death: string | null
          display_name: string
          family_name: string
          given_name: string
          id: string
          is_demo: boolean
          is_public: boolean
          is_deceased: boolean
          preferred_name: string | null
          published_at: string | null
          published_by_user_id: string | null
          source_type: string
          updated_at: string
          verification_status: string
        }
        Insert: {
          biography?: string | null
          created_at?: string
          created_by_user_id?: string | null
          date_of_birth?: string | null
          date_of_death?: string | null
          display_name: string
          family_name: string
          given_name: string
          id?: string
          is_demo?: boolean
          is_public?: boolean
          is_deceased?: boolean
          preferred_name?: string | null
          published_at?: string | null
          published_by_user_id?: string | null
          source_type: string
          updated_at?: string
          verification_status?: string
        }
        Update: {
          biography?: string | null
          created_at?: string
          created_by_user_id?: string | null
          date_of_birth?: string | null
          date_of_death?: string | null
          display_name?: string
          family_name?: string
          given_name?: string
          id?: string
          is_demo?: boolean
          is_public?: boolean
          is_deceased?: boolean
          preferred_name?: string | null
          published_at?: string | null
          published_by_user_id?: string | null
          source_type?: string
          updated_at?: string
          verification_status?: string
        }
        Relationships: []
      }
      person_contributions: {
        Row: {
          attribution_note: string | null
          capacity: string
          contribution_id: string
          created_at: string
          id: string
          person_id: string
          sort_order: number
          source_type: string
          verification_status: string
        }
        Insert: {
          attribution_note?: string | null
          capacity: string
          contribution_id: string
          created_at?: string
          id?: string
          person_id: string
          sort_order?: number
          source_type: string
          verification_status?: string
        }
        Update: {
          attribution_note?: string | null
          capacity?: string
          contribution_id?: string
          created_at?: string
          id?: string
          person_id?: string
          sort_order?: number
          source_type?: string
          verification_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "person_contributions_capacity_fkey"
            columns: ["capacity"]
            isOneToOne: false
            referencedRelation: "contribution_capacities"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "person_contributions_contribution_id_fkey"
            columns: ["contribution_id"]
            isOneToOne: false
            referencedRelation: "contributions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_contributions_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      person_events: {
        Row: {
          created_at: string
          event_id: string
          id: string
          person_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          person_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          person_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "person_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_events_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      person_narrative: {
        Row: {
          authored_by_user_id: string | null
          body: string
          created_at: string
          id: string
          person_id: string
          source_type: string
          updated_at: string
          verification_status: string
        }
        Insert: {
          authored_by_user_id?: string | null
          body: string
          created_at?: string
          id?: string
          person_id: string
          source_type: string
          updated_at?: string
          verification_status?: string
        }
        Update: {
          authored_by_user_id?: string | null
          body?: string
          created_at?: string
          id?: string
          person_id?: string
          source_type?: string
          updated_at?: string
          verification_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "person_narrative_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: true
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_claims: {
        Row: {
          claimant_user_id: string
          claimed_person_id: string
          created_at: string
          decided_at: string | null
          decision_notes: string | null
          id: string
          reviewer_admin_id: string | null
          status: string
          submitted_at: string
          supporting_evidence: string | null
          updated_at: string
        }
        Insert: {
          claimant_user_id: string
          claimed_person_id: string
          created_at?: string
          decided_at?: string | null
          decision_notes?: string | null
          id?: string
          reviewer_admin_id?: string | null
          status?: string
          submitted_at?: string
          supporting_evidence?: string | null
          updated_at?: string
        }
        Update: {
          claimant_user_id?: string
          claimed_person_id?: string
          created_at?: string
          decided_at?: string | null
          decision_notes?: string | null
          id?: string
          reviewer_admin_id?: string | null
          status?: string
          submitted_at?: string
          supporting_evidence?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_claims_claimed_person_id_fkey"
            columns: ["claimed_person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      relationship_kinds: {
        Row: {
          description: string | null
          is_active: boolean
          is_directional: boolean
          key: string
          label: string
          sort_order: number
          source_role_label: string
          source_role_label_plural: string
          target_role_label: string
          target_role_label_plural: string
        }
        Insert: {
          description?: string | null
          is_active?: boolean
          is_directional: boolean
          key: string
          label: string
          sort_order?: number
          source_role_label: string
          source_role_label_plural: string
          target_role_label: string
          target_role_label_plural: string
        }
        Update: {
          description?: string | null
          is_active?: boolean
          is_directional?: boolean
          key?: string
          label?: string
          sort_order?: number
          source_role_label?: string
          source_role_label_plural?: string
          target_role_label?: string
          target_role_label_plural?: string
        }
        Relationships: []
      }
      relationships: {
        Row: {
          created_at: string
          created_by_user_id: string | null
          date_is_uncertain: boolean
          date_is_unknown: boolean
          end_date: string | null
          end_precision: string | null
          id: string
          is_approximate: boolean
          is_directional: boolean
          is_ongoing: boolean
          kind: string
          narrative: string | null
          source_person_id: string
          source_type: string
          start_date: string | null
          start_precision: string | null
          target_person_id: string
          updated_at: string
          verification_status: string
        }
        Insert: {
          created_at?: string
          created_by_user_id?: string | null
          date_is_uncertain?: boolean
          date_is_unknown?: boolean
          end_date?: string | null
          end_precision?: string | null
          id?: string
          is_approximate?: boolean
          is_directional: boolean
          is_ongoing?: boolean
          kind: string
          narrative?: string | null
          source_person_id: string
          source_type: string
          start_date?: string | null
          start_precision?: string | null
          target_person_id: string
          updated_at?: string
          verification_status?: string
        }
        Update: {
          created_at?: string
          created_by_user_id?: string | null
          date_is_uncertain?: boolean
          date_is_unknown?: boolean
          end_date?: string | null
          end_precision?: string | null
          id?: string
          is_approximate?: boolean
          is_directional?: boolean
          is_ongoing?: boolean
          kind?: string
          narrative?: string | null
          source_person_id?: string
          source_type?: string
          start_date?: string | null
          start_precision?: string | null
          target_person_id?: string
          updated_at?: string
          verification_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "relationships_kind_fkey"
            columns: ["kind", "is_directional"]
            isOneToOne: false
            referencedRelation: "relationship_kinds"
            referencedColumns: ["key", "is_directional"]
          },
          {
            foreignKeyName: "relationships_source_person_id_fkey"
            columns: ["source_person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationships_target_person_id_fkey"
            columns: ["target_person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      external_record_sources: {
        Row: {
          external_id: string
          id: string
          retrieved_at: string
          retrieved_by_user_id: string | null
          source: string
          subject_id: string
          subject_type: string
          url: string | null
        }
        Insert: {
          external_id: string
          id?: string
          retrieved_at?: string
          retrieved_by_user_id?: string | null
          source: string
          subject_id: string
          subject_type: string
          url?: string | null
        }
        Update: {
          external_id?: string
          id?: string
          retrieved_at?: string
          retrieved_by_user_id?: string | null
          source?: string
          subject_id?: string
          subject_type?: string
          url?: string | null
        }
        Relationships: []
      }
      member_profiles: {
        Row: {
          accepts_messages: boolean
          biography: string | null
          created_at: string
          display_name: string | null
          headline: string | null
          location: string | null
          orcid: string | null
          photo_path: string | null
          updated_at: string
          user_id: string
          visibility: string
          website: string | null
        }
        Insert: {
          accepts_messages?: boolean
          biography?: string | null
          created_at?: string
          display_name?: string | null
          headline?: string | null
          location?: string | null
          orcid?: string | null
          photo_path?: string | null
          updated_at?: string
          user_id: string
          visibility?: string
          website?: string | null
        }
        Update: {
          accepts_messages?: boolean
          biography?: string | null
          created_at?: string
          display_name?: string | null
          headline?: string | null
          location?: string | null
          orcid?: string | null
          photo_path?: string | null
          updated_at?: string
          user_id?: string
          visibility?: string
          website?: string | null
        }
        Relationships: []
      }
      reviewers: {
        Row: {
          created_at: string
          granted_at: string
          granted_by_user_id: string | null
          id: string
          revoked_at: string | null
          revoked_by_user_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_at?: string
          granted_by_user_id?: string | null
          id?: string
          revoked_at?: string | null
          revoked_by_user_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          granted_at?: string
          granted_by_user_id?: string | null
          id?: string
          revoked_at?: string | null
          revoked_by_user_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_person_links: {
        Row: {
          created_at: string
          id: string
          linked_at: string
          linked_by_user_id: string | null
          person_id: string
          revoked_at: string | null
          revoked_reason: string | null
          source_claim_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          linked_at?: string
          linked_by_user_id?: string | null
          person_id: string
          revoked_at?: string | null
          revoked_reason?: string | null
          source_claim_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          linked_at?: string
          linked_by_user_id?: string | null
          person_id?: string
          revoked_at?: string | null
          revoked_reason?: string | null
          source_claim_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_person_links_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_person_links_source_claim_id_fkey"
            columns: ["source_claim_id"]
            isOneToOne: false
            referencedRelation: "profile_claims"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      am_i_a_reviewer: { Args: never; Returns: boolean }
      am_i_a_steward: { Args: never; Returns: boolean }
      approve_profile_claim: {
        Args: { p_claim_id: string }
        Returns: {
          decided_at: string
          id: string
          link_id: string
          status: string
        }[]
      }
      begin_claim_review: {
        Args: { p_claim_id: string }
        Returns: {
          id: string
          status: string
        }[]
      }
      dismiss_suggestion: { Args: { p_person_id: string }; Returns: boolean }
      get_claim_review_detail: {
        Args: { p_claim_id: string }
        Returns: {
          active_link_exists: boolean
          claimant_email: string
          decided_at: string
          decision_notes: string
          id: string
          person_created_at: string
          person_display_name: string
          person_family_name: string
          person_given_name: string
          person_id: string
          person_source_type: string
          person_verification_status: string
          reviewer_email: string
          status: string
          submitted_at: string
          supporting_evidence: string
        }[]
      }
      get_claimed_person_display_name: {
        Args: { p_person_id: string }
        Returns: string
      }
      get_confirmation: { Args: { p_token: string }; Returns: Json }
      get_contribution: { Args: { p_contribution_id: string }; Returns: Json }
      get_contribution_network: {
        Args: { p_contribution_id: string }
        Returns: Json
      }
      get_contribution_timeline: {
        Args: { p_contribution_id: string }
        Returns: Json
      }
      get_event_network: { Args: { p_event_id: string }; Returns: Json }
      get_organization: { Args: { p_organization_id: string }; Returns: Json }
      get_organization_contributions: {
        Args: { p_organization_id: string }
        Returns: Json
      }
      get_organization_network: {
        Args: { p_organization_id: string }
        Returns: Json
      }
      get_organization_participation: {
        Args: { p_organization_id: string }
        Returns: Json
      }
      get_organization_relationships: {
        Args: { p_organization_id: string }
        Returns: Json
      }
      get_organization_timeline: {
        Args: { p_organization_id: string }
        Returns: Json
      }
      get_person_biography: { Args: { p_person_id: string }; Returns: Json }
      get_person_contributions: { Args: { p_person_id: string }; Returns: Json }
      get_person_network: { Args: { p_person_id: string }; Returns: Json }
      get_person_participation: { Args: { p_person_id: string }; Returns: Json }
      get_person_relationships: { Args: { p_person_id: string }; Returns: Json }
      get_person_timeline: { Args: { p_person_id: string }; Returns: Json }
      get_public_person: { Args: { p_person_id: string }; Returns: Json }
      get_public_programme: { Args: { p_organization_id: string; p_programme: string }; Returns: Json }
      has_demo_data: { Args: never; Returns: boolean }
      is_active_reviewer: { Args: { p_user_id: string }; Returns: boolean }
      is_person_claimable: { Args: { p_person_id: string }; Returns: boolean }
      list_claims_for_review: {
        Args: never
        Returns: {
          claimant_email: string
          id: string
          person_display_name: string
          person_id: string
          person_verification_status: string
          status: string
          submitted_at: string
        }[]
      }
      list_contributions: {
        Args: never
        Returns: {
          contribution_kind: string
          contribution_kind_label: string
          id: string
          title: string
          verification_status: string
        }[]
      }
      list_contribution_options: { Args: never; Returns: Json }
      list_organizations: {
        Args: never
        Returns: {
          id: string
          name: string
          organization_type: string
          organization_type_label: string
          short_name: string
          status: string
          verification_status: string
        }[]
      }
      list_people: {
        Args: never
        Returns: {
          display_name: string
          id: string
          is_deceased: boolean
          verification_status: string
        }[]
      }
      list_public_people: {
        Args: never
        Returns: {
          display_name: string
          id: string
          is_demo: boolean
        }[]
      }
      list_public_programmes: {
        Args: never
        Returns: {
          graduates: number
          organization_id: string
          organization_name: string
          programme: string
        }[]
      }
      my_steward_scope: { Args: never; Returns: Json }
      my_contribution_candidates: {
        Args: never
        Returns: {
          contribution_id: string | null
          contribution_kind: string
          created_at: string
          decision_note: string | null
          display_name: string
          id: string
          person_id: string
          status: string
          title: string
        }[]
      }
      my_suggestions: { Args: never; Returns: Json }
      pathway_entity_node: {
        Args: { p_id: string; p_type: string }
        Returns: Json
      }
      reject_profile_claim: {
        Args: { p_claim_id: string; p_decision_notes?: string }
        Returns: {
          decided_at: string
          id: string
          status: string
        }[]
      }
      propose_contribution: {
        Args: {
          p_capacity: string
          p_contribution_kind: string
          p_description?: string
          p_end_year?: number
          p_organization_id?: string
          p_person_id: string
          p_source_note: string
          p_start_year?: number
          p_title: string
        }
        Returns: string
      }
      respond_confirmation: { Args: { p_note?: string; p_response: string; p_token: string }; Returns: string }
      reveal_organization_continuity: {
        Args: { p_organization_id: string }
        Returns: Json
      }
      reveal_organization_generations: {
        Args: { p_organization_id: string }
        Returns: Json
      }
      reveal_organization_lineage: {
        Args: { p_organization_id: string }
        Returns: Json
      }
      reveal_organization_recurrence: {
        Args: { p_organization_id: string }
        Returns: Json
      }
      reveal_person_cohorts: { Args: { p_person_id: string }; Returns: Json }
      reveal_person_mentorship_lineage: {
        Args: { p_person_id: string }
        Returns: Json
      }
      reveal_person_pathway: {
        Args: { p_from: string; p_to: string }
        Returns: Json
      }
      reveal_person_recurrence: { Args: { p_person_id: string }; Returns: Json }
      search_claimable_people: {
        Args: { p_query?: string }
        Returns: {
          display_name: string
          id: string
        }[]
      }
      set_my_person_public: { Args: { p_public: boolean }; Returns: string }
      set_my_suggestion_opt_out: { Args: { p_opt_out: boolean }; Returns: boolean }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      steward_attention: { Args: { p_organization_id?: string }; Returns: Json }
      steward_corpus_timeline: {
        Args: { p_organization_id?: string }
        Returns: {
          decade: number
          participations_starting: number
          people_starting: number
        }[]
      }
      steward_create_confirmations: { Args: { p_batch_id: string }; Returns: number }
      steward_create_organization: {
        Args: {
          p_location?: string
          p_name: string
          p_organization_type?: string
          p_short_name?: string
          p_website?: string
        }
        Returns: string
      }
      steward_create_import_batch: {
        Args: { p_label: string; p_organization_id: string | null; p_rows: Json }
        Returns: string
      }
      steward_decide_external_match: { Args: { p_accept: boolean; p_match_id: string }; Returns: string }
      steward_demo_summary: { Args: never; Returns: Json }
      get_node: { Args: { p_slug: string }; Returns: Json }
      list_nodes: { Args: never; Returns: Json }
      join_node: { Args: { p_slug: string }; Returns: string }
      leave_node: { Args: { p_slug: string }; Returns: undefined }
      my_nodes: { Args: never; Returns: Json }
      steward_set_node_plan: { Args: { p_plan: string; p_reason: string; p_slug: string }; Returns: undefined }
      set_relationship_hidden: { Args: { p_hidden: boolean; p_relationship_id: string }; Returns: undefined }
      steward_openalex_author_for_person: { Args: { p_person_id: string }; Returns: string }
      steward_record_openalex_history: { Args: { p_payload: Json; p_person_id: string }; Returns: Json }
      my_messages: { Args: never; Returns: Json }
      mark_messages_read: { Args: never; Returns: number }
      unread_message_count: { Args: never; Returns: number }
      search_people: { Args: { p_query?: string | null }; Returns: Json }
      list_heritage_kinds: { Args: never; Returns: Json }
      heritage_counts: { Args: never; Returns: Json }
      list_heritage_items: { Args: { p_kind?: string; p_query?: string }; Returns: Json }
      get_heritage_item: { Args: { p_id: string }; Returns: Json }
      heritage_for: { Args: { p_organization_id?: string; p_person_id?: string }; Returns: Json }
      propose_heritage_item: { Args: { p: Json }; Returns: string }
      link_heritage_item: { Args: { p: Json; p_item_id: string }; Returns: undefined }
      steward_decide_heritage_item: { Args: { p_decision: string; p_id: string; p_note?: string }; Returns: undefined }
      steward_list_heritage_proposals: { Args: never; Returns: Json }
      steward_university_report: {
        Args: { p_from_year?: number; p_home_country?: string; p_organization_id: string; p_programme?: string; p_to_year?: number }
        Returns: Json
      }
      steward_capes_export: {
        Args: { p_from_year?: number; p_organization_id: string; p_programme?: string; p_to_year?: number }
        Returns: {
          person_id: string
          display_name: string
          orcid: string | null
          level_pt: string
          programme: string | null
          graduation_year: number | null
          destination_category: string
          destination_institution: string | null
          destination_country: string | null
          destination_year: number | null
          years_after: number | null
          destination_source: string | null
          confirmed_at: string | null
          is_demo: boolean
        }[]
      }
      request_plan: { Args: { p: Json }; Returns: string }
      my_plan_requests: { Args: never; Returns: Json }
      steward_list_plan_requests: { Args: never; Returns: Json }
      steward_answer_plan_request: { Args: { p_note?: string; p_request_id: string; p_status: string }; Returns: undefined }
      degree_level_of: { Args: { p_degree: string }; Returns: string }
      list_record_options: { Args: never; Returns: Json }
      propose_record: { Args: { p: Json }; Returns: string }
      my_record_candidates: { Args: never; Returns: Json }
      steward_list_record_candidates: { Args: never; Returns: Json }
      steward_decide_record_candidate: {
        Args: { p_accept: boolean; p_candidate_id: string; p_note?: string }
        Returns: string
      }
      find_people_for_proposal: { Args: { p_query: string }; Returns: Json }
      send_message_to_person: { Args: { p_body: string; p_person_id: string }; Returns: string }
      reply_to_message: { Args: { p_body: string; p_message_id: string }; Returns: string }
      person_contact_options: { Args: { p_person_id: string }; Returns: Json }
      steward_grant_institution_steward: {
        Args: { p_email: string; p_organization_id: string }
        Returns: string
      }
      steward_import_candidates: { Args: { p_batch_id: string }; Returns: Json }
      steward_import_external: { Args: { p_batch_id: string }; Returns: Json }
      steward_list_confirmations: {
        Args: { p_batch_id: string }
        Returns: {
          created_at: string
          display_name: string
          expires_at: string
          id: string
          note: string | null
          person_id: string
          responded_at: string | null
          response: string | null
          token: string
        }[]
      }
      steward_list_import_batches: {
        Args: never
        Returns: {
          created: number
          created_at: string
          id: string
          label: string
          matched: number
          organization_id: string | null
          organization_name: string | null
          pending: number
          skipped: number
          total: number
        }[]
      }
      steward_decide_contribution_candidate: {
        Args: { p_candidate_id: string; p_decision: string; p_note?: string }
        Returns: string | null
      }
      steward_list_contribution_candidates: {
        Args: never
        Returns: {
          capacity: string
          capacity_label: string
          contribution_kind: string
          created_at: string
          description: string | null
          display_name: string
          end_year: number | null
          id: string
          is_own_proposal: boolean
          kind_label: string
          person_id: string
          source_note: string
          source_type: string
          start_year: number | null
          title: string
        }[]
      }
      steward_add_organization_name: {
        Args: {
          p_end_year?: number
          p_language?: string
          p_name: string
          p_name_type: string
          p_organization_id: string
          p_start_year?: number
        }
        Returns: string
      }
      steward_undo_external_match: {
        Args: { p_match_id: string; p_reason: string }
        Returns: number
      }
      steward_list_organization_names: {
        Args: { p_organization_id: string }
        Returns: {
          created_at: string
          end_year: number | null
          id: string
          language: string | null
          name: string
          name_type: string
          source_type: string
          start_year: number | null
          verification_status: string
        }[]
      }
      steward_remove_organization_name: {
        Args: { p_name_id: string }
        Returns: boolean
      }
      steward_list_institution_stewards: {
        Args: never
        Returns: {
          email: string
          granted_at: string
          id: string
          organization_id: string
          organization_name: string
        }[]
      }
      steward_outcomes: {
        Args: { p_from_year?: number; p_organization_id: string; p_programme?: string; p_to_year?: number }
        Returns: Json
      }
      steward_outcomes_export: {
        Args: { p_from_year?: number; p_organization_id: string; p_programme?: string; p_to_year?: number }
        Returns: {
          confirmed_at: string | null
          degree: string | null
          destination_country: string | null
          destination_institution: string | null
          destination_source: string | null
          destination_type: string | null
          destination_year: number | null
          display_name: string
          graduation_year: number | null
          is_demo: boolean
          orcid: string | null
          person_id: string
          programme: string | null
          status: string
        }[]
      }
      steward_overview: { Args: { p_organization_id?: string }; Returns: Json }
      steward_record_external_matches: {
        Args: { p_matches: Json; p_row_id: string; p_source: string }
        Returns: number
      }
      steward_resolve_import_row: {
        Args: { p_action: string; p_note?: string; p_person_id?: string; p_row_id: string }
        Returns: string
      }
      steward_revoke_institution_steward: { Args: { p_steward_id: string }; Returns: boolean }
      steward_set_outcomes_public: { Args: { p_organization_id: string; p_public: boolean }; Returns: boolean }
      steward_set_person_public: {
        Args: { p_person_id: string; p_public: boolean; p_reason?: string }
        Returns: boolean
      }
      submit_profile_claim: {
        Args: { p_person_id: string; p_supporting_evidence?: string }
        Returns: {
          id: string
          status: string
          submitted_at: string
        }[]
      }
      wipe_demo_data: { Args: never; Returns: Json }
      withdraw_profile_claim: {
        Args: { p_claim_id: string }
        Returns: {
          claimant_user_id: string
          claimed_person_id: string
          created_at: string
          decided_at: string | null
          decision_notes: string | null
          id: string
          reviewer_admin_id: string | null
          status: string
          submitted_at: string
          supporting_evidence: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "profile_claims"
          isOneToOne: true
          isSetofReturn: false
        }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

