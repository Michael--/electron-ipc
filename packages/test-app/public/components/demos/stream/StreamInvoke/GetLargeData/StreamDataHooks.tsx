import { useStreamInvokeContracts } from '@gen/ipc-stream-api-react-hooks'
import { useState } from 'react'
import { StreamDataUI } from './StreamDataUI'

/**
 * StreamData demo using React hooks
 * @returns Hooks-based StreamData component
 */
export function StreamDataHooks() {
  const [messages, setMessages] = useState<string[]>([])
  const { isStreaming, error, invokeStream } = useStreamInvokeContracts('GetLargeData')

  const handleStartStream = () => {
    setMessages([])
    invokeStream(
      { id: 'demo-stream' },
      {
        onData: (chunk) => {
          setMessages((prev) => [...prev, chunk])
        },
      }
    )
  }

  return (
    <StreamDataUI
      messages={messages}
      isStreaming={isStreaming}
      error={error}
      onStartStream={handleStartStream}
    />
  )
}
