import { useStreamDownloadContracts } from '@gen/ipc-stream-api-react-hooks'
import { useState } from 'react'
import { VideoStreamUI } from './VideoStreamUI'

/**
 * VideoStream demo using React hooks
 * @returns Hooks-based VideoStream component
 */
export function VideoStreamHooks() {
  const [progress, setProgress] = useState<string>('')
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [selectedVideo, setSelectedVideo] = useState<string>(
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
  )
  const { loading, error, download } = useStreamDownloadContracts('StreamVideo')

  const handleStartStream = () => {
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl)
      setVideoUrl(null)
    }

    setProgress('Initializing...')
    download({ url: selectedVideo })
    setProgress('Download started via hooks...')
  }

  return (
    <VideoStreamUI
      isStreaming={loading}
      error={error?.message || null}
      progress={progress}
      videoUrl={videoUrl}
      selectedVideo={selectedVideo}
      onVideoChange={setSelectedVideo}
      onStartStream={handleStartStream}
    />
  )
}
