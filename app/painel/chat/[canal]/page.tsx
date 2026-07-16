'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import { useAuth } from '@/lib/auth-context'
import {
  Send,
  Users,
  Clock,
  ArrowLeft,
  ChevronUp,
  MessageSquare,
  Shield,
  Loader2,
  Lock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

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

const CANAL_TITLES: Record<string, string> = {
  'geral': 'Chat Geral',
  'apm': 'Chat APM',
  'bope': 'Chat BOPE',
  'core': 'Chat CORE',
  'gaep': 'Chat GAEP',
  'gtm': 'Chat GTM',
  'gar': 'Chat GAR',
  'alto-comando': 'Chat Alto Comando',
}

export default function ChatCanalPage({
  params,
}: {
  params: Promise<{ canal: string }>
}) {
  const { canal } = React.use(params)
  const router = useRouter()
  const { user, profile, session } = useAuth()

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  const canalTitle = CANAL_TITLES[canal] || `Chat ${canal.toUpperCase()}`

  // Client-side permissions check to display immediate Feedback if needed
  const hasAccess = (): boolean => {
    if (!profile || profile.status !== 'aprovado') return false
    if (profile.role === 'admin') return true

    const cargos: string[] = profile.cargo || []
    const unidade: string = profile.unidade_operacional || ''

    switch (canal) {
      case 'geral':
        return true
      case 'apm':
        return cargos.some((c: string) =>
          ['Instrutor Treinamento Operacional', 'Instrutor De Cursos e Recrutamentos', 'Supervisor APM', 'Diretor APM', 'Alto Comando'].includes(c)
        )
      case 'bope':
        return unidade.toUpperCase() === 'BOPE'
      case 'core':
        return unidade.toUpperCase() === 'CORE'
      case 'gaep':
        return unidade.toUpperCase() === 'GAEP'
      case 'gtm':
        return unidade.toUpperCase() === 'GTM'
      case 'gar':
        return unidade.toUpperCase() === 'GAR'
      case 'alto-comando':
        return cargos.some((c: string) => ['Alto Comando'].includes(c))
      default:
        return false
    }
  }

  // Load messages
  const loadMessages = async (beforeTimestamp?: string) => {
    if (!session?.access_token) return

    try {
      if (beforeTimestamp) {
        setLoadingOlder(true)
      } else {
        setLoading(true)
      }

      let url = `/api/chats?canal=${encodeURIComponent(canal)}&limit=40`
      if (beforeTimestamp) {
        url += `&before=${encodeURIComponent(beforeTimestamp)}`
      }

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (!res.ok) {
        const errJson = await res.json()
        throw new Error(errJson.error || 'Erro ao carregar mensagens.')
      }

      const data = await res.json()
      const newMsgs: ChatMessage[] = data.messages || []

      if (newMsgs.length < 40) {
        setHasMore(false)
      }

      if (beforeTimestamp) {
        setMessages((prev) => {
          // Merge and avoid duplicates
          const combined = [...newMsgs, ...prev]
          const unique = combined.filter(
            (msg, index, self) => self.findIndex((m) => m.id === msg.id) === index
          )
          return unique.sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          )
        })
      } else {
        setMessages(newMsgs.sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        ))
        // Scroll to bottom on initial load
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
        }, 100)
      }
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Falha ao conectar no chat.')
    } finally {
      setLoading(false)
      setLoadingOlder(false)
    }
  }

  // Effect to load messages on init and permission check
  useEffect(() => {
    if (profile && !hasAccess()) {
      setError('Acesso negado. Você não possui a Unidade Operacional ou o Cargo exigido para este canal.')
      setLoading(false)
      return
    }

    if (session?.access_token) {
      loadMessages()
    }
  }, [canal, session, profile])

  // Real-time SSE listener
  useEffect(() => {
    const handleSSE = (e: Event) => {
      const customEvent = e as CustomEvent
      const { event, payload } = customEvent.detail
      
      if (event === 'chat-message' && payload?.canal === canal) {
        const newMsg: ChatMessage = payload.message
        setMessages((prev) => {
          // Avoid duplicate messages
          if (prev.some((m) => m.id === newMsg.id)) return prev
          return [...prev, newMsg]
        })
        
        // Scroll to bottom if user is already near bottom
        if (chatContainerRef.current) {
          const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current
          const isNearBottom = scrollHeight - scrollTop - clientHeight < 250
          if (isNearBottom) {
            setTimeout(() => {
              messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
            }, 80)
          }
        }
      }
    }

    window.addEventListener('sse-event', handleSSE)
    return () => window.removeEventListener('sse-event', handleSSE)
  }, [canal])

  // Handle message send
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputText.trim() || sending || !session?.access_token) return

    setSending(true)
    const textToSend = inputText
    setInputText('')

    try {
      const res = await fetch('/api/chats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          canal,
          content: textToSend,
        }),
      })

      if (!res.ok) {
        const errJson = await res.json()
        throw new Error(errJson.error || 'Erro ao enviar mensagem.')
      }

      // Message is appended via SSE broadcast, but let's scroll down to make sure
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 50)
    } catch (err: any) {
      alert(err.message || 'Falha ao enviar mensagem.')
      setInputText(textToSend) // Restore text
    } finally {
      setSending(false)
    }
  }

  const formatMessageTime = (isoString: string) => {
    const date = new Date(isoString)
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatMessageDate = (isoString: string) => {
    const date = new Date(isoString)
    return date.toLocaleDateString('pt-BR', {
      day: 'numeric',
      month: 'short',
    })
  }

  // Header design for different operational teams
  const getCanalTheme = () => {
    switch (canal) {
      case 'bope':
        return { bg: 'border-amber-500/30 bg-amber-500/5', text: 'text-amber-500', badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20' }
      case 'core':
        return { bg: 'border-red-500/30 bg-red-500/5', text: 'text-red-500', badge: 'bg-red-500/10 text-red-400 border-red-500/20' }
      case 'gaep':
        return { bg: 'border-indigo-500/30 bg-indigo-500/5', text: 'text-indigo-400', badge: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20' }
      case 'gtm':
        return { bg: 'border-sky-500/30 bg-sky-500/5', text: 'text-sky-400', badge: 'bg-sky-500/10 text-sky-300 border-sky-500/20' }
      case 'gar':
        return { bg: 'border-emerald-500/30 bg-emerald-500/5', text: 'text-emerald-400', badge: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' }
      case 'alto-comando':
        return { bg: 'border-purple-500/30 bg-purple-500/5', text: 'text-purple-400', badge: 'bg-purple-500/10 text-purple-300 border-purple-500/20' }
      case 'apm':
        return { bg: 'border-blue-500/30 bg-blue-500/5', text: 'text-blue-400', badge: 'bg-blue-500/10 text-blue-300 border-blue-500/20' }
      default:
        return { bg: 'border-primary/30 bg-primary/5', text: 'text-primary', badge: 'bg-primary/10 text-primary-foreground/90 border-primary/20' }
    }
  }

  const theme = getCanalTheme()

  if (loading && messages.length === 0) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="mt-4 text-sm text-muted-foreground font-mono">ESTABELECENDO CANAL DE RÁDIO...</p>
      </div>
    )
  }

  if (error && messages.length === 0) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center p-6 text-center">
        <div className="rounded-full bg-red-500/10 p-4 border border-red-500/20 text-red-400 mb-4">
          <Lock className="h-10 w-10" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2 font-mono">ACESSO PRIVADO RESTREITO</h2>
        <p className="text-sm text-muted-foreground max-w-md mb-6">{error}</p>
        <Button onClick={() => router.push('/painel')} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao Painel
        </Button>
      </div>
    )
  }

  return (
    <main className="mx-auto flex h-[calc(100vh-80px)] max-w-6xl flex-col px-4 py-4 sm:px-6">
      {/* Dynamic Tactical Sub-header */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border p-4 backdrop-blur-md mb-4 ${theme.bg}`}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/painel')}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-muted-foreground transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          
          <div>
            <div className="flex items-center gap-2">
              <MessageSquare className={`h-5 w-5 ${theme.text}`} />
              <h1 className="text-lg font-mono font-bold uppercase tracking-wider text-white">
                {canalTitle}
              </h1>
            </div>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">
              CANAL DE TRANSMISSÃO CRIPTOGRAFADO SSL-256
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-mono uppercase tracking-wider ${theme.badge}`}>
            {canal === 'geral' ? 'Frequência Livre' : 'Frequência Restrita'}
          </span>
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400 bg-emerald-400/5 border border-emerald-400/10 px-2 py-0.5 rounded-full">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>ONLINE</span>
          </div>
        </div>
      </div>

      {/* Main Chat Interface Window */}
      <div className="flex-1 min-h-0 rounded-2xl border border-border/40 bg-black/40 backdrop-blur-sm flex flex-col overflow-hidden">
        
        {/* Messages list */}
        <div
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 scrollbar-thin scrollbar-thumb-white/10"
        >
          {/* Load older button if hasMore */}
          {hasMore && messages.length > 0 && (
            <div className="flex justify-center pb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (messages.length > 0) {
                    loadMessages(messages[0].createdAt)
                  }
                }}
                disabled={loadingOlder}
                className="h-8 text-xs font-mono border-white/5 bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white"
              >
                {loadingOlder ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Carregando...
                  </>
                ) : (
                  <>
                    <ChevronUp className="mr-1 h-3.5 w-3.5" /> Carregar mensagens anteriores
                  </>
                )}
              </Button>
            </div>
          )}

          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center p-6 text-muted-foreground">
              <div className="rounded-full bg-white/5 border border-white/10 p-4 mb-3">
                <Users className="h-6 w-6 text-muted-foreground/60" />
              </div>
              <p className="text-sm font-mono uppercase">Início da transmissão</p>
              <p className="text-xs text-muted-foreground/80 mt-1 max-w-xs">
                As novas comunicações deste canal aparecerão aqui instantaneamente.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg, idx) => {
                const isMe = msg.userId === user?.id
                const showDateHeader =
                  idx === 0 ||
                  formatMessageDate(messages[idx - 1].createdAt) !== formatMessageDate(msg.createdAt)

                return (
                  <div key={msg.id} className="space-y-2">
                    {showDateHeader && (
                      <div className="flex items-center justify-center py-2">
                        <span className="rounded-full border border-white/5 bg-white/5 px-3 py-1 text-[10px] font-mono text-muted-foreground uppercase">
                          {formatMessageDate(msg.createdAt)}
                        </span>
                      </div>
                    )}

                    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`group relative max-w-[80%] sm:max-w-[70%] rounded-2xl px-4 py-3 border text-sm transition-all duration-300 ${
                          isMe
                            ? 'bg-primary/10 border-primary/30 text-white rounded-tr-none'
                            : 'bg-white/5 border-white/10 text-white rounded-tl-none'
                        }`}
                      >
                        {/* Sender tactical badge */}
                        <div className="flex items-wrap items-center gap-1.5 mb-1.5 select-none">
                          <span className={`text-[11px] font-mono font-bold tracking-wide ${isMe ? 'text-primary' : 'text-primary/90'}`}>
                            {msg.qra}
                          </span>
                          <span className="text-[10px] text-white/30">•</span>
                          <span className="text-[10px] font-mono text-muted-foreground uppercase bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
                            {msg.cargo}
                          </span>
                        </div>

                        {/* Message body */}
                        <p className="whitespace-pre-wrap leading-relaxed break-words pr-4">
                          {msg.content}
                        </p>

                        {/* Timestamp */}
                        <div className="flex items-center justify-end gap-1 text-[9px] text-muted-foreground font-mono mt-1.5 select-none">
                          <Clock className="h-2.5 w-2.5 text-muted-foreground/60" />
                          <span>{formatMessageTime(msg.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Form and Quick Actions */}
        <form
          onSubmit={handleSend}
          className="border-t border-border/40 bg-black/50 p-4 flex gap-2 items-center"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`Sua mensagem no ${canalTitle}...`}
            disabled={sending}
            maxLength={1000}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 font-mono"
          />

          <Button
            type="submit"
            disabled={!inputText.trim() || sending}
            className="h-[46px] w-[46px] rounded-xl flex items-center justify-center shrink-0 p-0"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>

      </div>
    </main>
  )
}
