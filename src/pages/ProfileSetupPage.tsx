import { useState, type FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

const USERNAME_RE = /^[a-zA-Z0-9_]{3,24}$/

export function ProfileSetupPage() {
  const { session, refreshJwt } = useAuth()
  const [username, setUsername] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const trimmed = username.trim()
    if (!USERNAME_RE.test(trimmed)) {
      setError('Use 3–24 characters: letters, numbers, underscores.')
      return
    }
    if (!session?.user.id) {
      setError('Not signed in.')
      return
    }
    setPending(true)
    const { error: err } = await supabase.from('profiles').insert({
      user_id: session.user.id,
      username: trimmed,
    })
    setPending(false)
    if (err) {
      if (err.code === '23505') {
        setError('That username is taken.')
      } else {
        setError(err.message)
      }
      return
    }
    await refreshJwt()
  }

  return (
    <div className="auth-page">
      <div className="card auth-card">
        <h1>Choose a username</h1>
        <p className="lede">
          Your account doesn’t have a profile yet (e.g. OAuth without username). Pick a unique
          username — it’s copied into your session JWT together with your role.
        </p>
        <form onSubmit={onSubmit} className="form">
          <label className="field">
            <span>Username</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. river_player"
              autoComplete="username"
              required
            />
          </label>
          {error && <p className="error">{error}</p>}
          <button type="submit" className="btn primary" disabled={pending}>
            {pending ? 'Saving…' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  )
}
