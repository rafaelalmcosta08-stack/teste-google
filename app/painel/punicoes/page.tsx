'use client'

import { useEffect, useState, useRef } from 'react'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { motion, AnimatePresence } from 'motion/react'
import {
  Scale,
  Search,
  Check,
  PlusCircle,
  AlertTriangle,
  Info,
  Clock,
  User,
  Shield,
  MessageSquare,
  Send,
  Lock,
  ChevronDown,
  X,
  RefreshCw,
  Trash2,
  Calendar
} from 'lucide-react'

const ADVERTENCIAS_OPTIONS = [
  'Advertência Verbal',
  '1º Advertência',
  '2º Advertência',
  '3º Advertência',
  'Advertência Ação 1/3',
  'Advertência Ação 2/3',
  'Advertência Ação 3/3',
]

interface Punicao {
  id: string
  oficialId: string
  oficialQra: string
  oficialUsername: string
  motivo: string
  tipoAdvertencia?: string
  creatorId: string
  creatorQra: string
  status: 'ativa' | 'mantida' | 'removida'
  recorrida: boolean
  recursoStatus?: 'pendente' | 'mantido' | 'removido'
  createdAt: string
}

interface Usuario {
  id: string
  username: string
  qra?: string
  patente?: string
  cargo?: string[]
}

interface ChatMessage {
  id: string
  canal: string
  userId: string
  username: string
  qra: string
  patente: string
  cargo: string
  content: string
  createdAt: string
}

export default function PunicoesPage() {
  const { profile, session } = useAuth()
  const [punicoes, setPunicoes] = useState<Punicao[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)

  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [oficialSearch, setOficialSearch] = useState('')
  const [selectedOficial, setSelectedOficial] = useState<Usuario | null>(null)
  const [isOficialFocused, setIsOficialFocused] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [tipoAdvertencia, setTipoAdvertencia] = useState('1º Advertência')
  const [publishing, setPublishing] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)

  // Recourse Chat States
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [newMessageText, setNewMessageText] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [actionInProgress, setActionInProgress] = useState<string | null>(null)

  const chatBottomRef = useRef<HTMLDivElement>(null)

  const isDiretorCorregedoria = profile?.cargo?.includes('Diretor Corregedoria') || profile?.role === 'admin'
  const isAltoComando = profile?.cargo?.includes('Alto Comando') || profile?.role === 'admin'

  const fetchPunicoes = async () => {
    try {
      const res = await fetch('/api/punicoes')
      if (res.ok) {
        const json = await res.json()
        const loadedPunicoes = json.punicoes || []
        setPunicoes(loadedPunicoes)

        // Mark active warnings targeting this user as read
        if (session?.user?.id) {
          const myId = session.user.id
          try {
            const readPunicoes: string[] = JSON.parse(localStorage.getItem('read_punicoes_ids') || '[]')
            let changed = false
            const myActivePunicoes = loadedPunicoes.filter((p: any) => p.oficialId === myId && p.status === 'ativa')
            for (const p of myActivePunicoes) {
              if (!readPunicoes.includes(p.id)) {
                readPunicoes.push(p.id)
                changed = true
              }
            }
            if (changed) {
              localStorage.setItem('read_punicoes_ids', JSON.stringify(readPunicoes))
              window.dispatchEvent(new CustomEvent('notifications-update'))
            }
          } catch (e) {
            console.error(e)
          }
        }
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const fetchUsuarios = async () => {
    if (!session) return
    try {
      const res = await fetch('/api/admin/usuarios', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      if (res.ok) {
        const json = await res.json()
        setUsuarios(json.usuarios || [])
      }
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    fetchPunicoes()
    fetchUsuarios()
  }, [session])

  // Scroll to bottom of chat
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [chatMessages])

  // Poll chat messages if a chat is active
  useEffect(() => {
    let interval: any
    if (activeChatId && session) {
      loadChatMessages(activeChatId)
      interval = setInterval(() => {
        loadChatMessages(activeChatId, true)
      }, 4000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [activeChatId, session])

  const loadChatMessages = async (punicaoId: string, isSilent = false) => {
    if (!session) return
    if (!isSilent) setLoadingMessages(true)
    try {
      const canalName = `recurso_${punicaoId}`
      const res = await fetch(`/api/chats?canal=${encodeURIComponent(canalName)}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      if (res.ok) {
        const json = await res.json()
        setChatMessages(json.messages || [])
        
        // Mark recourse chat messages as read
        localStorage.setItem(`last_read_chat_recurso_${punicaoId}`, new Date().toISOString())
        window.dispatchEvent(new CustomEvent('notifications-update'))
      }
    } catch (e) {
      console.error(e)
    } finally {
      if (!isSilent) setLoadingMessages(false)
    }
  }

  const filteredUsuarios = usuarios.filter((u) => {
    const term = oficialSearch.toLowerCase()
    const qraMatch = (u.qra || '').toLowerCase().includes(term)
    const usernameMatch = (u.username || '').toLowerCase().includes(term)
    return term === '' || qraMatch || usernameMatch
  })

  const handleApplyPunish = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session) return
    if (!selectedOficial) {
      setFormError('Selecione o oficial que receberá a advertência.')
      return
    }
    if (!tipoAdvertencia) {
      setFormError('Selecione o tipo de advertência.')
      return
    }
    if (!motivo.trim()) {
      setFormError('Especifique o motivo da punição administrativa.')
      return
    }

    setPublishing(true)
    setFormError(null)
    setFormSuccess(null)

    try {
      const res = await fetch('/api/punicoes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          oficialId: selectedOficial.id,
          motivo,
          tipoAdvertencia
        })
      })

      const data = await res.json()
      if (!res.ok) {
        setFormError(data.error || 'Erro ao aplicar punição.')
      } else {
        setFormSuccess(`Punição aplicada a ${selectedOficial.qra || selectedOficial.username} com sucesso! Oficial agora está "Sob Advertência".`)
        setSelectedOficial(null)
        setOficialSearch('')
        setMotivo('')
        setTipoAdvertencia('1º Advertência')
        setIsFormOpen(false)
        fetchPunicoes()
      }
    } catch (err: any) {
      setFormError(err.message || 'Erro ao comunicar com o servidor.')
    } finally {
      setPublishing(false)
    }
  }

  const handleAppeal = async (punicaoId: string) => {
    if (!session) return
    setActionInProgress(`recorrer_${punicaoId}`)
    try {
      const res = await fetch('/api/punicoes', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          action: 'recorrer',
          punicaoId
        })
      })

      if (res.ok) {
        fetchPunicoes()
        setActiveChatId(punicaoId)
      } else {
        const data = await res.json()
        alert(data.error || 'Não foi possível solicitar o recurso.')
      }
    } catch (err: any) {
      alert('Erro: ' + err.message)
    } finally {
      setActionInProgress(null)
    }
  }

  const handleDecide = async (punicaoId: string, decisao: 'manter' | 'remover') => {
    if (!session) return
    if (!confirm(`Tem certeza que deseja ${decisao === 'manter' ? 'MANTER' : 'REMOVER'} esta punição administrativamente?`)) return

    setActionInProgress(`decidir_${punicaoId}_${decisao}`)
    try {
      const res = await fetch('/api/punicoes', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          action: 'decidir',
          punicaoId,
          decisao
        })
      })

      if (res.ok) {
        fetchPunicoes()
        if (decisao === 'remover') {
          setActiveChatId(null)
        } else {
          loadChatMessages(punicaoId)
        }
      } else {
        const data = await res.json()
        alert(data.error || 'Erro ao processar decisão.')
      }
    } catch (err: any) {
      alert('Erro: ' + err.message)
    } finally {
      setActionInProgress(null)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session || !activeChatId || !newMessageText.trim()) return

    setSendingMessage(true)
    try {
      const canalName = `recurso_${activeChatId}`
      const res = await fetch('/api/chats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          canal: canalName,
          content: newMessageText.trim()
        })
      })

      if (res.ok) {
        setNewMessageText('')
        loadChatMessages(activeChatId)
      } else {
        const data = await res.json()
        alert(data.error || 'Erro ao enviar mensagem.')
      }
    } catch (err: any) {
      alert('Erro: ' + err.message)
    } finally {
      setSendingMessage(false)
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 md:p-6" id="corregedoria_module">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-800 pb-5" id="corregedoria_header">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
            <Scale className="h-8 w-8 text-rose-500" />
            Corregedoria Policial
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Gestão de sanções, punições administrativas e instâncias recursais.
          </p>
        </div>

        {isDiretorCorregedoria && (
          <Button
            onClick={() => setIsFormOpen(!isFormOpen)}
            id="btn_toggle_punicao"
            className="bg-rose-700 hover:bg-rose-600 text-white font-semibold shadow-lg shadow-rose-700/20 px-5 py-2.5 rounded-lg flex items-center gap-2 transition duration-200"
          >
            <PlusCircle className="h-5 w-5" />
            Aplicar Punição
          </Button>
        )}
      </div>

      {/* Form Container */}
      <AnimatePresence>
        {isFormOpen && isDiretorCorregedoria && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
            id="punicao_form_container"
          >
            <form
              onSubmit={handleApplyPunish}
              className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-6 shadow-xl"
            >
              <div className="flex justify-between items-center border-b border-gray-800 pb-3">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-rose-500" />
                  Nova Punição Administrativa (Advertência)
                </h2>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="text-gray-400 hover:text-white transition"
                >
                  Fechar
                </button>
              </div>

              {formError && (
                <div className="bg-red-900/30 border border-red-500/50 text-red-200 p-4 rounded-lg flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-sm">{formError}</p>
                </div>
              )}

              {formSuccess && (
                <div className="bg-emerald-900/30 border border-emerald-500/50 text-emerald-200 p-4 rounded-lg flex items-start gap-3">
                  <Check className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                  <p className="text-sm">{formSuccess}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Autocomplete Oficial */}
                <div className="relative space-y-2">
                  <label className="block text-sm font-medium text-gray-300">Oficial Punido</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-5 w-5 text-gray-500" />
                    <Input
                      type="text"
                      placeholder="Pesquisar oficial por QRA..."
                      value={oficialSearch}
                      onChange={(e) => {
                        setOficialSearch(e.target.value)
                        if (selectedOficial) setSelectedOficial(null)
                      }}
                      onFocus={() => setIsOficialFocused(true)}
                      onBlur={() => setTimeout(() => setIsOficialFocused(false), 200)}
                      className="bg-gray-950 border-gray-800 focus:border-rose-500 pl-10 text-white rounded-lg w-full h-11"
                    />
                  </div>

                  {selectedOficial && (
                    <div className="bg-rose-950/20 border border-rose-500/30 rounded-lg p-3 mt-2 flex justify-between items-center">
                      <div>
                        <p className="text-white font-semibold">{selectedOficial.qra || selectedOficial.username}</p>
                        <p className="text-xs text-gray-400">{selectedOficial.patente || 'Sem patente'}</p>
                      </div>
                      <Check className="h-5 w-5 text-rose-500" />
                    </div>
                  )}

                  {isOficialFocused && !selectedOficial && filteredUsuarios.length > 0 && (
                    <div className="absolute z-30 left-0 right-0 max-h-56 overflow-y-auto bg-gray-950 border border-gray-800 rounded-lg shadow-2xl divide-y divide-gray-900 mt-1">
                      {filteredUsuarios.map((u) => (
                        <div
                          key={u.id}
                          onMouseDown={() => {
                            setSelectedOficial(u)
                            setOficialSearch(u.qra || u.username)
                          }}
                          className="p-3 hover:bg-gray-900 cursor-pointer text-left transition"
                        >
                          <p className="text-sm font-semibold text-white">{u.qra || u.username}</p>
                          <p className="text-xs text-gray-400">{u.patente || 'Sem patente'}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Tipo de Advertência */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300">Tipo de Advertência</label>
                  <select
                    value={tipoAdvertencia}
                    onChange={(e) => setTipoAdvertencia(e.target.value)}
                    className="bg-gray-950 border border-gray-800 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 text-white rounded-lg w-full h-11 px-3 text-sm outline-none transition"
                  >
                    {ADVERTENCIAS_OPTIONS.map((adv) => (
                      <option key={adv} value={adv} className="bg-gray-950 text-white">{adv}</option>
                    ))}
                  </select>
                </div>

                {/* Motivo */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300">Motivo da Advertência</label>
                  <Input
                    type="text"
                    placeholder="Ex: Descumprimento de protocolo, desvio de conduta..."
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    className="bg-gray-950 border-gray-800 focus:border-rose-500 text-white rounded-lg w-full h-11"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-gray-800">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsFormOpen(false)}
                  className="text-gray-400 hover:text-white"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={publishing}
                  className="bg-rose-700 hover:bg-rose-600 text-white font-semibold px-6 py-2.5 rounded-lg shadow-lg shadow-rose-700/20"
                >
                  {publishing ? 'Aplicando...' : 'Publicar Advertência'}
                </Button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Punishments Feed Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Feed Column */}
        <div className="lg:col-span-2 space-y-4" id="punicoes_feed">
          <h2 className="text-xl font-bold text-gray-300 flex items-center gap-2">
            <Clock className="h-5 w-5 text-gray-400" />
            Quadro de Advertências Ativas
          </h2>

          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 text-gray-500 space-y-2">
              <div className="animate-spin h-8 w-8 border-4 border-rose-500 border-t-transparent rounded-full" />
              <p className="text-sm">Carregando quadro corregedor...</p>
            </div>
          ) : punicoes.length === 0 ? (
            <div className="bg-gray-900/50 border border-gray-800/80 rounded-xl p-12 text-center text-gray-500">
              <Info className="h-10 w-10 mx-auto text-gray-600 mb-2" />
              <p className="font-semibold text-gray-400">Nenhuma punição ativa</p>
              <p className="text-sm text-gray-500 mt-1">A corporação encontra-se livre de punições ou advertências no momento.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {punicoes.map((p) => {
                const canAppeal = profile?.id === p.oficialId && !p.recorrida
                const hasChatAccess = profile && (profile.id === p.oficialId || isAltoComando || isDiretorCorregedoria)

                return (
                  <div
                    key={p.id}
                    className="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-lg space-y-4 hover:border-gray-800/80 transition-all"
                    id={`pun_card_${p.id}`}
                  >
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-800/60 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="bg-rose-950/40 border border-rose-500/30 text-rose-400 px-3 py-1 text-xs font-extrabold rounded-lg uppercase flex items-center gap-1.5">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          {p.tipoAdvertencia || 'Sob Advertência'}
                        </span>
                        <span className="text-[10px] text-gray-500 font-mono">RECORRIDA: {p.recorrida ? 'SIM' : 'NÃO'}</span>
                      </div>
                      <span className="text-xs text-gray-400 flex items-center gap-1 font-mono">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(p.createdAt).toLocaleDateString('pt-BR')}
                      </span>
                    </div>

                    {/* Official Details */}
                    <div className="flex items-center justify-between gap-4 bg-gray-950/40 p-3 rounded-lg border border-gray-800/40">
                      <div>
                        <span className="block text-[10px] uppercase text-gray-500 font-bold tracking-wider">Oficial Punido</span>
                        <span className="font-extrabold text-white text-base">{p.oficialQra}</span>
                        <span className="text-xs text-gray-400 block">@{p.oficialUsername}</span>
                      </div>
                      <div className="text-right">
                        <span className="block text-[10px] uppercase text-gray-500 font-bold tracking-wider">Aplicador</span>
                        <span className="font-bold text-rose-400 text-sm">{p.creatorQra}</span>
                      </div>
                    </div>

                    {/* Motivo */}
                    <div className="space-y-1">
                      <span className="block text-[10px] uppercase text-gray-500 font-bold tracking-wider">Motivo da Infração</span>
                      <p className="text-gray-300 text-sm font-medium">{p.motivo}</p>
                    </div>

                    {/* Actions and Recourse status */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-800/80">
                      {/* Left: appeal status tag */}
                      <div>
                        {p.recorrida ? (
                          <div className={`px-3 py-1.5 text-xs font-bold rounded-lg ${
                            p.recursoStatus === 'pendente' ? 'bg-amber-950/40 border border-amber-500/40 text-amber-400' :
                            p.recursoStatus === 'mantido' ? 'bg-red-950/40 border border-red-500/40 text-red-400' :
                            'bg-emerald-950/40 border border-emerald-500/40 text-emerald-400'
                          }`}>
                            Recurso: {p.recursoStatus === 'pendente' ? 'Aguardando Análise' : p.recursoStatus === 'mantido' ? 'Punição Mantida' : 'Removida'}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500 italic">Nenhum recurso solicitado ainda</span>
                        )}
                      </div>

                      {/* Right: action buttons */}
                      <div className="flex items-center gap-2">
                        {canAppeal && (
                          <Button
                            size="sm"
                            onClick={() => handleAppeal(p.id)}
                            disabled={actionInProgress === `recorrer_${p.id}`}
                            className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold"
                          >
                            Recorrer desta Punição
                          </Button>
                        )}

                        {p.recorrida && hasChatAccess && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (activeChatId === p.id) {
                                setActiveChatId(null)
                              } else {
                                setActiveChatId(p.id)
                              }
                            }}
                            className={`text-xs gap-1.5 ${activeChatId === p.id ? 'bg-indigo-600 text-white' : 'border-gray-800 text-gray-300 hover:text-white'}`}
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                            {activeChatId === p.id ? 'Fechar Chat' : 'Acessar Chat Recurso'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Recourse Chat Sidebox Column */}
        <div className="space-y-4" id="punicoes_recourse_chat_column">
          <h2 className="text-xl font-bold text-gray-300 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-gray-400" />
            Canal de Recurso Ativo
          </h2>

          {activeChatId ? (
            <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-xl flex flex-col h-[520px]" id="recourse_chat_box">
              {/* Box Header */}
              <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-gray-950/40 rounded-t-xl">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <Shield className="h-4 w-4 text-indigo-400" />
                    Sala de Defesa Privada
                  </h3>
                  <p className="text-[10px] text-gray-400 mt-0.5">ID Punição: {activeChatId}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => loadChatMessages(activeChatId)}
                    className="p-1.5 text-gray-400 hover:text-white rounded-md hover:bg-gray-800 transition"
                    title="Recarregar"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setActiveChatId(null)}
                    className="p-1.5 text-gray-400 hover:text-white rounded-md hover:bg-gray-800 transition"
                    title="Fechar"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Box Decision Actions (Only for Corregedoria and Alto Comando) */}
              {(isAltoComando || isDiretorCorregedoria) && (
                <div className="p-3 border-b border-gray-800/80 bg-rose-950/10 flex items-center justify-between gap-2 text-xs">
                  <span className="font-bold text-rose-400">Decisão Corregedora:</span>
                  <div className="flex gap-1.5">
                    <Button
                      size="sm"
                      onClick={() => handleDecide(activeChatId, 'manter')}
                      disabled={actionInProgress?.startsWith('decidir_')}
                      className="bg-red-700 hover:bg-red-600 text-white px-2.5 py-1 text-[11px] h-7 font-bold rounded"
                    >
                      Manter Punição
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleDecide(activeChatId, 'remover')}
                      disabled={actionInProgress?.startsWith('decidir_')}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 text-[11px] h-7 font-bold rounded"
                    >
                      Remover Punição
                    </Button>
                  </div>
                </div>
              )}

              {/* Chat Message Window */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-950/20">
                {loadingMessages ? (
                  <div className="flex justify-center items-center h-full text-gray-500 text-xs gap-2">
                    <div className="animate-spin h-3.5 w-3.5 border-2 border-gray-400 border-t-transparent rounded-full" />
                    Carregando conversas...
                  </div>
                ) : chatMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-600 text-center px-4">
                    <Info className="h-6 w-6 text-gray-700 mb-1" />
                    <p className="text-xs font-semibold">Nenhuma mensagem enviada</p>
                    <p className="text-[10px] text-gray-600 mt-0.5">As discussões oficiais de defesa podem ser realizadas por aqui.</p>
                  </div>
                ) : (
                  chatMessages.map((m) => {
                    const isMe = m.userId === profile?.id
                    const isSystem = m.userId === '00000000-0000-0000-0000-000000000000'

                    if (isSystem) {
                      return (
                        <div key={m.id} className="bg-gray-950/80 border border-gray-800/80 text-rose-400/90 rounded-lg p-3 text-xs leading-normal">
                          {m.content}
                        </div>
                      )
                    }

                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col max-w-[85%] ${isMe ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                      >
                        <span className="text-[10px] text-gray-500 mb-0.5 px-1 font-semibold">
                          {m.qra} • <span className="text-indigo-400/80">{m.patente}</span>
                        </span>
                        <div className={`p-3 rounded-xl text-xs leading-relaxed ${isMe ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-gray-800 text-gray-200 rounded-tl-none border border-gray-700/60'}`}>
                          {m.content}
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Chat Input area */}
              {/* Check if punishment is locked because it was decided already */}
              {(() => {
                const activePun = punicoes.find(p => p.id === activeChatId)
                const isDecided = activePun && (activePun.status === 'mantida' || activePun.status === 'removida')

                if (isDecided) {
                  return (
                    <div className="p-4 bg-gray-950 border-t border-gray-800/80 text-center text-xs text-gray-500 font-semibold select-none flex items-center justify-center gap-1.5">
                      <Lock className="h-3.5 w-3.5 text-rose-500" />
                      Este caso foi decidido e o chat está bloqueado.
                    </div>
                  )
                }

                return (
                  <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-800 flex gap-2 bg-gray-950/40">
                    <Input
                      type="text"
                      placeholder="Escrever mensagem..."
                      value={newMessageText}
                      onChange={(e) => setNewMessageText(e.target.value)}
                      disabled={sendingMessage}
                      className="bg-gray-950 border-gray-800 focus:border-indigo-500 text-xs h-9 rounded-md text-white"
                    />
                    <Button
                      type="submit"
                      size="icon"
                      disabled={sendingMessage || !newMessageText.trim()}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white h-9 w-9 shrink-0"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                )
              })()}
            </div>
          ) : (
            <div className="bg-gray-900/40 border border-gray-800/80 rounded-xl p-8 text-center text-gray-500 select-none h-48 flex flex-col justify-center items-center">
              <MessageSquare className="h-8 w-8 text-gray-700 mb-2" />
              <p className="text-xs font-bold text-gray-400">Nenhum Recurso Selecionado</p>
              <p className="text-[10px] text-gray-500 mt-1 max-w-[200px] mx-auto">Clique no botão "Acessar Chat Recurso" em qualquer infração sob contestação para abrir a sala.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
