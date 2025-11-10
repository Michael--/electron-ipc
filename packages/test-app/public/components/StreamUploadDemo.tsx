import { useEffect, useRef, useState } from 'react'

/**
 * StreamUploadDemo component - demonstrates streaming upload to main process
 */
export function StreamUploadDemo() {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadMessages, setUploadMessages] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const outputRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [uploadMessages])

  const handleStartUpload = async () => {
    if (!window.api) return

    setUploadMessages([])
    setError(null)
    setIsUploading(true)

    try {
      const fileName = 'demo-file.txt'
      const writer = window.streamApi.uploadUploadFile({ fileName })

      // Upload 10 chunks over 10 seconds
      for (let i = 1; i <= 10; i++) {
        const text = `File chunk ${i}/10 - ${new Date().toLocaleTimeString()}`
        const encoder = new TextEncoder()
        const chunk = encoder.encode(text)
        await writer.write(chunk)
        setUploadMessages((prev) => [...prev, `✓ Uploaded chunk ${i}/10 to ${fileName}`])

        // Wait 1 second before next chunk
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }

      await writer.close()
      setUploadMessages((prev) => [...prev, `✅ Upload complete: ${fileName}`])
      setIsUploading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload error')
      setIsUploading(false)
    }
  }

  return (
    <div className="demo-card stream">
      <h3 className="demo-title">📤 Stream Upload</h3>
      <p className="demo-description">Upload file chunks from renderer to main process</p>
      <div className="demo-controls">
        <button onClick={handleStartUpload} disabled={isUploading}>
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
    </div>
  )
}
