'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { motion } from 'motion/react'
import {
  Search,
  User,
  ShieldAlert,
  ShieldCheck,
  FileText,
  Lock,
  Calendar,
  AlertTriangle,
  Info,
  ChevronRight,
  RefreshCw
} from 'lucide-react'

interface OcorrenciaLink {
  id: string
  tipo: string
  descricao: string
  envolvidos: string
  oficialQra: string
  dataHora: string
}

interface AntecedenteLink {
  id: string
  presoNome: string
  presoRg: string
  motivo: string
  observacoes: string
  oficialQra: string
  dataHora: string
}

interface CivilRecord {
  nome: string
  status: string // 'limpo' | 'procurado'
  ocorrencias: OcorrenciaLink[]
  antecedentes: AntecedenteLink[]
}

export default function BancoCivilPage() {
  const { session } = useAuth()
  const [searchName, setSearchName] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<CivilRecord | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchName.trim()) return

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch(`/api/banco-civil?nome=${encodeURIComponent(searchName.trim())}`)
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Erro ao consultar banco de dados civil.')
      } else {
        setResult(data)
      }
    } catch (err: any) {
      setError(err.message || 'Erro de conexão com o servidor.')
    } finally {
      setLoading(false)
    }
  }

  const toggleCivilStatus = async (newStatus: 'limpo' | 'procurado') => {
    if (!result || !session) return

    setUpdatingStatus(true)
    try {
      const res = await fetch('/api/banco-civil', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          nome: result.nome,
          status: newStatus
        })
      })

      if (res.ok) {
        setResult((prev) => prev ? { ...prev, status: newStatus } : null)
      } else {
        const data = await res.json()
        alert(data.error || 'Não foi possível alterar o status.')
      }
    } catch (e: any) {
      alert('Erro ao atualizar: ' + e.message)
    } finally {
      setUpdatingStatus(false)
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4 md:p-6" id="banco_civil_module">
      {/* Header */}
      <div className="border-b border-gray-800 pb-5" id="banco_civil_header">
        <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
          <User className="h-8 w-8 text-indigo-400" />
          Banco de Dados Civil
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Busca unificada de fichas criminais, boletins de ocorrência, mandados e prisões.
        </p>
      </div>

      {/* Search Bar Form */}
      <form onSubmit={handleSearch} className="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-lg flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3.5 h-5 w-5 text-gray-500" />
          <Input
            type="text"
            placeholder="Digite o nome completo do civil para pesquisar..."
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            className="bg-gray-950 border-gray-800 focus:border-indigo-500 pl-10 h-12 text-white text-base rounded-lg w-full"
            disabled={loading}
          />
        </div>
        <Button
          type="submit"
          disabled={loading || !searchName.trim()}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold h-12 px-8 rounded-lg shadow-lg shadow-indigo-600/20"
        >
          {loading ? 'Consultando...' : 'Consultar Ficha'}
        </Button>
      </form>

      {/* Error container */}
      {error && (
        <div className="bg-red-900/20 border border-red-500/40 text-red-200 p-4 rounded-xl flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Search Results Display */}
      {result && (
        <div className="space-y-6" id="banco_civil_results">
          {/* Civil Profile Card */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-xl space-y-6"
          >
            {/* Upper profile section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800 pb-5">
              <div className="flex items-center gap-4">
                <div className="bg-gray-950 p-4 rounded-full border border-gray-800 flex items-center justify-center">
                  <User className="h-8 w-8 text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white capitalize">{result.nome}</h2>
                  <p className="text-xs text-gray-500 mt-0.5 uppercase tracking-widest font-semibold">Cidadão Civil</p>
                </div>
              </div>

              {/* Status flag and toggle */}
              <div className="flex items-center gap-3">
                {result.status === 'procurado' ? (
                  <div className="bg-red-950/40 border border-red-500/50 text-red-400 px-4 py-2 rounded-lg flex items-center gap-2 font-bold text-sm uppercase">
                    <ShieldAlert className="h-5 w-5" />
                    Procurado pela Justiça
                  </div>
                ) : (
                  <div className="bg-emerald-950/40 border border-emerald-500/50 text-emerald-400 px-4 py-2 rounded-lg flex items-center gap-2 font-bold text-sm uppercase">
                    <ShieldCheck className="h-5 w-5" />
                    Ficha Limpa
                  </div>
                )}

                {/* Toggle Actions */}
                <div className="flex border border-gray-800 rounded-lg p-1 bg-gray-950">
                  <button
                    type="button"
                    disabled={updatingStatus}
                    onClick={() => toggleCivilStatus('limpo')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${result.status === 'limpo' ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'}`}
                  >
                    Limpar
                  </button>
                  <button
                    type="button"
                    disabled={updatingStatus}
                    onClick={() => toggleCivilStatus('procurado')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${result.status === 'procurado' ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'}`}
                  >
                    Procurar
                  </button>
                </div>
              </div>
            </div>

            {/* If has absolutely nothing */}
            {result.ocorrencias.length === 0 && result.antecedentes.length === 0 && result.status === 'limpo' && (
              <div className="bg-emerald-950/10 border border-emerald-500/20 rounded-xl p-8 text-center text-emerald-200">
                <ShieldCheck className="h-12 w-12 text-emerald-400 mx-auto mb-3" />
                <h3 className="text-lg font-bold">NADA CONSTA</h3>
                <p className="text-sm text-emerald-400/80 mt-1 max-w-md mx-auto">
                  Este cidadão possui a ficha totalmente limpa. Não há boletins de ocorrência vinculados ou mandados de prisão pendentes.
                </p>
              </div>
            )}

            {/* Core logs info block */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Linked Ocorrencias Column */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-gray-300 flex items-center gap-2 border-b border-gray-800 pb-2">
                  <FileText className="h-5 w-5 text-indigo-400" />
                  Ocorrências Relacionadas ({result.ocorrencias.length})
                </h3>

                {result.ocorrencias.length === 0 ? (
                  <p className="text-gray-500 text-sm italic py-4">Nenhuma ocorrência registrada para este nome.</p>
                ) : (
                  <div className="space-y-3">
                    {result.ocorrencias.map((o) => (
                      <div key={o.id} className="bg-gray-950 border border-gray-800/80 rounded-lg p-4 space-y-2">
                        <div className="flex justify-between items-start gap-2">
                          <span className="text-xs bg-indigo-900/50 text-indigo-300 border border-indigo-500/20 px-2 py-0.5 rounded-md font-bold uppercase">
                            {o.tipo}
                          </span>
                          <span className="text-[10px] text-gray-500 font-mono">
                            {new Date(o.dataHora).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 line-clamp-3 italic leading-relaxed">
                          "{o.descricao}"
                        </p>
                        <p className="text-[10px] text-gray-500 border-t border-gray-900 pt-2 flex items-center gap-1">
                          Registrado por: <span className="font-semibold text-indigo-400">{o.oficialQra}</span>
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Arrests Column (Antecedentes) */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-gray-300 flex items-center gap-2 border-b border-gray-800 pb-2">
                  <Lock className="h-5 w-5 text-red-400" />
                  Histórico de Prisões / RG ({result.antecedentes.length})
                </h3>

                {result.antecedentes.length === 0 ? (
                  <p className="text-gray-500 text-sm italic py-4">Nenhum registro de prisão encontrado para este nome.</p>
                ) : (
                  <div className="space-y-3">
                    {result.antecedentes.map((a) => (
                      <div key={a.id} className="bg-gray-950 border border-gray-800/80 rounded-lg p-4 space-y-2">
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <span className="font-bold text-red-400 text-xs">PRISÃO PROCESSADA</span>
                            {a.presoRg && <span className="text-[10px] text-gray-500 block">RG: {a.presoRg}</span>}
                          </div>
                          <span className="text-[10px] text-gray-500 font-mono">
                            {new Date(a.dataHora).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                        <p className="text-xs text-gray-300 leading-snug">
                          <span className="font-semibold text-gray-400">Motivo:</span> {a.motivo}
                        </p>
                        {a.observacoes && (
                          <p className="text-xs text-gray-400 leading-snug italic">
                            "{a.observacoes}"
                          </p>
                        )}
                        <p className="text-[10px] text-gray-500 border-t border-gray-900 pt-2 flex items-center gap-1">
                          Efetuada por: <span className="font-semibold text-indigo-400">{a.oficialQra}</span>
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Guide/Info block if no result is queried yet */}
      {!result && !loading && (
        <div className="bg-gray-900/40 border border-gray-800/80 rounded-xl p-12 text-center text-gray-500 max-w-2xl mx-auto">
          <Info className="h-10 w-10 text-gray-600 mx-auto mb-3" />
          <p className="font-bold text-gray-400">Consulta de Ficha Civil</p>
          <p className="text-sm text-gray-500 mt-1.5 max-w-md mx-auto">
            Digite o nome de um suspeito, civil abordado ou testemunha acima. O sistema fará um cruzamento de dados com boletins de ocorrência e relatórios de prisões para apresentar a ficha criminal consolidada do cidadão.
          </p>
        </div>
      )}
    </div>
  )
}
