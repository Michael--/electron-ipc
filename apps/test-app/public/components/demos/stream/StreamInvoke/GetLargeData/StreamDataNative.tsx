import { useRef, useState } from 'react'
import { StreamDataUI } from './StreamDataUI'

/**
 * StreamData demo using native window.streamApi
 * @returns Native StreamData component
 */
export function StreamDataNative() {
  const [messages, setMessages] = useState<string[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const stopRef = useRef<(() => void) | null>(null)

  const handleStartStream = () => {
    setMessages([])
    setError(null)
    setIsStreaming(true)

    stopRef.current?.()
    stopRef.current = window.streamApi.invokeStreamGetLargeData(
      { id: 'demo-stream' },
      {
        onData: (chunk) => {
          setMessages((prev) => [...prev, chunk])
        },
        onEnd: () => {
          setIsStreaming(false)
          stopRef.current = null
        },
        onError: (err) => {
          setError(err.message)
          setIsStreaming(false)
          stopRef.current = null
        },
      }
    )
  }

  const handleStopStream = () => {
    stopRef.current?.()
    stopRef.current = null
    setIsStreaming(false)
  }

  return (
    <StreamDataUI
      messages={messages}
      isStreaming={isStreaming}
      error={error}
      onStartStream={handleStartStream}
      onStopStream={handleStopStream}
    />
  )
}
