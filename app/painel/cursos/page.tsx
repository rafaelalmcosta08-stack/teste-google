'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { motion, AnimatePresence } from 'motion/react'
import {
  GraduationCap,
  Plus,
  Calendar,
  Clock,
  Users,
  CheckCircle,
  Eye,
  EyeOff,
  Trash2,
  Edit,
  AlertTriangle,
  X,
  FileText,
  BookmarkCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

// Course Interface
interface Course {
  id: string
  title: string
  description: string
  startDate: string
  endDate: string
  vagasLimit: number
  creatorId: string
  creatorQra: string
  createdAt: string
  subscribers: Array<{
    userId: string
    qra: string
    username: string
    subscribedAt: string
  }>
  readBy: string[]
}

export default function CursosPage() {
  const { user, profile, session } = useAuth()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Form State
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [vagasLimit, setVagasLimit] = useState('20')
  const [submitting, setSubmitting] = useState(false)
  const [formSuccess, setFormSuccess] = useState(false)

  // Editing State
  const [editingCourse, setEditingCourse] = useState<Course | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editStartDate, setEditStartDate] = useState('')
  const [editEndDate, setEditEndDate] = useState('')
  const [editVagasLimit, setEditVagasLimit] = useState('')

  // Expanded Cards (Ler mais)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  // Current Brasília Time tracking state to keep status badges updated dynamically
  const [brasiliaTime, setBrasiliaTime] = useState<string>('')

  // Check Permissions
  const myCargos = profile?.cargo ?? []
  const isSiteAdmin = profile?.role === 'admin'
  const isAuthorizedToPublish =
    isSiteAdmin ||
    myCargos.includes('Diretor APM') ||
    myCargos.includes('Supervisor APM') ||
    myCargos.includes('Alto Comando')

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

  // Fetch Courses
  const fetchCourses = async () => {
    try {
      const res = await fetch('/api/cursos')
      if (!res.ok) throw new Error('Falha ao buscar cursos')
      const data = await res.json()
      setCourses(data.courses || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCourses()

    // Listen to real-time events via SSE
    const handleRealtimeEvent = (e: Event) => {
      const { detail } = e as CustomEvent
      if (detail && detail.event === 'cursos-updated') {
        fetchCourses()
      }
    }

    window.addEventListener('sse-event', handleRealtimeEvent)
    return () => {
      window.removeEventListener('sse-event', handleRealtimeEvent)
    }
  }, [])

  // Publish a new Course
  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isAuthorizedToPublish) return

    setSubmitting(true)
    setError(null)
    setFormSuccess(false)

    try {
      const res = await fetch('/api/cursos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          action: 'create',
          title,
          description,
          startDate,
          endDate,
          vagasLimit,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao publicar curso.')

      // Reset Form
      setTitle('')
      setDescription('')
      setStartDate('')
      setEndDate('')
      setVagasLimit('20')
      setFormSuccess(true)
      fetchCourses()

      // Reset success banner after 4 seconds
      setTimeout(() => setFormSuccess(false), 4000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // Save changes on an edited Course
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingCourse) return

    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/cursos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          action: 'edit',
          id: editingCourse.id,
          title: editTitle,
          description: editDescription,
          startDate: editStartDate,
          endDate: editEndDate,
          vagasLimit: editVagasLimit,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar alterações.')

      setEditingCourse(null)
      fetchCourses()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // Delete/Cancel a Course
  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir/cancelar este curso? Todas as inscrições associadas serão perdidas.')) return

    try {
      const res = await fetch('/api/cursos', {
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
      if (!res.ok) throw new Error(data.error || 'Erro ao excluir curso.')

      fetchCourses()
    } catch (err: any) {
      alert(err.message)
    }
  }

  // Subscribe to a Course
  const handleSubscribe = async (id: string) => {
    try {
      const res = await fetch('/api/cursos', {
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
      if (!res.ok) throw new Error(data.error || 'Erro ao inscrever-se.')

      fetchCourses()
    } catch (err: any) {
      alert(err.message)
    }
  }

  // Unsubscribe from a Course
  const handleUnsubscribe = async (id: string) => {
    if (!confirm('Deseja realmente cancelar sua inscrição neste curso?')) return

    try {
      const res = await fetch('/api/cursos', {
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
      if (!res.ok) throw new Error(data.error || 'Erro ao cancelar inscrição.')

      fetchCourses()
    } catch (err: any) {
      alert(err.message)
    }
  }

  // Toggle Read status (called when expanded / "Ler mais")
  const handleToggleExpand = async (course: Course) => {
    const isExpanded = expandedIds.has(course.id)
    const newExpanded = new Set(expandedIds)

    if (isExpanded) {
      newExpanded.delete(course.id)
    } else {
      newExpanded.add(course.id)

      // Se ainda não leu, marca como lido no backend
      if (user && !course.readBy.includes(user.id)) {
        try {
          await fetch('/api/cursos', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session?.access_token}`,
            },
            body: JSON.stringify({
              action: 'mark-read',
              id: course.id,
            }),
          })
          // Local update to save a roundtrip
          setCourses(prev =>
            prev.map(c =>
              c.id === course.id
                ? { ...c, readBy: [...c.readBy, user.id!] }
                : c
            )
          )
        } catch (err) {
          console.error('Falha ao marcar como lido:', err)
        }
      }
    }
    setExpandedIds(newExpanded)
  }

  // Setup Edit form with selected Course values
  const startEditing = (course: Course) => {
    setEditingCourse(course)
    setEditTitle(course.title)
    setEditDescription(course.description)
    setEditStartDate(course.startDate)
    setEditEndDate(course.endDate)
    setEditVagasLimit(course.vagasLimit.toString())
  }

  // Split courses into Cursos Marcados and Cursos Feitos
  // Marcados: endTime is in the future
  // Feitos: endTime is in the past
  const currentT = brasiliaTime || getBrasiliaTimeStr()
  const cursosMarcados = courses.filter(c => c.endDate >= currentT)
  const cursosFeitos = courses.filter(c => c.endDate < currentT)

  // Status computation for "Cursos Marcados"
  const getCourseStatus = (course: Course) => {
    const start = course.startDate
    const end = course.endDate
    const now = currentT

    if (now > end) {
      return { text: 'Finalizado', color: 'bg-gray-500/10 text-gray-400 border-gray-500/20' }
    }
    if (now >= start && now <= end) {
      return { text: 'Em Andamento', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 animate-pulse' }
    }

    // Calcular diferença de minutos entre início e agora
    try {
      const startDateObj = new Date(start)
      const nowObj = new Date(now)
      const diffMs = startDateObj.getTime() - nowObj.getTime()
      const diffMin = diffMs / (1000 * 60)

      if (diffMin <= 10 && diffMin > 0) {
        return { text: 'Começando em breve', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' }
      }
    } catch {}

    return { text: 'Agendado', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' }
  }

  return (
    <main className="mx-auto max-w-[1600px] px-6 pb-24 pt-16 sm:px-10 lg:px-16">
      {/* Title Header */}
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
          <GraduationCap className="h-7 w-7 text-foreground" />
        </div>
        <h1 id="cursos-titulo" className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl">
          Capacitação & Cursos
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-pretty leading-relaxed text-muted-foreground">
          Participe de instruções oficiais da Academia da Polícia Militar (APM) para aprimorar suas competências técnicas e operacionais.
        </p>
      </div>

      {/* Main Error Banner */}
      {error && (
        <div className="mx-auto mt-8 max-w-5xl rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-center text-sm text-red-400 backdrop-blur-sm">
          <AlertTriangle className="mr-2 inline h-4 w-4" />
          {error}
        </div>
      )}

      {/* Edit Modal (Dialog) */}
      <AnimatePresence>
        {editingCourse && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-2xl overflow-hidden rounded-xl border border-border bg-card p-6 shadow-xl"
            >
              <button
                onClick={() => setEditingCourse(null)}
                className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-3 border-b border-border/60 pb-4">
                <Edit className="h-5 w-5 text-muted-foreground" />
                <h3 className="text-xl font-semibold">Editar Curso</h3>
              </div>

              <form onSubmit={handleSaveEdit} className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground">Nome do Curso</label>
                  <input
                    type="text"
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-border/80 bg-background/50 px-3.5 py-2.5 text-sm outline-none focus:border-foreground"
                    placeholder="Ex: Instrução de Patrulhamento Especializado"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground">O que vai ser / Descrição</label>
                  <textarea
                    required
                    rows={4}
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-border/80 bg-background/50 px-3.5 py-2.5 text-sm outline-none focus:border-foreground resize-none"
                    placeholder="Detalhes completos sobre o curso, conteúdo programático, locais e regras gerais."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground">Data/Hora Início</label>
                    <input
                      type="datetime-local"
                      required
                      value={editStartDate}
                      onChange={(e) => setEditStartDate(e.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-border/80 bg-background/50 px-3.5 py-2.5 text-sm outline-none focus:border-foreground"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-muted-foreground">Data/Hora Término</label>
                    <input
                      type="datetime-local"
                      required
                      value={editEndDate}
                      onChange={(e) => setEditEndDate(e.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-border/80 bg-background/50 px-3.5 py-2.5 text-sm outline-none focus:border-foreground"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-muted-foreground">Limite de Vagas (1 a 99)</label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={99}
                      value={editVagasLimit}
                      onChange={(e) => setEditVagasLimit(e.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-border/80 bg-background/50 px-3.5 py-2.5 text-sm outline-none focus:border-foreground"
                    />
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3 border-t border-border/60 pt-4">
                  <button
                    type="button"
                    onClick={() => setEditingCourse(null)}
                    className="rounded-lg bg-secondary px-4 py-2.5 text-sm font-semibold hover:bg-secondary/80 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-lg bg-foreground px-4 py-2.5 text-sm font-semibold text-background hover:bg-foreground/90 transition-all disabled:opacity-50"
                  >
                    {submitting ? 'Salvando...' : 'Salvar Alterações'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Split Screen Grid */}
      <div className="mt-16 grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left Column: Course Announcements Mural */}
        <div className={`space-y-12 lg:col-span-2`}>
          {loading ? (
            <div className="rounded-xl border border-border/60 bg-card/60 p-12 text-center backdrop-blur-sm">
              <p className="text-sm text-muted-foreground">Buscando cursos do servidor...</p>
            </div>
          ) : (
            <>
              {/* SECTION 1: Cursos Marcados */}
              <div className="space-y-6">
                <div className="flex items-center gap-2.5 border-b border-border/60 pb-3">
                  <BookmarkCheck className="h-5 w-5 text-muted-foreground" />
                  <h2 className="text-xl font-semibold tracking-tight">Cursos Marcados</h2>
                  <span className="ml-auto rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                    {cursosMarcados.length}
                  </span>
                </div>

                {cursosMarcados.length === 0 ? (
                  <div className="rounded-xl border border-border/40 bg-card/40 p-8 text-center">
                    <p className="text-sm text-muted-foreground">Não há cursos agendados ou em andamento no momento.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cursosMarcados.map((course) => {
                      const isExpanded = expandedIds.has(course.id)
                      const isSubscribed = user && course.subscribers.some((s) => s.userId === user.id)
                      const totalSubscribed = course.subscribers.length
                      const isVagasFull = totalSubscribed >= course.vagasLimit
                      const isCourseStarted = course.startDate <= currentT
                      const status = getCourseStatus(course)
                      const userHasRead = user && course.readBy.includes(user.id)

                      return (
                        <motion.div
                          layout
                          key={course.id}
                          className={`group rounded-xl border p-6 transition-all duration-300 backdrop-blur-sm shadow-sm ${
                            isSubscribed
                              ? 'border-emerald-500/30 bg-emerald-500/[0.02]'
                              : 'border-border/60 bg-card/60 hover:bg-card/80'
                          }`}
                        >
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            {/* Read/Unread badge + Title */}
                            <div className="space-y-1.5 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                {/* Read / Unread */}
                                {!userHasRead ? (
                                  <span className="inline-flex items-center rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white animate-pulse">
                                    Não lida
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center rounded-full bg-secondary/80 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                                    Lida
                                  </span>
                                )}

                                {/* Status Badge */}
                                <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${status.color}`}>
                                  {status.text}
                                </span>

                                {/* Subscribed Badge */}
                                {isSubscribed && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                                    <CheckCircle className="h-3.5 w-3.5" />
                                    Você está inscrito
                                  </span>
                                )}
                              </div>

                              <h3 className="text-lg font-bold tracking-tight text-foreground transition-colors group-hover:text-primary">
                                {course.title}
                              </h3>

                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3.5 w-3.5" />
                                  Início: {formatDateTime(course.startDate)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3.5 w-3.5" />
                                  Término: {formatDateTime(course.endDate)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Users className="h-3.5 w-3.5" />
                                  {totalSubscribed} / {course.vagasLimit} vagas
                                </span>
                              </div>
                            </div>

                            {/* Actions or Subscribe/Unsubscribe Buttons */}
                            <div className="flex flex-wrap items-center gap-2 sm:self-start">
                              {/* Edit/Delete for authorized users or course creator */}
                              {(isAuthorizedToPublish || (user && course.creatorId === user.id)) && (
                                <div className="flex items-center gap-1 mr-2 border-r border-border/60 pr-2">
                                  <button
                                    onClick={() => startEditing(course)}
                                    title="Editar curso"
                                    className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(course.id)}
                                    title="Excluir curso"
                                    className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-rose-400 transition-colors"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              )}

                              {/* Subscription CTA */}
                              {!isCourseStarted ? (
                                isSubscribed ? (
                                  <button
                                    onClick={() => handleUnsubscribe(course.id)}
                                    className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition-all cursor-pointer"
                                  >
                                    Cancelar Inscrição
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleSubscribe(course.id)}
                                    disabled={isVagasFull}
                                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                                      isVagasFull
                                        ? 'bg-secondary/40 text-muted-foreground border border-transparent cursor-not-allowed'
                                        : 'bg-foreground text-background hover:bg-foreground/90'
                                    }`}
                                  >
                                    {isVagasFull ? 'Vagas Esgotadas' : 'Inscrever-se'}
                                  </button>
                                )
                              ) : (
                                <span className="text-[11px] font-semibold text-muted-foreground border border-border/40 rounded px-2.5 py-1 bg-secondary/25">
                                  Inscrições encerradas
                                </span>
                              )}
                            </div>
                          </div>

                          {/* "Ler mais" expanded block */}
                          <div className="mt-4 border-t border-border/40 pt-4">
                            <button
                              onClick={() => handleToggleExpand(course)}
                              className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                            >
                              {isExpanded ? (
                                <>
                                  Ocultar detalhes
                                  <ChevronUp className="h-3.5 w-3.5" />
                                </>
                              ) : (
                                <>
                                  Ler mais & detalhes
                                  <ChevronDown className="h-3.5 w-3.5" />
                                </>
                              )}
                            </button>

                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  className="overflow-hidden"
                                >
                                  <div className="mt-4 space-y-4 rounded-lg bg-secondary/20 p-4 text-sm text-muted-foreground border border-border/30">
                                    <div className="space-y-1.5 whitespace-pre-wrap leading-relaxed text-foreground/90">
                                      {course.description}
                                    </div>

                                    {/* Subscribers list section */}
                                    <div className="border-t border-border/40 pt-4 mt-4">
                                      <h4 className="font-semibold text-foreground flex items-center gap-1.5 text-xs mb-2.5">
                                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                                        Oficiais Inscritos ({totalSubscribed} / {course.vagasLimit})
                                      </h4>

                                      {course.subscribers.length === 0 ? (
                                        <p className="text-xs text-muted-foreground/80 italic">Nenhum oficial inscrito ainda.</p>
                                      ) : (
                                        <div className="flex flex-wrap gap-2">
                                          {course.subscribers.map((subscriber) => (
                                            <span
                                              key={subscriber.userId}
                                              className="inline-flex items-center rounded-md border border-border bg-card px-2.5 py-1 text-xs font-semibold text-foreground/85 shadow-sm"
                                            >
                                              {subscriber.qra}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                    </div>

                                    <div className="flex justify-between items-center text-[10px] text-muted-foreground/60 pt-2 border-t border-border/20">
                                      <span>Publicado por: {course.creatorQra}</span>
                                      <span>ID do Curso: {course.id}</span>
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* SECTION 2: Cursos Feitos */}
              <div className="space-y-6 pt-6">
                <div className="flex items-center gap-2.5 border-b border-border/60 pb-3">
                  <CheckCircle className="h-5 w-5 text-muted-foreground" />
                  <h2 className="text-xl font-semibold tracking-tight text-muted-foreground">Cursos Feitos (Histórico)</h2>
                  <span className="ml-auto rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                    {cursosFeitos.length}
                  </span>
                </div>

                {cursosFeitos.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border/40 p-8 text-center">
                    <p className="text-sm text-muted-foreground">Não há registros de cursos passados/finalizados.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cursosFeitos.map((course) => {
                      const isExpanded = expandedIds.has(course.id)
                      const isSubscribed = user && course.subscribers.some((s) => s.userId === user.id)
                      const totalSubscribed = course.subscribers.length
                      const userHasRead = user && course.readBy.includes(user.id)

                      return (
                        <div
                          key={course.id}
                          className="rounded-xl border border-border/40 bg-card/40 p-5 opacity-75 hover:opacity-100 transition-opacity"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="space-y-1 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full border border-border/60 bg-secondary px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                                  Histórico
                                </span>
                                {isSubscribed && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-medium text-emerald-400">
                                    Participou
                                  </span>
                                )}
                              </div>

                              <h3 className="text-base font-bold text-muted-foreground">
                                {course.title}
                              </h3>

                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground/80">
                                <span>Início: {formatDateTime(course.startDate)}</span>
                                <span>Término: {formatDateTime(course.endDate)}</span>
                                <span>{totalSubscribed} participantes</span>
                              </div>
                            </div>

                            <button
                              onClick={() => handleToggleExpand(course)}
                              className="rounded-lg bg-secondary px-3 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-all cursor-pointer sm:self-start"
                            >
                              {isExpanded ? 'Recolher' : 'Visualizar'}
                            </button>
                          </div>

                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="mt-4 space-y-4 rounded-lg bg-secondary/15 p-4 text-xs text-muted-foreground border border-border/20">
                                  <div className="whitespace-pre-wrap leading-relaxed">
                                    {course.description}
                                  </div>

                                  {/* List of final participants */}
                                  <div className="border-t border-border/30 pt-3">
                                    <h4 className="font-semibold text-foreground mb-2 flex items-center gap-1">
                                      <Users className="h-3 w-3" />
                                      Quadro de Participantes ({totalSubscribed})
                                    </h4>

                                    {course.subscribers.length === 0 ? (
                                      <p className="italic text-muted-foreground/60">Sem inscrições gravadas para este curso.</p>
                                    ) : (
                                      <div className="flex flex-wrap gap-1.5">
                                        {course.subscribers.map((subscriber) => (
                                          <span
                                            key={subscriber.userId}
                                            className="rounded bg-card border border-border/60 px-2 py-0.5 font-medium text-muted-foreground"
                                          >
                                            {subscriber.qra}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>

                                  <div className="text-[10px] text-muted-foreground/40 pt-2 border-t border-border/10">
                                    Publicado por: {course.creatorQra}
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Right Column: Publication Form (APM Directors / Supervisors / Alto Comando) */}
        {isAuthorizedToPublish && (
          <div className="lg:col-span-1">
            <div className="sticky top-28 rounded-xl border border-border/60 bg-card/60 p-6 backdrop-blur-sm shadow-md space-y-6">
              <div className="flex items-center gap-2 border-b border-border/60 pb-4">
                <Plus className="h-5 w-5 text-foreground" />
                <h2 className="text-lg font-bold tracking-tight">Publicar Novo Curso</h2>
              </div>

              {formSuccess && (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-400 backdrop-blur-sm flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 shrink-0" />
                  <span>Curso publicado com sucesso e disponível no Mural!</span>
                </div>
              )}

              <form onSubmit={handlePublish} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Nome do Curso *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-border/80 bg-background/50 px-3 py-2 text-sm outline-none focus:border-foreground"
                    placeholder="Ex: Formação em Técnicas do BOPE"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    O que vai ser / Descrição *
                  </label>
                  <textarea
                    required
                    rows={5}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-border/80 bg-background/50 px-3 py-2 text-sm outline-none focus:border-foreground resize-none"
                    placeholder="Especifique os requisitos, localização, fardamento exigido, etapas e o conteúdo programático do curso."
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Início *
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-border/80 bg-background/50 px-3 py-2 text-sm outline-none focus:border-foreground"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Término *
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-border/80 bg-background/50 px-3 py-2 text-sm outline-none focus:border-foreground"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Limite de Vagas (1 a 99) *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={99}
                    value={vagasLimit}
                    onChange={(e) => setVagasLimit(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-border/80 bg-background/50 px-3 py-2 text-sm outline-none focus:border-foreground"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="mt-2 w-full rounded-lg bg-foreground py-2.5 text-sm font-bold text-background hover:bg-foreground/90 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Publicando...' : 'Publicar'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
