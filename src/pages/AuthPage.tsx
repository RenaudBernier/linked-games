import { useState, type FormEvent } from 'react'
import { supabase } from '@/lib/supabase'

const USERNAME_RE = /^[a-zA-Z0-9_]{3,24}$/

export function AuthPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [awaitingEmailConfirmation, setAwaitingEmailConfirmation] = useState(false)

  function goToSignIn() {
    setAwaitingEmailConfirmation(false)
    setMode('signin')
    setPassword('')
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setPending(true)
    try {
      if (mode === 'signup') {
        const em = email.trim()
        const un = username.trim()
        if (!USERNAME_RE.test(un)) {
          throw new Error('Username: 3–24 characters, letters, numbers, underscores only.')
        }
        const { data, error: err } = await supabase.auth.signUp({
          email: em,
          password,
          options: { data: { username: un } },
        })
        if (err) throw err
        if (data.session) {
          await supabase.auth.refreshSession()
        } else {
          setAwaitingEmailConfirmation(true)
        }
      } else {
        const id = identifier.trim()
        const { data: resolvedEmail, error: rpcErr } = await supabase.rpc(
          'resolve_login_identifier',
          { identifier: id },
        )
        if (rpcErr) throw rpcErr
        if (!resolvedEmail) {
          throw new Error('Unknown username or email.')
        }
        const { error: err } = await supabase.auth.signInWithPassword({
          email: resolvedEmail,
          password,
        })
        if (err) throw err
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setPending(false)
    }
  }

  if (awaitingEmailConfirmation) {
    const em = email.trim()
    return (
      <div className="auth-page">
        <div className="card auth-card">
          <h1>Confirm your email address</h1>
          <p className="lede">
            We sent a confirmation link{em ? ` to ${em}` : ''}. Check your inbox and confirm your
            email. When you're done, use the button below to sign in.
          </p>
          <div className="form">
            <button type="button" className="btn primary" onClick={goToSignIn}>
              Sign in
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="card auth-card">
        <h1>Linked Games</h1>
        <p className="lede">Sign in with your email or username. New accounts pick a username at signup.</p>
        <div className="tabs">
          <button
            type="button"
            className={mode === 'signin' ? 'tab active' : 'tab'}
            onClick={() => {
              setMode('signin')
              setAwaitingEmailConfirmation(false)
            }}
          >
            Sign in
          </button>
          <button
            type="button"
            className={mode === 'signup' ? 'tab active' : 'tab'}
            onClick={() => {
              setMode('signup')
              setAwaitingEmailConfirmation(false)
            }}
          >
            Create account
          </button>
        </div>
        <form onSubmit={onSubmit} className="form">
          {mode === 'signup' ? (
            <>
              <label className="field">
                <span>Email</span>
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </label>
              <label className="field">
                <span>Username</span>
                <input
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. river_player"
                  required
                  minLength={3}
                  maxLength={24}
                />
              </label>
            </>
          ) : (
            <label className="field">
              <span>Email or username</span>
              <input
                type="text"
                autoComplete="username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="you@email.com or your_name"
                required
              />
            </label>
          )}
          <label className="field">
            <span>Password</span>
            <input
              type="password"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </label>
          {error && <p className="error">{error}</p>}
          <button type="submit" className="btn primary" disabled={pending}>
            {pending ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
