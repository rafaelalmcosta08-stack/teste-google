'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { 
  Lock, 
  Search, 
  Plus, 
  Edit, 
  Trash, 
  Check, 
  X, 
  AlertTriangle,
  FileText,
  Calendar,
  User,
  Shield,
  Clock,
  ChevronDown
} from 'lucide-react'

interface Prisao {
  id: string
  presoNome: string
  presoRg: string
  motivo: string
  dataHora: string
  oficialNome: string
  oficialQra: string
  oficialId: string
  observacoes: string | null
  createdAt: string
}

const COMMON_INFRACTIONS = [
  { label: 'Homicídio (Art. 121 CP)', text: 'Homicídio Qualificado (Art. 121, § 2º CP)' },
  { label: 'Tentativa de Homicídio', text: 'Tentativa de Homicídio (Art. 121 c/c Art. 14, II CP)' },
  { label: 'Roubo (Art. 157 CP)', text: 'Roubo Qualificado com Emprego de Violência (Art. 157 CP)' },
  { label: 'Furto de Veículo (Art. 155 CP)', text: 'Furto de Veículo Automotor (Art. 155, § 5º CP)' },
  { label: 'Tráfico de Drogas (Art. 33)', text: 'Tráfico Ilícito de Substâncias Entorpecentes (Art. 33, Lei 11.343/06)' },
  { label: 'Porte Ilegal de Arma (Art. 14)', text: 'Porte Ilegal de Arma de Fogo de Uso Permitido (Art. 14, Lei 10.826/03)' },
  { label: 'Desobediência (Art. 330 CP)', text: 'Desobediência a Ordem Legal de Funcionário Público (Art. 330 CP)' },
  { label: 'Direção Perigosa (Art. 311 CTB)', text: 'Conduzir veículo em velocidade incompatível / Direção Perigosa (Art. 311 CTB)' },
]

export default function PrisaoPage() {
  const { profile, session } = useAuth()
  const [items, setItems] = useState<Prisao[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Filtros de Histórico
  const [search, setSearch] = useState('')
  const [filterDate, setFilterDate] = useState('')

  // Controle de Visualização de Form / Modal de Edição
  const [isRegistering, setIsRegistering] = useState(false)
  const [editingItem, setEditingItem] = useState<Prisao | null>(null)

  // Form State
  const [presoNome, setPresoNome] = useState('')
  const [presoRg, setPresoRg] = useState('')
  const [motivo, setMotivo] = useState('')
  const [dataHora, setDataHora] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const isAltoComando = profile?.cargo?.includes('Alto Comando') || profile?.role === 'admin'
  const isCorregedoria = profile?.cargo?.includes('Diretor Corregedoria')

  async function loadItems() {
    setLoading(true)
    try {
      const res = await fetch('/api/prisoes')
      if (res.ok) {
        const data = await res.json()
        setItems(data.prisoes || [])
      } else {
        setError('Erro ao carregar o histórico de prisões.')
      }
    } catch (_) {
      setError('Erro de rede ao buscar prisões.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadItems()
    // Define a hora padrão no formulário para a hora atual local formatada para o input datetime-local
    const now = new Date()
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
    setDataHora(now.toISOString().slice(0, 16))
  }, [])

  function handleOpenRegister() {
    setEditingItem(null)
    setPresoNome('')
    setPresoRg('')
    setMotivo('')
    const now = new Date()
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
    setDataHora(now.toISOString().slice(0, 16))
    setObservacoes('')
    setError(null)
    setSuccess(null)
    setIsRegistering(true)
  }

  function handleOpenEdit(item: Prisao) {
    setEditingItem(item)
    setPresoNome(item.presoNome)
    setPresoRg(item.presoRg)
    setMotivo(item.motivo)
    
    const d = new Date(item.dataHora)
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
    setDataHora(d.toISOString().slice(0, 16))
    
    setObservacoes(item.observacoes || '')
    setError(null)
    setSuccess(null)
    setIsRegistering(true)
  }

  async function handleDelete(id: string) {
    if (!confirm('Tem certeza de que deseja excluir este registro de prisão permanentemente do sistema?')) return
    try {
      const res = await fetch('/api/prisoes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`
        },
        body: JSON.stringify({ action: 'delete', id })
      })
      if (res.ok) {
        setItems(prev => prev.filter(item => item.id !== id))
        setSuccess('Registro de prisão removido com sucesso.')
        setTimeout(() => setSuccess(null), 3000)
      } else {
        const d = await res.json()
        alert(d.error || 'Erro ao excluir.')
      }
    } catch (_) {
      alert('Erro de conexão ao tentar excluir.')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!presoNome.trim() || !presoRg.trim() || !motivo.trim()) {
      setError('Preencha os campos obrigatórios: Nome do Preso, ID do Preso e Motivo da Prisão.')
      return
    }

    setSubmitting(true)
    setError(null)
    setSuccess(null)

    const payload = {
      action: editingItem ? 'edit' : 'create',
      id: editingItem?.id,
      presoNome: presoNome.trim(),
      presoRg: presoRg.trim(),
      motivo: motivo.trim(),
      dataHora: dataHora ? new Date(dataHora).toISOString() : new Date().toISOString(),
      observacoes: observacoes.trim() || null
    }

    try {
      const res = await fetch('/api/prisoes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`
        },
        body: JSON.stringify(payload)
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao registrar prisão.')
      }

      setSuccess(editingItem ? 'Registro atualizado com sucesso!' : 'Prisão registrada com sucesso no sistema!')
      setIsRegistering(false)
      loadItems()

      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      setError(err.message || 'Houve um erro ao processar a requisição.')
    } finally {
      setSubmitting(false)
    }
  }

  // Filtragem
  const filteredItems = items.filter(item => {
    const term = search.toLowerCase()
    const matchesSearch = item.presoNome.toLowerCase().includes(term) || 
                          item.presoRg.toLowerCase().includes(term) || 
                          item.oficialQra.toLowerCase().includes(term) || 
                          item.oficialNome.toLowerCase().includes(term) ||
                          item.motivo.toLowerCase().includes(term)

    let matchesDate = true
    if (filterDate) {
      const itemDate = new Date(item.dataHora).toISOString().slice(0, 10)
      matchesDate = itemDate === filterDate
    }

    return matchesSearch && matchesDate
  })

  // Permissão para gerenciar registro específico
  function canManageRecord(item: Prisao) {
    const isOwner = item.oficialId === profile?.id
    return isOwner || isAltoComando || isCorregedoria
  }

  function formatDateTime(isoString: string) {
    try {
      const date = new Date(isoString)
      return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch (_) {
      return isoString
    }
  }

  return (
    <main className="mx-auto max-w-[1400px] px-6 pb-24 pt-10 sm:px-10 lg:px-12">
      {/* Top Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-10 border-b border-border/10 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Lock className="h-5 w-5 text-primary animate-pulse" />
            <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary uppercase tracking-wider">
              Sistema de Ocorrências
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Registro de Prisões</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Histórico permanente de detenções gerenciado pela Nômade para controle de fichas criminais e corregedoria.
          </p>
        </div>

        {!isRegistering && (
          <Button onClick={handleOpenRegister} className="w-full md:w-auto h-11 px-5 rounded-xl flex items-center justify-center gap-2">
            <Plus className="h-5 w-5" /> Registrar Prisão
          </Button>
        )}
      </div>

      {success && (
        <div className="mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-xs flex items-center gap-2">
          <Check className="h-5 w-5" />
          <span>{success}</span>
        </div>
      )}

      {isRegistering ? (
        /* FORMULÁRIO DE CADASTRO / EDIÇÃO */
        <div className="max-w-2xl mx-auto rounded-2xl border border-border/60 bg-card/60 backdrop-blur-md p-6 sm:p-8 shadow-xl">
          <div className="flex items-center justify-between border-b border-border/10 pb-4 mb-6">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {editingItem ? 'Editar Registro de Prisão' : 'Formulário de Detenção'}
            </h2>
            <button 
              onClick={() => setIsRegistering(false)} 
              className="text-muted-foreground hover:text-foreground text-xs font-bold border border-border/40 hover:bg-secondary/40 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
            >
              <X className="h-3.5 w-3.5" /> Cancelar
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Nome do Preso *</label>
                <input
                  type="text"
                  placeholder="Ex: Carlos 'Silvera' Silva"
                  value={presoNome}
                  onChange={(e) => setPresoNome(e.target.value)}
                  className="w-full px-3 py-2 bg-secondary/30 rounded-lg border border-border/60 text-xs focus:outline-none focus:ring-1 focus:ring-primary/40 text-foreground"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">ID do Preso (RG) *</label>
                <input
                  type="text"
                  placeholder="Ex: 1004"
                  value={presoRg}
                  onChange={(e) => setPresoRg(e.target.value)}
                  className="w-full px-3 py-2 bg-secondary/30 rounded-lg border border-border/60 text-xs focus:outline-none focus:ring-1 focus:ring-primary/40 text-foreground"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Data e Hora da Prisão *</label>
              <input
                type="datetime-local"
                value={dataHora}
                onChange={(e) => setDataHora(e.target.value)}
                className="w-full px-3 py-2 bg-secondary/30 rounded-lg border border-border/60 text-xs focus:outline-none focus:ring-1 focus:ring-primary/40 text-foreground"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">Motivo / Artigo da Prisão *</label>
              <textarea
                placeholder="Descreva as infrações cometidas ou insira os artigos..."
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                className="w-full h-24 px-3 py-2 bg-secondary/30 rounded-lg border border-border/60 text-xs focus:outline-none focus:ring-1 focus:ring-primary/40 text-foreground resize-none"
                required
              />

              {/* Botões rápidos de sugestões */}
              <div>
                <span className="text-[10px] text-muted-foreground block mb-2 font-mono uppercase tracking-wider">Artigos Comuns (Clique para inserir)</span>
                <div className="flex flex-wrap gap-1.5">
                  {COMMON_INFRACTIONS.map(inf => (
                    <button
                      key={inf.label}
                      type="button"
                      onClick={() => {
                        setMotivo(prev => prev ? `${prev}\n- ${inf.text}` : `- ${inf.text}`)
                      }}
                      className="px-2 py-1 text-[9px] border border-border/30 rounded bg-secondary/30 text-foreground hover:bg-secondary/60 hover:border-primary/30 transition-all"
                    >
                      +{inf.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Observações Adicionais (Opcional)</label>
              <textarea
                placeholder="Apreensão de itens, comparsas, contexto da abordagem, etc..."
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                className="w-full h-20 px-3 py-2 bg-secondary/30 rounded-lg border border-border/60 text-xs focus:outline-none focus:ring-1 focus:ring-primary/40 text-foreground resize-none"
              />
            </div>

            {/* Informações Automáticas de Log */}
            <div className="bg-secondary/25 border border-border/20 rounded-xl p-4 grid grid-cols-2 gap-4 text-xs">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-primary shrink-0" />
                <div>
                  <span className="text-[10px] text-muted-foreground block">Oficial Responsável</span>
                  <span className="font-semibold text-foreground">{profile?.username}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary shrink-0" />
                <div>
                  <span className="text-[10px] text-muted-foreground block">QRA de Registro</span>
                  <span className="font-semibold text-foreground">{profile?.qra || 'N/A'}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-border/10">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsRegistering(false)}
                disabled={submitting}
                className="flex-1 h-11 text-xs"
              >
                Voltar ao Histórico
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="flex-1 h-11 text-xs flex items-center justify-center gap-2"
              >
                {submitting ? 'Registrando...' : editingItem ? 'Salvar Alterações' : 'Registrar Prisão'}
              </Button>
            </div>
          </form>
        </div>
      ) : (
        /* HISTÓRICO DE PRISÕES */
        <div>
          {/* Barra de Busca */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            <div className="relative">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Filtrar por preso, RG, oficial, QRA ou motivo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-secondary/20 rounded-xl border border-border/50 text-xs focus:outline-none focus:ring-1 focus:ring-primary/40 text-foreground"
              />
            </div>

            <div className="relative">
              <Calendar className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-secondary/20 rounded-xl border border-border/50 text-xs focus:outline-none focus:ring-1 focus:ring-primary/40 text-foreground h-[38px]"
              />
            </div>
          </div>

          {/* Histórico Lista */}
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-16 bg-card/20 rounded-2xl border border-border/40 p-10">
              <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-55" />
              <h3 className="text-lg font-semibold">Nenhuma ocorrência registrada</h3>
              <p className="text-xs text-muted-foreground mt-1">Nenhum registro corresponde aos filtros de busca aplicados.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredItems.map((item) => {
                const canManage = canManageRecord(item)
                return (
                  <div 
                    key={item.id} 
                    className="group border border-border/40 bg-card/30 rounded-2xl p-5 hover:border-primary/20 hover:bg-card/50 transition-all duration-300"
                  >
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      {/* Preso Principal */}
                      <div className="flex items-start gap-3.5">
                        <div className="h-10 w-10 shrink-0 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-center text-red-500">
                          <Lock className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-bold text-foreground">{item.presoNome}</h3>
                            <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-secondary text-muted-foreground border border-border/40">
                              RG: {item.presoRg}
                            </span>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-[10.5px] text-muted-foreground">
                            <span className="flex items-center gap-1 font-mono">
                              <Clock className="h-3.5 w-3.5 text-primary" /> {formatDateTime(item.dataHora)}
                            </span>
                            <span className="flex items-center gap-1">
                              <User className="h-3.5 w-3.5 text-primary" /> Oficial: {item.oficialNome} ({item.oficialQra})
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Ações Administrador / Autor do registro */}
                      {canManage && (
                        <div className="flex items-center gap-2 self-end md:self-start shrink-0">
                          <Button 
                            variant="secondary" 
                            size="sm" 
                            onClick={() => handleOpenEdit(item)}
                            className="h-8 rounded-lg text-[11px] px-3 flex items-center gap-1 text-foreground"
                          >
                            <Edit className="h-3.5 w-3.5" /> Editar
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            onClick={() => handleDelete(item.id)}
                            className="h-8 w-8 rounded-lg flex items-center justify-center bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/15"
                          >
                            <Trash className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Descrição e Motivo */}
                    <div className="mt-4 bg-secondary/15 border border-border/25 rounded-xl p-4">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-primary block mb-1">Motivo / Artigos Atribuídos</span>
                      <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">{item.motivo}</p>

                      {item.observacoes && (
                        <div className="mt-3.5 pt-3.5 border-t border-border/10">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block mb-1">Observações Operacionais</span>
                          <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">{item.observacoes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </main>
  )
}
