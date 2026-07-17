'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'

export interface NotificationItem {
  id: string
  type: 'aviso' | 'curso' | 'edital' | 'chat'
  title: string
  description: string
  href: string
  createdAt: string
  isUrgent?: boolean
}

interface NotificationContextType {
  counts: {
    avisos: number
    cursos: number
    editais: number
    chat_apm: number
    chat_alto_comando: number
    registro_unidade: number
    corregedoria: number
    administracao: number
    total: number
  }
  notifications: NotificationItem[]
  refresh: () => Promise<void>
  markAsRead: (type: 'aviso' | 'curso' | 'edital' | 'chat', id: string) => Promise<void>
  clearAll: () => void
}

const NotificationContext = createContext<NotificationContextType>({
  counts: {
    avisos: 0,
    cursos: 0,
    editais: 0,
    chat_apm: 0,
    chat_alto_comando: 0,
    registro_unidade: 0,
    corregedoria: 0,
    administracao: 0,
    total: 0
  },
  notifications: [],
  refresh: async () => {},
  markAsRead: async () => {},
  clearAll: () => {},
})

export const useNotifications = () => useContext(NotificationContext)

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user, profile, session } = useAuth()
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [counts, setCounts] = useState({
    avisos: 0,
    cursos: 0,
    editais: 0,
    chat_apm: 0,
    chat_alto_comando: 0,
    registro_unidade: 0,
    corregedoria: 0,
    administracao: 0,
    total: 0,
  })

  const refresh = useCallback(async () => {
    if (!user || !profile || !session?.access_token) {
      setCounts({
        avisos: 0,
        cursos: 0,
        editais: 0,
        chat_apm: 0,
        chat_alto_comando: 0,
        registro_unidade: 0,
        corregedoria: 0,
        administracao: 0,
        total: 0
      })
      setNotifications([])
      return
    }

    try {
      const headers = { Authorization: `Bearer ${session.access_token}` }

      // Parallel fetch with error recovery (best-effort)
      const [
        avisosRes,
        cursosRes,
        editaisRes,
        registroUnidadesRes,
        punicoesRes,
        adminUsuariosRes
      ] = await Promise.all([
        fetch('/api/avisos', { headers }).catch(() => null),
        fetch('/api/cursos', { headers }).catch(() => null),
        fetch('/api/editais', { headers }).catch(() => null),
        fetch('/api/registro-unidades', { headers }).catch(() => null),
        fetch('/api/punicoes', { headers }).catch(() => null),
        profile.role === 'admin'
          ? fetch('/api/admin/usuarios', { headers }).catch(() => null)
          : Promise.resolve(null)
      ])

      const avisosData = avisosRes && avisosRes.ok ? await avisosRes.json() : { avisos: [] }
      const cursosData = cursosRes && cursosRes.ok ? await cursosRes.json() : { courses: [] }
      const editaisData = editaisRes && editaisRes.ok ? await editaisRes.json() : { editais: [] }
      const registroUnidadesData = registroUnidadesRes && registroUnidadesRes.ok ? await registroUnidadesRes.json() : { solicitacoes: [] }
      const punicoesData = punicoesRes && punicoesRes.ok ? await punicoesRes.json() : { punicoes: [] }
      const adminUsuariosData = adminUsuariosRes && adminUsuariosRes.ok ? await adminUsuariosRes.json() : { usuarios: [] }

      const rawAvisos = avisosData.avisos || []
      const rawCursos = cursosData.courses || []
      const rawEditais = editaisData.editais || []

      // Read arrays of already viewed courses, editais, and warnings from localStorage
      const readCoursesIds: string[] = JSON.parse(localStorage.getItem('read_courses_ids') || '[]')
      const readEditaisIds: string[] = JSON.parse(localStorage.getItem('read_editais_ids') || '[]')
      const readPunicoesIds: string[] = JSON.parse(localStorage.getItem('read_punicoes_ids') || '[]')

      // Current Date ISO string in America/Sao_Paulo timezone or standard Swedish format (YYYY-MM-DDTHH:MM:SS)
      const nowStr = new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'America/Sao_Paulo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }).format(new Date()).replace(' ', 'T')

      // Calculate unread items
      const unreadAvisos = rawAvisos.filter((av: any) => !av.readBy?.includes(user.id))
      const unreadCursos = rawCursos.filter(
        (cur: any) => cur.endDate >= nowStr && !readCoursesIds.includes(cur.id)
      )
      const unreadEditais = rawEditais.filter(
        (ed: any) => ed.endDate >= nowStr && !readEditaisIds.includes(ed.id)
      )

      // Chat messages for APM and Alto Comando if authorized
      const cargos = profile.cargo || []
      const isAltoComando = cargos.includes('Alto Comando') || profile.role === 'admin'
      const hasApmAccess = profile.role === 'admin' || cargos.some((c: string) =>
        ['Instrutor Treinamento Operacional', 'Instrutor De Cursos e Recrutamentos', 'Supervisor APM', 'Diretor APM', 'Alto Comando'].includes(c)
      )

      let chatApmUnread = 0
      let chatAltoComandoUnread = 0

      const chatFetches: Promise<any>[] = []

      if (hasApmAccess) {
        chatFetches.push(
          fetch('/api/chats?canal=apm&limit=15', { headers })
            .then((res) => (res.ok ? res.json() : { messages: [] }))
            .then((data) => {
              const lastRead = localStorage.getItem('last_read_chat_apm')
              if (!lastRead) {
                localStorage.setItem('last_read_chat_apm', new Date().toISOString())
                return 0
              }
              const unread = (data.messages || []).filter(
                (m: any) => m.userId !== user.id && m.createdAt > lastRead
              )
              chatApmUnread = unread.length
              return unread
            })
            .catch(() => 0)
        )
      }

      if (isAltoComando) {
        chatFetches.push(
          fetch('/api/chats?canal=alto-comando&limit=15', { headers })
            .then((res) => (res.ok ? res.json() : { messages: [] }))
            .then((data) => {
              const lastRead = localStorage.getItem('last_read_chat_alto-comando')
              if (!lastRead) {
                localStorage.setItem('last_read_chat_alto-comando', new Date().toISOString())
                return 0
              }
              const unread = (data.messages || []).filter(
                (m: any) => m.userId !== user.id && m.createdAt > lastRead
              )
              chatAltoComandoUnread = unread.length
              return unread
            })
            .catch(() => 0)
        )
      }

      const fetchedChats = await Promise.all(chatFetches)

      // Generate the consolidated list of notification items
      const newNotificationsList: NotificationItem[] = []

      // 1. Add unread Announcements
      unreadAvisos.forEach((av: any) => {
        newNotificationsList.push({
          id: av.id,
          type: 'aviso',
          title: 'Novo Aviso Geral',
          description: av.title,
          href: '/painel',
          createdAt: av.createdAt || new Date().toISOString(),
        })
      })

      // 2. Add unread Courses
      unreadCursos.forEach((cur: any) => {
        const hoursLeft = (new Date(cur.endDate).getTime() - new Date().getTime()) / 3600000
        newNotificationsList.push({
          id: cur.id,
          type: 'curso',
          title: 'Novo Curso Disponível',
          description: `${cur.title} - Vagas: ${cur.subscribers?.length || 0}/${cur.vagasLimit}`,
          href: '/painel/cursos',
          createdAt: cur.createdAt || new Date().toISOString(),
          isUrgent: hoursLeft <= 24 && hoursLeft > 0,
        })
      })

      // 3. Add unread Editais
      unreadEditais.forEach((ed: any) => {
        const hoursLeft = (new Date(ed.endDate).getTime() - new Date().getTime()) / 3600000
        newNotificationsList.push({
          id: ed.id,
          type: 'edital',
          title: 'Novo Edital Publicado',
          description: `${ed.title} - ${ed.unidade}`,
          href: '/painel/editais',
          createdAt: ed.createdAt || new Date().toISOString(),
          isUrgent: hoursLeft <= 24 && hoursLeft > 0,
        })
      })

      // 4. Add Chat unreads
      if (chatApmUnread > 0) {
        const apmMessages = fetchedChats[0] || []
        const lastMsg = apmMessages[apmMessages.length - 1]
        newNotificationsList.push({
          id: 'chat-apm',
          type: 'chat',
          title: 'Mensagem no Chat APM',
          description: lastMsg ? `${lastMsg.qra}: ${lastMsg.content.slice(0, 30)}...` : 'Novas mensagens pendentes',
          href: '/painel/chat/apm',
          createdAt: lastMsg?.createdAt || new Date().toISOString(),
        })
      }

      if (chatAltoComandoUnread > 0) {
        const index = hasApmAccess ? 1 : 0
        const acMessages = fetchedChats[index] || []
        const lastMsg = acMessages[acMessages.length - 1]
        newNotificationsList.push({
          id: 'chat-alto-comando',
          type: 'chat',
          title: 'Mensagem no Chat Alto Comando',
          description: lastMsg ? `${lastMsg.qra}: ${lastMsg.content.slice(0, 30)}...` : 'Novas mensagens pendentes',
          href: '/painel/chat/alto-comando',
          createdAt: lastMsg?.createdAt || new Date().toISOString(),
        })
      }

      // 5. Registro de Unidade Notifications
      const rawSolicitacoes = registroUnidadesData.solicitacoes || []
      const pendingSolicitacoes = rawSolicitacoes.filter((s: any) => s.status === 'pendente')
      
      let unreadRegistroUnidadesCount = 0
      if (isAltoComando) {
        unreadRegistroUnidadesCount = pendingSolicitacoes.length
        pendingSolicitacoes.forEach((s: any) => {
          const isPatentType = s.unidade.startsWith('patente:')
          const targetValue = isPatentType ? s.unidade.replace('patente:', '') : s.unidade
          const titleText = isPatentType ? 'Nova Solicitação de Patente' : 'Nova Solicitação de Unidade'
          const descText = isPatentType 
            ? `${s.requerente_qra} solicitou a patente ${targetValue} para ${s.oficial_qra}`
            : `${s.requerente_qra} solicitou ${targetValue} para ${s.oficial_qra}`

          newNotificationsList.push({
            id: `reg-unid-${s.id}`,
            type: 'chat',
            title: titleText,
            description: descText,
            href: '/painel/registro-unidade',
            createdAt: s.created_at || new Date().toISOString(),
          })
        })
      } else {
        const myPending = pendingSolicitacoes.filter((s: any) => s.oficial_id === user.id)
        unreadRegistroUnidadesCount = myPending.length
        myPending.forEach((s: any) => {
          const isPatentType = s.unidade.startsWith('patente:')
          const targetValue = isPatentType ? s.unidade.replace('patente:', '') : s.unidade
          const titleText = isPatentType ? 'Sua Patente foi Solicitada' : 'Sua Unidade foi Solicitada'
          const descText = isPatentType
            ? `${s.requerente_qra} solicitou sua patente como ${targetValue}`
            : `${s.requerente_qra} solicitou seu registro na unidade ${targetValue}`

          newNotificationsList.push({
            id: `reg-unid-${s.id}`,
            type: 'chat',
            title: titleText,
            description: descText,
            href: '/painel/registro-unidade',
            createdAt: s.created_at || new Date().toISOString(),
          })
        })
      }

      // 6. Corregedoria Notifications
      const rawPunicoes = punicoesData.punicoes || []
      
      // User active unseen warnings
      const activeMyPunicoes = rawPunicoes.filter(
        (p: any) => p.oficialId === user.id && p.status === 'ativa' && !readPunicoesIds.includes(p.id)
      )
      activeMyPunicoes.forEach((p: any) => {
        newNotificationsList.push({
          id: `pun-rec-${p.id}`,
          type: 'edital',
          title: 'Nova Punição Administrativa',
          description: `Você recebeu uma advertência: ${p.tipoAdvertencia} por "${p.motivo}"`,
          href: '/painel/punicoes',
          createdAt: p.createdAt || new Date().toISOString(),
          isUrgent: true,
        })
      })

      // Corregedoria member appealed resource notifications
      const isCorregedoria = cargos.some((c: string) => ['Diretor Corregedoria', 'Membro Corregedoria'].includes(c)) || profile.role === 'admin'
      const pendingRecursos = rawPunicoes.filter((p: any) => p.recorrida && p.recursoStatus === 'pendente')
      
      if (isCorregedoria) {
        pendingRecursos.forEach((p: any) => {
          newNotificationsList.push({
            id: `correg-rec-${p.id}`,
            type: 'edital',
            title: 'Novo Recurso de Punição',
            description: `${p.oficialQra} recorreu da punição (${p.tipoAdvertencia})`,
            href: '/painel/punicoes',
            createdAt: p.createdAt || new Date().toISOString(),
          })
        })
      }

      // Recourse chats messages notifications
      const activeRecoursePunicoes = rawPunicoes.filter((p: any) => p.recorrida && p.status === 'ativa')
      const accessibleRecoursePunicoes = activeRecoursePunicoes.filter((p: any) => isCorregedoria || p.oficialId === user.id)

      const recourseChatPromises = accessibleRecoursePunicoes.map((p: any) =>
        fetch(`/api/chats?canal=recurso_${p.id}&limit=15`, { headers })
          .then((res) => (res.ok ? res.json() : { messages: [] }))
          .then((data) => ({ punicaoId: p.id, messages: data.messages || [] }))
          .catch(() => ({ punicaoId: p.id, messages: [] }))
      )

      const recourseChats = await Promise.all(recourseChatPromises)
      let recourseUnreadCount = 0

      recourseChats.forEach(({ punicaoId, messages }) => {
        const lastRead = localStorage.getItem(`last_read_chat_recurso_${punicaoId}`)
        if (!lastRead) {
          const unread = messages.filter((m: any) => m.userId !== user.id)
          if (unread.length > 0) {
            recourseUnreadCount += unread.length
            const lastMsg = unread[unread.length - 1]
            newNotificationsList.push({
              id: `chat-recurso-${punicaoId}`,
              type: 'chat',
              title: 'Nova Mensagem no Recurso',
              description: `${lastMsg.qra}: ${lastMsg.content.slice(0, 30)}...`,
              href: '/painel/punicoes',
              createdAt: lastMsg.createdAt,
            })
          }
        } else {
          const unread = messages.filter((m: any) => m.userId !== user.id && m.createdAt > lastRead)
          if (unread.length > 0) {
            recourseUnreadCount += unread.length
            const lastMsg = unread[unread.length - 1]
            newNotificationsList.push({
              id: `chat-recurso-${punicaoId}`,
              type: 'chat',
              title: 'Nova Mensagem no Recurso',
              description: `${lastMsg.qra}: ${lastMsg.content.slice(0, 30)}...`,
              href: '/painel/punicoes',
              createdAt: lastMsg.createdAt,
            })
          }
        }
      })

      const corregedoriaCount = activeMyPunicoes.length + (isCorregedoria ? pendingRecursos.length : 0) + recourseUnreadCount

      // 7. Administração (Cadastro Pendente) Notifications
      let adminUnreadCount = 0
      if (profile.role === 'admin') {
        const pendingUsers = (adminUsuariosData.usuarios || []).filter((u: any) => u.status === 'pendente')
        adminUnreadCount = pendingUsers.length
        pendingUsers.forEach((u: any) => {
          newNotificationsList.push({
            id: `admin-pending-${u.id}`,
            type: 'aviso',
            title: 'Novo Cadastro Pendente',
            description: `${u.username} (${u.patente || 'Recruta'}) solicitou cadastro`,
            href: '/painel/administracao',
            createdAt: u.created_at || new Date().toISOString(),
          })
        })
      }

      // Sort notifications by date descending
      newNotificationsList.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )

      setNotifications(newNotificationsList)
      setCounts({
        avisos: unreadAvisos.length,
        cursos: unreadCursos.length,
        editais: unreadEditais.length,
        chat_apm: chatApmUnread,
        chat_alto_comando: chatAltoComandoUnread,
        registro_unidade: unreadRegistroUnidadesCount,
        corregedoria: corregedoriaCount,
        administracao: adminUnreadCount,
        total:
          unreadAvisos.length +
          unreadCursos.length +
          unreadEditais.length +
          chatApmUnread +
          chatAltoComandoUnread +
          unreadRegistroUnidadesCount +
          corregedoriaCount +
          adminUnreadCount,
      })
    } catch (err) {
      console.error('Error refreshing notification counts:', err)
    }
  }, [user, profile, session])

  const markAsRead = async (type: 'aviso' | 'curso' | 'edital' | 'chat', id: string) => {
    if (!user || !session?.access_token) return

    try {
      if (type === 'aviso') {
        // Mark notice as read in DB
        await fetch('/api/avisos', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ action: 'mark-read', id }),
        })
      } else if (type === 'curso') {
        const readCourses: string[] = JSON.parse(localStorage.getItem('read_courses_ids') || '[]')
        if (!readCourses.includes(id)) {
          readCourses.push(id)
          localStorage.setItem('read_courses_ids', JSON.stringify(readCourses))
        }
      } else if (type === 'edital') {
        const readEditais: string[] = JSON.parse(localStorage.getItem('read_editais_ids') || '[]')
        if (!readEditais.includes(id)) {
          readEditais.push(id)
          localStorage.setItem('read_editais_ids', JSON.stringify(readEditais))
        }
      } else if (type === 'chat') {
        localStorage.setItem(`last_read_chat_${id}`, new Date().toISOString())
      }

      // Reload local counts
      await refresh()
    } catch (e) {
      console.error('Error marking item as read:', e)
    }
  }

  const clearAll = () => {
    setNotifications([])
    setCounts({
      avisos: 0,
      cursos: 0,
      editais: 0,
      chat_apm: 0,
      chat_alto_comando: 0,
      registro_unidade: 0,
      corregedoria: 0,
      administracao: 0,
      total: 0,
    })
  }

  // Reload when auth/session changes
  useEffect(() => {
    refresh()
  }, [user, profile, session, refresh])

  // Periodic pooling (every 15 seconds) + window event listeners
  useEffect(() => {
    const timer = setInterval(() => {
      refresh()
    }, 15000)

    const handleUpdate = () => {
      refresh()
    }

    const handleSSE = (e: Event) => {
      const customEvent = e as CustomEvent
      const { event } = customEvent.detail
      // Re-fetch everything if we get structural updates or messages
      if (
        event === 'aviso-update' ||
        event === 'curso-update' ||
        event === 'edital-update' ||
        event === 'chat-message' ||
        event === 'punicoes-update'
      ) {
        refresh()
      }
    }

    window.addEventListener('notifications-update', handleUpdate)
    window.addEventListener('sse-event', handleSSE)

    return () => {
      clearInterval(timer)
      window.removeEventListener('notifications-update', handleUpdate)
      window.removeEventListener('sse-event', handleSSE)
    }
  }, [refresh])

  return (
    <NotificationContext.Provider value={{ counts, notifications, refresh, markAsRead, clearAll }}>
      {children}
    </NotificationContext.Provider>
  )
}
