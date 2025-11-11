import { DemoCard } from '../../../shared/DemoCard'
import { LogMessageHooks } from './LogMessageHooks'
import { LogMessageNative } from './LogMessageNative'

interface LogMessageDemoProps {
  variant: 'native' | 'hooks'
}

/**
 * LogMessage demo wrapper component
 * @param props - Demo properties including variant
 * @returns LogMessage demo component
 */
export function LogMessageDemo({ variant }: LogMessageDemoProps) {
  return (
    <DemoCard
      title="Log Message"
      description="Send events with different log levels to main process"
      type="event"
      variant={variant}
    >
      {variant === 'native' ? <LogMessageNative /> : <LogMessageHooks />}
    </DemoCard>
  )
}
