import { QuitUI } from './QuitUI'

/**
 * Quit demo using native window.api
 * @returns Native Quit component
 */
export function QuitNative() {
  const handleQuit = () => {
    window.api.sendQuit()
  }

  return <QuitUI onQuit={handleQuit} />
}
