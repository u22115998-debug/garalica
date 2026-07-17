import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import api from '../api'
import { useAuth } from '../contexts/AuthContext'
import MarkdownRenderer from '../components/MarkdownRenderer'
import { HiGlobe, HiPencil, HiCamera, HiCalendar, HiTicket, HiChatAlt } from 'react-icons/hi'

export default function ProfilePage() {
  const { username } = useParams()
  const { user: currentUser, refreshUser } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)

  const [form, setForm] = useState({
    display_name: '',
    bio: '',
    readme: '',
    website_url: '',
    github_url: '',
    twitter_url: '',
  })

  useEffect(() => {
    fetchProfile()
  }, [username])

  const fetchProfile = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/users/${username}`)
      setProfile(res.data)
      setForm({
        display_name: res.data.display_name || '',
        bio: res.data.bio || '',
        readme: res.data.readme || '',
        website_url: res.data.website_url || '',
        github_url: res.data.github_url || '',
        twitter_url: res.data.twitter_url || '',
      })
    } catch (err) {
      setError('User not found')
    } finally {
      setLoading(false)
    }
  }

  const isOwner = currentUser && profile && (currentUser.id === profile.id || currentUser.is_admin)

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await api.patch(`/users/${username}`, form)
      setProfile(res.data)
      setEditing(false)
      if (currentUser?.username === username) refreshUser()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const formData = new FormData()
    let safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')
    if (safeName.length > 100) {
      const ext = safeName.substring(safeName.lastIndexOf('.')) || ''
      safeName = safeName.substring(0, 90) + ext
    }
    formData.append('file', file, safeName)
    try {
      const res = await api.post(`/users/${username}/avatar`, formData)
      setProfile(res.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to upload avatar')
    }
    e.target.value = ''
  }

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  const getInitials = (name) => {
    return name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || '?'
  }

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className="loading-spinner" style={{ flex: 1 }}>
        <div className="spinner" />
      </div>
    )
  }

  if (error && !profile) {
    return (
      <div className="empty-state" style={{ flex: 1 }}>
        <div style={{ fontSize: '3rem', opacity: 0.3, marginBottom: 16 }}>👤</div>
        <h3>User not found</h3>
        <p>The profile you're looking for doesn't exist.</p>
        <Link to="/" className="btn btn-primary" style={{ marginTop: 20 }}>Go Home</Link>
      </div>
    )
  }

  return (
    <motion.div
      className="profile-page"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      {/* Profile Header */}
      <div className="profile-header card">
        <div className="profile-header-inner">
          {/* Avatar */}
          <div className="profile-avatar-wrapper">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.display_name}
                className="profile-avatar"
              />
            ) : (
              <div className="profile-avatar profile-avatar-placeholder">
                {getInitials(profile.display_name)}
              </div>
            )}
            {isOwner && (
              <>
                <button
                  className="profile-avatar-edit"
                  onClick={() => fileInputRef.current?.click()}
                  title="Change avatar"
                >
                  <HiCamera size={16} />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  style={{ display: 'none' }}
                />
              </>
            )}
          </div>

          {/* Info */}
          <div className="profile-info">
            <div className="profile-name-row">
              <h1 className="profile-display-name">{profile.display_name}</h1>
              {profile.is_admin && (
                <span className="admin-badge">Admin</span>
              )}
            </div>
            <div className="profile-username">@{profile.username}</div>
            {profile.bio && (
              <p className="profile-bio">{profile.bio}</p>
            )}

            {/* Stats */}
            <div className="profile-stats">
              <div className="profile-stat">
                <HiTicket size={14} />
                <span><strong>{profile.issue_count}</strong> issues</span>
              </div>
              <div className="profile-stat">
                <HiChatAlt size={14} />
                <span><strong>{profile.comment_count}</strong> comments</span>
              </div>
              <div className="profile-stat">
                <HiCalendar size={14} />
                <span>Joined {formatDate(profile.created_at)}</span>
              </div>
            </div>

            {/* Links */}
            <div className="profile-links">
              {profile.website_url && (
                <a href={profile.website_url} target="_blank" rel="noopener noreferrer" className="profile-link">
                  <HiGlobe size={14} />
                  <span>{profile.website_url.replace(/^https?:\/\//, '').replace(/\/$/, '')}</span>
                </a>
              )}
              {profile.github_url && (
                <a href={profile.github_url} target="_blank" rel="noopener noreferrer" className="profile-link">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
                  <span>{profile.github_url.replace(/^https?:\/\/(www\.)?github\.com\//, '')}</span>
                </a>
              )}
              {profile.twitter_url && (
                <a href={profile.twitter_url} target="_blank" rel="noopener noreferrer" className="profile-link">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                  <span>{profile.twitter_url.replace(/^https?:\/\/(www\.)?(twitter|x)\.com\//, '@')}</span>
                </a>
              )}
            </div>

            {isOwner && !editing && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setEditing(true)}
                style={{ marginTop: 16 }}
              >
                <HiPencil size={14} /> Edit Profile
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Edit Form */}
      {editing && isOwner && (
        <motion.div
          className="profile-edit card"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 20 }}>Edit Profile</h2>

          {error && <div className="auth-error" style={{ marginBottom: 16 }}>{error}</div>}

          <div className="auth-form">
            <div className="form-row">
              <div className="input-group">
                <label htmlFor="edit-name">Display Name</label>
                <input
                  id="edit-name"
                  type="text"
                  className="input"
                  value={form.display_name}
                  onChange={handleChange('display_name')}
                />
              </div>
              <div className="input-group">
                <label htmlFor="edit-bio">Bio</label>
                <input
                  id="edit-bio"
                  type="text"
                  className="input"
                  placeholder="A short bio about yourself"
                  value={form.bio}
                  onChange={handleChange('bio')}
                  maxLength={512}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="input-group">
                <label htmlFor="edit-website">Website</label>
                <input
                  id="edit-website"
                  type="url"
                  className="input"
                  placeholder="https://yoursite.com"
                  value={form.website_url}
                  onChange={handleChange('website_url')}
                />
              </div>
              <div className="input-group">
                <label htmlFor="edit-github">GitHub</label>
                <input
                  id="edit-github"
                  type="url"
                  className="input"
                  placeholder="https://github.com/username"
                  value={form.github_url}
                  onChange={handleChange('github_url')}
                />
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="edit-twitter">Twitter / X</label>
              <input
                id="edit-twitter"
                type="url"
                className="input"
                placeholder="https://x.com/username"
                value={form.twitter_url}
                onChange={handleChange('twitter_url')}
              />
            </div>

            <div className="input-group">
              <label htmlFor="edit-readme">README (Markdown)</label>
              <textarea
                id="edit-readme"
                className="input"
                placeholder="Tell the world about yourself… (Markdown supported)"
                value={form.readme}
                onChange={handleChange('readme')}
                rows={8}
              />
              <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-tertiary)' }}>
                Markdown formatting is supported
              </span>
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* README */}
      {profile.readme && (
        <div className="profile-readme card">
          <h2 style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 16 }}>
            README
          </h2>
          <MarkdownRenderer content={profile.readme} />
        </div>
      )}
    </motion.div>
  )
}
