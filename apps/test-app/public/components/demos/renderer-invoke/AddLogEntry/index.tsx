import { DemoCard } from '../../../shared/DemoCard'
import { AddLogEntryHooks } from './AddLogEntryHooks'
import { AddLogEntryNative } from './AddLogEntryNative'

interface AddLogEntryDemoProps {
  variant: 'native' | 'hooks'
}

/**
 * AddLogEntry demo wrapper component
 * @param props - Demo properties including variant
 * @returns AddLogEntry demo component
 */
export function AddLogEntryDemo({ variant }: AddLogEntryDemoProps) {
  return (
    <DemoCard
      title="Add Log Entry"
      description="Renderer-to-renderer invoke to add shared log entries"
      type="renderer-invoke"
      variant={variant}
    >
      {variant === 'native' ? <AddLogEntryNative /> : <AddLogEntryHooks />}
    </DemoCard>
  )
}
