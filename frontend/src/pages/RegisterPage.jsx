import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { motion } from 'framer-motion'

export default function RegisterPage() {
  const [form, setForm] = useState({
    username: '',
    displayName: '',
    email: '',
    password: '',
    passwordConfirm: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { register, login } = useAuth()
  const navigate = useNavigate()

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (form.password !== form.passwordConfirm) {
      setError('Passwords do not match')
      return
    }

    if (form.password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)
    try {
      await register(
        form.username,
        form.email,
        form.displayName,
        form.password,
        form.passwordConfirm
      )
      // Auto-login after registration
      await login(form.email, form.password)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

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
        <h1 className="auth-title">Create account</h1>
        <p className="auth-subtitle">to start tracking bugs</p>

        {error && <div className="auth-error">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="input-group">
              <label htmlFor="reg-username">Username</label>
              <input
                id="reg-username"
                type="text"
                className="input"
                placeholder="johndoe"
                value={form.username}
                onChange={handleChange('username')}
                required
                autoFocus
              />
            </div>

            <div className="input-group">
              <label htmlFor="reg-display-name">Display Name</label>
              <input
                id="reg-display-name"
                type="text"
                className="input"
                placeholder="John Doe"
                value={form.displayName}
                onChange={handleChange('displayName')}
                required
              />
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="reg-email">Email</label>
            <input
              id="reg-email"
              type="email"
              className="input"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange('email')}
              required
            />
          </div>

          <div className="input-group">
            <label htmlFor="reg-password">Password</label>
            <input
              id="reg-password"
              type="password"
              className="input"
              placeholder="At least 6 characters"
              value={form.password}
              onChange={handleChange('password')}
              required
            />
          </div>

          <div className="input-group">
            <label htmlFor="reg-password-confirm">Confirm Password</label>
            <input
              id="reg-password-confirm"
              type="password"
              className="input"
              placeholder="Re-enter your password"
              value={form.passwordConfirm}
              onChange={handleChange('passwordConfirm')}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            id="register-submit"
          >
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </motion.div>
    </div>
  )
}
