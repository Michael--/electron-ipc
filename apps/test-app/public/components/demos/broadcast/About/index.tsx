import { DemoCard } from '../../../shared/DemoCard'
import { AboutHooks } from './AboutHooks'
import { AboutNative } from './AboutNative'

interface AboutDemoProps {
  variant: 'native' | 'hooks'
}

/**
 * About demo wrapper component
 * @param props - Demo properties including variant
 * @returns About demo component
 */
export function AboutDemo({ variant }: AboutDemoProps) {
  return (
    <DemoCard
      title="About Event"
      description="Broadcast event without payload from main process"
      type="broadcast"
      variant={variant}
    >
      {variant === 'native' ? <AboutNative /> : <AboutHooks />}
    </DemoCard>
  )
}
