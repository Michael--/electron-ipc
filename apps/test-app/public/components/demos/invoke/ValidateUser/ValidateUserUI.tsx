import { DemoCard } from '../../../shared/DemoCard'

interface ValidateUserUIProps {
  result: { valid: true; data: { name: string; age: number } } | null
  loading: boolean
  error: Error | null
  name: string
  age: string
  onNameChange: (name: string) => void
  onAgeChange: (age: string) => void
  onValidate: () => void
}

/**
 * UI component for ValidateUser demo
 */
export function ValidateUserUI({
  result,
  loading,
  error,
  name,
  age,
  onNameChange,
  onAgeChange,
  onValidate,
}: ValidateUserUIProps) {
  // Try to extract validation error details
  const errorDetails =
    error && 'code' in error && error.code === 'IPC_VALIDATION_ERROR' && 'issues' in error
      ? (error as { issues: Array<{ path: (string | number)[]; message: string }> }).issues
      : null

  return (
    <DemoCard
      title="🔍 Validate User"
      description="Demonstrates validation error handling with detailed error messages"
      type="invoke"
    >
      <div className="demo-controls">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
          <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>
            Name (min 3 chars):
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            style={{
              marginTop: '4px',
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid #e2e8f0',
              fontSize: '14px',
            }}
            placeholder="Enter name..."
          />

          <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>
            Age (1-150):
          </label>
          <input
            type="text"
            value={age}
            onChange={(e) => onAgeChange(e.target.value)}
            style={{
              marginTop: '4px',
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid #e2e8f0',
              fontSize: '14px',
            }}
            placeholder="Enter age..."
          />
        </div>

        <button onClick={onValidate} disabled={loading} className="demo-button">
          {loading ? '⏳' : '✓'} Validate
        </button>
      </div>

      <div className="demo-result">
        {loading && <div className="result-loading">Validating...</div>}

        {error && (
          <div className="result-error">
            <div style={{ fontWeight: '600', marginBottom: '8px' }}>❌ Validation Error:</div>

            {errorDetails ? (
              <div style={{ fontSize: '13px' }}>
                {errorDetails.map((issue, idx) => (
                  <div key={idx} style={{ marginBottom: '4px' }}>
                    <code style={{ color: '#dc2626' }}>{issue.path.join('.')}</code>:{' '}
                    {issue.message}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '13px' }}>{error.message}</div>
            )}
          </div>
        )}

        {result && (
          <div className="result-success">
            <div style={{ fontWeight: '600', marginBottom: '8px' }}>✅ Valid User:</div>
            <div style={{ fontSize: '13px' }}>
              <div>
                <strong>Name:</strong> {result.data.name}
              </div>
              <div>
                <strong>Age:</strong> {result.data.age}
              </div>
            </div>
          </div>
        )}
      </div>
    </DemoCard>
  )
}
