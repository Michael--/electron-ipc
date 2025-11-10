import { useEffect, useState } from 'react'

/**
 * AboutReceiver component - displays about dialog trigger status
 */
export function AboutReceiver() {
  const [triggered, setTriggered] = useState(false)

  useEffect(() => {
    if (!window.api) return
    window.api.onAbout(() => {
      setTriggered(true)
    })
  }, [])

  return (
    <div className="demo-card broadcast">
      <h3 className="demo-title">ℹ️ About Dialog</h3>
      <p className="demo-description">Broadcast from main process without payload</p>
      <div className="demo-result">
        {triggered ? 'About dialog triggered!' : 'Waiting for trigger...'}
      </div>
      {triggered && (
        <div className="demo-controls">
          <button onClick={() => setTriggered(false)}>Reset</button>
        </div>
      )}
    </div>
  )
}
