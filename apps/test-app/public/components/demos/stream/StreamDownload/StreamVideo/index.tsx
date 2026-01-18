import { DemoCard } from '../../../../shared/DemoCard'
import { VideoStreamHooks } from './VideoStreamHooks'
import { VideoStreamNative } from './VideoStreamNative'

interface VideoStreamDemoProps {
  variant: 'native' | 'hooks'
}

/**
 * VideoStream demo wrapper component
 * @param props - Demo properties including variant
 * @returns VideoStream demo component
 */
export function VideoStreamDemo({ variant }: VideoStreamDemoProps) {
  return (
    <DemoCard
      title="Video Stream"
      description="Stream video from main process with live playback"
      type="stream"
      variant={variant}
    >
      {variant === 'native' ? <VideoStreamNative /> : <VideoStreamHooks />}
    </DemoCard>
  )
}
