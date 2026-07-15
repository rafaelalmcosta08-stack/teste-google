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
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Usuário</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">QRA</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Patente</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Cadastro</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {pendentes.map((p) => (
                      <tr key={p.id} className="bg-background/30 transition-colors hover:bg-secondary/20">
                        <td className="px-4 py-3 font-medium">{p.username}</td>
                        <td className="px-4 py-3 text-muted-foreground">{p.qra ?? '—'}</td>
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
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Usuário</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">QRA</th>
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
                          <td className="px-4 py-3 font-medium">{p.username}</td>
                          <td className="px-4 py-3 text-muted-foreground">{p.qra ?? '—'}</td>
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
