'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function SiteFooter() {
  const pathname = usePathname()

  // Oculta o footer nas rotas do painel restrito
  if (pathname.startsWith('/painel')) return null

  return (
    <footer className="border-t border-border/20 bg-background/30 py-16">
      <div className="mx-auto max-w-[1600px] px-6 sm:px-10 lg:px-16">
        <div className="flex flex-col items-center text-center">
          {/* Title and Tagline */}
          <h3 className="text-xl font-bold text-foreground">
            Departamento de Polícia Legacy
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Servir e Proteger
          </p>

          {/* Navigation Links */}
          <nav className="mt-6 flex flex-wrap items-center justify-center gap-6">
            <Link
              href="/"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Início
            </Link>
            <Link
              href="/manual"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Manual TAFF
            </Link>
            <Link
              href="/recrutador"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Recrutador
            </Link>
          </nav>

          {/* Copyright */}
          <p className="mt-8 text-xs text-muted-foreground">
            2026 Departamento de Polícia Legacy. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  )
}
