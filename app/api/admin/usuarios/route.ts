import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

// GET /api/admin/usuarios — lista todos os usuários com perfil
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Não autorizado. Token ausente.' }, { status: 401 })
  }
  const token = authHeader.substring(7)

  const admin = getAdminClient()
  if (!admin) return NextResponse.json({ error: 'Configuração incompleta.' }, { status: 500 })

  const { data: { user: requester }, error: authError } = await admin.auth.getUser(token)
  if (authError || !requester) {
    return NextResponse.json({ error: 'Não autorizado. Sessão inválida.' }, { status: 401 })
  }

  const requesterMeta = requester.user_metadata ?? {}
  if (requesterMeta.status !== 'aprovado') {
    return NextResponse.json({ error: 'Não autorizado. Seu acesso foi revogado.' }, { status: 403 })
  }

  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Filtra apenas usuarios com username em user_metadata (usuarios do sistema)
  const usuarios = (data?.users ?? [])
    .filter((u) => u.user_metadata?.username)
    .map((u) => {
      const meta = u.user_metadata ?? {}
      
      // Regra de negócio: calcular status_atividade automático
      const now = new Date()
      const lastLoginStr = meta.last_login_at || u.created_at || new Date(0).toISOString()
      const lastLogin = new Date(lastLoginStr)
      const overrideStr = meta.status_atividade_override_at
      const overrideDate = overrideStr ? new Date(overrideStr) : null
      
      const referenciaDate = overrideDate && overrideDate > lastLogin ? overrideDate : lastLogin
      const diffTime = Math.abs(now.getTime() - referenciaDate.getTime())
      const diffDays = diffTime / (1000 * 60 * 60 * 24)
      
      let statusAtividadeCalculado = meta.status_atividade ?? 'Ativo'
      if (diffDays >= 15) {
        statusAtividadeCalculado = 'Inativo'
      }

      return {
        id: u.id,
        username: meta.username,
        qra: meta.qra ?? null,
        patente: meta.patente ?? null,
        status: meta.status ?? 'pendente',
        role: meta.role ?? 'user',
        created_at: u.created_at,
        cargo: meta.cargo ?? [],
        unidade_administrativa: meta.unidade_administrativa ?? 'Sem Efetividade',
        unidade_operacional: meta.unidade_operacional ?? 'Sem Efetividade',
        status_atividade: statusAtividadeCalculado,
        last_login_at: meta.last_login_at ?? null,
        status_atividade_override_at: meta.status_atividade_override_at ?? null,
        cursos: meta.cursos ?? [],
        advertencia: meta.advertencia ?? [],
      }
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return NextResponse.json({ usuarios })
}

// PATCH /api/admin/usuarios — atualiza status ou role de um usuário
export async function PATCH(req: NextRequest) {
  const {
    id,
    status,
    role,
    patente,
    cargo,
    unidade_administrativa,
    unidade_operacional,
    status_atividade,
    status_atividade_override_at,
    cursos,
    advertencia,
    last_login_at,
  } = await req.json()
  
  if (!id) return NextResponse.json({ error: 'ID ausente.' }, { status: 400 })

  // 1. Autenticação e Autorização do requisitante via token JWT do Supabase
  const authHeader = req.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Não autorizado. Token ausente.' }, { status: 401 })
  }
  const token = authHeader.substring(7)

  const admin = getAdminClient()
  if (!admin) return NextResponse.json({ error: 'Configuração incompleta.' }, { status: 500 })

  const { data: { user: requester }, error: authError } = await admin.auth.getUser(token)
  if (authError || !requester) {
    return NextResponse.json({ error: 'Não autorizado. Sessão inválida ou expirada.' }, { status: 401 })
  }

  const requesterMeta = requester.user_metadata ?? {}
  if (requesterMeta.status !== 'aprovado') {
    return NextResponse.json({ error: 'Não autorizado. Seu acesso foi revogado.' }, { status: 403 })
  }

  const isSiteAdmin = requesterMeta.role === 'admin'

  // Impede que usuários comuns alterem suas próprias permissões/cargos
  if (id === requester.id && !isSiteAdmin) {
    if (
      status !== undefined ||
      role !== undefined ||
      patente !== undefined ||
      cargo !== undefined ||
      unidade_administrativa !== undefined ||
      unidade_operacional !== undefined ||
      status_atividade !== undefined ||
      cursos !== undefined ||
      advertencia !== undefined
    ) {
      return NextResponse.json({ error: 'Não é permitido editar suas próprias permissões ou cargos.' }, { status: 403 })
    }
  }

  // Lê os metadados atuais do usuário alvo
  const { data: userData, error: fetchError } = await admin.auth.admin.getUserById(id)
  if (fetchError || !userData?.user) {
    return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 })
  }

  const metaAtual = userData.user.user_metadata ?? {}

  // 2. Validações estritas de regras de negócio no servidor
  if (!isSiteAdmin) {
    // Modificações de status e role exigem admin
    if (status !== undefined || role !== undefined) {
      return NextResponse.json({ error: 'Permissão insuficiente para alterar o status ou função.' }, { status: 403 })
    }

    // Validação de alteração de Patente
    if (patente !== undefined) {
      const promoterPatente = requesterMeta.patente
      const targetPatente = metaAtual.patente
      const allowedPromoters = ['Coronel', 'Tenente-Coronel', 'Major', 'Capitão']
      if (!promoterPatente || !allowedPromoters.includes(promoterPatente)) {
        return NextResponse.json({ error: 'Sua patente não permite promover ou rebaixar usuários.' }, { status: 403 })
      }
      const myIdx = PATENTES.indexOf(promoterPatente)
      const targetIdx = targetPatente ? PATENTES.indexOf(targetPatente) : PATENTES.length
      if (myIdx === -1 || (targetIdx !== -1 && targetIdx <= myIdx)) {
        return NextResponse.json({ error: 'Você não pode alterar a patente de alguém com patente superior ou igual à sua.' }, { status: 403 })
      }
      const newIdx = PATENTES.indexOf(patente)
      if (newIdx === -1 || newIdx <= myIdx) {
        return NextResponse.json({ error: 'Você não pode atribuir uma patente igual ou superior à sua.' }, { status: 403 })
      }
    }

    // Validação de alteração de Cargos
    if (cargo !== undefined) {
      const promoterCargos = requesterMeta.cargo ?? []
      const allowedCargos = getAllowedCargos(promoterCargos)
      const oldCargos = metaAtual.cargo ?? []
      const added = cargo.filter((c: string) => !oldCargos.includes(c))
      const removed = oldCargos.filter((c: string) => !cargo.includes(c))
      const changed = [...added, ...removed]
      for (const c of changed) {
        if (!allowedCargos.includes(c)) {
          return NextResponse.json({ error: `Você não tem permissão para alterar o cargo: ${c}.` }, { status: 403 })
        }
      }
    }

    // Validação de Unidade Administrativa
    if (unidade_administrativa !== undefined) {
      const promoterCargos = requesterMeta.cargo ?? []
      const allowedUnidades = getAllowedUnidadesAdministrativas(promoterCargos)
      if (!allowedUnidades.includes(unidade_administrativa)) {
        return NextResponse.json({ error: 'Você não tem permissão para atribuir esta unidade administrativa.' }, { status: 403 })
      }
    }

    // Validação de Unidade Operacional
    if (unidade_operacional !== undefined) {
      const promoterCargos = requesterMeta.cargo ?? []
      const allowedUnidades = getAllowedUnidadesOperacionais(promoterCargos)
      if (!allowedUnidades.includes(unidade_operacional)) {
        return NextResponse.json({ error: 'Você não tem permissão para atribuir esta unidade operacional.' }, { status: 403 })
      }
    }

    // Validação de Status de Atividade
    if (status_atividade !== undefined) {
      return NextResponse.json({ error: 'Apenas administradores do site podem alterar o status de atividade.' }, { status: 403 })
    }

    // Validação de Cursos
    if (cursos !== undefined) {
      const promoterCargos = requesterMeta.cargo ?? []
      if (!canEditCursos(promoterCargos)) {
        return NextResponse.json({ error: 'Você não tem permissão para alterar os cursos.' }, { status: 403 })
      }
    }

    // Validação de Advertências
    if (advertencia !== undefined) {
      const promoterCargos = requesterMeta.cargo ?? []
      if (!canEditAdvertencia(promoterCargos)) {
        return NextResponse.json({ error: 'Você não tem permissão para alterar as advertências.' }, { status: 403 })
      }
    }
  }

  // Prepara os novos metadados
  const novoMeta: Record<string, unknown> = { ...metaAtual }
  if (status !== undefined) novoMeta.status = status
  if (role !== undefined) novoMeta.role = role
  if (patente !== undefined) novoMeta.patente = patente
  if (cargo !== undefined) novoMeta.cargo = cargo
  if (unidade_administrativa !== undefined) novoMeta.unidade_administrativa = unidade_administrativa
  if (unidade_operacional !== undefined) novoMeta.unidade_operacional = unidade_operacional
  if (status_atividade !== undefined) novoMeta.status_atividade = status_atividade
  if (status_atividade_override_at !== undefined) novoMeta.status_atividade_override_at = status_atividade_override_at
  if (cursos !== undefined) novoMeta.cursos = cursos
  if (advertencia !== undefined) novoMeta.advertencia = advertencia
  if (last_login_at !== undefined) novoMeta.last_login_at = last_login_at

  const { error: updateError } = await admin.auth.admin.updateUserById(id, {
    user_metadata: novoMeta,
  })

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Atualiza na tabela profiles se existir (best-effort)
  if (status !== undefined) {
    await admin.from('profiles').update({ status }).eq('id', id).then(() => {}).catch(() => {})
  }
  if (role !== undefined) {
    await admin.from('profiles').update({ role }).eq('id', id).then(() => {}).catch(() => {})
  }
  if (patente !== undefined) {
    await admin.from('profiles').update({ patente }).eq('id', id).then(() => {}).catch(() => {})
  }

  // 3. Notificação instantânea via Server-Sent Events (SSE)
  try {
    const { notifyUser } = await import('@/app/api/events/route')
    if (status !== undefined && status !== 'aprovado') {
      // Usuário teve acesso revogado (status rejeitado ou pendente)
      notifyUser(id, 'access-revoked', {})
    } else {
      // Usuário teve dados de cargo/patente/permissão alterados
      notifyUser(id, 'permissions-updated', {
        id,
        role: novoMeta.role,
        patente: novoMeta.patente,
        cargo: novoMeta.cargo,
        unidade_administrativa: novoMeta.unidade_administrativa,
        unidade_operacional: novoMeta.unidade_operacional,
        status_atividade: novoMeta.status_atividade,
        cursos: novoMeta.cursos,
        advertencia: novoMeta.advertencia,
      })
    }
  } catch (err) {
    console.error('Erro ao enviar evento SSE de sincronização em tempo real:', err)
  }

  return NextResponse.json({ success: true })
}

// Constantes e Helpers para Validação Backend
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

function getMyHighestCargoIndex(cargosList: string[]) {
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

function getAllowedCargos(promoterCargos: string[] | undefined) {
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

function getAllowedUnidadesAdministrativas(promoterCargos: string[] | undefined) {
  if (!promoterCargos || promoterCargos.length === 0) return []
  const allowed = new Set<string>()
  if (promoterCargos.includes('Alto Comando')) {
    return ['Corregedoria', 'APM', 'Sem Efetividade']
  }
  if (promoterCargos.includes('Diretor Corregedoria')) {
    allowed.add('Corregedoria')
  }
  if (promoterCargos.includes('Diretor APM') || promoterCargos.includes('Supervisor APM')) {
    allowed.add('APM')
  }
  return Array.from(allowed)
}

function getAllowedUnidadesOperacionais(promoterCargos: string[] | undefined) {
  if (!promoterCargos || promoterCargos.length === 0) return []
  const allowed = new Set<string>()
  if (promoterCargos.includes('Alto Comando')) {
    return ['GAEP', 'GTM', 'GAR', 'BOPE', 'CORE', 'Sem Efetividade']
  }
  if (promoterCargos.includes('Comando Bope')) {
    allowed.add('BOPE')
  }
  if (promoterCargos.includes('Comando Core')) {
    allowed.add('CORE')
  }
  if (promoterCargos.includes('Comando GAEP')) {
    allowed.add('GAEP')
  }
  if (promoterCargos.includes('Comando GAR')) {
    allowed.add('GAR')
  }
  if (promoterCargos.includes('Comando GTM')) {
    allowed.add('GTM')
  }
  return Array.from(allowed)
}

function canEditCursos(promoterCargos: string[] | undefined) {
  if (!promoterCargos || promoterCargos.length === 0) return false
  return promoterCargos.includes('Diretor APM') || promoterCargos.includes('Supervisor APM') || promoterCargos.includes('Alto Comando')
}

function canEditAdvertencia(promoterCargos: string[] | undefined) {
  if (!promoterCargos || promoterCargos.length === 0) return false
  return promoterCargos.includes('Diretor Corregedoria') || promoterCargos.includes('Alto Comando')
}
