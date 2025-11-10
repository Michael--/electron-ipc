import { useRef, useState } from 'react'

/**
 * VideoStreamDemo component - demonstrates video streaming with live playback
 */
export function VideoStreamDemo() {
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<string>('')
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [selectedVideo, setSelectedVideo] = useState<string>(
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
  )
  const videoRef = useRef<HTMLVideoElement>(null)

  const handleStartStream = () => {
    if (!window.api) return

    // eslint-disable-next-line no-console
    console.log(`[VideoStreamDemo] Starting stream for: ${selectedVideo}`)

    // Cleanup previous video URL
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl)
      setVideoUrl(null)
    }

    setError(null)
    setProgress('Initializing...')
    setIsStreaming(true)

    const chunks: Uint8Array[] = []
    let totalBytes = 0

    // eslint-disable-next-line no-console
    console.log('[VideoStreamDemo] Starting download...')

    window.streamApi.downloadStreamVideo(
      { url: selectedVideo },
      (chunk: Uint8Array) => {
        // eslint-disable-next-line no-console
        console.log('[VideoStreamDemo] Received chunk:', chunk.length, 'bytes')
        chunks.push(chunk)
        totalBytes += chunk.length
        setProgress(`Downloading ${(totalBytes / 1024 / 1024).toFixed(2)} MB...`)
      },
      () => {
        // Stream complete - create blob and play
        // eslint-disable-next-line no-console
        console.log('[VideoStreamDemo] Stream complete, creating video blob...')

        try {
          // @ts-expect-error - Uint8Array is BlobPart compatible at runtime
          const blob = new Blob(chunks, { type: 'video/mp4' })
          const url = URL.createObjectURL(blob)

          // eslint-disable-next-line no-console
          console.log('[VideoStreamDemo] Video blob created, size:', blob.size, 'bytes')

          setVideoUrl(url)
          setProgress(`Complete: ${(totalBytes / 1024 / 1024).toFixed(2)} MB - Ready to play!`)
          setIsStreaming(false)

          // Auto-play when ready
          if (videoRef.current) {
            videoRef.current.src = url
            videoRef.current.load()
          }
        } catch (err) {
          console.error('[VideoStreamDemo] Error creating blob:', err)
          setError(err instanceof Error ? err.message : 'Failed to create video')
          setIsStreaming(false)
        }
      },
      (err: Error) => {
        console.error('[VideoStreamDemo] Error:', err)
        setError(err.message)
        setIsStreaming(false)
      }
    )
  }

  return (
    <div className="demo-card stream">
      <h3 className="demo-title">🎬 Video Stream</h3>
      <p className="demo-description">Stream video from main process with live playback</p>
      <div className="demo-controls">
        <select
          value={selectedVideo}
          onChange={(e) => setSelectedVideo(e.target.value)}
          disabled={isStreaming}
        >
          <option value="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4">
            Big Buck Bunny (158MB)
          </option>
          <option value="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4">
            Elephants Dream (76MB)
          </option>
          <option value="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4">
            For Bigger Blazes (6MB)
          </option>
        </select>
        <button onClick={handleStartStream} disabled={isStreaming}>
          {isStreaming ? 'Downloading...' : 'Stream Video'}
        </button>
      </div>
      {error && <div className="demo-error">Error: {error}</div>}
      {progress && <div className="demo-result">{progress}</div>}
      <video
        ref={videoRef}
        controls
        key="video-stream"
        style={{ width: '100%', marginTop: '10px', borderRadius: '4px', backgroundColor: '#000' }}
      />
    </div>
  )
}
