import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

const DATA_FILE = path.join(process.cwd(), 'editais-data.json')

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

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

async function readEditais(): Promise<Edital[]> {
  const admin = getAdminClient()
  if (admin) {
    try {
      const { data, error } = await admin.from('editais').select('*')
      if (!error && data) {
        if (data.length === 0) {
          try {
            const localContent = await fs.readFile(DATA_FILE, 'utf8')
            const localEditais = JSON.parse(localContent) as Edital[]
            if (localEditais.length > 0) {
              const toInsert = localEditais.map(e => ({
                id: e.id,
                title: e.title,
                description: e.description,
                requirements: e.requirements,
                unidade: e.unidade,
                link_formulario: e.linkFormulario,
                end_date: e.endDate,
                creator_id: e.creatorId,
                creator_qra: e.creatorQra,
                created_at: e.createdAt,
                subscribers: e.subscribers || [],
                evaluations: e.evaluations || {}
              }))
              await admin.from('editais').insert(toInsert)
              return localEditais
            }
          } catch (_) {}
        }
        return data.map((row: any) => ({
          id: row.id,
          title: row.title,
          description: row.description,
          requirements: row.requirements,
          unidade: row.unidade as any,
          linkFormulario: row.link_formulario,
          endDate: row.end_date,
          creatorId: row.creator_id,
          creatorQra: row.creator_qra,
          createdAt: row.created_at || new Date().toISOString(),
          subscribers: Array.isArray(row.subscribers) ? row.subscribers : [],
          evaluations: row.evaluations || {}
        }))
      }
    } catch (err) {
      console.error('Database editais read error:', err)
    }
  }

  try {
    const content = await fs.readFile(DATA_FILE, 'utf8')
    return JSON.parse(content)
  } catch (err) {
    return []
  }
}

async function writeEditais(editais: Edital[]) {
  const admin = getAdminClient()
  if (admin) {
    try {
      const toInsert = editais.map(e => ({
        id: e.id,
        title: e.title,
        description: e.description,
        requirements: e.requirements,
        unidade: e.unidade,
        link_formulario: e.linkFormulario,
        end_date: e.endDate,
        creator_id: e.creatorId,
        creator_qra: e.creatorQra,
        created_at: e.createdAt,
        subscribers: e.subscribers || [],
        evaluations: e.evaluations || {}
      }))

      const ids = editais.map(e => e.id)
      if (ids.length > 0) {
        await admin.from('editais').delete().not('id', 'in', `(${ids.join(',')})`)
        await admin.from('editais').upsert(toInsert)
      } else {
        await admin.from('editais').delete().neq('id', 'placeholder_nonexistent')
      }
    } catch (err) {
      console.error('Database editais write error:', err)
    }
  }

  await fs.writeFile(DATA_FILE, JSON.stringify(editais, null, 2), 'utf8')
}

async function broadcastUpdate() {
  try {
    const { broadcastEvent } = await import('@/app/api/events/route')
    broadcastEvent('editais-updated', {})
  } catch (err) {
    console.error('Failed to broadcast editais update', err)
  }
}

export async function GET(req: NextRequest) {
  const editais = await readEditais()
  return NextResponse.json({ editais })
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
  const isSiteAdmin = requesterMeta.role === 'admin'
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

  const isAuthorizedToManage =
    isAllPowerfulEditalPublisher ||
    isBopeCommand ||
    isCoreCommand ||
    isGarCommand ||
    isGaepCommand ||
    isGtmCommand

  const editais = await readEditais()

  // Get current Brasília time
  const nowStr = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(new Date()).replace(' ', 'T')

  if (action === 'create') {
    if (!isAuthorizedToManage) {
      return NextResponse.json({ error: 'Permissão insuficiente para criar editais.' }, { status: 403 })
    }

    const { title, description, requirements, unidade, linkFormulario, endDate } = body
    if (!title?.trim() || !description?.trim() || !requirements?.trim() || !unidade || !linkFormulario?.trim() || !endDate) {
      return NextResponse.json({ error: 'Preencha todos os campos obrigatórios.' }, { status: 400 })
    }

    // URL validation
    try {
      new URL(linkFormulario)
    } catch {
      return NextResponse.json({ error: 'O link do formulário deve ser uma URL válida.' }, { status: 400 })
    }

    // Unit restriction enforcement
    if (!isAllPowerfulEditalPublisher) {
      if (isBopeCommand && unidade !== 'BOPE') {
        return NextResponse.json({ error: 'Você só pode publicar editais para a unidade BOPE.' }, { status: 403 })
      }
      if (isCoreCommand && unidade !== 'CORE') {
        return NextResponse.json({ error: 'Você só pode publicar editais para a unidade CORE.' }, { status: 403 })
      }
      if (isGarCommand && unidade !== 'GAR') {
        return NextResponse.json({ error: 'Você só pode publicar editais para a unidade GAR.' }, { status: 403 })
      }
      if (isGaepCommand && unidade !== 'GAEP') {
        return NextResponse.json({ error: 'Você só pode publicar editais para a unidade GAEP.' }, { status: 403 })
      }
      if (isGtmCommand && unidade !== 'GTM') {
        return NextResponse.json({ error: 'Você só pode publicar editais para a unidade GTM.' }, { status: 403 })
      }
    }

    const newEdital: Edital = {
      id: Math.random().toString(36).substring(2, 15),
      title: title.trim(),
      description: description.trim(),
      requirements: requirements.trim(),
      unidade,
      linkFormulario: linkFormulario.trim(),
      endDate,
      creatorId: requester.id,
      creatorQra: requesterMeta.qra || requesterMeta.username || 'Oficial',
      createdAt: new Date().toISOString(),
      subscribers: []
    }

    editais.push(newEdital)
    await writeEditais(editais)
    await broadcastUpdate()

    return NextResponse.json({ success: true, edital: newEdital })
  }

  if (action === 'edit') {
    const { id, title, description, requirements, unidade, linkFormulario, endDate } = body
    const editalIndex = editais.findIndex(e => e.id === id)
    if (editalIndex === -1) {
      return NextResponse.json({ error: 'Edital não encontrado.' }, { status: 404 })
    }

    const edital = editais[editalIndex]

    // Check unit / permission
    if (!isAllPowerfulEditalPublisher) {
      const isOwner = edital.creatorId === requester.id
      const unitMatch =
        (isBopeCommand && edital.unidade === 'BOPE') ||
        (isCoreCommand && edital.unidade === 'CORE') ||
        (isGarCommand && edital.unidade === 'GAR') ||
        (isGaepCommand && edital.unidade === 'GAEP') ||
        (isGtmCommand && edital.unidade === 'GTM')

      if (!unitMatch && !isOwner) {
        return NextResponse.json({ error: 'Sem permissão para gerenciar este edital.' }, { status: 403 })
      }
    }

    // Check if edital has closed
    if (edital.endDate < nowStr) {
      return NextResponse.json({ error: 'Não é possível editar um edital que já foi encerrado.' }, { status: 400 })
    }

    if (!title?.trim() || !description?.trim() || !requirements?.trim() || !unidade || !linkFormulario?.trim() || !endDate) {
      return NextResponse.json({ error: 'Preencha todos os campos obrigatórios.' }, { status: 400 })
    }

    // URL validation
    try {
      new URL(linkFormulario)
    } catch {
      return NextResponse.json({ error: 'O link do formulário deve ser uma URL válida.' }, { status: 400 })
    }

    // Check unit restriction for the updated unit as well
    if (!isAllPowerfulEditalPublisher) {
      if (isBopeCommand && unidade !== 'BOPE') {
        return NextResponse.json({ error: 'Você só pode alterar o edital para a unidade BOPE.' }, { status: 403 })
      }
      if (isCoreCommand && unidade !== 'CORE') {
        return NextResponse.json({ error: 'Você só pode alterar o edital para a unidade CORE.' }, { status: 403 })
      }
      if (isGarCommand && unidade !== 'GAR') {
        return NextResponse.json({ error: 'Você só pode alterar o edital para a unidade GAR.' }, { status: 403 })
      }
      if (isGaepCommand && unidade !== 'GAEP') {
        return NextResponse.json({ error: 'Você só pode alterar o edital para a unidade GAEP.' }, { status: 403 })
      }
      if (isGtmCommand && unidade !== 'GTM') {
        return NextResponse.json({ error: 'Você só pode alterar o edital para a unidade GTM.' }, { status: 403 })
      }
    }

    edital.title = title.trim()
    edital.description = description.trim()
    edital.requirements = requirements.trim()
    edital.unidade = unidade
    edital.linkFormulario = linkFormulario.trim()
    edital.endDate = endDate

    await writeEditais(editais)
    await broadcastUpdate()

    return NextResponse.json({ success: true, edital })
  }

  if (action === 'delete') {
    const { id } = body
    const editalIndex = editais.findIndex(e => e.id === id)
    if (editalIndex === -1) {
      return NextResponse.json({ error: 'Edital não encontrado.' }, { status: 404 })
    }

    const edital = editais[editalIndex]

    // Check unit / permission
    if (!isAllPowerfulEditalPublisher) {
      const isOwner = edital.creatorId === requester.id
      const unitMatch =
        (isBopeCommand && edital.unidade === 'BOPE') ||
        (isCoreCommand && edital.unidade === 'CORE') ||
        (isGarCommand && edital.unidade === 'GAR') ||
        (isGaepCommand && edital.unidade === 'GAEP') ||
        (isGtmCommand && edital.unidade === 'GTM')

      if (!unitMatch && !isOwner) {
        return NextResponse.json({ error: 'Sem permissão para excluir este edital.' }, { status: 403 })
      }
    }

    // Check if edital has closed
    if (edital.endDate < nowStr) {
      return NextResponse.json({ error: 'Não é possível excluir um edital que já foi encerrado.' }, { status: 400 })
    }

    editais.splice(editalIndex, 1)
    await writeEditais(editais)
    await broadcastUpdate()

    return NextResponse.json({ success: true })
  }

  if (action === 'subscribe') {
    const { id } = body
    const edital = editais.find(e => e.id === id)
    if (!edital) {
      return NextResponse.json({ error: 'Edital não encontrado.' }, { status: 404 })
    }

    if (edital.endDate <= nowStr) {
      return NextResponse.json({ error: 'As inscrições para este edital já foram encerradas.' }, { status: 400 })
    }

    const jaInscrito = edital.subscribers.some(s => s.userId === requester.id)
    if (jaInscrito) {
      return NextResponse.json({ error: 'Você já está inscrito neste edital.' }, { status: 400 })
    }

    edital.subscribers.push({
      userId: requester.id,
      qra: requesterMeta.qra || requesterMeta.username || 'Oficial',
      username: requesterMeta.username || '',
      subscribedAt: new Date().toISOString()
    })

    await writeEditais(editais)
    await broadcastUpdate()

    return NextResponse.json({ success: true, edital })
  }

  if (action === 'unsubscribe') {
    const { id } = body
    const edital = editais.find(e => e.id === id)
    if (!edital) {
      return NextResponse.json({ error: 'Edital não encontrado.' }, { status: 404 })
    }

    if (edital.endDate <= nowStr) {
      return NextResponse.json({ error: 'Não é possível cancelar a inscrição de um edital já encerrado.' }, { status: 400 })
    }

    const index = edital.subscribers.findIndex(s => s.userId === requester.id)
    if (index === -1) {
      return NextResponse.json({ error: 'Você não está inscrito neste edital.' }, { status: 400 })
    }

    edital.subscribers.splice(index, 1)

    await writeEditais(editais)
    await broadcastUpdate()

    return NextResponse.json({ success: true, edital })
  }

  if (action === 'evaluate-subscriber') {
    const { id, userId, status, nota } = body
    if (!id || !userId || !status || nota === undefined) {
      return NextResponse.json({ error: 'Dados insuficientes para a avaliação.' }, { status: 400 })
    }

    const edital = editais.find(e => e.id === id)
    if (!edital) {
      return NextResponse.json({ error: 'Edital não encontrado.' }, { status: 404 })
    }

    // Check permission to manage evaluations for this edital
    if (!isAllPowerfulEditalPublisher) {
      const isOwner = edital.creatorId === requester.id
      const unitMatch =
        (isBopeCommand && edital.unidade === 'BOPE') ||
        (isCoreCommand && edital.unidade === 'CORE') ||
        (isGarCommand && edital.unidade === 'GAR') ||
        (isGaepCommand && edital.unidade === 'GAEP') ||
        (isGtmCommand && edital.unidade === 'GTM')

      if (!unitMatch && !isOwner) {
        return NextResponse.json({ error: 'Sem permissão para avaliar participantes deste edital.' }, { status: 403 })
      }
    }

    if (status !== 'Aprovado' && status !== 'Reprovado') {
      return NextResponse.json({ error: 'Status de avaliação inválido.' }, { status: 400 })
    }

    const grade = parseFloat(nota)
    if (isNaN(grade) || grade < 0 || grade > 10) {
      return NextResponse.json({ error: 'A nota deve ser um número entre 0 e 10.' }, { status: 400 })
    }

    if (!edital.evaluations) {
      edital.evaluations = {}
    }

    const hasSubscriber = edital.subscribers.some(s => s.userId === userId)
    if (!hasSubscriber) {
      return NextResponse.json({ error: 'Usuário não inscrito neste edital.' }, { status: 400 })
    }

    edital.evaluations[userId] = {
      status,
      nota: grade,
      evaluatedBy: requesterMeta.qra || requesterMeta.username || 'Oficial',
      evaluatedAt: new Date().toISOString()
    }

    await writeEditais(editais)
    await broadcastUpdate()

    return NextResponse.json({ success: true, edital })
  }

  return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 })
}
