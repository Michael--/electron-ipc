import { DemoCard } from '../../../shared/DemoCard'
import { PingHooks } from './PingHooks'
import { PingNative } from './PingNative'

interface PingDemoProps {
  variant: 'native' | 'hooks'
}

/**
 * Ping demo wrapper component
 * @param props - Demo properties including variant
 * @returns Ping demo component
 */
export function PingDemo({ variant }: PingDemoProps) {
  return (
    <DemoCard
      title="Ping Counter"
      description="Broadcast from main process with numeric payload"
      type="broadcast"
      variant={variant}
    >
      {variant === 'native' ? <PingNative /> : <PingHooks />}
    </DemoCard>
  )
}
