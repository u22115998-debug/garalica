import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import api from '../api'
import { useAuth } from '../contexts/AuthContext'
import FileUpload from '../components/FileUpload'
import { HiArrowLeft } from 'react-icons/hi'

export default function CreateIssuePage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'medium',
    issue_type: 'bug',
  })
  const [files, setFiles] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) {
      setError('Title is required')
      return
    }

    setError('')
    setLoading(true)

    let issueKey = null

    try {
      // Step 1: Create the issue
      const res = await api.post('/issues', form)
      issueKey = res.data.key
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create issue')
      setLoading(false)
      return
    }

    // Step 2: Upload attachments (issue already created at this point)
    if (files.length > 0 && issueKey) {
      let uploadErrors = 0
      for (const file of files) {
        try {
          const formData = new FormData()
          // Sanitize filename: replace non-ascii or special chars to avoid backend 422 errors
          let safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')
          if (safeName.length > 100) {
            const ext = safeName.substring(safeName.lastIndexOf('.')) || ''
            safeName = safeName.substring(0, 90) + ext
          }
          formData.append('file', file, safeName)
          await api.post(`/issues/${issueKey}/attachments`, formData)
        } catch (err) {
          console.error('Failed to upload attachment:', err)
          uploadErrors++
        }
      }
      if (uploadErrors > 0) {
        console.warn(`${uploadErrors} attachment(s) failed to upload for ${issueKey}`)
      }
    }

    setLoading(false)
    navigate(issueKey ? `/${issueKey.toLowerCase()}` : '/')
  }

  if (!user) {
    navigate('/login')
    return null
  }

  return (
    <motion.div
      className="create-issue-page"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <button
        className="btn btn-ghost btn-sm"
        onClick={() => navigate(-1)}
        style={{ marginBottom: 16 }}
      >
        <HiArrowLeft /> Back
      </button>

      <h1>Create New Issue</h1>

      {error && <div className="auth-error" style={{ marginBottom: 16 }}>{error}</div>}

      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="input-group">
          <label htmlFor="issue-title">Title *</label>
          <input
            id="issue-title"
            type="text"
            className="input"
            placeholder="Brief summary of the issue"
            value={form.title}
            onChange={handleChange('title')}
            required
            autoFocus
          />
        </div>

        <div className="form-row">
          <div className="input-group">
            <label htmlFor="issue-type">Type</label>
            <select
              id="issue-type"
              className="input"
              value={form.issue_type}
              onChange={handleChange('issue_type')}
            >
              <option value="bug">🐛 Bug</option>
              <option value="feature">💡 Feature Request</option>
              <option value="task">📋 Task</option>
            </select>
          </div>

          <div className="input-group">
            <label htmlFor="issue-priority">Priority</label>
            <select
              id="issue-priority"
              className="input"
              value={form.priority}
              onChange={handleChange('priority')}
            >
              <option value="critical">🔴 Critical</option>
              <option value="high">🟠 High</option>
              <option value="medium">🟡 Medium</option>
              <option value="low">🟢 Low</option>
            </select>
          </div>
        </div>

        <div className="input-group">
          <label htmlFor="issue-description">Description</label>
          <textarea
            id="issue-description"
            className="input"
            placeholder="Detailed description… (Markdown supported)"
            value={form.description}
            onChange={handleChange('description')}
            rows={8}
          />
          <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-tertiary)' }}>
            Markdown formatting is supported
          </span>
        </div>

        <div className="input-group">
          <label>Attachments</label>
          <FileUpload files={files} onChange={setFiles} />
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate(-1)}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            id="create-issue-submit"
          >
            {loading ? 'Creating…' : 'Create Issue'}
          </button>
        </div>
      </form>
    </motion.div>
  )
}
