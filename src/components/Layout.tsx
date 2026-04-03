import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

export function Layout({ children }: { children: React.ReactNode }) {
  const {
    profile,
    role,
    isAdmin,
    effectiveIsAdmin,
    previewAsParticipant,
    setPreviewAsParticipant,
    signOut,
  } = useAuth()

  return (
    <div className="shell">
      <header className="topbar">
        <Link to="/" className="brand">
          Linked Games
        </Link>
        <nav className="nav-actions">
          {effectiveIsAdmin && (
            <Link to="/admin/challenges" className="nav-link">
              Admin · Challenges
            </Link>
          )}
          {profile && (
            <span className="muted nav-user">
              @{profile.username}
              {isAdmin ? (
                <>
                  {' '}
                  ·{' '}
                  <select
                    className="role-select"
                    aria-label="View as role"
                    value={previewAsParticipant ? 'participant' : 'admin'}
                    onChange={(e) =>
                      setPreviewAsParticipant(e.target.value === 'participant')
                    }
                  >
                    <option value="admin">admin</option>
                    <option value="participant">participant</option>
                  </select>
                </>
              ) : (
                <> · {role}</>
              )}
            </span>
          )}
          <button type="button" className="btn ghost" onClick={() => void signOut()}>
            Sign out
          </button>
        </nav>
      </header>
      <main className="main">{children}</main>
    </div>
  )
}
