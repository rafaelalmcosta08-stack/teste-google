'use client'

import Link from 'next/link'

export function PainelHeader() {
  return (
    <header className="fixed top-0 right-0 left-[70px] z-40 bg-card/20 backdrop-blur-md border-b border-border/10">
      <div className="flex h-20 items-center justify-between px-6 sm:px-10 lg:px-16">
        {/* Logo */}
        <Link href="/painel" className="flex items-center gap-2.5">
          <span className="text-base font-bold tracking-tight text-foreground transition-opacity hover:opacity-90">
            Polícia Legacy
          </span>
        </Link>
        
        {/* Empty container for layout alignment or future status badge if needed */}
        <div className="flex items-center gap-3" />
      </div>
    </header>
  )
}
