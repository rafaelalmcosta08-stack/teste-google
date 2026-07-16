'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence } from 'motion/react'
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

// Status de Atividade
const STATUS_ATIVIDADE = ['Ativo', 'Inativo']

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
  discord_username?: string | null
  discord_id?: string | null
  allowed_by?: string | null
  game_id?: string | null
}

export default function HierarquiaPage() {
  const { profile: myProfile, session } = useAuth()
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)
  
  // URL query search support
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const q = params.get('search')
      if (q) {
        setSearchTerm(q)
      }
    }
  }, [])
  
  // Controle de rolagem para baixo
  const [showScrollIndicator, setShowScrollIndicator] = useState(true)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleScroll = () => {
      // Oculta o indicador ao scrollar mais de 60px para baixo
      if (window.scrollY > 60) {
        setShowScrollIndicator(false)
      } else {
        setShowScrollIndicator(true)
      }
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToHierarchyList = () => {
    listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  
  // Controle de qual dropdown de célula está aberto
  const [activeDropdown, setActiveDropdown] = useState<{ userId: string; field: string } | null>(null)
  const [dropdownCoords, setDropdownCoords] = useState<{ top: number; left: number } | null>(null)

  const toggleOpen = (userId: string, field: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (activeDropdown?.userId === userId && activeDropdown?.field === field) {
      setActiveDropdown(null)
      setDropdownCoords(null)
    } else {
      setActiveDropdown({ userId, field })
      const rect = e.currentTarget.getBoundingClientRect()
      
      const dropdownHeight = field === 'patente' ? 240 : (field === 'cargo' || field === 'cursos' || field === 'advertencia' ? 288 : 160)
      let top = rect.bottom + 4
      if (top + dropdownHeight > window.innerHeight && rect.top > dropdownHeight + 16) {
        top = rect.top - dropdownHeight - 4
      }
      
      let left = rect.left
      const dropdownWidth = field === 'cargo' || field === 'cursos' ? 256 : (field === 'advertencia' ? 240 : 192)
      if (left + dropdownWidth > window.innerWidth) {
        left = window.innerWidth - dropdownWidth - 16
      }
      if (left < 16) {
        left = 16
      }

      setDropdownCoords({ top, left })
    }
  }

  const fetchUsers = useCallback(async () => {
    if (!session?.access_token) return
    setLoading(true)
    try {
      const res = await fetch('/api/admin/usuarios', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      const json = await res.json()
      setUsers(json.usuarios ?? [])
    } catch {
      setUsers([])
    }
    setLoading(false)
  }, [session?.access_token])

  useEffect(() => {
    if (session?.access_token) {
      fetchUsers()
    }
  }, [fetchUsers, session?.access_token])

  // Fecha o dropdown ao scrollar ou redimensionar para evitar desalinhamento
  useEffect(() => {
    const handleScrollOrResize = () => {
      setActiveDropdown(null)
      setDropdownCoords(null)
    }
    window.addEventListener('scroll', handleScrollOrResize, { passive: true })
    window.addEventListener('resize', handleScrollOrResize)
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize)
      window.removeEventListener('resize', handleScrollOrResize)
    }
  }, [])

  // Se o perfil do usuário conectado (myProfile) mudar (por exemplo, revogado ou atualizado em tempo real),
  // qualquer ação de edição em andamento (dropdown aberto, etc.) deve ser descartada imediatamente.
  useEffect(() => {
    setActiveDropdown(null)
    setDropdownCoords(null)
  }, [myProfile])

  // Sincronização em tempo real de alterações de patentes, cargos e permissões de outros usuários
  useEffect(() => {
    const handleRealtimeEvent = (e: Event) => {
      const { detail } = e as CustomEvent
      if (!detail) return

      const { event, payload } = detail
      if (event === 'permissions-updated' && payload) {
        setUsers((prevUsers) =>
          prevUsers.map((u) => {
            if (u.id === payload.id) {
              return {
                ...u,
                role: payload.role ?? u.role,
                patente: payload.patente ?? u.patente,
                cargo: payload.cargo ?? u.cargo,
                unidade_administrativa: payload.unidade_administrativa ?? u.unidade_administrativa,
                unidade_operacional: payload.unidade_operacional ?? u.unidade_operacional,
                status_atividade: payload.status_atividade ?? u.status_atividade,
                cursos: payload.cursos ?? u.cursos,
                advertencia: payload.advertencia ?? u.advertencia,
              }
            }
            return u
          })
        )
      } else if (event === 'access-revoked' && payload) {
        setUsers((prevUsers) =>
          prevUsers.map((u) => {
            if (u.id === payload.id) {
              return {
                ...u,
                status: 'rejeitado',
              }
            }
            return u
          })
        )
      }
    }

    window.addEventListener('sse-event', handleRealtimeEvent)
    return () => {
      window.removeEventListener('sse-event', handleRealtimeEvent)
    }
  }, [])

  // Salva alteração de campo no servidor
  const saveUserField = async (userId: string, fields: Partial<UserProfile>) => {
    setSavingId(userId)
    try {
      const res = await fetch('/api/admin/usuarios', {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`
        },
        body: JSON.stringify({ id: userId, ...fields }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        console.error('Erro na validação do servidor:', json.error || 'Não autorizado')
        // Caso a requisição falhe, podemos recarregar os dados para manter o frontend consistente
        fetchUsers()
      }
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
    setDropdownCoords(null)
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
    return 'text-foreground bg-secondary/80 border-border/60'
  }

  // Filtra usuários aprovados e ordena por patente (da maior para a menor)
  const aprovados = users.filter((u) => u.status === 'aprovado')
  const filteredUsers = aprovados
    .filter((u) => {
      const term = searchTerm.toLowerCase()
      const matchUsername = u.username.toLowerCase().includes(term)
      const matchQra = u.qra ? u.qra.toLowerCase().includes(term) : false
      const matchGameId = u.game_id ? u.game_id.includes(searchTerm) : false
      const matchDiscord = u.discord_username ? u.discord_username.toLowerCase().includes(term) : false
      const matchPatente = u.patente ? u.patente.toLowerCase().includes(term) : false
      const matchCargo = u.cargo && u.cargo.some((c) => c.toLowerCase().includes(term))
      
      return matchUsername || matchQra || matchGameId || matchDiscord || matchPatente || matchCargo
    })
    .sort((a, b) => {
      const indexA = a.patente ? PATENTES.indexOf(a.patente) : -1
      const indexB = b.patente ? PATENTES.indexOf(b.patente) : -1

      // Menor índice no array PATENTES significa maior cargo/patente (Coronel = 0)
      const valA = indexA === -1 ? 999 : indexA
      const valB = indexB === -1 ? 999 : indexB

      if (valA !== valB) {
        return valA - valB
      }

      // Desempate por QRA ou username em ordem alfabética
      const nameA = a.qra || a.username || ''
      const nameB = b.qra || b.username || ''
      return nameA.localeCompare(nameB, 'pt-BR')
    })

  // Caso o usuário conectado seja comum, ele só visualiza o próprio perfil (ou todos de forma read-only)
  const isSiteAdmin = myProfile?.role === 'admin'
  const myDetailedProfile = users.find((u) => u.id === myProfile?.id)

  const myCargos = myDetailedProfile?.cargo ?? []
  const myPatente = myDetailedProfile?.patente ?? null

  const OFICIAIS_LIST = [
    'Coronel',
    'Tenente-Coronel',
    'Major',
    'Capitão',
    '1º Tenente',
    '2º Tenente',
    'Aluno Oficial',
  ]
  const isOficial = (pat: string | null) => {
    if (!pat) return false
    return OFICIAIS_LIST.includes(pat)
  }

  const canViewFullHierarchy = isSiteAdmin || isOficial(myPatente)

  // 1. Patente Helper
  const getPatenteOptions = (promoterPatente: string | null) => {
    if (!promoterPatente) return []
    const allowedPromoters = ['Coronel', 'Tenente-Coronel', 'Major', 'Capitão']
    if (!allowedPromoters.includes(promoterPatente)) return []
    
    const myIndex = PATENTES.indexOf(promoterPatente)
    if (myIndex === -1) return []
    
    return PATENTES.slice(myIndex + 1)
  }

  const getPatenteOptionsForUser = (promoterPatente: string | null, targetUserId: string, currentUserId: string, siteAdmin: boolean) => {
    if (siteAdmin) return PATENTES
    if (targetUserId === currentUserId) return []
    return getPatenteOptions(promoterPatente)
  }

  const canEditPatente = (targetUser: UserProfile) => {
    if (isSiteAdmin) return true
    if (targetUser.id === myProfile?.id) return false
    
    // Se o usuário alvo tiver patente maior ou igual à minha (índice menor ou igual na lista), não posso mexer na patente dele
    if (myPatente && targetUser.patente) {
      const myIdx = PATENTES.indexOf(myPatente)
      const targetIdx = PATENTES.indexOf(targetUser.patente)
      if (myIdx !== -1 && targetIdx !== -1 && targetIdx <= myIdx) {
        return false
      }
    }

    const allowed = getPatenteOptions(myPatente)
    return allowed.length > 0
  }

  // 2. Cargo Helper
  const CARGO_PERMISSIONS: Record<string, string[]> = {
    'Alto Comando': CARGOS,
    'Diretor Corregedoria': ['Membro Corregedoria'],
    'Diretor APM': [
      'Instrutor Treinamento Operacional',
      'Instrutor De Cursos e Recrutamentos',
      'Coordenador Do Comitê Promocional',
      'Membro Do Comitê Promocional',
    ],
    'Supervisor APM': [
      'Instrutor Treinamento Operacional',
      'Instrutor De Cursos e Recrutamentos',
      'Coordenador Do Comitê Promocional',
      'Membro Do Comitê Promocional',
    ],
    'Comando Militar': ['Rádio Patrulha'],
    'Comando Bope': ['Coordenador Bope', 'Executor Bope', 'Operador Bope', 'Probatório Bope'],
    'Comando Core': ['Coordenador Core', 'Executor Core', 'Operador Core', 'Probatório Core'],
    'Comando GAEP': ['Coordenador GAEP', 'Membro GAEP'],
    'Comando GAR': ['Coordenador GAR', 'Membro GAR'],
    'Comando GTM': ['Coordenador GTM', 'Membro GTM'],
  }

  const getMyHighestCargoIndex = (cargosList: string[] | undefined) => {
    if (!cargosList || cargosList.length === 0) return CARGOS.length - 1
    let minIndex = CARGOS.length - 1
    for (const c of cargosList) {
      const idx = CARGOS.indexOf(c)
      if (idx !== -1 && idx < minIndex) {
        minIndex = idx
      }
    }
    return minIndex
  }

  const getAllowedCargos = (promoterCargos: string[] | undefined, targetUserId: string, currentUserId: string, siteAdmin: boolean) => {
    if (siteAdmin) return CARGOS
    if (targetUserId === currentUserId) return []
    if (!promoterCargos || promoterCargos.length === 0) return []

    const allowedSet = new Set<string>()
    const hasAltoComando = promoterCargos.includes('Alto Comando')

    for (const cargo of promoterCargos) {
      const allowedForThisCargo = CARGO_PERMISSIONS[cargo]
      if (allowedForThisCargo) {
        allowedForThisCargo.forEach((c) => allowedSet.add(c))
      }
    }

    if (allowedSet.size === 0) return []

    const myHighestCargoIndex = getMyHighestCargoIndex(promoterCargos)
    const allowedList = Array.from(allowedSet).filter((c) => {
      if (c === 'Sem Efetividade') {
        return hasAltoComando
      }
      const targetCargoIndex = CARGOS.indexOf(c)
      if (targetCargoIndex === -1) return false
      return targetCargoIndex >= myHighestCargoIndex
    })

    if (hasAltoComando) {
      return CARGOS
    }

    return allowedList
  }

  const canEditCargos = (targetUser: UserProfile) => {
    if (isSiteAdmin) return true
    if (targetUser.id === myProfile?.id) return false
    const allowed = getAllowedCargos(myCargos, targetUser.id, myProfile?.id || '', false)
    return allowed.length > 0
  }

  // 3. Unidade Administrativa Helper
  const getAllowedUnidadesAdministrativas = (promoterCargos: string[] | undefined, siteAdmin: boolean) => {
    if (siteAdmin) return UNIDADES_ADMINISTRATIVAS
    if (!promoterCargos || promoterCargos.length === 0) return []

    if (promoterCargos.includes('Alto Comando')) {
      return UNIDADES_ADMINISTRATIVAS
    }
    return []
  }

  const canEditUnidadeAdministrativa = (targetUser: UserProfile) => {
    if (isSiteAdmin) return true
    return myCargos.includes('Alto Comando')
  }

  // 4. Unidade Operacional Helper
  const getAllowedUnidadesOperacionais = (promoterCargos: string[] | undefined, siteAdmin: boolean) => {
    if (siteAdmin) return UNIDADES_OPERACIONAIS
    if (!promoterCargos || promoterCargos.length === 0) return []

    if (promoterCargos.includes('Alto Comando')) {
      return UNIDADES_OPERACIONAIS
    }
    return []
  }

  const canEditUnidadeOperacional = (targetUser: UserProfile) => {
    if (isSiteAdmin) return true
    return myCargos.includes('Alto Comando')
  }

  // 5. Status Helper
  const getAllowedStatusAtividade = (siteAdmin: boolean) => {
    if (siteAdmin) return STATUS_ATIVIDADE
    return []
  }

  const canEditStatusAtividade = (targetUser: UserProfile) => {
    return isSiteAdmin
  }

  // 6. Cursos Helper
  const getAllowedCursos = (promoterCargos: string[] | undefined, siteAdmin: boolean) => {
    if (siteAdmin) return CURSOS
    if (!promoterCargos || promoterCargos.length === 0) return []

    if (promoterCargos.includes('Diretor APM') || promoterCargos.includes('Supervisor APM') || promoterCargos.includes('Alto Comando')) {
      return CURSOS
    }
    return []
  }

  const canEditCursos = (targetUser: UserProfile) => {
    if (isSiteAdmin) return true
    const allowed = getAllowedCursos(myCargos, false)
    return allowed.length > 0
  }

  // 7. Advertências Helper
  const getAllowedAdvertencias = (promoterCargos: string[] | undefined, siteAdmin: boolean) => {
    if (siteAdmin) return ADVERTENCIAS
    if (!promoterCargos || promoterCargos.length === 0) return []

    if (promoterCargos.includes('Diretor Corregedoria') || promoterCargos.includes('Alto Comando')) {
      return ADVERTENCIAS
    }
    return []
  }

  const canEditAdvertencia = (targetUser: UserProfile) => {
    if (isSiteAdmin) return true
    const allowed = getAllowedAdvertencias(myCargos, false)
    return allowed.length > 0
  }

  const hasSetPermission = isSiteAdmin || (() => {
    const allowedPats = getPatenteOptions(myPatente)
    if (allowedPats.length > 0) return true

    const hasCargoPermission = myCargos.some((c) => {
      const allowed = CARGO_PERMISSIONS[c]
      return allowed && allowed.length > 0
    })
    if (hasCargoPermission) return true

    const allowedUAs = getAllowedUnidadesAdministrativas(myCargos, false)
    if (allowedUAs.length > 0) return true

    const allowedUOs = getAllowedUnidadesOperacionais(myCargos, false)
    if (allowedUOs.length > 0) return true

    const allowedCursos = getAllowedCursos(myCargos, false)
    if (allowedCursos.length > 0) return true

    const allowedAdvs = getAllowedAdvertencias(myCargos, false)
    if (allowedAdvs.length > 0) return true

    return false
  })()

  const activeUser = users.find((u) => u.id === activeDropdown?.userId)

  return (
    <main className="mx-auto max-w-[1600px] px-6 pb-24 pt-16 sm:px-10 lg:px-16">
      {/* 1. SEÇÃO MINHA HIERARQUIA (Visível para todos) */}
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
        <p className="text-sm text-muted-foreground mb-8">Carregando informações...</p>
      ) : myDetailedProfile ? (
        <div className="grid gap-8 lg:grid-cols-3 mb-16">
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

          {/* Sidebar Lateral: Atividade & Ficha Disciplinar */}
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

            {/* Ficha Disciplinar */}
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
        <p className="text-sm text-muted-foreground mb-16">Perfil não encontrado.</p>
      )}

      {/* 2. SEÇÃO DE HIERARQUIA POLICIAL (Visível para todos) */}
      <hr ref={listRef} className="my-16 border-border/20" />

      <div className="mb-12">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
          <Shield className="h-6 w-6 text-foreground" />
        </div>
        <h2 className="mt-6 text-3xl font-bold tracking-tight sm:text-4xl">Hierarquia Policial</h2>
        <p className="mt-3 text-muted-foreground">
          Estrutura e dados de patentes, cargos, unidades, cursos e advertências dos policiais ativos.
        </p>
      </div>

      {/* Barra de Filtros */}
      <div className="mb-6 flex max-w-md items-center gap-3">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por QRA, Patente ou Cargo..."
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
                  <th className="px-4 py-4 text-left font-semibold text-muted-foreground">Policial / QRA / ID</th>
                  <th className="px-4 py-4 text-left font-semibold text-muted-foreground">Discord</th>
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
                  return (
                    <tr key={u.id} className="bg-background/10 transition-colors hover:bg-secondary/10">
                      {/* QRA / Usuário */}
                      <td className="px-4 py-4 font-medium whitespace-nowrap">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-foreground">{u.qra || '—'}</span>
                            {u.game_id && (
                              <span className="rounded bg-indigo-500/15 px-1.5 py-0.5 text-[10px] font-mono font-bold text-indigo-400">
                                ID: {u.game_id}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Discord / Autorização */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          {u.discord_username ? (
                            <span className="text-xs font-semibold text-foreground">
                              @{u.discord_username}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground/60 italic">—</span>
                          )}
                          {u.discord_id && (
                            <span className="text-[10px] font-mono text-muted-foreground">
                              ID: {u.discord_id}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Patente */}
                      <td className="px-4 py-4">
                        {canEditPatente(u) ? (
                          <button
                            onClick={(e) => toggleOpen(u.id, 'patente', e)}
                            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold hover:opacity-85 cursor-pointer transition-opacity ${getPatenteColorClass(
                              u.patente
                            )}`}
                          >
                            <span>{u.patente ?? 'Recruta'}</span>
                            <ChevronDown className="h-3 w-3 opacity-60" />
                          </button>
                        ) : (
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getPatenteColorClass(
                              u.patente
                            )}`}
                          >
                            {u.patente ?? 'Recruta'}
                          </span>
                        )}
                      </td>

                      {/* Cargos */}
                      <td className="px-4 py-4 min-w-[200px]">
                        {canEditCargos(u) ? (
                          <div
                            onClick={(e) => toggleOpen(u.id, 'cargo', e)}
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
                        ) : (
                          <div className="flex flex-wrap gap-1 max-w-[280px] p-1.5 rounded-lg border border-border/20 bg-secondary/5 min-h-[36px]">
                            {u.cargo && u.cargo.length > 0 && u.cargo[0] !== 'Sem Efetividade' ? (
                              u.cargo.map((c) => (
                                <span
                                  key={c}
                                  className="rounded-full bg-secondary/50 px-2 py-0.5 text-[10px] font-semibold text-foreground border border-border/30"
                                >
                                  {c}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-muted-foreground p-0.5">Sem Efetividade</span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Unid Admin */}
                      <td className="px-4 py-4">
                        {canEditUnidadeAdministrativa(u) ? (
                          <button
                            onClick={(e) => toggleOpen(u.id, 'unidade_administrativa', e)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-border/50 bg-secondary/30 px-2.5 py-1 text-xs font-medium hover:bg-secondary/50 text-foreground cursor-pointer"
                          >
                            <span>{u.unidade_administrativa || 'Sem Efetividade'}</span>
                            <ChevronDown className="h-3 w-3 opacity-60" />
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-lg border border-border/30 bg-secondary/10 px-2.5 py-1 text-xs font-medium text-foreground">
                            {u.unidade_administrativa || 'Sem Efetividade'}
                          </span>
                        )}
                      </td>

                      {/* Unid Operacional */}
                      <td className="px-4 py-4">
                        {canEditUnidadeOperacional(u) ? (
                          <button
                            onClick={(e) => toggleOpen(u.id, 'unidade_operacional', e)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-border/50 bg-secondary/30 px-2.5 py-1 text-xs font-medium hover:bg-secondary/50 text-foreground cursor-pointer"
                          >
                            <span>{u.unidade_operacional || 'Sem Efetividade'}</span>
                            <ChevronDown className="h-3 w-3 opacity-60" />
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-lg border border-border/30 bg-secondary/10 px-2.5 py-1 text-xs font-medium text-foreground">
                            {u.unidade_operacional || 'Sem Efetividade'}
                          </span>
                        )}
                      </td>

                      {/* Status de Atividade */}
                      <td className="px-4 py-4">
                        {canEditStatusAtividade(u) ? (
                          <button
                            onClick={(e) => toggleOpen(u.id, 'status_atividade', e)}
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
                        ) : (
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                              u.status_atividade === 'Inativo'
                                ? 'text-zinc-400 bg-zinc-500/10 border-zinc-500/30'
                                : 'text-green-400 bg-green-400/10 border-green-500/30'
                            }`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${u.status_atividade === 'Inativo' ? 'bg-zinc-500' : 'bg-green-400'}`} />
                            <span>{u.status_atividade ?? 'Ativo'}</span>
                          </span>
                        )}
                      </td>

                      {/* Cursos */}
                      <td className="px-4 py-4 min-w-[200px]">
                        {canEditCursos(u) ? (
                          <div
                            onClick={(e) => toggleOpen(u.id, 'cursos', e)}
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
                        ) : (
                          <div className="flex flex-wrap gap-1 max-w-[280px] p-1.5 rounded-lg border border-border/20 bg-secondary/5 min-h-[36px]">
                            {u.cursos && u.cursos.length > 0 ? (
                              u.cursos.map((cur) => (
                                <span
                                  key={cur}
                                  className="rounded-full bg-secondary/50 px-2 py-0.5 text-[10px] font-semibold text-foreground border border-border/30"
                                >
                                  {cur}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-muted-foreground p-0.5">Sem Cursos</span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Advertências */}
                      <td className="px-4 py-4 min-w-[180px]">
                        {canEditAdvertencia(u) ? (
                          <div
                            onClick={(e) => toggleOpen(u.id, 'advertencia', e)}
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
                        ) : (
                          <div className="flex flex-wrap gap-1 max-w-[280px] p-1.5 rounded-lg border border-border/20 bg-secondary/5 min-h-[36px]">
                            {u.advertencia && u.advertencia.length > 0 ? (
                              u.advertencia.map((adv) => (
                                <span
                                  key={adv}
                                  className="rounded-full bg-red-500/5 px-2 py-0.5 text-[10px] font-semibold text-red-400/80 border border-red-500/10"
                                >
                                  {adv}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-muted-foreground p-0.5">Ficha Limpa</span>
                            )}
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

      {/* Dynamic Floating Dropdown Overlay */}
      {activeDropdown && dropdownCoords && activeUser && (
        (() => {
          const patenteOptions = getPatenteOptionsForUser(myPatente, activeUser.id, myProfile?.id || '', isSiteAdmin)
          const cargoOptions = getAllowedCargos(myCargos, activeUser.id, myProfile?.id || '', isSiteAdmin)
          const unidadeAdministrativaOptions = getAllowedUnidadesAdministrativas(myCargos, isSiteAdmin)
          const unidadeOperacionalOptions = getAllowedUnidadesOperacionais(myCargos, isSiteAdmin)
          const statusAtividadeOptions = getAllowedStatusAtividade(isSiteAdmin)
          const cursoOptions = getAllowedCursos(myCargos, isSiteAdmin)
          const advertenciaOptions = getAllowedAdvertencias(myCargos, isSiteAdmin)

          return (
            <>
              {/* Backdrop to dismiss */}
              <div
                className="fixed inset-0 z-[9998] bg-transparent cursor-default"
                onClick={() => {
                  setActiveDropdown(null)
                  setDropdownCoords(null)
                }}
              />

              {/* Floating Dropdown Container */}
              <div
                className="fixed z-[9999] rounded-lg border border-border/80 bg-popover p-1 shadow-2xl backdrop-blur-md overflow-y-auto"
                style={{
                  top: `${dropdownCoords.top}px`,
                  left: `${dropdownCoords.left}px`,
                  width: activeDropdown.field === 'cargo' || activeDropdown.field === 'cursos' ? '256px' : activeDropdown.field === 'advertencia' ? '240px' : '192px',
                  maxHeight: activeDropdown.field === 'cargo' || activeDropdown.field === 'cursos' || activeDropdown.field === 'advertencia' ? '288px' : '240px',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {activeDropdown.field === 'patente' && (
                  <div className="flex flex-col gap-0.5">
                    {patenteOptions.map((pat) => (
                      <button
                        key={pat}
                        onClick={() => handleSingleSelect(activeUser.id, 'patente', pat)}
                        className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-xs font-medium hover:bg-secondary text-foreground cursor-pointer transition-colors ${
                          activeUser.patente === pat ? 'bg-secondary' : ''
                        }`}
                      >
                        <span>{pat}</span>
                        {activeUser.patente === pat && <Check className="h-3.5 w-3.5 text-primary" />}
                      </button>
                    ))}
                  </div>
                )}

                {activeDropdown.field === 'cargo' && (
                  <div className="flex flex-col gap-0.5">
                    <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase border-b border-border/30 mb-1 sticky top-0 bg-popover/90 backdrop-blur-sm z-10">
                      Selecionar Cargos
                    </div>
                    {cargoOptions.map((car) => {
                      const isChecked = activeUser.cargo?.includes(car)
                      return (
                        <button
                          key={car}
                          onClick={() => handleMultiSelectToggle(activeUser.id, 'cargo', car)}
                          className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs hover:bg-secondary text-left text-foreground font-medium cursor-pointer transition-colors"
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

                {activeDropdown.field === 'unidade_administrativa' && (
                  <div className="flex flex-col gap-0.5">
                    {unidadeAdministrativaOptions.map((ua) => (
                      <button
                        key={ua}
                        onClick={() => handleSingleSelect(activeUser.id, 'unidade_administrativa', ua)}
                        className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-xs font-medium hover:bg-secondary text-foreground cursor-pointer transition-colors ${
                          activeUser.unidade_administrativa === ua ? 'bg-secondary' : ''
                        }`}
                      >
                        <span>{ua}</span>
                        {activeUser.unidade_administrativa === ua && <Check className="h-3.5 w-3.5 text-primary" />}
                      </button>
                    ))}
                  </div>
                )}

                {activeDropdown.field === 'unidade_operacional' && (
                  <div className="flex flex-col gap-0.5">
                    {unidadeOperacionalOptions.map((uo) => (
                      <button
                        key={uo}
                        onClick={() => handleSingleSelect(activeUser.id, 'unidade_operacional', uo)}
                        className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-xs font-medium hover:bg-secondary text-foreground cursor-pointer transition-colors ${
                          activeUser.unidade_operacional === uo ? 'bg-secondary' : ''
                        }`}
                      >
                        <span>{uo}</span>
                        {activeUser.unidade_operacional === uo && <Check className="h-3.5 w-3.5 text-primary" />}
                      </button>
                    ))}
                  </div>
                )}

                {activeDropdown.field === 'status_atividade' && (
                  <div className="flex flex-col gap-0.5">
                    <div className="px-2 py-1 text-[9px] font-semibold text-muted-foreground uppercase border-b border-border/30 mb-1 leading-tight sticky top-0 bg-popover/90 backdrop-blur-sm z-10">
                      Alterar Status (Manual)
                    </div>
                    {statusAtividadeOptions.map((sa) => (
                      <button
                        key={sa}
                        onClick={() => handleSingleSelect(activeUser.id, 'status_atividade', sa)}
                        className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-xs font-medium hover:bg-secondary text-foreground cursor-pointer transition-colors ${
                          activeUser.status_atividade === sa ? 'bg-secondary' : ''
                        }`}
                      >
                        <span>{sa}</span>
                        {activeUser.status_atividade === sa && <Check className="h-3.5 w-3.5 text-primary" />}
                      </button>
                    ))}
                    <div className="p-2 border-t border-border/30 mt-1 text-[9px] leading-relaxed text-muted-foreground">
                      Muda para <span className="font-semibold text-foreground">Inativo</span> se ficar 15 dias sem fazer login.
                    </div>
                  </div>
                )}

                {activeDropdown.field === 'cursos' && (
                  <div className="flex flex-col gap-0.5">
                    <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase border-b border-border/30 mb-1 sticky top-0 bg-popover/90 backdrop-blur-sm z-10">
                      Toggelar Cursos
                    </div>
                    {cursoOptions.map((cur) => {
                      const isChecked = activeUser.cursos?.includes(cur)
                      return (
                        <button
                          key={cur}
                          onClick={() => handleMultiSelectToggle(activeUser.id, 'cursos', cur)}
                          className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs hover:bg-secondary text-left text-foreground font-medium cursor-pointer transition-colors"
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

                {activeDropdown.field === 'advertencia' && (
                  <div className="flex flex-col gap-0.5">
                    <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase border-b border-border/30 mb-1 sticky top-0 bg-popover/90 backdrop-blur-sm z-10">
                      Toggelar Advertências
                    </div>
                    {advertenciaOptions.map((adv) => {
                      const isChecked = activeUser.advertencia?.includes(adv)
                      return (
                        <button
                          key={adv}
                          onClick={() => handleMultiSelectToggle(activeUser.id, 'advertencia', adv)}
                          className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs hover:bg-secondary text-left text-foreground font-medium cursor-pointer transition-colors"
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
              </div>
            </>
          )
        })()
      )}

      {/* Indicador de rolagem para ver a lista completa */}
      <AnimatePresence>
        {showScrollIndicator && (
          <motion.div
            initial={{ opacity: 0, y: 15, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 15, x: '-50%' }}
            transition={{ duration: 0.3 }}
            onClick={scrollToHierarchyList}
            className="fixed bottom-8 left-1/2 z-40 flex flex-col items-center gap-1.5 cursor-pointer select-none group bg-background/80 hover:bg-background/95 backdrop-blur-md px-4 py-2.5 rounded-full border border-border/60 shadow-lg shadow-black/30 hover:border-primary/50 transition-colors"
          >
            <span className="text-[11px] font-semibold tracking-wide text-muted-foreground group-hover:text-foreground transition-colors uppercase font-sans">
              Veja a hierarquia completa
            </span>
            <motion.div
              animate={{ y: [0, 4, 0] }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-primary group-hover:bg-primary/20 transition-colors"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}
