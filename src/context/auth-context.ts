import { createContext } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { ProfileRow } from '@/types/database'

export type AuthState = {
  session: Session | null
  profile: ProfileRow | null
  /** From JWT `app_metadata` (synced from `profiles.role`) */
  role: string
  isAdmin: boolean
  loading: boolean
  refreshProfile: () => Promise<void>
  /** Refreshes JWT from Auth then reloads profile (use after profile insert or role change). */
  refreshJwt: () => Promise<void>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthState | null>(null)
