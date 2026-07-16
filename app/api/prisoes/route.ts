import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

export interface Prisao {
  id: string
  presoNome: string
  presoRg: string
  motivo: string
  dataHora: string
  oficialNome: string
  oficialQra: string
  oficialId: string
  observacoes: string | null
  createdAt: string
}

async function readPrisoes(): Promise<Prisao[]> {
  const admin = getAdminClient()
  if (!admin) return []
  try {
    const { data, error } = await admin
      .from('prisoes')
      .select('*')
      .order('data_hora', { ascending: false })
    if (error || !data) return []
    return data.map((row: any) => ({
      id: row.id,
      presoNome: row.preso_nome,
      presoRg: row.preso_rg,
      motivo: row.motivo,
      dataHora: row.data_hora,
      oficialNome: row.oficial_nome,
      oficialQra: row.oficial_qra,
      oficialId: row.oficial_id,
      observacoes: row.observacoes,
      createdAt: row.created_at || new Date().toISOString()
    }))
  } catch (err) {
    console.error('Database prisoes read error:', err)
    return []
  }
}

export async function GET(req: NextRequest) {
  const prisoes = await readPrisoes()
  return NextResponse.json({ prisoes })
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

  const myCargos: string[] = requesterMeta.cargo ?? []
  const isAltoComando = myCargos.includes('Alto Comando') || requesterMeta.role === 'admin'
  const isCorregedoria = myCargos.includes('Diretor Corregedoria')

  const body = await req.json()
  const { action } = body

  if (action === 'create') {
    const { presoNome, presoRg, motivo, dataHora, observacoes } = body
    if (!presoNome?.trim() || !presoRg?.trim() || !motivo?.trim()) {
      return NextResponse.json({ error: 'Preencha todos os campos obrigatórios.' }, { status: 400 })
    }

    const newPrisao = {
      id: Math.random().toString(36).substring(2, 15),
      preso_nome: presoNome.trim(),
      preso_rg: presoRg.trim(),
      motivo: motivo.trim(),
      data_hora: dataHora ? new Date(dataHora).toISOString() : new Date().toISOString(),
      oficial_nome: requesterMeta.username || 'Oficial',
      oficial_qra: requesterMeta.qra || requesterMeta.username || 'Oficial',
      oficial_id: requester.id,
      observacoes: observacoes?.trim() || null,
      created_at: new Date().toISOString()
    }

    const { error } = await admin.from('prisoes').insert(newPrisao)
    if (error) {
      return NextResponse.json({ error: 'Erro ao registrar prisão.' }, { status: 500 })
    }

    // Log de auditoria
    try {
      const { writeAuditLog } = await import('@/lib/audit')
      await writeAuditLog({
        whoId: requester.id,
        whoQra: requesterMeta.qra || requesterMeta.username || 'Oficial',
        action: 'REGISTRO_PRISAO',
        targetUser: newPrisao.preso_nome,
        description: `Registrou a prisão de ${newPrisao.preso_nome} (RG: ${newPrisao.preso_rg}) por motivo: ${newPrisao.motivo}`
      })
    } catch (e) {
      console.error('Failed to write audit log for prison create:', e)
    }

    return NextResponse.json({ success: true, prisao: newPrisao })
  }

  if (action === 'edit') {
    const { id, presoNome, presoRg, motivo, dataHora, observacoes } = body
    if (!id) {
      return NextResponse.json({ error: 'ID da prisão é obrigatório.' }, { status: 400 })
    }

    // Buscar o registro original para verificar permissão
    const { data: original, error: fetchErr } = await admin.from('prisoes').select('*').eq('id', id).single()
    if (fetchErr || !original) {
      return NextResponse.json({ error: 'Registro de prisão não encontrado.' }, { status: 404 })
    }

    const isOwner = original.oficial_id === requester.id
    const hasPermission = isOwner || isAltoComando || isCorregedoria

    if (!hasPermission) {
      return NextResponse.json({ error: 'Você não possui permissão para editar este registro.' }, { status: 403 })
    }

    const updated = {
      preso_nome: presoNome?.trim(),
      preso_rg: presoRg?.trim(),
      motivo: motivo?.trim(),
      data_hora: dataHora ? new Date(dataHora).toISOString() : original.data_hora,
      observacoes: observacoes?.trim() || null,
    }

    const { error } = await admin.from('prisoes').update(updated).eq('id', id)
    if (error) {
      return NextResponse.json({ error: 'Erro ao atualizar registro de prisão.' }, { status: 500 })
    }

    // Log de auditoria
    try {
      const { writeAuditLog } = await import('@/lib/audit')
      await writeAuditLog({
        whoId: requester.id,
        whoQra: requesterMeta.qra || requesterMeta.username || 'Oficial',
        action: 'EDICAO_PRISAO',
        targetUser: updated.preso_nome || 'Preso',
        description: `Editou o registro de prisão de ${updated.preso_nome || original.preso_nome}`
      })
    } catch (e) {
      console.error('Failed to write audit log for prison edit:', e)
    }

    return NextResponse.json({ success: true })
  }

  if (action === 'delete') {
    const { id } = body
    if (!id) {
      return NextResponse.json({ error: 'ID da prisão é obrigatório.' }, { status: 400 })
    }

    // Buscar o registro original para verificar permissão
    const { data: original, error: fetchErr } = await admin.from('prisoes').select('*').eq('id', id).single()
    if (fetchErr || !original) {
      return NextResponse.json({ error: 'Registro de prisão não encontrado.' }, { status: 404 })
    }

    const isOwner = original.oficial_id === requester.id
    const hasPermission = isOwner || isAltoComando || isCorregedoria

    if (!hasPermission) {
      return NextResponse.json({ error: 'Você não possui permissão para excluir este registro.' }, { status: 403 })
    }

    const { error } = await admin.from('prisoes').delete().eq('id', id)
    if (error) {
      return NextResponse.json({ error: 'Erro ao excluir registro de prisão.' }, { status: 500 })
    }

    // Log de auditoria
    try {
      const { writeAuditLog } = await import('@/lib/audit')
      await writeAuditLog({
        whoId: requester.id,
        whoQra: requesterMeta.qra || requesterMeta.username || 'Oficial',
        action: 'EXCLUSAO_PRISAO',
        targetUser: original.preso_nome,
        description: `Excluiu o registro de prisão de ${original.preso_nome} (RG: ${original.preso_rg})`
      })
    } catch (e) {
      console.error('Failed to write audit log for prison delete:', e)
    }

    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 })
}
