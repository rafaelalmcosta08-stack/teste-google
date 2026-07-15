import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

const DATA_FILE = path.join(process.cwd(), 'cursos-data.json')

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

// Model interface for Course
export interface Course {
  id: string
  title: string
  description: string
  startDate: string // local format "YYYY-MM-DDTHH:mm"
  endDate: string // local format "YYYY-MM-DDTHH:mm"
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
  evaluations?: Record<string, {
    status: 'Aprovado' | 'Reprovado'
    nota: number
    evaluatedBy: string
    evaluatedAt: string
  }>
}

// Safe read helper
async function readCourses(): Promise<Course[]> {
  try {
    const content = await fs.readFile(DATA_FILE, 'utf8')
    return JSON.parse(content)
  } catch (err) {
    return []
  }
}

// Safe write helper
async function writeCourses(courses: Course[]) {
  await fs.writeFile(DATA_FILE, JSON.stringify(courses, null, 2), 'utf8')
}

// Broadcast to SSE helper
async function broadcastUpdate() {
  try {
    const { broadcastEvent } = await import('@/app/api/events/route')
    broadcastEvent('cursos-updated', {})
  } catch (err) {
    console.error('Failed to broadcast courses update', err)
  }
}

export async function GET(req: NextRequest) {
  const courses = await readCourses()
  return NextResponse.json({ courses })
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Não autorizado. Token ausente.' }, { status: 401 })
  }
  const token = authHeader.substring(7)

  const admin = getAdminClient()
  if (!admin) {
    return NextResponse.json({ error: 'Configuração do servidor incompleta.' }, { status: 500 })
  }

  const { data: { user: requester }, error: authError } = await admin.auth.getUser(token)
  if (authError || !requester) {
    return NextResponse.json({ error: 'Não autorizado. Sessão inválida.' }, { status: 401 })
  }

  const requesterMeta = requester.user_metadata ?? {}
  if (requesterMeta.status !== 'aprovado') {
    return NextResponse.json({ error: 'Não autorizado. Acesso pendente ou revogado.' }, { status: 403 })
  }

  const body = await req.json()
  const { action } = body

  const myCargos: string[] = requesterMeta.cargo ?? []
  const isAuthorizedToManage =
    requesterMeta.role === 'admin' ||
    myCargos.includes('Diretor APM') ||
    myCargos.includes('Supervisor APM') ||
    myCargos.includes('Alto Comando')

  const courses = await readCourses()

  if (action === 'create') {
    if (!isAuthorizedToManage) {
      return NextResponse.json({ error: 'Permissão insuficiente para criar cursos.' }, { status: 403 })
    }

    const { title, description, startDate, endDate, vagasLimit } = body
    if (!title?.trim() || !description?.trim() || !startDate || !endDate || !vagasLimit) {
      return NextResponse.json({ error: 'Preencha todos os campos obrigatórios.' }, { status: 400 })
    }

    const vagas = parseInt(vagasLimit)
    if (isNaN(vagas) || vagas < 1 || vagas > 99) {
      return NextResponse.json({ error: 'O limite de vagas deve ser um número entre 1 e 99.' }, { status: 400 })
    }

    const newCourse: Course = {
      id: Math.random().toString(36).substring(2, 15),
      title: title.trim(),
      description: description.trim(),
      startDate,
      endDate,
      vagasLimit: vagas,
      creatorId: requester.id,
      creatorQra: requesterMeta.qra || requesterMeta.username || 'Oficial',
      createdAt: new Date().toISOString(),
      subscribers: [],
      readBy: [requester.id], // Creator has already read it
    }

    courses.push(newCourse)
    await writeCourses(courses)
    await broadcastUpdate()

    return NextResponse.json({ success: true, course: newCourse })
  }

  if (action === 'edit') {
    const { id, title, description, startDate, endDate, vagasLimit } = body
    const courseIndex = courses.findIndex(c => c.id === id)
    if (courseIndex === -1) {
      return NextResponse.json({ error: 'Curso não encontrado.' }, { status: 404 })
    }

    const course = courses[courseIndex]
    
    // Check permissions: creator or managers
    const canManage = isAuthorizedToManage || course.creatorId === requester.id
    if (!canManage) {
      return NextResponse.json({ error: 'Sem permissão para editar este curso.' }, { status: 403 })
    }

    // Check if course has ended
    // Svenska timezone comparison
    const nowStr = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(new Date()).replace(' ', 'T')
    
    if (course.endDate < nowStr) {
      return NextResponse.json({ error: 'Não é possível editar um curso que já foi finalizado.' }, { status: 400 })
    }

    if (!title?.trim() || !description?.trim() || !startDate || !endDate || !vagasLimit) {
      return NextResponse.json({ error: 'Preencha todos os campos obrigatórios.' }, { status: 400 })
    }

    const vagas = parseInt(vagasLimit)
    if (isNaN(vagas) || vagas < 1 || vagas > 99) {
      return NextResponse.json({ error: 'O limite de vagas deve ser um número entre 1 e 99.' }, { status: 400 })
    }

    course.title = title.trim()
    course.description = description.trim()
    course.startDate = startDate
    course.endDate = endDate
    course.vagasLimit = vagas

    await writeCourses(courses)
    await broadcastUpdate()

    return NextResponse.json({ success: true, course })
  }

  if (action === 'delete') {
    const { id } = body
    const courseIndex = courses.findIndex(c => c.id === id)
    if (courseIndex === -1) {
      return NextResponse.json({ error: 'Curso não encontrado.' }, { status: 404 })
    }

    const course = courses[courseIndex]
    const canManage = isAuthorizedToManage || course.creatorId === requester.id
    if (!canManage) {
      return NextResponse.json({ error: 'Sem permissão para excluir este curso.' }, { status: 403 })
    }

    // Check if course has ended
    const nowStr = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(new Date()).replace(' ', 'T')

    if (course.endDate < nowStr) {
      return NextResponse.json({ error: 'Não é possível excluir um curso que já foi finalizado.' }, { status: 400 })
    }

    courses.splice(courseIndex, 1)
    await writeCourses(courses)
    await broadcastUpdate()

    return NextResponse.json({ success: true })
  }

  if (action === 'subscribe') {
    const { id } = body
    const course = courses.find(c => c.id === id)
    if (!course) {
      return NextResponse.json({ error: 'Curso não encontrado.' }, { status: 404 })
    }

    const nowStr = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(new Date()).replace(' ', 'T')

    // Inscrição só até o horário de início
    if (course.startDate <= nowStr) {
      return NextResponse.json({ error: 'As inscrições para este curso já foram encerradas (curso iniciado ou em andamento).' }, { status: 400 })
    }

    // Verificar duplicidade
    const jaInscrito = course.subscribers.some(s => s.userId === requester.id)
    if (jaInscrito) {
      return NextResponse.json({ error: 'Você já está inscrito neste curso.' }, { status: 400 })
    }

    // Verificar limite de vagas
    if (course.subscribers.length >= course.vagasLimit) {
      return NextResponse.json({ error: 'As vagas para este curso já estão esgotadas.' }, { status: 400 })
    }

    course.subscribers.push({
      userId: requester.id,
      qra: requesterMeta.qra || requesterMeta.username || 'Oficial',
      username: requesterMeta.username || '',
      subscribedAt: new Date().toISOString()
    })

    await writeCourses(courses)
    await broadcastUpdate()

    return NextResponse.json({ success: true, course })
  }

  if (action === 'unsubscribe') {
    const { id } = body
    const course = courses.find(c => c.id === id)
    if (!course) {
      return NextResponse.json({ error: 'Curso não encontrado.' }, { status: 404 })
    }

    const nowStr = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(new Date()).replace(' ', 'T')

    // Cancelamento só até o início
    if (course.startDate <= nowStr) {
      return NextResponse.json({ error: 'Não é possível cancelar a inscrição de um curso que já começou.' }, { status: 400 })
    }

    const index = course.subscribers.findIndex(s => s.userId === requester.id)
    if (index === -1) {
      return NextResponse.json({ error: 'Você não está inscrito neste curso.' }, { status: 400 })
    }

    course.subscribers.splice(index, 1)

    await writeCourses(courses)
    await broadcastUpdate()

    return NextResponse.json({ success: true, course })
  }

  if (action === 'evaluate-subscriber') {
    if (!isAuthorizedToManage) {
      return NextResponse.json({ error: 'Permissão insuficiente para avaliar participantes.' }, { status: 403 })
    }

    const { id, userId, status, nota } = body
    if (!id || !userId || !status || nota === undefined) {
      return NextResponse.json({ error: 'Dados insuficientes para a avaliação.' }, { status: 400 })
    }

    const course = courses.find(c => c.id === id)
    if (!course) {
      return NextResponse.json({ error: 'Curso não encontrado.' }, { status: 404 })
    }

    if (status !== 'Aprovado' && status !== 'Reprovado') {
      return NextResponse.json({ error: 'Status de avaliação inválido.' }, { status: 400 })
    }

    const grade = parseFloat(nota)
    if (isNaN(grade) || grade < 0 || grade > 10) {
      return NextResponse.json({ error: 'A nota deve ser um número entre 0 e 10.' }, { status: 400 })
    }

    // Ensure evaluations record exists
    if (!course.evaluations) {
      course.evaluations = {}
    }

    // Verify subscriber exists
    const hasSubscriber = course.subscribers.some(s => s.userId === userId)
    if (!hasSubscriber) {
      return NextResponse.json({ error: 'Usuário não inscrito neste curso.' }, { status: 400 })
    }

    course.evaluations[userId] = {
      status,
      nota: grade,
      evaluatedBy: requesterMeta.qra || requesterMeta.username || 'Oficial',
      evaluatedAt: new Date().toISOString()
    }

    await writeCourses(courses)
    await broadcastUpdate()

    return NextResponse.json({ success: true, course })
  }

  if (action === 'mark-read') {
    const { id } = body
    const course = courses.find(c => c.id === id)
    if (!course) {
      return NextResponse.json({ error: 'Curso não encontrado.' }, { status: 404 })
    }

    if (!course.readBy.includes(requester.id)) {
      course.readBy.push(requester.id)
      await writeCourses(courses)
      await broadcastUpdate()
    }

    return NextResponse.json({ success: true, course })
  }

  return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 })
}
