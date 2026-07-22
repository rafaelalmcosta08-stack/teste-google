'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { useNotifications, NotificationItem } from '@/lib/notification-context'
import { useSidebar } from '@/lib/sidebar-context'
import { motion, AnimatePresence } from 'motion/react'
import {
  Bell,
  Search,
  Menu,
  X,
  Check,
  User,
  GraduationCap,
  FileText,
  Megaphone,
  Loader2,
  Sparkles,
} from 'lucide-react'

export function PainelHeader() {
  const router = useRouter()
  const { user, session } = useAuth()
  const { counts, notifications, markAsRead, refresh } = useNotifications()
  const sidebar = useSidebar()

  // Notification states
  const [isNotifOpen, setIsNotifOpen] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)

  // Search states
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<{
    profiles: any[]
    courses: any[]
    editais: any[]
    avisos: any[]
  }>({ profiles: [], courses: [], editais: [], avisos: [] })
  const [searchLoading, setSearchLoading] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Keyboard shortcut Ctrl+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setIsSearchOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Live search debounced
  useEffect(() => {
    if (!searchQuery.trim() || !session?.access_token) {
      setSearchResults({ profiles: [], courses: [], editais: [], avisos: [] })
      return
    }

    const delayDebounce = setTimeout(async () => {
      setSearchLoading(true)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        })
        if (res.ok) {
          const data = await res.json()
          setSearchResults(data.results || { profiles: [], courses: [], editais: [], avisos: [] })
        }
      } catch (err) {
        console.error('Search error:', err)
      } finally {
        setSearchLoading(false)
      }
    }, 300)

    return () => clearTimeout(delayDebounce)
  }, [searchQuery, session])

  // Focus search input when open
  useEffect(() => {
    if (isSearchOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 100)
    } else {
      setSearchQuery('')
    }
  }, [isSearchOpen])

  // Handle clicking notification item
  const handleNotifClick = async (item: NotificationItem) => {
    setIsNotifOpen(false)
    await markAsRead(item.type, item.id)
    router.push(item.href)
  }

  // Handle marking all as read
  const handleMarkAllRead = async () => {
    setIsNotifOpen(false)
    // Mark all currently visible notices, courses, editais as read
    const promises = notifications.map((n) => markAsRead(n.type, n.id))
    await Promise.all(promises)
    await refresh()
  }

  // Handle clicking search result
  const handleSearchResultClick = (href: string) => {
    setIsSearchOpen(false)
    router.push(href)
  }

  const hasUnread = counts.total > 0
  const recentNotifications = notifications.slice(0, 5)

  // Determine category icon for search results
  const getSearchIcon = (type: string) => {
    switch (type) {
      case 'oficial':
        return <User className="h-4.5 w-4.5 text-blue-400" />
      case 'curso':
        return <GraduationCap className="h-4.5 w-4.5 text-emerald-400" />
      case 'edital':
        return <FileText className="h-4.5 w-4.5 text-purple-400" />
      case 'aviso':
        return <Megaphone className="h-4.5 w-4.5 text-amber-400" />
      default:
        return <Sparkles className="h-4.5 w-4.5 text-primary" />
    }
  }

  return (
    <>
      <header className="fixed top-0 right-0 left-0 md:left-[70px] z-40 bg-card/40 backdrop-blur-md border-b border-border/10">
        <div className="flex h-20 items-center justify-between px-4 sm:px-6 md:px-10">
          
          {/* Left: Mobile Toggle + Logo */}
          <div className="flex items-center gap-3.5">
            <button
              onClick={sidebar.toggle}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-border/20 bg-secondary/30 text-foreground hover:bg-secondary/60 md:hidden outline-none cursor-pointer"
              aria-label="Toggle Menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            <Link href="/painel" className="flex items-center gap-2.5">
              <img
                src="https://res.cloudinary.com/epo1w9hl/image/upload/v1784175681/POLICIAASPECT_copiar_qdvopk.png"
                alt="Nômade Logo"
                className="h-7 w-7 object-contain hidden xs:block"
                referrerPolicy="no-referrer"
              />
              <span className="text-sm sm:text-base font-bold tracking-tight text-foreground transition-opacity hover:opacity-90">
                Nômade
              </span>
            </Link>
          </div>

          {/* Center: Search Trigger (Visible on desktop/tablet) */}
          <div className="hidden sm:block flex-1 max-w-sm mx-6">
            <button
              onClick={() => setIsSearchOpen(true)}
              className="group flex h-10 w-full items-center justify-between rounded-lg border border-border/10 bg-secondary/15 px-3 text-xs text-muted-foreground hover:bg-secondary/30 hover:border-border/30 transition-all duration-200 outline-none cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors duration-200" />
                <span>Buscar oficiais, cursos, editais...</span>
              </div>
              <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border border-border/20 bg-secondary px-1.5 font-mono text-[10px] font-medium text-muted-foreground xs:flex">
                Ctrl K
              </kbd>
            </button>
          </div>

          {/* Right: Notifications Bell + Mobile Search trigger */}
          <div className="flex items-center gap-3">
            {/* Mobile Search Button */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-border/10 bg-secondary/20 text-muted-foreground hover:bg-secondary/40 hover:text-foreground sm:hidden outline-none cursor-pointer"
            >
              <Search className="h-4.5 w-4.5" />
            </button>

            {/* Notification Center Popover */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setIsNotifOpen((prev) => !prev)}
                className={`relative flex h-10 w-10 items-center justify-center rounded-lg border transition-all duration-200 outline-none cursor-pointer ${
                  isNotifOpen
                    ? 'border-primary/50 bg-primary/10 text-primary'
                    : 'border-border/10 bg-secondary/20 text-muted-foreground hover:bg-secondary/40 hover:text-foreground'
                }`}
                title="Notificações"
              >
                <Bell className={`h-4.5 w-4.5 ${hasUnread ? 'animate-swing' : ''}`} />
                {hasUnread && (
                  <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-mono font-bold text-white shadow-md shadow-red-500/20 border border-card">
                    {counts.total}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {isNotifOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2.5 w-80 sm:w-96 rounded-xl border border-border/20 bg-card/90 shadow-2xl shadow-black/60 backdrop-blur-xl p-4 z-50 select-none overflow-hidden"
                  >
                    <div className="flex items-center justify-between border-b border-border/10 pb-3 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-foreground">Notificações Recentes</span>
                        {hasUnread && (
                          <span className="bg-red-500/15 text-red-400 border border-red-500/20 px-1.5 py-0.5 text-[9px] font-mono rounded-full font-bold">
                            {counts.total} Pendentes
                          </span>
                        )}
                      </div>
                      {hasUnread && (
                        <button
                          onClick={handleMarkAllRead}
                          className="flex items-center gap-1.5 text-[11px] font-medium text-primary hover:text-primary/80 transition-colors outline-none cursor-pointer"
                        >
                          <Check className="h-3.5 w-3.5" />
                          Lidas
                        </button>
                      )}
                    </div>

                    <div className="max-h-80 overflow-y-auto space-y-2.5 scrollbar-thin scrollbar-thumb-white/5 pr-0.5">
                      {recentNotifications.length > 0 ? (
                        recentNotifications.map((item) => (
                          <div
                            key={`${item.type}-${item.id}`}
                            onClick={() => handleNotifClick(item)}
                            className={`group flex items-start gap-3 p-2.5 rounded-lg border cursor-pointer transition-all duration-200 ${
                              item.isUrgent
                                ? 'border-red-500/20 bg-red-500/5 hover:bg-red-500/10'
                                : 'border-border/10 hover:bg-secondary/30'
                            }`}
                          >
                            <div className="mt-0.5 shrink-0">
                              {getSearchIcon(item.type)}
                            </div>
                            <div className="flex-1 min-w-0 space-y-0.5">
                              <div className="flex items-center justify-between gap-2">
                                <span className={`text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors`}>
                                  {item.title}
                                </span>
                                {item.isUrgent && (
                                  <span className="shrink-0 bg-red-500/20 text-red-400 border border-red-500/30 px-1 py-0.2 text-[8px] font-bold rounded-sm animate-pulse">
                                    URGENTE
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                                {item.description}
                              </p>
                              <span className="block text-[9px] font-mono text-muted-foreground/60 pt-0.5">
                                {new Date(item.createdAt).toLocaleDateString('pt-BR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-center space-y-2">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
                            <Check className="h-5 w-5" />
                          </div>
                          <p className="text-xs font-medium text-foreground">Sua ficha está limpa!</p>
                          <p className="text-[10px] text-muted-foreground max-w-[200px]">
                            Nenhuma notificação nova ou ação pendente no momento.
                          </p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

        </div>
      </header>

      {/* GLOBAL SEARCH MODAL (Ctrl+K) */}
      <AnimatePresence>
        {isSearchOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 sm:pt-28">
            {/* Semi-transparent backdrop blur overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/75 backdrop-blur-md"
              onClick={() => setIsSearchOpen(false)}
            />

            {/* Modal Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ type: 'spring', duration: 0.3 }}
              className="relative w-full max-w-xl rounded-xl border border-border/20 bg-card shadow-2xl p-0 overflow-hidden z-50 select-none flex flex-col max-h-[80vh]"
            >
              {/* Input header */}
              <div className="flex items-center gap-3 px-4 border-b border-border/10 h-14 shrink-0">
                <Search className="h-5 w-5 text-muted-foreground shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Pesquise por oficiais, cursos, editais, avisos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent border-none text-foreground text-sm placeholder:text-muted-foreground outline-none ring-0 w-full"
                />
                {searchLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                ) : searchQuery ? (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="flex h-5 w-5 items-center justify-center rounded-full bg-secondary/40 text-muted-foreground hover:bg-secondary/60 hover:text-foreground outline-none cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                ) : (
                  <kbd className="hidden h-5 select-none items-center gap-1 rounded border border-border/20 bg-secondary px-1.5 font-mono text-[9px] font-medium text-muted-foreground sm:flex">
                    esc
                  </kbd>
                )}
              </div>

              {/* Results area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-white/5 max-h-[50vh]">
                {searchQuery.trim() === '' ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center space-y-2">
                    <Search className="h-8 w-8 text-muted-foreground/40 animate-pulse" />
                    <p className="text-xs font-semibold text-muted-foreground">Busca Inteligente</p>
                    <p className="text-[10px] text-muted-foreground/70 max-w-xs">
                      Pesquise em tempo real os oficiais promovidos, editais vigentes, novos cursos de formação e avisos publicados.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Combine results to count overall matches */}
                    {Object.values(searchResults).flat().length > 0 ? (
                      <div className="space-y-4">
                        {/* Render categorized blocks if they have content */}
                        {searchResults.profiles.length > 0 && (
                          <div className="space-y-2">
                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-400 px-1">Oficiais</span>
                            <div className="grid grid-cols-1 gap-1">
                              {searchResults.profiles.map((res) => (
                                <div
                                  key={res.id}
                                  onClick={() => handleSearchResultClick(res.href)}
                                  className="flex items-center justify-between p-2.5 rounded-lg border border-border/5 bg-secondary/10 hover:bg-secondary/30 hover:border-primary/20 cursor-pointer transition-all duration-200"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/15">
                                      <User className="h-4 w-4 text-blue-400" />
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="text-xs font-bold text-foreground">{res.title}</span>
                                      <span className="text-[9px] text-muted-foreground uppercase">{res.subtitle}</span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {searchResults.courses.length > 0 && (
                          <div className="space-y-2">
                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 px-1">Cursos de Formação</span>
                            <div className="grid grid-cols-1 gap-1">
                              {searchResults.courses.map((res) => (
                                <div
                                  key={res.id}
                                  onClick={() => handleSearchResultClick(res.href)}
                                  className="flex items-center justify-between p-2.5 rounded-lg border border-border/5 bg-secondary/10 hover:bg-secondary/30 hover:border-primary/20 cursor-pointer transition-all duration-200"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/15">
                                      <GraduationCap className="h-4 w-4 text-emerald-400" />
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="text-xs font-bold text-foreground">{res.title}</span>
                                      <span className="text-[9px] text-muted-foreground uppercase">{res.subtitle}</span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {searchResults.editais.length > 0 && (
                          <div className="space-y-2">
                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-purple-400 px-1">Editais Vigentes</span>
                            <div className="grid grid-cols-1 gap-1">
                              {searchResults.editais.map((res) => (
                                <div
                                  key={res.id}
                                  onClick={() => handleSearchResultClick(res.href)}
                                  className="flex items-center justify-between p-2.5 rounded-lg border border-border/5 bg-secondary/10 hover:bg-secondary/30 hover:border-primary/20 cursor-pointer transition-all duration-200"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/15">
                                      <FileText className="h-4 w-4 text-purple-400" />
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="text-xs font-bold text-foreground">{res.title}</span>
                                      <span className="text-[9px] text-muted-foreground uppercase">{res.subtitle}</span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {searchResults.avisos.length > 0 && (
                          <div className="space-y-2">
                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 px-1">Mural de Avisos</span>
                            <div className="grid grid-cols-1 gap-1">
                              {searchResults.avisos.map((res) => (
                                <div
                                  key={res.id}
                                  onClick={() => handleSearchResultClick(res.href)}
                                  className="flex items-center justify-between p-2.5 rounded-lg border border-border/5 bg-secondary/10 hover:bg-secondary/30 hover:border-primary/20 cursor-pointer transition-all duration-200"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/15">
                                      <Megaphone className="h-4 w-4 text-amber-400" />
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="text-xs font-bold text-foreground">{res.title}</span>
                                      <span className="text-[9px] text-muted-foreground">{res.subtitle}</span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-10 text-center space-y-2">
                        <X className="h-8 w-8 text-red-500/30" />
                        <p className="text-xs font-semibold text-muted-foreground">Nenhum resultado encontrado</p>
                        <p className="text-[10px] text-muted-foreground/70">
                          Não encontramos registros para &quot;{searchQuery}&quot;. Tente outro termo ou verifique a ortografia.
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
