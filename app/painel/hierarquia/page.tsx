'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Award,
  Shield,
  Search,
  Check,
  X,
  Clock,
  User,
  AlertTriangle,
  Calendar,
  AlertOctagon,
  Info,
  ChevronDown,
} from 'lucide-react'

// Opções de Patentes
const PATENTES = [
  'Coronel',
  'Tenente-Coronel',
  'Major',
  'Capitão',
  '1º Tenente',
  '2º Tenente',
  'Aluno Oficial',
  'Sub Tenente',
  '1º Sargento',
  '2º Sargento',
  '3º Sargento',
  'Cabo',
  'Soldado',
  'Recruta',
]

// Opções de Cargos
const CARGOS = [
  'Alto Comando',
  'Diretor Corregedoria',
  'Membro Corregedoria',
  'Diretor APM',
  'Supervisor APM',
  'Instrutor Treinamento Operacional',
  'Instrutor De Cursos e Recrutamentos',
  'Coordenador Do Comitê Promocional',
  'Membro Do Comitê Promocional',
  'Comando Militar',
  'Sub Comando Militar',
  'Rádio Patrulha',
  'Comando Bope',
  'Coordenador Bope',
  'Executor Bope',
  'Operador Bope',
  'Probatório Bope',
  'Comando Core',
  'Coordenador Core',
  'Executor Core',
  'Operador Core',
  'Probatório Core',
  'Comando GAR',
  'Coordenador GAR',
  'Membro GAR',
  'Comando GAEP',
  'Coordenador GAEP',
  'Membro GAEP',
  'Comando GTM',
  'Coordenador GTM',
  'Membro GTM',
  'Sem Efetividade',
]

// Unidades Administrativas
const UNIDADES_ADMINISTRATIVAS = ['Corregedoria', 'APM', 'Sem Efetividade']

// Unidades Operacionais
const UNIDADES_OPERACIONAIS = ['GAEP', 'GTM', 'GAR', 'BOPE', 'CORE', 'Sem Efetividade']

// Cursos
const CURSOS = [
  'Aperfeiçoamento De Oficial',
  'Academia Barro Branco',
  'Formação De Sargento',
  'Formação De Soldado',
  'Operações Especiais',
  'Abordagem',
  'Modulação',
  'Acompanhamento',
  'Postura',
  'Instrução',
  'Negociação',
  'Tático De Motocicletas',
  'Piloto Operacional',
  'Atirador Operacional',
  'Perícia',
  'Interrogatório',
  'Perímetro',
]

// Advertências
const ADVERTENCIAS = [
  'Advertência Verbal',
  '1º Advertência',
  '2º Advertência',
  '3º Advertência',
  'Advertência Ação 1/3',
  'Advertência Ação 2/3',
  'Advertência Ação 3/3',
]

interface UserProfile {
  id: string
  username: string
  qra: string | null
  patente: string | null
  status: 'pendente' | 'aprovado' | 'rejeitado'
  role: 'user' | 'admin'
  created_at: string
  cargo: string[]
  unidade_administrativa: string
  unidade_operacional: string
  status_atividade: 'Ativo' | 'Inativo'
  last_login_at: string | null
  status_atividade_override_at: string | null
  cursos: string[]
  advertencia: string[]
}

export default function HierarquiaPage() {
  const { profile: myProfile } = useAuth()
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)
  
  // Controle de qual dropdown de célula está aberto
  const [activeDropdown, setActiveDropdown] = useState<{ userId: string; field: string } | null>(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/usuarios')
      const json = await res.json()
      setUsers(json.usuarios ?? [])
    } catch {
      setUsers([])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    const handleGlobalClick = () => {
      // O backdrop transparente cuida do fechamento ao clicar fora,
      // mas mantemos isso como redundância limpa.
    }
    window.addEventListener('click', handleGlobalClick)
    return () => window.removeEventListener('click', handleGlobalClick)
  }, [])

  // Salva alteração de campo no servidor
  const saveUserField = async (userId: string, fields: Partial<UserProfile>) => {
    setSavingId(userId)
    try {
      await fetch('/api/admin/usuarios', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, ...fields }),
      })
    } catch (e) {
      console.error('Erro ao salvar alteração:', e)
    }
    setSavingId(null)
  }

  // Toggles de Seleção Única
  const handleSingleSelect = async (userId: string, field: string, value: string) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, [field]: value } : u))
    )
    
    const updatePayload: Partial<UserProfile> = { [field]: value }
    
    // Se for alteração manual de status, registramos o override timestamp para "resetar" os 15 dias
    if (field === 'status_atividade') {
      const nowStr = new Date().toISOString()
      updatePayload.status_atividade_override_at = nowStr
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, status_atividade_override_at: nowStr } : u))
      )
    }

    await saveUserField(userId, updatePayload)
    setActiveDropdown(null)
  }

  // Toggles de Seleção Múltipla (Cargos, Cursos, Advertências)
  const handleMultiSelectToggle = async (userId: string, field: 'cargo' | 'cursos' | 'advertencia', value: string) => {
    const user = users.find((u) => u.id === userId)
    if (!user) return

    const currentValues = user[field] || []
    const exists = currentValues.includes(value)
    
    let newValues: string[] = []
    
    if (exists) {
      newValues = currentValues.filter((v) => v !== value)
    } else {
      if (value === 'Sem Efetividade') {
        newValues = ['Sem Efetividade']
      } else {
        newValues = [...currentValues.filter((v) => v !== 'Sem Efetividade'), value]
      }
    }

    // Fallback padrão se ficar vazio
    if (newValues.length === 0) {
      if (field === 'cargo') {
        newValues = ['Sem Efetividade']
      }
    }

    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, [field]: newValues } : u))
    )

    await saveUserField(userId, { [field]: newValues })
  }

  const getPatenteColorClass = (patente: string | null) => {
    if (!patente) return 'text-muted-foreground bg-secondary/40 border-border/60'
    const p = patente.toLowerCase()
    if (p.includes('coronel') || p.includes('major') || p.includes('capitão')) {
      return 'text-red-400 bg-red-400/10 border-red-500/30'
    }
    if (p.includes('tenente') || p.includes('oficial')) {
      return 'text-blue-400 bg-blue-400/10 border-blue-500/30'
    }
    if (p.includes('sargento')) {
      return 'text-yellow-400 bg-yellow-400/10 border-yellow-500/30'
    }
    if (p.includes('cabo') || p.includes('soldado')) {
      return 'text-green-400 bg-green-400/10 border-green-500/30'
    }
    return 'text-gray-400 bg-gray-400/10 border-gray-500/20'
  }

  // Filtra usuários aprovados
  const aprovados = users.filter((u) => u.status === 'aprovado')
  const filteredUsers = aprovados.filter(
    (u) =>
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.qra && u.qra.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  // Caso o usuário conectado seja comum, ele só visualiza o próprio perfil (ou todos de forma read-only)
  const isAdmin = myProfile?.role === 'admin'
  const myDetailedProfile = users.find((u) => u.id === myProfile?.id)

  if (!isAdmin) {
    return (
      <main className="mx-auto max-w-[1600px] px-6 pb-24 pt-16 sm:px-10 lg:px-16">
        {/* Cabeçalho */}
        <div className="mb-12">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
            <Award className="h-6 w-6 text-foreground" />
          </div>
          <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl">Minha Hierarquia</h1>
          <p className="mt-3 text-muted-foreground">
            Visualize sua patente, cargos ativos, cursos concluídos e ficha disciplinar.
          </p>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando informações...</p>
        ) : myDetailedProfile ? (
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Coluna Principal: Detalhes do Policial */}
            <div className="lg:col-span-2 space-y-6">
              <div className="rounded-2xl border border-border/60 bg-card/20 p-8 backdrop-blur-md">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-6 mb-6">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-xl font-bold text-white">
                      {myDetailedProfile.username[0].toUpperCase()}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold tracking-tight">{myDetailedProfile.username}</h2>
                      <p className="text-sm text-muted-foreground">QRA: <span className="text-foreground font-semibold">{myDetailedProfile.qra ?? 'Não Definido'}</span></p>
                    </div>
                  </div>
                  <div>
                    <span className={`inline-flex rounded-full border px-4 py-1 text-sm font-semibold ${getPatenteColorClass(myDetailedProfile.patente)}`}>
                      {myDetailedProfile.patente ?? 'Recruta'}
                    </span>
                  </div>
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Unidade Administrativa</h3>
                    <div className="rounded-lg border border-border/40 bg-secondary/20 px-3 py-2 text-sm font-medium">
                      {myDetailedProfile.unidade_administrativa || 'Sem Efetividade'}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Unidade Operacional</h3>
                    <div className="rounded-lg border border-border/40 bg-secondary/20 px-3 py-2 text-sm font-medium">
                      {myDetailedProfile.unidade_operacional || 'Sem Efetividade'}
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Cargo(s) Ativo(s)</h3>
                    <div className="flex flex-wrap gap-2">
                      {myDetailedProfile.cargo && myDetailedProfile.cargo.length > 0 ? (
                        myDetailedProfile.cargo.map((c) => (
                          <span key={c} className="rounded-full border border-border/60 bg-secondary/40 px-3 py-1 text-xs font-medium text-foreground">
                            {c}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">Sem Efetividade</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Seção de Cursos */}
              <div className="rounded-2xl border border-border/60 bg-card/20 p-8 backdrop-blur-md">
                <div className="flex items-center gap-2 mb-6">
                  <Award className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-bold">Cursos e Especializações</h3>
                </div>
                {myDetailedProfile.cursos && myDetailedProfile.cursos.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {myDetailedProfile.cursos.map((curso) => (
                      <div key={curso} className="flex items-center gap-2.5 rounded-lg border border-border/40 bg-secondary/10 px-3.5 py-3 text-sm font-medium">
                        <Check className="h-4 w-4 shrink-0 text-green-400" />
                        <span>{curso}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum curso registrado até o momento.</p>
                )}
              </div>
            </div>

            {/* Sidebar Lateral: Atividade & Advertências */}
            <div className="space-y-6">
              {/* Status de Atividade */}
              <div className="rounded-2xl border border-border/60 bg-card/20 p-6 backdrop-blur-md">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Status de Atividade</h3>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${myDetailedProfile.status_atividade === 'Inativo' ? 'bg-zinc-500' : 'bg-green-400 animate-pulse'}`} />
                    <span className="font-semibold text-foreground">{myDetailedProfile.status_atividade ?? 'Ativo'}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">Regra de 15 dias ativa</span>
                </div>
                <div className="mt-4 border-t border-border/40 pt-4 space-y-2 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Último Login:</span>
                    <span className="text-foreground font-medium">
                      {myDetailedProfile.last_login_at
                        ? new Date(myDetailedProfile.last_login_at).toLocaleDateString('pt-BR')
                        : 'Hoje (Sem registro histórico)'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Ficha Disciplinar (Advertências) */}
              <div className="rounded-2xl border border-border/60 bg-card/20 p-6 backdrop-blur-md">
                <div className="flex items-center gap-2 mb-4">
                  <AlertOctagon className="h-5 w-5 text-red-400" />
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Ficha Disciplinar</h3>
                </div>
                {myDetailedProfile.advertencia && myDetailedProfile.advertencia.length > 0 ? (
                  <div className="space-y-2">
                    {myDetailedProfile.advertencia.map((adv) => (
                      <div key={adv} className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs font-semibold text-red-400">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                        <span>{adv}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rounded-lg border border-green-500/20 bg-green-500/5 px-3 py-3 text-xs font-semibold text-green-400">
                    <Check className="h-3.5 w-3.5 shrink-0" />
                    <span>Ficha totalmente limpa</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Perfil não encontrado.</p>
        )}
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-[1600px] px-6 pb-24 pt-16 sm:px-10 lg:px-16">
      {/* Backdrop transparente para fechar dropdowns */}
      {activeDropdown && (
        <div
          className="fixed inset-0 z-40 bg-transparent"
          onClick={() => setActiveDropdown(null)}
        />
      )}

      {/* Cabeçalho */}
      <div className="mb-12">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
          <Award className="h-6 w-6 text-foreground" />
        </div>
        <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl">Hierarquia Policial</h1>
        <p className="mt-3 text-muted-foreground">
          Gerencie patentes, cargos, unidades administrativas/operacionais, cursos e advertências dos policiais ativos.
        </p>
      </div>

      {/* Barra de Filtros */}
      <div className="mb-6 flex max-w-md items-center gap-3">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por QRA ou Usuário..."
            className="pl-9 h-10 border-border/60 bg-secondary/20"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {savingId && (
          <span className="text-xs text-muted-foreground animate-pulse shrink-0">Salvando...</span>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando painel de hierarquia...</p>
      ) : filteredUsers.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum policial aprovado encontrado.</p>
      ) : (
        <div className="overflow-visible rounded-xl border border-border/60 bg-card/20 backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border/60 bg-secondary/30">
                <tr>
                  <th className="px-4 py-4 text-left font-semibold text-muted-foreground">Usuário / QRA</th>
                  <th className="px-4 py-4 text-left font-semibold text-muted-foreground">Patente</th>
                  <th className="px-4 py-4 text-left font-semibold text-muted-foreground">Cargo(s)</th>
                  <th className="px-4 py-4 text-left font-semibold text-muted-foreground">Unid. Admin</th>
                  <th className="px-4 py-4 text-left font-semibold text-muted-foreground">Unid. Operacional</th>
                  <th className="px-4 py-4 text-left font-semibold text-muted-foreground">Status</th>
                  <th className="px-4 py-4 text-left font-semibold text-muted-foreground">Curso(s)</th>
                  <th className="px-4 py-4 text-left font-semibold text-muted-foreground">Advertência(s)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredUsers.map((u) => {
                  const isOpen = (field: string) => activeDropdown?.userId === u.id && activeDropdown?.field === field
                  const toggleOpen = (field: string, e: React.MouseEvent) => {
                    e.stopPropagation()
                    if (isOpen(field)) {
                      setActiveDropdown(null)
                    } else {
                      setActiveDropdown({ userId: u.id, field })
                    }
                  }

                  return (
                    <tr key={u.id} className="bg-background/10 transition-colors hover:bg-secondary/10">
                      {/* QRA / Usuário */}
                      <td className="px-4 py-4 font-medium whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-bold text-foreground">{u.qra || '—'}</span>
                          <span className="text-xs text-muted-foreground">({u.username})</span>
                        </div>
                      </td>

                      {/* Patente */}
                      <td className="px-4 py-4 relative">
                        <button
                          onClick={(e) => toggleOpen('patente', e)}
                          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold hover:opacity-85 cursor-pointer transition-opacity ${getPatenteColorClass(
                            u.patente
                          )}`}
                        >
                          <span>{u.patente ?? 'Recruta'}</span>
                          <ChevronDown className="h-3 w-3 opacity-60" />
                        </button>

                        {isOpen('patente') && (
                          <div className="absolute left-4 top-12 z-55 w-48 max-h-60 overflow-y-auto rounded-lg border border-border/80 bg-popover p-1 shadow-xl backdrop-blur-md">
                            {PATENTES.map((pat) => (
                              <button
                                key={pat}
                                onClick={() => handleSingleSelect(u.id, 'patente', pat)}
                                className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs font-medium hover:bg-secondary text-foreground ${
                                  u.patente === pat ? 'bg-secondary' : ''
                                }`}
                              >
                                <span>{pat}</span>
                                {u.patente === pat && <Check className="h-3.5 w-3.5 text-primary" />}
                              </button>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Cargos */}
                      <td className="px-4 py-4 relative min-w-[200px]">
                        <div
                          onClick={(e) => toggleOpen('cargo', e)}
                          className="flex flex-wrap gap-1 max-w-[280px] p-1.5 rounded-lg border border-border/30 bg-secondary/10 hover:bg-secondary/20 cursor-pointer transition-all min-h-[36px]"
                        >
                          {u.cargo && u.cargo.length > 0 && u.cargo[0] !== 'Sem Efetividade' ? (
                            u.cargo.map((c) => (
                              <span
                                key={c}
                                className="rounded-full bg-secondary/80 px-2 py-0.5 text-[10px] font-semibold text-foreground border border-border/40"
                              >
                                {c}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground p-0.5">Sem Efetividade</span>
                          )}
                          <ChevronDown className="h-3.5 w-3.5 ml-auto self-center opacity-60" />
                        </div>

                        {isOpen('cargo') && (
                          <div className="absolute left-4 top-14 z-55 w-64 max-h-72 overflow-y-auto rounded-lg border border-border/80 bg-popover p-1 shadow-xl backdrop-blur-md">
                            <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase border-b border-border/30 mb-1">
                              Selecionar Cargos
                            </div>
                            {CARGOS.map((car) => {
                              const isChecked = u.cargo?.includes(car)
                              return (
                                <button
                                  key={car}
                                  onClick={() => handleMultiSelectToggle(u.id, 'cargo', car)}
                                  className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs hover:bg-secondary text-left text-foreground font-medium"
                                >
                                  <div className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border border-border/60">
                                    {isChecked && <Check className="h-3 w-3 text-primary" />}
                                  </div>
                                  <span className="truncate">{car}</span>
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </td>

                      {/* Unid Admin */}
                      <td className="px-4 py-4 relative">
                        <button
                          onClick={(e) => toggleOpen('unidade_administrativa', e)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-border/50 bg-secondary/30 px-2.5 py-1 text-xs font-medium hover:bg-secondary/50 text-foreground"
                        >
                          <span>{u.unidade_administrativa || 'Sem Efetividade'}</span>
                          <ChevronDown className="h-3 w-3 opacity-60" />
                        </button>

                        {isOpen('unidade_administrativa') && (
                          <div className="absolute left-4 top-12 z-55 w-48 rounded-lg border border-border/80 bg-popover p-1 shadow-xl backdrop-blur-md">
                            {UNIDADES_ADMINISTRATIVAS.map((ua) => (
                              <button
                                key={ua}
                                onClick={() => handleSingleSelect(u.id, 'unidade_administrativa', ua)}
                                className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs font-medium hover:bg-secondary text-foreground ${
                                  u.unidade_administrativa === ua ? 'bg-secondary' : ''
                                }`}
                              >
                                <span>{ua}</span>
                                {u.unidade_administrativa === ua && <Check className="h-3.5 w-3.5 text-primary" />}
                              </button>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Unid Operacional */}
                      <td className="px-4 py-4 relative">
                        <button
                          onClick={(e) => toggleOpen('unidade_operacional', e)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-border/50 bg-secondary/30 px-2.5 py-1 text-xs font-medium hover:bg-secondary/50 text-foreground"
                        >
                          <span>{u.unidade_operacional || 'Sem Efetividade'}</span>
                          <ChevronDown className="h-3 w-3 opacity-60" />
                        </button>

                        {isOpen('unidade_operacional') && (
                          <div className="absolute left-4 top-12 z-55 w-48 rounded-lg border border-border/80 bg-popover p-1 shadow-xl backdrop-blur-md">
                            {UNIDADES_OPERACIONAIS.map((uo) => (
                              <button
                                key={uo}
                                onClick={() => handleSingleSelect(u.id, 'unidade_operacional', uo)}
                                className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs font-medium hover:bg-secondary text-foreground ${
                                  u.unidade_operacional === uo ? 'bg-secondary' : ''
                                }`}
                              >
                                <span>{uo}</span>
                                {u.unidade_operacional === uo && <Check className="h-3.5 w-3.5 text-primary" />}
                              </button>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Status de Atividade */}
                      <td className="px-4 py-4 relative">
                        <button
                          onClick={(e) => toggleOpen('status_atividade', e)}
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold hover:opacity-85 transition-opacity cursor-pointer ${
                            u.status_atividade === 'Inativo'
                              ? 'text-zinc-400 bg-zinc-500/10 border-zinc-500/30'
                              : 'text-green-400 bg-green-400/10 border-green-500/30'
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${u.status_atividade === 'Inativo' ? 'bg-zinc-500' : 'bg-green-400 animate-pulse'}`} />
                          <span>{u.status_atividade ?? 'Ativo'}</span>
                          <ChevronDown className="h-3 w-3 opacity-60" />
                        </button>

                        {isOpen('status_atividade') && (
                          <div className="absolute left-4 top-12 z-55 w-40 rounded-lg border border-border/80 bg-popover p-1 shadow-xl backdrop-blur-md">
                            <div className="px-2 py-1 text-[9px] font-semibold text-muted-foreground uppercase border-b border-border/30 mb-1 leading-tight">
                              Alterar Status (Manual)
                            </div>
                            {STATUS_ATIVIDADE.map((sa) => (
                              <button
                                key={sa}
                                onClick={() => handleSingleSelect(u.id, 'status_atividade', sa)}
                                className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs font-medium hover:bg-secondary text-foreground ${
                                  u.status_atividade === sa ? 'bg-secondary' : ''
                                }`}
                              >
                                <span>{sa}</span>
                                {u.status_atividade === sa && <Check className="h-3.5 w-3.5 text-primary" />}
                              </button>
                            ))}
                            <div className="p-2 border-t border-border/30 mt-1 text-[9px] leading-relaxed text-muted-foreground">
                              Muda para <span className="font-semibold text-foreground">Inativo</span> se ficar 15 dias sem fazer login.
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Cursos */}
                      <td className="px-4 py-4 relative min-w-[200px]">
                        <div
                          onClick={(e) => toggleOpen('cursos', e)}
                          className="flex flex-wrap gap-1 max-w-[280px] p-1.5 rounded-lg border border-border/30 bg-secondary/10 hover:bg-secondary/20 cursor-pointer transition-all min-h-[36px]"
                        >
                          {u.cursos && u.cursos.length > 0 ? (
                            u.cursos.map((cur) => (
                              <span
                                key={cur}
                                className="rounded-full bg-secondary/80 px-2 py-0.5 text-[10px] font-semibold text-foreground border border-border/40"
                              >
                                {cur}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground p-0.5">Sem Cursos</span>
                          )}
                          <ChevronDown className="h-3.5 w-3.5 ml-auto self-center opacity-60" />
                        </div>

                        {isOpen('cursos') && (
                          <div className="absolute right-4 top-14 z-55 w-64 max-h-72 overflow-y-auto rounded-lg border border-border/80 bg-popover p-1 shadow-xl backdrop-blur-md">
                            <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase border-b border-border/30 mb-1">
                              Toggelar Cursos
                            </div>
                            {CURSOS.map((cur) => {
                              const isChecked = u.cursos?.includes(cur)
                              return (
                                <button
                                  key={cur}
                                  onClick={() => handleMultiSelectToggle(u.id, 'cursos', cur)}
                                  className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs hover:bg-secondary text-left text-foreground font-medium"
                                >
                                  <div className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border border-border/60">
                                    {isChecked && <Check className="h-3 w-3 text-primary" />}
                                  </div>
                                  <span className="truncate">{cur}</span>
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </td>

                      {/* Advertências */}
                      <td className="px-4 py-4 relative min-w-[180px]">
                        <div
                          onClick={(e) => toggleOpen('advertencia', e)}
                          className="flex flex-wrap gap-1 max-w-[280px] p-1.5 rounded-lg border border-border/30 bg-secondary/10 hover:bg-secondary/20 cursor-pointer transition-all min-h-[36px]"
                        >
                          {u.advertencia && u.advertencia.length > 0 ? (
                            u.advertencia.map((adv) => (
                              <span
                                key={adv}
                                className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold text-red-400 border border-red-500/20"
                              >
                                {adv}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground p-0.5">Ficha Limpa</span>
                          )}
                          <ChevronDown className="h-3.5 w-3.5 ml-auto self-center opacity-60" />
                        </div>

                        {isOpen('advertencia') && (
                          <div className="absolute right-4 top-14 z-55 w-60 max-h-72 overflow-y-auto rounded-lg border border-border/80 bg-popover p-1 shadow-xl backdrop-blur-md">
                            <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase border-b border-border/30 mb-1">
                              Toggelar Advertências
                            </div>
                            {ADVERTENCIAS.map((adv) => {
                              const isChecked = u.advertencia?.includes(adv)
                              return (
                                <button
                                  key={adv}
                                  onClick={() => handleMultiSelectToggle(u.id, 'advertencia', adv)}
                                  className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs hover:bg-secondary text-left text-foreground font-medium"
                                >
                                  <div className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border border-border/60">
                                    {isChecked && <Check className="h-3 w-3 text-primary" />}
                                  </div>
                                  <span className="truncate">{adv}</span>
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  )
}
