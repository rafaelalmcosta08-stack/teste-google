'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence } from 'motion/react'
import {
  Megaphone,
  Clock,
  Edit,
  Trash2,
  CheckCircle2,
  X,
  GraduationCap,
  FileText,
  Check,
  AlertCircle,
  Calendar,
  ArrowRight,
  User,
  ExternalLink,
  Plus,
} from 'lucide-react'

interface Aviso {
  id: string
  title: string
  content: string
  creatorId: string
  creatorQra: string
  createdAt: string
  readBy: string[]
}

interface Course {
  id: string
  title: string
  description: string
  requirements?: string
  startDate: string
  endDate: string
  vagasLimit: number
  creatorId: string
  creatorQra: string
  createdAt: string
  subscribers: Array<{ userId: string; qra: string; username: string }>
}

interface Edital {
  id: string
  title: string
  description?: string
  requirements?: string
  unidade: string
  endDate: string
  creatorId: string
  creatorQra: string
}

type FeedItem = {
  id: string
  type: 'curso' | 'edital'
  title: string
  description?: string
  requirements?: string
  relevantDate: string
  sortDate: string
  badgeText: string
  unidade?: string
}

export default function PainelPage() {
  const { user, profile, session } = useAuth()
  const router = useRouter()

  const [avisos, setAvisos] = useState<Aviso[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [editais, setEditais] = useState<Edital[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [brasiliaTime, setBrasiliaTime] = useState<string>('')

  // Expand / Read state
  const [expandedAvisoIds, setExpandedAvisoIds] = useState<Set<string>>(new Set())

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  const isAltoComando = profile?.cargo?.includes('Alto Comando') || profile?.role === 'admin'

  const getBrasiliaTimeStr = () => {
    const now = new Date()
    const formatter = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
    return formatter.format(now).replace(' ', 'T')
  }

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

  // Fetch all data
  const fetchData = async () => {
    try {
      const [resAvisos, resCursos, resEditais] = await Promise.all([
        fetch('/api/avisos'),
        fetch('/api/cursos'),
        fetch('/api/editais'),
      ])

      const dTime = getBrasiliaTimeStr()
      setBrasiliaTime(dTime)

      if (resAvisos.ok) {
        const data = await resAvisos.json()
        setAvisos(data.avisos || [])
      }

      if (resCursos.ok) {
        const data = await resCursos.json()
        setCourses(data.courses || [])
      }

      if (resEditais.ok) {
        const data = await resEditais.json()
        setEditais(data.editais || [])
      }
    } catch (err: any) {
      setError('Falha ao atualizar dados em tempo real.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()

    // Update time and refresh open filters periodically
    const interval = setInterval(() => {
      setBrasiliaTime(getBrasiliaTimeStr())
    }, 10000)

    return () => clearInterval(interval)
  }, [])

  // SSE Real-time Synchronization
  useEffect(() => {
    const handleSse = (e: Event) => {
      const { detail } = e as CustomEvent
      if (
        detail &&
        (detail.event === 'avisos-updated' ||
          detail.event === 'cursos-updated' ||
          detail.event === 'editais-updated')
      ) {
        fetchData()
      }
    }
    window.addEventListener('sse-event', handleSse)
    return () => window.removeEventListener('sse-event', handleSse)
  }, [])

  // Process Cursos and Editais feed
  const currentT = brasiliaTime || getBrasiliaTimeStr()
  
  // Filter and build unified Cursos and Editais feed
  const activeCoursesFeed: FeedItem[] = courses
    .filter((c) => c.endDate >= currentT)
    .map((c) => ({
      id: c.id,
      type: 'curso',
      title: c.title,
      description: c.description,
      requirements: c.requirements,
      relevantDate: `Início: ${formatDateTime(c.startDate)}`,
      sortDate: c.startDate,
      badgeText: 'Curso',
    }))

  const activeEditaisFeed: FeedItem[] = editais
    .filter((e) => e.endDate >= currentT)
    .map((e) => ({
      id: e.id,
      type: 'edital',
      title: e.title,
      description: e.description,
      requirements: e.requirements,
      relevantDate: `Prazo final: ${formatDateTime(e.endDate)}`,
      sortDate: e.endDate,
      badgeText: 'Edital',
      unidade: e.unidade,
    }))

  // Order by earliest date (closest deadline or start date first)
  const unifiedFeed = [...activeCoursesFeed, ...activeEditaisFeed].sort((a, b) =>
    a.sortDate.localeCompare(b.sortDate)
  )

  // Toggle expand / mark as read
  const handleToggleExpand = async (aviso: Aviso) => {
    const nextSet = new Set(expandedAvisoIds)
    const isNowExpanded = !nextSet.has(aviso.id)

    if (isNowExpanded) {
      nextSet.add(aviso.id)
      setExpandedAvisoIds(nextSet)

      // Mark as read if user is logged in and not already in readBy
      if (user && !aviso.readBy.includes(user.id)) {
        // Optimistic local state update
        setAvisos((prev) =>
          prev.map((a) =>
            a.id === aviso.id ? { ...a, readBy: [...a.readBy, user.id] } : a
          )
        )

        try {
          await fetch('/api/avisos', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session?.access_token || ''}`,
            },
            body: JSON.stringify({
              action: 'mark-read',
              id: aviso.id,
            }),
          })
        } catch (err) {
          console.error('Falha ao salvar marcação de lido:', err)
        }
      }
    } else {
      nextSet.delete(aviso.id)
      setExpandedAvisoIds(nextSet)
    }
  }

  // Delete Announcement
  const handleDeleteAviso = async (id: string) => {
    if (!confirm('Tem certeza de que deseja excluir este aviso permanentemente?')) return

    try {
      const res = await fetch('/api/avisos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({
          action: 'delete',
          id,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        alert(data.error || 'Erro ao excluir o aviso.')
      } else {
        setAvisos((prev) => prev.filter((a) => a.id !== id))
      }
    } catch (err) {
      alert('Erro na requisição para excluir o aviso.')
    }
  }

  // Open inline edit
  const handleStartEdit = (aviso: Aviso) => {
    setEditingId(aviso.id)
    setEditTitle(aviso.title)
    setEditContent(aviso.content)
    setEditError(null)
  }

  // Save edit
  const handleSaveEdit = async (e: React.FormEvent, id: string) => {
    e.preventDefault()
    if (!editTitle.trim() || !editContent.trim()) {
      setEditError('Título e conteúdo não podem estar vazios.')
      return
    }

    setEditSubmitting(true)
    setEditError(null)

    try {
      const res = await fetch('/api/avisos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({
          action: 'edit',
          id,
          title: editTitle.trim(),
          content: editContent.trim(),
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao salvar alterações.')
      }

      setAvisos((prev) =>
        prev.map((a) => (a.id === id ? { ...a, title: editTitle.trim(), content: editContent.trim() } : a))
      )
      setEditingId(null)
    } catch (err: any) {
      setEditError(err.message || 'Erro de rede.')
    } finally {
      setEditSubmitting(false)
    }
  }

  return (
    <main className="mx-auto max-w-[1600px] px-6 pb-24 pt-28 sm:px-10 lg:px-16">
      {/* Header */}
      <div className="relative text-left mb-10 border-b border-border/10 pb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Painel do Oficial
          </h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-xl flex items-center flex-wrap gap-1">
            <span>Bem-vindo,</span>
            <span className="font-bold text-foreground">
              {profile?.patente ? `${profile.patente} ` : ''}
              {profile?.qra ? profile.qra : (profile?.username || 'Oficial')}
            </span>
            {profile?.game_id && (
              <span className="rounded bg-indigo-500/15 px-1.5 py-0.5 text-[10px] font-mono font-bold text-indigo-400">
                ID: {profile.game_id}
              </span>
            )}
            <span>. Central de comunicados táticos, cursos em aberto e editais vigentes.</span>
          </p>
        </div>
        {isAltoComando && (
          <Button
            onClick={() => router.push('/painel/publicar-aviso')}
            className="h-10 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/95 shadow-md flex items-center gap-1.5 rounded-xl shrink-0"
          >
            <Plus className="h-4 w-4" />
            Publicar Aviso
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-xs text-muted-foreground">Sincronizando sistemas...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Avisos Gerais (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="flex items-center gap-2 border-b border-border/20 pb-3">
              <Megaphone className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                Avisos Gerais
              </h2>
              <span className="ml-auto rounded-full bg-secondary/80 px-2.5 py-0.5 text-xs font-bold text-muted-foreground font-mono">
                {avisos.length}
              </span>
            </div>

            {avisos.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/60 bg-card/20 p-12 text-center text-muted-foreground">
                <Megaphone className="mx-auto h-8 w-8 text-muted-foreground/40 mb-3" />
                <p className="text-sm font-medium">Nenhum aviso institucional publicado até o momento.</p>
                <p className="text-xs text-muted-foreground/80 mt-1">Todos os comunicados do Alto Comando aparecerão aqui.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {avisos.map((aviso) => {
                  const isExpanded = expandedAvisoIds.has(aviso.id)
                  const isEditing = editingId === aviso.id
                  const userHasRead = user && aviso.readBy.includes(user.id)
                  const canManage = isAltoComando || aviso.creatorId === user?.id

                  // Excerpt for summary view
                  const excerpt = aviso.content.length > 160
                    ? `${aviso.content.substring(0, 160).trim()}...`
                    : aviso.content

                  return (
                    <motion.div
                      layout
                      key={aviso.id}
                      className={`group rounded-xl border p-5 sm:p-6 transition-all duration-300 backdrop-blur-sm shadow-sm ${
                        !userHasRead
                          ? 'border-primary/40 bg-primary/[0.02] ring-1 ring-primary/10'
                          : 'border-border/60 bg-card/40 hover:bg-card/60'
                      }`}
                    >
                      {isEditing ? (
                        <form onSubmit={(e) => handleSaveEdit(e, aviso.id)} className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-primary flex items-center gap-1.5">
                              <Edit className="h-4 w-4" /> Editar Comunicado
                            </h3>
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>

                          {editError && (
                            <div className="flex items-start gap-2 p-3 rounded bg-red-500/10 border border-red-500/15 text-xs text-red-400">
                              <AlertCircle className="h-4 w-4 shrink-0" />
                              <span>{editError}</span>
                            </div>
                          )}

                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-muted-foreground">Título</label>
                            <input
                              type="text"
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              disabled={editSubmitting}
                              className="w-full px-3 py-2 text-sm bg-secondary/30 rounded-lg border border-border/60 text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-muted-foreground">Conteúdo</label>
                            <textarea
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              disabled={editSubmitting}
                              className="w-full min-h-[150px] px-3 py-2 text-sm bg-secondary/30 rounded-lg border border-border/60 text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 resize-y"
                            />
                          </div>

                          <div className="flex gap-2 justify-end pt-1">
                            <Button
                              type="button"
                              onClick={() => setEditingId(null)}
                              disabled={editSubmitting}
                              variant="outline"
                              className="h-9 text-xs rounded-lg border-border/60"
                            >
                              Cancelar
                            </Button>
                            <Button
                              type="submit"
                              disabled={editSubmitting}
                              className="h-9 text-xs bg-primary text-primary-foreground hover:bg-primary/95 rounded-lg"
                            >
                              {editSubmitting ? 'Salvando...' : 'Salvar Alterações'}
                            </Button>
                          </div>
                        </form>
                      ) : (
                        <div className="space-y-3">
                          {/* Top Badges & Publisher */}
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/10 pb-3">
                            <div className="flex items-center gap-2">
                              {!userHasRead ? (
                                <span className="inline-flex items-center rounded-full bg-rose-500 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-white animate-pulse">
                                  Não Lido
                                </span>
                              ) : (
                                <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-[9px] font-semibold text-muted-foreground uppercase">
                                  Lido
                                </span>
                              )}
                              <span className="text-[11px] font-mono text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5 text-muted-foreground/60" />
                                {formatDateTime(aviso.createdAt)}
                              </span>
                            </div>

                            <div className="flex items-center gap-1 text-[11px] font-medium text-foreground/80 bg-secondary/30 border border-border/40 px-2.5 py-0.5 rounded-lg">
                              <User className="h-3 w-3 text-muted-foreground" />
                              <span>Por: <strong className="text-foreground">{aviso.creatorQra}</strong></span>
                            </div>
                          </div>

                          {/* Title and Content */}
                          <div>
                            <h3 className="text-base font-bold text-foreground">
                              {aviso.title}
                            </h3>
                            <p className="mt-2 text-sm text-muted-foreground/90 whitespace-pre-wrap leading-relaxed">
                              {isExpanded ? aviso.content : excerpt}
                            </p>
                          </div>

                          {/* Action Bar */}
                          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/10 mt-1">
                            <button
                              onClick={() => handleToggleExpand(aviso)}
                              className="text-xs font-bold text-primary hover:underline flex items-center gap-1 p-1"
                            >
                              {isExpanded ? 'Ver menos' : 'Ler mais'}
                              <ArrowRight className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                            </button>

                            {canManage && (
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => handleStartEdit(aviso)}
                                  className="p-1.5 rounded-lg border border-border/40 hover:bg-secondary text-muted-foreground hover:text-primary transition-all"
                                  title="Editar"
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteAviso(aviso.id)}
                                  className="p-1.5 rounded-lg border border-border/40 hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-all"
                                  title="Excluir"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Right Column: Cursos e Editais (5 cols) */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-28">
            <div className="flex items-center gap-2 border-b border-border/20 pb-3">
              <GraduationCap className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                Inscrições Abertas
              </h2>
              <span className="ml-auto rounded-full bg-secondary/80 px-2.5 py-0.5 text-xs font-bold text-muted-foreground font-mono">
                {unifiedFeed.length}
              </span>
            </div>

            {unifiedFeed.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/60 bg-card/20 p-8 text-center text-muted-foreground">
                <FileText className="mx-auto h-7 w-7 text-muted-foreground/40 mb-2" />
                <p className="text-xs font-medium">Nenhum curso marcado ou edital aberto no momento.</p>
                <p className="text-[11px] text-muted-foreground/80 mt-1">Surgirão novos itens conforme publicações das divisões.</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[640px] overflow-y-auto pr-1">
                {unifiedFeed.map((item) => {
                  const isCurso = item.type === 'curso'
                  return (
                    <div
                      key={`${item.type}-${item.id}`}
                      className="flex flex-col justify-between p-4 rounded-xl border border-border/50 bg-card/40 backdrop-blur-sm hover:bg-card/60 hover:border-border/80 transition-all shadow-sm group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`rounded px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider border ${
                                isCurso
                                  ? 'bg-violet-500/10 text-violet-400 border-violet-500/20'
                                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              }`}
                            >
                              {item.badgeText}
                            </span>
                            {!isCurso && item.unidade && (
                              <span className="rounded bg-secondary/60 border border-border/40 px-1.5 py-0.5 text-[9px] font-mono text-muted-foreground uppercase">
                                {item.unidade}
                              </span>
                            )}
                          </div>

                          <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors truncate" title={item.title}>
                            {item.title}
                          </h3>
                        </div>

                        <div className="text-[11px] font-semibold text-muted-foreground font-mono flex items-center gap-1 bg-secondary/20 px-2 py-0.5 rounded border border-border/25">
                          <Calendar className="h-3 w-3 shrink-0" />
                          <span>{item.relevantDate}</span>
                        </div>
                      </div>

                      {/* Description & Requirements Display */}
                      <div className="mt-3.5 space-y-3 text-xs text-muted-foreground/90 border-t border-border/10 pt-3">
                        <div>
                          <span className="text-[9px] font-bold text-foreground/60 uppercase tracking-wider block mb-0.5">Descrição:</span>
                          <p className="line-clamp-2 text-[11px] leading-relaxed text-foreground/80">
                            {item.description || 'Nenhuma descrição detalhada informada.'}
                          </p>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-foreground/60 uppercase tracking-wider block mb-0.5">Requisitos:</span>
                          <p className="line-clamp-2 text-[11px] leading-relaxed text-foreground/80">
                            {item.requirements || 'Nenhum requisito específico informado.'}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-border/10 flex justify-end">
                        <Button
                          onClick={() => {
                            if (isCurso) {
                              router.push(`/painel/cursos?focus=${item.id}`)
                            } else {
                              router.push(`/painel/editais?focus=${item.id}`)
                            }
                          }}
                          className={`h-8 px-3 text-[11px] font-bold flex items-center gap-1 rounded-lg shadow-sm border ${
                            isCurso
                              ? 'bg-violet-600 hover:bg-violet-500 text-white border-violet-600/30'
                              : 'bg-amber-600 hover:bg-amber-500 text-white border-amber-600/30'
                          }`}
                        >
                          {isCurso ? 'Fazer Curso' : 'Fazer Edital'}
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

        </div>
      )}
    </main>
  )
}
