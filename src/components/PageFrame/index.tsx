import type { PropsWithChildren, ReactNode } from 'react'
import './styles.css'

interface PageFrameProps extends PropsWithChildren {
  title: string
  description: string
  action?: ReactNode
}

export function PageFrame({
  title,
  description,
  action,
  children,
}: PageFrameProps) {
  return (
    <section className="page-frame">
      <header className="page-header">
        <div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        {action}
      </header>
      {children}
    </section>
  )
}
