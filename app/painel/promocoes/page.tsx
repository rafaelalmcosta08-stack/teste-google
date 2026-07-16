'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { motion, AnimatePresence } from 'motion/react'
import {
  TrendingUp,
  Award,
  Calendar,
  User,
  Shield,
  Search,
  Check,
  PlusCircle,
  Clock,
  AlertTriangle,
  Info
} from 'lucide-react'

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

const CARGOS = [
  'Alto Comando',
  'Diretor Corregedoria',
  'Membro Corregedoria',
  'Diretor APM',
  'Supervisor APM',
  'Instrutor Treinamento Operacional',
  'Instrutor De Cursos e Recrutamentos',
  'Coordenador Do Comitê Promocional',
  'Membro Do Comitê Promocional',
  'Comando Militar',
  'Sub Comando Militar',
  'Rádio Patrulha',
  'Comando Bope',
  'Coordenador Bope',
  'Executor Bope',
  'Operador Bope',
  'Probatório Bope',
  'Comando Core',
  'Coordenador Core',
  'Executor Core',
  'Operador Core',
  'Probatório Core',
  'Comando GAR',
  'Coordenador GAR',
  'Membro GAR',
  'Comando GAEP',
  'Coordenador GAEP',
  'Membro GAEP',
  'Comando GTM',
  'Coordenador GTM',
  'Membro GTM',
]

interface Promocao {
  id: string
  oficialId: string
  oficialUsername: string
  oficialQra: string
  cargoAnterior: string
  cargoNovo: string
  observacao?: string
  creatorId: string
  creatorQra: string
  createdAt: string
}

interface Usuario {
  id: string
  username: string
  qra?: string
  patente?: string
  cargo?: string[]
}

export default function PromocoesPage() {
  const { profile, session } = useAuth()
  const [promocoes, setPromocoes] = useState<Promocao[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)

  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [oficialSearch, setOficialSearch] = useState('')
  const [selectedOficial, setSelectedOficial] = useState<Usuario | null>(null)
  const [isOficialFocused, setIsOficialFocused] = useState(false)
  const [selectedCargo, setSelectedCargo] = useState('')
  const [observacao, setObservacao] = useState('')
  const [publishing, setPublishing] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)

  const isAltoComando = profile?.cargo?.includes('Alto Comando') || profile?.role === 'admin'

  const fetchPromocoes = async () => {
    try {
      const res = await fetch('/api/promocoes')
      if (res.ok) {
        const json = await res.json()
        setPromocoes(json.promocoes || [])
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
    fetchPromocoes()
    fetchUsuarios()

    // Setup SSE or event listener if needed, but manual reload/state is standard
    const handleUpdate = () => {
      fetchPromocoes()
      fetchUsuarios()
    }
    window.addEventListener('promocoes-update', handleUpdate)
    return () => window.removeEventListener('promocoes-update', handleUpdate)
  }, [session])

  const filteredUsuarios = usuarios.filter((u) => {
    const term = oficialSearch.toLowerCase()
    const qraMatch = (u.qra || '').toLowerCase().includes(term)
    const usernameMatch = (u.username || '').toLowerCase().includes(term)
    return term === '' || qraMatch || usernameMatch
  })

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session) return
    if (!selectedOficial) {
      setFormError('Selecione um oficial para ser promovido.')
      return
    }
    if (!selectedCargo) {
      setFormError('Selecione o novo cargo ou patente.')
      return
    }

    setPublishing(true)
    setFormError(null)
    setFormSuccess(null)

    try {
      const res = await fetch('/api/promocoes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          oficialId: selectedOficial.id,
          cargoNovo: selectedCargo,
          observacao
        })
      })

      const data = await res.json()
      if (!res.ok) {
        setFormError(data.error || 'Ocorreu um erro ao publicar.')
      } else {
        setFormSuccess(`Promoção de ${selectedOficial.qra || selectedOficial.username} publicada com sucesso!`)
        // Reset form
        setSelectedOficial(null)
        setOficialSearch('')
        setSelectedCargo('')
        setObservacao('')
        setIsFormOpen(false)
        fetchPromocoes()
      }
    } catch (err: any) {
      setFormError(err.message || 'Erro ao comunicar com o servidor.')
    } finally {
      setPublishing(false)
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 md:p-6" id="promocoes_module">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-800 pb-5" id="promocoes_header">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <TrendingUp className="h-8 w-8 text-indigo-400" />
            Promoções Policiais
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Mural de progressão de patentes e cargos na hierarquia da corporação.
          </p>
        </div>

        {isAltoComando && (
          <Button
            onClick={() => setIsFormOpen(!isFormOpen)}
            id="btn_toggle_promocao"
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-600/20 px-5 py-2.5 rounded-lg flex items-center gap-2 transition duration-200"
          >
            <PlusCircle className="h-5 w-5" />
            Publicar Promoção
          </Button>
        )}
      </div>

      {/* Form Section */}
      <AnimatePresence>
        {isFormOpen && isAltoComando && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
            id="promocoes_form_container"
          >
            <form
              onSubmit={handlePublish}
              className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-6 shadow-xl relative"
            >
              <div className="flex justify-between items-center border-b border-gray-800 pb-3">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Award className="h-5 w-5 text-indigo-400" />
                  Nova Publicação de Promoção
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
                <div className="bg-red-900/30 border border-red-500/50 text-red-200 p-4 rounded-lg flex items-start gap-3" id="form_error">
                  <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-sm">{formError}</p>
                </div>
              )}

              {formSuccess && (
                <div className="bg-emerald-900/30 border border-emerald-500/50 text-emerald-200 p-4 rounded-lg flex items-start gap-3" id="form_success">
                  <Check className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                  <p className="text-sm">{formSuccess}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Search / Autocomplete Oficial */}
                <div className="relative space-y-2">
                  <label className="block text-sm font-medium text-gray-300">Oficial Promovido</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-5 w-5 text-gray-500" />
                    <Input
                      type="text"
                      placeholder="Buscar oficial por QRA ou username..."
                      value={oficialSearch}
                      onChange={(e) => {
                        setOficialSearch(e.target.value)
                        if (selectedOficial) setSelectedOficial(null)
                      }}
                      onFocus={() => setIsOficialFocused(true)}
                      onBlur={() => setTimeout(() => setIsOficialFocused(false), 200)}
                      className="bg-gray-950 border-gray-800 focus:border-indigo-500 pl-10 text-white rounded-lg w-full h-11"
                    />
                  </div>

                  {selectedOficial && (
                    <div className="bg-indigo-950/40 border border-indigo-500/30 rounded-lg p-3 mt-2 flex justify-between items-center">
                      <div>
                        <p className="text-white font-semibold">{selectedOficial.qra || selectedOficial.username}</p>
                        <p className="text-xs text-gray-400">Patente Atual: {selectedOficial.patente || 'Sem patente'}</p>
                      </div>
                      <Check className="h-5 w-5 text-indigo-400" />
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
                          <p className="text-xs text-gray-400">
                            {u.patente || 'Sem patente'} {u.cargo && u.cargo.length > 0 ? `• ${u.cargo[0]}` : ''}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Cargo/Patente Novo */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300">Novo Cargo ou Patente</label>
                  <select
                    value={selectedCargo}
                    onChange={(e) => setSelectedCargo(e.target.value)}
                    className="bg-gray-950 border border-gray-800 focus:border-indigo-500 text-white rounded-lg w-full h-11 px-3"
                  >
                    <option value="">Selecione o cargo/patente...</option>
                    <optgroup label="Patentes">
                      {PATENTES.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Cargos Operacionais / Administrativos">
                      {CARGOS.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              </div>

              {/* Observação */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">Observação / Justificativa</label>
                <textarea
                  placeholder="Justificativa da promoção, méritos, decretos, etc..."
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  className="bg-gray-950 border border-gray-800 focus:border-indigo-500 text-white rounded-lg w-full p-3 h-24 text-sm"
                />
              </div>

              {/* Submit Buttons */}
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
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-6 py-2.5 rounded-lg shadow-lg shadow-indigo-600/20"
                >
                  {publishing ? 'Publicando...' : 'Publicar'}
                </Button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Promotions Mural Feed */}
      <div className="space-y-4" id="promocoes_feed">
        <h2 className="text-xl font-bold text-gray-300 flex items-center gap-2">
          <Clock className="h-5 w-5 text-gray-400" />
          Mural de Promoções Recentes
        </h2>

        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-gray-500 space-y-2">
            <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
            <p className="text-sm">Carregando feed de promoções...</p>
          </div>
        ) : promocoes.length === 0 ? (
          <div className="bg-gray-900/50 border border-gray-800/80 rounded-xl p-12 text-center text-gray-500">
            <Info className="h-10 w-10 mx-auto text-gray-600 mb-2" />
            <p className="font-semibold text-gray-400">Nenhuma promoção publicada</p>
            <p className="text-sm text-gray-500 mt-1">Nenhuma promoção de patente ou cargo foi registrada no feed ainda.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {promocoes.map((p, idx) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl p-5 shadow-lg flex flex-col justify-between transition-all"
                id={`promocao_card_${p.id}`}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="bg-indigo-900/40 p-2.5 rounded-lg border border-indigo-500/20">
                        <Award className="h-5 w-5 text-indigo-400" />
                      </div>
                      <div>
                        <h3 className="text-white font-bold text-lg leading-snug">{p.oficialQra}</h3>
                        <p className="text-xs text-gray-400">@{p.oficialUsername}</p>
                      </div>
                    </div>
                    <span className="text-[10px] bg-gray-800/80 text-gray-400 px-2 py-1 rounded-md flex items-center gap-1 font-mono">
                      <Calendar className="h-3 w-3" />
                      {new Date(p.createdAt).toLocaleDateString('pt-BR')}
                    </span>
                  </div>

                  {/* Transition path */}
                  <div className="my-4 bg-gray-950/60 rounded-lg p-3 border border-gray-800/60 flex items-center justify-between text-sm">
                    <div>
                      <span className="block text-[10px] uppercase text-gray-500 font-bold tracking-wider">Cargo Anterior</span>
                      <span className="font-semibold text-gray-300">{p.cargoAnterior}</span>
                    </div>
                    <div className="text-indigo-500 font-extrabold text-lg">➔</div>
                    <div className="text-right">
                      <span className="block text-[10px] uppercase text-indigo-400 font-bold tracking-wider">Cargo Novo</span>
                      <span className="font-extrabold text-indigo-300">{p.cargoNovo}</span>
                    </div>
                  </div>

                  {/* Observations */}
                  {p.observacao && (
                    <div className="text-gray-400 text-xs leading-relaxed italic bg-gray-950/20 p-2.5 border-l-2 border-indigo-500/40 rounded-r-lg">
                      {p.observacao}
                    </div>
                  )}
                </div>

                {/* Publisher Signature */}
                <div className="flex items-center gap-1.5 border-t border-gray-800/80 pt-3 mt-4 text-[11px] text-gray-400">
                  <Shield className="h-3.5 w-3.5 text-gray-500" />
                  Publicado por: <span className="font-semibold text-indigo-400">{p.creatorQra}</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
