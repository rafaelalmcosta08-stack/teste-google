'use client'

import { useState } from 'react'
import {
  AlertTriangle,
  BookOpen,
  HelpCircle,
  Shirt,
  Book,
  Radio,
  MessageSquare,
  Gauge,
  Shield,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { SiteBackground } from '@/components/site-background'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { ResumoRapido } from '@/components/resumo-rapido'
import { manualSections } from '@/lib/site-data'

const iconMap: Record<string, LucideIcon> = {
  shirt: Shirt,
  book: Book,
  radio: Radio,
  message: MessageSquare,
  gauge: Gauge,
  shield: Shield,
  users: Users,
}

export default function ManualPage() {
  const [aba, setAba] = useState<'apostila' | 'resumo'>('apostila')

  return (
    <>
      <SiteBackground />
      <SiteHeader />

      <main className="mx-auto max-w-[1600px] px-6 pb-24 pt-28 sm:px-10 lg:px-16">
        {/* Header */}
        <div className="relative text-center">

          <div className="flex items-center justify-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            <span className="rounded-full border border-yellow-500/40 bg-yellow-500/10 px-3 py-1 text-xs font-semibold text-yellow-500">
              Material Oficial
            </span>
          </div>

          <h1 className="mt-5 text-4xl font-bold tracking-tight text-balance sm:text-5xl">
            Manual de Estudo TAFF
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-pretty leading-relaxed text-muted-foreground">
            Estude todo o conteúdo necessário para o Teste de Aptidão Física e Funcional. Lembrando
            que no momento do recrutamento é extremamente proibido qualquer forma de cola ou
            consulta!
          </p>

          <div className="mt-8 flex items-center justify-center gap-3">
            <button
              onClick={() => setAba('apostila')}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                aba === 'apostila'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              <BookOpen className="h-4 w-4" />
              Apostila
            </button>
            <button
              onClick={() => setAba('resumo')}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                aba === 'resumo'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              <HelpCircle className="h-4 w-4" />
              Resumo Rápido
            </button>
          </div>
        </div>

        {/* Conteudo da aba */}
        {aba === 'apostila' ? (
          <Accordion className="mt-12 space-y-4">
            {manualSections.map((section) => {
              const Icon = iconMap[section.icon] ?? Book
              return (
                <AccordionItem
                  key={section.id}
                  value={section.id}
                  data-stagger
                  className="overflow-hidden rounded-xl border border-border/60 bg-card/60 px-2"
                >
                  <AccordionTrigger className="px-4 py-5 hover:no-underline">
                    <span className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary">
                        <Icon className="h-4 w-4 text-foreground" />
                      </span>
                      <span className="text-base font-semibold">{section.titulo}</span>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-6 pl-16">
                    <p className="whitespace-pre-wrap leading-relaxed text-muted-foreground">{section.conteudo}</p>

                    {section.lista && (
                      <ul className="mt-4 space-y-1.5">
                        {section.lista.map((item) => (
                          <li key={item} className="text-sm leading-relaxed text-muted-foreground">
                            {item}
                          </li>
                        ))}
                      </ul>
                    )}

                    {section.rodape && (
                      <p className="whitespace-pre-wrap mt-4 leading-relaxed text-muted-foreground">{section.rodape}</p>
                    )}
                  </AccordionContent>
                </AccordionItem>
              )
            })}
          </Accordion>
        ) : (
          <ResumoRapido />
        )}
      </main>
    </>
  )
}
