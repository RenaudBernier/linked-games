import type { NavigateFunction } from 'react-router-dom'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

/** Start or resume a challenge; navigates to `/play/:pciId` on success. */
export async function startChallengePlay(
  navigate: NavigateFunction,
  user: User,
  templateId: string,
): Promise<{ error?: string }> {
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
    navigate(`/play/${existing.id}`)
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
  navigate(`/play/${created.id}`)
  return {}
}
