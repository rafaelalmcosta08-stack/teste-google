'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { cleanImageUrl } from '@/lib/utils'
import { 
  Car, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  X, 
  AlertTriangle,
  Users,
  Check
} from 'lucide-react'

interface Viatura {
  id: string
  name: string
  photoUrl: string | null
  prefix: string
  unit: string
  minPatente: string
  createdAt: string
}

const UNIDADES = [
  'Geral',
  'GAEP',
  'GTM',
  'GAR',
  'BOPE',
  'CORE',
  'Corregedoria',
  'APM',
  'Sem Efetividade'
]

const PATENTES = [
  'Coronel',
  'Tenente-Coronel',
  'Major',
  'Capitão',
  '1º Tenente',
  '2º Tenente',
  'Aluno Oficial',
  'Sub Tenente',
  '1º Sargento',
  '2º Sargento',
  '3º Sargento',
  'Cabo',
  'Soldado',
  'Recruta',
]

export default function ViaturaPage() {
  const { profile, session } = useAuth()
  const [items, setItems] = useState<Viatura[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filtros
  const [search, setSearch] = useState('')
  const [filterUnit, setFilterUnit] = useState('Todas')

  // Controle de Modal
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Viatura | null>(null)

  // Form State
  const [name, setName] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [unit, setUnit] = useState('Geral')
  const [selectedPatentes, setSelectedPatentes] = useState<string[]>(['Recruta'])
  const [submitting, setSubmitting] = useState(false)

  const isAltoComando = profile?.cargo?.includes('Alto Comando') || profile?.role === 'admin'

  async function loadItems() {
    setLoading(true)
    try {
      const res = await fetch('/api/viaturas')
      if (res.ok) {
        const data = await res.json()
        setItems(data.viaturas || [])
      } else {
        setError('Erro ao carregar a garagem de viaturas.')
      }
    } catch (_) {
      setError('Erro de rede ao buscar viaturas.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadItems()
  }, [])

  function openCreateModal() {
    setEditingItem(null)
    setName('')
    setPhotoUrl('')
    setUnit('Geral')
    setSelectedPatentes(['Recruta'])
    setError(null)
    setIsModalOpen(true)
  }

  function openEditModal(item: Viatura) {
    setEditingItem(item)
    setName(item.name)
    setPhotoUrl(item.photoUrl || '')
    setUnit(item.unit)
    
    let pats: string[] = ['Recruta']
    try {
      if (item.minPatente && item.minPatente.startsWith('[')) {
        pats = JSON.parse(item.minPatente)
      } else if (item.minPatente) {
        pats = [item.minPatente]
      }
    } catch (_) {
      pats = [item.minPatente || 'Recruta']
    }
    setSelectedPatentes(pats)
    setError(null)
    setIsModalOpen(true)
  }

  function handlePatenteToggle(pat: string) {
    setSelectedPatentes(prev => {
      if (prev.includes(pat)) {
        const updated = prev.filter(p => p !== pat)
        return updated.length === 0 ? ['Recruta'] : updated
      } else {
        return [...prev, pat]
      }
    })
  }

  async function handleDelete(id: string) {
    if (!confirm('Deseja realmente remover esta viatura da garagem?')) return
    try {
      const res = await fetch('/api/viaturas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`
        },
        body: JSON.stringify({ action: 'delete', id })
      })
      if (res.ok) {
        setItems(prev => prev.filter(item => item.id !== id))
      } else {
        const d = await res.json()
        alert(d.error || 'Erro ao remover.')
      }
    } catch (_) {
      alert('Erro de conexão ao tentar remover.')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !photoUrl.trim() || !unit || selectedPatentes.length === 0) {
      setError('Preencha os campos obrigatórios: Modelo, Link da Imagem, Divisão e pelo menos uma Patente.')
      return
    }

    setSubmitting(true)
    setError(null)

    const payload = {
      action: editingItem ? 'edit' : 'create',
      id: editingItem?.id,
      name: name.trim(),
      photoUrl: photoUrl.trim(),
      prefix: editingItem?.prefix || undefined, // handled by server/kept on edit
      unit,
      minPatente: selectedPatentes
    }

    try {
      const res = await fetch('/api/viaturas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`
        },
        body: JSON.stringify(payload)
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao salvar viatura.')
      }

      setIsModalOpen(false)
      loadItems()
    } catch (err: any) {
      setError(err.message || 'Erro de rede.')
    } finally {
      setSubmitting(false)
    }
  }

  // Filtragem
  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase())
    const matchesUnit = filterUnit === 'Todas' || item.unit === filterUnit
    return matchesSearch && matchesUnit
  })

  // Verificação de permissão de condução
  function canUserDrive(item: Viatura) {
    if (isAltoComando) return true

    // 1. Unidade Responsável
    const myUnit = profile?.unidade_operacional || 'Sem Efetividade'
    const unitAllowed = item.unit === 'Geral' || item.unit === myUnit

    // 2. Patente Mínima / Patentes Autorizadas
    let pats: string[] = []
    try {
      if (item.minPatente && item.minPatente.startsWith('[')) {
        pats = JSON.parse(item.minPatente)
      } else if (item.minPatente) {
        pats = [item.minPatente]
      }
    } catch (_) {
      pats = [item.minPatente || 'Recruta']
    }

    const myPatente = profile?.patente || 'Recruta'
    const patenteAllowed = pats.length === 0 || pats.includes('ALL_BY_UNIT') || pats.includes(myPatente)

    return unitAllowed && patenteAllowed
  }

  return (
    <main className="mx-auto max-w-[1400px] px-6 pb-24 pt-10 sm:px-10 lg:px-12">
      {/* Top Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-10 border-b border-border/10 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Car className="h-5 w-5 text-primary animate-pulse" />
            <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary uppercase tracking-wider">
              Frota & Divisão de Transportes
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Garagem de Viaturas</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Lista de viaturas e veículos oficiais monitorados pela Nômade, prefixos operacionais e patentes mínimas autorizadas para condução.
          </p>
        </div>

        {isAltoComando && (
          <Button onClick={openCreateModal} className="w-full md:w-auto h-11 px-5 rounded-xl flex items-center justify-center gap-2">
            <Plus className="h-5 w-5" /> Adicionar Viatura
          </Button>
        )}
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <div className="relative">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Pesquisar por modelo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-secondary/20 rounded-xl border border-border/50 text-xs focus:outline-none focus:ring-1 focus:ring-primary/40 text-foreground"
          />
        </div>

        <div>
          <select
            value={filterUnit}
            onChange={(e) => setFilterUnit(e.target.value)}
            className="w-full px-4 py-2.5 bg-secondary/20 rounded-xl border border-border/50 text-xs focus:outline-none focus:ring-1 focus:ring-primary/40 text-foreground"
          >
            <option value="Todas">Todas as Divisões</option>
            {UNIDADES.map(u => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Conteúdo */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-16 bg-card/20 rounded-2xl border border-border/40 p-10">
          <Car className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-55" />
          <h3 className="text-lg font-semibold">Nenhuma viatura na garagem</h3>
          <p className="text-xs text-muted-foreground mt-1">O catálogo de transporte está limpo de acordo com os filtros.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => {
            const allowed = canUserDrive(item)
            return (
              <div 
                key={item.id} 
                className="group relative flex flex-col rounded-2xl border border-border/50 bg-card/40 backdrop-blur-sm overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-black/20 hover:border-primary/30"
              >
                {/* Imagem */}
                <div className="relative h-48 w-full bg-secondary/15 overflow-hidden border-b border-border/10">
                  <img
                    src={cleanImageUrl(item.photoUrl) || 'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?w=500&q=80'}
                    alt={item.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                  
                  {/* Divisão Responsável */}
                  <span className="absolute top-3 left-3 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-black/75 text-foreground border border-white/10 rounded-full">
                    Divisão: {item.unit}
                  </span>

                  {/* Status */}
                  <span className={`absolute top-3 right-3 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider rounded border ${
                    allowed 
                      ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                      : 'bg-red-500/10 text-red-400 border-red-500/20'
                  }`}>
                    {allowed ? 'Condução Autorizada' : 'Condução Bloqueada'}
                  </span>
                </div>

                {/* Detalhes */}
                <div className="flex-1 p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <h3 className="text-base font-bold tracking-tight truncate text-foreground">{item.name}</h3>
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 shrink-0">
                        Prefixo: {item.prefix}
                      </span>
                    </div>

                    <div className="space-y-3 mt-4 border-t border-border/10 pt-3">
                      <div>
                        <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground block">Hierarquia Autorizada</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {(() => {
                            let pats: string[] = []
                            try {
                              if (item.minPatente && item.minPatente.startsWith('[')) {
                                pats = JSON.parse(item.minPatente)
                              } else if (item.minPatente) {
                                pats = [item.minPatente]
                              }
                            } catch (_) {
                              pats = [item.minPatente || 'Recruta']
                            }
                            
                            if (pats.includes('ALL_BY_UNIT')) {
                              return (
                                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                  Toda a Hierarquia da Unidade
                                </span>
                              )
                            }
                            
                            if (pats.length === PATENTES.length) {
                              return (
                                <span className="text-[10px] px-2 py-0.5 rounded bg-primary/5 text-primary border border-primary/15">
                                  Todas as Patentes
                                </span>
                              )
                            }
                            
                            return pats
                              .sort((a, b) => PATENTES.indexOf(a) - PATENTES.indexOf(b))
                              .slice(0, 4)
                              .map(p => (
                                <span key={p} className="text-[10px] px-2 py-0.5 rounded bg-secondary/50 text-foreground border border-border/30">
                                  {p}
                                </span>
                              ))
                          })()}
                          {(() => {
                            let pats: string[] = []
                            try {
                              if (item.minPatente && item.minPatente.startsWith('[')) {
                                pats = JSON.parse(item.minPatente)
                              } else if (item.minPatente) {
                                pats = [item.minPatente]
                              }
                            } catch (_) {
                              pats = []
                            }
                            if (!pats.includes('ALL_BY_UNIT') && pats.length > 4 && pats.length !== PATENTES.length) {
                              return (
                                <span className="text-[10px] px-2 py-0.5 rounded bg-secondary/50 text-muted-foreground">
                                  +{pats.length - 4} mais
                                </span>
                              )
                            }
                            return null
                          })()}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1">
                        <span className="text-muted-foreground">Uso Setorial</span>
                        <span className="text-foreground font-medium text-[11px]">
                          {item.unit === 'Geral' ? 'Uso Geral da Corporação' : `Exclusivo Divisão ${item.unit}`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {isAltoComando && (
                    <div className="flex items-center gap-2 mt-5 border-t border-border/10 pt-4">
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        onClick={() => openEditModal(item)}
                        className="flex-1 h-9 rounded-lg flex items-center justify-center gap-1.5 text-xs"
                      >
                        <Edit className="h-3.5 w-3.5" /> Editar
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        onClick={() => handleDelete(item.id)}
                        className="h-9 w-9 rounded-lg flex items-center justify-center bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/15"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal de Cadastro/Edição */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto"
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            className="relative w-full max-w-lg rounded-2xl border border-border/60 bg-card p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setIsModalOpen(false)} 
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 border-b border-border/10 pb-3">
              <Car className="h-5 w-5 text-primary" />
              {editingItem ? 'Editar Viatura' : 'Adicionar Viatura à Garagem'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Modelo / Nome da Viatura *</label>
                <input
                  type="text"
                  placeholder="Ex: Blazer Polícia Militar"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-secondary/30 rounded-lg border border-border/60 text-xs focus:outline-none focus:ring-1 focus:ring-primary/40 text-foreground"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Divisão Responsável *</label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full px-3 py-2 bg-secondary/30 rounded-lg border border-border/60 text-xs focus:outline-none focus:ring-1 focus:ring-primary/40 text-foreground"
                >
                  {UNIDADES.map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground block">Foto da Viatura *</label>
                <input
                  type="url"
                  placeholder="Link (URL) da Imagem Real (Ex: https://...)"
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-secondary/30 rounded-lg border border-border/60 text-xs focus:outline-none focus:ring-1 focus:ring-primary/40 text-foreground"
                  required
                />
              </div>

              <div className="space-y-2 border-t border-border/10 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground block">Hierarquia / Patentes Autorizadas</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedPatentes.length === PATENTES.length) {
                        setSelectedPatentes(['Recruta'])
                      } else {
                        setSelectedPatentes([...PATENTES])
                      }
                    }}
                    className="text-[10px] text-primary hover:underline font-bold"
                    disabled={selectedPatentes.includes('ALL_BY_UNIT')}
                  >
                    {selectedPatentes.length === PATENTES.length ? 'Desmarcar Todos' : 'Marcar Todos'}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (selectedPatentes.includes('ALL_BY_UNIT')) {
                      setSelectedPatentes(prev => prev.filter(p => p !== 'ALL_BY_UNIT'))
                    } else {
                      setSelectedPatentes(['ALL_BY_UNIT'])
                    }
                  }}
                  className={`w-full p-2.5 rounded-lg border text-left text-xs transition-colors mb-2.5 flex items-center justify-between ${
                    selectedPatentes.includes('ALL_BY_UNIT')
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 font-bold'
                      : 'bg-secondary/10 border-border/40 text-muted-foreground hover:bg-secondary/20'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`h-3.5 w-3.5 rounded border flex items-center justify-center shrink-0 ${
                      selectedPatentes.includes('ALL_BY_UNIT') ? 'border-amber-400 bg-amber-400 text-black' : 'border-border'
                    }`}>
                      {selectedPatentes.includes('ALL_BY_UNIT') && <Check className="h-3 w-3 stroke-[3]" />}
                    </div>
                    <span>Toda a Hierarquia da(s) Unidade(s) selecionada(s)</span>
                  </div>
                </button>

                {!selectedPatentes.includes('ALL_BY_UNIT') && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-1.5">
                    {PATENTES.map(pat => {
                      const active = selectedPatentes.includes(pat)
                      return (
                        <button
                          key={pat}
                          type="button"
                          onClick={() => handlePatenteToggle(pat)}
                          className={`px-2 py-1 text-[10px] rounded border text-left transition-colors truncate flex items-center gap-1.5 ${
                            active 
                              ? 'bg-primary/10 border-primary text-primary font-bold' 
                              : 'bg-secondary/20 border-border/40 text-muted-foreground hover:bg-secondary/40'
                          }`}
                        >
                          <div className={`h-2 w-2 rounded-full shrink-0 ${active ? 'bg-primary' : 'bg-transparent border border-border'}`} />
                          {pat}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 pt-6 border-t border-border/10 mt-6">
                <Button 
                  type="button" 
                  variant="secondary" 
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                  className="flex-1 h-10 rounded-lg text-xs"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={submitting}
                  className="flex-1 h-10 rounded-lg text-xs flex items-center justify-center gap-1.5"
                >
                  {submitting ? 'Salvando...' : editingItem ? 'Salvar Alterações' : 'Cadastrar Viatura'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}
