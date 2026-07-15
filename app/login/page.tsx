import Link from 'next/link'
import { LogIn } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { SiteBackground } from '@/components/site-background'
import { LoginForm } from '@/components/login-form'

export default function LoginPage() {
  return (
    <>
      <SiteBackground />
      <SiteHeader />

      <main className="flex min-h-screen items-center justify-center px-4 pt-16">
        <div className="w-full max-w-md rounded-2xl border border-border/60 bg-card/70 p-8 backdrop-blur-sm">
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
            Quer ser recrutador?{' '}
            <Link href="/recrutador" className="font-medium text-foreground hover:underline">
              Cadastre-se aqui
            </Link>
          </p>
        </div>
      </main>
    </>
  )
}
