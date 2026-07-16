import { notFound } from 'next/navigation'
import { Clock } from 'lucide-react'

const secoes: Record<string, { titulo: string; descricao: string }> = {
  fardamento: {
    titulo: 'Fardamento',
    descricao: 'Regulamentos e padrões de fardamento do Departamento de Polícia Legacy.',
  },
  armamento: {
    titulo: 'Armamento',
    descricao: 'Normas de uso, porte e manuseio de armamento oficial.',
  },
  hierarquia: {
    titulo: 'Hierarquia',
    descricao: 'Estrutura hierárquica e patentes do Departamento de Polícia Legacy.',
  },
  cursos: {
    titulo: 'Cursos',
    descricao: 'Cursos disponíveis para capacitação e progressão de carreira.',
  },
  editais: {
    titulo: 'Editais',
    descricao: 'Editais oficiais de concursos e processos seletivos internos.',
  },
  perimetros: {
    titulo: 'Perímetros',
    descricao: 'Definição e mapeamento dos perímetros de atuação policial.',
  },
  'manual-de-conduta': {
    titulo: 'Manual de Conduta',
    descricao: 'Normas e diretrizes de conduta para todos os membros da corporação.',
  },
  administracao: {
    titulo: 'Administração',
    descricao: 'Área administrativa restrita para gestão interna do departamento.',
  },
  viatura: {
    titulo: 'Viatura',
    descricao: 'Gestão, patrulhamento e alocação de viaturas oficiais.',
  },
  prisao: {
    titulo: 'Prisão',
    descricao: 'Registros de detenções, relatórios penais e controle de celas.',
  },
  acoes: {
    titulo: 'Ações',
    descricao: 'Planejamento e coordenação de ações táticas e operações especiais.',
  },
}

export function generateStaticParams() {
  return Object.keys(secoes).map((secao) => ({ secao }))
}

export default async function SecaoPage({
  params,
}: {
  params: Promise<{ secao: string }>
}) {
  const { secao } = await params
  const data = secoes[secao]

  if (!data) notFound()

  return (
    <main className="mx-auto max-w-[1600px] px-6 pb-24 pt-16 sm:px-10 lg:px-16">
      {/* Header da seção */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-2">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <span className="rounded-full border border-border/60 bg-secondary/50 px-3 py-1 text-xs font-semibold text-muted-foreground">
            Em Desenvolvimento
          </span>
        </div>

        <h1 className="mt-5 text-4xl font-bold tracking-tight text-balance sm:text-5xl">
          {data.titulo}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-pretty leading-relaxed text-muted-foreground">
          {data.descricao}
        </p>
      </div>

      {/* Placeholder de conteúdo */}
      <div className="mx-auto mt-16 max-w-3xl rounded-xl border border-border/60 bg-card/60 p-12 text-center backdrop-blur-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
          <Clock className="h-7 w-7 text-muted-foreground" />
        </div>
        <h2 className="mt-6 text-xl font-semibold">Conteúdo em breve</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Esta seção está sendo preparada pela equipe de administração.
          <br />
          Em breve o conteúdo completo estará disponível aqui.
        </p>
      </div>
    </main>
  )
}
