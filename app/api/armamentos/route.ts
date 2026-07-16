import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

export interface Armamento {
  id: string
  name: string
  photoUrl: string | null
  code: string
  category: string
  minPatente: string
  allowedUnits: string[]
  createdAt: string
}

async function readArmamentos(): Promise<Armamento[]> {
  const admin = getAdminClient()
  if (!admin) return []
  try {
    const { data, error } = await admin
      .from('armamentos')
      .select('*')
      .order('created_at', { ascending: false })
    if (error || !data) return []
    return data.map((row: any) => ({
      id: row.id,
      name: row.name,
      photoUrl: row.photo_url,
      code: row.code,
      category: row.category,
      minPatente: row.min_patente,
      allowedUnits: Array.isArray(row.allowed_units) ? row.allowed_units : [],
      createdAt: row.created_at || new Date().toISOString()
    }))
  } catch (err) {
    console.error('Database armamentos read error:', err)
    return []
  }
}

export async function GET(req: NextRequest) {
  const armamentos = await readArmamentos()
  return NextResponse.json({ armamentos })
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

  if (!isAltoComando) {
    return NextResponse.json({ error: 'Apenas membros do Alto Comando podem gerenciar armamentos.' }, { status: 403 })
  }

  const body = await req.json()
  const { action } = body

  if (action === 'create') {
    const { name, photoUrl, code, category, minPatente, allowedUnits } = body
    if (!name?.trim() || !category?.trim() || !minPatente) {
      return NextResponse.json({ error: 'Preencha todos os campos obrigatórios.' }, { status: 400 })
    }

    const finalCode = code?.trim() || `ARM-${Math.floor(1000 + Math.random() * 9000)}`
    const minPatenteStr = Array.isArray(minPatente) ? JSON.stringify(minPatente) : String(minPatente).trim()

    const newArmamento = {
      id: Math.random().toString(36).substring(2, 15),
      name: name.trim(),
      photo_url: photoUrl?.trim() || null,
      code: finalCode,
      category: category.trim(),
      min_patente: minPatenteStr,
      allowed_units: Array.isArray(allowedUnits) ? allowedUnits : [],
      created_at: new Date().toISOString()
    }

    const { error } = await admin.from('armamentos').insert(newArmamento)
    if (error) {
      return NextResponse.json({ error: 'Erro ao inserir no banco de dados.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, armamento: newArmamento })
  }

  if (action === 'edit') {
    const { id, name, photoUrl, code, category, minPatente, allowedUnits } = body
    if (!id) {
      return NextResponse.json({ error: 'ID do armamento é obrigatório.' }, { status: 400 })
    }

    const finalCode = code?.trim() || `ARM-${Math.floor(1000 + Math.random() * 9000)}`
    const minPatenteStr = Array.isArray(minPatente) ? JSON.stringify(minPatente) : minPatente ? String(minPatente).trim() : 'Recruta'

    const updated = {
      name: name?.trim(),
      photo_url: photoUrl?.trim() || null,
      code: finalCode,
      category: category?.trim(),
      min_patente: minPatenteStr,
      allowed_units: Array.isArray(allowedUnits) ? allowedUnits : [],
    }

    const { error } = await admin.from('armamentos').update(updated).eq('id', id)
    if (error) {
      return NextResponse.json({ error: 'Erro ao atualizar armamento.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  }

  if (action === 'delete') {
    const { id } = body
    if (!id) {
      return NextResponse.json({ error: 'ID do armamento é obrigatório.' }, { status: 400 })
    }

    const { error } = await admin.from('armamentos').delete().eq('id', id)
    if (error) {
      return NextResponse.json({ error: 'Erro ao excluir armamento.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 })
}
