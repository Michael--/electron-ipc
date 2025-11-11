import { DemoCard } from '../../../../shared/DemoCard'
import { StreamUploadHooks } from './StreamUploadHooks'
import { StreamUploadNative } from './StreamUploadNative'

interface StreamUploadDemoProps {
  variant: 'native' | 'hooks'
}

/**
 * StreamUpload demo wrapper component
 * @param props - Demo properties including variant
 * @returns StreamUpload demo component
 */
export function StreamUploadDemo({ variant }: StreamUploadDemoProps) {
  return (
    <DemoCard
      title="Stream Upload"
      description="Upload file chunks from renderer to main process"
      type="stream"
      variant={variant}
    >
      {variant === 'native' ? <StreamUploadNative /> : <StreamUploadHooks />}
    </DemoCard>
  )
}
