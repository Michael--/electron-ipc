import { useInvokeContracts } from '@gen/ipc-api-react-hooks'

/**
 * AddNumbersDemo component - demonstrates invoke with request/response using React hooks
 */
export function AddNumbersDemo() {
  const { data, loading, error, invoke } = useInvokeContracts('AddNumbers')

  const valueA = Math.floor(Math.random() * 10 + 1)
  const valueB = Math.floor(Math.random() * 10 + 1)

  const handleAdd = async () => {
    await invoke({ a: valueA, b: valueB })
  }

  return (
    <div className="demo-card invoke">
      <h3 className="demo-title">➕ Add Numbers (Hooks)</h3>
      <p className="demo-description">
        Invoke with request payload, returns response using React hooks
      </p>
      <div className="demo-controls">
        <button onClick={handleAdd} disabled={loading}>
          {loading ? 'Adding...' : `Add ${valueA} + ${valueB}`}
        </button>
      </div>
      {error && <div className="demo-error">Error: {error.message}</div>}
      {data !== null && <div className="demo-result">Result: {data}</div>}
    </div>
  )
}
