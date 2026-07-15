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

  async function login(username: string, password: string): Promise<{ error: string | null }> {
    if (!supabase) return { error: 'Supabase não configurado.' }

    const email = `${username.toLowerCase().trim()}@policialegacy.internal`

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      return { error: 'Usuário ou senha incorretos.' }
    }

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
    return { error: null }
  }

  async function logout() {
    if (!supabase) return
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
