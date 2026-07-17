import { HiExclamationCircle, HiLightBulb, HiClipboardList } from 'react-icons/hi'

const STATUS_LABELS = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
}

const PRIORITY_LABELS = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

const TYPE_LABELS = {
  bug: 'Bug',
  feature: 'Feature',
  task: 'Task',
}

export function StatusBadge({ status }) {
  return (
    <span className={`badge badge-${status}`}>
      {STATUS_LABELS[status] || status}
    </span>
  )
}

export function PriorityBadge({ priority }) {
  return (
    <span className={`badge badge-${priority}`}>
      {PRIORITY_LABELS[priority] || priority}
    </span>
  )
}

export function TypeBadge({ type }) {
  return (
    <span className={`badge badge-${type}`}>
      {TYPE_LABELS[type] || type}
    </span>
  )
}

export function TypeIcon({ type, size = 16 }) {
  const style = { fontSize: size }
  switch (type) {
    case 'bug':
      return <HiExclamationCircle style={{ ...style, color: 'var(--color-error)' }} />
    case 'feature':
      return <HiLightBulb style={{ ...style, color: '#2e7d32' }} />
    case 'task':
      return <HiClipboardList style={{ ...style, color: 'var(--color-primary)' }} />
    default:
      return <HiExclamationCircle style={{ ...style, color: 'var(--color-text-tertiary)' }} />
  }
}
