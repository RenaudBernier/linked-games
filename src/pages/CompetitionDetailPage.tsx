import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { startChallengePlay } from '@/lib/startChallengePlay'
import {
  CompetitionLeaderboardChart,
  type LeaderboardEventRow,
} from '@/components/CompetitionLeaderboardChart'
import type { ChallengeTemplateRow, CompetitionInstanceRow } from '@/types/database'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type TemplatePickRow = Pick<ChallengeTemplateRow, 'id' | 'type'>

function isEnded(c: CompetitionInstanceRow): boolean {
  return c.ended_at != null && new Date(c.ended_at).getTime() < Date.now()
}

export function CompetitionDetailPage() {
  const { competitionId } = useParams<{ competitionId: string }>()
  const navigate = useNavigate()
  const { session, effectiveIsAdmin } = useAuth()

  const [competition, setCompetition] = useState<CompetitionInstanceRow | null>(null)
  const [templateIds, setTemplateIds] = useState<string[]>([])
  const [templates, setTemplates] = useState<TemplatePickRow[]>([])
  const [leaderboardEvents, setLeaderboardEvents] = useState<LeaderboardEventRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [playBusyKey, setPlayBusyKey] = useState<string | null>(null)
  const [playError, setPlayError] = useState<string | null>(null)
  const [closeBusy, setCloseBusy] = useState(false)
  const [closeError, setCloseError] = useState<string | null>(null)
  const [refreshToken, setRefreshToken] = useState(0)

  useEffect(() => {
    if (!competitionId || !UUID_RE.test(competitionId)) return

    let cancelled = false
    const initial = refreshToken === 0
    if (initial) {
      setCompetition(null)
      setTemplateIds([])
      setTemplates([])
      setLeaderboardEvents([])
      setLoading(true)
      setError(null)
    }

    async function run() {
      if (!competitionId) return
      const { data: comp, error: ce } = await supabase
        .from('competition_instances')
        .select('*')
        .eq('id', competitionId)
        .maybeSingle()
      if (cancelled) return
      if (ce) {
        setError(ce.message)
        setLoading(false)
        return
      }
      if (!comp) {
        setError('Competition not found.')
        setLoading(false)
        return
      }
      const c = comp as CompetitionInstanceRow
      setCompetition(c)

      const { data: maps, error: me } = await supabase
        .from('competition_instances_challenges_mapping')
        .select('challenge_template_id')
        .eq('competition_instance_id', competitionId)
      if (cancelled) return
      if (me) {
        setError(me.message)
        setLoading(false)
        return
      }
      const ids = (maps ?? []).map((m) => m.challenge_template_id)
      setTemplateIds(ids)

      if (ids.length === 0) {
        setLoading(false)
        return
      }

      const { data: tpls, error: te } = await supabase
        .from('challenge_templates')
        .select('id, type')
        .in('id', ids)
      if (cancelled) return
      if (te) {
        setError(te.message)
        setLoading(false)
        return
      }
      setTemplates((tpls ?? []) as TemplatePickRow[])

      const createdMs = new Date(c.created_at).getTime()
      const endCapMs = c.ended_at ? new Date(c.ended_at).getTime() : null

      const { data: pcis, error: pe } = await supabase
        .from('player_challenge_instances')
        .select('user_id, finished_at')
        .in('challenge_template_id', ids)
        .eq('is_completed', true)
        .not('finished_at', 'is', null)
      if (cancelled) return
      if (pe) {
        setError(pe.message)
        setLoading(false)
        return
      }

      const rows = (pcis ?? []) as { user_id: string; finished_at: string }[]
      const inWindow = rows.filter((r) => {
        const t = new Date(r.finished_at).getTime()
        if (t < createdMs) return false
        if (endCapMs != null && t > endCapMs) return false
        return true
      })

      const userIds = [...new Set(inWindow.map((r) => r.user_id))]
      let usernameByUser = new Map<string, string>()
      if (userIds.length > 0) {
        const { data: profs, error: pre } = await supabase
          .from('profiles')
          .select('user_id, username')
          .in('user_id', userIds)
        if (cancelled) return
        if (pre) {
          setError(pre.message)
          setLoading(false)
          return
        }
        usernameByUser = new Map((profs ?? []).map((p) => [p.user_id, p.username]))
      }

      const events: LeaderboardEventRow[] = inWindow
        .map((r) => ({
          user_id: r.user_id,
          username: usernameByUser.get(r.user_id) ?? 'Player',
          finished_at: r.finished_at,
        }))
        .sort((a, b) => new Date(a.finished_at).getTime() - new Date(b.finished_at).getTime())

      setLeaderboardEvents(events)
      setLoading(false)
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [competitionId, refreshToken])

  const windowEndIso = useMemo(() => {
    if (!competition) return new Date().toISOString()
    const now = Date.now()
    if (competition.ended_at) {
      return new Date(Math.min(now, new Date(competition.ended_at).getTime())).toISOString()
    }
    return new Date(now).toISOString()
  }, [competition])

  const orderedTemplates = useMemo(() => {
    return templateIds
      .map((id) => templates.find((t) => t.id === id))
      .filter((t): t is TemplatePickRow => t != null)
  }, [templateIds, templates])

  function formatChallengeType(type: string) {
    if (!type) return type
    return type.charAt(0).toUpperCase() + type.slice(1)
  }

  async function onPlay(templateId: string) {
    if (!session?.user || !competitionId) return
    setPlayBusyKey(templateId)
    setPlayError(null)
    const { error: err } = await startChallengePlay(navigate, session.user, templateId, {
      returnTo: `/competition/${competitionId}`,
    })
    if (err) setPlayError(err)
    setPlayBusyKey(null)
  }

  async function closeCompetition() {
    if (!effectiveIsAdmin || !competition) return
    setCloseBusy(true)
    setCloseError(null)
    const { error: err } = await supabase
      .from('competition_instances')
      .update({ ended_at: new Date().toISOString() })
      .eq('id', competition.id)
    if (err) setCloseError(err.message)
    else setRefreshToken((n) => n + 1)
    setCloseBusy(false)
  }

  if (!competitionId || !UUID_RE.test(competitionId)) {
    return <Navigate to="/" replace />
  }

  if (loading) {
    return (
      <div className="page">
        <p className="muted">Loading competition…</p>
      </div>
    )
  }

  if (error && !competition) {
    return (
      <div className="page">
        <p className="error">{error}</p>
        <Link to="/">Back to competitions</Link>
      </div>
    )
  }

  if (!competition) {
    return <Navigate to="/" replace />
  }

  const ended = isEnded(competition)
  const canClose = effectiveIsAdmin && !ended

  return (
    <div className="page">
      <div className="competition-detail-header">
        <Link to="/" className="competition-back muted small">
          ← Competitions
        </Link>
        <div className="competition-detail-title-row">
          <h2 style={{ margin: 0 }}>{competition.title}</h2>
          {canClose && (
            <button
              type="button"
              className="btn secondary"
              disabled={closeBusy}
              onClick={() => void closeCompetition()}
            >
              {closeBusy ? 'Closing…' : 'Close competition'}
            </button>
          )}
        </div>
        <p className="muted small" style={{ margin: '0.25rem 0 0' }}>
          by {competition.created_by} · {new Date(competition.created_at).toLocaleString()}
          {competition.ended_at && ` · ended ${new Date(competition.ended_at).toLocaleString()}`}
          {ended && ' · Ended'}
        </p>
      </div>

      {error && <p className="error">{error}</p>}
      {closeError && <p className="error">{closeError}</p>}

      <section className="section">
        <h3>Leaderboard</h3>
        <p className="muted small" style={{ marginTop: 0 }}>
          One point per completed challenge in this competition. The chart uses completion time
          within the event window (start through end, or now if still open).
        </p>
        <CompetitionLeaderboardChart
          events={leaderboardEvents}
          windowStartIso={competition.created_at}
          windowEndIso={windowEndIso}
        />
      </section>

      <section className="section">
        <h3>Challenges</h3>
        {templateIds.length === 0 ? (
          <p className="muted small">No challenges linked to this competition yet.</p>
        ) : (
          <ol className="challenge-play-list">
            {orderedTemplates.map((tpl, index) => {
              const busy = playBusyKey === tpl.id
              return (
                <li key={tpl.id}>
                  <button
                    type="button"
                    className="challenge-play-card"
                    disabled={ended || busy}
                    onClick={() => void onPlay(tpl.id)}
                  >
                    <span className="challenge-play-main">
                      <span className="challenge-play-num" aria-hidden="true">
                        {index + 1}.
                      </span>
                      <span className="challenge-play-type">{formatChallengeType(tpl.type)}</span>
                    </span>
                    {busy && <span className="challenge-play-status muted small">Opening…</span>}
                    {ended && !busy && <span className="challenge-play-status muted small">Ended</span>}
                  </button>
                </li>
              )
            })}
          </ol>
        )}
        {playError && <p className="error">{playError}</p>}
      </section>
    </div>
  )
}
