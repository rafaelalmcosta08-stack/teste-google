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
  LogOut,
  Megaphone,
  Home,
  MessageSquare,
  Car,
  Lock,
  Activity,
  Shield,
} from 'lucide-react'

export function PainelSidebar() {
  const [isHovered, setIsHovered] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { logout, profile } = useAuth()

  const isAdmin = profile?.role === 'admin'
  const isAltoComando = profile?.cargo?.includes('Alto Comando') || isAdmin

  const cargos = profile?.cargo || []
  const hasApmAccess = isAdmin || cargos.some((c) =>
    ['Instrutor Treinamento Operacional', 'Instrutor De Cursos e Recrutamentos', 'Supervisor APM', 'Diretor APM', 'Alto Comando'].includes(c)
  )

  const unidade = profile?.unidade_operacional || ''

  const categories = [
    {
      title: 'Informação Policial',
      items: [
        { label: 'Hierarquia', href: '/painel/hierarquia', icon: Award, visible: true },
        { label: 'Fardamento', href: '/painel/fardamento', icon: Shirt, visible: true },
        { label: 'Armamento', href: '/painel/armamento', icon: Crosshair, visible: true },
        { label: 'Viatura', href: '/painel/viatura', icon: Car, visible: true },
        { label: 'Prisão', href: '/painel/prisao', icon: Lock, visible: true },
      ]
    },
    {
      title: 'Formação Policial',
      items: [
        { label: 'Cursos', href: '/painel/cursos', icon: GraduationCap, visible: true },
        { label: 'Editais', href: '/painel/editais', icon: FileText, visible: true },
        { label: 'Manual de Conduta', href: '/painel/manual-de-conduta', icon: BookOpen, visible: true },
        { label: 'Perímetros', href: '/painel/perimetros', icon: Map, visible: true },
        { label: 'Ações', href: '/painel/acoes', icon: Activity, visible: true },
      ]
    },
    {
      title: 'Alto Comando',
      items: [
        { label: 'Publicar Aviso', href: '/painel/publicar-aviso', icon: Megaphone, visible: isAltoComando },
      ]
    },
    {
      title: 'Administração do Site',
      items: [
        { label: 'Administração', href: '/painel/administracao', icon: Shield, visible: isAdmin }
      ]
    }
  ]

  const visibleCategories = categories
    .map((cat) => ({
      ...cat,
      items: cat.items.filter((item) => item.visible)
    }))
    .filter((cat) => cat.items.length > 0)

  async function handleLogout() {
    await logout()
    router.push('/')
  }

  return (
    <aside
      id="painel-sidebar"
      className={`fixed bottom-0 left-0 top-0 z-50 flex h-screen flex-col justify-between border-r border-border/20 bg-card/30 py-6 backdrop-blur-md transition-all duration-300 ease-in-out ${
        isHovered ? 'w-64 shadow-2xl shadow-black/40' : 'w-[70px]'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Top: Logo / Badge */}
      <div className="flex flex-col min-h-0 flex-1">
        <Link
          href="/painel"
          className="flex items-center px-4 mb-6 outline-none shrink-0"
          title="Polícia Aspect"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg overflow-hidden bg-transparent">
            <img
              src="https://res.cloudinary.com/epo1w9hl/image/upload/v1784175681/POLICIAASPECT_copiar_qdvopk.png"
              alt="Polícia Aspect Logo"
              className="h-10 w-10 object-contain hover:scale-110 transition-transform duration-300"
              referrerPolicy="no-referrer"
            />
          </div>
          <span
            className={`ml-3 text-sm font-bold tracking-tight text-foreground transition-all duration-300 ${
              isHovered ? 'opacity-100 translate-x-0' : 'pointer-events-none w-0 overflow-hidden opacity-0 -translate-x-2'
            }`}
          >
            Painel Geral
          </span>
        </Link>

        {/* Scrollable Navigation Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 space-y-4 scrollbar-thin scrollbar-thumb-white/5 select-none pr-1.5">
          {visibleCategories.map((cat, catIdx) => (
            <div key={cat.title} className="flex flex-col gap-1">
              {isHovered ? (
                <div className="px-3 py-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-primary/70 select-none">
                  {cat.title}
                </div>
              ) : (
                catIdx > 0 && <hr className="border-t border-white/5 my-1" />
              )}
              
              <div className="flex flex-col gap-1">
                {cat.items.map((item) => {
                  const isActive = pathname === item.href
                  const Icon = item.icon

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`group/item flex h-10 items-center rounded-lg px-3 transition-all duration-200 shrink-0 ${
                        isActive
                          ? 'bg-primary text-primary-foreground font-semibold shadow-md shadow-primary/10'
                          : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                      }`}
                      title={item.label}
                    >
                      <Icon className={`h-4.5 w-4.5 shrink-0 transition-transform duration-200 group-hover/item:scale-105 ${isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover/item:text-foreground'}`} />
                      <span
                        className={`ml-3.5 text-xs transition-all duration-300 whitespace-nowrap ${
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
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom: User Info & Logout */}
      <div className="flex flex-col gap-2 px-3 shrink-0 pt-5 mt-4 border-t border-border/10 pb-2">
        {profile && (
          <div className="flex items-center gap-3 px-1 mb-2.5 overflow-hidden">
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
                {profile.patente ?? 'Recruta'}
              </span>
            </div>
          </div>
        )}

        <button
          onClick={handleLogout}
          className="group/btn flex h-10 w-full items-center rounded-lg px-3 text-muted-foreground hover:bg-red-500/10 hover:text-red-400 transition-all duration-200"
          title="Sair da Conta"
        >
          <LogOut className="h-4.5 w-4.5 shrink-0 transition-transform duration-200 group-hover/btn:translate-x-0.5 text-muted-foreground group-hover/btn:text-red-400" />
          <span
            className={`ml-3.5 text-xs transition-all duration-300 whitespace-nowrap ${
              isHovered
                ? 'opacity-100 translate-x-0'
                : 'pointer-events-none w-0 overflow-hidden opacity-0 -translate-x-2'
            }`}
          >
            Sair da Conta
          </span>
        </button>

        <Link
          href="/"
          className="group/btn flex h-10 w-full items-center rounded-lg px-3 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all duration-200"
          title="Voltar ao Menu Principal"
        >
          <Home className="h-4.5 w-4.5 shrink-0 transition-transform duration-200 group-hover/btn:-translate-x-0.5 text-muted-foreground group-hover/btn:text-primary" />
          <span
            className={`ml-3.5 text-xs transition-all duration-300 whitespace-nowrap ${
              isHovered
                ? 'opacity-100 translate-x-0'
                : 'pointer-events-none w-0 overflow-hidden opacity-0 -translate-x-2'
            }`}
          >
            Voltar ao Menu Principal
          </span>
        </Link>
      </div>
    </aside>
  )
}

