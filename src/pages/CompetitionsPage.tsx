import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { CompetitionInstanceRow } from '@/types/database'

export function CompetitionsPage() {
  const { profile } = useAuth()
  const [rows, setRows] = useState<CompetitionInstanceRow[]>([])
  const [title, setTitle] = useState('')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoadError(null)
    const { data, error } = await supabase
      .from('competition_instances')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) {
      setLoadError(error.message)
      setRows([])
    } else {
      setRows((data ?? []) as CompetitionInstanceRow[])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function createCompetition(e: FormEvent) {
    e.preventDefault()
    if (!profile) return
    setActionError(null)
    const t = title.trim()
    if (!t) return
    const { error } = await supabase.from('competition_instances').insert({
      title: t,
      created_by: profile.username,
    })
    if (error) {
      setActionError(error.message)
      return
    }
    setTitle('')
    await load()
  }

  return (
    <div className="page">
      <section className="section">
        <h2>Competitions</h2>
        <p className="muted">
          Each instance has a title, creator, and optional end time. Challenge templates are managed
          under Admin (admins only).
        </p>
        <form onSubmit={createCompetition} className="inline-form">
          <input
            placeholder="New competition title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <button type="submit" className="btn primary">
            Create
          </button>
        </form>
        {actionError && <p className="error">{actionError}</p>}
      </section>

      <section className="section">
        {loading && <p className="muted">Loading competitions…</p>}
        {loadError && <p className="error">{loadError}</p>}
        {!loading && !loadError && rows.length === 0 && (
          <p className="muted">No competitions yet. Create one above.</p>
        )}
        <ul className="list">
          {rows.map((c) => (
            <li key={c.id} className="list-item">
              <div>
                <strong>{c.title}</strong>
                <div className="muted small">
                  by {c.created_by} · {new Date(c.created_at).toLocaleString()}
                  {c.ended_at && ` · ends ${new Date(c.ended_at).toLocaleString()}`}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
