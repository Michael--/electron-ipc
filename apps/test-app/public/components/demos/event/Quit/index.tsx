import { DemoCard } from '../../../shared/DemoCard'
import { QuitHooks } from './QuitHooks'
import { QuitNative } from './QuitNative'

interface QuitDemoProps {
  variant: 'native' | 'hooks'
}

/**
 * Quit demo wrapper component
 * @param props - Demo properties including variant
 * @returns Quit demo component
 */
export function QuitDemo({ variant }: QuitDemoProps) {
  return (
    <DemoCard
      title="Quit Program"
      description="Send quit event to main process"
      type="event"
      variant={variant}
    >
      {variant === 'native' ? <QuitNative /> : <QuitHooks />}
    </DemoCard>
  )
}
