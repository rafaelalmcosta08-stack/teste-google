'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserPlus, LogIn } from 'lucide-react'
import { motion } from 'motion/react'

export function SiteHeader() {
  const [hoveredNav, setHoveredNav] = useState<string | null>(null)
  const [hoveredAction, setHoveredAction] = useState<string | null>(null)
  const pathname = usePathname()

  const navItems = [
    { href: '/', label: 'Início', key: 'inicio' },
    { href: '/manual', label: 'Manual TAFF', key: 'manual' },
    { href: '/manual-de-conduta', label: 'Manual de Conduta', key: 'conduta' },
    { href: '/codigo-penal', label: 'Código Penal', key: 'codigo-penal' },
  ]

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border/10 bg-card/20 backdrop-blur-md">
      <div className="mx-auto flex h-24 max-w-[1600px] items-center justify-between gap-4 px-6 sm:px-10 lg:px-16">
        <Link href="/" className="flex items-center gap-2.5 group">
          <span className="text-base font-bold tracking-tight text-white transition-colors duration-300 group-hover:text-primary-foreground/90">
            Polícia Legacy
          </span>
        </Link>

        <nav
          className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 md:flex"
          onMouseLeave={() => setHoveredNav(null)}
        >
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative rounded-md px-4 py-2 text-sm font-medium transition-colors duration-200 ${
                  isActive ? 'text-white font-semibold' : 'text-muted-foreground hover:text-white'
                }`}
                onMouseEnter={() => setHoveredNav(item.key)}
              >
                {hoveredNav === item.key && (
                  <motion.div
                    layoutId="nav-hover-pill"
                    className="absolute inset-0 -z-10 rounded-md bg-white/5 border border-white/5 shadow-inner"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div
          className="flex items-center gap-4 sm:gap-6"
          onMouseLeave={() => setHoveredAction(null)}
        >
          <Link
            href="/recrutador"
            className="relative flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:text-white"
            onMouseEnter={() => setHoveredAction('recrutador')}
          >
            {hoveredAction === 'recrutador' && (
              <motion.div
                layoutId="action-hover-pill"
                className="absolute inset-0 -z-10 rounded-md bg-white/5 border border-white/5 shadow-inner"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              />
            )}
            <UserPlus className="h-4 w-4" />
            <span className="hidden sm:inline">Cadastro Policial</span>
          </Link>

          <Link
            href="/login"
            className="relative flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium text-white transition-all duration-300 border border-white/10 shadow-sm overflow-hidden"
            onMouseEnter={() => setHoveredAction('login')}
          >
            {hoveredAction === 'login' && (
              <motion.div
                layoutId="action-hover-pill"
                className="absolute inset-0 -z-10 bg-white/10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              />
            )}
            {hoveredAction !== 'login' && (
              <div className="absolute inset-0 -z-10 bg-white/5" />
            )}
            <LogIn className="h-4 w-4 text-primary" />
            <span>Dashboard</span>
          </Link>
        </div>
      </div>
    </header>
  )
}
