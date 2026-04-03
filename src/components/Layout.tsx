import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

export function Layout({ children }: { children: React.ReactNode }) {
  const { profile, role, isAdmin, signOut } = useAuth()

  return (
    <div className="shell">
      <header className="topbar">
        <Link to="/" className="brand">
          Linked Games
        </Link>
        <nav className="nav-actions">
          {isAdmin && (
            <Link to="/admin/challenges" className="nav-link">
              Admin · Challenges
            </Link>
          )}
          {profile && (
            <span className="muted">
              @{profile.username} · {role}
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
