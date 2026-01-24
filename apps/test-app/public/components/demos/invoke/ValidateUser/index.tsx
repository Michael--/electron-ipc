import { ValidateUserNative } from './ValidateUserNative'

interface ValidateUserDemoProps {
  variant: 'native' | 'hooks'
}

/**
 * ValidateUser demo component with variant selector
 */
export function ValidateUserDemo({ variant }: ValidateUserDemoProps) {
  if (variant === 'native') {
    return <ValidateUserNative />
  }

  // Hooks variant not implemented yet
  return <ValidateUserNative />
}
