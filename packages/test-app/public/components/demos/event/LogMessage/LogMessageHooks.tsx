import { useEventContracts } from '@gen/ipc-api-react-hooks'
import { LogMessageUI } from './LogMessageUI'

/**
 * LogMessage demo using React hooks
 * @returns Hooks-based LogMessage component
 */
export function LogMessageHooks() {
  const { send } = useEventContracts('LogMessage')

  const handleSend = (level: 'info' | 'warn' | 'error') => {
    send({ level, message: `Test ${level} message from renderer` })
  }

  return <LogMessageUI onSend={handleSend} />
}
