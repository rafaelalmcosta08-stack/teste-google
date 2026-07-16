import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { promises as fs } from 'fs'
import path from 'path'

const CHATS_FILE = path.join(process.cwd(), 'chats-data.json')
const CURSOS_FILE = path.join(process.cwd(), 'cursos-data.json')
const EDITAIS_FILE = path.join(process.cwd(), 'editais-data.json')
const AVISOS_FILE = path.join(process.cwd(), 'avisos-data.json')

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') || ''
  const query = q.trim().toLowerCase()

  if (!query) {
    return NextResponse.json({ success: true, results: { profiles: [], courses: [], editais: [], avisos: [] } })
  }

  // 1. Authenticate user
  const authHeader = req.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Não autorizado. Token ausente.' }, { status: 401 })
  }
  const token = authHeader.substring(7)

  const admin = getAdminClient()
  if (!admin) {
    return NextResponse.json({ error: 'Servidor incompleto.' }, { status: 500 })
  }

  const { data: { user: requester }, error: authError } = await admin.auth.getUser(token)
  if (authError || !requester) {
    return NextResponse.json({ error: 'Não autorizado. Sessão inválida.' }, { status: 401 })
  }

  try {
    // 2. Fetch profiles, courses, editais, and notices in parallel
    // Profiles from Auth Admin or public.profiles table
    const profilesPromise = admin.from('profiles').select('id, username, qra, patente, role').then(({ data }) => data || [])
      .catch(() => [] as any[])

    // Courses
    const coursesPromise = admin.from('cursos').select('*').then(async ({ data }) => {
      if (data && data.length > 0) return data
      try {
        const fileContent = await fs.readFile(CURSOS_FILE, 'utf8')
        return JSON.parse(fileContent)
      } catch (_) { return [] }
    }).catch(() => [])

    // Editais
    const editaisPromise = admin.from('editais').select('*').then(async ({ data }) => {
      if (data && data.length > 0) return data
      try {
        const fileContent = await fs.readFile(EDITAIS_FILE, 'utf8')
        return JSON.parse(fileContent)
      } catch (_) { return [] }
    }).catch(() => [])

    // Avisos
    const avisosPromise = admin.from('avisos').select('*').then(async ({ data }) => {
      if (data && data.length > 0) return data
      try {
        const fileContent = await fs.readFile(AVISOS_FILE, 'utf8')
        return JSON.parse(fileContent)
      } catch (_) { return [] }
    }).catch(() => [])

    const [profiles, courses, editais, avisos] = await Promise.all([
      profilesPromise,
      coursesPromise,
      editaisPromise,
      avisosPromise,
    ])

    // 3. Filter and categorize results
    const matchedProfiles = profiles
      .filter((p: any) =>
        (p.username || '').toLowerCase().includes(query) ||
        (p.qra || '').toLowerCase().includes(query) ||
        (p.patente || '').toLowerCase().includes(query)
      )
      .slice(0, 10)
      .map((p: any) => ({
        id: p.id,
        type: 'oficial',
        title: p.qra || p.username || 'Oficial',
        subtitle: `${p.patente || 'Recruta'} • Perfil`,
        href: `/painel/hierarquia`, // Clicking on an officer navigates to hierarchy
      }))

    const matchedCourses = courses
      .filter((c: any) =>
        (c.title || '').toLowerCase().includes(query) ||
        (c.description || '').toLowerCase().includes(query) ||
        (c.requirements || '').toLowerCase().includes(query)
      )
      .slice(0, 10)
      .map((c: any) => ({
        id: c.id,
        type: 'curso',
        title: c.title,
        subtitle: `Curso • Limite: ${c.vagasLimit} vagas`,
        href: `/painel/cursos`,
      }))

    const matchedEditais = editais
      .filter((e: any) =>
        (e.title || '').toLowerCase().includes(query) ||
        (e.description || '').toLowerCase().includes(query) ||
        (e.unidade || '').toLowerCase().includes(query)
      )
      .slice(0, 10)
      .map((e: any) => ({
        id: e.id,
        type: 'edital',
        title: e.title,
        subtitle: `Edital • Unidade: ${e.unidade}`,
        href: `/painel/editais`,
      }))

    const matchedAvisos = avisos
      .filter((a: any) =>
        (a.title || '').toLowerCase().includes(query) ||
        (a.content || '').toLowerCase().includes(query)
      )
      .slice(0, 10)
      .map((a: any) => ({
        id: a.id,
        type: 'aviso',
        title: a.title,
        subtitle: `Aviso Geral por ${a.creator_qra || a.creatorQra || 'Oficial'}`,
        href: `/painel`,
      }))

    return NextResponse.json({
      success: true,
      results: {
        profiles: matchedProfiles,
        courses: matchedCourses,
        editais: matchedEditais,
        avisos: matchedAvisos,
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao realizar busca.' }, { status: 500 })
  }
}
