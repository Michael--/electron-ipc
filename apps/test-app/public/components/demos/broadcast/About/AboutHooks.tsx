import { useBroadcastContracts } from '@gen/ipc-api-react-hooks'
import { useEffect, useState } from 'react'
import { AboutUI } from './AboutUI'

/**
 * About demo using React hooks
 * @returns Hooks-based About component
 */
export function AboutHooks() {
  const [triggered, setTriggered] = useState(false)
  const { subscribe } = useBroadcastContracts('About')

  useEffect(() => {
    return subscribe(() => {
      setTriggered(true)
      setTimeout(() => setTriggered(false), 2000)
    })
  }, [subscribe])

  return <AboutUI triggered={triggered} />
}
