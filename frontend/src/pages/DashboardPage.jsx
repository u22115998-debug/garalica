import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useParams, useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../api'
import { useAuth } from '../contexts/AuthContext'
import { StatusBadge, PriorityBadge, TypeBadge, TypeIcon } from '../components/Badges'
import MarkdownRenderer from '../components/MarkdownRenderer'
import Pagination from '../components/Pagination'
import { HiClock, HiUser, HiChatAlt, HiPaperClip, HiInbox } from 'react-icons/hi'

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
]

const SORT_OPTIONS = [
  { value: 'created', label: 'Created' },
  { value: 'updated', label: 'Updated' },
]

export default function DashboardPage({ searchQuery }) {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const { issueKey } = useParams()
  const navigate = useNavigate()

  const [issues, setIssues] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [statusFilter, setStatusFilter] = useState('')
  const [sortBy, setSortBy] = useState('created')
  const [sortDir, setSortDir] = useState('desc')
  const [selectedIssue, setSelectedIssue] = useState(null)
  const [comments, setComments] = useState([])
  const [attachments, setAttachments] = useState([])
  const [commentText, setCommentText] = useState('')
  const [loading, setLoading] = useState(true)
  const [submittingComment, setSubmittingComment] = useState(false)

  const reporterFilter = searchParams.get('reporter') || ''

  const fetchIssues = useCallback(async () => {
    setLoading(true)
    try {
      const params = {
        page,
        page_size: pageSize,
        sort_by: sortBy,
        sort_dir: sortDir,
      }
      if (statusFilter) params.status = statusFilter
      if (searchQuery) params.search = searchQuery
      if (reporterFilter) params.reporter_id = reporterFilter

      const res = await api.get('/issues', { params })
      setIssues(res.data.issues)
      setTotal(res.data.total)
    } catch (err) {
      console.error('Failed to fetch issues:', err)
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, statusFilter, sortBy, sortDir, searchQuery, reporterFilter])

  useEffect(() => {
    fetchIssues()
  }, [fetchIssues])

  // Reset page when filters change
  useEffect(() => {
    setPage(1)
  }, [statusFilter, searchQuery, reporterFilter])

  const loadIssueDetails = useCallback(async (issue) => {
    setSelectedIssue(issue)
    try {
      const [commentsRes, attachmentsRes] = await Promise.all([
        api.get(`/issues/${issue.key}/comments`),
        api.get(`/issues/${issue.key}/attachments`),
      ])
      setComments(commentsRes.data)
      setAttachments(attachmentsRes.data)
    } catch (err) {
      console.error('Failed to load issue details:', err)
    }
  }, [])

  useEffect(() => {
    if (!issueKey) {
      setSelectedIssue(null)
      setComments([])
      setAttachments([])
      return
    }

    if (selectedIssue?.key?.toLowerCase() === issueKey.toLowerCase()) return

    const loadIssueFromUrl = async () => {
      try {
        const res = await api.get(`/issues/${issueKey.toUpperCase()}`)
        loadIssueDetails(res.data)
      } catch (err) {
        console.error('Failed to load issue from URL:', err)
        setSelectedIssue(null)
        setComments([])
        setAttachments([])
      }
    }

    loadIssueFromUrl()
  }, [issueKey, selectedIssue?.key, loadIssueDetails])

  const selectIssue = (issue) => {
    navigate(`/${issue.key.toLowerCase()}`)
    loadIssueDetails(issue)
  }

  const handleStatusChange = async (newStatus) => {
    if (!selectedIssue || !user) return
    try {
      const res = await api.patch(`/issues/${selectedIssue.key}`, { status: newStatus })
      setSelectedIssue(res.data)
      fetchIssues()
    } catch (err) {
      console.error('Failed to update status:', err)
    }
  }

  const submitComment = async (e) => {
    e.preventDefault()
    if (!commentText.trim() || !selectedIssue) return
    setSubmittingComment(true)
    try {
      await api.post(`/issues/${selectedIssue.key}/comments`, { body: commentText })
      setCommentText('')
      const res = await api.get(`/issues/${selectedIssue.key}/comments`)
      setComments(res.data)
    } catch (err) {
      console.error('Failed to post comment:', err)
    } finally {
      setSubmittingComment(false)
    }
  }

  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const timeAgo = (dateStr) => {
    const now = new Date()
    const date = new Date(dateStr)
    const diff = now - date
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 30) return `${days}d ago`
    return formatDate(dateStr)
  }

  const getInitials = (name) => {
    return name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || '?'
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="app-layout">
      {/* Sidebar — Issue List */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>
            {reporterFilter ? 'My Issues' : 'Open Issues'}
            <span style={{ fontWeight: 400, color: 'var(--color-text-tertiary)', marginLeft: 8 }}>
              {total}
            </span>
          </h2>
          <div style={{ display: 'flex', gap: 4 }}>
            <select
              className="input"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{ padding: '4px 28px 4px 8px', fontSize: '0.75rem', width: 'auto', borderRadius: 'var(--radius-full)' }}
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <button
              className="btn btn-ghost btn-icon btn-sm"
              onClick={() => setSortDir(sortDir === 'desc' ? 'asc' : 'desc')}
              title={sortDir === 'desc' ? 'Descending' : 'Ascending'}
              style={{ fontSize: '0.75rem', minWidth: 28 }}
            >
              {sortDir === 'desc' ? '↓' : '↑'}
            </button>
          </div>
        </div>

        <div className="sidebar-filters">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              className={`filter-chip ${statusFilter === f.value ? 'active' : ''}`}
              onClick={() => setStatusFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="sidebar-list">
          {loading ? (
            <div className="loading-spinner">
              <div className="spinner" />
            </div>
          ) : issues.length === 0 ? (
            <div className="empty-state">
              <HiInbox className="empty-state-icon" />
              <h3>No issues found</h3>
              <p>Try adjusting your filters or create a new issue</p>
            </div>
          ) : (
            issues.map((issue) => (
              <div
                key={issue.id}
                className={`issue-card ${selectedIssue?.id === issue.id ? 'active' : ''}`}
                onClick={() => selectIssue(issue)}
              >
                <div className="issue-card-header">
                  <TypeIcon type={issue.issue_type} size={14} />
                  <span className="issue-card-key">{issue.key}</span>
                  <span style={{ marginLeft: 'auto' }}>
                    <PriorityBadge priority={issue.priority} />
                  </span>
                </div>
                <div className="issue-card-title">{issue.title}</div>
                <div className="issue-card-meta">
                  <StatusBadge status={issue.status} />
                  <span>{timeAgo(issue.created_at)}</span>
                  {issue.comment_count > 0 && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <HiChatAlt size={11} /> {issue.comment_count}
                    </span>
                  )}
                  {issue.attachment_count > 0 && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <HiPaperClip size={11} /> {issue.attachment_count}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </aside>

      {/* Main Content — Issue Detail */}
      <main className="main-content">
        <AnimatePresence mode="wait">
          {selectedIssue ? (
            <motion.div
              key={selectedIssue.id}
              className="issue-detail"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {/* Header */}
              <div className="issue-detail-header">
                <div className="issue-detail-breadcrumb">
                  <TypeIcon type={selectedIssue.issue_type} size={16} />
                  <span>{selectedIssue.key}</span>
                </div>
                <h1 className="issue-detail-title">{selectedIssue.title}</h1>
                <div className="issue-detail-meta">
                  <StatusBadge status={selectedIssue.status} />
                  <PriorityBadge priority={selectedIssue.priority} />
                  <TypeBadge type={selectedIssue.issue_type} />
                </div>
              </div>

              {/* Body Grid */}
              <div className="issue-body">
                {/* Description + Comments */}
                <div className="issue-description">
                  {selectedIssue.description ? (
                    <>
                      <h3 style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>
                        Description
                      </h3>
                      <MarkdownRenderer content={selectedIssue.description} />
                    </>
                  ) : (
                    <p style={{ color: 'var(--color-text-tertiary)', fontStyle: 'italic', fontSize: '0.875rem' }}>
                      No description provided.
                    </p>
                  )}

                  {/* Attachments */}
                  {attachments.length > 0 && (
                    <div className="attachments-section">
                      <h3 style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                        Attachments ({attachments.length})
                      </h3>
                      <div className="attachments-grid">
                        {attachments.map((att) => (
                          <a
                            key={att.id}
                            href={att.filepath}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="attachment-card"
                          >
                            <div className="attachment-preview">
                              {att.mime_type.startsWith('image/') ? (
                                <img src={att.filepath} alt={att.filename} />
                              ) : att.mime_type.startsWith('video/') ? (
                                <video src={att.filepath} />
                              ) : (
                                <HiPaperClip size={24} />
                              )}
                            </div>
                            <div className="attachment-info">{att.filename}</div>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Comments */}
                  <div className="comments-section">
                    <h3 className="comments-title">
                      Comments ({comments.length})
                    </h3>

                    {comments.map((comment) => (
                      <div key={comment.id} className="comment">
                        <Link to={`/profiles/${comment.author.username}`} style={{ textDecoration: 'none' }}>
                          {comment.author.avatar_url ? (
                            <img src={comment.author.avatar_url} alt="" className="avatar avatar-sm" style={{ objectFit: 'cover' }} />
                          ) : (
                            <div className="avatar avatar-sm">
                              {getInitials(comment.author.display_name)}
                            </div>
                          )}
                        </Link>
                        <div className="comment-body">
                          <div className="comment-header">
                            <div className="comment-author-row">
                              <Link to={`/profiles/${comment.author.username}`} className="comment-author" style={{ color: 'inherit', textDecoration: 'none' }}>
                                {comment.author.display_name}
                              </Link>
                              {comment.author.is_admin && <span className="admin-badge admin-badge-sm">Admin</span>}
                            </div>
                            <span className="comment-time">{timeAgo(comment.created_at)}</span>
                          </div>
                          <MarkdownRenderer content={comment.body} />
                        </div>
                      </div>
                    ))}

                    {user && (
                      <form className="comment-form" onSubmit={submitComment}>
                        <div className="input-group">
                          <textarea
                            className="input"
                            placeholder="Add a comment… (Markdown supported)"
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            rows={3}
                            id="comment-input"
                          />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                          <button
                            type="submit"
                            className="btn btn-primary btn-sm"
                            disabled={!commentText.trim() || submittingComment}
                            id="submit-comment-btn"
                          >
                            {submittingComment ? 'Posting…' : 'Comment'}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>

                {/* Right Sidebar Panel */}
                <div className="issue-sidebar-panel">
                  {/* Status */}
                  <div className="panel-section">
                    <div className="panel-section-title">Status</div>
                    {user ? (
                      <select
                        className="input"
                        value={selectedIssue.status}
                        onChange={(e) => handleStatusChange(e.target.value)}
                        style={{ fontSize: '0.8125rem', padding: '6px 28px 6px 10px' }}
                        id="status-select"
                      >
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>
                    ) : (
                      <StatusBadge status={selectedIssue.status} />
                    )}
                  </div>

                  {/* Priority */}
                  <div className="panel-section">
                    <div className="panel-section-title">Priority</div>
                    <PriorityBadge priority={selectedIssue.priority} />
                  </div>

                  {/* Type */}
                  <div className="panel-section">
                    <div className="panel-section-title">Type</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8125rem' }}>
                      <TypeIcon type={selectedIssue.issue_type} size={14} />
                      <span style={{ textTransform: 'capitalize' }}>{selectedIssue.issue_type}</span>
                    </div>
                  </div>

                  {/* Reporter */}
                  <div className="panel-section">
                    <div className="panel-section-title">Reporter</div>
                    <Link to={`/profiles/${selectedIssue.reporter.username}`} className="meta-item" style={{ textDecoration: 'none', color: 'inherit' }}>
                      {selectedIssue.reporter.avatar_url ? (
                        <img src={selectedIssue.reporter.avatar_url} alt="" className="avatar avatar-sm" style={{ objectFit: 'cover' }} />
                      ) : (
                        <div className="avatar avatar-sm">
                          {getInitials(selectedIssue.reporter.display_name)}
                        </div>
                      )}
                      <span style={{ fontSize: '0.8125rem' }}>{selectedIssue.reporter.display_name}</span>
                      {selectedIssue.reporter.is_admin && <span className="admin-badge admin-badge-sm">Admin</span>}
                    </Link>
                  </div>

                  {/* Assignee */}
                  <div className="panel-section">
                    <div className="panel-section-title">Assignee</div>
                    {selectedIssue.assignee ? (
                      <Link to={`/profiles/${selectedIssue.assignee.username}`} className="meta-item" style={{ textDecoration: 'none', color: 'inherit' }}>
                        {selectedIssue.assignee.avatar_url ? (
                          <img src={selectedIssue.assignee.avatar_url} alt="" className="avatar avatar-sm" style={{ objectFit: 'cover' }} />
                        ) : (
                          <div className="avatar avatar-sm">
                            {getInitials(selectedIssue.assignee.display_name)}
                          </div>
                        )}
                        <span style={{ fontSize: '0.8125rem' }}>{selectedIssue.assignee.display_name}</span>
                        {selectedIssue.assignee.is_admin && <span className="admin-badge admin-badge-sm">Admin</span>}
                      </Link>
                    ) : (
                      <span className="panel-section-value" style={{ color: 'var(--color-text-tertiary)' }}>
                        Unassigned
                      </span>
                    )}
                  </div>

                  {/* Dates */}
                  <div className="panel-section">
                    <div className="panel-section-title">Dates</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div className="meta-item" style={{ fontSize: '0.75rem' }}>
                        <HiClock size={12} />
                        <span>Created {formatDate(selectedIssue.created_at)}</span>
                      </div>
                      <div className="meta-item" style={{ fontSize: '0.75rem' }}>
                        <HiClock size={12} />
                        <span>Updated {formatDate(selectedIssue.updated_at)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              className="empty-state"
              style={{ flex: 1 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <HiInbox className="empty-state-icon" />
              <h3>Select an issue</h3>
              <p>Choose an issue from the left panel to view its details</p>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}
