'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { UserPlus, Shield, LogOut, ArrowRight } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { SiteBackground } from '@/components/site-background'
import { RecruiterForm } from '@/components/recruiter-form'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'

export default function RecrutadorPage() {
  const router = useRouter()
  const { user, profile, loading, logout } = useAuth()

  useEffect(() => {
    if (!loading && user) {
      router.push('/painel')
    }
  }, [user, loading, router])

  const displayName = profile?.qra || profile?.username || user?.email?.split('@')[0] || 'Policial'

  async function handleLogout() {
    await logout()
    router.push('/')
  }

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
                className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20"
              >
                <Shield className="h-6 w-6" />
              </div>
              <h1 className="mt-5 text-2xl font-bold tracking-tight">Sessão Ativa</h1>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                Você já está conectado como <strong className="text-foreground">{displayName}</strong>.
                Não é possível realizar um novo cadastro enquanto estiver autenticado no sistema.
              </p>

              <div className="mt-8 flex flex-col gap-3 w-full">
                <Link href="/painel" className="w-full">
                  <Button id="btn-cadastro-painel" className="w-full flex items-center justify-center gap-2 group cursor-pointer">
                    Ir para o Painel
                    <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </Button>
                </Link>
                <Button
                  id="btn-cadastro-logout"
                  variant="outline"
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 text-red-400 border-red-500/20 hover:bg-red-500/10 hover:text-red-300 cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  Sair da Conta Atual
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-col items-center text-center">
                <div
                  data-stagger
                  className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary"
                >
                  <UserPlus className="h-6 w-6 text-foreground" />
                </div>
                <h1 className="mt-5 text-2xl font-bold tracking-tight">Cadastro Policial</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Cadastre-se para fazer parte do Departamento de Polícia.{' '}
                  Seu cadastro será analisado pelo administrador.
                </p>
              </div>

              <RecruiterForm />

              <p className="mt-6 text-center text-sm text-muted-foreground">
                Já possui cadastro aprovado?{' '}
                <Link href="/login" className="font-medium text-foreground hover:underline">
                  Faça login
                </Link>
              </p>
            </>
          )}
        </div>
      </main>
    </>
  )
}
