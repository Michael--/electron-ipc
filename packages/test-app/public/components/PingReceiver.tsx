import { useEffect, useState } from 'react'

/**
 * PingReceiver component - displays broadcast ping counter
 */
export function PingReceiver() {
  const [counter, setCounter] = useState(0)

  useEffect(() => {
    if (!window.api) return
    window.api.onPing((payload) => {
      setCounter(payload)
    })
  }, [])

  return (
    <div className="demo-card broadcast">
      <h3 className="demo-title">📡 Ping Counter</h3>
      <p className="demo-description">Broadcast from main process with numeric payload</p>
      <div className="demo-result">Received: {counter} pings</div>
    </div>
  )
}
