interface AddNumbersUIProps {
  result: number | null
  loading: boolean
  error: Error | null
  valueA: number
  valueB: number
  onAdd: () => void
}

/**
 * Presentational component for AddNumbers demo
 * @param props - UI properties
 * @returns AddNumbers UI component
 */
export function AddNumbersUI({ result, loading, error, valueA, valueB, onAdd }: AddNumbersUIProps) {
  return (
    <>
      <div className="demo-controls">
        <button onClick={onAdd} disabled={loading} data-testid="add-numbers-button">
          {loading ? 'Adding...' : `Add ${valueA} + ${valueB}`}
        </button>
      </div>
      {error && <div className="demo-error">Error: {error.message}</div>}
      {result !== null && <div className="demo-result">Result: {result}</div>}
    </>
  )
}
