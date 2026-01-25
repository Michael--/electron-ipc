import { useState } from 'react'
import { AddLogEntryUI } from './AddLogEntryUI'

type LogLevel = 'info' | 'warn' | 'error'

/**
 * AddLogEntry demo using hooks (simplified version)
 * @returns Hooks-based AddLogEntry component
 */
export function AddLogEntryHooks() {
  const [message, setMessage] = useState('')
  const [level, setLevel] = useState<LogLevel>('info')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<Error | null>(null)

  const handleAddLogEntry = async () => {
    if (!message.trim()) return

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      // Get current window info to identify source
      const windowInfo = await window.api.invokeGetAppInfo()
      const sourceWindow = `TestApp-${windowInfo.name}`

      // Call renderer invoke to add log entry to logger window
      const response = await window.api.rendererInvokeAddLogEntry('logger', {
        level,
        message: message.trim(),
        sourceWindow,
      })

      setResult(`Log entry added with ID: ${response.entryId}`)
      setMessage('')
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AddLogEntryUI
      level={level}
      message={message}
      loading={loading}
      result={result}
      error={error}
      onLevelChange={setLevel}
      onMessageChange={setMessage}
      onAdd={handleAddLogEntry}
    />
  )
}
