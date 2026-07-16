'use client'

import { useState } from 'react'
import {
  Gavel,
  Search,
  Plus,
  Trash2,
  AlertTriangle,
  Clock,
  Coins,
  ShieldAlert,
  Scale
} from 'lucide-react'
import { SiteHeader } from '@/components/site-header'

type Crime = {
  artigo: string
  nome: string
  categoria: 'pessoa' | 'patrimonio' | 'transito' | 'administracao' | 'armas-drogas'
  descricao: string
  pena: number // em meses/minutos
  multa: number // em R$
  fianca: number | null // em R$, ou null para inafiançável
}

const crimesList: Crime[] = [
  // Contra a Pessoa
  {
    artigo: 'Art. 121',
    nome: 'Homicídio Doloso',
    categoria: 'pessoa',
    descricao: 'Matar alguém com intenção ou assumindo o risco de produzir o resultado.',
    pena: 60,
    multa: 30000,
    fianca: null
  },
  {
    artigo: 'Art. 121-T',
    nome: 'Tentativa de Homicídio',
    categoria: 'pessoa',
    descricao: 'Tentar ceifar a vida de outrem sem que o resultado morte seja alcançado por circunstâncias alheias.',
    pena: 30,
    multa: 15000,
    fianca: 60000
  },
  {
    artigo: 'Art. 129',
    nome: 'Lesão Corporal',
    categoria: 'pessoa',
    descricao: 'Ofender a integridade corporal ou a saúde de outrem.',
    pena: 15,
    multa: 5000,
    fianca: 15000
  },
  {
    artigo: 'Art. 147',
    nome: 'Ameaça',
    categoria: 'pessoa',
    descricao: 'Ameaçar alguém por palavra, escrito ou gesto, ou qualquer outro meio simbólico, de causar-lhe mal injusto e grave.',
    pena: 10,
    multa: 3000,
    fianca: 8000
  },
  {
    artigo: 'Art. 148',
    nome: 'Sequestro / Cárcere Privado',
    categoria: 'pessoa',
    descricao: 'Privar alguém de sua liberdade, mediante sequestro ou cárcere privado.',
    pena: 40,
    multa: 20000,
    fianca: null
  },

  // Contra o Patrimônio
  {
    artigo: 'Art. 155',
    nome: 'Furto',
    categoria: 'patrimonio',
    descricao: 'Subtrair, para si ou para outrem, coisa alheia móvel (sem violência ou ameaça).',
    pena: 15,
    multa: 8000,
    fianca: 20000
  },
  {
    artigo: 'Art. 157',
    nome: 'Roubo',
    categoria: 'patrimonio',
    descricao: 'Subtrair coisa móvel alheia, para si ou para outrem, mediante grave ameaça ou violência a pessoa.',
    pena: 30,
    multa: 15000,
    fianca: 45000
  },
  {
    artigo: 'Art. 163',
    nome: 'Dano ao Patrimônio Público',
    categoria: 'patrimonio',
    descricao: 'Destruir, inutilizar ou deteriorar coisa alheia de propriedade do Estado.',
    pena: 12,
    multa: 10000,
    fianca: 25000
  },
  {
    artigo: 'Art. 180',
    nome: 'Receptação',
    categoria: 'patrimonio',
    descricao: 'Adquirir, receber, transportar, conduzir ou ocultar, em proveito próprio ou alheio, coisa que sabe ser produto de crime.',
    pena: 15,
    multa: 8000,
    fianca: 20000
  },

  // Trânsito
  {
    artigo: 'Art. 306',
    nome: 'Direção sob Efeito de Álcool/Drogas',
    categoria: 'transito',
    descricao: 'Conduzir veículo automotor com capacidade psicomotora alterada em razão da influência de álcool ou de outra substância psicoativa.',
    pena: 10,
    multa: 5000,
    fianca: 10000
  },
  {
    artigo: 'Art. 309',
    nome: 'Direção Perigosa',
    categoria: 'transito',
    descricao: 'Conduzir veículo gerando perigo de dano ou fazendo manobras arriscadas / velocidade incompatível.',
    pena: 8,
    multa: 4000,
    fianca: 8000
  },
  {
    artigo: 'Art. 311',
    nome: 'Fuga de Abordagem',
    categoria: 'transito',
    descricao: 'Desobedecer a ordem de parada emitida por agente de trânsito ou policial e empreender fuga.',
    pena: 15,
    multa: 10000,
    fianca: 25000
  },

  // Administração Pública
  {
    artigo: 'Art. 329',
    nome: 'Resistência à Prisão',
    categoria: 'administracao',
    descricao: 'Opor-se à execução de ato legal, mediante violência ou ameaça a funcionário competente para executá-lo ou a quem lhe esteja prestando auxílio.',
    pena: 15,
    multa: 5000,
    fianca: 15000
  },
  {
    artigo: 'Art. 330',
    nome: 'Desobediência',
    categoria: 'administracao',
    descricao: 'Desobedecer a ordem legal de funcionário público.',
    pena: 10,
    multa: 3000,
    fianca: 8000
  },
  {
    artigo: 'Art. 331',
    nome: 'Desacato',
    categoria: 'administracao',
    descricao: 'Desacatar funcionário público no exercício da função ou em razão dela.',
    pena: 15,
    multa: 6000,
    fianca: 18000
  },
  {
    artigo: 'Art. 333',
    nome: 'Corrupção Ativa',
    categoria: 'administracao',
    descricao: 'Oferecer ou prometer vantagem indevida a funcionário público, para determiná-lo a praticar, omitir ou retardar ato de ofício.',
    pena: 25,
    multa: 15000,
    fianca: null
  },
  {
    artigo: 'Art. 340',
    nome: 'Falsa Comunicação de Crime',
    categoria: 'administracao',
    descricao: 'Provocar a ação de autoridade, comunicando-lhe a ocorrência de crime ou de contravenção que sabe não se ter verificado.',
    pena: 8,
    multa: 3000,
    fianca: 6000
  },

  // Armas e Drogas
  {
    artigo: 'Art. 14-E',
    nome: 'Porte Ilegal de Arma Leve',
    categoria: 'armas-drogas',
    descricao: 'Portar, deter, adquirir, fornecer ou possuir arma de fogo de uso permitido ou munições sem autorização legal.',
    pena: 20,
    multa: 10000,
    fianca: 30000
  },
  {
    artigo: 'Art. 16-E',
    nome: 'Porte Ilegal de Arma Pesada',
    categoria: 'armas-drogas',
    descricao: 'Portar, deter, adquirir, fornecer ou possuir arma de fogo de uso restrito ou proibido ou armamentos de uso militar.',
    pena: 40,
    multa: 20000,
    fianca: null
  },
  {
    artigo: 'Art. 33-D',
    nome: 'Tráfico de Entorpecentes',
    categoria: 'armas-drogas',
    descricao: 'Vender, comprar, produzir, transportar, remeter, preparar ou fornecer drogas ilícitas, ainda que gratuitamente.',
    pena: 35,
    multa: 15000,
    fianca: null
  },
  {
    artigo: 'Art. 28-D',
    nome: 'Posse de Entorpecentes para Consumo',
    categoria: 'armas-drogas',
    descricao: 'Adquirir, guardar, tiver em depósito, transportar ou trouxer consigo, para consumo pessoal, drogas sem autorização.',
    pena: 5,
    multa: 2000,
    fianca: 5000
  }
]

const categoriaLabels: Record<string, string> = {
  all: 'Todos os Crimes',
  pessoa: 'Contra a Pessoa',
  patrimonio: 'Contra o Patrimônio',
  transito: 'Trânsito',
  administracao: 'Admin. Pública',
  'armas-drogas': 'Armas & Drogas'
}

export default function CodigoPenalPage() {
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [calculator, setCalculator] = useState<{ crime: Crime; quantity: number }[]>([])

  const filteredCrimes = crimesList.filter((crime) => {
    const matchesSearch =
      crime.nome.toLowerCase().includes(search.toLowerCase()) ||
      crime.artigo.toLowerCase().includes(search.toLowerCase()) ||
      crime.descricao.toLowerCase().includes(search.toLowerCase())

    const matchesCategory = selectedCategory === 'all' || crime.categoria === selectedCategory

    return matchesSearch && matchesCategory
  })

  // Add crime to calculator
  const addToCalculator = (crime: Crime) => {
    setCalculator((prev) => {
      const existing = prev.find((item) => item.crime.artigo === crime.artigo)
      if (existing) {
        return prev.map((item) =>
          item.crime.artigo === crime.artigo ? { ...item, quantity: item.quantity + 1 } : item
        )
      }
      return [...prev, { crime, quantity: 1 }]
    })
  }

  // Remove one instance of crime from calculator
  const removeFromCalculator = (artigo: string) => {
    setCalculator((prev) =>
      prev
        .map((item) => {
          if (item.crime.artigo === artigo) {
            return { ...item, quantity: item.quantity - 1 }
          }
          return item
        })
        .filter((item) => item.quantity > 0)
    )
  }

  // Delete all instances of a crime from calculator
  const deleteFromCalculator = (artigo: string) => {
    setCalculator((prev) => prev.filter((item) => item.crime.artigo !== artigo))
  }

  // Clear calculator
  const clearCalculator = () => {
    setCalculator([])
  }

  // Calculate totals
  const totalPena = calculator.reduce((sum, item) => sum + item.crime.pena * item.quantity, 0)
  const totalMulta = calculator.reduce((sum, item) => sum + item.crime.multa * item.quantity, 0)
  
  // Checking bailable status
  const hasInafiancaveis = calculator.some((item) => item.crime.fianca === null)
  const totalFianca = hasInafiancaveis
    ? null
    : calculator.reduce((sum, item) => {
        if (item.crime.fianca === null) return sum
        return sum + item.crime.fianca * item.quantity
      }, 0)

  return (
    <>
      <SiteHeader />

      <main className="mx-auto max-w-[1600px] px-6 pb-24 pt-28 sm:px-10 lg:px-16">
        {/* Title Header */}
        <div className="relative text-center mb-12">
          <div className="flex items-center justify-center gap-2">
            <Gavel className="h-5 w-5 text-primary" />
            <span className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              Legislação Penal Oficial
            </span>
          </div>

          <h1 className="mt-5 text-4xl font-bold tracking-tight text-balance sm:text-5xl">
            Código Penal Militar e Civil
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-pretty leading-relaxed text-muted-foreground">
            Tabela de artigos, penas, multas e fianças aplicáveis. Utilize a calculadora lateral para somar penas e planejar abordagens ou processamentos criminais.
          </p>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Main Search & List Area (8 columns) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row gap-4 bg-card/40 border border-border/60 p-4 rounded-xl backdrop-blur-sm shadow-sm">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar por artigo, crime ou descrição..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-secondary/30 rounded-lg border border-border/60 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
              </div>

              {/* Category Selector */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2.5 text-sm bg-secondary/40 border border-border/60 rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
              >
                {Object.entries(categoriaLabels).map(([key, value]) => (
                  <option key={key} value={key} className="bg-card text-foreground">
                    {value}
                  </option>
                ))}
              </select>
            </div>

            {/* Crimes List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredCrimes.length === 0 ? (
                <div className="col-span-full text-center py-12 rounded-xl border border-dashed border-border/60 bg-card/20 text-muted-foreground">
                  Nenhum crime encontrado para "{search}"
                </div>
              ) : (
                filteredCrimes.map((crime) => (
                  <div
                    key={crime.artigo}
                    className="flex flex-col justify-between p-5 rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm transition-all hover:scale-[1.01] hover:bg-card/80 group shadow-sm"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                          {crime.artigo}
                        </span>
                        <span className="text-[9px] font-bold uppercase text-muted-foreground tracking-wider">
                          {categoriaLabels[crime.categoria]}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
                        {crime.nome}
                      </h3>

                      <p className="mt-2 text-xs text-muted-foreground leading-relaxed line-clamp-2" title={crime.descricao}>
                        {crime.descricao}
                      </p>
                    </div>

                    <div className="mt-5 pt-4 border-t border-border/20 flex flex-col gap-3">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 text-muted-foreground font-mono">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground/80" />
                          <span>Pena: <strong className="text-foreground">{crime.pena} meses</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground font-mono">
                          <Coins className="h-3.5 w-3.5 text-muted-foreground/80" />
                          <span>Multa: <strong className="text-foreground">R$ {crime.multa.toLocaleString('pt-BR')}</strong></span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-4 mt-1">
                        <div className="text-[10px] font-mono">
                          {crime.fianca !== null ? (
                            <span className="text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/15">
                              Fiança: R$ {crime.fianca.toLocaleString('pt-BR')}
                            </span>
                          ) : (
                            <span className="text-red-400 font-bold uppercase bg-red-500/10 px-2 py-0.5 rounded border border-red-500/15">
                              Inafiançável
                            </span>
                          )}
                        </div>

                        <button
                          onClick={() => addToCalculator(crime)}
                          className="flex items-center gap-1 text-[11px] font-bold text-primary hover:text-primary-foreground hover:bg-primary px-2.5 py-1.5 rounded-lg border border-primary/30 bg-primary/5 transition-all"
                        >
                          <Plus className="h-3 w-3" />
                          Adicionar
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

          </div>

          {/* Sentencing Calculator (4 columns) */}
          <div className="lg:col-span-4 lg:sticky lg:top-28">
            <div className="rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm p-6 space-y-6 shadow-md">
              <div className="flex items-center justify-between border-b border-border/20 pb-4">
                <div className="flex items-center gap-2">
                  <Scale className="h-4.5 w-4.5 text-primary" />
                  <h2 className="text-base font-bold text-foreground">Calculadora de Pena</h2>
                </div>
                {calculator.length > 0 && (
                  <button
                    onClick={clearCalculator}
                    title="Limpar tudo"
                    className="text-muted-foreground hover:text-red-400 transition-colors p-1"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              {calculator.length === 0 ? (
                <div className="text-center py-10 space-y-2">
                  <p className="text-xs text-muted-foreground italic">Nenhum crime adicionado.</p>
                  <p className="text-[10px] text-muted-foreground/80 max-w-[200px] mx-auto">
                    Clique em "+ Adicionar" nos artigos à esquerda para compor a sentença.
                  </p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                  {calculator.map((item) => (
                    <div
                      key={item.crime.artigo}
                      className="flex items-start justify-between gap-3 p-3 rounded-lg border border-border/40 bg-secondary/20 text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-primary font-mono text-[10px]">{item.crime.artigo}</span>
                          <span className="font-semibold truncate block text-foreground/90">{item.crime.nome}</span>
                        </div>
                        <div className="flex gap-3 mt-1.5 text-[10px] text-muted-foreground font-mono">
                          <span>{item.crime.pena * item.quantity} m</span>
                          <span>R$ {(item.crime.multa * item.quantity).toLocaleString('pt-BR')}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => removeFromCalculator(item.crime.artigo)}
                          className="px-1.5 py-0.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground text-[10px] font-bold"
                        >
                          -
                        </button>
                        <span className="font-bold font-mono px-1.5">{item.quantity}</span>
                        <button
                          onClick={() => addToCalculator(item.crime)}
                          className="px-1.5 py-0.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground text-[10px] font-bold"
                        >
                          +
                        </button>
                        <button
                          onClick={() => deleteFromCalculator(item.crime.artigo)}
                          className="p-1 hover:text-red-400 transition-colors ml-1 text-muted-foreground/80"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Sentencing Summary */}
              <div className="border-t border-border/20 pt-4 space-y-3.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="h-4 w-4 text-muted-foreground/70" />
                    <span>Pena Total:</span>
                  </div>
                  <strong className="text-foreground text-sm">{totalPena} meses</strong>
                </div>

                <div className="flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Coins className="h-4 w-4 text-muted-foreground/70" />
                    <span>Multa Acumulada:</span>
                  </div>
                  <strong className="text-foreground text-sm">R$ {totalMulta.toLocaleString('pt-BR')}</strong>
                </div>

                <div className="flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Scale className="h-4 w-4 text-muted-foreground/70" />
                    <span>Fiança Total:</span>
                  </div>
                  {totalFianca === null ? (
                    <span className="text-red-400 font-bold uppercase text-[10px] bg-red-500/10 px-2 py-0.5 rounded border border-red-500/15">
                      Inafiançável
                    </span>
                  ) : (
                    <strong className="text-emerald-400 text-sm">R$ {totalFianca.toLocaleString('pt-BR')}</strong>
                  )}
                </div>

                {calculator.length > 0 && hasInafiancaveis && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/15 text-[10px] text-red-400 leading-relaxed">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>
                      A sentença contém ao menos um crime inafiançável. O detido não poderá pagar fiança para ser liberado.
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </main>
    </>
  )
}
