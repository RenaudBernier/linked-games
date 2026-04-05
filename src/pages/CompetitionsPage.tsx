import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { ChallengeTemplateRow, CompetitionInstanceRow } from '@/types/database'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type TemplatePickRow = Pick<ChallengeTemplateRow, 'id' | 'type'>

export function CompetitionsPage() {
  const { profile, effectiveIsAdmin } = useAuth()
  const [rows, setRows] = useState<CompetitionInstanceRow[]>([])
  const [title, setTitle] = useState('')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [titleError, setTitleError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  const [templates, setTemplates] = useState<TemplatePickRow[]>([])
  const [templatesLoading, setTemplatesLoading] = useState(false)
  const [idSearch, setIdSearch] = useState('')
  const [addById, setAddById] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())

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

  const loadTemplates = useCallback(async () => {
    if (!effectiveIsAdmin) return
    setTemplatesLoading(true)
    const { data, error } = await supabase
      .from('challenge_templates')
      .select('id, type')
      .order('id', { ascending: true })
    if (error) {
      setActionError(error.message)
      setTemplates([])
    } else {
      setTemplates((data ?? []) as TemplatePickRow[])
    }
    setTemplatesLoading(false)
  }, [effectiveIsAdmin])

  useEffect(() => {
    void loadTemplates()
  }, [loadTemplates])

  const filteredTemplates = useMemo(() => {
    const q = idSearch.trim().toLowerCase()
    if (!q) return templates
    return templates.filter(
      (t) => t.id.toLowerCase().includes(q) || t.type.toLowerCase().includes(q),
    )
  }, [templates, idSearch])

  function toggleTemplate(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function addTemplateByExactId() {
    setActionError(null)
    const raw = addById.trim()
    if (!raw) return
    if (!UUID_RE.test(raw)) {
      setActionError('That does not look like a full template UUID.')
      return
    }
    const inList = templates.some((t) => t.id === raw)
    if (inList) {
      setSelectedIds((prev) => new Set(prev).add(raw))
      setAddById('')
      return
    }
    const { data, error } = await supabase
      .from('challenge_templates')
      .select('id, type')
      .eq('id', raw)
      .maybeSingle()
    if (error) {
      setActionError(error.message)
      return
    }
    if (!data) {
      setActionError('No challenge template with that id.')
      return
    }
    setTemplates((prev) => {
      if (prev.some((t) => t.id === data.id)) return prev
      return [...prev, data as TemplatePickRow].sort((a, b) => a.id.localeCompare(b.id))
    })
    setSelectedIds((prev) => new Set(prev).add(data.id))
    setAddById('')
  }

  async function createCompetition(e: FormEvent) {
    e.preventDefault()
    if (!profile) return
    setActionError(null)
    setTitleError(null)
    const t = title.trim()
    if (!t) {
      setTitleError('Enter a competition name.')
      return
    }
    setCreating(true)
    const { data: created, error } = await supabase
      .from('competition_instances')
      .insert({
        title: t,
        created_by: profile.username,
      })
      .select('id')
      .single()
    if (error || !created) {
      setActionError(error?.message ?? 'Could not create competition.')
      setCreating(false)
      return
    }

    if (selectedIds.size > 0) {
      const mappingRows = [...selectedIds].map((challenge_template_id) => ({
        competition_instance_id: created.id,
        challenge_template_id,
      }))
      const { error: mapErr } = await supabase
        .from('competition_instances_challenges_mapping')
        .insert(mappingRows)
      if (mapErr) {
        setActionError(
          `Competition was created, but linking challenges failed: ${mapErr.message}`,
        )
        setCreating(false)
        setTitle('')
        await load()
        return
      }
    }

    setTitle('')
    setSelectedIds(new Set())
    setIdSearch('')
    setAddById('')
    await load()
    setCreating(false)
  }

  return (
    <div className="page">
      <section className="section">
        <h2>Competitions</h2>
        <p className="muted">
          Each instance has a title, creator, and optional end time. Admins can attach challenge
          templates when creating a competition (search by id or type).
        </p>
        {effectiveIsAdmin && (
          <form onSubmit={createCompetition} className="competition-create">
            <div className="field">
              <label htmlFor="comp-title">Competition name</label>
              <input
                id="comp-title"
                name="title"
                aria-invalid={titleError ? true : undefined}
                aria-describedby={titleError ? 'comp-title-error' : undefined}
                placeholder="e.g. Spring weekly"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value)
                  if (titleError) setTitleError(null)
                }}
              />
              {titleError && (
                <p id="comp-title-error" className="error" role="alert">
                  {titleError}
                </p>
              )}
            </div>

            <div className="field">
              <span>Challenges in this competition</span>
              <p className="muted small" style={{ margin: 0 }}>
                Search the list by template id or type, tick rows, or paste a full template UUID
                below. You can create the competition with none selected and add mappings later
                from the API or a future admin screen.
              </p>
              <input
                type="search"
                placeholder="Filter by id substring or type…"
                value={idSearch}
                onChange={(e) => setIdSearch(e.target.value)}
                disabled={templatesLoading}
              />
              <div className="challenge-picker">
                {templatesLoading && (
                  <p className="muted small" style={{ margin: '0.5rem 0' }}>
                    Loading templates…
                  </p>
                )}
                {!templatesLoading && filteredTemplates.length === 0 && (
                  <p className="muted small" style={{ margin: '0.5rem 0' }}>
                    No templates match. Create templates under Admin · Challenges.
                  </p>
                )}
                {!templatesLoading &&
                  filteredTemplates.map((tpl) => (
                    <label key={tpl.id} className="challenge-picker-row">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(tpl.id)}
                        onChange={() => toggleTemplate(tpl.id)}
                      />
                      <span>
                        <code>{tpl.id}</code>
                        <span className="muted small"> · {tpl.type}</span>
                      </span>
                    </label>
                  ))}
              </div>
              <div className="inline-form" style={{ marginTop: '0.75rem' }}>
                <input
                  placeholder="Paste full template UUID to add"
                  value={addById}
                  onChange={(e) => setAddById(e.target.value)}
                  aria-label="Template UUID to add"
                />
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => void addTemplateByExactId()}
                >
                  Add by id
                </button>
              </div>
              <p className="muted small" style={{ margin: '0.35rem 0 0' }}>
                Selected: {selectedIds.size} challenge{selectedIds.size === 1 ? '' : 's'}
              </p>
            </div>

            <button type="submit" className="btn primary" disabled={creating}>
              {creating ? 'Creating…' : 'Create competition'}
            </button>
            {actionError && <p className="error">{actionError}</p>}
          </form>
        )}
      </section>

      <section className="section">
        {loading && <p className="muted">Loading competitions…</p>}
        {loadError && <p className="error">{loadError}</p>}
        {!loading && !loadError && rows.length === 0 && (
          <p className="muted">
            {effectiveIsAdmin
              ? 'No competitions yet. Create one above.'
              : 'No competitions yet.'}
          </p>
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
