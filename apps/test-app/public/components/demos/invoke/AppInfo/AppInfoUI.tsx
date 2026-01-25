interface AppInfoUIProps {
  info: { name: string; version: string } | null
  loading: boolean
  error: Error | null
  onGetInfo: () => void
}

/**
 * Presentational component for AppInfo demo
 * @param props - UI properties
 * @returns AppInfo UI component
 */
export function AppInfoUI({ info, loading, error, onGetInfo }: AppInfoUIProps) {
  return (
    <>
      <div className="demo-controls">
        <button onClick={onGetInfo} disabled={loading} data-testid="get-app-info-button">
          {loading ? 'Getting info...' : 'Get App Info'}
        </button>
      </div>
      {error && <div className="demo-error">Error: {error.message}</div>}
      {info && (
        <div className="demo-result">
          {info.name} v{info.version}
        </div>
      )}
    </>
  )
}
