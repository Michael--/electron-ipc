import { useEffect, useState } from 'react'
import { AboutUI } from './AboutUI'

/**
 * About demo using native window.api
 * @returns Native About component
 */
export function AboutNative() {
  const [triggered, setTriggered] = useState(false)

  useEffect(() => {
    const unsubscribe = window.api.onAbout(() => {
      setTriggered(true)
      setTimeout(() => setTriggered(false), 2000)
    })

    return unsubscribe
  }, [])

  return <AboutUI triggered={triggered} />
}
