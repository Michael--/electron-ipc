import { useBroadcastContracts } from '@gen/ipc-api-react-hooks'
import { useEffect } from 'react'
import { PingUI } from './PingUI'

/**
 * Ping demo using React hooks
 * @returns Hooks-based Ping component
 */
export function PingHooks() {
  const { data, subscribe } = useBroadcastContracts('Ping')

  useEffect(() => {
    return subscribe()
  }, [subscribe])

  return <PingUI count={data ?? 0} />
}
