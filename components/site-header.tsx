import Link from 'next/link'
import { UserPlus, LogIn } from 'lucide-react'

export function SiteHeader() {

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border/30 bg-background/40 backdrop-blur-xl">
      <div className="mx-auto flex h-24 max-w-[1600px] items-center justify-between gap-4 px-6 sm:px-10 lg:px-16">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="text-base font-bold tracking-tight">Polícia Legacy</span>
        </Link>

        <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 md:flex">
          <Link
            href="/"
            className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Início
          </Link>
          <Link
            href="/manual"
            className="rounded-md bg-secondary px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary/80"
          >
            Manual TAFF
          </Link>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/recrutador"
            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <UserPlus className="h-4 w-4" />
            <span className="hidden sm:inline">Recrutador</span>
          </Link>
          <Link
            href="/login"
            className="flex items-center gap-1.5 rounded-md bg-secondary px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary/80"
          >
            <LogIn className="h-4 w-4" />
            <span>Dashboard</span>
          </Link>
        </div>
      </div>
    </header>
  )
}
