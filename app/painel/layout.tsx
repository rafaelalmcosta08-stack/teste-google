'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { PainelHeader } from '@/components/painel-header'
import { PainelSidebar } from '@/components/painel-sidebar'
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
    <div className="min-h-screen bg-background text-foreground">
      <SiteBackground />
      <PainelSidebar />
      <div className="relative flex min-h-screen flex-col pl-[70px]">
        <PainelHeader />
        <div className="flex-1 pt-24">{children}</div>
      </div>
    </div>
  )
}
