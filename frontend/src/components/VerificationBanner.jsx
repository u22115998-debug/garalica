import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function VerificationBanner() {
  const { user } = useAuth()

  if (!user || user.is_verified) {
    return null
  }

  return (
    <div style={{
      backgroundColor: 'rgba(255, 60, 60, 0.1)',
      borderBottom: '1px solid rgba(255, 60, 60, 0.2)',
      padding: '0.75rem',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      color: 'var(--text)',
      backdropFilter: 'blur(10px)',
      position: 'sticky',
      top: 0,
      zIndex: 1000,
      gap: '1rem'
    }}>
      <span>Your account is not verified. Please verify your email to unlock all features.</span>
      <Link 
        to="/verify" 
        className="btn btn-primary"
        style={{ padding: '0.25rem 0.75rem', fontSize: '0.9rem', textDecoration: 'none' }}
      >
        Verify Account
      </Link>
    </div>
  )
}
