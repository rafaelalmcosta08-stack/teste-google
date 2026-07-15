'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Shield, Check, X, Clock, Users } from 'lucide-react'

interface Profile {
  id: string
  username: string
  qra: string | null
  patente: string | null
  status: 'pendente' | 'aprovado' | 'rejeitado'
  role: 'user' | 'admin'
  created_at: string
  discord_username?: string | null
  discord_id?: string | null
  allowed_by?: string | null
  game_id?: string | null
}

const statusLabel: Record<Profile['status'], { label: string; class: string }> = {
  pendente: { label: 'Pendente', class: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30' },
  aprovado: { label: 'Aprovado', class: 'text-green-400 bg-green-400/10 border-green-400/30' },
  rejeitado: { label: 'Rejeitado', class: 'text-red-400 bg-red-400/10 border-red-400/30' },
}

export default function AdministracaoPage() {
  const { profile: myProfile, session } = useAuth()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [atualizando, setAtualizando] = useState<string | null>(null)

  const fetchProfiles = useCallback(async () => {
    if (!session?.access_token) return
    setLoading(true)
    try {
      const res = await fetch('/api/admin/usuarios', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      const json = await res.json()
      setProfiles(json.usuarios ?? [])
    } catch {
      setProfiles([])
    }
    setLoading(false)
  }, [session?.access_token])

  useEffect(() => {
    if (myProfile?.role === 'admin' && session?.access_token) fetchProfiles()
    else if (myProfile?.role !== 'admin') setLoading(false)
  }, [myProfile, session?.access_token, fetchProfiles])

  // Sincronização em tempo real para a página de administração
  useEffect(() => {
    const handleRealtimeEvent = (e: Event) => {
      const { detail } = e as CustomEvent
      if (!detail) return

      const { event, payload } = detail
      if (event === 'permissions-updated' && payload) {
        setProfiles((prevProfiles) =>
          prevProfiles.map((p) => {
            if (p.id === payload.id) {
              return {
                ...p,
                role: payload.role ?? p.role,
                patente: payload.patente ?? p.patente,
                cargo: payload.cargo ?? p.cargo,
                unidade_administrativa: payload.unidade_administrativa ?? p.unidade_administrativa,
                unidade_operacional: payload.unidade_operacional ?? p.unidade_operacional,
                status_atividade: payload.status_atividade ?? p.status_atividade,
                cursos: payload.cursos ?? p.cursos,
                advertencia: payload.advertencia ?? p.advertencia,
              }
            }
            return p
          })
        )
      } else if (event === 'access-revoked' && payload) {
        setProfiles((prevProfiles) =>
          prevProfiles.map((p) => {
            if (p.id === payload.id) {
              return {
                ...p,
                status: 'rejeitado',
              }
            }
            return p
          })
        )
      }
    }

    window.addEventListener('sse-event', handleRealtimeEvent)
    return () => {
      window.removeEventListener('sse-event', handleRealtimeEvent)
    }
  }, [])

  async function atualizarStatus(id: string, novoStatus: 'aprovado' | 'rejeitado') {
    setAtualizando(id)
    try {
      await fetch('/api/admin/usuarios', {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`
        },
        body: JSON.stringify({ id, status: novoStatus }),
      })
      setProfiles((prev) => prev.map((p) => (p.id === id ? { ...p, status: novoStatus } : p)))
    } catch (e) {
      console.error('Erro ao atualizar status:', e)
    }
    setAtualizando(null)
  }

  async function alterarRole(id: string, novoRole: 'user' | 'admin') {
    setAtualizando(id)
    try {
      await fetch('/api/admin/usuarios', {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`
        },
        body: JSON.stringify({ id, role: novoRole }),
      })
      setProfiles((prev) => prev.map((p) => (p.id === id ? { ...p, role: novoRole } : p)))
    } catch (e) {
      console.error('Erro ao alterar função:', e)
    }
    setAtualizando(null)
  }

  if (myProfile?.role !== 'admin') {
    return (
      <main className="mx-auto max-w-[1600px] px-6 pb-24 pt-16 sm:px-10 lg:px-16">
        <div className="flex flex-col items-center justify-center gap-4 pt-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
            <Shield className="h-6 w-6 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold">Acesso Restrito</h1>
          <p className="text-sm text-muted-foreground">
            Apenas administradores podem acessar esta área.
          </p>
        </div>
      </main>
    )
  }

  const pendentes = profiles.filter((p) => p.status === 'pendente')
  const outros = profiles.filter((p) => p.status !== 'pendente')

  return (
    <main className="mx-auto max-w-[1600px] px-6 pb-24 pt-16 sm:px-10 lg:px-16">
      {/* Cabeçalho */}
      <div className="mb-12">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
          <Users className="h-6 w-6 text-foreground" />
        </div>
        <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl">Administração</h1>
        <p className="mt-3 text-muted-foreground">
          Gerencie cadastros, aprove ou rejeite usuários e defina funções.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando usuários...</p>
      ) : (
        <div className="space-y-12">
          {/* Pendentes */}
          <section>
            <div className="mb-4 flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-400" />
              <h2 className="text-lg font-semibold">
                Pendentes{' '}
                {pendentes.length > 0 && (
                  <span className="ml-1 rounded-full bg-yellow-400/10 px-2 py-0.5 text-sm font-medium text-yellow-400">
                    {pendentes.length}
                  </span>
                )}
              </h2>
            </div>

            {pendentes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum cadastro pendente.</p>
            ) : (
              <div className="overflow-hidden rounded-xl border border-border/60">
                <table className="w-full text-sm">
                  <thead className="border-b border-border/60 bg-secondary/30">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Usuário / QRA / ID</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Discord</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Autorização por</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Patente</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Cadastro</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {pendentes.map((p) => (
                      <tr key={p.id} className="bg-background/30 transition-colors hover:bg-secondary/20">
                        <td className="px-4 py-3 font-medium">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-foreground">{p.qra || '—'}</span>
                              {p.game_id && (
                                <span className="rounded bg-indigo-500/15 px-1.5 py-0.5 text-[10px] font-mono font-bold text-indigo-400">
                                  ID: {p.game_id}
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">({p.username})</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {p.discord_username ? (
                            <div className="flex flex-col">
                              <span className="font-semibold text-foreground">@{p.discord_username}</span>
                              {p.discord_id && <span className="text-[10px] text-muted-foreground/80 font-mono">ID: {p.discord_id}</span>}
                            </div>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs font-semibold text-indigo-400">
                          {p.allowed_by || '—'}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{p.patente ?? '—'}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {new Date(p.created_at).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 gap-1.5 border-green-500/40 text-green-400 hover:bg-green-500/10"
                              disabled={atualizando === p.id}
                              onClick={() => atualizarStatus(p.id, 'aprovado')}
                            >
                              <Check className="h-3.5 w-3.5" />
                              Aprovar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 gap-1.5 border-red-500/40 text-red-400 hover:bg-red-500/10"
                              disabled={atualizando === p.id}
                              onClick={() => atualizarStatus(p.id, 'rejeitado')}
                            >
                              <X className="h-3.5 w-3.5" />
                              Rejeitar
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Todos os usuários */}
          <section>
            <div className="mb-4 flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-lg font-semibold">Todos os usuários</h2>
            </div>

            {outros.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum usuário cadastrado ainda.</p>
            ) : (
              <div className="overflow-hidden rounded-xl border border-border/60">
                 <table className="w-full text-sm">
                  <thead className="border-b border-border/60 bg-secondary/30">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Usuário / QRA / ID</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Discord / Autorização</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Patente</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Função</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {outros.map((p) => {
                      const st = statusLabel[p.status]
                      return (
                        <tr key={p.id} className="bg-background/30 transition-colors hover:bg-secondary/20">
                          <td className="px-4 py-3 font-medium">
                            <div className="flex flex-col">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-foreground">{p.qra || '—'}</span>
                                {p.game_id && (
                                  <span className="rounded bg-indigo-500/15 px-1.5 py-0.5 text-[10px] font-mono font-bold text-indigo-400">
                                    ID: {p.game_id}
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground">({p.username})</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">
                            <div className="flex flex-col">
                              {p.discord_username ? (
                                <span className="font-semibold text-foreground">@{p.discord_username}</span>
                              ) : (
                                <span className="text-muted-foreground/60 italic">—</span>
                              )}
                              {p.discord_id && (
                                <span className="text-[10px] text-muted-foreground/80 font-mono">ID: {p.discord_id}</span>
                              )}
                              {p.allowed_by && (
                                <span className="text-[10px] text-indigo-400 font-semibold">Autorizado por: {p.allowed_by}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{p.patente ?? '—'}</td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${st.class}`}>
                              {st.label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="rounded-full border border-border/60 bg-secondary/40 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                              {p.role === 'admin' ? 'Admin' : 'Usuário'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-2">
                              {p.status === 'rejeitado' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 gap-1.5 border-green-500/40 text-green-400 hover:bg-green-500/10"
                                  disabled={atualizando === p.id}
                                  onClick={() => atualizarStatus(p.id, 'aprovado')}
                                >
                                  <Check className="h-3.5 w-3.5" />
                                  Aprovar
                                </Button>
                              )}
                              {p.status === 'aprovado' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 gap-1.5 border-red-500/40 text-red-400 hover:bg-red-500/10"
                                  disabled={atualizando === p.id}
                                  onClick={() => atualizarStatus(p.id, 'rejeitado')}
                                >
                                  <X className="h-3.5 w-3.5" />
                                  Revogar
                                </Button>
                              )}
                              {/* Só não permite alterar a si mesmo */}
                              {myProfile?.id !== p.id && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 border-border/60 text-muted-foreground hover:text-foreground"
                                  disabled={atualizando === p.id}
                                  onClick={() => alterarRole(p.id, p.role === 'admin' ? 'user' : 'admin')}
                                >
                                  {p.role === 'admin' ? 'Remover Admin' : 'Tornar Admin'}
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  )
}
