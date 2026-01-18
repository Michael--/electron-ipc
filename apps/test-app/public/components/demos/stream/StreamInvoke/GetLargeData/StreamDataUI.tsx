import { useEffect, useRef } from 'react'

interface StreamDataUIProps {
  messages: string[]
  isStreaming: boolean
  error: string | null
  onStartStream: () => void
  onStopStream?: () => void
}

/**
 * Presentational component for StreamData demo
 * @param props - UI properties
 * @returns StreamData UI component
 */
export function StreamDataUI({
  messages,
  isStreaming,
  error,
  onStartStream,
  onStopStream,
}: StreamDataUIProps) {
  const outputRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [messages])

  return (
    <>
      <div className="demo-controls">
        <button onClick={onStartStream} disabled={isStreaming}>
          {isStreaming ? 'Streaming...' : 'Start Stream'}
        </button>
        {isStreaming && onStopStream && <button onClick={onStopStream}>Stop</button>}
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
    </>
  )
}
