import { useEffect, useState } from 'react'
import { PingUI } from './PingUI'

/**
 * Ping demo using native window.api
 * @returns Native Ping component
 */
export function PingNative() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const unsubscribe = window.api.onPing((pingCount) => {
      setCount(pingCount)
    })

    return unsubscribe
  }, [])

  return <PingUI count={count} />
}
