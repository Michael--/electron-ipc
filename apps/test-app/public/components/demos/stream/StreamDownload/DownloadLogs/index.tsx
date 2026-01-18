import { DemoCard } from '../../../../shared/DemoCard'
import { StreamDownloadHooks } from './StreamDownloadHooks'
import { StreamDownloadNative } from './StreamDownloadNative'

interface StreamDownloadDemoProps {
  variant: 'native' | 'hooks'
}

/**
 * StreamDownload demo wrapper component
 * @param props - Demo properties including variant
 * @returns StreamDownload demo component
 */
export function StreamDownloadDemo({ variant }: StreamDownloadDemoProps) {
  return (
    <DemoCard
      title="Stream Download"
      description="Download log stream from main to renderer process"
      type="stream"
      variant={variant}
    >
      {variant === 'native' ? <StreamDownloadNative /> : <StreamDownloadHooks />}
    </DemoCard>
  )
}
