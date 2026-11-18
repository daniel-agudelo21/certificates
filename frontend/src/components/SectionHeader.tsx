import type { ReactNode } from 'react'

export type Tone = 'lilac' | 'mint' | 'peach' | 'sky' | 'butter'

export const TONE_CHIP: Record<Tone, string> = {
  lilac: 'bg-lilac-200 text-lilac-700',
  mint: 'bg-mint-200 text-mint-700',
  peach: 'bg-peach-200 text-peach-700',
  sky: 'bg-sky-200 text-sky-700',
  butter: 'bg-butter-200 text-butter-700',
}

interface SectionHeaderProps {
  icon: ReactNode
  tone: Tone
  title: string
  description?: string
  action?: ReactNode
}

export function SectionHeader({ icon, tone, title, description, action }: SectionHeaderProps) {
  return (
    <header className="mb-6 flex items-start gap-4">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${TONE_CHIP[tone]}`}>{icon}</div>
      <div className="min-w-0 flex-1">
        <h2 className="text-xl font-semibold leading-tight">{title}</h2>
        {description && <p className="mt-1 text-sm text-ink-muted">{description}</p>}
      </div>
      {action}
    </header>
  )
}
