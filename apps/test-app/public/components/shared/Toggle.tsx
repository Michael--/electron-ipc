interface ToggleProps {
  value: 'native' | 'hooks'
  onChange: (value: 'native' | 'hooks') => void
}

/**
 * Toggle component for switching between native and hooks API variants
 * @param props - Toggle properties including value and onChange handler
 * @returns Toggle component
 */
export function Toggle({ value, onChange }: ToggleProps) {
  return (
    <div className="api-toggle">
      <button
        className={`toggle-button ${value === 'native' ? 'active' : ''}`}
        onClick={() => onChange('native')}
        data-testid="api-toggle-native"
      >
        Native API
      </button>
      <button
        className={`toggle-button ${value === 'hooks' ? 'active' : ''}`}
        onClick={() => onChange('hooks')}
        data-testid="api-toggle-hooks"
      >
        React Hooks
      </button>
    </div>
  )
}
