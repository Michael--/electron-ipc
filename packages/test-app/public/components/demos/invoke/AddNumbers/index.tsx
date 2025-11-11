import { DemoCard } from '../../../shared/DemoCard'
import { AddNumbersHooks } from './AddNumbersHooks'
import { AddNumbersNative } from './AddNumbersNative'

interface AddNumbersDemoProps {
  variant: 'native' | 'hooks'
}

/**
 * AddNumbers demo wrapper component
 * @param props - Demo properties including variant
 * @returns AddNumbers demo component
 */
export function AddNumbersDemo({ variant }: AddNumbersDemoProps) {
  return (
    <DemoCard
      title="Add Numbers"
      description="Invoke with request payload, returns response"
      type="invoke"
      variant={variant}
    >
      {variant === 'native' ? <AddNumbersNative /> : <AddNumbersHooks />}
    </DemoCard>
  )
}
