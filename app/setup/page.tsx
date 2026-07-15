'use client'

import { useState, useEffect } from 'react'

const USUARIOS_ORFAOS = [
  { id: '415164f2-213b-48f8-9d2c-f73f4351aa4f', email: 'rafael@policialegacy.internal', username: 'rafael' },
  { id: '970756cd-700b-4908-86fa-51d4ecabe3fe', email: 'rafael2@policialegacy.internal', username: 'rafael2' },
  { id: '17a0f3b7-fd42-48fe-8cf4-b5d213a2623b', email: 'rafael3@policialegacy.internal', username: 'rafael3' },
]

export default function SetupPage() {
  const [autenticado, setAutenticado] = useState(false)
  const [senhaInput, setSenhaInput] = useState('')
  const [senhaErro, setSenhaErro] = useState(false)
  const [senhaCarregando, setSenhaCarregando] = useState(false)

  useEffect(() => {
    if (sessionStorage.getItem('setup_auth') === '1') setAutenticado(true)
  }, [])

  async function verificarSenha() {
    if (!senhaInput.trim()) return
    setSenhaCarregando(true)
    setSenhaErro(false)
    try {
      const res = await fetch('/api/setup-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senha: senhaInput }),
      })
      if (res.ok) {
        sessionStorage.setItem('setup_auth', '1')
        setAutenticado(true)
      } else {
        setSenhaErro(true)
      }
    } catch {
      setSenhaErro(true)
    }
    setSenhaCarregando(false)
  }

  const [pat, setPat] = useState('')

  const [migrando, setMigrando] = useState(false)
  const [resMigracao, setResMigracao] = useState<{ ok: boolean; msg: string } | null>(null)

  const [grantando, setGrantando] = useState(false)
  const [resGrant, setResGrant] = useState<{ ok: boolean; msg: string } | null>(null)

  const [corrigindo, setCorrigindo] = useState<string | null>(null)
  const [resCorrecao, setResCorrecao] = useState<Record<string, { ok: boolean; msg: string }>>({})

  async function executarMigracao() {
    if (!pat.trim()) return
    setMigrando(true)
    setResMigracao(null)
    try {
      const res = await fetch(`/api/setup-db?pat=${encodeURIComponent(pat.trim())}`)
      const json = await res.json()
      setResMigracao({ ok: res.ok, msg: json.message ?? json.error ?? JSON.stringify(json) })
    } catch (e) {
      setResMigracao({ ok: false, msg: e instanceof Error ? e.message : 'Erro de rede' })
    }
    setMigrando(false)
  }

  async function executarGrant() {
    if (!pat.trim()) return
    setGrantando(true)
    setResGrant(null)
    try {
      const res = await fetch(`/api/grant?pat=${encodeURIComponent(pat.trim())}`)
      const json = await res.json()
      setResGrant({ ok: res.ok, msg: json.message ?? json.error ?? JSON.stringify(json) })
    } catch (e) {
      setResGrant({ ok: false, msg: e instanceof Error ? e.message : 'Erro de rede' })
    }
    setGrantando(false)
  }

  async function corrigirUsuario(userId: string, username: string, role: 'admin' | 'user') {
    setCorrigindo(userId)
    try {
      const res = await fetch('/api/admin/corrigir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, username, status: 'aprovado', role }),
      })
      const json = await res.json()
      setResCorrecao((prev) => ({
        ...prev,
        [userId]: { ok: res.ok, msg: res.ok ? `Corrigido como ${role}` : (json.error ?? 'Erro') },
      }))
    } catch (e) {
      setResCorrecao((prev) => ({
        ...prev,
        [userId]: { ok: false, msg: e instanceof Error ? e.message : 'Erro de rede' },
      }))
    }
    setCorrigindo(null)
  }

  if (!autenticado) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-gray-900 border border-gray-800 rounded-xl p-8 flex flex-col gap-5">
          <div>
            <h1 className="text-white text-xl font-bold">Acesso restrito</h1>
            <p className="text-gray-400 text-sm mt-1">Digite a senha de configuracao do sistema.</p>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-gray-300 text-sm font-medium">Senha</label>
            <input
              type="password"
              value={senhaInput}
              autoFocus
              onChange={(e) => { setSenhaInput(e.target.value); setSenhaErro(false) }}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) verificarSenha() }}
              className="bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2.5 text-sm outline-none focus:border-gray-500 transition-colors"
              placeholder="••••••••••••"
            />
            {senhaErro && <p className="text-red-400 text-sm">Senha incorreta. Tente novamente.</p>}
          </div>
          <button
            onClick={verificarSenha}
            disabled={senhaCarregando || !senhaInput.trim()}
            className="bg-white text-gray-900 font-semibold rounded-lg py-2.5 text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {senhaCarregando ? 'Verificando...' : 'Entrar'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-gray-950 px-4 py-10 text-gray-100">
      <div className="mx-auto max-w-lg space-y-10">
        <div>
          <h1 className="text-2xl font-bold text-white">Configuracao inicial do banco</h1>
          <p className="mt-1 text-sm text-gray-400">Execute os passos abaixo uma unica vez para configurar o sistema.</p>
        </div>

        {/* PAT */}
        <section className="space-y-3">
          <div className="rounded-lg border border-yellow-700/50 bg-yellow-900/20 px-4 py-3 text-sm text-yellow-200 space-y-1">
            <p className="font-semibold text-yellow-300">Como obter o Personal Access Token:</p>
            <ol className="list-decimal list-inside space-y-0.5">
              <li>Acesse <strong>supabase.com/dashboard/account/tokens</strong></li>
              <li>Clique em <strong>Generate new token</strong> e copie o token</li>
            </ol>
          </div>
          <label className="block text-sm font-medium text-gray-300">Personal Access Token (PAT)</label>
          <input
            type="password"
            value={pat}
            onChange={(e) => setPat(e.target.value)}
            placeholder="sbp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            className="w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 font-mono text-sm text-white placeholder-gray-600 outline-none focus:border-blue-500"
          />
        </section>

        <hr className="border-gray-800" />

        {/* Passo 1 */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">Passo 1 — Criar tabela profiles</h2>
          <button
            onClick={executarMigracao}
            disabled={migrando || !pat.trim()}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-40"
          >
            {migrando ? 'Executando...' : 'Executar migracao SQL'}
          </button>
          {resMigracao && (
            <p className={`rounded-lg px-4 py-3 text-sm ${resMigracao.ok ? 'border border-green-700 bg-green-950/40 text-green-300' : 'border border-red-800 bg-red-950/40 text-red-300'}`}>
              {resMigracao.msg}
            </p>
          )}
        </section>

        <hr className="border-gray-800" />

        {/* Passo 2 */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">Passo 2 — Aplicar permissoes (GRANT)</h2>
          <p className="text-sm text-gray-400">
            <strong className="text-red-400">Obrigatorio.</strong> Sem este passo o servidor retorna{' '}
            <code className="text-gray-300">permission denied for table profiles</code>.
          </p>
          <button
            onClick={executarGrant}
            disabled={grantando || !pat.trim()}
            className="w-full rounded-md bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-40"
          >
            {grantando ? 'Aplicando...' : 'Aplicar GRANT'}
          </button>
          {resGrant && (
            <p className={`rounded-lg px-4 py-3 text-sm ${resGrant.ok ? 'border border-green-700 bg-green-950/40 text-green-300' : 'border border-red-800 bg-red-950/40 text-red-300'}`}>
              {resGrant.msg}
            </p>
          )}
        </section>

        <hr className="border-gray-800" />

        {/* Passo 3 */}
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Passo 3 — Corrigir usuarios existentes</h2>
            <p className="mt-1 text-sm text-gray-400">
              Os usuarios abaixo foram criados antes do sistema estar configurado. Defina o username e o role de cada um.
            </p>
          </div>

          <div className="space-y-3">
            {USUARIOS_ORFAOS.map((u) => {
              const res = resCorrecao[u.id]
              return (
                <div key={u.id} className="rounded-xl border border-gray-700 bg-gray-900 p-4 space-y-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{u.email}</p>
                    <p className="font-mono text-xs text-gray-500">{u.id}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => corrigirUsuario(u.id, u.username, 'admin')}
                      disabled={corrigindo === u.id || !!res?.ok}
                      className="flex-1 rounded-md bg-purple-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-600 disabled:opacity-40"
                    >
                      {corrigindo === u.id ? 'Salvando...' : `Definir "${u.username}" como Admin`}
                    </button>
                    <button
                      onClick={() => corrigirUsuario(u.id, u.username, 'user')}
                      disabled={corrigindo === u.id || !!res?.ok}
                      className="flex-1 rounded-md bg-gray-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-600 disabled:opacity-40"
                    >
                      {corrigindo === u.id ? 'Salvando...' : `Definir como Usuario`}
                    </button>
                  </div>
                  {res && (
                    <p className={`text-xs ${res.ok ? 'text-green-400' : 'text-red-400'}`}>
                      {res.ok ? `Pronto: ${res.msg}` : `Erro: ${res.msg}`}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        <p className="pb-8 text-center text-xs text-gray-600">
          Remova esta pagina apos concluir a configuracao.
        </p>
      </div>
    </main>
  )
}
