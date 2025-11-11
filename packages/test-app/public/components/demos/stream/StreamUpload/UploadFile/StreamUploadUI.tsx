import { useEffect, useRef } from 'react'

interface StreamUploadUIProps {
  uploadMessages: string[]
  isUploading: boolean
  error: string | null
  onStartUpload: () => void
}

/**
 * Presentational component for StreamUpload demo
 * @param props - UI properties
 * @returns StreamUpload UI component
 */
export function StreamUploadUI({
  uploadMessages,
  isUploading,
  error,
  onStartUpload,
}: StreamUploadUIProps) {
  const outputRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [uploadMessages])

  return (
    <>
      <div className="demo-controls">
        <button onClick={onStartUpload} disabled={isUploading}>
          {isUploading ? 'Uploading...' : 'Start Upload'}
        </button>
      </div>
      {error && <div className="demo-error">Error: {error}</div>}
      <div className="demo-result stream-output" ref={outputRef}>
        {uploadMessages.length === 0 && !isUploading && <em>No uploads yet</em>}
        {uploadMessages.map((msg, idx) => (
          <div key={idx} className="stream-message">
            {msg}
          </div>
        ))}
      </div>
    </>
  )
}
