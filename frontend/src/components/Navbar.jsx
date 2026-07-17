import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { HiSearch, HiPlus, HiLogout, HiUser, HiIdentification } from 'react-icons/hi'

export default function Navbar({ searchQuery, onSearchChange }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const getInitials = (name) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        <img
          src="https://cdn.garakrral.com/garakrral_mini_logo_48px.png"
          alt="GaraKrral"
        />
        <span>Bug Tracker</span>
      </Link>

      <div className="navbar-search">
        <HiSearch className="search-icon" />
        <input
          type="text"
          className="input"
          placeholder="Search issues..."
          value={searchQuery || ''}
          onChange={(e) => onSearchChange?.(e.target.value)}
        />
      </div>

      <a
        href="https://github.com/Garalica/garalica"
        target="_blank"
        rel="noopener noreferrer"
        className="navbar-opensource"
        title="Garalica is open source"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 2C6.48 2 2 6.48 2 12c0 4.42 2.87 8.17 6.84 9.5.5.09.68-.22.68-.48 0-.24-.01-.87-.01-1.7-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.89 1.53 2.34 1.09 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.26.1-2.63 0 0 .84-.27 2.75 1.02.8-.22 1.65-.33 2.5-.34.85 0 1.7.12 2.5.34 1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.38.1 2.63.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.69-4.57 4.94.36.31.68.92.68 1.85 0 1.34-.01 2.42-.01 2.75 0 .27.18.58.69.48A10.01 10.01 0 0 0 22 12c0-5.52-4.48-10-10-10z" />
        </svg>
        Garalica is open source
      </a>

      <div className="navbar-actions">
        {user ? (
          <>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => navigate('/create')}
              id="create-issue-btn"
            >
              <HiPlus />
              New Issue
            </button>

            <div className="dropdown" ref={dropdownRef}>
              <div
                className="navbar-user"
                onClick={() => setShowDropdown(!showDropdown)}
                id="user-menu-btn"
              >
                <div className="avatar">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    getInitials(user.display_name)
                  )}
                </div>
              </div>

              {showDropdown && (
                <div className="dropdown-menu">
                  <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--color-border-light)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{user.display_name}</span>
                      {user.is_admin && <span className="admin-badge admin-badge-sm">Admin</span>}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>{user.email}</div>
                  </div>
                  <button className="dropdown-item" onClick={() => { setShowDropdown(false); navigate(`/profiles/${user.username}`) }}>
                    <HiIdentification /> My Profile
                  </button>
                  <button className="dropdown-item" onClick={() => { setShowDropdown(false); navigate(`/?reporter=${user.id}`) }}>
                    <HiUser /> My Issues
                  </button>
                  <div className="dropdown-divider" />
                  <button className="dropdown-item" onClick={handleLogout} style={{ color: 'var(--color-error)' }}>
                    <HiLogout /> Sign Out
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <Link to="/login" className="btn btn-ghost btn-sm">Sign In</Link>
            <Link to="/register" className="btn btn-primary btn-sm">Sign Up</Link>
          </>
        )}
      </div>
    </nav>
  )
}
