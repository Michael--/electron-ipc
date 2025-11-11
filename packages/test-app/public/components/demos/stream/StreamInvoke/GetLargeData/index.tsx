import { DemoCard } from '../../../../shared/DemoCard'
import { StreamDataHooks } from './StreamDataHooks'
import { StreamDataNative } from './StreamDataNative'

interface StreamDataDemoProps {
  variant: 'native' | 'hooks'
}

/**
 * StreamData demo wrapper component
 * @param props - Demo properties including variant
 * @returns StreamData demo component
 */
export function StreamDataDemo({ variant }: StreamDataDemoProps) {
  return (
    <DemoCard
      title="Stream Data"
      description="Request triggers a 10-second data stream from main process"
      type="stream"
      variant={variant}
    >
      {variant === 'native' ? <StreamDataNative /> : <StreamDataHooks />}
    </DemoCard>
  )
}
