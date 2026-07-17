'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { motion, AnimatePresence } from 'motion/react'
import {
  Shield,
  Search,
  Check,
  X,
  Clock,
  User,
  Plus,
  ArrowRight,
  AlertTriangle,
  CheckCircle,
  FileText,
  UserCheck
} from 'lucide-react'

interface UserProfile {
  id: string
  username: string
  qra: string | null
  patente: string | null
  status: string
  role: string
  cargo: string[]
  unidade_administrativa: string
  unidade_operacional: string
}

interface Solicitacao {
  id: string
  oficial_id: string
  oficial_qra: string
  oficial_username: string
  unidade: string
  requerente_id: string
  requerente_qra: string
  status: 'pendente' | 'aceito' | 'recusado'
  created_at: string
}

const UNIT_LABELS: Record<string, string> = {
  BOPE: 'BOPE (Batalhão de Operações Especiais)',
  CORE: 'CORE (Coordenadoria de Recursos Especiais)',
  GAR: 'GAR (Grupo de Ações Rápidas)',
  GAEP: 'GAEP (Grupo de Apoio Escolta e Policiamento)',
  GTM: 'GTM (Grupo Tático de Motocicletas)',
  APM: 'APM (Academia de Polícia Militar)',
  Corregedoria: 'Corregedoria Geral'
}

const UNIT_COMMANDERS: Record<string, string> = {
  'BOPE': 'Comando Bope',
  'CORE': 'Comando Core',
  'GAR': 'Comando GAR',
  'GAEP': 'Comando GAEP',
  'GTM': 'Comando GTM',
  'APM': 'Diretor APM',
  'Corregedoria': 'Diretor Corregedoria'
}

export default function RegistroUnidadePage() {
  const { profile: myProfile, session } = useAuth()
  const [activeTab, setActiveTab] = useState<'solicitar' | 'painel'>('solicitar')

  // List of all officials for Autocomplete
  const [officials, setOfficials] = useState<UserProfile[]>([])
  const [loadingOfficials, setLoadingOfficials] = useState(true)

  // Requests list
  const [requests, setRequests] = useState<Solicitacao[]>([])
  const [loadingRequests, setLoadingRequests] = useState(true)

  // Autocomplete Form State
  const [searchOfficial, setSearchOfficial] = useState('')
  const [selectedOfficial, setSelectedOfficial] = useState<UserProfile | null>(null)
  const [selectedUnit, setSelectedUnit] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)

  // Feedback State
  const [submitting, setSubmitting] = useState(false)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)

  const cargos = myProfile?.cargo ?? []
  const isAdmin = myProfile?.role === 'admin'
  const isAltoComando = cargos.includes('Alto Comando') || isAdmin

  // Check which units the user can request
  const getAllowedUnits = useCallback(() => {
    if (isAltoComando) {
      return Object.keys(UNIT_LABELS)
    }
    const allowed: string[] = []
    Object.entries(UNIT_COMMANDERS).forEach(([unit, cargo]) => {
      if (cargos.includes(cargo)) {
        allowed.push(unit)
      }
    })
    return allowed
  }, [isAltoComando, cargos])

  const allowedUnits = getAllowedUnits()

  // Load officials
  const fetchOfficials = useCallback(async () => {
    if (!session?.access_token) return
    setLoadingOfficials(true)
    try {
      const res = await fetch('/api/admin/usuarios', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      if (res.ok) {
        const json = await res.json()
        // Only allow approved users
        const approved: UserProfile[] = (json.usuarios ?? []).filter((u: UserProfile) => u.status === 'aprovado')
        setOfficials(approved)
      }
    } catch (e) {
      console.error(e)
    }
    setLoadingOfficials(false)
  }, [session?.access_token])

  // Load registration requests
  const fetchRequests = useCallback(async () => {
    if (!session?.access_token) return
    setLoadingRequests(true)
    try {
      const res = await fetch('/api/registro-unidades', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      if (res.ok) {
        const json = await res.json()
        setRequests(json.solicitacoes ?? [])
        // Dispatch notifications update event
        window.dispatchEvent(new CustomEvent('notifications-update'))
      }
    } catch (e) {
      console.error(e)
    }
    setLoadingRequests(false)
  }, [session?.access_token])

  useEffect(() => {
    if (session?.access_token) {
      fetchOfficials()
      fetchRequests()
    }
  }, [fetchOfficials, fetchRequests, session?.access_token])

  // Automatically switch tab if only Alto Comando has pending requests to view
  useEffect(() => {
    if (isAltoComando && requests.some(r => r.status === 'pendente')) {
      setActiveTab('painel')
    }
  }, [isAltoComando, requests])

  // Filter officials based on autocomplete input
  const filteredOfficials = officials.filter((o) => {
    const qra = (o.qra ?? '').toLowerCase()
    const username = (o.username ?? '').toLowerCase()
    const term = searchOfficial.toLowerCase()
    return qra.includes(term) || username.includes(term)
  })

  // Submit new request
  async function handleCreateRequest(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    setFormSuccess(null)

    if (!selectedOfficial) {
      setFormError('Por favor, selecione um oficial para o registro.')
      return
    }

    if (!selectedUnit) {
      setFormError('Por favor, selecione a unidade de destino.')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/registro-unidades', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`
        },
        body: JSON.stringify({
          oficialId: selectedOfficial.id,
          oficialQra: selectedOfficial.qra || selectedOfficial.username,
          oficialUsername: selectedOfficial.username,
          unidade: selectedUnit
        })
      })

      const json = await res.json()

      if (res.ok) {
        setFormSuccess(json.message ?? 'Solicitação de registro enviada com sucesso!')
        setSelectedOfficial(null)
        setSearchOfficial('')
        setSelectedUnit('')
        fetchRequests() // Refresh list
      } else {
        setFormError(json.error ?? 'Ocorreu um erro ao enviar a solicitação.')
      }
    } catch (err) {
      setFormError('Erro de conexão ao tentar enviar a solicitação.')
    } finally {
      setSubmitting(false)
    }
  }

  // Handle Accept or Reject
  async function handleProcessRequest(requestId: string, action: 'aceitar' | 'recusar') {
    setProcessingId(requestId)
    try {
      const res = await fetch('/api/registro-unidades', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`
        },
        body: JSON.stringify({ requestId, action })
      })

      const json = await res.json()

      if (res.ok) {
        fetchRequests() // Refresh lists
        fetchOfficials() // Refresh tags/cargos updated on officials
      } else {
        alert(json.error ?? 'Erro ao processar solicitação.')
      }
    } catch (err) {
      alert('Erro de conexão com o servidor.')
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <main className="mx-auto max-w-[1400px] px-6 pb-24 pt-12 sm:px-10 lg:px-12">
      {/* Header */}
      <div className="mb-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6 border-b border-border/25 pb-8">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary/80 border border-border/40">
              <Shield className="h-5.5 w-5.5 text-foreground" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Registro de Unidade</h1>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Solicite a transferência/registro de oficiais para unidades oficiais e gerencie aprovações de atribuição.
          </p>
        </div>

        {/* Tabs switcher */}
        <div className="flex rounded-lg bg-secondary/45 p-1 border border-border/20 self-start">
          <button
            onClick={() => { setActiveTab('solicitar'); setFormError(null); setFormSuccess(null) }}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all ${
              activeTab === 'solicitar'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Fazer Solicitação
          </button>
          <button
            onClick={() => { setActiveTab('painel'); setFormError(null); setFormSuccess(null) }}
            className={`relative rounded-md px-4 py-1.5 text-sm font-medium transition-all ${
              activeTab === 'painel'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Solicitações de Registro
            {isAltoComando && requests.filter((r) => r.status === 'pendente').length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
            )}
          </button>
        </div>
      </div>

      {activeTab === 'solicitar' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Request Form */}
          <section className="lg:col-span-7 bg-card/60 rounded-xl border border-border/30 p-6 md:p-8 backdrop-blur-sm">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Plus className="h-5 w-5 text-indigo-400" />
              Solicitar Registro de Oficial
            </h2>

            {formError && (
              <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300 flex items-start gap-2.5">
                <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div className="mb-6 rounded-lg border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-300 flex items-start gap-2.5">
                <CheckCircle className="h-5 w-5 text-green-400 shrink-0 mt-0.5" />
                <span>{formSuccess}</span>
              </div>
            )}

            {allowedUnits.length === 0 ? (
              <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-5 text-sm text-yellow-300 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-400 shrink-0" />
                  <span className="font-bold">Permissão Insuficiente</span>
                </div>
                <p>
                  Apenas os comandantes das respectivas unidades (BOPE, CORE, GAR, GAEP, GTM, APM, Corregedoria) ou membros do Alto Comando possuem acesso para solicitar registros de transferência.
                </p>
              </div>
            ) : (
              <form onSubmit={handleCreateRequest} className="space-y-6">
                {/* Official Autocomplete Selector */}
                <div className="relative">
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    Selecionar Oficial <span className="text-red-400">*</span>
                  </label>

                  {selectedOfficial ? (
                    <div className="flex items-center justify-between rounded-lg border border-indigo-500/55 bg-indigo-500/10 px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <User className="h-5 w-5 text-indigo-400" />
                        <div>
                          <p className="text-sm font-bold text-white">
                            {selectedOfficial.qra || selectedOfficial.username}
                          </p>
                          <p className="text-xs text-indigo-300">
                            Patente: {selectedOfficial.patente || 'Nenhuma'} • Operacional: {selectedOfficial.unidade_operacional || 'Sem Efetividade'}
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedOfficial(null)}
                        className="h-8 w-8 p-0 text-indigo-300 hover:text-white hover:bg-indigo-500/20"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <Search className="h-4.5 w-4.5 text-muted-foreground" />
                      </div>
                      <Input
                        type="text"
                        value={searchOfficial}
                        onChange={(e) => {
                          setSearchOfficial(e.target.value)
                          setShowDropdown(true)
                        }}
                        onFocus={() => setShowDropdown(true)}
                        className="pl-10 h-11 bg-background border-border/45 text-sm"
                        placeholder="Pesquisar por QRA ou Username do oficial..."
                      />

                      {showDropdown && searchOfficial.trim() !== '' && (
                        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-border bg-card shadow-2xl">
                          {loadingOfficials ? (
                            <div className="p-4 text-xs text-muted-foreground text-center">Carregando oficiais...</div>
                          ) : filteredOfficials.length === 0 ? (
                            <div className="p-4 text-xs text-muted-foreground text-center">Nenhum oficial encontrado</div>
                          ) : (
                            <div className="py-1">
                              {filteredOfficials.map((oficial) => (
                                <button
                                  key={oficial.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedOfficial(oficial)
                                    setSearchOfficial('')
                                    setShowDropdown(false)
                                  }}
                                  className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-secondary/40 transition-colors"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-secondary text-sm font-semibold">
                                      {oficial.qra ? oficial.qra[0].toUpperCase() : oficial.username[0].toUpperCase()}
                                    </div>
                                    <div>
                                      <p className="text-sm font-bold text-white">
                                        {oficial.qra || oficial.username}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        @{oficial.username} • {oficial.patente || 'Sem Patente'}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <span className="rounded bg-indigo-500/15 px-2 py-0.5 text-[10px] font-bold text-indigo-400">
                                      {oficial.unidade_operacional !== 'Sem Efetividade' ? oficial.unidade_operacional : (oficial.unidade_administrativa !== 'Sem Efetividade' ? oficial.unidade_administrativa : 'Sem Unidade')}
                                    </span>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Destination Unit Dropdown Selector */}
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    Selecionar Unidade de Destino <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={selectedUnit}
                    onChange={(e) => setSelectedUnit(e.target.value)}
                    className="w-full rounded-lg border border-border/45 bg-background text-sm text-foreground h-11 px-3 outline-none focus:border-gray-500 transition-all"
                  >
                    <option value="">-- Escolha uma unidade autorizada --</option>
                    {allowedUnits.map((unit) => (
                      <option key={unit} value={unit}>
                        {UNIT_LABELS[unit]}
                      </option>
                    ))}
                  </select>
                </div>

                <Button
                  type="submit"
                  disabled={submitting || !selectedOfficial || !selectedUnit}
                  className="w-full h-11 bg-white hover:bg-gray-100 text-gray-900 font-bold text-sm transition-colors mt-4"
                >
                  {submitting ? 'Enviando Solicitação...' : 'Fazer Solicitação'}
                </Button>
              </form>
            )}
          </section>

          {/* Right: Info Box */}
          <section className="lg:col-span-5 bg-secondary/15 rounded-xl border border-border/20 p-6 space-y-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <FileText className="h-5 w-5 text-indigo-400" />
              Regras e Diretrizes de Registro
            </h3>

            <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
              <div className="flex gap-3">
                <div className="h-5 w-5 rounded-full bg-secondary flex items-center justify-center shrink-0 text-[10px] font-bold text-white">1</div>
                <p>
                  <strong>Um registro ativo por oficial</strong>: Um oficial só pode ter uma solicitação de registro pendente de cada vez.
                </p>
              </div>

              <div className="flex gap-3">
                <div className="h-5 w-5 rounded-full bg-secondary flex items-center justify-center shrink-0 text-[10px] font-bold text-white">2</div>
                <p>
                  <strong>Autorização de solicitações</strong>: Apenas comandantes das respectivas unidades podem solicitar. O Alto Comando possui acesso completo a todas as unidades.
                </p>
              </div>

              <div className="flex gap-3">
                <div className="h-5 w-5 rounded-full bg-secondary flex items-center justify-center shrink-0 text-[10px] font-bold text-white">3</div>
                <p>
                  <strong>Aprovação Automática de Cargos/Tags</strong>: Assim que a solicitação for aprovada pelo Alto Comando, o oficial correspondente receberá automaticamente a unidade de destino e a tag correspondente (Ex: <span className="text-indigo-400 font-semibold">Probatório Bope</span> para BOPE ou <span className="text-indigo-400 font-semibold">Membro GAR</span> para GAR).
                </p>
              </div>
            </div>

            {/* Current Solicitations by the logged-in user */}
            <div className="pt-4 border-t border-border/15">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Minhas solicitações recentes</h4>
              {loadingRequests ? (
                <p className="text-xs text-muted-foreground">Carregando...</p>
              ) : requests.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">Nenhuma solicitação enviada por você.</p>
              ) : (
                <div className="space-y-2.5 max-h-48 overflow-y-auto">
                  {requests.slice(0, 5).map((req) => (
                    <div key={req.id} className="flex items-center justify-between p-2.5 rounded bg-secondary/20 border border-border/10 text-xs">
                      <div>
                        <span className="font-bold text-white">{req.oficial_qra}</span>
                        <span className="mx-1 text-muted-foreground">→</span>
                        <span className="text-indigo-300 font-semibold">{req.unidade}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        req.status === 'pendente' ? 'text-yellow-400 bg-yellow-400/10' :
                        req.status === 'aceito' ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10'
                      }`}>
                        {req.status === 'pendente' ? 'Pendente' : req.status === 'aceito' ? 'Aceito' : 'Recusado'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      ) : (
        /* Solicitações Review Panel (Exclusivo Alto Comando & Commanders own requests views) */
        <section className="bg-card/60 rounded-xl border border-border/30 p-6 md:p-8 backdrop-blur-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Clock className="h-5 w-5 text-indigo-400" />
                Painel de Aprovações de Registro
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                {isAltoComando
                  ? 'Você está visualizando todas as solicitações pendentes do sistema. Clique em Aceitar ou Recusar.'
                  : 'Você está visualizando as solicitações de registro enviadas por você.'}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={fetchRequests} className="h-8 border-border/50 text-xs">
                Atualizar Lista
              </Button>
            </div>
          </div>

          {loadingRequests ? (
            <div className="py-12 text-center">
              <p className="text-sm text-muted-foreground animate-pulse">Carregando registros...</p>
            </div>
          ) : requests.length === 0 ? (
            <div className="py-12 text-center rounded-lg border border-dashed border-border/30 bg-background/20">
              <FileText className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Nenhuma solicitação de registro encontrada.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border/35 bg-background/25">
              <table className="w-full text-sm text-left">
                <thead className="bg-secondary/40 border-b border-border/40 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Oficial (Destinatário)</th>
                    <th className="px-6 py-4 font-semibold text-center">Unidade de Destino</th>
                    <th className="px-6 py-4 font-semibold">Requerente (Quem Solicitou)</th>
                    <th className="px-6 py-4 font-semibold">Data da Solicitação</th>
                    <th className="px-6 py-4 font-semibold text-center">Status</th>
                    {isAltoComando && <th className="px-6 py-4 font-semibold text-right">Ações de Decisão</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/25">
                  {requests.map((req) => {
                    const isPending = req.status === 'pendente'
                    return (
                      <tr key={req.id} className="hover:bg-secondary/15 transition-colors">
                        {/* Official Target info */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-bold text-sm">
                              {req.oficial_qra[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-white text-sm">{req.oficial_qra}</p>
                              <p className="text-xs text-muted-foreground">@{req.oficial_username}</p>
                            </div>
                          </div>
                        </td>

                        {/* Destination Unit Tag */}
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/15 px-3 py-1 text-xs font-bold text-indigo-400 border border-indigo-500/20">
                            {req.unidade}
                          </span>
                        </td>

                        {/* Requested by Commander */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <UserCheck className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground font-medium">{req.requerente_qra}</span>
                          </div>
                        </td>

                        {/* Created Date */}
                        <td className="px-6 py-4 text-muted-foreground text-xs">
                          {new Date(req.created_at).toLocaleDateString('pt-BR')} às {' '}
                          {new Date(req.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </td>

                        {/* Status Badge */}
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            req.status === 'pendente' ? 'text-yellow-400 bg-yellow-400/10 border border-yellow-400/20' :
                            req.status === 'aceito' ? 'text-green-400 bg-green-400/10 border border-green-400/20' :
                            'text-red-400 bg-red-400/10 border border-red-400/20'
                          }`}>
                            {req.status === 'pendente' && <Clock className="h-3 w-3" />}
                            {req.status === 'aceito' && <Check className="h-3 w-3" />}
                            {req.status === 'recusado' && <X className="h-3 w-3" />}
                            {req.status === 'pendente' ? 'Pendente' : req.status === 'aceito' ? 'Aprovado' : 'Recusado'}
                          </span>
                        </td>

                        {/* Actions buttons exclusively for Alto Comando */}
                        {isAltoComando && (
                          <td className="px-6 py-4 text-right">
                            {isPending ? (
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleProcessRequest(req.id, 'aceitar')}
                                  disabled={processingId === req.id}
                                  className="h-8 bg-green-600 hover:bg-green-500 text-white font-semibold text-xs transition-colors gap-1 px-3"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                  Aceitar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleProcessRequest(req.id, 'recusar')}
                                  disabled={processingId === req.id}
                                  className="h-8 border-red-500/40 text-red-400 hover:bg-red-500/10 font-semibold text-xs transition-colors gap-1 px-3"
                                >
                                  <X className="h-3.5 w-3.5" />
                                  Recusar
                                </Button>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground/60 italic">Processado</span>
                            )}
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </main>
  )
}
