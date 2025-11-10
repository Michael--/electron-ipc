import { useEffect, useRef, useState } from 'react'

/**
 * StreamDataDemo component - demonstrates streaming data from main process
 */
export function StreamDataDemo() {
  const [messages, setMessages] = useState<string[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const outputRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [messages])

  const handleStartStream = () => {
    if (!window.api) return

    setMessages([])
    setError(null)
    setIsStreaming(true)

    window.streamApi.invokeStreamGetLargeData(
      { id: 'demo-stream' },
      {
        onData: (chunk) => {
          setMessages((prev) => [...prev, chunk])
        },
        onEnd: () => {
          setIsStreaming(false)
        },
        onError: (err) => {
          setError(err.message)
          setIsStreaming(false)
        },
      }
    )
  }

  return (
    <div className="demo-card stream">
      <h3 className="demo-title">🌊 Stream Data</h3>
      <p className="demo-description">Request triggers a 10-second data stream from main process</p>
      <div className="demo-controls">
        <button onClick={handleStartStream} disabled={isStreaming}>
          {isStreaming ? 'Streaming...' : 'Start Stream'}
        </button>
      </div>
      {error && <div className="demo-error">Error: {error}</div>}
      <div className="demo-result stream-output" ref={outputRef}>
        {messages.length === 0 && !isStreaming && <em>No messages yet</em>}
        {messages.map((msg, idx) => (
          <div key={idx} className="stream-message">
            {msg}
          </div>
        ))}
      </div>
    </div>
  )
}
