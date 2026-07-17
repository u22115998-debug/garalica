import { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import Navbar from './components/Navbar'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import CreateIssuePage from './pages/CreateIssuePage'
import ProfilePage from './pages/ProfilePage'
import NotFoundPage from './pages/NotFoundPage'
import VerificationPage from './pages/VerificationPage'

export default function App() {
  const { user, loading } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')

  if (loading) {
    return (
      <div className="loading-spinner" style={{ minHeight: '100vh' }}>
        <div className="spinner" />
      </div>
    )
  }

  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/verify" element={<VerificationPage />} />
        <Route
          path="*"
          element={
            user && !user.is_verified ? (
              <Navigate to="/verify" replace />
            ) : (
              <>
                <Navbar searchQuery={searchQuery} onSearchChange={setSearchQuery} />
                <Routes>
                  <Route path="/" element={<DashboardPage searchQuery={searchQuery} />} />
                  <Route path="/create" element={<CreateIssuePage />} />
                  <Route path="/profiles/:username" element={<ProfilePage />} />
                  <Route path="/:issueKey" element={<DashboardPage searchQuery={searchQuery} />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </>
            )
          }
        />
      </Routes>
    </>
  )
}
