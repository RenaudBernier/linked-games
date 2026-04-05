export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type ProfileRow = {
  id: string
  user_id: string
  username: string
  role: string
}

export type CompetitionInstanceRow = {
  id: string
  title: string
  created_by: string
  created_at: string
  ended_at: string | null
}

/** Matches Postgres enum public.challenge_template_type */
export type ChallengeTemplateType = 'queens'

export type ChallengeTemplateRow = {
  id: string
  matrix_challenge: Json
  matrix_solution: Json
  type: ChallengeTemplateType
}

export type CompetitionChallengeMappingRow = {
  competition_instance_id: string
  challenge_template_id: string
}

export type PlayerChallengeInstanceRow = {
  id: string
  challenge_template_id: string
  user_id: string
  started_at: string
  finished_at: string | null
  is_completed: boolean
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow
        Insert: {
          id?: string
          user_id: string
          username: string
          role?: string
        }
        Update: Partial<ProfileRow>
        Relationships: []
      }
      competition_instances: {
        Row: CompetitionInstanceRow
        Insert: {
          id?: string
          title: string
          created_by: string
          created_at?: string
          ended_at?: string | null
        }
        Update: Partial<CompetitionInstanceRow>
        Relationships: []
      }
      challenge_templates: {
        Row: ChallengeTemplateRow
        Insert: {
          id?: string
          matrix_challenge: Json
          matrix_solution: Json
          type: ChallengeTemplateType
        }
        Update: Partial<ChallengeTemplateRow>
        Relationships: []
      }
      competition_instances_challenges_mapping: {
        Row: CompetitionChallengeMappingRow
        Insert: CompetitionChallengeMappingRow
        Update: Partial<CompetitionChallengeMappingRow>
        Relationships: []
      }
      player_challenge_instances: {
        Row: PlayerChallengeInstanceRow
        Insert: {
          id?: string
          challenge_template_id: string
          user_id: string
          started_at?: string
          finished_at?: string | null
          is_completed?: boolean
        }
        Update: Partial<PlayerChallengeInstanceRow>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      resolve_login_identifier: {
        Args: { identifier: string }
        Returns: string | null
      }
    }
    Enums: {
      challenge_template_type: ChallengeTemplateType
    }
    CompositeTypes: Record<string, never>
  }
}
