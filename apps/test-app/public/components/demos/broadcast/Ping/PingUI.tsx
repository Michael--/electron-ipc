interface PingUIProps {
  count: number
}

/**
 * Presentational component for Ping demo
 * @param props - UI properties
 * @returns Ping UI component
 */
export function PingUI({ count }: PingUIProps) {
  return <div className="demo-result">Received: {count} pings</div>
}
