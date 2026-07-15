'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/lib/auth-context'
import {
  Calendar,
  Clock,
  Users,
  UserCheck,
  Plus,
  Trash,
  Edit,
  ExternalLink,
  FileText,
  CheckCircle,
  AlertTriangle,
  X,
  ChevronDown,
  ChevronUp,
  Award,
  Link2,
  FileSpreadsheet
} from 'lucide-react'

export interface Edital {
  id: string
  title: string
  description: string
  requirements?: string
  unidade: 'GAEP' | 'GTM' | 'GAR' | 'BOPE' | 'CORE' | 'Corregedoria' | 'APM' | 'Geral'
  linkFormulario: string
  endDate: string // "YYYY-MM-DDTHH:mm" format in Brasília time
  creatorId: string
  creatorQra: string
  createdAt: string
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

export default function EditaisPage() {
  const { user, profile, session } = useAuth()
  const [editais, setEditais] = useState<Edital[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Form State for Publication
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [requirements, setRequirements] = useState('')
  const [unidade, setUnidade] = useState('')
  const [linkFormulario, setLinkFormulario] = useState('')
  const [endDate, setEndDate] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Editing State
  const [editingEdital, setEditingEdital] = useState<Edital | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editRequirements, setEditRequirements] = useState('')
  const [editUnidade, setEditUnidade] = useState('')
  const [editLinkFormulario, setEditLinkFormulario] = useState('')
  const [editEndDate, setEditEndDate] = useState('')

  // Evaluation Panel State
  const [evaluatingEdital, setEvaluatingEdital] = useState<Edital | null>(null)
  const [sidebarTab, setSidebarTab] = useState<'create' | 'evaluations'>('create')
  const [evaluationInputs, setEvaluationInputs] = useState<Record<string, { status: 'Aprovado' | 'Reprovado' | ''; nota: string }>>({})
  const [evaluationStatusText, setEvaluationStatusText] = useState<Record<string, string>>({})

  // Expanded Cards (Ler mais)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  // Current Brasília Time tracking state
  const [brasiliaTime, setBrasiliaTime] = useState<string>('')

  // Confirmation notice popup on subscription
  const [subscriptionNotice, setSubscriptionNotice] = useState<string | null>(null)

  const sidebarFormRef = useRef<HTMLDivElement>(null)

  // Check Permissions
  const myCargos = profile?.cargo ?? []
  const isSiteAdmin = profile?.role === 'admin'
  const isAllPowerfulEditalPublisher =
    isSiteAdmin ||
    myCargos.includes('Alto Comando') ||
    myCargos.includes('Diretor Corregedoria') ||
    myCargos.includes('Diretor APM')

  const isBopeCommand = myCargos.includes('Comando Bope')
  const isCoreCommand = myCargos.includes('Comando Core')
  const isGarCommand = myCargos.includes('Comando GAR')
  const isGaepCommand = myCargos.includes('Comando GAEP')
  const isGtmCommand = myCargos.includes('Comando GTM')

  const isAuthorizedToPublish =
    isAllPowerfulEditalPublisher ||
    isBopeCommand ||
    isCoreCommand ||
    isGarCommand ||
    isGaepCommand ||
    isGtmCommand

  // Helper to get available units for the user based on rules
  const getAvailableUnitsForUser = () => {
    if (isAllPowerfulEditalPublisher) {
      return ['Geral', 'GAEP', 'GTM', 'GAR', 'BOPE', 'CORE', 'Corregedoria', 'APM']
    }
    const units: string[] = []
    if (isBopeCommand) units.push('BOPE')
    if (isCoreCommand) units.push('CORE')
    if (isGarCommand) units.push('GAR')
    if (isGaepCommand) units.push('GAEP')
    if (isGtmCommand) units.push('GTM')
    return units
  }

  const availableUnits = getAvailableUnitsForUser()

  // Pre-select unit if there's only one choice
  useEffect(() => {
    if (availableUnits.length === 1 && !unidade) {
      setUnidade(availableUnits[0])
    }
  }, [availableUnits, unidade])

  // Helper to format string date to readable pt-BR format
  const formatDateTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr)
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return dateStr
    }
  }

  // Get current Brasília date-time as local formatted string (sv-SE format: YYYY-MM-DDTHH:mm:ss)
  const getBrasiliaTimeStr = () => {
    const now = new Date()
    const formatter = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
    return formatter.format(now).replace(' ', 'T')
  }

  // Update Brasília time state
  useEffect(() => {
    setBrasiliaTime(getBrasiliaTimeStr())
    const interval = setInterval(() => {
      setBrasiliaTime(getBrasiliaTimeStr())
    }, 10000) // Update every 10 seconds
    return () => clearInterval(interval)
  }, [])

  // Focus and auto-expand from query parameter focusId
  useEffect(() => {
    if (typeof window !== 'undefined' && editais.length > 0) {
      const params = new URLSearchParams(window.location.search)
      const focusId = params.get('focus')
      if (focusId) {
        setExpandedIds(prev => {
          const next = new Set(prev)
          next.add(focusId)
          return next
        })
        setTimeout(() => {
          const el = document.getElementById(`edital-card-${focusId}`)
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' })
            el.classList.add('ring-2', 'ring-primary')
            setTimeout(() => {
              el.classList.remove('ring-2', 'ring-primary')
            }, 3000)
          }
        }, 400)
      }
    }
  }, [editais])

  // Fetch Editais
  const fetchEditais = async () => {
    try {
      const res = await fetch('/api/editais')
      if (!res.ok) throw new Error('Falha ao buscar editais')
      const data = await res.json()
      setEditais(data.editais || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEditais()

    // Listen to real-time events via SSE
    const handleRealtimeEvent = (e: Event) => {
      const { detail } = e as CustomEvent
      if (detail && detail.event === 'editais-updated') {
        fetchEditais()
      }
    }

    window.addEventListener('sse-event', handleRealtimeEvent)
    return () => {
      window.removeEventListener('sse-event', handleRealtimeEvent)
    }
  }, [])

  // Synchronize evaluation inputs when evaluatingEdital or editais list changes
  useEffect(() => {
    if (evaluatingEdital) {
      const latestEdital = editais.find(e => e.id === evaluatingEdital.id)
      if (latestEdital) {
        const initialInputs: Record<string, { status: 'Aprovado' | 'Reprovado' | ''; nota: string }> = {}
        latestEdital.subscribers.forEach((sub) => {
          const evalData = latestEdital.evaluations?.[sub.userId]
          initialInputs[sub.userId] = {
            status: evalData?.status ?? '',
            nota: evalData?.nota !== undefined ? evalData.nota.toString() : '',
          }
        })
        setEvaluationInputs(initialInputs)
      }
    }
  }, [evaluatingEdital, editais])

  // Publish Edital
  const handlePublishEdital = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isAuthorizedToPublish) return

    if (!unidade) {
      setError('Por favor, selecione uma Unidade Relacionada.')
      return
    }

    setSubmitting(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const res = await fetch('/api/editais', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          action: 'create',
          title,
          description,
          requirements,
          unidade,
          linkFormulario,
          endDate,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Falha ao publicar edital.')

      setTitle('')
      setDescription('')
      setRequirements('')
      setUnidade(availableUnits.length === 1 ? availableUnits[0] : '')
      setLinkFormulario('')
      setEndDate('')
      setSuccessMessage('Edital publicado com sucesso!')
      fetchEditais()

      setTimeout(() => setSuccessMessage(null), 5000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // Edit Edital Submission
  const handleSaveEditEdital = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingEdital) return

    setSubmitting(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const res = await fetch('/api/editais', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          action: 'edit',
          id: editingEdital.id,
          title: editTitle,
          description: editDescription,
          requirements: editRequirements,
          unidade: editUnidade,
          linkFormulario: editLinkFormulario,
          endDate: editEndDate,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Falha ao salvar alterações.')

      setEditingEdital(null)
      setSuccessMessage('Edital atualizado com sucesso!')
      fetchEditais()

      setTimeout(() => setSuccessMessage(null), 5000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // Set up edital for editing
  const handleStartEdit = (edital: Edital) => {
    setEvaluatingEdital(null) // Close evaluation if open
    setEditingEdital(edital)
    setEditTitle(edital.title)
    setEditDescription(edital.description)
    setEditRequirements(edital.requirements || '')
    setEditUnidade(edital.unidade)
    setEditLinkFormulario(edital.linkFormulario)
    setEditEndDate(edital.endDate)

    if (sidebarFormRef.current) {
      sidebarFormRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }

  // Delete Edital
  const handleDeleteEdital = async (id: string) => {
    if (!confirm('Deseja realmente excluir este edital permanentemente?')) return

    setError(null)
    setSuccessMessage(null)

    try {
      const res = await fetch('/api/editais', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          action: 'delete',
          id,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Falha ao excluir edital.')

      setSuccessMessage('Edital excluído com sucesso!')
      fetchEditais()

      // If we were editing or evaluating this edital, close the panels
      if (editingEdital?.id === id) setEditingEdital(null)
      if (evaluatingEdital?.id === id) setEvaluatingEdital(null)

      setTimeout(() => setSuccessMessage(null), 5000)
    } catch (err: any) {
      setError(err.message)
    }
  }

  // Subscribe to Edital (Inscrever-se)
  const handleSubscribe = async (id: string, titleStr: string) => {
    setError(null)
    setSuccessMessage(null)

    try {
      const res = await fetch('/api/editais', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          action: 'subscribe',
          id,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Falha ao se inscrever.')

      // Display warning notice confirming inscription
      setSubscriptionNotice(titleStr)
      fetchEditais()
    } catch (err: any) {
      setError(err.message)
    }
  }

  // Unsubscribe from Edital (Cancelar Inscrição)
  const handleUnsubscribe = async (id: string) => {
    if (!confirm('Tem certeza de que deseja cancelar sua inscrição neste edital?')) return

    setError(null)
    setSuccessMessage(null)

    try {
      const res = await fetch('/api/editais', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          action: 'unsubscribe',
          id,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Falha ao cancelar inscrição.')

      setSuccessMessage('Sua inscrição foi cancelada.')
      fetchEditais()
      setTimeout(() => setSuccessMessage(null), 4000)
    } catch (err: any) {
      setError(err.message)
    }
  }

  // Save an individual candidate's evaluation
  const handleSaveEvaluation = async (editalId: string, userId: string) => {
    const input = evaluationInputs[userId]
    if (!input || !input.status || input.nota.trim() === '') {
      alert('Selecione o Status (Aprovado/Reprovado) e preencha a Nota (0 a 10) para salvar.')
      return
    }

    const grade = parseFloat(input.nota.replace(',', '.'))
    if (isNaN(grade) || grade < 0 || grade > 10) {
      alert('A nota deve ser um número válido de 0 a 10.')
      return
    }

    setEvaluationStatusText(prev => ({ ...prev, [userId]: 'Salvando...' }))

    try {
      const res = await fetch('/api/editais', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          action: 'evaluate-subscriber',
          id: editalId,
          userId,
          status: input.status,
          nota: grade,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Falha ao salvar avaliação.')

      setEvaluationStatusText(prev => ({ ...prev, [userId]: 'Salvo!' }))
      fetchEditais()

      setTimeout(() => {
        setEvaluationStatusText(prev => {
          const next = { ...prev }
          delete next[userId]
          return next
        })
      }, 3000)
    } catch (err: any) {
      setEvaluationStatusText(prev => ({ ...prev, [userId]: `Erro: ${err.message}` }))
    }
  }

  // Toggle expanded state for card descriptions
  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // Split editais into Aberto and Fechado (Encerrado / Histórico)
  const currentT = brasiliaTime || getBrasiliaTimeStr()
  const editaisAbertos = editais.filter(e => e.endDate >= currentT)
  const editaisEncerrados = editais.filter(e => e.endDate < currentT)

  // Quick evaluation panel trigger
  const triggerEvaluationForEdital = (edital: Edital) => {
    setEditingEdital(null) // Close editor if open
    setEvaluatingEdital(edital)
    setSidebarTab('evaluations')
    if (sidebarFormRef.current) {
      sidebarFormRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }

  // Check if a user matches permission to manage a specific edital (unit or creator match)
  const canManageSpecificEdital = (edital: Edital) => {
    if (isAllPowerfulEditalPublisher) return true
    if (edital.creatorId === user?.id) return true

    // Unit-specific match
    if (isBopeCommand && edital.unidade === 'BOPE') return true
    if (isCoreCommand && edital.unidade === 'CORE') return true
    if (isGarCommand && edital.unidade === 'GAR') return true
    if (isGaepCommand && edital.unidade === 'GAEP') return true
    if (isGtmCommand && edital.unidade === 'GTM') return true

    return false
  }

  return (
    <main className="mx-auto max-w-[1600px] px-6 pb-24 pt-16 sm:px-10 lg:px-16 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/60 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wider">
              MURAL DE PROCESSOS SELETIVOS
            </span>
          </div>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl text-foreground">
            Mural de Editais
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Acompanhe vagas, inscreva-se em editais internos e acesse formulários de seleção oficial.
          </p>
        </div>

        {/* Dynamic Brasília Clock */}
        <div className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-secondary/30 px-4 py-2.5 shrink-0 self-start md:self-center shadow-sm">
          <Clock className="h-4.5 w-4.5 text-muted-foreground" />
          <div className="text-left">
            <span className="block text-[9px] font-bold text-muted-foreground uppercase">Fuso Horário Oficial</span>
            <span className="block text-xs font-bold font-mono text-foreground/90">
              {brasiliaTime ? formatDateTime(brasiliaTime) : 'Carregando relógio...'}
            </span>
          </div>
        </div>
      </div>

      {/* Subscription notice alert modal/notice */}
      {subscriptionNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3 text-emerald-400">
              <CheckCircle className="h-6 w-6 shrink-0" />
              <h3 className="text-lg font-bold text-foreground">Inscrição Registrada no Site!</h3>
            </div>
            
            <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
              <p>
                Sua candidatura para o edital <strong className="text-foreground">"{subscriptionNotice}"</strong> foi associada com sucesso ao seu perfil (QRA/Nome).
              </p>
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3 flex items-start gap-2.5 text-amber-200 text-xs">
                <AlertTriangle className="h-4.5 w-4.5 text-amber-400 shrink-0 mt-0.5" />
                <p>
                  <strong>ATENÇÃO OBRIGATÓRIA:</strong> Registrar a inscrição aqui no site <strong className="underline">não substitui</strong> o preenchimento do formulário externo!
                  <br />
                  <br />
                  Você <strong>precisa</strong> clicar no botão <strong>"Responder Formulário"</strong> para preencher e responder o formulário oficial (Google Forms ou equivalente) do processo seletivo.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSubscriptionNotice(null)}
                className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/95 transition-all cursor-pointer"
              >
                Ciente e Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid content layout */}
      <div className={`mt-10 ${isAuthorizedToPublish ? "grid grid-cols-1 lg:grid-cols-3 gap-8" : "max-w-5xl mx-auto space-y-8"}`}>
        
        {/* LEFT COLUMN: Mural & list of cards */}
        <div className="lg:col-span-2 space-y-10">
          
          {/* Status logs */}
          {error && (
            <div className="rounded-lg border border-red-500/25 bg-red-500/10 p-4 text-xs font-medium text-red-400 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 p-4 text-xs font-medium text-emerald-400 flex items-start gap-2">
              <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {loading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Carregando editais...</div>
          ) : (
            <div className="space-y-12">
              
              {/* SECTION: EDITAIS ABERTOS */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-border/40 pb-2">
                  <h2 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle className="h-4 w-4 text-emerald-400" />
                    Editais Abertos ({editaisAbertos.length})
                  </h2>
                </div>

                {editaisAbertos.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border/60 p-8 text-center bg-card/10">
                    <FileText className="mx-auto h-8 w-8 text-muted-foreground/50" />
                    <p className="mt-3 text-xs text-muted-foreground">Nenhum edital aberto no momento.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {editaisAbertos.map((edital) => {
                      const isSubscribed = edital.subscribers.some(s => s.userId === user?.id)
                      const isExpanded = expandedIds.has(edital.id)
                      const availableSpotsCount = edital.subscribers.length

                      return (
                        <div
                          key={edital.id}
                          id={`edital-card-${edital.id}`}
                          className={`rounded-xl border bg-card/40 p-5 space-y-4 backdrop-blur-sm transition-all hover:border-border/100 hover:shadow-md relative ${
                            isSubscribed ? 'border-emerald-500/30 ring-1 ring-emerald-500/10' : 'border-border/60'
                          }`}
                        >
                          {/* Card Header */}
                          <div className="flex items-start justify-between gap-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="rounded bg-secondary/80 px-2 py-0.5 text-[9px] font-bold text-foreground tracking-wider uppercase">
                                  {edital.unidade}
                                </span>
                                <span className="rounded bg-emerald-500/10 border border-emerald-500/25 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400 tracking-wider uppercase flex items-center gap-1">
                                  <Clock className="h-2.5 w-2.5" /> Aberto
                                </span>
                              </div>
                              <h3 className="text-base font-bold text-foreground pr-10 mt-1 leading-snug">
                                {edital.title}
                              </h3>
                            </div>

                            {/* Options to edit/delete for creators or allowed staff */}
                            {isAuthorizedToPublish && canManageSpecificEdital(edital) && (
                              <div className="absolute right-4 top-4 flex items-center gap-1.5">
                                <button
                                  onClick={() => handleStartEdit(edital)}
                                  title="Editar edital"
                                  className="rounded p-1 text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-all cursor-pointer"
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteEdital(edital.id)}
                                  title="Excluir edital"
                                  className="rounded p-1 text-muted-foreground hover:bg-red-500/10 hover:text-red-400 transition-all cursor-pointer"
                                >
                                  <Trash className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Description details */}
                          <div className="text-xs text-muted-foreground leading-relaxed">
                            {isExpanded ? (
                              <div className="space-y-3 mt-1 bg-secondary/15 p-4 rounded-lg border border-border/30">
                                <div>
                                  <span className="text-[10px] font-bold text-foreground/70 uppercase tracking-wider block mb-1">Descrição:</span>
                                  <div className="whitespace-pre-wrap leading-relaxed text-foreground/90">
                                    {edital.description}
                                  </div>
                                </div>
                                <div>
                                  <span className="text-[10px] font-bold text-foreground/70 uppercase tracking-wider block mb-1">Requisitos:</span>
                                  <div className="whitespace-pre-wrap leading-relaxed text-foreground/90">
                                    {edital.requirements || 'Nenhum requisito informado.'}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <p className="line-clamp-2">
                                {edital.description}
                              </p>
                            )}
                            
                            <button
                              onClick={() => toggleExpanded(edital.id)}
                              className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-foreground hover:underline cursor-pointer"
                            >
                              {isExpanded ? (
                                <>Ocultar <ChevronUp className="h-3 w-3" /></>
                              ) : (
                                <>Ler mais & detalhes <ChevronDown className="h-3 w-3" /></>
                              )}
                            </button>
                          </div>

                          {/* Time & Candidates metrics */}
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground/80 border-t border-border/30 pt-3">
                            <span className="flex items-center gap-1 font-medium">
                              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                              Inscrições até: {formatDateTime(edital.endDate)}
                            </span>
                            <span className="flex items-center gap-1 font-medium">
                              <Users className="h-3.5 w-3.5 text-muted-foreground" />
                              {availableSpotsCount} candidato{availableSpotsCount !== 1 ? 's' : ''} inscrito{availableSpotsCount !== 1 ? 's' : ''}
                            </span>
                          </div>

                          {/* Registered candidates display nested in the card */}
                          {edital.subscribers.length > 0 && (
                            <div className="rounded-lg bg-secondary/15 p-3 text-[11px]">
                              <span className="font-bold text-muted-foreground uppercase text-[9px] block mb-1 tracking-wider">
                                Candidatos Inscritos no Site ({edital.subscribers.length})
                              </span>
                              <div className="flex flex-wrap gap-1.5 mt-1.5 max-h-24 overflow-y-auto">
                                {edital.subscribers.map((sub) => (
                                  <span
                                    key={sub.userId}
                                    title={`Inscrito em: ${new Date(sub.subscribedAt).toLocaleString('pt-BR')}`}
                                    className="rounded bg-secondary/35 px-2 py-0.5 border border-border/40 text-foreground font-medium"
                                  >
                                    {sub.qra || sub.username}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* ACTION BUTTONS */}
                          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/20">
                            {/* Inscrever-se button */}
                            {isSubscribed ? (
                              <div className="flex items-center gap-2 w-full sm:w-auto">
                                <button
                                  onClick={() => handleUnsubscribe(edital.id)}
                                  className="w-full sm:w-auto rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold px-3 py-2 text-xs flex items-center justify-center gap-1.5 hover:bg-emerald-500/20 transition-all cursor-pointer"
                                  title="Clique para cancelar sua inscrição"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                  Inscrito
                                </button>
                                <button
                                  onClick={() => handleUnsubscribe(edital.id)}
                                  className="text-[10px] text-red-400 hover:underline cursor-pointer"
                                >
                                  Cancelar Inscrição
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleSubscribe(edital.id, edital.title)}
                                className="w-full sm:w-auto rounded-lg bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-all flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <UserCheck className="h-4 w-4" />
                                Inscrever-se no Edital
                              </button>
                            )}

                            {/* Responder Formulário button (Only visible if subscribed - Sequential flow!) */}
                            {isSubscribed && (
                              <a
                                href={edital.linkFormulario}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full sm:w-auto rounded-lg bg-secondary border border-border/80 px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-secondary/85 hover:border-border transition-all flex items-center justify-center gap-1.5 cursor-pointer ml-auto"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                                Responder Formulário
                              </a>
                            )}
                          </div>

                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* SECTION: EDITAIS ENCERRADOS / HISTÓRICO */}
              <div className="space-y-4 pt-4">
                <div className="flex items-center justify-between border-b border-border/40 pb-2">
                  <h2 className="text-sm font-bold text-foreground/80 uppercase tracking-wider flex items-center gap-1.5">
                    <FileSpreadsheet className="h-4 w-4 text-muted-foreground/80" />
                    Editais Encerrados / Histórico ({editaisEncerrados.length})
                  </h2>
                </div>

                {editaisEncerrados.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border/40 p-8 text-center bg-card/10">
                    <FileText className="mx-auto h-8 w-8 text-muted-foreground/30" />
                    <p className="mt-3 text-xs text-muted-foreground">Nenhum edital encerrado no histórico.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {editaisEncerrados.map((edital) => {
                      const isExpanded = expandedIds.has(edital.id)
                      const isSubscribed = edital.subscribers.some(s => s.userId === user?.id)
                      const myEval = edital.evaluations?.[user?.id || '']

                      return (
                        <div
                          key={edital.id}
                          className="rounded-xl border border-border/50 bg-secondary/10 p-5 space-y-4 opacity-95 hover:opacity-100 transition-all relative"
                        >
                          {/* Header */}
                          <div className="flex items-start justify-between gap-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="rounded bg-secondary px-2 py-0.5 text-[9px] font-bold text-muted-foreground tracking-wider uppercase">
                                  {edital.unidade}
                                </span>
                                <span className="rounded bg-secondary px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground tracking-wider uppercase flex items-center gap-1">
                                  <X className="h-2.5 w-2.5" /> Encerrado
                                </span>
                              </div>
                              <h3 className="text-sm font-bold text-foreground/90 mt-1">
                                {edital.title}
                              </h3>
                            </div>

                            {/* Avaliar button for managers */}
                            {isAuthorizedToPublish && canManageSpecificEdital(edital) && (
                              <button
                                onClick={() => triggerEvaluationForEdital(edital)}
                                className="rounded bg-primary/10 border border-primary/25 text-primary hover:bg-primary/20 transition-all text-[11px] font-bold px-2.5 py-1.5 flex items-center gap-1 cursor-pointer absolute right-4 top-4"
                              >
                                <Award className="h-3.5 w-3.5" />
                                Avaliar Candidatos
                              </button>
                            )}
                          </div>

                          {/* Description details */}
                          <div className="text-xs text-muted-foreground/85 leading-relaxed">
                            {isExpanded ? (
                              <div className="space-y-3 mt-1 bg-secondary/15 p-4 rounded-lg border border-border/30">
                                <div>
                                  <span className="text-[10px] font-bold text-foreground/70 uppercase tracking-wider block mb-1">Descrição:</span>
                                  <div className="whitespace-pre-wrap leading-relaxed text-foreground/90">
                                    {edital.description}
                                  </div>
                                </div>
                                <div>
                                  <span className="text-[10px] font-bold text-foreground/70 uppercase tracking-wider block mb-1">Requisitos:</span>
                                  <div className="whitespace-pre-wrap leading-relaxed text-foreground/90">
                                    {edital.requirements || 'Nenhum requisito informado.'}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <p className="line-clamp-2">
                                {edital.description}
                              </p>
                            )}
                            
                            <button
                              onClick={() => toggleExpanded(edital.id)}
                              className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-foreground/80 hover:underline cursor-pointer"
                            >
                              {isExpanded ? (
                                <>Ocultar <ChevronUp className="h-3 w-3" /></>
                              ) : (
                                <>Ler mais & detalhes <ChevronDown className="h-3 w-3" /></>
                              )}
                            </button>
                          </div>

                          {/* Meta times */}
                          <div className="text-[11px] text-muted-foreground/80 flex items-center gap-1.5 border-t border-border/25 pt-2">
                            <Calendar className="h-3 w-3" />
                            <span>Inscrições encerradas em: {formatDateTime(edital.endDate)}</span>
                          </div>

                          {/* Personal candidate result */}
                          {isSubscribed && (
                            <div className="rounded-lg bg-secondary/30 p-3 border border-border/30 text-xs">
                              <span className="font-bold text-foreground block mb-1">Seu Resultado no Processo:</span>
                              {myEval ? (
                                <div className="flex items-center gap-3 mt-1.5">
                                  <span className={`text-[10px] font-bold uppercase rounded px-2 py-0.5 border ${
                                    myEval.status === 'Aprovado'
                                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
                                      : 'bg-red-500/15 text-red-400 border-red-500/25'
                                  }`}>
                                    {myEval.status}
                                  </span>
                                  <span className="font-mono font-bold text-foreground">
                                    Nota Final: {myEval.nota.toFixed(1)}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground">
                                    Avaliado por: {myEval.evaluatedBy}
                                  </span>
                                </div>
                              ) : (
                                <p className="text-muted-foreground italic mt-1 text-[11px]">
                                  Sua inscrição foi confirmada no site. Aguardando avaliação de notas e resultados pela banca examinadora.
                                </p>
                              )}
                            </div>
                          )}

                          {/* Global Candidates list and results inside the card (publicly visible) */}
                          <div className="rounded-lg bg-secondary/15 p-3.5 space-y-2 border border-border/20 text-xs">
                            <span className="font-bold text-muted-foreground uppercase text-[9px] block tracking-wider">
                              Lista de Candidatos & Notas do Concurso ({edital.subscribers.length})
                            </span>
                            
                            {edital.subscribers.length === 0 ? (
                              <p className="text-[11px] text-muted-foreground italic">Nenhum oficial se inscreveu para este processo.</p>
                            ) : (
                              <div className="divide-y divide-border/20 max-h-48 overflow-y-auto pr-1 space-y-1">
                                {edital.subscribers.map((sub) => {
                                  const candidateEval = edital.evaluations?.[sub.userId]
                                  return (
                                    <div key={sub.userId} className="flex items-center justify-between py-1.5 gap-2 text-xs">
                                      <span className="font-bold text-foreground/90">{sub.qra || sub.username}</span>
                                      
                                      {candidateEval ? (
                                        <div className="flex items-center gap-2">
                                          <span className={`text-[9px] font-bold uppercase rounded px-1.5 border ${
                                            candidateEval.status === 'Aprovado'
                                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                              : 'bg-red-500/10 text-red-400 border-red-500/20'
                                          }`}>
                                            {candidateEval.status}
                                          </span>
                                          <span className="font-bold font-mono text-[10px] text-foreground">
                                            {candidateEval.nota.toFixed(1)}
                                          </span>
                                        </div>
                                      ) : (
                                        <span className="text-[9px] font-medium text-muted-foreground italic">Aguardando Avaliação</span>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>

                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

            </div>
          )}

        </div>

        {/* RIGHT COLUMN: Publication & Editing Form (Only visible to Authorized Staff) */}
        {isAuthorizedToPublish && (
          <div ref={sidebarFormRef} className="space-y-6 lg:sticky lg:top-24 h-fit">
            
            {/* TABS SELECTOR */}
            {!editingEdital && (
              <div className="flex rounded-lg bg-secondary/40 p-1 border border-border/40 text-xs">
                <button
                  onClick={() => {
                    setSidebarTab('create')
                    setEvaluatingEdital(null)
                  }}
                  className={`flex-1 py-1.5 rounded-md font-semibold transition-all cursor-pointer text-center ${
                    sidebarTab === 'create' && !evaluatingEdital
                      ? 'bg-background text-foreground shadow-sm font-bold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Geral / Criar
                </button>
                <button
                  onClick={() => {
                    setSidebarTab('evaluations')
                    if (!evaluatingEdital && editais.length > 0) {
                      const manageable = editais.find(canManageSpecificEdital)
                      if (manageable) setEvaluatingEdital(manageable)
                    }
                  }}
                  className={`flex-1 py-1.5 rounded-md font-semibold transition-all cursor-pointer text-center ${
                    sidebarTab === 'evaluations' || evaluatingEdital
                      ? 'bg-background text-foreground shadow-sm font-bold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Controle & Avaliação APM
                </button>
              </div>
            )}

            {/* PANEL: PUBLISH NEW EDITAL */}
            {!editingEdital && sidebarTab === 'create' && !evaluatingEdital && (
              <div className="rounded-xl border border-border/80 bg-card/40 p-5 space-y-5 backdrop-blur-sm shadow-sm">
                <div>
                  <h2 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Plus className="h-4 w-4 text-primary" />
                    Publicar Novo Edital
                  </h2>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Crie um processo seletivo ou concurso interno vinculando um link externo oficial.
                  </p>
                </div>

                <form onSubmit={handlePublishEdital} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Título do Edital *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Concurso Interno BOPE - 2026"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-border/80 bg-background/50 px-3 py-2 text-xs outline-none focus:border-foreground"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Descrição (o que vai ser / conteúdo do edital) *
                    </label>
                    <textarea
                      required
                      rows={3}
                      placeholder="Detalhes completos sobre o processo seletivo, as etapas, conteúdo, etc."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-border/80 bg-background/50 px-3 py-2 text-xs outline-none focus:border-foreground resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Requisitos (o que é exigido para participar) *
                    </label>
                    <textarea
                      required
                      rows={3}
                      placeholder="Ex: Patente mínima, tempo de serviço, fardamento necessário, etc."
                      value={requirements}
                      onChange={(e) => setRequirements(e.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-border/80 bg-background/50 px-3 py-2 text-xs outline-none focus:border-foreground resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Unidade Relacionada *
                      </label>
                      <select
                        required
                        value={unidade}
                        onChange={(e) => setUnidade(e.target.value as any)}
                        className="mt-1.5 w-full rounded-lg border border-border/80 bg-background/50 px-3 py-2 text-xs outline-none focus:border-foreground"
                      >
                        <option value="">Selecione...</option>
                        {availableUnits.map((u) => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Prazo Final *
                      </label>
                      <input
                        type="datetime-local"
                        required
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="mt-1.5 w-full rounded-lg border border-border/80 bg-background/50 px-3 py-2 text-xs outline-none focus:border-foreground"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
                      Link do Formulário Externo *
                    </label>
                    <input
                      type="url"
                      required
                      placeholder="https://docs.google.com/forms/d/..."
                      value={linkFormulario}
                      onChange={(e) => setLinkFormulario(e.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-border/80 bg-background/50 px-3 py-2 text-xs outline-none focus:border-foreground"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full rounded-lg bg-primary py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary/95 transition-all disabled:opacity-50 flex items-center justify-center gap-1 cursor-pointer mt-2"
                  >
                    {submitting ? 'Publicando...' : 'Publicar Edital'}
                  </button>
                </form>
              </div>
            )}

            {/* PANEL: EDIT EDITAL */}
            {editingEdital && (
              <div className="rounded-xl border border-primary/40 bg-card/40 p-5 space-y-5 backdrop-blur-sm shadow-sm ring-1 ring-primary/20">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Edit className="h-4 w-4 text-primary" />
                      Editar Edital
                    </h2>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Modifique as informações básicas ou o prazo de inscrição.
                    </p>
                  </div>
                  <button
                    onClick={() => setEditingEdital(null)}
                    className="text-muted-foreground hover:text-foreground p-1 rounded-lg"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <form onSubmit={handleSaveEditEdital} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Título do Edital *
                    </label>
                    <input
                      type="text"
                      required
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-border/80 bg-background/50 px-3 py-2 text-xs outline-none focus:border-foreground"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Descrição (o que vai ser / conteúdo do edital) *
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-border/80 bg-background/50 px-3 py-2 text-xs outline-none focus:border-foreground resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Requisitos (o que é exigido para participar) *
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={editRequirements}
                      onChange={(e) => setEditRequirements(e.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-border/80 bg-background/50 px-3 py-2 text-xs outline-none focus:border-foreground resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Unidade Relacionada *
                      </label>
                      <select
                        required
                        value={editUnidade}
                        onChange={(e) => setEditUnidade(e.target.value as any)}
                        className="mt-1.5 w-full rounded-lg border border-border/80 bg-background/50 px-3 py-2 text-xs outline-none focus:border-foreground"
                      >
                        <option value="">Selecione...</option>
                        {availableUnits.map((u) => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Prazo Final *
                      </label>
                      <input
                        type="datetime-local"
                        required
                        value={editEndDate}
                        onChange={(e) => setEditEndDate(e.target.value)}
                        className="mt-1.5 w-full rounded-lg border border-border/80 bg-background/50 px-3 py-2 text-xs outline-none focus:border-foreground"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
                      Link do Formulário Externo *
                    </label>
                    <input
                      type="url"
                      required
                      value={editLinkFormulario}
                      onChange={(e) => setEditLinkFormulario(e.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-border/80 bg-background/50 px-3 py-2 text-xs outline-none focus:border-foreground"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setEditingEdital(null)}
                      className="flex-1 rounded-lg bg-secondary border border-border/80 py-2.5 text-xs font-semibold text-foreground hover:bg-secondary/85 transition-all cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 rounded-lg bg-primary py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary/95 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {submitting ? 'Salvando...' : 'Salvar Alterações'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* PANEL: EVALUATE CANDIDATES */}
            {!editingEdital && (sidebarTab === 'evaluations' || evaluatingEdital) && (
              <div className="rounded-xl border border-primary/50 bg-card/40 p-5 space-y-4 backdrop-blur-sm shadow-md ring-1 ring-primary/20">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Award className="h-4 w-4 text-emerald-400" />
                      Controle & Avaliação APM
                    </h2>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Atribua notas (0 a 10) e aprove/reprove inscritos nos processos.
                    </p>
                  </div>
                </div>

                {/* Dropdown Selector */}
                <div className="space-y-1.5 pt-1 border-t border-border/20">
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Selecionar Edital
                  </label>
                  <select
                    value={evaluatingEdital?.id || ''}
                    onChange={(e) => {
                      const selected = editais.find(ed => ed.id === e.target.value)
                      setEvaluatingEdital(selected || null)
                    }}
                    className="w-full rounded-lg border border-border/80 bg-background/50 px-3 py-2 text-xs outline-none focus:border-foreground"
                  >
                    <option value="">Selecione um edital...</option>
                    {editais.filter(canManageSpecificEdital).map(ed => (
                      <option key={ed.id} value={ed.id}>
                        {ed.title} ({ed.subscribers.length} candidato{ed.subscribers.length !== 1 ? 's' : ''})
                      </option>
                    ))}
                  </select>
                </div>

                {!evaluatingEdital ? (
                  <div className="rounded-lg bg-secondary/15 p-4 border border-dashed border-border text-center text-xs text-muted-foreground">
                    Selecione um edital acima ou clique no botão &ldquo;Avaliar Candidatos&rdquo; em um dos cards do mural para iniciar a avaliação.
                  </div>
                ) : (
                  <>
                    <div className="text-[11px] text-muted-foreground leading-relaxed bg-secondary/25 border border-border/50 rounded-lg p-3">
                      As inscrições ocorrem pelo site e formulário. Utilize o controle abaixo para registrar as notas finais e o resultado de cada candidato.
                    </div>

                    {evaluatingEdital.subscribers.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic text-center py-4">
                        Nenhum candidato inscrito para avaliar neste edital.
                      </p>
                    ) : (
                      <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1 divide-y divide-border/40">
                        {evaluatingEdital.subscribers.map((sub, idx) => {
                          const input = evaluationInputs[sub.userId] || { status: '', nota: '' }
                          const statusMsg = evaluationStatusText[sub.userId]

                          return (
                            <div key={sub.userId} className={`pt-4 ${idx === 0 ? 'pt-0 border-t-0' : 'border-t border-border/40'} space-y-3`}>
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-xs text-foreground pr-10 truncate" title={sub.qra || sub.username}>
                                  {sub.qra || sub.username}
                                </span>
                                
                                {statusMsg && (
                                  <span className={`text-[10px] font-semibold ${
                                    statusMsg.includes('Erro') ? 'text-red-400' : 'text-emerald-400 font-bold'
                                  }`}>
                                    {statusMsg}
                                  </span>
                                )}
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-[9px] font-bold text-muted-foreground uppercase">Resultado</label>
                                  <select
                                    value={input.status}
                                    onChange={(e) => {
                                      setEvaluationInputs(prev => ({
                                        ...prev,
                                        [sub.userId]: { ...prev[sub.userId], status: e.target.value as any }
                                      }))
                                    }}
                                    className="mt-1 w-full rounded border border-border/80 bg-background/50 px-2 py-1.5 text-xs outline-none focus:border-foreground"
                                  >
                                    <option value="">Definir...</option>
                                    <option value="Aprovado">Aprovado</option>
                                    <option value="Reprovado">Reprovado</option>
                                  </select>
                                </div>

                                <div>
                                  <label className="block text-[9px] font-bold text-muted-foreground uppercase">Nota Final (0-10)</label>
                                  <div className="flex gap-1.5 mt-1">
                                    <input
                                      type="text"
                                      placeholder="Ex: 8.5"
                                      value={input.nota}
                                      onChange={(e) => {
                                        setEvaluationInputs(prev => ({
                                          ...prev,
                                          [sub.userId]: { ...prev[sub.userId], nota: e.target.value }
                                        }))
                                      }}
                                      className="w-full rounded border border-border/80 bg-background/50 px-2 py-1.5 text-xs font-mono outline-none focus:border-foreground"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleSaveEvaluation(evaluatingEdital.id, sub.userId)}
                                      className="rounded bg-primary text-primary-foreground hover:bg-primary/95 text-xs px-2 font-bold cursor-pointer transition-all"
                                    >
                                      Salvar
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

          </div>
        )}

      </div>
    </main>
  )
}
