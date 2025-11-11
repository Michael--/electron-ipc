import { useStreamUploadContracts } from '@gen/ipc-stream-api-react-hooks'
import { useState } from 'react'
import { StreamUploadUI } from './StreamUploadUI'

/**
 * StreamUpload demo using React hooks
 * @returns Hooks-based StreamUpload component
 */
export function StreamUploadHooks() {
  const [uploadMessages, setUploadMessages] = useState<string[]>([])
  const { isActive, error, start, write, close } = useStreamUploadContracts('UploadFile')

  const handleStartUpload = async () => {
    setUploadMessages([])

    const fileName = 'demo-file.txt'
    start({ fileName })

    try {
      for (let i = 1; i <= 10; i++) {
        const text = `File chunk ${i}/10 - ${new Date().toLocaleTimeString()}`
        const encoder = new TextEncoder()
        const chunk = encoder.encode(text)
        await write(chunk)
        setUploadMessages((prev) => [...prev, `✓ Uploaded chunk ${i}/10 to ${fileName}`])
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }

      await close()
      setUploadMessages((prev) => [...prev, `✅ Upload complete: ${fileName}`])
    } catch (err) {
      setUploadMessages((prev) => [
        ...prev,
        `❌ Error: ${err instanceof Error ? err.message : 'Upload error'}`,
      ])
    }
  }

  return (
    <StreamUploadUI
      uploadMessages={uploadMessages}
      isUploading={isActive}
      error={error?.message || null}
      onStartUpload={handleStartUpload}
    />
  )
}
