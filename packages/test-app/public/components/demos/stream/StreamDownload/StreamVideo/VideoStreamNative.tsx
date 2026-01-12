import { useRef, useState } from 'react'
import { VideoStreamUI } from './VideoStreamUI'

/**
 * VideoStream demo using native window.streamApi
 * @returns Native VideoStream component
 */
export function VideoStreamNative() {
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<string>('')
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [selectedVideo, setSelectedVideo] = useState<string>(
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
  )
  const stopRef = useRef<(() => void) | null>(null)

  const handleStartStream = () => {
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl)
      setVideoUrl(null)
    }

    setError(null)
    setProgress('Initializing...')
    setIsStreaming(true)

    const chunks: Uint8Array[] = []
    let totalBytes = 0

    stopRef.current?.()
    stopRef.current = window.streamApi.downloadStreamVideo(
      { url: selectedVideo },
      (chunk: Uint8Array) => {
        chunks.push(chunk)
        totalBytes += chunk.length
        setProgress(`Downloading ${(totalBytes / 1024 / 1024).toFixed(2)} MB...`)
      },
      () => {
        try {
          // @ts-expect-error - Uint8Array is BlobPart compatible at runtime
          const blob = new Blob(chunks, { type: 'video/mp4' })
          const url = URL.createObjectURL(blob)
          setVideoUrl(url)
          setProgress(`Complete: ${(totalBytes / 1024 / 1024).toFixed(2)} MB - Ready to play!`)
          setIsStreaming(false)
          stopRef.current = null
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to create video')
          setIsStreaming(false)
          stopRef.current = null
        }
      },
      (err: Error) => {
        setError(err.message)
        setIsStreaming(false)
        stopRef.current = null
      }
    )
  }

  const handleStopStream = () => {
    stopRef.current?.()
    stopRef.current = null
    setIsStreaming(false)
  }

  return (
    <VideoStreamUI
      isStreaming={isStreaming}
      error={error}
      progress={progress}
      videoUrl={videoUrl}
      selectedVideo={selectedVideo}
      onVideoChange={setSelectedVideo}
      onStartStream={handleStartStream}
      onStopStream={handleStopStream}
    />
  )
}
