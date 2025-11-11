interface AboutUIProps {
  triggered: boolean
}

/**
 * Presentational component for About demo
 * @param props - UI properties
 * @returns About UI component
 */
export function AboutUI({ triggered }: AboutUIProps) {
  return (
    <div className="demo-result">
      {triggered ? '✅ About event received!' : 'Waiting for About event...'}
    </div>
  )
}
