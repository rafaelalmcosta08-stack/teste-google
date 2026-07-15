import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { senha } = await request.json()
  const secret = process.env.SETUP_SECRET

  if (!secret) {
    return NextResponse.json({ error: 'SETUP_SECRET não configurado.' }, { status: 500 })
  }

  if (senha !== secret) {
    return NextResponse.json({ error: 'Senha incorreta.' }, { status: 401 })
  }

  return NextResponse.json({ ok: true })
}
