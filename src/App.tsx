import type { ReactNode } from 'react'
import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Layout } from '@/components/Layout'
import { AuthPage } from '@/pages/AuthPage'
import { ProfileSetupPage } from '@/pages/ProfileSetupPage'
import { CompetitionsPage } from '@/pages/CompetitionsPage'
import { AdminChallengesPage } from '@/pages/AdminChallengesPage'

function BootScreen() {
  return (
    <div className="boot">
      <p>Loading…</p>
    </div>
  )
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { session, profile, loading } = useAuth()
  if (loading) return <BootScreen />
  if (!session) return <Navigate to="/auth" replace />
  if (!profile) return <Navigate to="/setup" replace />
  return <>{children}</>
}

function RequireAdmin({ children }: { children: ReactNode }) {
  const { session, profile, loading, effectiveIsAdmin } = useAuth()
  if (loading) return <BootScreen />
  if (!session || !profile) return <Navigate to="/auth" replace />
  if (!effectiveIsAdmin) return <Navigate to="/" replace />
  return <>{children}</>
}

export default function App() {
  const { session, profile, loading } = useAuth()

  return (
    <Routes>
      <Route
        path="/auth"
        element={
          loading ? (
            <BootScreen />
          ) : session && profile ? (
            <Navigate to="/" replace />
          ) : session && !profile ? (
            <Navigate to="/setup" replace />
          ) : (
            <AuthPage />
          )
        }
      />
      <Route
        path="/setup"
        element={
          loading ? (
            <BootScreen />
          ) : !session ? (
            <Navigate to="/auth" replace />
          ) : profile ? (
            <Navigate to="/" replace />
          ) : (
            <ProfileSetupPage />
          )
        }
      />
      <Route
        path="/"
        element={
          <RequireAuth>
            <Layout>
              <Outlet />
            </Layout>
          </RequireAuth>
        }
      >
        <Route index element={<CompetitionsPage />} />
        <Route
          path="admin/challenges"
          element={
            <RequireAdmin>
              <AdminChallengesPage />
            </RequireAdmin>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
