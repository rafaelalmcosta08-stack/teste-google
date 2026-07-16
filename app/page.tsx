'use client'

import Link from 'next/link'
import { Sparkles, ChevronDown } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { UnitsSection } from '@/components/units-section'
import { useAuth } from '@/lib/auth-context'
import { motion } from 'motion/react'

export default function HomePage() {
  const { user } = useAuth()
  return (
    <>
      <SiteHeader />

      <main className="pt-16">
        {/* Hero */}
        <section className="relative flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-6 py-20 text-center sm:px-10 lg:px-16">

          {/* Centered High-Quality Logo */}
          <div className="mb-12 flex justify-center">
            <div className="relative group flex items-center justify-center">
              {/* Soft elegant shadow behind the logo */}
              <div className="absolute inset-0 -z-10 rounded-full bg-black/40 blur-2xl pointer-events-none" />
              <img
                src="https://res.cloudinary.com/epo1w9hl/image/upload/v1784175681/POLICIAASPECT_copiar_qdvopk.png"
                alt="Polícia Aspect Logo"
                className="h-44 w-44 sm:h-56 sm:w-56 object-contain select-none pointer-events-none drop-shadow-[0_4px_20px_rgba(0,0,0,0.6)] transition-transform duration-500 group-hover:scale-105"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>

          <h1 className="max-w-4xl text-5xl font-bold leading-[1.05] tracking-tight text-balance sm:text-7xl">
            <span className="text-white">Departamento de Polícia</span>
            <br />
            <span className="text-white">Aspect</span>
          </h1>

          <p className="mt-6 max-w-xl text-pretty text-lg leading-relaxed text-white">
            Servir e Proteger. Junte-se a nós na missão de garantir a segurança e o bem-estar de
            todos os cidadãos.
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
            <Link
              href="/manual"
              className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-primary/10"
            >
              <Sparkles className="h-4 w-4" />
              Manual de Estudo TAFF
            </Link>
            {user ? (
              <Link
                href="/painel"
                className="liquid-glass-btn rounded-lg"
              >
                <div className="liquid-glass-inner rounded-lg px-5 py-2.5 text-sm font-semibold text-white">
                  Ir para o Painel
                </div>
              </Link>
            ) : (
              <Link
                href="/recrutador"
                className="liquid-glass-btn rounded-lg"
              >
                <div className="liquid-glass-inner rounded-lg px-5 py-2.5 text-sm font-semibold text-white">
                  Cadastro Policial
                </div>
              </Link>
            )}
          </div>

          <Link
            href="#unidades"
            aria-label="Ver unidades"
            className="absolute bottom-8 text-white/70 transition-colors hover:text-white"
          >
            <ChevronDown className="h-6 w-6 animate-bounce" />
          </Link>
        </section>

        <UnitsSection />
      </main>
    </>
  )
}
