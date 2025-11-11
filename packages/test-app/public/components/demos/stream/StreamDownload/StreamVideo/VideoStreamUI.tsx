import { useRef } from 'react'

interface VideoStreamUIProps {
  isStreaming: boolean
  error: string | null
  progress: string
  videoUrl: string | null
  selectedVideo: string
  onVideoChange: (url: string) => void
  onStartStream: () => void
}

/**
 * Presentational component for VideoStream demo
 * @param props - UI properties
 * @returns VideoStream UI component
 */
export function VideoStreamUI({
  isStreaming,
  error,
  progress,
  videoUrl,
  selectedVideo,
  onVideoChange,
  onStartStream,
}: VideoStreamUIProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  return (
    <>
      <div className="demo-controls">
        <select
          value={selectedVideo}
          onChange={(e) => onVideoChange(e.target.value)}
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
        <button onClick={onStartStream} disabled={isStreaming}>
          {isStreaming ? 'Downloading...' : 'Stream Video'}
        </button>
      </div>
      {error && <div className="demo-error">Error: {error}</div>}
      {progress && <div className="demo-result">{progress}</div>}
      <video
        ref={videoRef}
        controls
        src={videoUrl || undefined}
        style={{ width: '100%', marginTop: '10px', borderRadius: '4px', backgroundColor: '#000' }}
      />
    </>
  )
}
