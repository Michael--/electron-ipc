import { DemoCard } from '../../../shared/DemoCard'
import { AppInfoHooks } from './AppInfoHooks'
import { AppInfoNative } from './AppInfoNative'

interface AppInfoDemoProps {
  variant: 'native' | 'hooks'
}

/**
 * AppInfo demo wrapper component
 * @param props - Demo properties including variant
 * @returns AppInfo demo component
 */
export function AppInfoDemo({ variant }: AppInfoDemoProps) {
  return (
    <DemoCard
      title="Get App Info"
      description="Invoke without request parameters"
      type="invoke"
      variant={variant}
    >
      {variant === 'native' ? <AppInfoNative /> : <AppInfoHooks />}
    </DemoCard>
  )
}
