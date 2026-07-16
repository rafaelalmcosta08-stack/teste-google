'use client'

import React, { useState, useEffect, useRef } from 'react'
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
  Search,
  Award,
  Check,
  Percent,
  TrendingUp,
  UserCheck,
  BookOpen,
  ClipboardList,
  ChevronRight,
  History,
} from 'lucide-react'

// Course Interface
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
  instructorId?: string
  instructorQra?: string
  subscribers: Array<{
    userId: string
    qra: string
    username: string
    subscribedAt: string
  }>
  readBy: string[]
  evaluations?: Record<string, {
    status: 'Aprovado' | 'Reprovado'
    nota: number
    evaluatedBy: string
    evaluatedAt: string
  }>
}

export default function CursosPage() {
  const { user, profile, session } = useAuth()
  const [courses, setCourses] = useState<Course[]>([])
  const [editais, setEditais] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Form State
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [requirements, setRequirements] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [vagasLimit, setVagasLimit] = useState('20')
  const [instructorId, setInstructorId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formSuccess, setFormSuccess] = useState(false)

  // Editing State
  const [editingCourse, setEditingCourse] = useState<Course | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editRequirements, setEditRequirements] = useState('')
  const [editStartDate, setEditStartDate] = useState('')
  const [editEndDate, setEditEndDate] = useState('')
  const [editVagasLimit, setEditVagasLimit] = useState('')
  const [editInstructorId, setEditInstructorId] = useState('')

  // Expanded Cards (Ler mais)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  // Current Brasília Time tracking state to keep status badges updated dynamically
  const [brasiliaTime, setBrasiliaTime] = useState<string>('')

  // Unit filter preference state
  const [unitFilter, setUnitFilter] = useState<'Todos' | 'Minha Unidade'>('Todos')

  // Load preferred filter on mount
  useEffect(() => {
    const saved = localStorage.getItem('pref-unit-filter-cursos')
    if (saved === 'Minha Unidade') {
      setUnitFilter('Minha Unidade')
    }
  }, [])

  const handleFilterChange = (val: 'Todos' | 'Minha Unidade') => {
    setUnitFilter(val)
    localStorage.setItem('pref-unit-filter-cursos', val)
  }

  // --- NEW STATES FOR CUSTOM SIDEBAR ---
  const [sidebarTab, setSidebarTab] = useState<'stats' | 'evaluations' | 'officers' | 'instructors'>('stats')
  const [selectedCourseForEvaluation, setSelectedCourseForEvaluation] = useState<Course | null>(null)
  const [evaluationInputs, setEvaluationInputs] = useState<Record<string, { status: 'Aprovado' | 'Reprovado' | ''; nota: string }>>({})
  const [officersList, setOfficersList] = useState<any[]>([])
  const [officersLoading, setOfficersLoading] = useState(false)
  const [officersSearchQuery, setOfficersSearchQuery] = useState('')
  const [selectedOfficerForProfile, setSelectedOfficerForProfile] = useState<any | null>(null)
  const [evaluationStatusText, setEvaluationStatusText] = useState<Record<string, string>>({}) // userId -> status message
  const [instructorsSearchQuery, setInstructorsSearchQuery] = useState('')
  const [selectedInstructorForProfile, setSelectedInstructorForProfile] = useState<any | null>(null)

  const sidebarRef = useRef<HTMLDivElement>(null)

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

  // Focus and auto-expand from query parameter focusId
  useEffect(() => {
    if (typeof window !== 'undefined' && courses.length > 0) {
      const params = new URLSearchParams(window.location.search)
      const focusId = params.get('focus')
      if (focusId) {
        setExpandedIds(prev => {
          const next = new Set(prev)
          next.add(focusId)
          return next
        })
        setTimeout(() => {
          const el = document.getElementById(`course-card-${focusId}`)
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
  }, [courses])

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

  // Fetch all user profiles for "Ficha do Oficial"
  const fetchOfficers = async () => {
    if (!isAuthorizedToPublish || !session?.access_token) return
    setOfficersLoading(true)
    try {
      const res = await fetch('/api/admin/usuarios', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })
      if (res.ok) {
        const data = await res.json()
        setOfficersList(data.usuarios || [])
      }
    } catch (err) {
      console.error('Falha ao carregar oficiais:', err)
    } finally {
      setOfficersLoading(false)
    }
  }

  // Fetch Editais
  const fetchEditais = async () => {
    try {
      const res = await fetch('/api/editais')
      if (res.ok) {
        const data = await res.json()
        setEditais(data.editais || [])
      }
    } catch (err) {
      console.error('Falha ao buscar editais:', err)
    }
  }

  useEffect(() => {
    fetchCourses()
    fetchEditais()

    // Listen to real-time events via SSE
    const handleRealtimeEvent = (e: Event) => {
      const { detail } = e as CustomEvent
      if (detail && detail.event === 'cursos-updated') {
        fetchCourses()
      }
      if (detail && detail.event === 'editais-updated') {
        fetchEditais()
      }
    }

    window.addEventListener('sse-event', handleRealtimeEvent)
    return () => {
      window.removeEventListener('sse-event', handleRealtimeEvent)
    }
  }, [])

  // Load officers only if authorized
  useEffect(() => {
    if (isAuthorizedToPublish && session?.access_token) {
      fetchOfficers()
    }
  }, [isAuthorizedToPublish, session?.access_token])

  // Synchronize evaluation inputs when selectedCourseForEvaluation or courses list changes
  useEffect(() => {
    if (selectedCourseForEvaluation) {
      const latestCourse = courses.find(c => c.id === selectedCourseForEvaluation.id)
      if (latestCourse) {
        const inputs: Record<string, { status: 'Aprovado' | 'Reprovado' | ''; nota: string }> = {}
        latestCourse.subscribers.forEach(sub => {
          const saved = latestCourse.evaluations?.[sub.userId]
          inputs[sub.userId] = {
            status: saved?.status ?? '',
            nota: saved?.nota !== undefined ? saved.nota.toString() : '',
          }
        })
        setEvaluationInputs(inputs)
      }
    }
  }, [selectedCourseForEvaluation, courses])

  // Publish a new Course
  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isAuthorizedToPublish) return

    if (!instructorId) {
      setError('Por favor, selecione um Instrutor Responsável.')
      return
    }

    setSubmitting(true)
    setError(null)
    setFormSuccess(false)

    try {
      const chosenInstructor = activeInstructorsList.find(o => o.id === instructorId)
      const instructorQra = chosenInstructor ? (chosenInstructor.qra || chosenInstructor.username || 'Instrutor') : 'Nenhum'

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
          requirements,
          startDate,
          endDate,
          vagasLimit,
          instructorId,
          instructorQra,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao publicar curso.')

      // Reset Form
      setTitle('')
      setDescription('')
      setRequirements('')
      setStartDate('')
      setEndDate('')
      setVagasLimit('20')
      setInstructorId('')
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

    if (!editInstructorId) {
      setError('Por favor, selecione um Instrutor Responsável.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const chosenInstructor = activeInstructorsList.find(o => o.id === editInstructorId)
      const editInstructorQra = chosenInstructor ? (chosenInstructor.qra || chosenInstructor.username || 'Instrutor') : 'Nenhum'

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
          requirements: editRequirements,
          startDate: editStartDate,
          endDate: editEndDate,
          vagasLimit: editVagasLimit,
          instructorId: editInstructorId,
          instructorQra: editInstructorQra,
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
    setEditRequirements(course.requirements || '')
    setEditStartDate(course.startDate)
    setEditEndDate(course.endDate)
    setEditVagasLimit(course.vagasLimit.toString())
    setEditInstructorId(course.instructorId || '')
  }

  // Save an individual subscriber evaluation
  const handleSaveEvaluation = async (courseId: string, userId: string) => {
    const input = evaluationInputs[userId]
    if (!input || !input.status || input.nota.trim() === '') {
      alert('Selecione o Status (Aprovado/Reprovado) e defina a Nota (0 a 10) para salvar.')
      return
    }

    const grade = parseFloat(input.nota.replace(',', '.'))
    if (isNaN(grade) || grade < 0 || grade > 10) {
      alert('A nota deve ser um número válido de 0 a 10.')
      return
    }

    setEvaluationStatusText(prev => ({ ...prev, [userId]: 'Salvando...' }))

    try {
      const res = await fetch('/api/cursos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          action: 'evaluate-subscriber',
          id: courseId,
          userId,
          status: input.status,
          nota: grade,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Falha ao salvar avaliação.')

      setEvaluationStatusText(prev => ({ ...prev, [userId]: 'Salvo!' }))
      fetchCourses()

      // Automatically fetch updated list of officers to maintain profile alignment
      fetchOfficers()

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

  // Split courses into Cursos Marcados and Cursos Feitos
  // Marcados: endTime is in the future
  // Feitos: endTime is in the past
  const currentT = brasiliaTime || getBrasiliaTimeStr()
  
  const myUnit = profile?.unidade_operacional || profile?.unidade_administrativa || ''

  const filteredCourses = courses.filter(c => {
    if (unitFilter === 'Todos') return true
    if (!myUnit || myUnit === 'Sem Efetividade') return true
    const unitUpper = myUnit.toUpperCase()
    const titleMatch = c.title.toUpperCase().includes(unitUpper)
    const descMatch = c.description.toUpperCase().includes(unitUpper)
    const reqMatch = c.requirements?.toUpperCase().includes(unitUpper)
    const courseUnit = (c as any).unidade || (c as any).unit
    const unitFieldMatch = courseUnit ? courseUnit.toUpperCase() === unitUpper : false
    return titleMatch || descMatch || reqMatch || unitFieldMatch
  })

  const cursosMarcados = filteredCourses.filter(c => c.endDate >= currentT)
  const cursosFeitos = filteredCourses.filter(c => c.endDate < currentT)

  // Calculate dynamic stats
  const totalCursosFeitos = cursosFeitos.length

  let totalEvaluatedCount = 0
  let approvedCount = 0
  courses.forEach(c => {
    if (c.evaluations) {
      Object.values(c.evaluations).forEach(ev => {
        if (ev.status && ev.nota !== undefined) {
          totalEvaluatedCount++
          if (ev.status === 'Aprovado') {
            approvedCount++
          }
        }
      })
    }
  })
  const approvalPercentage = totalEvaluatedCount > 0 ? Math.round((approvedCount / totalEvaluatedCount) * 100) : 0

  let maxSubscribedCourse: Course | null = null
  const historyCourses = cursosFeitos.length > 0 ? cursosFeitos : courses
  historyCourses.forEach(c => {
    if (!maxSubscribedCourse || c.subscribers.length > maxSubscribedCourse.subscribers.length) {
      maxSubscribedCourse = c
    }
  })



  // Check if a finished course has pending evaluations
  const getPendingCount = (course: Course) => {
    if (course.subscribers.length === 0) return 0
    let pending = 0
    course.subscribers.forEach(sub => {
      const evalData = course.evaluations?.[sub.userId]
      const isComplete = evalData && evalData.status && evalData.nota !== undefined
      if (!isComplete) {
        pending++
      }
    })
    return pending
  }

  const cursosPendentes = cursosFeitos.filter(c => getPendingCount(c) > 0)

  // Setup evaluation panel from a course click
  const triggerEvaluationForCourse = (course: Course) => {
    setSelectedCourseForEvaluation(course)
    setSidebarTab('evaluations')
    // Scroll sidebar into view smoothly on mobile
    if (sidebarRef.current) {
      sidebarRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }

  // Get course history for selected officer
  const getOfficerCourseHistory = (officerId: string) => {
    return courses
      .filter(c => c.subscribers.some(sub => sub.userId === officerId))
      .map(c => {
        const evalData = c.evaluations?.[officerId]
        return {
          id: c.id,
          title: c.title,
          startDate: c.startDate,
          status: evalData?.status ?? null,
          nota: evalData?.nota ?? null,
          evaluatedBy: evalData?.evaluatedBy ?? null,
        }
      })
      .sort((a, b) => b.startDate.localeCompare(a.startDate))
  }

  // Get edital history for selected officer
  const getOfficerEditalHistory = (officerId: string) => {
    return editais
      .filter(e => e.subscribers.some(sub => sub.userId === officerId))
      .map(e => {
        const evalData = e.evaluations?.[officerId]
        return {
          id: e.id,
          title: e.title,
          endDate: e.endDate,
          unidade: e.unidade,
          status: evalData?.status ?? null,
          nota: evalData?.nota ?? null,
          evaluatedBy: evalData?.evaluatedBy ?? null,
        }
      })
      .sort((a, b) => b.endDate.localeCompare(a.endDate))
  }

  // Search filtered officers (excluding instructors)
  const filteredOfficers = officersSearchQuery.trim() === ''
    ? []
    : officersList.filter(o => {
        const cargos = o.cargo ?? []
        const isInstructor = cargos.includes('Instrutor Treinamento Operacional') || cargos.includes('Instrutor De Cursos e Recrutamentos')
        if (isInstructor) return false
        return (
          (o.qra || '').toLowerCase().includes(officersSearchQuery.toLowerCase()) ||
          (o.username || '').toLowerCase().includes(officersSearchQuery.toLowerCase())
        )
      })

  // Search filtered instructors
  const filteredInstructors = instructorsSearchQuery.trim() === ''
    ? []
    : officersList.filter(o => {
        const cargos = o.cargo ?? []
        const isInstructor = cargos.includes('Instrutor Treinamento Operacional') || cargos.includes('Instrutor De Cursos e Recrutamentos')
        if (!isInstructor) return false
        return (
          (o.qra || '').toLowerCase().includes(instructorsSearchQuery.toLowerCase()) ||
          (o.username || '').toLowerCase().includes(instructorsSearchQuery.toLowerCase())
        )
      })

  // Active instructors list for select input
  const activeInstructorsList = officersList.filter(o => {
    const cargos = o.cargo ?? []
    return cargos.includes('Instrutor Treinamento Operacional') || cargos.includes('Instrutor De Cursos e Recrutamentos')
  })

  // Helper to compute instructor stats
  const getInstructorCourseHistory = (instructorId: string) => {
    return courses
      .filter(c => c.instructorId === instructorId)
      .map(c => {
        const totalParticipants = c.subscribers.length
        let approved = 0
        let reproved = 0
        let sumGrades = 0
        let gradedCount = 0

        if (c.evaluations) {
          Object.values(c.evaluations).forEach(ev => {
            if (ev.status === 'Aprovado') approved++
            if (ev.status === 'Reprovado') reproved++
            if (ev.nota !== undefined) {
              sumGrades += ev.nota
              gradedCount++
            }
          })
        }

        const averageGrade = gradedCount > 0 ? (sumGrades / gradedCount).toFixed(1) : 'N/A'

        return {
          id: c.id,
          title: c.title,
          startDate: c.startDate,
          totalParticipants,
          approved,
          reproved,
          averageGrade,
        }
      })
      .sort((a, b) => b.startDate.localeCompare(a.startDate))
  }

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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/60 pb-6 mb-8">
        <div>
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-foreground" />
            <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wider">
              ACADEMIA DA POLÍCIA MILITAR (APM)
            </span>
          </div>
          <h1 id="cursos-titulo" className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl text-foreground">
            Capacitação & Cursos
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Participe de instruções oficiais da Academia da Polícia Militar (APM) para aprimorar suas competências técnicas e operacionais.
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
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setEditingCourse(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-2xl overflow-hidden rounded-xl border border-border bg-card p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
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
                  <label className="block text-sm font-medium text-muted-foreground">Descrição (conteúdo do curso) *</label>
                  <textarea
                    required
                    rows={3}
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-border/80 bg-background/50 px-3.5 py-2.5 text-sm outline-none focus:border-foreground resize-none"
                    placeholder="Conteúdo programático, o que vai ser ensinado, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground">Requisitos (o que é exigido para participar) *</label>
                  <textarea
                    required
                    rows={3}
                    value={editRequirements}
                    onChange={(e) => setEditRequirements(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-border/80 bg-background/50 px-3.5 py-2.5 text-sm outline-none focus:border-foreground resize-none"
                    placeholder="Fardamento, patentes exigidas, pré-requisitos técnicos."
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

                <div>
                  <label className="block text-sm font-medium text-muted-foreground">Instrutor Responsável *</label>
                  <select
                    required
                    value={editInstructorId}
                    onChange={(e) => setEditInstructorId(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-border/80 bg-background/50 px-3.5 py-2.5 text-sm outline-none focus:border-foreground"
                  >
                    <option value="">Selecione o Instrutor...</option>
                    {activeInstructorsList.map((inst) => (
                      <option key={inst.id} value={inst.id}>
                        {inst.qra || inst.username} ({inst.patente || 'Oficial'})
                      </option>
                    ))}
                  </select>
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

      {/* Split Screen Grid (Adapts automatically based on permissions) */}
      <div className="mt-16 grid grid-cols-1 gap-8 lg:grid-cols-3">
        
        {/* Left Column: Course Announcements Mural */}
        <div className={`space-y-12 ${isAuthorizedToPublish ? 'lg:col-span-2' : 'lg:col-span-3 max-w-4xl mx-auto w-full'}`}>
          {loading ? (
            <div className="rounded-xl border border-border/60 bg-card/60 p-12 text-center backdrop-blur-sm">
              <p className="text-sm text-muted-foreground">Buscando cursos do servidor...</p>
            </div>
          ) : (
            <>
              {/* Filtro de Unidade */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card/40 border border-border/40 p-4 rounded-xl backdrop-blur-sm">
                <div>
                  <span className="block text-[10px] font-mono font-bold uppercase text-primary/70 tracking-wider">Filtro de Exibição</span>
                  <span className="text-xs text-muted-foreground mt-0.5 block">Selecione para ver cursos gerais ou específicos da sua unidade.</span>
                </div>
                <div className="flex items-center gap-1.5 bg-secondary/30 p-1 rounded-lg border border-border/30 self-start sm:self-center">
                  <button
                    onClick={() => handleFilterChange('Todos')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      unitFilter === 'Todos'
                        ? 'bg-foreground text-background shadow-md'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Todos os Cursos
                  </button>
                  <button
                    onClick={() => handleFilterChange('Minha Unidade')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      unitFilter === 'Minha Unidade'
                        ? 'bg-foreground text-background shadow-md'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Minha Unidade ({myUnit && myUnit !== 'Sem Efetividade' ? myUnit : 'Nenhuma'})
                  </button>
                </div>
              </div>

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

                      // Calculate visual urgency (expiring in less than 24 hours)
                      const endDateMs = new Date(course.endDate).getTime()
                      const currentMs = new Date(currentT).getTime()
                      const hoursLeft = (endDateMs - currentMs) / 3600000
                      const isUrgent = hoursLeft > 0 && hoursLeft <= 24

                      return (
                        <motion.div
                          layout
                          key={course.id}
                          id={`course-card-${course.id}`}
                          className={`group rounded-xl border p-6 transition-all duration-300 backdrop-blur-sm shadow-sm ${
                            isSubscribed
                              ? 'border-emerald-500/30 bg-emerald-500/[0.02]'
                              : isUrgent
                              ? 'border-amber-500/50 bg-amber-500/[0.03] shadow-[0_0_15px_-3px_rgba(245,158,11,0.15)] hover:border-amber-500/70'
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

                                {/* Urgent Highlight */}
                                {isUrgent && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/25 border border-amber-500/50 px-2.5 py-0.5 text-xs font-bold text-amber-400 animate-pulse">
                                    <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                                    Inscrição fecha em {Math.ceil(hoursLeft)}h!
                                  </span>
                                )}

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
                                {course.instructorQra && (
                                  <span className="flex items-center gap-1 rounded bg-secondary/45 px-1.5 py-0.5 text-foreground/90 font-medium">
                                    <UserCheck className="h-3.5 w-3.5 text-muted-foreground" />
                                    Instrutor: {course.instructorQra}
                                  </span>
                                )}
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
                                    <div className="space-y-3">
                                      <div>
                                        <span className="text-[10px] font-bold text-foreground/70 uppercase tracking-wider block mb-1">Descrição:</span>
                                        <div className="whitespace-pre-wrap leading-relaxed text-foreground/90">
                                          {course.description}
                                        </div>
                                      </div>
                                      {course.requirements && (
                                        <div>
                                          <span className="text-[10px] font-bold text-foreground/70 uppercase tracking-wider block mb-1">Requisitos:</span>
                                          <div className="whitespace-pre-wrap leading-relaxed text-foreground/90">
                                            {course.requirements}
                                          </div>
                                        </div>
                                      )}
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
                      const pendingEvals = getPendingCount(course)

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

                                {/* Admin Pending Eval warning badge */}
                                {isAuthorizedToPublish && pendingEvals > 0 && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 text-[10px] font-medium text-amber-400 animate-pulse">
                                    {pendingEvals} pendente{pendingEvals > 1 ? 's' : ''}
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
                                {course.instructorQra && (
                                  <span className="inline-flex items-center gap-1 font-semibold text-foreground/80 bg-secondary/40 rounded px-1.5 py-0.5">
                                    <UserCheck className="h-3 w-3" />
                                    Instrutor: {course.instructorQra}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 sm:self-start">
                              {/* Evaluation Action trigger for Admins */}
                              {isAuthorizedToPublish && course.subscribers.length > 0 && (
                                <button
                                  onClick={() => triggerEvaluationForCourse(course)}
                                  className="rounded-lg bg-foreground text-background hover:bg-foreground/90 px-3 py-1 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1"
                                >
                                  <Award className="h-3 w-3" />
                                  Avaliar Inscritos
                                </button>
                              )}

                              <button
                                onClick={() => handleToggleExpand(course)}
                                className="rounded-lg bg-secondary px-3 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-all cursor-pointer"
                              >
                                {isExpanded ? 'Recolher' : 'Visualizar'}
                              </button>
                            </div>
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
                                  <div className="space-y-3">
                                    <div>
                                      <span className="text-[10px] font-bold text-foreground/70 uppercase tracking-wider block mb-1">Descrição:</span>
                                      <div className="whitespace-pre-wrap leading-relaxed text-foreground/90">
                                        {course.description}
                                      </div>
                                    </div>
                                    {course.requirements && (
                                      <div>
                                        <span className="text-[10px] font-bold text-foreground/70 uppercase tracking-wider block mb-1">Requisitos:</span>
                                        <div className="whitespace-pre-wrap leading-relaxed text-foreground/90">
                                          {course.requirements}
                                        </div>
                                      </div>
                                    )}
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
                                      <div className="space-y-2 mt-2">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                          {course.subscribers.map((subscriber) => {
                                            const evaluation = course.evaluations?.[subscriber.userId]
                                            return (
                                              <div
                                                key={subscriber.userId}
                                                className="flex items-center justify-between rounded border border-border/40 bg-card p-2 text-xs"
                                              >
                                                <span className="font-semibold text-foreground/95">
                                                  {subscriber.qra}
                                                </span>
                                                {evaluation ? (
                                                  <div className="flex items-center gap-1.5">
                                                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                                                      evaluation.status === 'Aprovado'
                                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                                        : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                                    }`}>
                                                      {evaluation.status}
                                                    </span>
                                                    <span className="font-mono text-[11px] font-bold bg-secondary px-1.5 py-0.5 rounded text-foreground">
                                                      Nota: {evaluation.nota.toFixed(1)}
                                                    </span>
                                                  </div>
                                                ) : (
                                                  <span className="text-[10px] text-amber-500/90 font-medium">
                                                    Pendente de Avaliação
                                                  </span>
                                                )}
                                              </div>
                                            )
                                          })}
                                        </div>
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

        {/* --- CUSTOM RIGHT SIDEBAR (EXCLUSIVA DE CAPACITAÇÃO & CURSOS) --- */}
        {/* Visible only for Diretor APM, Supervisor APM, Alto Comando */}
        {isAuthorizedToPublish && (
          <div ref={sidebarRef} className="lg:col-span-1 space-y-6">
            
            {/* Main Sticky Administrative Control Panel */}
            <div className="sticky top-28 rounded-xl border border-border bg-card shadow-lg p-5 space-y-6 backdrop-blur-sm overflow-hidden">
              
              <div className="flex items-center gap-2 border-b border-border/80 pb-3">
                <ClipboardList className="h-5 w-5 text-foreground" />
                <div>
                  <h2 className="text-lg font-bold tracking-tight text-foreground">Controle & Avaliação APM</h2>
                  <p className="text-[11px] text-muted-foreground">Ferramentas de Gestão Acadêmica</p>
                </div>
              </div>

              {/* Sidebar Navigation Tabs */}
              <div className="flex bg-secondary/50 p-1 rounded-lg text-xs gap-1 flex-wrap">
                <button
                  onClick={() => setSidebarTab('stats')}
                  className={`flex-1 min-w-[70px] py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
                    sidebarTab === 'stats'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Geral & Criar
                </button>
                
                <button
                  onClick={() => setSidebarTab('evaluations')}
                  className={`flex-1 min-w-[70px] py-1.5 rounded-md font-semibold transition-all cursor-pointer relative flex items-center justify-center gap-1 ${
                    sidebarTab === 'evaluations'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span>Avaliações</span>
                  {cursosPendentes.length > 0 && (
                    <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                  )}
                </button>

                <button
                  onClick={() => setSidebarTab('officers')}
                  className={`flex-1 min-w-[70px] py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
                    sidebarTab === 'officers'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Ficha Oficial
                </button>

                <button
                  onClick={() => setSidebarTab('instructors')}
                  className={`flex-1 min-w-[70px] py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
                    sidebarTab === 'instructors'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Ficha Instrutor
                </button>
              </div>

              {/* TAB 1 CONTENT: Geral & Estatísticas & Criar Novo */}
              {sidebarTab === 'stats' && (
                <div className="space-y-6 animate-fade-in">
                  
                  {/* SEÇÃO 3: Estatísticas Rápidas */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      <TrendingUp className="h-3.5 w-3.5" />
                      Estatísticas Rápidas
                    </h3>

                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-lg border border-border/80 bg-background/50 p-3 space-y-1">
                          <span className="block text-[10px] text-muted-foreground uppercase">Cursos Aplicados</span>
                          <span className="block text-xl font-bold font-mono text-foreground">
                            {totalCursosFeitos}
                          </span>
                        </div>
                        <div className="rounded-lg border border-border/80 bg-background/50 p-3 space-y-1">
                          <span className="block text-[10px] text-muted-foreground uppercase">Taxa Aprovação</span>
                          <span className="block text-xl font-bold font-mono text-emerald-400">
                            {approvalPercentage}%
                          </span>
                        </div>
                      </div>
                    </div>


                  </div>

                  {/* FORM TO PUBLISH NEW COURSE */}
                  <div className="border-t border-border/60 pt-5 space-y-4">
                    <div className="flex items-center gap-1.5">
                      <Plus className="h-4 w-4 text-muted-foreground" />
                      <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Publicar Novo Curso
                      </h3>
                    </div>

                    {formSuccess && (
                      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-400 backdrop-blur-sm flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 shrink-0" />
                        <span>Curso publicado e disponível no Mural!</span>
                      </div>
                    )}

                    <form onSubmit={handlePublish} className="space-y-4">
                      <div>
                        <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                          Nome do Curso *
                        </label>
                        <input
                          type="text"
                          required
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          className="mt-1.5 w-full rounded-lg border border-border/80 bg-background/50 px-3 py-2 text-xs outline-none focus:border-foreground"
                          placeholder="Ex: Formação em BOPE"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                          Descrição (o que vai ser / conteúdo do curso) *
                        </label>
                        <textarea
                          required
                          rows={3}
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          className="mt-1.5 w-full rounded-lg border border-border/80 bg-background/50 px-3 py-2 text-xs outline-none focus:border-foreground resize-none"
                          placeholder="Especifique o conteúdo programático, as aulas, etc."
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                          Requisitos (o que é exigido para participar) *
                        </label>
                        <textarea
                          required
                          rows={3}
                          value={requirements}
                          onChange={(e) => setRequirements(e.target.value)}
                          className="mt-1.5 w-full rounded-lg border border-border/80 bg-background/50 px-3 py-2 text-xs outline-none focus:border-foreground resize-none"
                          placeholder="Especifique fardamento, patentes ou pré-requisitos."
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                            Início *
                          </label>
                          <input
                            type="datetime-local"
                            required
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="mt-1.5 w-full rounded-lg border border-border/80 bg-background/50 px-2.5 py-2 text-xs outline-none focus:border-foreground"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                            Término *
                          </label>
                          <input
                            type="datetime-local"
                            required
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="mt-1.5 w-full rounded-lg border border-border/80 bg-background/50 px-2.5 py-2 text-xs outline-none focus:border-foreground"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                          Limite de Vagas (1 a 99) *
                        </label>
                        <input
                          type="number"
                          required
                          min={1}
                          max={99}
                          value={vagasLimit}
                          onChange={(e) => setVagasLimit(e.target.value)}
                          className="mt-1.5 w-full rounded-lg border border-border/80 bg-background/50 px-3 py-2 text-xs outline-none focus:border-foreground"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                          Instrutor Responsável *
                        </label>
                        <select
                          required
                          value={instructorId}
                          onChange={(e) => setInstructorId(e.target.value)}
                          className="mt-1.5 w-full rounded-lg border border-border/80 bg-background/50 px-3 py-2 text-xs outline-none focus:border-foreground"
                        >
                          <option value="">Selecione o Instrutor...</option>
                          {activeInstructorsList.map((inst) => (
                            <option key={inst.id} value={inst.id}>
                              {inst.qra || inst.username} ({inst.patente || 'Oficial'})
                            </option>
                          ))}
                        </select>
                      </div>

                      <button
                        type="submit"
                        disabled={submitting}
                        className="w-full rounded-lg bg-foreground py-2 text-xs font-bold text-background hover:bg-foreground/90 transition-all disabled:opacity-50 cursor-pointer"
                      >
                        {submitting ? 'Publicando...' : 'Publicar Curso'}
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {/* TAB 2 CONTENT: Pendências & Avaliações */}
              {sidebarTab === 'evaluations' && (
                <div className="space-y-6 animate-fade-in">
                  
                  {/* SEÇÃO 2: Pendências de Avaliação */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                      Pendências de Avaliação
                    </h3>

                    {cursosPendentes.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-border/50 bg-secondary/15 p-4 text-center">
                        <p className="text-xs text-muted-foreground">Nenhuma pendência de avaliação encontrada. Todos os cursos concluídos foram avaliados!</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {cursosPendentes.map(c => {
                          const count = getPendingCount(c)
                          return (
                            <button
                              key={c.id}
                              onClick={() => setSelectedCourseForEvaluation(c)}
                              className={`w-full text-left rounded-lg p-2.5 border transition-all flex items-center justify-between text-xs cursor-pointer ${
                                selectedCourseForEvaluation?.id === c.id
                                  ? 'border-foreground bg-secondary/80'
                                  : 'border-border/60 bg-background/50 hover:border-foreground/40'
                              }`}
                            >
                              <div className="space-y-0.5 flex-1 min-w-0 pr-2">
                                <span className="font-bold block text-foreground truncate">{c.title}</span>
                                <span className="text-[10px] text-muted-foreground block font-mono">
                                  Término: {formatDateTime(c.endDate)}
                                </span>
                              </div>
                              <span className="shrink-0 rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-500 animate-pulse">
                                {count} pendente{count > 1 ? 's' : ''}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* SEÇÃO 1: Painel de Avaliação de Participantes */}
                  <div className="border-t border-border/60 pt-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Award className="h-3.5 w-3.5" />
                        Avaliação de Participantes
                      </h3>
                      {selectedCourseForEvaluation && (
                        <button
                          onClick={() => setSelectedCourseForEvaluation(null)}
                          className="text-xs text-muted-foreground hover:text-foreground underline"
                        >
                          Fechar
                        </button>
                      )}
                    </div>

                    {!selectedCourseForEvaluation ? (
                      <div className="rounded-lg border border-dashed border-border/50 p-4 text-center bg-secondary/15">
                        <p className="text-xs text-muted-foreground">
                          Selecione um curso finalizado (no Mural ou na lista de Pendências acima) para avaliar os oficiais inscritos individualmente.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="rounded-lg bg-secondary/30 border border-border/50 p-3 space-y-1">
                          <span className="text-[10px] font-semibold text-muted-foreground block uppercase">Curso Selecionado</span>
                          <span className="font-bold text-xs text-foreground block">{selectedCourseForEvaluation.title}</span>
                          <span className="text-[10px] text-muted-foreground block">
                            Inscritos: {selectedCourseForEvaluation.subscribers.length} • Pendentes: {getPendingCount(selectedCourseForEvaluation)}
                          </span>
                        </div>

                        {selectedCourseForEvaluation.subscribers.length === 0 ? (
                          <p className="text-xs text-muted-foreground text-center py-2 italic">Nenhum oficial se inscreveu neste curso.</p>
                        ) : (
                          <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                            {selectedCourseForEvaluation.subscribers.map((subscriber) => {
                              const inputState = evaluationInputs[subscriber.userId] || { status: '', nota: '' }
                              const statusText = evaluationStatusText[subscriber.userId]

                              return (
                                <div
                                  key={subscriber.userId}
                                  className="p-3 rounded-lg border border-border/80 bg-background/40 space-y-2.5 shadow-xs"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-bold text-xs text-foreground/90">{subscriber.qra}</span>
                                    {statusText && (
                                      <span className={`text-[10px] font-medium ${
                                        statusText === 'Salvo!' ? 'text-emerald-400' : 'text-muted-foreground animate-pulse'
                                      }`}>
                                        {statusText}
                                      </span>
                                    )}
                                  </div>

                                  <div className="grid grid-cols-2 gap-2">
                                    {/* Status selection manual */}
                                    <div>
                                      <label className="text-[10px] text-muted-foreground block font-medium mb-1">Status</label>
                                      <select
                                        value={inputState.status}
                                        onChange={(e) => {
                                          setEvaluationInputs(prev => ({
                                            ...prev,
                                            [subscriber.userId]: {
                                              ...prev[subscriber.userId],
                                              status: e.target.value as any,
                                            }
                                          }))
                                        }}
                                        className="w-full text-xs bg-secondary/40 border border-border/80 rounded px-2 py-1.5 outline-none focus:border-foreground"
                                      >
                                        <option value="">Selecione...</option>
                                        <option value="Aprovado">Aprovado</option>
                                        <option value="Reprovado">Reprovado</option>
                                      </select>
                                    </div>

                                    {/* Nota field numerical (0 to 10) */}
                                    <div>
                                      <label className="text-[10px] text-muted-foreground block font-medium mb-1">Nota (0 a 10)</label>
                                      <input
                                        type="text"
                                        placeholder="Ex: 8.5"
                                        value={inputState.nota}
                                        onChange={(e) => {
                                          setEvaluationInputs(prev => ({
                                            ...prev,
                                            [subscriber.userId]: {
                                              ...prev[subscriber.userId],
                                              nota: e.target.value,
                                            }
                                          }))
                                        }}
                                        className="w-full text-xs font-mono bg-secondary/40 border border-border/80 rounded px-2 py-1.5 outline-none focus:border-foreground"
                                      />
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => handleSaveEvaluation(selectedCourseForEvaluation.id, subscriber.userId)}
                                    className="w-full rounded bg-secondary hover:bg-foreground hover:text-background py-1 text-[11px] font-bold transition-all text-foreground flex items-center justify-center gap-1"
                                  >
                                    <Check className="h-3 w-3" />
                                    Gravar Avaliação
                                  </button>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3 CONTENT: Ficha do Oficial (Search & Profile history) */}
              {sidebarTab === 'officers' && (
                <div className="space-y-6 animate-fade-in">
                  
                  {/* SEÇÃO 4: Busca por QRA/Nome do Oficial */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Search className="h-3.5 w-3.5" />
                      Ficha do Oficial (Consulta)
                    </h3>

                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Buscar Oficial por QRA..."
                        value={officersSearchQuery}
                        onChange={(e) => {
                          setOfficersSearchQuery(e.target.value)
                          // Reset profile if clearing search
                          if (e.target.value.trim() === '') {
                            setSelectedOfficerForProfile(null)
                          }
                        }}
                        className="w-full rounded-lg border border-border/80 bg-background/50 pl-8 pr-3 py-2 text-xs outline-none focus:border-foreground"
                      />
                    </div>

                    {/* Search Results */}
                    {officersSearchQuery.trim() !== '' && filteredOfficers.length > 0 && (
                      <div className="rounded-lg border border-border bg-card shadow-sm max-h-36 overflow-y-auto text-xs divide-y divide-border/60">
                        {filteredOfficers.map(officer => (
                          <button
                            key={officer.id}
                            type="button"
                            onClick={() => {
                              setSelectedOfficerForProfile(officer)
                              setOfficersSearchQuery('') // clear query to hide suggestions
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-secondary/40 transition-colors flex items-center justify-between"
                          >
                            <span className="font-bold text-foreground">{officer.qra || officer.username}</span>
                            <span className="text-[10px] text-muted-foreground font-semibold">{officer.patente || 'Oficial'}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {officersSearchQuery.trim() !== '' && filteredOfficers.length === 0 && (
                      <p className="text-[11px] text-muted-foreground italic text-center py-1">Nenhum oficial correspondente encontrado.</p>
                    )}
                  </div>

                  {/* DISPLAY SELECTED OFFICER PROFILE */}
                  <div className="border-t border-border/60 pt-5 space-y-4">
                    {!selectedOfficerForProfile ? (
                      <div className="rounded-lg border border-dashed border-border/50 p-4 text-center bg-secondary/15">
                        <p className="text-xs text-muted-foreground">
                          Utilize o campo de busca acima para carregar a ficha de treinamento e histórico de avaliações de qualquer oficial da Polícia Militar.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Header card of the Officer */}
                        <div className="rounded-lg bg-secondary/30 border border-border/50 p-3 space-y-1 relative">
                          <button
                            onClick={() => setSelectedOfficerForProfile(null)}
                            title="Remover oficial"
                            className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                          
                          <span className="text-[9px] font-bold text-muted-foreground uppercase bg-secondary/80 px-1.5 py-0.5 rounded">
                            {selectedOfficerForProfile.patente || 'Sem patente'}
                          </span>
                          
                          <span className="font-bold text-sm text-foreground block mt-1">
                            {selectedOfficerForProfile.qra || selectedOfficerForProfile.username}
                          </span>
                          
                          <div className="flex flex-col gap-0.5 text-[10px] text-muted-foreground pt-1 border-t border-border/20">
                            <span>Unidade: {selectedOfficerForProfile.unidade_operacional || 'Efetividade'}</span>
                            <span>Cargo: {Array.isArray(selectedOfficerForProfile.cargo) ? selectedOfficerForProfile.cargo.join(', ') : 'Oficial'}</span>
                          </div>
                        </div>

                        {/* Officer's course history */}
                        <div className="space-y-2.5">
                          <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                            <History className="h-3 w-3" />
                            Histórico de Instruções e Notas
                          </h4>

                          {getOfficerCourseHistory(selectedOfficerForProfile.id).length === 0 ? (
                            <p className="text-xs text-muted-foreground italic text-center py-2">
                              Este oficial ainda não se inscreveu em nenhum curso.
                            </p>
                          ) : (
                            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                              {getOfficerCourseHistory(selectedOfficerForProfile.id).map(hist => (
                                <div
                                  key={hist.id}
                                  className="p-2.5 rounded-lg border border-border/60 bg-background/30 space-y-1 text-xs"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <span className="font-bold text-foreground/90 truncate block max-w-[130px]">{hist.title}</span>
                                    {hist.status ? (
                                      <span className={`shrink-0 text-[9px] font-bold uppercase rounded px-1 ${
                                        hist.status === 'Aprovado'
                                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25'
                                          : 'bg-red-500/10 text-red-400 border border-red-500/25'
                                      }`}>
                                        {hist.status}
                                      </span>
                                    ) : (
                                      <span className="shrink-0 text-[9px] font-semibold text-amber-500/90 rounded bg-amber-500/10 border border-amber-500/20 px-1 animate-pulse">
                                        Pendente
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center justify-between text-[10px] text-muted-foreground/80 font-mono">
                                    <span>{new Date(hist.startDate).toLocaleDateString('pt-BR')}</span>
                                    {hist.nota !== null && (
                                      <span className="font-bold text-foreground">
                                        Nota: {hist.nota.toFixed(1)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Officer's process selection (edital) history */}
                        <div className="space-y-2.5 pt-4 border-t border-border/20">
                          <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            Histórico de Processos Seletivos (Editais)
                          </h4>

                          {getOfficerEditalHistory(selectedOfficerForProfile.id).length === 0 ? (
                            <p className="text-xs text-muted-foreground italic text-center py-2">
                              Este oficial ainda não se inscreveu em nenhum edital.
                            </p>
                          ) : (
                            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                              {getOfficerEditalHistory(selectedOfficerForProfile.id).map(hist => (
                                <div
                                  key={hist.id}
                                  className="p-2.5 rounded-lg border border-border/60 bg-background/30 space-y-1 text-xs"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0 flex items-center gap-1.5 flex-1">
                                      <span className="shrink-0 rounded bg-secondary px-1.5 py-0.5 text-[9px] font-bold text-foreground uppercase">
                                        {hist.unidade}
                                      </span>
                                      <span className="font-bold text-foreground/90 truncate block max-w-[110px]" title={hist.title}>
                                        {hist.title}
                                      </span>
                                    </div>
                                    {hist.status ? (
                                      <span className={`shrink-0 text-[9px] font-bold uppercase rounded px-1 ${
                                        hist.status === 'Aprovado'
                                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25'
                                          : 'bg-red-500/10 text-red-400 border border-red-500/25'
                                      }`}>
                                        {hist.status}
                                      </span>
                                    ) : (
                                      <span className="shrink-0 text-[9px] font-semibold text-amber-500/90 rounded bg-amber-500/10 border border-amber-500/20 px-1 animate-pulse">
                                        Inscrito / Pendente
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center justify-between text-[10px] text-muted-foreground/80 font-mono">
                                    <span>{new Date(hist.endDate).toLocaleDateString('pt-BR')}</span>
                                    {hist.nota !== null && (
                                      <span className="font-bold text-foreground">
                                        Nota: {hist.nota.toFixed(1)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4 CONTENT: Ficha do Instrutor (Search & Instructor profile) */}
              {sidebarTab === 'instructors' && (
                <div className="space-y-6 animate-fade-in">
                  
                  {/* SEÇÃO 5: Busca por QRA/Nome do Instrutor */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Search className="h-3.5 w-3.5" />
                      Ficha do Instrutor (Consulta)
                    </h3>

                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Buscar Instrutor por QRA..."
                        value={instructorsSearchQuery}
                        onChange={(e) => {
                          setInstructorsSearchQuery(e.target.value)
                          if (e.target.value.trim() === '') {
                            setSelectedInstructorForProfile(null)
                          }
                        }}
                        className="w-full rounded-lg border border-border/80 bg-background/50 pl-8 pr-3 py-2 text-xs outline-none focus:border-foreground"
                      />
                    </div>

                    {/* Search Results */}
                    {instructorsSearchQuery.trim() !== '' && filteredInstructors.length > 0 && (
                      <div className="rounded-lg border border-border bg-card shadow-sm max-h-36 overflow-y-auto text-xs divide-y divide-border/60">
                        {filteredInstructors.map(inst => (
                          <button
                            key={inst.id}
                            type="button"
                            onClick={() => {
                              setSelectedInstructorForProfile(inst)
                              setInstructorsSearchQuery('') // clear query to hide suggestions
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-secondary/40 transition-colors flex items-center justify-between"
                          >
                            <span className="font-bold text-foreground">{inst.qra || inst.username}</span>
                            <span className="text-[10px] text-muted-foreground font-semibold">{inst.patente || 'Instrutor'}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {instructorsSearchQuery.trim() !== '' && filteredInstructors.length === 0 && (
                      <p className="text-[11px] text-muted-foreground italic text-center py-1">Nenhum instrutor correspondente encontrado.</p>
                    )}
                  </div>

                  {/* DISPLAY SELECTED INSTRUCTOR PROFILE */}
                  <div className="border-t border-border/60 pt-5 space-y-4">
                    {!selectedInstructorForProfile ? (
                      <div className="rounded-lg border border-dashed border-border/50 p-4 text-center bg-secondary/15">
                        <p className="text-xs text-muted-foreground">
                          Utilize o campo de busca acima para carregar a ficha acadêmica e histórico de instrução de qualquer instrutor credenciado do APM.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Header card of the Instructor */}
                        <div className="rounded-lg bg-secondary/30 border border-border/50 p-3 space-y-1 relative">
                          <button
                            onClick={() => setSelectedInstructorForProfile(null)}
                            title="Remover instrutor"
                            className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                          
                          <span className="text-[9px] font-bold text-muted-foreground uppercase bg-secondary/80 px-1.5 py-0.5 rounded">
                            {selectedInstructorForProfile.patente || 'Instrutor credenciado'}
                          </span>
                          
                          <span className="font-bold text-sm text-foreground block mt-1">
                            {selectedInstructorForProfile.qra || selectedInstructorForProfile.username}
                          </span>
                          
                          <div className="flex flex-col gap-0.5 text-[10px] text-muted-foreground pt-1 border-t border-border/20">
                            <span>Unidade: {selectedInstructorForProfile.unidade_operacional || 'Efetividade'}</span>
                            <span>Cargo: {Array.isArray(selectedInstructorForProfile.cargo) ? selectedInstructorForProfile.cargo.join(', ') : 'Instrutor'}</span>
                          </div>
                        </div>

                        {/* Instructor's course history */}
                        <div className="space-y-2.5">
                          <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                            <History className="h-3 w-3" />
                            Cursos Sob Responsabilidade
                          </h4>

                          {getInstructorCourseHistory(selectedInstructorForProfile.id).length === 0 ? (
                            <p className="text-xs text-muted-foreground italic text-center py-2">
                              Este instrutor ainda não ministrou nenhum curso registrado.
                            </p>
                          ) : (
                            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                              {getInstructorCourseHistory(selectedInstructorForProfile.id).map(hist => (
                                <div
                                  key={hist.id}
                                  className="p-2.5 rounded-lg border border-border/60 bg-background/30 space-y-2 text-xs"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <span className="font-bold text-foreground/90 truncate block max-w-[140px]">{hist.title}</span>
                                    <span className="shrink-0 text-[10px] text-muted-foreground font-mono">
                                      {new Date(hist.startDate).toLocaleDateString('pt-BR')}
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-border/20 text-[10px] text-muted-foreground font-medium">
                                    <div>
                                      Inscritos: <span className="font-bold text-foreground">{hist.totalParticipants}</span>
                                    </div>
                                    <div>
                                      Média Notas: <span className="font-bold text-foreground">{hist.averageGrade}</span>
                                    </div>
                                    <div className="col-span-2 flex items-center gap-2 text-[9px] mt-0.5">
                                      <span className="inline-flex items-center rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-1 font-bold">
                                        {hist.approved} Aprovados
                                      </span>
                                      <span className="inline-flex items-center rounded bg-red-500/10 text-red-400 border border-red-500/25 px-1 font-bold">
                                        {hist.reproved} Reprovados
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

      </div>
    </main>
  )
}
