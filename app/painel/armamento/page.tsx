'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { 
  Crosshair, 
  Search, 
  Plus, 
  Edit, 
  Trash, 
  Check, 
  X, 
  AlertTriangle,
  ShieldAlert
} from 'lucide-react'

interface Armamento {
  id: string
  name: string
  photoUrl: string | null
  code: string
  category: string
  minPatente: string
  allowedUnits: string[]
  createdAt: string
}

const CATEGORIES = [
  'Arma Curta',
  'Arma Longa',
  'Não-Letal',
  'Especial'
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
  { label: 'Glock 17 / Curta', url: 'https://images.unsplash.com/photo-1595590424283-b8f17842773f?w=500&q=80' },
  { label: 'Carabina M4A1 / Longa', url: 'https://images.unsplash.com/photo-1601362840469-51e4d8d59085?w=500&q=80' },
  { label: 'Taser / Não-Letal', url: 'https://images.unsplash.com/photo-1599819811279-d5ad9cccf838?w=500&q=80' },
  { label: 'Fuzil Sniper / Especial', url: 'https://images.unsplash.com/photo-1541532713592-79a0317b6b77?w=500&q=80' },
]

export default function ArmamentoPage() {
  const { profile, session } = useAuth()
  const [items, setItems] = useState<Armamento[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filtros
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('Todas')
  const [filterUnit, setFilterUnit] = useState('Todas')

  // Controle de Modal de Cadastro / Edição
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Armamento | null>(null)

  // Form State
  const [name, setName] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [code, setCode] = useState('')
  const [category, setCategory] = useState('Arma Curta')
  const [minPatente, setMinPatente] = useState('Recruta')
  const [selectedUnits, setSelectedUnits] = useState<string[]>(['Todas'])
  const [submitting, setSubmitting] = useState(false)

  const isAltoComando = profile?.cargo?.includes('Alto Comando') || profile?.role === 'admin'

  async function loadItems() {
    setLoading(true)
    try {
      const res = await fetch('/api/armamentos')
      if (res.ok) {
        const data = await res.json()
        setItems(data.armamentos || [])
      } else {
        setError('Erro ao carregar o catálogo de armamentos.')
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
    setCategory('Arma Curta')
    setMinPatente('Recruta')
    setSelectedUnits(['Todas'])
    setError(null)
    setIsModalOpen(true)
  }

  function openEditModal(item: Armamento) {
    setEditingItem(item)
    setName(item.name)
    setPhotoUrl(item.photoUrl || '')
    setCode(item.code)
    setCategory(item.category)
    setMinPatente(item.minPatente)
    setSelectedUnits(item.allowedUnits.length > 0 ? item.allowedUnits : ['Todas'])
    setError(null)
    setIsModalOpen(true)
  }

  async function handleDelete(id: string) {
    if (!confirm('Deseja realmente excluir esta arma do catálogo?')) return
    try {
      const res = await fetch('/api/armamentos', {
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
    if (!name.trim() || !code.trim() || !category || !minPatente) {
      setError('Preencha os campos obrigatórios (Nome, Nº Registro/Série, Categoria, Patente Mínima).')
      return
    }

    setSubmitting(true)
    setError(null)

    const payload = {
      action: editingItem ? 'edit' : 'create',
      id: editingItem?.id,
      name: name.trim(),
      photoUrl: photoUrl.trim() || null,
      code: code.trim(),
      category,
      minPatente,
      allowedUnits: selectedUnits
    }

    try {
      const res = await fetch('/api/armamentos', {
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

  // Filtragem
  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) || 
                          item.code.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = filterCategory === 'Todas' || item.category === filterCategory
    const matchesUnit = filterUnit === 'Todas' || 
                        item.allowedUnits.includes('Todas') || 
                        item.allowedUnits.includes(filterUnit)
    return matchesSearch && matchesCategory && matchesUnit
  })

  // Verificação de permissão baseada em Patente e Divisão
  function canUserUseItem(item: Armamento) {
    if (isAltoComando) return true

    // 1. Verifica Unidade
    const myUnit = profile?.unidade_operacional || 'Sem Efetividade'
    const unitAllowed = item.allowedUnits.includes('Todas') || item.allowedUnits.includes(myUnit)

    // 2. Verifica Patente Mínima (Ordem hierárquica: menor índice é patente maior)
    const myPatente = profile?.patente || 'Recruta'
    const myPatenteIdx = PATENTES.indexOf(myPatente)
    const requiredPatenteIdx = PATENTES.indexOf(item.minPatente)

    // Se o índice da patente do usuário for maior que o índice exigido,
    // significa que sua patente é mais baixa hierarquicamente (ex: SoldadoIdx (12) > CaboIdx (11))
    const patenteAllowed = myPatenteIdx !== -1 && requiredPatenteIdx !== -1 && myPatenteIdx <= requiredPatenteIdx

    return unitAllowed && patenteAllowed
  }

  return (
    <main className="mx-auto max-w-[1400px] px-6 pb-24 pt-10 sm:px-10 lg:px-12">
      {/* Top Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-10 border-b border-border/10 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Crosshair className="h-5 w-5 text-primary animate-pulse" />
            <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary uppercase tracking-wider">
              Material Bélico & Arsenal
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Arsenal de Armamentos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Controle do acervo bélico oficial da corporação, patentes requeridas e distribuição por divisão tática.
          </p>
        </div>

        {isAltoComando && (
          <Button onClick={openCreateModal} className="w-full md:w-auto h-11 px-5 rounded-xl flex items-center justify-center gap-2">
            <Plus className="h-5 w-5" /> Cadastrar Novo Item
          </Button>
        )}
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="relative">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Pesquisar por nome ou série..."
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
          <Crosshair className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-55" />
          <h3 className="text-lg font-semibold">Nenhuma arma cadastrada</h3>
          <p className="text-xs text-muted-foreground mt-1">Nenhum resultado corresponde à pesquisa ativa.</p>
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
                {/* Imagem do item */}
                <div className="relative h-48 w-full bg-secondary/15 overflow-hidden border-b border-border/10">
                  <img
                    src={item.photoUrl || 'https://images.unsplash.com/photo-1595590424283-b8f17842773f?w=500&q=80'}
                    alt={item.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                  {/* Categoria */}
                  <span className="absolute top-3 left-3 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-black/75 text-foreground border border-white/10 rounded-full">
                    {item.category}
                  </span>

                  {/* Status */}
                  <span className={`absolute top-3 right-3 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider rounded border ${
                    allowed 
                      ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                      : 'bg-red-500/10 text-red-400 border-red-500/20'
                  }`}>
                    {allowed ? 'Liberado' : 'Bloqueado'}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <h3 className="text-base font-bold tracking-tight truncate text-foreground">{item.name}</h3>
                      <span className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded bg-secondary text-muted-foreground border border-border/30 shrink-0">
                        Nº {item.code}
                      </span>
                    </div>

                    <div className="space-y-3 mt-4 border-t border-border/10 pt-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Patente Requerida</span>
                        <span className="font-semibold text-foreground bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded">
                          {item.minPatente}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground block">Divisões Permitidas</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {item.allowedUnits.map(u => (
                            <span key={u} className="text-[10px] px-2 py-0.5 rounded bg-secondary/50 text-foreground border border-border/30">
                              {u}
                            </span>
                          ))}
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
                        <Trash className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Cadastro/Edição */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-2xl border border-border/60 bg-card p-6 shadow-2xl">
            <button 
              onClick={() => setIsModalOpen(false)} 
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 border-b border-border/10 pb-3">
              <Crosshair className="h-5 w-5 text-primary" />
              {editingItem ? 'Editar Registro de Arma' : 'Cadastrar Arma no Arsenal'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Nome da Arma *</label>
                <input
                  type="text"
                  placeholder="Ex: Carabina M4A1"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-secondary/30 rounded-lg border border-border/60 text-xs focus:outline-none focus:ring-1 focus:ring-primary/40 text-foreground"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Número de Série / Registro *</label>
                <input
                  type="text"
                  placeholder="Ex: SERIE-9988X"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full px-3 py-2 bg-secondary/30 rounded-lg border border-border/60 text-xs focus:outline-none focus:ring-1 focus:ring-primary/40 text-foreground"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                  <label className="text-xs font-semibold text-foreground">Patente Mínima Requerida *</label>
                  <select
                    value={minPatente}
                    onChange={(e) => setMinPatente(e.target.value)}
                    className="w-full px-3 py-2 bg-secondary/30 rounded-lg border border-border/60 text-xs focus:outline-none focus:ring-1 focus:ring-primary/40 text-foreground"
                  >
                    {PATENTES.map(pat => (
                      <option key={pat} value={pat}>{pat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground block">Foto da Arma</label>
                <input
                  type="text"
                  placeholder="URL da Foto (Ex: https://...)"
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-secondary/30 rounded-lg border border-border/60 text-xs focus:outline-none focus:ring-1 focus:ring-primary/40 text-foreground"
                />
                
                <div>
                  <span className="text-[10px] text-muted-foreground block mb-1.5">Ou selecione uma foto padrão de exemplo:</span>
                  <div className="grid grid-cols-2 gap-2">
                    {PRESET_IMAGES.map((img) => (
                      <button
                        key={img.label}
                        type="button"
                        onClick={() => setPhotoUrl(img.url)}
                        className={`px-2 py-1.5 text-[10px] text-left border rounded-lg hover:bg-secondary/40 transition-colors truncate ${
                          photoUrl === img.url ? 'border-primary bg-primary/5 text-primary' : 'border-border/40'
                        }`}
                      >
                        {img.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-2 border-t border-border/10 pt-3">
                <span className="text-xs font-semibold text-foreground block">Unidades Autorizadas</span>
                <p className="text-[10px] text-muted-foreground mb-2">Quais divisões táticas têm acesso a esta arma.</p>
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
                  {submitting ? 'Salvando...' : editingItem ? 'Salvar Alterações' : 'Cadastrar Item'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}
