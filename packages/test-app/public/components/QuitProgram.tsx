/**
 * QuitProgram component - demonstrates sending event without payload
 */
export function QuitProgram() {
  const onClick = () => {
    window.api.sendQuit()
  }

  return (
    <div className="demo-card event">
      <h3 className="demo-title">🚪 Quit Application</h3>
      <p className="demo-description">Event without payload</p>
      <div className="demo-controls">
        <button className="primary" onClick={onClick}>
          Quit
        </button>
      </div>
    </div>
  )
}
