'use client'

import { useState } from 'react'
import {
  ShieldAlert,
  Scale,
  Users,
  MessageSquare,
  Eye,
  AlertOctagon,
  Search,
} from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

const condutaSections = [
  {
    id: 'hierarquia',
    titulo: '1. Hierarquia e Disciplina',
    icon: Users,
    resumo: 'A base de toda corporação militarizada reside no respeito à cadeia de comando e na disciplina rígida.',
    conteudo: `A hierarquia e a disciplina são as colunas de sustentação do Departamento de Polícia. Qualquer quebra desses pilares constitui infração grave sujeita a medidas disciplinares.

• Respeito à Patente: Todo oficial deve demonstrar deferência e respeito aos superiores de patente. Prestar a devida continência quando em fardamento.
• Cadeia de Comando: Ordens legítimas de superiores imediatos devem ser acatadas prontamente e executadas fielmente. Em caso de ordens manifestamente ilegais, o subordinado deve reportar diretamente à Corregedoria.
• Comunicação Formal: Use pronomes de tratamento adequados (ex: "Senhor", "Senhora", "Recruta", "Cabo", "Sargento", "Tenente", "Capitão", "Coronel") para se referir a colegas em canais de rádio ou voz presenciais.`
  },
  {
    id: 'postura',
    titulo: '2. Postura e Comportamento',
    icon: Eye,
    resumo: 'Como representante do Estado, a postura do oficial reflete a imagem de toda a corporação.',
    conteudo: `Cada policial é o espelho da corporação perante os cidadãos. Espera-se uma conduta exemplar a todo momento.

• Linguagem Adequada: É expressamente proibido o uso de termos de baixo calão, gírias excessivas ou linguagem ofensiva durante o serviço ou modulação.
• Preservação da Vida: O principal objetivo de qualquer oficial é a preservação da vida e integridade física de todos, inclusive dos próprios suspeitos. A força letal deve ser sempre o último recurso.
• Abuso de Autoridade: O uso do cargo para benefício próprio, intimidação de civis, apreensão arbitrária de pertences ou aplicação de penalidades sem amparo legal resultará em exoneração imediata e prisão.`
  },
  {
    id: 'comunicacao',
    titulo: '3. Comunicação e Rádio',
    icon: MessageSquare,
    resumo: 'A modulação de rádio deve ser exclusivamente operacional, clara e concisa.',
    conteudo: `As frequências de rádio são o sistema nervoso da corporação. Mantenha a modulação limpa e precisa.

• Código Q: Utilize o Código Q padronizado para todas as transmissões de rotina (QAP, QSL, QTH, QTR, QRV, etc.).
• Silêncio de Rádio: Quando uma unidade anunciar prioridade ou estiver em acompanhamento tático (Código 5), todas as outras unidades devem manter silêncio absoluto no rádio, abrindo canal apenas para informações cruciais ou solicitação de apoio imediato.
• Proibições: É terminantemente proibido brincar, cantar, produzir ruídos ou discutir em canais de rádio oficiais.`
  },
  {
    id: 'patrulhamento',
    titulo: '4. Diretrizes de Patrulhamento',
    icon: ShieldAlert,
    resumo: 'Regras táticas e procedimentos operacionais padrão para o patrulhamento preventivo.',
    conteudo: `O patrulhamento eficiente garante a integridade dos oficiais e a segurança das áreas monitoradas.

• Composição de Guarnição: Recomenda-se sempre patrulhar em dupla (mínimo de 2 oficiais por viatura) para garantir a cobertura tática e segurança recíproca.
• Zonas de Risco: Ao patrulhar ou entrar em áreas de alta periculosidade, informe imediatamente sua unidade, mantenha os armamentos semi-automáticos prontos para uso defensivo e o veículo em ponto de fuga.
• Danos ao Patrimônio: Danificar propositalmente viaturas ou propriedades públicas/privadas é considerado infração administrativa leve a média, acarretando custos de manutenção ao oficial.`
  },
  {
    id: 'detencao',
    titulo: '5. Procedimento de Abordagem e Detenção',
    icon: Scale,
    resumo: 'As regras para deter e processar suspeitos dentro da legalidade.',
    conteudo: `A legalidade e a transparência garantem que a justiça seja mantida e evitam nulidades nos inquéritos.

• Direitos do Detido: Ao dar voz de prisão a um indivíduo, você deve ler seus direitos constitucionais imediatamente: "Você tem o direito de permanecer em silêncio, tudo o que disser poderá e será usado contra você no tribunal. Você tem o direito a um advogado e a uma ligação física."
• Revista Pessoal: Apenas realize revistas pessoais quando houver flagrante delito, atitude suspeita confirmada via teste de resíduo, ou em buscas justificadas por mandado.
• Registro de Ocorrência: Toda detenção ou apreensão de material ilícito deve ser minuciosamente registrada no sistema Nômade pelo oficial responsável.`
  },
  {
    id: 'punicoes',
    titulo: '6. Infrações e Punições Administrativas',
    icon: AlertOctagon,
    resumo: 'O que acontece em caso de descumprimento de qualquer diretriz deste manual.',
    conteudo: `O descumprimento dos deveres descritos neste manual sujeita o infrator às seguintes penalidades da Corregedoria:

• Advertência Verbal: Para pequenos deslizes de conduta ou imperícia leve.
• Advertência por Escrito: Registro oficial na ficha funcional em caso de reincidência de conduta indevida ou desobediência a normas básicas.
• Afastamento Temporário: Suspensão do direito de patrulhar e portar armamento por período de 1 a 7 dias, dependendo da gravidade.
• Exoneração com Desonra: Desligamento permanente dos quadros da corporação em casos de corrupção, abuso grave de poder, traição ou infrações reiteradas sem recuperação.`
  }
]

export default function ManualCondutaPage() {
  const [search, setSearch] = useState('')

  const filteredSections = condutaSections.filter(
    (s) =>
      s.titulo.toLowerCase().includes(search.toLowerCase()) ||
      s.resumo.toLowerCase().includes(search.toLowerCase()) ||
      s.conteudo.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      <SiteHeader />

      <main className="mx-auto max-w-[1600px] px-6 pb-24 pt-28 sm:px-10 lg:px-16">
        {/* Header */}
        <div className="relative text-center">
          <div className="flex items-center justify-center gap-2">
            <Scale className="h-5 w-5 text-primary" />
            <span className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              Corregedoria & Ética
            </span>
          </div>

          <h1 className="mt-5 text-4xl font-bold tracking-tight text-balance sm:text-5xl">
            Manual de Conduta Policial
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-pretty leading-relaxed text-muted-foreground">
            Diretrizes oficiais de comportamento, ética, disciplina e procedimentos táticos exigidos de todos os agentes do Departamento de Polícia.
          </p>

          {/* Search Box */}
          <div className="mx-auto mt-8 max-w-md relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Pesquisar diretrizes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-secondary/30 rounded-xl border border-border/60 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>
        </div>

        {/* Content list */}
        <div className="mt-12 max-w-4xl mx-auto">
          {filteredSections.length === 0 ? (
            <div className="text-center py-12 rounded-xl border border-dashed border-border/60 bg-card/20 text-muted-foreground">
              Nenhuma diretriz encontrada para "{search}"
            </div>
          ) : (
            <Accordion className="space-y-4" type="multiple">
              {filteredSections.map((section) => {
                const Icon = section.icon
                return (
                  <AccordionItem
                    key={section.id}
                    value={section.id}
                    className="overflow-hidden rounded-xl border border-border/60 bg-card/60 px-2 shadow-sm"
                  >
                    <AccordionTrigger className="px-4 py-5 hover:no-underline text-left">
                      <div className="flex items-start gap-4">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
                          <Icon className="h-5 w-5 text-foreground" />
                        </span>
                        <div>
                          <span className="text-base font-bold text-foreground block">{section.titulo}</span>
                          <span className="text-xs text-muted-foreground mt-0.5 block font-normal">{section.resumo}</span>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-6 pl-14 border-t border-border/10 pt-4">
                      <p className="whitespace-pre-wrap leading-relaxed text-sm text-muted-foreground/90">{section.conteudo}</p>
                    </AccordionContent>
                  </AccordionItem>
                )
              })}
            </Accordion>
          )}
        </div>
      </main>
    </>
  )
}
