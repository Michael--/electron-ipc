interface QuitUIProps {
  onQuit: () => void
}

/**
 * Presentational component for Quit demo
 * @param props - UI properties
 * @returns Quit UI component
 */
export function QuitUI({ onQuit }: QuitUIProps) {
  return (
    <div className="demo-controls">
      <button className="primary" onClick={onQuit}>
        Quit Application
      </button>
    </div>
  )
}
