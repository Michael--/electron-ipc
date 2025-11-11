import { useStreamInvokeContracts } from '@gen/ipc-stream-api-react-hooks'
import { StreamDataUI } from './StreamDataUI'

/**
 * StreamData demo using React hooks
 * @returns Hooks-based StreamData component
 */
export function StreamDataHooks() {
  const { data, loading, error, invoke } = useStreamInvokeContracts('GetLargeData')

  const handleStartStream = () => {
    invoke({ id: 'demo-stream' })
  }

  return (
    <StreamDataUI
      messages={data}
      isStreaming={loading}
      error={error?.message || null}
      onStartStream={handleStartStream}
    />
  )
}
