import { useRef } from 'react'

interface VideoStreamUIProps {
  isStreaming: boolean
  error: string | null
  progress: string
  videoUrl: string | null
  selectedVideo: string
  onVideoChange: (url: string) => void
  onStartStream: () => void
  onStopStream?: () => void
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
  onStopStream,
}: VideoStreamUIProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  return (
    <>
      <div className="demo-controls">
        <select
          value={selectedVideo}
          onChange={(e) => onVideoChange(e.target.value)}
          disabled={isStreaming}
          data-testid="stream-video-select"
        >
          <option value="https://www.w3schools.com/html/mov_bbb.mp4">
            Big Buck Bunny (short clip)
          </option>
          <option value="https://filesamples.com/samples/video/mp4/sample_640x360.mp4">
            Sample Video (640x360)
          </option>
          <option value="https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_1MB.mp4">
            Big Buck Bunny 720p (10s)
          </option>
        </select>
        <button onClick={onStartStream} disabled={isStreaming} data-testid="stream-video-start">
          {isStreaming ? 'Downloading...' : 'Stream Video'}
        </button>
        {isStreaming && onStopStream && (
          <button onClick={onStopStream} data-testid="stream-video-stop">
            Stop
          </button>
        )}
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
