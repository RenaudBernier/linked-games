import { createContext } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { ProfileRow } from '@/types/database'

export type AuthState = {
  session: Session | null
  profile: ProfileRow | null
  /** From JWT `app_metadata` (synced from `profiles.role`) */
  role: string
  isAdmin: boolean
  /** UI-only: when true, treat the session like a participant for nav and admin routes (JWT unchanged). */
  previewAsParticipant: boolean
  setPreviewAsParticipant: (v: boolean) => void
  /** `isAdmin` except when previewing as participant — use for guards and admin-only UI. */
  effectiveIsAdmin: boolean
  loading: boolean
  refreshProfile: () => Promise<void>
  /** Refreshes JWT from Auth then reloads profile (use after profile insert or role change). */
  refreshJwt: () => Promise<void>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthState | null>(null)
