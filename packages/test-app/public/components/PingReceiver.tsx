import React from 'react'
import { useBroadcastBroadcastContracts } from '../../src/preload/api-react-hooks-generated'

/**
 * PingReceiver component - displays broadcast ping counter using React hooks
 */
export function PingReceiver() {
  const { data, subscribe } = useBroadcastBroadcastContracts('Ping')

  React.useEffect(() => {
    return subscribe()
  }, [subscribe])

  return (
    <div className="demo-card broadcast">
      <h3 className="demo-title">📡 Ping Counter (Hooks)</h3>
      <p className="demo-description">
        Broadcast from main process with numeric payload using React hooks
      </p>
      <div className="demo-result">Received: {data ?? 0} pings</div>
    </div>
  )
}
