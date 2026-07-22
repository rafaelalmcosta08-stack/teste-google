'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Megaphone, ShieldAlert, CheckCircle2, AlertCircle } from 'lucide-react'

export default function PublicarAvisoPage() {
  const { profile, session } = useAuth()
  const router = useRouter()

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const isAltoComando = profile?.cargo?.includes('Alto Comando') || profile?.role === 'admin'

  if (!profile) {
    return (
      <main className="mx-auto max-w-[1600px] px-6 pb-24 pt-16 sm:px-10 lg:px-16">
        <div className="flex flex-col items-center justify-center gap-4 pt-16 text-center">
          <div className="animate-pulse text-muted-foreground">Carregando...</div>
        </div>
      </main>
    )
  }

  if (!isAltoComando) {
    return (
      <main className="mx-auto max-w-[1600px] px-6 pb-24 pt-16 sm:px-10 lg:px-16">
        <div className="flex flex-col items-center justify-center gap-4 pt-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20 text-red-500">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold">Acesso Restrito</h1>
          <p className="text-sm text-muted-foreground max-w-md">
            Esta seção é exclusiva para membros do Alto Comando do Departamento de Polícia.
          </p>
        </div>
      </main>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !content.trim()) {
      setError('Preencha todos os campos.')
      return
    }

    setSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch('/api/avisos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({
          action: 'create',
          title: title.trim(),
          content: content.trim(),
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao publicar o aviso.')
      }

      setSuccess('Aviso publicado com sucesso!')
      setTitle('')
      setContent('')
      
      // Redirect to dashboard home after a brief delay
      setTimeout(() => {
        router.push('/painel')
      }, 1500)
    } catch (err: any) {
      setError(err.message || 'Houve um problema de rede.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="mx-auto max-w-[1000px] px-6 pb-24 pt-28 sm:px-10 lg:px-16">
      <div className="relative text-center mb-10">
        <div className="flex items-center justify-center gap-2">
          <Megaphone className="h-5 w-5 text-primary" />
          <span className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            Comunicação Institucional
          </span>
        </div>

        <h1 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">
          Publicar Novo Aviso
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Crie um comunicado que será exibido imediatamente na tela inicial do painel de todos os oficiais ativos da corporação.
        </p>
      </div>

      <div className="rounded-xl border border-border/60 bg-card/60 backdrop-blur-md p-6 sm:p-8 shadow-xl max-w-2xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="flex items-start gap-2.5 p-4 rounded-lg bg-red-500/10 border border-red-500/15 text-sm text-red-400">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-start gap-2.5 p-4 rounded-lg bg-green-500/10 border border-green-500/15 text-sm text-green-400">
              <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="title" className="text-sm font-semibold text-foreground">
              Título do aviso
            </label>
            <input
              id="title"
              type="text"
              placeholder="Digite o título do comunicado..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={submitting}
              className="w-full px-4 py-2.5 text-sm bg-secondary/30 rounded-xl border border-border/60 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
              maxLength={120}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="content" className="text-sm font-semibold text-foreground">
              Conteúdo/texto do aviso
            </label>
            <textarea
              id="content"
              placeholder="Escreva detalhadamente a mensagem institucional..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={submitting}
              className="w-full min-h-[220px] px-4 py-3 text-sm bg-secondary/30 rounded-xl border border-border/60 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 resize-y"
            />
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-11 text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl shadow-md transition-all duration-200"
            >
              {submitting ? 'Publicando...' : 'Publicar'}
            </Button>
          </div>
        </form>
      </div>
    </main>
  )
}
