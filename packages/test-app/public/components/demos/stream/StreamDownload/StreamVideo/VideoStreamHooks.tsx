import { useStreamDownloadContracts } from '@gen/ipc-stream-api-react-hooks'
import { useEffect, useState } from 'react'
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
  const { data, loading, error, isComplete, download } = useStreamDownloadContracts('StreamVideo')

  const handleStartStream = () => {
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl)
      setVideoUrl(null)
    }

    setProgress('Initializing...')
    download({ url: selectedVideo })
  }

  // Update progress as data arrives
  useEffect(() => {
    if (loading && data.length > 0) {
      const totalBytes = data.reduce((acc, chunk) => acc + chunk.length, 0)
      setProgress(`Downloading ${(totalBytes / 1024 / 1024).toFixed(2)} MB...`)
    }
  }, [data, loading])

  // Create video blob when complete
  useEffect(() => {
    if (isComplete && data.length > 0) {
      try {
        // @ts-expect-error - Uint8Array is BlobPart compatible at runtime
        const blob = new Blob(data, { type: 'video/mp4' })
        const url = URL.createObjectURL(blob)
        setVideoUrl(url)
        const totalBytes = data.reduce((acc, chunk) => acc + chunk.length, 0)
        setProgress(`Complete: ${(totalBytes / 1024 / 1024).toFixed(2)} MB - Ready to play!`)
      } catch (err) {
        setProgress(`Error: ${err instanceof Error ? err.message : 'Failed to create video'}`)
      }
    }
  }, [isComplete, data])

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
