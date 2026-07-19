'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { cleanImageUrl } from '@/lib/utils'
import { 
  Shirt, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Check, 
  X, 
  AlertTriangle,
  Info
} from 'lucide-react'

interface Fardamento {
  id: string
  name: string
  photoUrl: string | null
  code: string
  category: string
  allowedUnits: string[]
  allowedPatentes: string[]
  createdAt: string
}

const CATEGORIES = [
  'Farda Operacional',
  'Farda de Gala',
  'Farda Tática',
  'Farda Administrativa',
  'Farda Especial'
]

const UNIDADES = [
  'Todas',
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

const PRESET_IMAGES = [
  { label: 'Operacional PM', url: 'https://images.unsplash.com/photo-1595079676339-1534801ad6cf?w=500&q=80' },
  { label: 'Gala / Oficial', url: 'https://images.unsplash.com/photo-1610483178766-82928507871b?w=500&q=80' },
  { label: 'Tática / BOPE', url: 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?w=500&q=80' },
  { label: 'Administrativa', url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=500&q=80' },
]

export default function FardamentoPage() {
  const { profile, session } = useAuth()
  const [items, setItems] = useState<Fardamento[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filtros
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('Todas')
  const [filterUnit, setFilterUnit] = useState('Todas')

  // Controle de Modal de Cadastro / Edição
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Fardamento | null>(null)

  // Form State
  const [name, setName] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [code, setCode] = useState('')
  const [category, setCategory] = useState('Farda Operacional')
  const [selectedUnits, setSelectedUnits] = useState<string[]>(['Todas'])
  const [selectedPatentes, setSelectedPatentes] = useState<string[]>(['Recruta'])
  const [submitting, setSubmitting] = useState(false)

  const isAltoComando = profile?.cargo?.includes('Alto Comando') || profile?.role === 'admin'

  async function loadItems() {
    setLoading(true)
    try {
      const res = await fetch('/api/fardamentos')
      if (res.ok) {
        const data = await res.json()
        setItems(data.fardamentos || [])
      } else {
        setError('Erro ao carregar os fardamentos.')
      }
    } catch (_) {
      setError('Problema na rede ao carregar dados.')
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
    setCode('')
    setCategory('Farda Operacional')
    setSelectedUnits(['Todas'])
    setSelectedPatentes(['Recruta'])
    setError(null)
    setIsModalOpen(true)
  }

  function openEditModal(item: Fardamento) {
    setEditingItem(item)
    setName(item.name)
    setPhotoUrl(item.photoUrl || '')
    setCode(item.code)
    setCategory(item.category)
    setSelectedUnits(item.allowedUnits.length > 0 ? item.allowedUnits : ['Todas'])
    setSelectedPatentes(item.allowedPatentes.length > 0 ? item.allowedPatentes : ['Recruta'])
    setError(null)
    setIsModalOpen(true)
  }

  async function handleDelete(id: string) {
    if (!confirm('Deseja realmente excluir este fardamento do catálogo?')) return
    try {
      const res = await fetch('/api/fardamentos', {
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
        alert(d.error || 'Erro ao excluir.')
      }
    } catch (_) {
      alert('Erro de conexão ao tentar excluir.')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !code.trim() || !category || !photoUrl.trim()) {
      setError('Preencha todos os campos obrigatórios: Nome, Numeração/Peças, Categoria e Link da Imagem.')
      return
    }

    setSubmitting(true)
    setError(null)

    const payload = {
      action: editingItem ? 'edit' : 'create',
      id: editingItem?.id,
      name: name.trim(),
      photoUrl: photoUrl.trim(),
      code: code.trim(),
      category,
      allowedUnits: selectedUnits,
      allowedPatentes: selectedPatentes
    }

    try {
      const res = await fetch('/api/fardamentos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`
        },
        body: JSON.stringify(payload)
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao salvar o item.')
      }

      setIsModalOpen(false)
      loadItems()
    } catch (err: any) {
      setError(err.message || 'Erro de rede.')
    } finally {
      setSubmitting(false)
    }
  }

  function handleUnitToggle(unit: string) {
    if (unit === 'Todas') {
      setSelectedUnits(['Todas'])
      return
    }
    setSelectedUnits(prev => {
      const copy = prev.filter(u => u !== 'Todas')
      if (copy.includes(unit)) {
        const updated = copy.filter(u => u !== unit)
        return updated.length === 0 ? ['Todas'] : updated
      } else {
        return [...copy, unit]
      }
    })
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

  // Filtragem dos itens
  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) || 
                          item.code.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = filterCategory === 'Todas' || item.category === filterCategory
    const matchesUnit = filterUnit === 'Todas' || 
                        item.allowedUnits.includes('Todas') || 
                        item.allowedUnits.includes(filterUnit)
    return matchesSearch && matchesCategory && matchesUnit
  })

  // Permissões de visualização do item específico para o usuário logado
  function canUserUseItem(item: Fardamento) {
    if (isAltoComando) return true
    
    // Verifica unidade
    const myUnit = profile?.unidade_operacional || 'Sem Efetividade'
    const unitAllowed = item.allowedUnits.includes('Todas') || item.allowedUnits.includes(myUnit)

    // Verifica patente
    const myPatente = profile?.patente || 'Recruta'
    const patenteAllowed = item.allowedPatentes.length === 0 || item.allowedPatentes.includes(myPatente)

    return unitAllowed && patenteAllowed
  }

  return (
    <main className="mx-auto max-w-[1400px] px-6 pb-24 pt-10 sm:px-10 lg:px-12">
      {/* Top Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-10 border-b border-border/10 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Shirt className="h-5 w-5 text-primary animate-pulse" />
            <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary uppercase tracking-wider">
              Logística & Suprimentos
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Catálogo de Fardamentos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Consulte as vestimentas autorizadas, códigos de numeração e permissões por unidade ou patente.
          </p>
        </div>

        {isAltoComando && (
          <Button onClick={openCreateModal} className="w-full md:w-auto h-11 px-5 rounded-xl flex items-center justify-center gap-2">
            <Plus className="h-5 w-5" /> Cadastrar Fardamento
          </Button>
        )}
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="relative">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Pesquisar por nome ou código..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-secondary/20 rounded-xl border border-border/50 text-xs focus:outline-none focus:ring-1 focus:ring-primary/40 text-foreground"
          />
        </div>

        <div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="w-full px-4 py-2.5 bg-secondary/20 rounded-xl border border-border/50 text-xs focus:outline-none focus:ring-1 focus:ring-primary/40 text-foreground"
          >
            <option value="Todas">Todas as Categorias</option>
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={filterUnit}
            onChange={(e) => setFilterUnit(e.target.value)}
            className="w-full px-4 py-2.5 bg-secondary/20 rounded-xl border border-border/50 text-xs focus:outline-none focus:ring-1 focus:ring-primary/40 text-foreground"
          >
            <option value="Todas">Todas as Unidades</option>
            {UNIDADES.filter(u => u !== 'Todas').map(u => (
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
          <Shirt className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-55" />
          <h3 className="text-lg font-semibold">Nenhum fardamento encontrado</h3>
          <p className="text-xs text-muted-foreground mt-1">Refine os filtros ou pesquise por outros termos.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => {
            const allowed = canUserUseItem(item)
            return (
              <div 
                key={item.id} 
                className="group relative flex flex-col rounded-2xl border border-border/50 bg-card/40 backdrop-blur-sm overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-black/20 hover:border-primary/30"
              >
                {/* Imagem do Fardamento */}
                <div className="relative h-48 w-full bg-secondary/15 overflow-hidden border-b border-border/10">
                  <img
                    src={cleanImageUrl(item.photoUrl) || 'https://images.unsplash.com/photo-1595079676339-1534801ad6cf?w=500&q=80'}
                    alt={item.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                  {/* Categoria Badge */}
                  <span className="absolute top-3 left-3 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-black/75 text-foreground border border-white/10 rounded-full">
                    {item.category}
                  </span>

                  {/* Status de Permissão */}
                  <span className={`absolute top-3 right-3 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider rounded border ${
                    allowed 
                      ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                      : 'bg-red-500/10 text-red-400 border-red-500/20'
                  }`}>
                    {allowed ? 'Autorizado' : 'Não Autorizado'}
                  </span>
                </div>

                {/* Detalhes do item */}
                <div className="flex-1 p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <h3 className="text-base font-bold tracking-tight truncate text-foreground">{item.name}</h3>
                    </div>

                    {/* Peças e Códigos do Fardamento - Textarea style display */}
                    <div className="mt-3 bg-secondary/20 rounded-xl p-3 border border-dashed border-border/60">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-primary">Peças e Códigos (Jogo)</span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(item.code)
                            alert('Códigos copiados para a área de transferência!')
                          }}
                          className="text-[10px] text-muted-foreground hover:text-primary transition-colors hover:underline"
                        >
                          Copiar
                        </button>
                      </div>
                      <p className="font-mono text-xs text-foreground whitespace-pre-wrap leading-relaxed select-all">
                        {item.code}
                      </p>
                    </div>

                    <div className="space-y-2 mt-3.5 border-t border-border/10 pt-3">
                      <div>
                        <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground block">Unidades Autorizadas</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {item.allowedUnits.map(u => (
                            <span key={u} className="text-[10px] px-2 py-0.5 rounded bg-secondary/50 text-foreground border border-border/30">
                              {u}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground block">Hierarquia Autorizada</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {item.allowedPatentes.includes('ALL_BY_UNIT') ? (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              Toda a Hierarquia da Unidade
                            </span>
                          ) : item.allowedPatentes.length === PATENTES.length ? (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-primary/5 text-primary border border-primary/15">
                              Todos os Oficiais
                            </span>
                          ) : (
                            [...item.allowedPatentes]
                              .filter(p => p !== 'ALL_BY_UNIT')
                              .sort((a, b) => PATENTES.indexOf(a) - PATENTES.indexOf(b))
                              .slice(0, 4)
                              .map(p => (
                                <span key={p} className="text-[10px] px-2 py-0.5 rounded bg-secondary/50 text-foreground border border-border/30">
                                  {p}
                                </span>
                              ))
                          )}
                          {!item.allowedPatentes.includes('ALL_BY_UNIT') && item.allowedPatentes.filter(p => p !== 'ALL_BY_UNIT').length > 4 && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-secondary/50 text-muted-foreground">
                              +{item.allowedPatentes.filter(p => p !== 'ALL_BY_UNIT').length - 4} mais
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {isAltoComando && (
                    <div className="flex items-center gap-2 mt-5 border-t border-border/10 pt-4">
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        onClick={() => openEditModal(item)}
                        className="flex-1 h-9 rounded-lg flex items-center justify-center gap-1.5 text-xs text-foreground"
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
              <Shirt className="h-5 w-5 text-primary" />
              {editingItem ? 'Editar Fardamento' : 'Cadastrar Fardamento'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Nome do Item *</label>
                <input
                  type="text"
                  placeholder="Ex: Farda Operacional PM"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-secondary/30 rounded-lg border border-border/60 text-xs focus:outline-none focus:ring-1 focus:ring-primary/40 text-foreground"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Numeração / Código no Jogo *</label>
                <textarea
                  placeholder="Insira as peças e seus códigos (ex:&#10;Camisa: 153&#10;Calça: 154)"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full h-24 px-3 py-2 bg-secondary/30 rounded-lg border border-border/60 text-xs focus:outline-none focus:ring-1 focus:ring-primary/40 text-foreground resize-y font-mono"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Categoria *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-secondary/30 rounded-lg border border-border/60 text-xs focus:outline-none focus:ring-1 focus:ring-primary/40 text-foreground"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground block">Foto do Fardamento *</label>
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
                <span className="text-xs font-semibold text-foreground block">Unidades Autorizadas</span>
                <p className="text-[10px] text-muted-foreground mb-2">Selecione quais divisões estão habilitadas a usar esta farda.</p>
                <div className="flex flex-wrap gap-1.5">
                  {UNIDADES.map(unit => {
                    const active = selectedUnits.includes(unit)
                    return (
                      <button
                        key={unit}
                        type="button"
                        onClick={() => handleUnitToggle(unit)}
                        className={`px-2.5 py-1 text-[10px] rounded border transition-colors flex items-center gap-1 ${
                          active 
                            ? 'bg-primary/10 border-primary text-primary font-bold' 
                            : 'bg-secondary/20 border-border/40 text-muted-foreground hover:bg-secondary/40'
                        }`}
                      >
                        {active && <Check className="h-3 w-3" />}
                        {unit}
                      </button>
                    )
                  })}
                </div>
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
                  {submitting ? 'Salvando...' : editingItem ? 'Salvar Alterações' : 'Cadastrar Fardamento'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}
