import { useState } from 'react'

/**
 * AppInfoDemo component - demonstrates invoke without request parameters
 */
export function AppInfoDemo() {
  const [appInfo, setAppInfo] = useState<{ name: string; version: string } | null>(null)

  const onGetInfo = async () => {
    const info = await window.api.invokeGetAppInfo()
    setAppInfo(info)
  }

  return (
    <div className="demo-card invoke">
      <h3 className="demo-title">📱 Get App Info</h3>
      <p className="demo-description">Invoke without request parameters</p>
      <div className="demo-controls">
        <button onClick={onGetInfo}>Get Info</button>
      </div>
      {appInfo && (
        <div className="demo-result">
          {appInfo.name} v{appInfo.version}
        </div>
      )}
    </div>
  )
}
