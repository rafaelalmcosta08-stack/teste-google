import Link from 'next/link'
import { Sparkles, ChevronDown } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { SiteBackground } from '@/components/site-background'
import { UnitsSection } from '@/components/units-section'

export default function HomePage() {
  return (
    <>
      <SiteBackground />
      <SiteHeader />

      <main className="pt-16">
        {/* Hero */}
        <section className="relative flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-6 py-20 text-center sm:px-10 lg:px-16">


          <h1 className="max-w-4xl text-5xl font-bold leading-[1.05] tracking-tight text-balance sm:text-7xl">
            <span className="text-white">Departamento de Polícia</span>
            <br />
            <span className="text-white">Legacy</span>
          </h1>

          <p className="mt-6 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
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
            <Link
              href="/recrutador"
              className="liquid-glass-btn rounded-lg"
            >
              <div className="liquid-glass-inner rounded-lg px-5 py-2.5 text-sm font-semibold text-white">
                Cadastro Policial
              </div>
            </Link>
          </div>

          <Link
            href="#unidades"
            aria-label="Ver unidades"
            className="absolute bottom-8 text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronDown className="h-6 w-6 animate-bounce" />
          </Link>
        </section>

        <UnitsSection />
      </main>
    </>
  )
}
