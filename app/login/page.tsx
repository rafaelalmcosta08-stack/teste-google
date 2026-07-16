'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LogIn, ArrowRight } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { SiteBackground } from '@/components/site-background'
import { LoginForm } from '@/components/login-form'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'

export default function LoginPage() {
  const router = useRouter()
  const { user, profile, loading } = useAuth()

  useEffect(() => {
    if (!loading && user) {
      router.push('/painel')
    }
  }, [user, loading, router])

  const displayName = profile?.qra || profile?.username || user?.email?.split('@')[0] || 'Policial'

  return (
    <>
      <SiteBackground />
      <SiteHeader />

      <main className="flex min-h-screen items-center justify-center px-4 pt-16">
        <div className="w-full max-w-md rounded-2xl border border-border/60 bg-card/70 p-8 backdrop-blur-sm">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="mt-4 text-sm text-muted-foreground">Carregando...</p>
            </div>
          ) : user ? (
            <div className="flex flex-col items-center text-center">
              <div
                data-stagger
                className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/20 text-primary border border-primary/30"
              >
                <LogIn className="h-6 w-6" />
              </div>
              <h1 className="mt-5 text-2xl font-bold tracking-tight">Sessão Ativa</h1>
              <p className="mt-3 text-sm text-muted-foreground">
                Você já está conectado como <strong className="text-foreground">{displayName}</strong>.
              </p>

              <div className="mt-8 w-full">
                <Link href="/painel" className="w-full">
                  <Button id="btn-ir-painel" className="w-full flex items-center justify-center gap-2 group cursor-pointer">
                    Ir para o Painel
                    <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-col items-center text-center">
                <div
                  data-stagger
                  className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary"
                >
                  <LogIn className="h-6 w-6 text-foreground" />
                </div>
                <h1 className="mt-5 text-2xl font-bold tracking-tight">Acesso ao Dashboard</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Faça login para acessar o painel de controle.
                </p>
              </div>

              <LoginForm />

              <p className="mt-6 text-center text-sm text-muted-foreground">
                Quer fazer seu cadastro policial?{' '}
                <Link href="/recrutador" className="font-medium text-foreground hover:underline">
                  Cadastre-se aqui
                </Link>
              </p>
            </>
          )}
        </div>
      </main>
    </>
  )
}

