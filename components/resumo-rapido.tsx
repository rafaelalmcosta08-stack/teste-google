import { Radio, Gauge, Shield, Users, MessageSquare } from 'lucide-react'

export function ResumoRapido() {
  return (
    <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {/* Codigos Q Essenciais */}
      <div className="rounded-xl border border-border/60 bg-card/60 p-6">
        <div className="mb-4 flex items-center gap-2">
          <Radio className="h-4 w-4 text-foreground" />
          <h3 className="text-sm font-bold text-foreground">Codigos Q Essenciais</h3>
        </div>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li><span className="font-semibold text-foreground">QAP</span> - Na escuta</li>
          <li><span className="font-semibold text-foreground">QRA</span> - Nome/ID</li>
          <li><span className="font-semibold text-foreground">QRR</span> - Apoio</li>
          <li><span className="font-semibold text-foreground">QRU</span> - Mensagem</li>
          <li><span className="font-semibold text-foreground">QSL</span> - Entendido</li>
          <li><span className="font-semibold text-foreground">QTH</span> - Local</li>
        </ul>
      </div>

      {/* Codigos de Intensidade */}
      <div className="rounded-xl border border-border/60 bg-card/60 p-6">
        <div className="mb-4 flex items-center gap-2">
          <Gauge className="h-4 w-4 text-foreground" />
          <h3 className="text-sm font-bold text-foreground">Codigos de Intensidade</h3>
        </div>
        <ul className="space-y-2 text-sm">
          <li>
            <span className="font-bold text-green-500">0-1</span>
            <span className="text-muted-foreground"> - Normal/Rotina</span>
          </li>
          <li>
            <span className="font-bold text-yellow-500">2-3</span>
            <span className="text-muted-foreground"> - Suspeita/Ocorrencia</span>
          </li>
          <li>
            <span className="font-bold text-orange-500">4-5</span>
            <span className="text-muted-foreground"> - Risco/Perseguicao</span>
          </li>
          <li>
            <span className="font-bold text-red-500">6-7</span>
            <span className="text-muted-foreground"> - Tiroteio/Critico</span>
          </li>
        </ul>
      </div>

      {/* Uso da Forca */}
      <div className="rounded-xl border border-border/60 bg-card/60 p-6">
        <div className="mb-4 flex items-center gap-2">
          <Shield className="h-4 w-4 text-foreground" />
          <h3 className="text-sm font-bold text-foreground">Uso da Forca</h3>
        </div>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li><span className="font-semibold text-foreground">1</span> - Presenca</li>
          <li><span className="font-semibold text-foreground">2</span> - Verbalizacao</li>
          <li><span className="font-semibold text-foreground">3</span> - Algemas</li>
          <li><span className="font-semibold text-foreground">4</span> - Imobilizacao</li>
          <li><span className="font-semibold text-foreground">5</span> - Taser/Cassetete</li>
          <li><span className="font-semibold text-foreground">6</span> - Arma de Fogo</li>
        </ul>
      </div>

      {/* Tipos de Abordagem */}
      <div className="rounded-xl border border-border/60 bg-card/60 p-6">
        <div className="mb-4 flex items-center gap-2">
          <Users className="h-4 w-4 text-foreground" />
          <h3 className="text-sm font-bold text-foreground">Tipos de Abordagem</h3>
        </div>
        <ul className="space-y-2 text-sm">
          <li>
            <span className="font-bold text-green-500">Codigo 1</span>
            <span className="text-muted-foreground"> - Instrutiva, sem revista</span>
          </li>
          <li>
            <span className="font-bold text-yellow-500">Codigo 2</span>
            <span className="text-muted-foreground"> - Suspeita, teste residual</span>
          </li>
          <li>
            <span className="font-bold text-red-500">Codigo 3</span>
            <span className="text-muted-foreground"> - Flagrante, com revista</span>
          </li>
        </ul>
      </div>

      {/* Estrutura da Modulacao */}
      <div className="rounded-xl border border-border/60 bg-card/60 p-6 sm:col-span-1 lg:col-span-2">
        <div className="mb-4 flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-foreground" />
          <h3 className="text-sm font-bold text-foreground">Estrutura da Modulacao</h3>
        </div>
        <p className="mb-3 text-xs text-muted-foreground">Ordem correta:</p>
        <ol className="space-y-2 text-sm text-muted-foreground">
          <li>1. Contato Inicial (QAP Central)</li>
          <li>2. Acao (Abordagem/Acompanhamento)</li>
          <li>3. QRU (O que aconteceu)</li>
          <li>4. QTH (Local)</li>
          <li>5. Descricao (Caracteristicas)</li>
          <li>6. QRR (Apoio necessario)</li>
        </ol>
      </div>
    </div>
  )
}
