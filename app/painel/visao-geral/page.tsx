'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Users,
  Activity,
  FileText,
  ShieldAlert,
  Search,
  Filter,
  BookOpen,
  CheckCircle2,
  XCircle,
  Calendar,
  X,
  ChevronRight,
  Info,
  Clock,
  UserCheck
} from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'

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
  cursos: string[]
  advertencia: string[]
  discord_username: string | null
  discord_id: string | null
  allowed_by: string | null
  game_id: string | null
}

interface Course {
  id: string
  title: string
  startDate: string
  endDate: string
  vagasLimit: number
  subscribers: Array<{
    userId: string
    qra: string
    username: string
    subscribedAt: string
  }>
  evaluations?: Record<string, {
    status: 'Aprovado' | 'Reprovado'
    nota: number
    evaluatedBy: string
    evaluatedAt: string
  }>
}

interface Edital {
  id: string
  title: string
  unidade: string
  endDate: string
  subscribers: Array<{
    userId: string
    qra: string
    username: string
    subscribedAt: string
  }>
  evaluations?: Record<string, {
    status: 'Aprovado' | 'Reprovado'
    nota: number
    evaluatedBy: string
    evaluatedAt: string
  }>
}

export default function VisaoGeralPage() {
  const { session, profile: myProfile } = useAuth()
  const router = useRouter()
  
  const [usuarios, setUsuarios] = useState<UserProfile[]>([])
  const [cursos, setCursos] = useState<Course[]>([])
  const [editais, setEditais] = useState<Edital[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')

  // Search & Filters State
  const [searchTerm, setSearchTerm] = useState('')
  const [filterAtividade, setFilterAtividade] = useState<'Todos' | 'Ativo' | 'Inativo'>('Todos')
  const [filterUnidadeOp, setFilterUnidadeOp] = useState<string>('Todas')
  const [filterUnidadeAdm, setFilterUnidadeAdm] = useState<string>('Todas')
  const [filterPatente, setFilterPatente] = useState<string>('Todas')

  // Selected User for Detailed View (Modal)
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null)

  // Authorization Check
  const cargos = myProfile?.cargo ?? []
  const isAltoComando = cargos.includes('Alto Comando') || myProfile?.role === 'admin'

  useEffect(() => {
    if (!session) {
      router.push('/login')
      return
    }

    if (myProfile && !isAltoComando) {
      router.push('/painel')
      return
    }

    async function fetchData() {
      try {
        const response = await fetch('/api/admin/visao-geral', {
          headers: {
            Authorization: `Bearer ${session?.access_token}`
          }
        })
        const data = await response.json()
        if (response.ok && data.success) {
          setUsuarios(data.usuarios || [])
          setCursos(data.cursos || [])
          setEditais(data.editais || [])
        } else {
          setErrorMsg(data.error || 'Falha ao carregar os dados.')
        }
      } catch (err) {
        console.error(err)
        setErrorMsg('Erro de rede ou de comunicação com o servidor.')
      } finally {
        setLoading(false)
      }
    }

    if (session) {
      fetchData()
    }
  }, [session, myProfile, isAltoComando, router])

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <span className="text-sm text-muted-foreground font-medium">Carregando painel de visão geral...</span>
      </div>
    )
  }

  if (errorMsg) {
    return (
      <div className="mx-auto max-w-[800px] px-6 py-24 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-500/15 border border-red-500/30 text-red-400 mb-4">
          <XCircle className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-bold">Acesso restrito ou erro ocorrido</h2>
        <p className="mt-2 text-sm text-muted-foreground">{errorMsg}</p>
        <Button onClick={() => router.push('/painel')} className="mt-6 rounded-xl bg-primary text-xs font-bold">
          Voltar ao Painel
        </Button>
      </div>
    )
  }

  // --- 1. STATISTICS AGGREGATION ---
  const totalOficiais = usuarios.length
  const ativos = usuarios.filter((u) => u.status_atividade === 'Ativo').length
  const inativos = usuarios.filter((u) => u.status_atividade === 'Inativo').length

  // Units
  const opDistribution: Record<string, number> = {
    BOPE: 0,
    CORE: 0,
    GAR: 0,
    GTM: 0,
    GAEP: 0,
    'Sem Efetividade': 0
  }
  const admDistribution: Record<string, number> = {
    APM: 0,
    Corregedoria: 0,
    'Sem Efetividade': 0
  }

  usuarios.forEach((u) => {
    const op = u.unidade_operacional || 'Sem Efetividade'
    if (opDistribution[op] !== undefined) {
      opDistribution[op]++
    } else {
      opDistribution['Sem Efetividade']++
    }

    const adm = u.unidade_administrativa || 'Sem Efetividade'
    if (admDistribution[adm] !== undefined) {
      admDistribution[adm]++
    } else {
      admDistribution['Sem Efetividade']++
    }
  })

  // Courses applied & evaluations
  const totalCursos = cursos.length
  let totalInscritosCursos = 0
  let aprovadosCursos = 0
  let reprovadosCursos = 0

  cursos.forEach((c) => {
    totalInscritosCursos += c.subscribers.length
    if (c.evaluations) {
      Object.values(c.evaluations).forEach((ev) => {
        if (ev.status === 'Aprovado') aprovadosCursos++
        if (ev.status === 'Reprovado') reprovadosCursos++
      })
    }
  })

  const totalAvaliadosCursos = aprovadosCursos + reprovadosCursos
  const taxaAprovacaoCursos = totalAvaliadosCursos > 0 ? Math.round((aprovadosCursos / totalAvaliadosCursos) * 100) : 0

  // Editais stats
  const nowStr = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(new Date()).replace(' ', 'T')

  const editaisAbertos = editais.filter((e) => e.endDate >= nowStr).length
  const editaisEncerrados = editais.filter((e) => e.endDate < nowStr).length

  // Warnings
  const totalAdvertenciasCount = usuarios.reduce((sum, u) => sum + (u.advertencia?.length || 0), 0)

  // --- 2. SEARCH & FILTERING USERS ---
  const filteredUsers = usuarios.filter((u) => {
    // Search
    const searchLower = searchTerm.toLowerCase().trim()
    const matchesSearch =
      u.username.toLowerCase().includes(searchLower) ||
      (u.qra && u.qra.toLowerCase().includes(searchLower)) ||
      u.id.toLowerCase().includes(searchLower) ||
      (u.game_id && u.game_id.includes(searchLower))

    // Activity
    const matchesActivity = filterAtividade === 'Todos' || u.status_activity === filterAtividade || u.status_atividade === filterAtividade

    // Unit Op
    const matchesOp = filterUnidadeOp === 'Todas' || u.unidade_operacional === filterUnidadeOp

    // Unit Adm
    const matchesAdm = filterUnidadeAdm === 'Todas' || u.unidade_administrativa === filterUnidadeAdm

    // Patente
    const matchesPatente = filterPatente === 'Todas' || u.patente === filterPatente

    return matchesSearch && matchesActivity && matchesOp && matchesAdm && matchesPatente
  })

  // List of all patentes for the filter
  const patentesList = [
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
    'Recruta'
  ]

  // Get selected user's detailed statistics
  const getUserDetailedHistory = (userId: string) => {
    const userCourses = cursos.filter((c) => c.subscribers.some((s) => s.userId === userId))
    const userEditais = editais.filter((e) => e.subscribers.some((s) => s.userId === userId))
    return { userCourses, userEditais }
  }

  const detailedHistory = selectedUser ? getUserDetailedHistory(selectedUser.id) : { userCourses: [], userEditais: [] }

  return (
    <main className="mx-auto max-w-[1600px] px-6 pb-24 pt-28 sm:px-10 lg:px-16">
      {/* Header */}
      <div className="relative text-left mb-10 border-b border-border/10 pb-6">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          Visão Geral da Corporação
        </h1>
        <p className="mt-2 text-sm text-muted-foreground max-w-xl">
          Painel analítico exclusivo do Alto Comando para controle operacional, administrativo e pedagógico do Departamento de Polícia Aspect.
        </p>
      </div>

      {/* --- SECTION 1: STATS GRID --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {/* Card 1: Efetivo */}
        <div className="rounded-xl border border-border/60 bg-card/45 p-5 backdrop-blur-sm shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Efetivo Geral</span>
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold">{totalOficiais}</span>
            <span className="text-xs text-muted-foreground">membros</span>
          </div>
          <div className="mt-3 flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1 text-emerald-400 font-mono">
              ● {ativos} Ativos
            </span>
            <span className="flex items-center gap-1 text-red-400 font-mono">
              ● {inativos} Inativos
            </span>
          </div>
        </div>

        {/* Card 2: Cursos */}
        <div className="rounded-xl border border-border/60 bg-card/45 p-5 backdrop-blur-sm shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Instrução (Cursos)</span>
            <BookOpen className="h-5 w-5 text-violet-400" />
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-violet-400">{totalCursos}</span>
            <span className="text-xs text-muted-foreground">cursos ministrados</span>
          </div>
          <div className="mt-3 text-xs text-muted-foreground flex justify-between items-center">
            <span>Aprovações: <strong className="text-foreground">{aprovadosCursos}</strong></span>
            <span>Taxa Geral: <strong className="text-violet-400">{taxaAprovacaoCursos}%</strong></span>
          </div>
        </div>

        {/* Card 3: Editais */}
        <div className="rounded-xl border border-border/60 bg-card/45 p-5 backdrop-blur-sm shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Processos Seletivos</span>
            <FileText className="h-5 w-5 text-amber-400" />
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-amber-400">{editaisAbertos}</span>
            <span className="text-xs text-muted-foreground">editais abertos</span>
          </div>
          <div className="mt-3 text-xs text-muted-foreground">
            Total histórico: <strong className="text-foreground">{editais.length}</strong> editais publicados
          </div>
        </div>

        {/* Card 4: Advertências */}
        <div className="rounded-xl border border-border/60 bg-card/45 p-5 backdrop-blur-sm shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Disciplina (Advertências)</span>
            <ShieldAlert className="h-5 w-5 text-rose-500" />
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-rose-400">{totalAdvertenciasCount}</span>
            <span className="text-xs text-muted-foreground">infrações registradas</span>
          </div>
          <div className="mt-3 text-xs text-muted-foreground">
            Oficiais com histórico: <strong className="text-foreground">{usuarios.filter((u) => u.advertencia?.length > 0).length}</strong> membros
          </div>
        </div>
      </div>

      {/* --- DISTRIBUTION STATS SUB-BAR --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
        {/* Unidades Operacionais */}
        <div className="rounded-xl border border-border/60 bg-card/25 p-5">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-4">
            <Activity className="h-4 w-4 text-primary" />
            Distribuição Operacional (UOs)
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 font-mono">
            {Object.entries(opDistribution).map(([unit, count]) => (
              <div key={unit} className="bg-secondary/20 rounded-lg p-3 border border-border/30">
                <span className="text-[10px] text-muted-foreground uppercase block truncate">{unit}</span>
                <span className="text-lg font-extrabold text-foreground">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Unidades Administrativas */}
        <div className="rounded-xl border border-border/60 bg-card/25 p-5">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-4">
            <UserCheck className="h-4 w-4 text-violet-400" />
            Efetivo Administrativo (UAs)
          </h3>
          <div className="grid grid-cols-3 gap-4 font-mono">
            {Object.entries(admDistribution).map(([unit, count]) => (
              <div key={unit} className="bg-secondary/20 rounded-lg p-3 border border-border/30">
                <span className="text-[10px] text-muted-foreground uppercase block truncate">{unit}</span>
                <span className="text-lg font-extrabold text-foreground">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* --- SECTION 2: SEARCH, FILTERS & MAIN TABLE --- */}
      <div className="rounded-xl border border-border/60 bg-card/30 p-6 shadow-md">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-border/10 pb-5 mb-6">
          <h2 className="text-lg font-bold flex items-center gap-2 text-foreground">
            <Users className="h-5 w-5 text-primary" />
            Consulta ao Efetivo Geral
          </h2>

          {/* Quick Stats of Filtered */}
          <span className="text-xs text-muted-foreground font-semibold">
            Mostrando <strong className="text-foreground">{filteredUsers.length}</strong> de <strong className="text-foreground">{usuarios.length}</strong> oficiais
          </span>
        </div>

        {/* Filters Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por QRA, Nome, ID..."
              className="pl-10 h-10 rounded-xl text-xs"
            />
          </div>

          {/* Filter Atividade */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Atividade</label>
            <select
              value={filterAtividade}
              onChange={(e) => setFilterAtividade(e.target.value as any)}
              className="bg-card/70 border border-border/60 text-xs rounded-xl h-10 px-3 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="Todos">Todos</option>
              <option value="Ativo">Ativo</option>
              <option value="Inativo">Inativo</option>
            </select>
          </div>

          {/* Filter Unidade Op */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Unidade Operacional</label>
            <select
              value={filterUnidadeOp}
              onChange={(e) => setFilterUnidadeOp(e.target.value)}
              className="bg-card/70 border border-border/60 text-xs rounded-xl h-10 px-3 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="Todas">Todas</option>
              <option value="BOPE">BOPE</option>
              <option value="CORE">CORE</option>
              <option value="GAR">GAR</option>
              <option value="GTM">GTM</option>
              <option value="GAEP">GAEP</option>
              <option value="Sem Efetividade">Sem Efetividade</option>
            </select>
          </div>

          {/* Filter Unidade Adm */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Unidade Administrativa</label>
            <select
              value={filterUnidadeAdm}
              onChange={(e) => setFilterUnidadeAdm(e.target.value)}
              className="bg-card/70 border border-border/60 text-xs rounded-xl h-10 px-3 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="Todas">Todas</option>
              <option value="APM">APM</option>
              <option value="Corregedoria">Corregedoria</option>
              <option value="Sem Efetividade">Sem Efetividade</option>
            </select>
          </div>

          {/* Filter Patente */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Patente</label>
            <select
              value={filterPatente}
              onChange={(e) => setFilterPatente(e.target.value)}
              className="bg-card/70 border border-border/60 text-xs rounded-xl h-10 px-3 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="Todas">Todas</option>
              {patentesList.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>

        {/* --- MAIN TABULAR DISPLAY --- */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border/20 text-muted-foreground font-bold text-[11px] bg-secondary/15">
                <th className="py-3.5 px-4 rounded-tl-xl">Oficial (QRA)</th>
                <th className="py-3.5 px-3">Patente</th>
                <th className="py-3.5 px-3">Unidade Operacional</th>
                <th className="py-3.5 px-3">Unidade Administrativa</th>
                <th className="py-3.5 px-3">Cargo(s)</th>
                <th className="py-3.5 px-3">Status</th>
                <th className="py-3.5 px-4 text-right rounded-tr-xl">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/10">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground font-medium">
                    Nenhum oficial correspondente encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  return (
                    <tr key={u.id} className="hover:bg-secondary/20 transition-colors group">
                      <td className="py-4 px-4 font-bold text-foreground">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold">
                            {u.username[0].toUpperCase()}
                          </div>
                          <div>
                            <span className="block hover:text-primary transition-colors cursor-pointer" onClick={() => setSelectedUser(u)}>
                              {u.qra ? u.qra : u.username}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono block">ID: {u.game_id || 'Não Informado'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-3 font-semibold text-foreground/90">
                        {u.patente || 'Recruta'}
                      </td>
                      <td className="py-4 px-3">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold font-mono ${
                          u.unidade_operacional === 'Sem Efetividade'
                            ? 'bg-secondary/40 text-muted-foreground border border-border/30'
                            : 'bg-primary/10 text-primary border border-primary/20'
                        }`}>
                          {u.unidade_operacional}
                        </span>
                      </td>
                      <td className="py-4 px-3">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold font-mono ${
                          u.unidade_administrativa === 'Sem Efetividade'
                            ? 'bg-secondary/40 text-muted-foreground border border-border/30'
                            : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                        }`}>
                          {u.unidade_administrativa}
                        </span>
                      </td>
                      <td className="py-4 px-3 max-w-[200px] truncate text-muted-foreground font-medium" title={u.cargo?.join(', ')}>
                        {u.cargo && u.cargo.length > 0 ? u.cargo.join(', ') : 'Sem Cargos'}
                      </td>
                      <td className="py-4 px-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-mono font-bold ${
                          u.status_atividade === 'Inativo'
                            ? 'bg-red-500/15 border border-red-500/25 text-red-400'
                            : 'bg-emerald-500/15 border border-emerald-500/25 text-emerald-400'
                        }`}>
                          {u.status_atividade}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <Button
                          onClick={() => setSelectedUser(u)}
                          variant="outline"
                          className="h-7 text-[10px] font-bold border-border/60 hover:bg-secondary/80 rounded-lg shadow-sm"
                        >
                          Ver Ficha Completa
                          <ChevronRight className="ml-1 h-3 w-3" />
                        </Button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- DETAILED VIEW MODAL --- */}
      <AnimatePresence>
        {selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedUser(null)}
              className="absolute inset-0 bg-[#000]/65 backdrop-blur-sm"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-4xl max-h-[85vh] overflow-y-auto rounded-2xl border border-border/60 bg-card p-6 shadow-2xl backdrop-blur-lg z-10 flex flex-col gap-6"
            >
              {/* Top Row / Close Button */}
              <div className="flex items-center justify-between border-b border-border/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-lg font-extrabold">
                    {selectedUser.username[0].toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground">
                      Ficha do Oficial: {selectedUser.qra || selectedUser.username}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Ficha informativa e histórico do militar no sistema (Somente Leitura)
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => setSelectedUser(null)}
                  variant="ghost"
                  className="h-8 w-8 rounded-full p-0 hover:bg-secondary"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Grid content inside modal */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left Column: Cadet Bio details */}
                <div className="md:col-span-1 space-y-4 bg-secondary/15 rounded-xl border border-border/25 p-5">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider border-b border-border/10 pb-2">Dados Gerais</h4>
                  
                  <div className="space-y-3.5 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">ID do Jogo (In-Game)</span>
                      <strong className="text-foreground text-sm font-mono">{selectedUser.game_id || 'Não Registrado'}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Patente Militar</span>
                      <strong className="text-foreground text-sm">{selectedUser.patente || 'Recruta'}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Cargos Ocupados</span>
                      <strong className="text-foreground block mt-0.5 leading-relaxed">
                        {selectedUser.cargo && selectedUser.cargo.length > 0 ? selectedUser.cargo.join(', ') : 'Sem Cargos Registrados'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Discord</span>
                      <strong className="text-foreground font-mono">{selectedUser.discord_username ? `${selectedUser.discord_username}` : 'Não vinculado'}</strong>
                      {selectedUser.discord_id && <span className="block text-[10px] text-muted-foreground font-mono mt-0.5">ID: {selectedUser.discord_id}</span>}
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Aprovado no Sistema Por</span>
                      <strong className="text-foreground">{selectedUser.allowed_by || 'Administrador'}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Cadastrado Em</span>
                      <strong className="text-foreground flex items-center gap-1 font-mono mt-0.5">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        {new Date(selectedUser.created_at).toLocaleDateString('pt-BR')}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Última Sincronização (Login)</span>
                      <strong className="text-foreground flex items-center gap-1 font-mono mt-0.5">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        {selectedUser.last_login_at
                          ? new Date(selectedUser.last_login_at).toLocaleString('pt-BR')
                          : 'Nunca Logou'}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Right columns: Courses, Editais & Warnings list */}
                <div className="md:col-span-2 space-y-6">
                  {/* Tab block 1: Courses history */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider border-b border-border/10 pb-2">Histórico de Capacitação (Cursos)</h4>
                    {detailedHistory.userCourses.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic bg-secondary/10 p-3 rounded-xl border border-border/15">
                        Este oficial ainda não se inscreveu ou concluiu nenhum curso na APM.
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                        {detailedHistory.userCourses.map((c) => {
                          const ev = c.evaluations?.[selectedUser.id]
                          return (
                            <div key={c.id} className="flex items-center justify-between p-3 rounded-xl border border-border/20 bg-card/65 text-xs">
                              <div>
                                <strong className="text-foreground block">{c.title}</strong>
                                <span className="text-[10px] text-muted-foreground font-mono">
                                  Início: {new Date(c.startDate).toLocaleDateString('pt-BR')}
                                </span>
                              </div>

                              <div className="flex items-center gap-3">
                                {ev ? (
                                  <>
                                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                      ev.status === 'Aprovado'
                                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                                        : 'bg-red-500/15 text-red-400 border border-red-500/25'
                                    }`}>
                                      {ev.status === 'Aprovado' ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                                      {ev.status}
                                    </span>
                                    <span className="font-mono bg-secondary/65 px-1.5 py-0.5 border border-border/30 rounded font-bold">
                                      Nota: {ev.nota}
                                    </span>
                                  </>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25 px-2 py-0.5 text-[10px] font-bold">
                                    <Clock className="h-3 w-3" />
                                    Em Andamento / Inscrito
                                  </span>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Tab block 2: Editais history */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider border-b border-border/10 pb-2">Histórico de Processos Seletivos (Editais)</h4>
                    {detailedHistory.userEditais.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic bg-secondary/10 p-3 rounded-xl border border-border/15">
                        Este oficial ainda não se inscreveu em nenhum edital interno.
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                        {detailedHistory.userEditais.map((e) => {
                          const ev = e.evaluations?.[selectedUser.id]
                          return (
                            <div key={e.id} className="flex items-center justify-between p-3 rounded-xl border border-border/20 bg-card/65 text-xs">
                              <div>
                                <strong className="text-foreground block">{e.title}</strong>
                                <span className="text-[10px] text-muted-foreground font-mono">
                                  Unidade do Processo: {e.unidade}
                                </span>
                              </div>

                              <div className="flex items-center gap-3">
                                {ev ? (
                                  <>
                                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                      ev.status === 'Aprovado'
                                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                                        : 'bg-red-500/15 text-red-400 border border-red-500/25'
                                    }`}>
                                      {ev.status === 'Aprovado' ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                                      {ev.status}
                                    </span>
                                    <span className="font-mono bg-secondary/65 px-1.5 py-0.5 border border-border/30 rounded font-bold">
                                      Nota: {ev.nota}
                                    </span>
                                  </>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25 px-2 py-0.5 text-[10px] font-bold">
                                    <Clock className="h-3 w-3" />
                                    Inscrito
                                  </span>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Tab block 3: Disciplinary Warnings history */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider border-b border-rose-500/10 pb-2">Ficha Disciplinar (Advertências)</h4>
                    {(!selectedUser.advertencia || selectedUser.advertencia.length === 0) ? (
                      <p className="text-xs text-muted-foreground italic bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/10 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                        Ficha impecável! Nenhuma advertência ou infração disciplinar foi registrada para este militar.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 gap-2">
                        {selectedUser.advertencia.map((adv, index) => (
                          <div key={index} className="p-3 rounded-xl bg-red-500/5 border border-red-500/15 flex items-start gap-2 text-xs">
                            <ShieldAlert className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                            <div>
                              <strong className="text-rose-400 font-mono text-[11px] block">{adv}</strong>
                              <span className="text-[10px] text-muted-foreground mt-0.5 block leading-relaxed">
                                Registro disciplinar oficial lançado no histórico de efetividade do oficial pela Corregedoria.
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom footer note */}
              <div className="mt-2 bg-secondary/10 p-3 rounded-xl border border-border/15 flex items-center gap-2 text-xs text-muted-foreground">
                <Info className="h-4 w-4 text-primary shrink-0" />
                <span>Esta aba destina-se estritamente à visualização e auditoria de registros. Para alterar patentes, cargos, lançar advertências ou alterar status, utilize as páginas de gerenciamento designadas em <strong>Administração</strong>.</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  )
}
