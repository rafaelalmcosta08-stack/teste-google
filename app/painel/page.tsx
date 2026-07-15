import { Shield } from 'lucide-react'

export default function PainelPage() {
  return (
    <main className="mx-auto max-w-[1600px] px-6 pb-24 pt-16 sm:px-10 lg:px-16">
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
          <Shield className="h-6 w-6 text-foreground" />
        </div>
        <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl">
          Bem-vindo ao Painel
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-pretty leading-relaxed text-muted-foreground">
          Selecione uma seção no menu lateral para acessar os conteúdos restritos do
          Departamento de Polícia Legacy.
        </p>
      </div>
    </main>
  )
}
