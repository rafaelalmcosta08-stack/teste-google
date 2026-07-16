'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export interface Profile {
  id: string
  username: string
  qra: string | null
  patente: string | null
  status: 'pendente' | 'aprovado' | 'rejeitado'
  role: 'user' | 'admin'
  cargo?: string[]
  unidade_administrativa?: string
  unidade_operacional?: string
  status_atividade?: 'Ativo' | 'Inativo'
  cursos?: string[]
  advertencia?: string[]
  discord_username?: string | null
  discord_id?: string | null
  allowed_by?: string | null
  game_id?: string | null
}

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  login: (username: string, password: string) => Promise<{ error: string | null }>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  loading: false,
  login: async () => ({ error: 'Supabase não configurado.' }),
  logout: async () => {},
})

// Busca perfil via API route server-side (usa service_role, ignora RLS)
async function fetchProfile(userId: string): Promise<Profile | null> {
  try {
    const res = await fetch(`/api/perfil?id=${encodeURIComponent(userId)}`)
    if (!res.ok) return null
    const json = await res.json()
    return json.profile ?? null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(!!supabase)

  useEffect(() => {
    if (!supabase) return

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        const p = await fetchProfile(session.user.id)
        setProfile(p)
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        const p = await fetchProfile(session.user.id)
        setProfile(p)
      } else {
        setProfile(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Conexão em tempo real via Server-Sent Events (SSE) para sincronização e revogação instantânea
  useEffect(() => {
    if (!user) return

    const eventSource = new EventSource(`/api/events?userId=${encodeURIComponent(user.id)}`)

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        
        // Dispatch custom browser event for any incoming real-time updates
        if (data.event) {
          window.dispatchEvent(new CustomEvent('sse-event', { detail: data }))
        }

        if (data.event === 'access-revoked') {
          if (data.payload?.id === user.id) {
            console.warn('Acesso ao painel revogado pelo administrador.')
            logout()
            window.location.href = '/login'
          }
        } else if (data.event === 'permissions-updated') {
          if (data.payload?.id === user.id) {
            console.log('Suas permissões foram atualizadas em tempo real:', data.payload)
            setProfile((prev) => {
              if (!prev) return null
              return {
                ...prev,
                ...data.payload,
              }
            })
          }
        }
      } catch (err) {
        console.error('Erro ao processar evento SSE de tempo real:', err)
      }
    }

    eventSource.onerror = (err) => {
      console.error('Erro de conexão no SSE de tempo real:', err)
    }

    return () => {
      eventSource.close()
    }
  }, [user])

  async function login(username: string, password: string): Promise<{ error: string | null }> {
    if (!supabase) return { error: 'Supabase não configurado.' }

    const email = `${username.toLowerCase().trim()}@policiaaspect.internal`

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      return { error: 'Usuário ou senha incorretos.' }
    }

    // Atualiza a data do último login no metadado do usuário
    await supabase.auth.updateUser({
      data: { last_login_at: new Date().toISOString() }
    }).catch(() => {})

    // Busca o perfil via server-side para verificar status
    const p = await fetchProfile(data.user.id)
    if (!p) {
      await supabase.auth.signOut()
      return { error: 'Perfil não encontrado. Entre em contato com o administrador.' }
    }

    if (p.status === 'pendente') {
      await supabase.auth.signOut()
      return { error: 'Seu cadastro ainda está pendente de aprovação.' }
    }

    if (p.status === 'rejeitado') {
      await supabase.auth.signOut()
      return { error: 'Seu cadastro foi rejeitado. Entre em contato com o administrador.' }
    }

    setProfile(p)

    // Grava log de login
    fetch('/api/audit-logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${data.session?.access_token || ''}`
      },
      body: JSON.stringify({
        action: 'LOGIN',
        targetUser: p.qra || p.username || 'Sistema',
        description: `O oficial realizou login no sistema.`
      })
    }).catch(() => {})

    return { error: null }
  }

  async function logout() {
    if (!supabase) return

    // Grava log de logout antes de deslogar
    if (session && profile) {
      await fetch('/api/audit-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          action: 'LOGOUT',
          targetUser: profile.qra || profile.username || 'Sistema',
          description: `O oficial realizou logout do sistema.`
        })
      }).catch(() => {})
    }

    await supabase.auth.signOut()
    setProfile(null)
  }

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
