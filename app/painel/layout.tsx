'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { PainelHeader } from '@/components/painel-header'
import { SiteBackground } from '@/components/site-background'

export default function PainelLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.replace('/login')
      return
    }
    // Se o perfil foi carregado e não está aprovado, redireciona para login
    if (profile && profile.status !== 'aprovado') {
      router.replace('/login')
    }
  }, [user, profile, loading, router])

  if (loading) {
    return (
      <>
        <SiteBackground />
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      </>
    )
  }

  if (!user || !profile || profile.status !== 'aprovado') return null

  return (
    <>
      <SiteBackground />
      <PainelHeader />
      <div className="min-h-screen pt-24">{children}</div>
    </>
  )
}
