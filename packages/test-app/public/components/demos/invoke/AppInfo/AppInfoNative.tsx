import { useState } from 'react'
import { AppInfoUI } from './AppInfoUI'

/**
 * AppInfo demo using native window.api
 * @returns Native AppInfo component
 */
export function AppInfoNative() {
  const [info, setInfo] = useState<{ name: string; version: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const handleGetInfo = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await window.api.invokeGetAppInfo()
      setInfo(result)
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }

  return <AppInfoUI info={info} loading={loading} error={error} onGetInfo={handleGetInfo} />
}
