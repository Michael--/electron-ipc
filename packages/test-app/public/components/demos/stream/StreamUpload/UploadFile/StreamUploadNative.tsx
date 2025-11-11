import { useState } from 'react'
import { StreamUploadUI } from './StreamUploadUI'

/**
 * StreamUpload demo using native window.streamApi
 * @returns Native StreamUpload component
 */
export function StreamUploadNative() {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadMessages, setUploadMessages] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  const handleStartUpload = async () => {
    setUploadMessages([])
    setError(null)
    setIsUploading(true)

    try {
      const fileName = 'demo-file.txt'
      const writer = window.streamApi.uploadUploadFile({ fileName })

      for (let i = 1; i <= 10; i++) {
        const text = `File chunk ${i}/10 - ${new Date().toLocaleTimeString()}`
        const encoder = new TextEncoder()
        const chunk = encoder.encode(text)
        await writer.write(chunk)
        setUploadMessages((prev) => [...prev, `✓ Uploaded chunk ${i}/10 to ${fileName}`])
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
    <StreamUploadUI
      uploadMessages={uploadMessages}
      isUploading={isUploading}
      error={error}
      onStartUpload={handleStartUpload}
    />
  )
}
