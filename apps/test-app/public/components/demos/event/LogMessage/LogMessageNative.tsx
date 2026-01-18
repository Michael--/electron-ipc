import { LogMessageUI } from './LogMessageUI'

/**
 * LogMessage demo using native window.api
 * @returns Native LogMessage component
 */
export function LogMessageNative() {
  const handleSend = (level: 'info' | 'warn' | 'error') => {
    window.api.sendLogMessage({ level, message: `Test ${level} message from renderer` })
  }

  return <LogMessageUI onSend={handleSend} />
}
