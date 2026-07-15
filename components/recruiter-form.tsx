'use client'

import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

type Status = 'idle' | 'loading' | 'success' | 'error'

export function RecruiterForm() {
  const [form, setForm] = useState({
    usuario: '',
    qra: '',
    patente: '',
    senha: '',
    confirmarSenha: '',
  })
  const [status, setStatus] = useState<Status>('idle')
  const [erro, setErro] = useState<string | null>(null)

  function update(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)

    const usuario = form.usuario.trim()

    if (!usuario) {
      setErro('O campo Usuário é obrigatório.')
      return
    }

    if (form.senha.length < 6) {
      setErro('A senha deve ter pelo menos 6 caracteres.')
      return
    }

    if (form.senha !== form.confirmarSenha) {
      setErro('As senhas não coincidem.')
      return
    }

    setStatus('loading')

    // Envia para a API route server-side (usa service_role, ignora RLS)
    const res = await fetch('/api/cadastro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usuario,
        qra: form.qra,
        patente: form.patente,
        senha: form.senha,
      }),
    })

    const json = await res.json()

    if (!res.ok || json.error) {
      setErro(json.error ?? 'Erro ao realizar cadastro. Tente novamente.')
      setStatus('error')
      return
    }

    setStatus('success')
  }

  if (status === 'success') {
    return (
      <div className="mt-8 rounded-lg border border-green-500/30 bg-green-500/10 px-6 py-8 text-center">
        <p className="text-base font-semibold text-green-400">Cadastro enviado com sucesso!</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Seu cadastro está <span className="font-medium text-foreground">pendente de aprovação</span>.
          Aguarde a liberação pelo administrador antes de fazer login.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-5">
      <div className="space-y-2">
        <Label htmlFor="usuario">Usuário</Label>
        <Input
          id="usuario"
          value={form.usuario}
          onChange={update('usuario')}
          placeholder="Digite seu usuário"
          autoComplete="username"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="qra">QRA</Label>
          <Input
            id="qra"
            value={form.qra}
            onChange={update('qra')}
            placeholder="Ex: ALFA-01"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="patente">Patente</Label>
          <Input
            id="patente"
            value={form.patente}
            onChange={update('patente')}
            placeholder="Ex: Soldado"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="senha">Senha</Label>
        <Input
          id="senha"
          type="password"
          value={form.senha}
          onChange={update('senha')}
          placeholder="Mínimo 6 caracteres"
          autoComplete="new-password"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmarSenha">Confirmar Senha</Label>
        <Input
          id="confirmarSenha"
          type="password"
          value={form.confirmarSenha}
          onChange={update('confirmarSenha')}
          placeholder="Repita a senha"
          autoComplete="new-password"
          required
        />
      </div>

      {erro && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {erro}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={status === 'loading'}>
        {status === 'loading' ? 'Enviando...' : 'Cadastrar'}
      </Button>
    </form>
  )
}
