'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import {
  Shirt,
  Crosshair,
  Award,
  GraduationCap,
  FileText,
  Map,
  BookOpen,
  Shield,
  LogOut,
} from 'lucide-react'

const menuItems = [
  { label: 'Fardamento', href: '/painel/fardamento', icon: Shirt },
  { label: 'Armamento', href: '/painel/armamento', icon: Crosshair },
  { label: 'Hierarquia', href: '/painel/hierarquia', icon: Award },
  { label: 'Cursos', href: '/painel/cursos', icon: GraduationCap },
  { label: 'Editais', href: '/painel/editais', icon: FileText },
  { label: 'Perímetros', href: '/painel/perimetros', icon: Map },
  { label: 'Manual de Conduta', href: '/painel/manual-de-conduta', icon: BookOpen },
  { label: 'Administração', href: '/painel/administracao', icon: Shield },
]

export function PainelSidebar() {
  const [isHovered, setIsHovered] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { logout, profile } = useAuth()

  async function handleLogout() {
    await logout()
    router.push('/')
  }

  return (
    <aside
      id="painel-sidebar"
      className={`fixed bottom-0 left-0 top-0 z-50 flex h-screen flex-col justify-between border-r border-border/30 bg-card/85 py-6 backdrop-blur-xl transition-all duration-300 ease-in-out ${
        isHovered ? 'w-64 shadow-2xl shadow-black/60' : 'w-[70px]'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Top: Logo / Badge */}
      <div className="flex flex-col">
        <Link
          href="/painel"
          className="flex items-center px-4 mb-8 outline-none"
          title="Polícia Legacy"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20 shadow-inner">
            <Shield className="h-5 w-5" />
          </div>
          <span
            className={`ml-3 text-sm font-bold tracking-tight text-foreground transition-all duration-300 ${
              isHovered ? 'opacity-100 translate-x-0' : 'pointer-events-none w-0 overflow-hidden opacity-0 -translate-x-2'
            }`}
          >
            Painel Geral
          </span>
        </Link>

        {/* Menu Items */}
        <nav className="flex flex-col gap-1.5 px-3">
          {menuItems.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon

            // Se for Administração, só destaca ou permite se for admin (página real já barra)
            // Mas vamos exibir o item normalmente como solicitado.
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group/item flex h-11 items-center rounded-lg px-3 transition-all duration-200 ${
                  isActive
                    ? 'bg-primary text-primary-foreground font-semibold shadow-md shadow-primary/10'
                    : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                }`}
                title={item.label}
              >
                <Icon className={`h-5 w-5 shrink-0 transition-transform duration-200 group-hover/item:scale-105 ${isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover/item:text-foreground'}`} />
                <span
                  className={`ml-4 text-sm transition-all duration-300 whitespace-nowrap ${
                    isHovered
                      ? 'opacity-100 translate-x-0'
                      : 'pointer-events-none w-0 overflow-hidden opacity-0 -translate-x-2'
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Bottom: User Info & Logout */}
      <div className="flex flex-col gap-2 px-3">
        {profile && (
          <div className="flex items-center gap-3 border-t border-border/20 pt-4 px-1 mb-2 overflow-hidden">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-bold text-foreground border border-border/40">
              {profile.username ? profile.username[0].toUpperCase() : 'U'}
            </div>
            <div
              className={`flex flex-col min-w-0 transition-all duration-300 ${
                isHovered ? 'opacity-100 translate-x-0' : 'pointer-events-none w-0 overflow-hidden opacity-0 -translate-x-2'
              }`}
            >
              <span className="text-xs font-semibold text-foreground truncate">{profile.username}</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                {profile.role === 'admin' ? 'Administrador' : 'Membro'}
              </span>
            </div>
          </div>
        )}

        <button
          onClick={handleLogout}
          className="group/btn flex h-11 w-full items-center rounded-lg px-3 text-muted-foreground hover:bg-red-500/10 hover:text-red-400 transition-all duration-200"
          title="Sair"
        >
          <LogOut className="h-5 w-5 shrink-0 transition-transform duration-200 group-hover/btn:translate-x-0.5 text-muted-foreground group-hover/btn:text-red-400" />
          <span
            className={`ml-4 text-sm transition-all duration-300 whitespace-nowrap ${
              isHovered
                ? 'opacity-100 translate-x-0'
                : 'pointer-events-none w-0 overflow-hidden opacity-0 -translate-x-2'
            }`}
          >
            Sair do Sistema
          </span>
        </button>
      </div>
    </aside>
  )
}
