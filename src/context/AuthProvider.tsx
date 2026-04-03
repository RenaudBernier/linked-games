import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { ProfileRow } from '@/types/database'
import { AuthContext } from '@/context/auth-context'

function readRoleFromSession(session: Session | null): string | null {
  const r = (session?.user.app_metadata as { role?: string } | undefined)?.role
  return r ?? null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<ProfileRow | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [profileReady, setProfileReady] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s)
      setAuthReady(true)
    })
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
    })
    return () => subscription.unsubscribe()
  }, [])

  const loadProfile = useCallback(async (userId: string) => {
    setProfileReady(false)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
    if (error) {
      console.error(error)
      setProfile(null)
    } else {
      setProfile(data)
    }
    setProfileReady(true)
  }, [])

  useEffect(() => {
    if (!authReady) return
    const uid = session?.user.id
    if (!uid) {
      setProfile(null)
      setProfileReady(true)
      return
    }
    void loadProfile(uid)
  }, [authReady, session?.user.id, loadProfile])

  const loading = !authReady || (session != null && !profileReady)

  const refreshProfile = useCallback(async () => {
    const uid = session?.user.id
    if (uid) await loadProfile(uid)
  }, [session?.user.id, loadProfile])

  const refreshJwt = useCallback(async () => {
    await supabase.auth.refreshSession()
    const {
      data: { session: s },
    } = await supabase.auth.getSession()
    setSession(s ?? null)
    if (s?.user.id) await loadProfile(s.user.id)
  }, [loadProfile])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setProfile(null)
  }, [])

  /** Prefer DB `profiles.role`; JWT is synced via trigger but the client session can lag after SQL updates. */
  const role = useMemo(() => {
    if (profile?.role) return profile.role
    return readRoleFromSession(session) ?? 'participant'
  }, [session, profile])

  const isAdmin = role === 'admin'

  useEffect(() => {
    if (!profile || !session) return
    const jwtRole = readRoleFromSession(session)
    if (profile.role === 'admin' && jwtRole !== 'admin') {
      void refreshJwt()
    }
  }, [profile?.role, profile?.user_id, session, refreshJwt])

  const value = useMemo(
    () => ({
      session,
      profile,
      role,
      isAdmin,
      loading,
      refreshProfile,
      refreshJwt,
      signOut,
    }),
    [session, profile, role, isAdmin, loading, refreshProfile, refreshJwt, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
