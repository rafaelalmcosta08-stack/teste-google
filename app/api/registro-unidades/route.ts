import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

// GET /api/registro-unidades — Lista solicitações
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

  const cargos = requesterMeta.cargo ?? []
  const isAdmin = requesterMeta.role === 'admin'
  const isAltoComando = cargos.includes('Alto Comando') || isAdmin

  const isRequester = cargos.some((c: string) =>
    ['Comando Bope', 'Comando Core', 'Comando GAR', 'Comando GAEP', 'Comando GTM', 'Diretor APM', 'Diretor Corregedoria'].includes(c)
  )

  // Permitir que qualquer usuário aprovado consulte as solicitações, porém restringindo o escopo:
  // - Alto Comando vê tudo
  // - Demais usuários veem apenas se forem o requerente ou o oficial alvo (marcado)
  let query = admin.from('registro_unidades').select('*')
  
  if (!isAltoComando) {
    query = query.or(`requerente_id.eq.${requester.id},oficial_id.eq.${requester.id}`)
  }

  const { data: solicitacoes, error } = await query.order('created_at', { ascending: false })
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ solicitacoes })
}

// POST /api/registro-unidades — Cria nova solicitação de registro
export async function POST(req: NextRequest) {
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

  const { oficialId, oficialQra, oficialUsername, unidade } = await req.json()

  if (!oficialId || !oficialQra || !oficialUsername || !unidade) {
    return NextResponse.json({ error: 'Dados incompletos para a solicitação.' }, { status: 400 })
  }

  // Validar se o requerente tem o cargo correto para solicitar para aquela unidade específica
  const cargos = requesterMeta.cargo ?? []
  const isAdmin = requesterMeta.role === 'admin'
  const isAltoComando = cargos.includes('Alto Comando') || isAdmin

  const isPatente = unidade.startsWith('patente:')

  if (isPatente) {
    const patenteNome = unidade.replace('patente:', '')
    const validPatentes = [
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
      'Recruta'
    ]
    if (!validPatentes.includes(patenteNome)) {
      return NextResponse.json({ error: 'Patente inválida.' }, { status: 400 })
    }

    const isComandante = cargos.some((c: string) =>
      ['Comando Bope', 'Comando Core', 'Comando GAR', 'Comando GAEP', 'Comando GTM', 'Diretor APM', 'Diretor Corregedoria'].includes(c)
    )

    if (!isAltoComando && !isComandante) {
      return NextResponse.json({
        error: 'Você não tem permissão para solicitar alteração de patente. Apenas comandantes ou Alto Comando.'
      }, { status: 403 })
    }
  } else {
    // Regras de unidade e cargo do comandante solicitante
    const UNIT_COMMANDERS: Record<string, string> = {
      'BOPE': 'Comando Bope',
      'CORE': 'Comando Core',
      'GAR': 'Comando GAR',
      'GAEP': 'Comando GAEP',
      'GTM': 'Comando GTM',
      'APM': 'Diretor APM',
      'Corregedoria': 'Diretor Corregedoria'
    }

    const requiredCargo = UNIT_COMMANDERS[unidade]
    if (!requiredCargo) {
      return NextResponse.json({ error: 'Unidade de destino inválida.' }, { status: 400 })
    }

    if (!isAltoComando && !cargos.includes(requiredCargo)) {
      return NextResponse.json({
        error: `Você não tem permissão para solicitar registro para a unidade ${unidade}. Requer o cargo ${requiredCargo}.`
      }, { status: 403 })
    }
  }

  // Regra: um oficial só pode ter 1 solicitação pendente por vez.
  const { data: existing, error: checkError } = await admin
    .from('registro_unidades')
    .select('id')
    .eq('oficial_id', oficialId)
    .eq('status', 'pendente')
    .limit(1)

  if (checkError) {
    return NextResponse.json({
      error: `Erro ao validar solicitação pendente: ${checkError.message}. Se a tabela não existir ou faltar permissão, acesse /setup para executar a migração SQL e aplicar os GRANTs.`
    }, { status: 500 })
  }

  if (existing && existing.length > 0) {
    return NextResponse.json({
      error: `O oficial ${oficialQra} já possui uma solicitação de registro pendente em andamento.`
    }, { status: 400 })
  }

  const uuid = crypto.randomUUID()
  const requesterQra = requesterMeta.qra || requesterMeta.username || 'Comandante'

  const { error: insertError } = await admin
    .from('registro_unidades')
    .insert({
      id: uuid,
      oficial_id: oficialId,
      oficial_qra: oficialQra,
      oficial_username: oficialUsername,
      unidade,
      requerente_id: requester.id,
      requerente_qra: requesterQra,
      status: 'pendente'
    })

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  // Log de Auditoria
  try {
    const { writeAuditLog } = await import('@/lib/audit')
    await writeAuditLog({
      whoId: requester.id,
      whoQra: requesterQra,
      action: isPatente ? 'SOLICITACAO_REGISTRO_PATENTE' : 'SOLICITACAO_REGISTRO_UNIDADE',
      targetUser: oficialQra,
      description: isPatente
        ? `Solicitou registro da patente ${unidade.replace('patente:', '')} para o oficial ${oficialQra} (${oficialUsername})`
        : `Solicitou registro da unidade ${unidade} para o oficial ${oficialQra} (${oficialUsername})`
    })
  } catch (err) {
    console.error('Erro ao escrever log de auditoria:', err)
  }

  return NextResponse.json({ success: true, message: 'Solicitação enviada com sucesso!' })
}

// PATCH /api/registro-unidades — Aprova ou Recusa solicitação (Exclusivo Alto Comando)
export async function PATCH(req: NextRequest) {
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

  const cargos = requesterMeta.cargo ?? []
  const isAdmin = requesterMeta.role === 'admin'
  const isAltoComando = cargos.includes('Alto Comando') || isAdmin

  if (!isAltoComando) {
    return NextResponse.json({ error: 'Acesso negado. Apenas o Alto Comando pode aprovar/recusar solicitações.' }, { status: 403 })
  }

  const { requestId, action } = await req.json()

  if (!requestId || !['aceitar', 'recusar'].includes(action)) {
    return NextResponse.json({ error: 'Parâmetros inválidos.' }, { status: 400 })
  }

  // 1. Obter a solicitação
  const { data: solicitacao, error: fetchReqError } = await admin
    .from('registro_unidades')
    .select('*')
    .eq('id', requestId)
    .single()

  if (fetchReqError || !solicitacao) {
    return NextResponse.json({ error: 'Solicitação não encontrada.' }, { status: 404 })
  }

  if (solicitacao.status !== 'pendente') {
    return NextResponse.json({ error: 'Esta solicitação já foi processada.' }, { status: 400 })
  }

  const requesterQra = requesterMeta.qra || requesterMeta.username || 'Alto Comando'

  const isPatente = solicitacao.unidade.startsWith('patente:')

  if (action === 'recusar') {
    // Atualizar status para recusado
    const { error: updateError } = await admin
      .from('registro_unidades')
      .update({ status: 'recusado' })
      .eq('id', requestId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Log de auditoria
    try {
      const { writeAuditLog } = await import('@/lib/audit')
      await writeAuditLog({
        whoId: requester.id,
        whoQra: requesterQra,
        action: isPatente ? 'RECUSA_REGISTRO_PATENTE' : 'RECUSA_REGISTRO_UNIDADE',
        targetUser: solicitacao.oficial_qra,
        description: isPatente
          ? `Recusou a solicitação de patente ${solicitacao.unidade.replace('patente:', '')} para ${solicitacao.oficial_qra}`
          : `Recusou a solicitação de registro de unidade ${solicitacao.unidade} para ${solicitacao.oficial_qra}`
      })
    } catch (err) {
      console.error(err)
    }

    return NextResponse.json({ success: true, message: 'Solicitação recusada e arquivada.' })
  }

  // Se action === 'aceitar'
  // 1. Obter os metadados atuais do oficial
  const { data: targetUser, error: targetError } = await admin.auth.admin.getUserById(solicitacao.oficial_id)
  if (targetError || !targetUser?.user) {
    return NextResponse.json({ error: 'Oficial não encontrado no sistema de autenticação.' }, { status: 404 })
  }

  const targetMeta = targetUser.user.user_metadata ?? {}
  const targetCargos: string[] = targetMeta.cargo ?? []

  // Mapeamento de Cargo/Tag automática
  let novoMeta = { ...targetMeta }
  const unidade = solicitacao.unidade

  if (isPatente) {
    const patenteNome = unidade.replace('patente:', '')
    novoMeta.patente = patenteNome

    // Update in profiles table in database too!
    const { error: profileUpdateError } = await admin
      .from('profiles')
      .update({ patente: patenteNome })
      .eq('id', solicitacao.oficial_id)
    
    if (profileUpdateError) {
      console.error('Erro ao atualizar perfil do oficial no banco:', profileUpdateError)
    }
  } else {
    if (['BOPE', 'CORE', 'GAR', 'GAEP', 'GTM'].includes(unidade)) {
      novoMeta.unidade_operacional = unidade
      
      let tag = ''
      if (unidade === 'BOPE') tag = 'Probatório Bope'
      else if (unidade === 'CORE') tag = 'Probatório Core'
      else if (unidade === 'GAR') tag = 'Membro GAR'
      else if (unidade === 'GAEP') tag = 'Membro GAEP'
      else if (unidade === 'GTM') tag = 'Membro GTM'

      if (tag && !targetCargos.includes(tag)) {
        novoMeta.cargo = [...targetCargos, tag]
      }
    } else if (['APM', 'Corregedoria'].includes(unidade)) {
      novoMeta.unidade_administrativa = unidade

      let tag = ''
      if (unidade === 'APM') tag = 'Supervisor APM'
      else if (unidade === 'Corregedoria') tag = 'Membro Corregedoria'

      if (tag && !targetCargos.includes(tag)) {
        novoMeta.cargo = [...targetCargos, tag]
      }
    }
  }

  // 2. Atualizar metadados no Supabase Auth
  const { error: authUpdateError } = await admin.auth.admin.updateUserById(solicitacao.oficial_id, {
    user_metadata: novoMeta
  })

  if (authUpdateError) {
    return NextResponse.json({ error: `Erro ao atualizar cadastro do oficial: ${authUpdateError.message}` }, { status: 500 })
  }

  // 3. Atualizar status da solicitação para aceito
  const { error: updateReqError } = await admin
    .from('registro_unidades')
    .update({ status: 'aceito' })
    .eq('id', requestId)

  if (updateReqError) {
    return NextResponse.json({ error: updateReqError.message }, { status: 500 })
  }

  // 4. Auditoria
  try {
    const { writeAuditLog } = await import('@/lib/audit')
    await writeAuditLog({
      whoId: requester.id,
      whoQra: requesterQra,
      action: isPatente ? 'APROVACAO_REGISTRO_PATENTE' : 'APROVACAO_REGISTRO_UNIDADE',
      targetUser: solicitacao.oficial_qra,
      description: isPatente
        ? `Aprovou a patente ${unidade.replace('patente:', '')} para o oficial ${solicitacao.oficial_qra} no sistema de hierarquia.`
        : `Aprovou registro da unidade ${solicitacao.unidade} para o oficial ${solicitacao.oficial_qra}, atualizando seus cargos/tags automaticamente.`
    })
  } catch (err) {
    console.error(err)
  }

  // 5. Broadcast SSE Event para sincronização instantânea em tempo real no painel
  try {
    const { broadcastEvent } = await import('@/app/api/events/route')
    broadcastEvent('permissions-updated', {
      id: solicitacao.oficial_id,
      role: novoMeta.role,
      patente: novoMeta.patente,
      cargo: novoMeta.cargo,
      unidade_administrativa: novoMeta.unidade_administrativa,
      unidade_operacional: novoMeta.unidade_operacional,
      status_atividade: novoMeta.status_atividade ?? 'Ativo',
      cursos: novoMeta.cursos ?? [],
      advertencia: novoMeta.advertencia ?? []
    })
  } catch (err) {
    console.error('Erro ao emitir SSE:', err)
  }

  return NextResponse.json({ success: true, message: 'Solicitação aprovada e tags atribuídas ao oficial!' })
}
