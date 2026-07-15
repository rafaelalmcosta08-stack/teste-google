import Link from 'next/link'
import { UserPlus } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { SiteBackground } from '@/components/site-background'
import { RecruiterForm } from '@/components/recruiter-form'

export default function RecrutadorPage() {
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
              <UserPlus className="h-6 w-6 text-foreground" />
            </div>
            <h1 className="mt-5 text-2xl font-bold tracking-tight">Cadastro de Recrutador</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Cadastre-se para fazer parte da equipe de recrutamento.{' '}
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
        </div>
      </main>
    </>
  )
}
