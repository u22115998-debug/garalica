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
