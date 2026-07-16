import Image from 'next/image'
import { units } from '@/lib/site-data'

export function UnitsSection() {
  return (
    <section id="unidades" className="mx-auto max-w-[1600px] px-6 py-20 sm:px-10 lg:px-16 sm:py-28">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">
          Nossas Unidades
        </h2>
        <p className="mt-4 text-pretty leading-relaxed text-muted-foreground">
          Conheça as diferentes unidades do Departamento de Polícia Aspect e suas responsabilidades
          na manutenção da segurança pública.
        </p>
      </div>

      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {units.map((unit) => {
          const Icon = unit.icon
          return (
            <article
              key={unit.sigla}
              data-stagger
              className="flex flex-col rounded-xl border border-border/60 bg-card/60 p-6 transition-colors hover:border-border"
            >
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-lg bg-secondary">
                <Icon className="h-5 w-5 text-foreground" />
              </div>

              <h3 className="text-lg font-semibold">
                {unit.sigla}{' '}
                <span className="text-sm font-normal text-muted-foreground">- {unit.nome}</span>
              </h3>

              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {unit.descricao}
              </p>

              <div className="relative mt-5 aspect-video overflow-hidden rounded-lg border border-border/40 bg-secondary/40">
                {unit.image ? (
                  <Image
                    src={unit.image || '/placeholder.svg'}
                    alt={`Unidade ${unit.sigla} - ${unit.nome}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Icon className="h-9 w-9 text-muted-foreground/40" />
                  </div>
                )}
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
