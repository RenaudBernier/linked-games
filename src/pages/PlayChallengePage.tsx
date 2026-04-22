import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { ChallengeTemplateRow, PlayerChallengeInstanceRow } from '@/types/database'
import { QueensBoard } from '@/components/QueensBoard'

function useSafeReturnTo(): string | null {
  const { state } = useLocation()
  const raw = state && typeof state === 'object' && 'returnTo' in state ? (state as { returnTo?: unknown }).returnTo : undefined
  if (typeof raw !== 'string' || !raw.startsWith('/') || raw.startsWith('//')) return null
  return raw
}

export function PlayChallengePage() {
  const { pciId } = useParams<{ pciId: string }>()
  const { session } = useAuth()
  const returnTo = useSafeReturnTo()

  const [pci, setPci] = useState<PlayerChallengeInstanceRow | null>(null)
  const [template, setTemplate] = useState<ChallengeTemplateRow | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const submitLock = useRef(false)

  const load = useCallback(async () => {
    if (!pciId || !session?.user.id) return
    setLoadError(null)
    const { data: row, error: e1 } = await supabase
      .from('player_challenge_instances')
      .select('*')
      .eq('id', pciId)
      .maybeSingle()
    if (e1) {
      setLoadError(e1.message)
      setPci(null)
      setTemplate(null)
      return
    }
    if (!row || row.user_id !== session.user.id) {
      setLoadError('Challenge not found or access denied.')
      setPci(null)
      setTemplate(null)
      return
    }
    setPci(row as PlayerChallengeInstanceRow)

    const { data: tpl, error: e2 } = await supabase
      .from('challenge_templates')
      .select('*')
      .eq('id', row.challenge_template_id)
      .single()
    if (e2 || !tpl) {
      setLoadError(e2?.message ?? 'Could not load puzzle.')
      setTemplate(null)
      return
    }
    setTemplate(tpl as ChallengeTemplateRow)
  }, [pciId, session?.user.id])

  useEffect(() => {
    void load()
  }, [load])

  const onSolved = useCallback(async () => {
    if (!pciId || submitLock.current) return
    submitLock.current = true
    setSaving(true)
    const { error } = await supabase
      .from('player_challenge_instances')
      .update({
        is_completed: true,
        finished_at: new Date().toISOString(),
      })
      .eq('id', pciId)
    setSaving(false)
    submitLock.current = false
    if (error) {
      setLoadError(error.message)
      return
    }
    setPci((prev) =>
      prev
        ? {
            ...prev,
            is_completed: true,
            finished_at: new Date().toISOString(),
          }
        : null,
    )
  }, [pciId])

  const handleSolved = useCallback(() => {
    void onSolved()
  }, [onSolved])

  const backHref = returnTo ?? '/'
  const backLabel = returnTo ? '← Back' : '← Competitions'

  if (!pciId) {
    return (
      <div className="page">
        <p className="error">Missing challenge id.</p>
        <Link to={backHref}>{backLabel}</Link>
      </div>
    )
  }

  if (loadError && !pci) {
    return (
      <div className="page">
        <p className="error">{loadError}</p>
        <Link to={backHref}>{backLabel}</Link>
      </div>
    )
  }

  if (!pci || !template) {
    return (
      <div className="page">
        <p className="muted small">
          <Link to={backHref}>{backLabel}</Link>
        </p>
        <p className="muted">Loading puzzle…</p>
      </div>
    )
  }

  return (
    <div className="page">
      <p className="muted small">
        <Link to={backHref}>{backLabel}</Link>
      </p>
      <section className="section">
        <h2>Challenge</h2>
        <p className="muted small">
          Template <code>{template.id}</code> · {template.type}
        </p>
        {pci.is_completed ? (
          <p className="muted">You already completed this challenge. Nice work.</p>
        ) : template.type === 'queens' ? (
          <QueensBoard
            matrixChallenge={template.matrix_challenge}
            matrixSolution={template.matrix_solution}
            disabled={saving}
            onSolved={handleSolved}
          />
        ) : (
          <p className="error">This challenge type is not playable in the app yet.</p>
        )}
        {loadError && pci && <p className="error">{loadError}</p>}
      </section>
    </div>
  )
}
