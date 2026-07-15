'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'

const menuItems = [
  { label: 'Fardamento', href: '/painel/fardamento' },
  { label: 'Armamento', href: '/painel/armamento' },
  { label: 'Hierarquia', href: '/painel/hierarquia' },
  { label: 'Cursos', href: '/painel/cursos' },
  { label: 'Editais', href: '/painel/editais' },
  { label: 'Perímetros', href: '/painel/perimetros' },
  { label: 'Manual de Conduta', href: '/painel/manual-de-conduta' },
  { label: 'Administração', href: '/painel/administracao' },
]

export function PainelHeader() {
  const { logout, profile } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await logout()
    router.push('/')
  }

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border/30 bg-background/40 backdrop-blur-xl">
      <div className="mx-auto flex h-24 max-w-[1600px] items-center justify-between gap-4 px-6 sm:px-10 lg:px-16">
        {/* Logo */}
        <Link href="/painel" className="flex items-center gap-2.5 shrink-0">
          <span className="text-base font-bold tracking-tight">Polícia Legacy</span>
        </Link>

        {/* Menu central */}
        <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 lg:flex">
          {menuItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-secondary text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Usuário + Sair */}
        <div className="flex items-center gap-3 shrink-0">
          {profile && (
            <div className="hidden items-center gap-2 sm:flex">
              <span className="text-sm text-muted-foreground">{profile.username}</span>
              {profile.role === 'admin' && (
                <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-foreground">
                  Admin
                </span>
              )}
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-md bg-secondary px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary/80"
          >
            <LogOut className="h-4 w-4" />
            <span>Sair</span>
          </button>
        </div>
      </div>
    </header>
  )
}
