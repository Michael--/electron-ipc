import { useEventContracts } from '@gen/ipc-api-react-hooks'
import { QuitUI } from './QuitUI'

/**
 * Quit demo using React hooks
 * @returns Hooks-based Quit component
 */
export function QuitHooks() {
  const { send } = useEventContracts('Quit')

  const handleQuit = () => {
    send()
  }

  return <QuitUI onQuit={handleQuit} />
}
