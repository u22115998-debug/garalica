import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { motion } from 'framer-motion'
import api from '../api'

export default function VerificationPage() {
  const { user, refreshUser, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  
  const [loading, setLoading] = useState(false)
  const [codeSent, setCodeSent] = useState(false)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Check local storage to see if we recently sent a code
  useEffect(() => {
    if (user?.is_verified) {
      navigate('/')
    }
    const lastSent = localStorage.getItem('verification_code_sent_at')
    if (lastSent) {
      const timeDiff = Date.now() - parseInt(lastSent, 10)
      if (timeDiff < 15 * 60 * 1000) {
        setCodeSent(true)
      } else {
        localStorage.removeItem('verification_code_sent_at')
      }
    }
  }, [user, navigate])

  const handleSendCode = async () => {
    setLoading(true)
    setError('')
    try {
      await api.post('/auth/send-verification-code')
      setCodeSent(true)
      localStorage.setItem('verification_code_sent_at', Date.now().toString())
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to send code')
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await api.post('/auth/verify-email', { code })
      setSuccess(true)
      localStorage.removeItem('verification_code_sent_at')
      await refreshUser()
      setTimeout(() => navigate('/'), 1500)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to verify code')
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || (user && user.is_verified)) return null

  return (
    <div className="auth-page">
      <motion.div
        className="auth-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >
        <div className="auth-logo">
          <img
            src="https://cdn.garakrral.com/assets/garakrral_mini_logo.png"
            alt="GaraKrral"
          />
        </div>
        <h1 className="auth-title">Verify Email</h1>
        <p className="auth-subtitle">
          {codeSent 
            ? "Enter the 6-digit code we sent to your email" 
            : "Protect your account by verifying your email address"}
        </p>

        {error && <div className="auth-error">{error}</div>}
        {success && <div className="auth-error" style={{ backgroundColor: 'rgba(0, 200, 0, 0.1)', color: 'var(--accent-green)', borderColor: 'rgba(0, 200, 0, 0.2)' }}>Email verified successfully! Redirecting...</div>}

        {!codeSent && !success && (
          <div className="auth-form" style={{ marginTop: '2rem' }}>
            <button
              onClick={handleSendCode}
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%' }}
            >
              {loading ? 'Sending...' : 'Send Verification Code'}
            </button>
          </div>
        )}

        {codeSent && !success && (
          <form className="auth-form" onSubmit={handleVerify} style={{ marginTop: '1rem' }}>
            <div className="input-group">
              <label htmlFor="verify-code">6-Digit Code</label>
              <input
                id="verify-code"
                type="text"
                className="input"
                placeholder="000000"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                autoFocus
                style={{ textAlign: 'center', letterSpacing: '4px', fontSize: '1.25rem' }}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || code.length !== 6}
            >
              {loading ? 'Verifying...' : 'Verify Email'}
            </button>

            <button
              type="button"
              className="btn"
              onClick={() => setCodeSent(false)}
              disabled={loading}
              style={{ marginTop: '0.5rem', backgroundColor: 'transparent' }}
            >
              Cancel
            </button>
          </form>
        )}
      </motion.div>
    </div>
  )
}
