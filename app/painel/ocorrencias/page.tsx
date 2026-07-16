'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { motion, AnimatePresence } from 'motion/react'
import {
  FileText,
  Search,
  Check,
  PlusCircle,
  Calendar,
  AlertTriangle,
  Info,
  Clock,
  User,
  Shield,
  FileSpreadsheet
} from 'lucide-react'

interface Ocorrencia {
  id: string
  oficialId: string
  oficialQra: string
  oficialUsername: string
  tipo: string
  envolvidos: string
  descricao: string
  dataHora: string
  createdAt: string
}

interface Usuario {
  id: string
  username: string
  qra?: string
  patente?: string
  cargo?: string[]
}

const TIPOS_OCORRENCIA = [
  'Invasão de Propriedade',
  'Desobediência / Desacato',
  'Homicídio / Lesão Corporal',
  'Assalto / Roubo / Furto',
  'Tráfico de Drogas / Contrabando',
  'Porte Ilegal de Arma de Fogo',
  'Vandalismo / Dano ao Patrimônio',
  'Perturbação do Sossego',
  'Suborno / Corrupção ativa',
  'Outros'
]

export default function OcorrenciasPage() {
  const { profile, session } = useAuth()
  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)

  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [oficialSearch, setOficialSearch] = useState('')
  const [selectedOficial, setSelectedOficial] = useState<Usuario | null>(null)
  const [isOficialFocused, setIsOficialFocused] = useState(false)
  const [tipoOcorrencia, setTipoOcorrencia] = useState('')
  const [envolvidos, setEnvolvidos] = useState('')
  const [descricao, setDescricao] = useState('')
  const [publishing, setPublishing] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)

  // Filter/Search states
  const [searchTerm, setSearchTerm] = useState('')

  const fetchOcorrencias = async () => {
    try {
      const res = await fetch('/api/ocorrencias')
      if (res.ok) {
        const json = await res.json()
        setOcorrencias(json.ocorrencias || [])
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
    fetchOcorrencias()
    fetchUsuarios()

    // Automatically set current user as responsible officer initially
    if (profile && usuarios.length > 0) {
      const u = usuarios.find(x => x.id === profile.id)
      if (u) {
        setSelectedOficial(u)
        setOficialSearch(u.qra || u.username)
      }
    }
  }, [session, profile, usuarios.length])

  // Set responsible officer as yourself when profile loads
  useEffect(() => {
    if (profile && !selectedOficial) {
      const u = {
        id: profile.id,
        username: profile.username,
        qra: profile.qra || undefined,
        patente: profile.patente || undefined,
        cargo: profile.cargo
      }
      setSelectedOficial(u)
      setOficialSearch(profile.qra || profile.username)
    }
  }, [profile])

  const filteredUsuarios = usuarios.filter((u) => {
    const term = oficialSearch.toLowerCase()
    const qraMatch = (u.qra || '').toLowerCase().includes(term)
    const usernameMatch = (u.username || '').toLowerCase().includes(term)
    return term === '' || qraMatch || usernameMatch
  })

  const filteredOcorrencias = ocorrencias.filter((o) => {
    const term = searchTerm.toLowerCase().trim()
    if (!term) return true
    const envMatch = (o.envolvidos || '').toLowerCase().includes(term)
    const oficialMatch = (o.oficialQra || '').toLowerCase().includes(term)
    const tipoMatch = (o.tipo || '').toLowerCase().includes(term)
    return envMatch || oficialMatch || tipoMatch
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session) return
    if (!selectedOficial) {
      setFormError('Selecione o oficial responsável pelo boletim.')
      return
    }
    if (!tipoOcorrencia) {
      setFormError('Selecione ou digite o tipo de ocorrência.')
      return
    }
    if (!envolvidos.trim()) {
      setFormError('Especifique os envolvidos (civis / comparsas).')
      return
    }
    if (!descricao.trim()) {
      setFormError('Adicione uma descrição detalhada do fato.')
      return
    }

    setPublishing(true)
    setFormError(null)
    setFormSuccess(null)

    try {
      const res = await fetch('/api/ocorrencias', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          oficialId: selectedOficial.id,
          tipo: tipoOcorrencia,
          envolvidos,
          descricao
        })
      })

      const data = await res.json()
      if (!res.ok) {
        setFormError(data.error || 'Erro ao registrar ocorrência.')
      } else {
        setFormSuccess('Boletim de Ocorrência (B.O.) registrado com sucesso!')
        setTipoOcorrencia('')
        setEnvolvidos('')
        setDescricao('')
        setIsFormOpen(false)
        fetchOcorrencias()
      }
    } catch (err: any) {
      setFormError(err.message || 'Erro ao comunicar com o servidor.')
    } finally {
      setPublishing(false)
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 md:p-6" id="ocorrencias_module">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-800 pb-5" id="ocorrencias_header">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
            <FileText className="h-8 w-8 text-emerald-400" />
            Registro de Ocorrências (B.O.)
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Gestão, controle e arquivamento de boletins de ocorrência policial.
          </p>
        </div>

        <Button
          onClick={() => setIsFormOpen(!isFormOpen)}
          id="btn_toggle_ocorrencia"
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-lg shadow-emerald-600/20 px-5 py-2.5 rounded-lg flex items-center gap-2 transition duration-200"
        >
          <PlusCircle className="h-5 w-5" />
          Registrar Novo B.O.
        </Button>
      </div>

      {/* Form Container */}
      <AnimatePresence>
        {isFormOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
            id="ocorrencias_form_container"
          >
            <form
              onSubmit={handleSubmit}
              className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-6 shadow-xl"
            >
              <div className="flex justify-between items-center border-b border-gray-800 pb-3">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-emerald-400" />
                  Registrar Boletim de Ocorrência
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Autocomplete Oficial */}
                <div className="relative space-y-2">
                  <label className="block text-sm font-medium text-gray-300">Oficial Responsável</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-5 w-5 text-gray-500" />
                    <Input
                      type="text"
                      placeholder="Pesquisar oficial pelo QRA..."
                      value={oficialSearch}
                      onChange={(e) => {
                        setOficialSearch(e.target.value)
                        if (selectedOficial) setSelectedOficial(null)
                      }}
                      onFocus={() => setIsOficialFocused(true)}
                      onBlur={() => setTimeout(() => setIsOficialFocused(false), 200)}
                      className="bg-gray-950 border-gray-800 focus:border-emerald-500 pl-10 text-white rounded-lg w-full h-11"
                    />
                  </div>

                  {selectedOficial && (
                    <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-lg p-3 mt-2 flex justify-between items-center">
                      <div>
                        <p className="text-white font-semibold">{selectedOficial.qra || selectedOficial.username}</p>
                        <p className="text-xs text-gray-400">{selectedOficial.patente || 'Sem patente'}</p>
                      </div>
                      <Check className="h-5 w-5 text-emerald-400" />
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

                {/* Tipo de Ocorrência */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300">Tipo de Infração / Ocorrência</label>
                  <select
                    value={tipoOcorrencia}
                    onChange={(e) => setTipoOcorrencia(e.target.value)}
                    className="bg-gray-950 border border-gray-800 focus:border-emerald-500 text-white rounded-lg w-full h-11 px-3"
                  >
                    <option value="">Selecione o tipo de crime/infração...</option>
                    {TIPOS_OCORRENCIA.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Envolvidos */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300">Nome dos Civis / Envolvidos</label>
                  <Input
                    type="text"
                    placeholder="Ex: Carlos da Silva, RG: 1042"
                    value={envolvidos}
                    onChange={(e) => setEnvolvidos(e.target.value)}
                    className="bg-gray-950 border-gray-800 focus:border-emerald-500 text-white rounded-lg w-full h-11"
                  />
                  <p className="text-[11px] text-gray-500">Mencione os nomes ou apelidos de forma completa para facilitar buscas posteriores.</p>
                </div>

                {/* Data/Hora Automática (Apenas leitura) */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300">Data / Hora do Registro</label>
                  <div className="bg-gray-950 border border-gray-800 text-gray-400 rounded-lg w-full h-11 flex items-center px-4 gap-2 text-sm">
                    <Clock className="h-4 w-4 text-emerald-500" />
                    {new Date().toLocaleString('pt-BR')} (Automático)
                  </div>
                </div>
              </div>

              {/* Descrição */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">Descrição dos Fatos (Relato Policial)</label>
                <textarea
                  placeholder="Relato detalhado com as circunstâncias da abordagem, itens apreendidos, flagrante..."
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  className="bg-gray-950 border border-gray-800 focus:border-emerald-500 text-white rounded-lg w-full p-3 h-28 text-sm"
                />
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
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-6 py-2.5 rounded-lg shadow-lg shadow-emerald-600/20"
                >
                  {publishing ? 'Registrando...' : 'Registrar B.O.'}
                </Button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search Filter input */}
      <div className="bg-gray-900 border border-gray-800/80 rounded-xl p-4 flex flex-col sm:flex-row gap-3 shadow-md" id="bo_filter_bar">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-5 w-5 text-gray-500" />
          <Input
            type="text"
            placeholder="Buscar por civil envolvido, oficial ou tipo de ocorrência..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-gray-950 border-gray-800 focus:border-emerald-500 pl-10 text-white rounded-lg w-full"
          />
        </div>
        {searchTerm && (
          <Button
            variant="ghost"
            onClick={() => setSearchTerm('')}
            className="text-gray-400 hover:text-white text-xs"
          >
            Limpar Busca
          </Button>
        )}
      </div>

      {/* List Feed of occurrences */}
      <div className="space-y-4" id="bo_list_container">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-300 flex items-center gap-2">
            <Clock className="h-5 w-5 text-gray-400" />
            Ocorrências Recentes
          </h2>
          <span className="text-xs text-gray-500 font-mono">
            Mostrando {filteredOcorrencias.length} boletins
          </span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-gray-500 space-y-2">
            <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
            <p className="text-sm">Carregando boletins de ocorrência...</p>
          </div>
        ) : filteredOcorrencias.length === 0 ? (
          <div className="bg-gray-900/50 border border-gray-800/80 rounded-xl p-12 text-center text-gray-500">
            <Info className="h-10 w-10 mx-auto text-gray-600 mb-2" />
            <p className="font-semibold text-gray-400">Nenhuma ocorrência encontrada</p>
            <p className="text-sm text-gray-500 mt-1">
              {searchTerm ? 'Nenhum registro corresponde aos filtros pesquisados.' : 'Nenhuma ocorrência foi registrada ainda.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOcorrencias.map((o) => (
              <motion.div
                key={o.id}
                layout
                className="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl p-5 shadow-lg space-y-4 transition-all"
                id={`bo_card_${o.id}`}
              >
                {/* Card Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-800/60 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="bg-emerald-950/55 border border-emerald-500/30 text-emerald-300 px-3 py-1 text-xs font-extrabold rounded-lg uppercase">
                      {o.tipo}
                    </span>
                    <span className="text-[10px] text-gray-500 font-mono">ID: {o.id}</span>
                  </div>

                  <span className="text-xs text-gray-400 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-gray-500" />
                    {new Date(o.dataHora).toLocaleString('pt-BR')}
                  </span>
                </div>

                {/* Envolvidos */}
                <div className="bg-gray-950/60 rounded-lg p-3 border border-gray-800/60 flex items-start gap-2.5">
                  <User className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="block text-[10px] uppercase text-gray-500 font-bold tracking-wider">Envolvidos / Suspeitos</span>
                    <span className="font-bold text-gray-200 text-sm">{o.envolvidos}</span>
                  </div>
                </div>

                {/* Descricao */}
                <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-line font-light p-1">
                  {o.descricao}
                </div>

                {/* Footer responsible officer */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-800/80 text-xs">
                  <div className="flex items-center gap-1.5 text-gray-400">
                    <Shield className="h-4 w-4 text-emerald-500/60" />
                    Oficial Responsável: <span className="font-bold text-emerald-400">{o.oficialQra}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
