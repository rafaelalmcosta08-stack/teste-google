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
          {/* Logo, Title and Tagline */}
          <div className="mb-4">
            <img
              src="https://res.cloudinary.com/epo1w9hl/image/upload/v1784175681/POLICIAASPECT_copiar_qdvopk.png"
              alt="Nômade Logo"
              className="h-14 w-14 object-contain mx-auto"
              referrerPolicy="no-referrer"
            />
          </div>
          <h3 className="text-xl font-bold text-foreground">
            Nômade — Assistente Virtual Operacional
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Central de Inteligência do Departamento de Polícia
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
              Cadastro Policial
            </Link>
          </nav>

          {/* Copyright */}
          <p className="mt-8 text-xs text-muted-foreground">
            2026 Nômade - Assistente Virtual do Departamento de Polícia. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  )
}
