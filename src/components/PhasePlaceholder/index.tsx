import type { ReactNode } from 'react'
import './styles.css'

interface PhasePlaceholderProps {
  icon: ReactNode
  title: string
  description: string
  phase: string
}

export function PhasePlaceholder({
  icon,
  title,
  description,
  phase,
}: PhasePlaceholderProps) {
  return (
    <div className="phase-placeholder">
      <div className="phase-placeholder__icon">{icon}</div>
      <div>
        <span>{phase}</span>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
    </div>
  )
}
