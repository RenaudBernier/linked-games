import type { NavigateFunction } from 'react-router-dom'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

type StartChallengeOptions = {
  /** e.g. `/competition/:id` — passed as location state so Play can link back */
  returnTo?: string
}

/** Start or resume a challenge; navigates to `/play/:pciId` on success. */
export async function startChallengePlay(
  navigate: NavigateFunction,
  user: User,
  templateId: string,
  options?: StartChallengeOptions,
): Promise<{ error?: string }> {
  const nav =
    options?.returnTo != null && options.returnTo.startsWith('/') && !options.returnTo.startsWith('//')
      ? { state: { returnTo: options.returnTo } }
      : undefined

  const { data: existing, error: findErr } = await supabase
    .from('player_challenge_instances')
    .select('id')
    .eq('user_id', user.id)
    .eq('challenge_template_id', templateId)
    .order('started_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (findErr) return { error: findErr.message }
  if (existing?.id) {
    navigate(`/play/${existing.id}`, nav)
    return {}
  }
  const { data: created, error: insErr } = await supabase
    .from('player_challenge_instances')
    .insert({
      challenge_template_id: templateId,
      user_id: user.id,
    })
    .select('id')
    .single()
  if (insErr || !created) {
    return { error: insErr?.message ?? 'Could not start challenge.' }
  }
  navigate(`/play/${created.id}`, nav)
  return {}
}
