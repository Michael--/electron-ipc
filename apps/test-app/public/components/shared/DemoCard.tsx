import type { ReactNode } from 'react'

type DemoType = 'invoke' | 'event' | 'broadcast' | 'stream'

interface DemoCardProps {
  title: string
  description: string
  type: DemoType
  variant?: 'native' | 'hooks'
  children: ReactNode
}

/**
 * Shared demo card wrapper component
 * @param props - Card properties including title, description, type and children
 * @returns Demo card component
 */
export function DemoCard({ title, description, type, variant, children }: DemoCardProps) {
  return (
    <div className={`demo-card ${type}`}>
      <h3 className="demo-title">
        {getTypeEmoji(type)} {title}
      </h3>
      <p className="demo-description">
        {description}
        {variant && <span className="variant-badge">{variant}</span>}
      </p>
      {children}
    </div>
  )
}

/**
 * Get emoji for demo type
 * @param type - The demo type
 * @returns Emoji string
 */
function getTypeEmoji(type: DemoType): string {
  switch (type) {
    case 'invoke':
      return '🔄'
    case 'event':
      return '📤'
    case 'broadcast':
      return '📡'
    case 'stream':
      return '🌊'
  }
}
