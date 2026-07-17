import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

export default function NotFoundPage() {
  return (
    <motion.div
      className="empty-state"
      style={{ minHeight: '80vh' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div style={{ fontSize: '4rem', marginBottom: 16, opacity: 0.3 }}>404</div>
      <h3>Page not found</h3>
      <p style={{ marginBottom: 24 }}>The page you're looking for doesn't exist.</p>
      <Link to="/" className="btn btn-primary">Go Home</Link>
    </motion.div>
  )
}
