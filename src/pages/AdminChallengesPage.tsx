import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { ChallengeTemplateRow } from '@/types/database'
import { MatrixPreview } from '@/components/MatrixPreview'

const SAMPLE_MATRIX = [
  [1, 2, 0],
  [0, 1, 2],
  [2, 0, 1],
]

export function AdminChallengesPage() {
  const { profile } = useAuth()
  const [rows, setRows] = useState<ChallengeTemplateRow[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoadError(null)
    const { data, error } = await supabase
      .from('challenge_templates')
      .select('*')
      .order('id', { ascending: true })
    if (error) {
      setLoadError(error.message)
      setRows([])
    } else {
      setRows((data ?? []) as ChallengeTemplateRow[])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function seedSample() {
    if (!profile) return
    setBusy(true)
    setMsg(null)
    const { data: tpl, error: e1 } = await supabase
      .from('challenge_templates')
      .insert({ matrix: SAMPLE_MATRIX })
      .select('id')
      .single()
    if (e1 || !tpl) {
      setMsg(e1?.message ?? 'Insert failed')
      setBusy(false)
      return
    }
    const { data: comps } = await supabase
      .from('competition_instances')
      .select('id')
      .order('created_at', { ascending: true })
      .limit(1)
    const compId = comps?.[0]?.id
    if (compId) {
      const { error: e2 } = await supabase
        .from('competition_instances_challenges_mapping')
        .insert({
          competition_instance_id: compId,
          challenge_template_id: tpl.id,
        })
      if (e2) setMsg(e2.message)
      else setMsg('Sample challenge linked to your oldest competition.')
    } else {
      setMsg('Sample template created. Create a competition, then seed again to link.')
    }
    setBusy(false)
    await load()
  }

  return (
    <div className="page">
      <section className="section">
        <h2>Challenge templates (admin)</h2>
        <p className="muted">
          Only users with <code>role = admin</code> in JWT <code>app_metadata</code> can insert or
          update templates (enforced by RLS). Username lives in <code>user_metadata</code>.
        </p>
      </section>

      <section className="section">
        <h3>Insert sample</h3>
        <p className="muted small">
          Adds a <code>challenge_templates</code> row and maps it to your oldest competition when
          one exists.
        </p>
        <MatrixPreview matrix={SAMPLE_MATRIX} />
        <button type="button" className="btn secondary" disabled={busy} onClick={() => void seedSample()}>
          {busy ? 'Working…' : 'Insert sample template'}
        </button>
        {msg && <p className="muted small">{msg}</p>}
      </section>

      <section className="section">
        <h3>Existing templates</h3>
        {loading && <p className="muted">Loading…</p>}
        {loadError && <p className="error">{loadError}</p>}
        {!loading && !loadError && rows.length === 0 && (
          <p className="muted">No templates yet.</p>
        )}
        <ul className="list">
          {rows.map((r) => (
            <li key={r.id} className="list-item">
              <div className="muted small">id: {r.id}</div>
              <MatrixPreview matrix={r.matrix} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
