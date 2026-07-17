import { useRef, useState } from 'react'
import { HiUpload, HiX } from 'react-icons/hi'

export default function FileUpload({ files, onChange }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)

  const handleDragOver = (e) => {
    e.preventDefault()
    setDragging(true)
  }

  const handleDragLeave = () => setDragging(false)

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const dropped = Array.from(e.dataTransfer.files)
    onChange([...files, ...dropped])
  }

  const handleFileSelect = (e) => {
    const selected = Array.from(e.target.files)
    onChange([...files, ...selected])
    e.target.value = ''
  }

  const removeFile = (index) => {
    onChange(files.filter((_, i) => i !== index))
  }

  const isImage = (file) => file.type.startsWith('image/')

  return (
    <div>
      <div
        className={`file-upload-zone ${dragging ? 'dragging' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <HiUpload className="upload-icon" />
        <p>Drop files here or click to upload</p>
        <p style={{ fontSize: '0.6875rem', color: 'var(--color-text-tertiary)', marginTop: 4 }}>
          Images (JPEG, PNG, GIF, WebP) and Videos (MP4, WebM)
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,video/*"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {files.length > 0 && (
        <div className="upload-preview-list">
          {files.map((file, index) => (
            <div key={index} className="upload-preview-item">
              {isImage(file) ? (
                <img src={URL.createObjectURL(file)} alt={file.name} />
              ) : (
                <div style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--color-bg)',
                  fontSize: '0.625rem',
                  color: 'var(--color-text-tertiary)',
                  padding: 4,
                  textAlign: 'center',
                  wordBreak: 'break-all',
                }}>
                  {file.name}
                </div>
              )}
              <button
                className="upload-preview-remove"
                onClick={(e) => { e.stopPropagation(); removeFile(index) }}
                type="button"
              >
                <HiX />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
