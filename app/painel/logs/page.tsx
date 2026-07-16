'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Calendar,
  Search,
  Filter,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Clock,
  User,
  ArrowRightLeft,
  ArrowLeftRight,
  LogIn,
  LogOut,
  Edit,
  Trash2,
  PlusCircle,
  AlertTriangle
} from 'lucide-react'

interface AuditLog {
  id: string
  timestamp: string
  whoId: string
  whoQra: string
  action: string
  targetUser: string
  description: string
}

export default function LogsPage() {
  const { session, profile: myProfile } = useAuth()
  const router = useRouter()

  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterAction, setFilterAction] = useState<string>('Todas')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 25

  // Authorization Check
  const cargos = myProfile?.cargo ?? []
  const isAltoComando = cargos.includes('Alto Comando') || myProfile?.role === 'admin'

  const fetchLogs = async () => {
    if (!session) return
    setLoading(true)
    setErrorMsg('')
    try {
      const response = await fetch('/api/audit-logs', {
        headers: {
          Authorization: `Bearer ${session?.access_token}`
        }
      })
      const data = await response.json()
      if (response.ok && data.success) {
        // Sort logs descending (latest first)
        const sortedLogs = (data.logs || []).sort(
          (a: AuditLog, b: AuditLog) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )
        setLogs(sortedLogs)
      } else {
        setErrorMsg(data.error || 'Falha ao carregar os logs de auditoria.')
      }
    } catch (err) {
      console.error(err)
      setErrorMsg('Erro de conexão com o servidor ao carregar os logs.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!session) {
      router.push('/login')
      return
    }

    if (myProfile && !isAltoComando) {
      router.push('/painel')
      return
    }

    if (session) {
      fetchLogs()
    }
  }, [session, myProfile, isAltoComando, router])

  if (loading && logs.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <span className="text-sm text-muted-foreground font-medium">Carregando logs de auditoria...</span>
      </div>
    )
  }

  if (errorMsg) {
    return (
      <div className="mx-auto max-w-[800px] px-6 py-24 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-500/15 border border-red-500/30 text-red-400 mb-4">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-bold">Acesso Restrito</h2>
        <p className="mt-2 text-sm text-muted-foreground">{errorMsg}</p>
        <Button onClick={() => router.push('/painel')} className="mt-6 rounded-xl bg-primary text-xs font-bold">
          Voltar ao Painel
        </Button>
      </div>
    )
  }

  // --- ACTIONS LIST FOR FILTER ---
  const uniqueActions = Array.from(new Set(logs.map((l) => l.action))).sort()

  // --- SEARCH & FILTER LOGS ---
  const filteredLogs = logs.filter((log) => {
    const searchLower = searchTerm.toLowerCase().trim()
    const matchesSearch =
      log.whoQra.toLowerCase().includes(searchLower) ||
      log.targetUser.toLowerCase().includes(searchLower) ||
      log.description.toLowerCase().includes(searchLower) ||
      log.action.toLowerCase().includes(searchLower)

    const matchesAction = filterAction === 'Todas' || log.action === filterAction

    return matchesSearch && matchesAction
  })

  // --- PAGINATION ---
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / itemsPerPage))
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedLogs = filteredLogs.slice(startIndex, startIndex + itemsPerPage)

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1)
  }

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1)
  }

  // --- GET BEAUTIFUL BADGES FOR ACTIONS ---
  const getActionStylesAndIcon = (action: string) => {
    const act = action.toUpperCase()
    
    if (act.includes('LOGIN')) {
      return {
        bg: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
        icon: <LogIn className="h-3.5 w-3.5 mr-1" />
      }
    }
    if (act.includes('LOGOUT')) {
      return {
        bg: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
        icon: <LogOut className="h-3.5 w-3.5 mr-1" />
      }
    }
    if (act.includes('PUBLICA') || act.includes('CADASTRO') || act.includes('INSCRICAO') || act.includes('REGISTRO')) {
      return {
        bg: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
        icon: <PlusCircle className="h-3.5 w-3.5 mr-1" />
      }
    }
    if (act.includes('EDICAO') || act.includes('ALTERACAO')) {
      return {
        bg: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
        icon: <Edit className="h-3.5 w-3.5 mr-1" />
      }
    }
    if (act.includes('EXCLUSAO') || act.includes('CANCELAMENTO') || act.includes('REVOGACAO') || act.includes('DELETAR')) {
      return {
        bg: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
        icon: <Trash2 className="h-3.5 w-3.5 mr-1" />
      }
    }
    if (act.includes('ADVERTENCIA') || act.includes('PUNICAO')) {
      return {
        bg: 'bg-red-500/15 text-red-400 border border-red-500/25 animate-pulse',
        icon: <ShieldAlert className="h-3.5 w-3.5 mr-1" />
      }
    }
    return {
      bg: 'bg-primary/10 text-primary border border-primary/20',
      icon: <ArrowRightLeft className="h-3.5 w-3.5 mr-1" />
    }
  }

  return (
    <main className="mx-auto max-w-[1600px] px-6 pb-24 pt-28 sm:px-10 lg:px-16">
      {/* Header */}
      <div className="relative text-left mb-10 border-b border-border/10 pb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Logs do Sistema
          </h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-xl">
            Histórico completo de auditoria das ações e modificações efetuadas na plataforma pelos oficiais e pelo sistema.
          </p>
        </div>
        <Button
          onClick={fetchLogs}
          disabled={loading}
          variant="outline"
          className="h-10 text-xs font-bold border-border/60 hover:bg-secondary rounded-xl shadow-sm shrink-0 self-start sm:self-center"
        >
          <RefreshCw className={`mr-2 h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Atualizar Logs
        </Button>
      </div>

      {/* Main Content Card */}
      <div className="rounded-xl border border-border/60 bg-card/30 p-6 shadow-md">
        
        {/* Filters and search section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setCurrentPage(1)
              }}
              placeholder="Buscar por QRA, descrição, alvo..."
              className="pl-10 h-10 rounded-xl text-xs"
            />
          </div>

          {/* Action Filter */}
          <div className="flex flex-col gap-1">
            <select
              value={filterAction}
              onChange={(e) => {
                setFilterAction(e.target.value)
                setCurrentPage(1)
              }}
              className="bg-card/70 border border-border/60 text-xs rounded-xl h-10 px-3 text-foreground focus:outline-none focus:ring-1 focus:ring-primary w-full"
            >
              <option value="Todas">Todas as Ações</option>
              {uniqueActions.map((act) => (
                <option key={act} value={act}>{act}</option>
              ))}
            </select>
          </div>

          {/* Quick Stats */}
          <div className="flex items-center justify-end text-xs text-muted-foreground font-mono font-medium pr-2">
            Mostrando {filteredLogs.length} logs
          </div>
        </div>

        {/* Table representation */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border/20 text-muted-foreground font-bold text-[11px] bg-secondary/15">
                <th className="py-3.5 px-4 rounded-tl-xl w-[170px]">Data e Hora</th>
                <th className="py-3.5 px-3 w-[150px]">Autor</th>
                <th className="py-3.5 px-3 w-[230px]">Ação</th>
                <th className="py-3.5 px-3 w-[150px]">Alvo</th>
                <th className="py-3.5 px-4 rounded-tr-xl">Descrição detalhada</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/10 font-mono text-[11px]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-muted-foreground font-medium">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      Carregando dados...
                    </div>
                  </td>
                </tr>
              ) : paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-muted-foreground font-medium">
                    Nenhum log registrado com esses critérios de busca.
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log) => {
                  const styleAndIcon = getActionStylesAndIcon(log.action)
                  return (
                    <tr key={log.id} className="hover:bg-secondary/15 transition-colors">
                      <td className="py-3.5 px-4 text-muted-foreground flex items-center gap-1.5 whitespace-nowrap">
                        <Clock className="h-3 w-3 text-muted-foreground/60 shrink-0" />
                        {new Date(log.timestamp).toLocaleString('pt-BR')}
                      </td>
                      <td className="py-3.5 px-3 font-bold text-foreground/90 whitespace-nowrap">
                        <span className="inline-flex items-center">
                          <User className="h-3 w-3 mr-1 text-muted-foreground/60 shrink-0" />
                          {log.whoQra}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${styleAndIcon.bg}`}>
                          {styleAndIcon.icon}
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-foreground font-semibold whitespace-nowrap">
                        {log.targetUser || 'Sistema'}
                      </td>
                      <td className="py-3.5 px-4 text-muted-foreground font-sans text-xs leading-relaxed max-w-[400px] sm:max-w-none break-words font-medium">
                        {log.description}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        <div className="flex items-center justify-between border-t border-border/10 pt-5 mt-6">
          <span className="text-xs text-muted-foreground font-medium">
            Página <strong className="text-foreground">{currentPage}</strong> de <strong className="text-foreground">{totalPages}</strong>
          </span>

          <div className="flex items-center gap-2">
            <Button
              onClick={handlePrevPage}
              disabled={currentPage === 1 || loading}
              variant="outline"
              className="h-8 w-8 p-0 rounded-lg border-border/60"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              onClick={handleNextPage}
              disabled={currentPage === totalPages || loading}
              variant="outline"
              className="h-8 w-8 p-0 rounded-lg border-border/60"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

      </div>
    </main>
  )
}
