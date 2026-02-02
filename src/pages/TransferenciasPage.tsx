import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../hooks/useAuth'
import { transferenciasService } from '../services/transferenciasService'
import type {
  TransferenciaBaseView,
  CriarTransferenciaBaseDTO,
  EnviarTransferenciaDTO,
  ReceberTransferenciaDTO,
  StatusTransferencia,
  PrioridadeTransferencia,
  HistoricoTransferenciaLog,
  Base,
  Contrato,
  ItemEstoque
} from '../types/transferencias'
import {
  ArrowLeftRight,
  Send,
  Package,
  CheckCircle,
  Eye,
  Plus,
  AlertTriangle,
  Loader2,
  TruckIcon,
  X,
  Search,
  Download,
  Calendar,
  Filter
} from 'lucide-react'

export default function TransferenciasPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [transferencias, setTransferencias] = useState<TransferenciaBaseView[]>([])
  const [bases, setBases] = useState<Base[]>([])
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [itensEstoque, setItensEstoque] = useState<ItemEstoque[]>([])
  const [historico, setHistorico] = useState<HistoricoTransferenciaLog[]>([])
  const [activeTab, setActiveTab] = useState<'transferencias' | 'logs'>('transferencias')
  
  const [modalNova, setModalNova] = useState(false)
  const [modalEnviar, setModalEnviar] = useState(false)
  const [modalReceber, setModalReceber] = useState(false)
  const [transferenciaSelecionada, setTransferenciaSelecionada] = useState<TransferenciaBaseView | null>(null)
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [statusFiltro, setStatusFiltro] = useState<StatusTransferencia | 'todos'>('todos')

  const notify = (message: string, type: 'success' | 'error' | 'info') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 5000)
  }

  const carregarDados = useCallback(async () => {
    setLoading(true)
    try {
      const [transf, basesData, contratosData, itens, hist] = await Promise.all([
        transferenciasService.getTransferencias(),
        transferenciasService.getBases(),
        transferenciasService.getContratos(),
        transferenciasService.getItensEstoque(),
        transferenciasService.getHistorico()
      ])
      setTransferencias(transf)
      setBases(basesData)
      setContratos(contratosData)
      setItensEstoque(itens)
      setHistorico(hist)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      notify('Erro ao carregar dados', 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    carregarDados()
  }, [carregarDados])

  const getStatusBadge = (status: StatusTransferencia) => {
    const styles = {
      pendente: {
        bg: 'bg-yellow-50',
        text: 'text-yellow-700',
        border: 'border-yellow-300',
        icon: '⏳'
      },
      em_transito: {
        bg: 'bg-blue-50',
        text: 'text-blue-700',
        border: 'border-blue-300',
        icon: '🚚'
      },
      concluida: {
        bg: 'bg-green-50',
        text: 'text-green-700',
        border: 'border-green-300',
        icon: '✓'
      },
      cancelada: {
        bg: 'bg-red-50',
        text: 'text-red-700',
        border: 'border-red-300',
        icon: '✕'
      }
    }
    
    const labels = {
      pendente: 'Pendente',
      em_transito: 'Em Trânsito',
      concluida: 'Concluída',
      cancelada: 'Cancelada'
    }
    
    const style = styles[status]
    
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md border ${style.bg} ${style.text} ${style.border} text-xs font-semibold`}>
        <span>{style.icon}</span>
        {labels[status]}
      </span>
    )
  }

  const getPrioridadeBadge = (prioridade: PrioridadeTransferencia) => {
    const styles = {
      baixa: {
        bg: 'bg-gray-50',
        text: 'text-gray-600',
        border: 'border-gray-300',
        icon: '↓'
      },
      normal: {
        bg: 'bg-blue-50',
        text: 'text-blue-600',
        border: 'border-blue-300',
        icon: '→'
      },
      alta: {
        bg: 'bg-orange-50',
        text: 'text-orange-600',
        border: 'border-orange-300',
        icon: '↑'
      },
      urgente: {
        bg: 'bg-red-50',
        text: 'text-red-600',
        border: 'border-red-300',
        icon: '⚠'
      }
    }
    
    const labels = {
      baixa: 'Baixa',
      normal: 'Normal',
      alta: 'Alta',
      urgente: 'Urgente'
    }
    
    const style = styles[prioridade]
    
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md border ${style.bg} ${style.text} ${style.border} text-xs font-semibold`}>
        <span>{style.icon}</span>
        {labels[prioridade]}
      </span>
    )
  }

  const formatarData = (data: string) => {
    if (!data) return ''
    return new Date(data).toLocaleDateString('pt-BR')
  }

  // Filtrar transferências
  const transferenciasFiltradas = transferencias.filter(t => {
    // Filtro de busca
    const searchLower = searchTerm.toLowerCase()
    const matchSearch = !searchTerm || 
      t.numero_transferencia.toLowerCase().includes(searchLower) ||
      t.item_nome.toLowerCase().includes(searchLower) ||
      t.item_codigo.toLowerCase().includes(searchLower) ||
      t.base_origem_nome.toLowerCase().includes(searchLower) ||
      t.base_destino_nome.toLowerCase().includes(searchLower) ||
      t.solicitante_nome.toLowerCase().includes(searchLower)
    
    // Filtro de status
    const matchStatus = statusFiltro === 'todos' || t.status === statusFiltro
    
    // Filtro de data
    const dataTransf = new Date(t.data_solicitacao)
    const matchDataInicio = !dataInicio || dataTransf >= new Date(dataInicio)
    const matchDataFim = !dataFim || dataTransf <= new Date(dataFim + 'T23:59:59')
    
    return matchSearch && matchStatus && matchDataInicio && matchDataFim
  })

  const pendentes = transferenciasFiltradas.filter(t => t.status === 'pendente')
  const emTransito = transferenciasFiltradas.filter(t => t.status === 'em_transito')
  const concluidas = transferenciasFiltradas.filter(t => t.status === 'concluida')
  const emAtraso = transferenciasFiltradas.filter(t => t.em_atraso && t.status !== 'concluida')

  // Função para exportar para Excel
  const exportarExcel = () => {
    try {
      // Preparar dados para CSV
      const headers = [
        'Documento',
        'Status',
        'Prioridade',
        'Item',
        'Código',
        'Quantidade',
        'Unidade',
        'Base Origem',
        'Base Destino',
        'Solicitante',
        'Data Solicitação',
        'Data Envio',
        'Data Recebimento',
        'Previsão Chegada',
        'Dias em Trânsito',
        'Em Atraso',
        'Motivo',
        'Observações'
      ]
      
      const rows = transferenciasFiltradas.map(t => [
        t.numero_transferencia,
        t.status,
        t.prioridade,
        t.item_nome,
        t.item_codigo,
        t.quantidade,
        t.unidade_medida,
        t.base_origem_nome,
        t.base_destino_nome,
        t.solicitante_nome,
        formatarData(t.data_solicitacao),
        t.data_envio ? formatarData(t.data_envio) : '',
        t.data_recebimento ? formatarData(t.data_recebimento) : '',
        t.previsao_chegada ? formatarData(t.previsao_chegada) : '',
        t.dias_em_transito || 0,
        t.em_atraso ? 'Sim' : 'Não',
        t.motivo || '',
        t.observacoes_solicitacao || ''
      ])
      
      // Criar CSV
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n')
      
      // Criar blob e download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `transferencias_${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      notify('Exportação realizada com sucesso!', 'success')
    } catch (error) {
      console.error('Erro ao exportar:', error)
      notify('Erro ao exportar dados', 'error')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {notification && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
          notification.type === 'success' ? 'bg-green-500' :
          notification.type === 'error' ? 'bg-red-500' : 'bg-blue-500'
        } text-white`}>
          {notification.message}
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <ArrowLeftRight className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Transferências Entre Bases</h1>
        </div>
        <p className="text-gray-600">
          Gerencie transferências de itens entre diferentes bases e contratos
        </p>
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('transferencias')}
          className={`flex items-center gap-2 px-4 py-2 font-medium transition-colors ${
            activeTab === 'transferencias'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Package className="w-4 h-4" />
          Transferências
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2 px-4 py-2 font-medium transition-colors ${
            activeTab === 'logs'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Eye className="w-4 h-4" />
          Logs
        </button>
      </div>

      {activeTab === 'transferencias' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold text-gray-900">Transferências</h2>
            <div className="flex gap-2">
              <button
                onClick={exportarExcel}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                Exportar Excel
              </button>
              <button
                onClick={() => {
                  setTransferenciaSelecionada(null)
                  setModalNova(true)
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Nova Transferência
              </button>
            </div>
          </div>

          {/* Filtros */}
          <div className="bg-white p-4 rounded-lg shadow space-y-4">
            <div className="flex items-center gap-2 text-gray-700 font-medium">
              <Filter className="w-5 h-5" />
              Filtros
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Busca */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por documento, item, base..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Status */}
              <div className="relative">
                <select
                  value={statusFiltro}
                  onChange={(e) => setStatusFiltro(e.target.value as StatusTransferencia | 'todos')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                >
                  <option value="todos">Todos os Status</option>
                  <option value="pendente">Pendente</option>
                  <option value="em_transito">Em Trânsito</option>
                  <option value="concluida">Concluída</option>
                  <option value="cancelada">Cancelada</option>
                </select>
              </div>

              {/* Data Início */}
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  placeholder="Data Início"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Data Fim */}
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  placeholder="Data Fim"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Botão limpar filtros */}
            {(searchTerm || statusFiltro !== 'todos' || dataInicio || dataFim) && (
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setSearchTerm('')
                    setStatusFiltro('todos')
                    setDataInicio('')
                    setDataFim('')
                  }}
                  className="text-sm text-gray-600 hover:text-gray-900 underline"
                >
                  Limpar filtros
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-sm font-medium text-yellow-600 mb-1">Pendentes</div>
              <div className="text-2xl font-bold text-yellow-600">{pendentes.length}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-sm font-medium text-blue-600 mb-1">Em Trânsito</div>
              <div className="text-2xl font-bold text-blue-600">{emTransito.length}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-sm font-medium text-green-600 mb-1">Concluídas</div>
              <div className="text-2xl font-bold text-green-600">{concluidas.length}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-sm font-medium text-red-600 mb-1">Em Atraso</div>
              <div className="text-2xl font-bold text-red-600">{emAtraso.length}</div>
            </div>
          </div>

          {emAtraso.length > 0 && (
            <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <span className="text-red-800 font-medium">
                Existem {emAtraso.length} transferência(s) em atraso!
              </span>
            </div>
          )}

          {transferenciasFiltradas.length === 0 ? (
            <div className="bg-white p-10 rounded-lg shadow text-center text-gray-500">
              {transferencias.length === 0 
                ? 'Nenhuma transferência registrada'
                : 'Nenhuma transferência encontrada com os filtros aplicados'}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Documento</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">De → Para</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Item</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Qtd</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Solicitante</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Data</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Prioridade</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {transferenciasFiltradas.map((transf) => (
                      <tr 
                        key={transf.id}
                        className={transf.em_atraso ? 'bg-red-50' : ''}
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{transf.numero_transferencia}</div>
                          {(transf.dias_em_transito ?? 0) > 0 && (
                            <div className="text-xs text-gray-500">
                              {transf.dias_em_transito} dia(s) em trânsito
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-sm">
                              <span className="font-medium text-gray-900">{transf.base_origem_nome}</span>
                              <ArrowLeftRight className="w-3 h-3 text-gray-400" />
                              <span className="font-medium text-gray-900">{transf.base_destino_nome}</span>
                            </div>
                            {transf.entre_contratos && (
                              <span className="inline-block px-2 py-0.5 bg-purple-100 text-purple-800 text-xs rounded">
                                Entre Contratos
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-gray-900">{transf.item_nome}</div>
                          <div className="text-xs text-gray-500">{transf.item_codigo}</div>
                        </td>
                        <td className="px-4 py-3 text-gray-900">
                          {transf.quantidade} {transf.unidade_medida}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {transf.solicitante_nome}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-gray-900">{formatarData(transf.data_solicitacao)}</div>
                          {transf.previsao_chegada && (
                            <div className="text-xs text-gray-500">
                              Prev: {formatarData(transf.previsao_chegada)}
                            </div>
                          )}
                          {transf.em_atraso && (
                            <span className="inline-block mt-1 px-2 py-0.5 bg-red-100 text-red-800 text-xs rounded">
                              {transf.dias_atraso} dia(s) de atraso
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {getPrioridadeBadge(transf.prioridade)}
                        </td>
                        <td className="px-4 py-3">
                          {getStatusBadge(transf.status)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            {transf.status === 'pendente' && (
                              <button
                                onClick={() => {
                                  setTransferenciaSelecionada(transf)
                                  setModalEnviar(true)
                                }}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                title="Enviar"
                              >
                                <Send className="w-4 h-4" />
                              </button>
                            )}
                            {transf.status === 'em_transito' && (
                              <button
                                onClick={() => {
                                  setTransferenciaSelecionada(transf)
                                  setModalReceber(true)
                                }}
                                className="p-2 text-green-600 hover:bg-green-50 rounded transition-colors"
                                title="Receber"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => {
                                notify(`Transferência: ${transf.numero_transferencia}`, 'info')
                              }}
                              className="p-2 text-gray-600 hover:bg-gray-50 rounded transition-colors"
                              title="Ver detalhes"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold text-gray-900">Histórico e Logs</h2>
            <button
              onClick={() => transferenciasService.getHistorico().then(setHistorico)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <ArrowLeftRight className="w-4 h-4" />
              Atualizar
            </button>
          </div>

          {historico.length === 0 ? (
            <div className="bg-white p-10 rounded-lg shadow text-center text-gray-500">
              Nenhum registro de histórico encontrado
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Data/Hora</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Ação</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Transferência</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Rota</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Detalhes</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Usuário</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {historico.map((log) => (
                      <tr key={log.id}>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {new Date(log.criado_em).toLocaleString('pt-BR')}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            log.acao === 'criacao' ? 'bg-blue-100 text-blue-800' :
                            log.acao === 'envio' ? 'bg-green-100 text-green-800' :
                            log.acao === 'recebimento' ? 'bg-green-100 text-green-800' :
                            log.acao === 'cancelamento' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {log.acao === 'criacao' && 'Criação'}
                            {log.acao === 'aprovacao' && 'Aprovação'}
                            {log.acao === 'rejeicao' && 'Rejeição'}
                            {log.acao === 'envio' && 'Envio'}
                            {log.acao === 'recebimento' && 'Recebimento'}
                            {log.acao === 'cancelamento' && 'Cancelamento'}
                            {log.acao === 'atualizacao' && 'Atualização'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {log.transferencia?.numero_transferencia || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {log.transferencia?.base_origem?.nome && log.transferencia?.base_destino?.nome ? (
                            <div className="flex items-center gap-1">
                              <span>{log.transferencia.base_origem.nome}</span>
                              <ArrowLeftRight className="w-3 h-3 text-gray-400" />
                              <span>{log.transferencia.base_destino.nome}</span>
                            </div>
                          ) : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {log.detalhes || '-'}
                          {log.status_anterior && log.status_novo && (
                            <div className="text-xs text-gray-500 mt-1">
                              {log.status_anterior} → {log.status_novo}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="font-medium text-gray-900">{log.usuario?.nome || 'Sistema'}</div>
                          {log.usuario?.email && (
                            <div className="text-xs text-gray-500">{log.usuario.email}</div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {modalNova && (
        <ModalNovaTransferencia
          onClose={() => setModalNova(false)}
          bases={bases}
          contratos={contratos}
          itensEstoque={itensEstoque}
          onSave={() => {
            carregarDados()
            setModalNova(false)
          }}
          notify={notify}
          userId={user?.id || ''}
        />
      )}

      {modalEnviar && transferenciaSelecionada && (
        <ModalEnviarTransferencia
          onClose={() => {
            setModalEnviar(false)
            setTransferenciaSelecionada(null)
          }}
          transferencia={transferenciaSelecionada}
          onSave={() => {
            carregarDados()
            setModalEnviar(false)
            setTransferenciaSelecionada(null)
          }}
          notify={notify}
          userId={user?.id || ''}
        />
      )}

      {modalReceber && transferenciaSelecionada && (
        <ModalReceberTransferencia
          onClose={() => {
            setModalReceber(false)
            setTransferenciaSelecionada(null)
          }}
          transferencia={transferenciaSelecionada}
          onSave={() => {
            carregarDados()
            setModalReceber(false)
            setTransferenciaSelecionada(null)
          }}
          notify={notify}
          userId={user?.id || ''}
        />
      )}
    </div>
  )
}

interface ModalNovaTransferenciaProps {
  onClose: () => void
  bases: Base[]
  contratos: Contrato[]
  itensEstoque: ItemEstoque[]
  onSave: () => void
  notify: (message: string, type: 'success' | 'error' | 'info') => void
  userId: string
}

function ModalNovaTransferencia({ onClose, bases, contratos, itensEstoque, onSave, notify, userId }: ModalNovaTransferenciaProps) {
  const [formData, setFormData] = useState<CriarTransferenciaBaseDTO>({
    item_estoque_id: '',
    quantidade: 1,
    base_origem_id: '',
    contrato_origem_id: '',
    base_destino_id: '',
    contrato_destino_id: '',
    motivo: '',
    prioridade: 'normal',
    condicao_envio: 'bom',
    observacoes_solicitacao: ''
  })
  const [salvando, setSalvando] = useState(false)

  const basesOrigem = formData.contrato_origem_id 
    ? bases.filter(b => b.contrato_id === formData.contrato_origem_id)
    : bases

  const basesDestino = formData.contrato_destino_id
    ? bases.filter(b => b.contrato_id === formData.contrato_destino_id)
    : bases

  const itensDisponiveis = formData.base_origem_id
    ? itensEstoque.filter(i => i.base_id === formData.base_origem_id)
    : []

  const handleSalvar = async () => {
    if (!formData.item_estoque_id || !formData.base_origem_id || 
        !formData.base_destino_id || !formData.motivo) {
      notify('Preencha todos os campos obrigatórios', 'error')
      return
    }

    if (formData.base_origem_id === formData.base_destino_id) {
      notify('Base de origem e destino devem ser diferentes', 'error')
      return
    }

    const itemSelecionado = itensDisponiveis.find(i => i.id === formData.item_estoque_id)
    if (!itemSelecionado) {
      notify('Item selecionado não encontrado', 'error')
      return
    }

    const estoqueAtual = itemSelecionado.estoque_atual || 0
    if (estoqueAtual <= 0) {
      notify(`Este item não possui estoque disponível. Estoque atual: ${estoqueAtual}`, 'error')
      return
    }

    if (formData.quantidade > estoqueAtual) {
      notify(`Quantidade solicitada (${formData.quantidade}) é maior que o estoque disponível (${estoqueAtual})`, 'error')
      return
    }

    setSalvando(true)
    try {
      const numeroTransferencia = await transferenciasService.criarTransferencia(formData, userId)
      notify(`Transferência criada - Documento: ${numeroTransferencia}`, 'success')
      onSave()
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      notify(`Erro ao criar transferência: ${errorMessage}`, 'error')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Nova Transferência Entre Bases</h2>
              <p className="text-sm text-gray-600 mt-1">Solicite a transferência de um item entre bases</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="border rounded-lg p-4 space-y-4">
            <h3 className="font-semibold flex items-center gap-2 text-gray-900">
              <Package className="w-4 h-4" />
              Origem
            </h3>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Contrato de Origem</label>
              <select
                value={formData.contrato_origem_id}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  contrato_origem_id: e.target.value,
                  base_origem_id: ''
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Selecione...</option>
                {contratos.map(contrato => (
                  <option key={contrato.id} value={contrato.id}>
                    {contrato.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Base de Origem *</label>
              <select
                value={formData.base_origem_id}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  base_origem_id: e.target.value,
                  item_estoque_id: ''
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Selecione...</option>
                {basesOrigem.map(base => (
                  <option key={base.id} value={base.id}>
                    {base.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="border rounded-lg p-4 space-y-4">
            <h3 className="font-semibold flex items-center gap-2 text-gray-900">
              <TruckIcon className="w-4 h-4" />
              Destino
            </h3>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Contrato de Destino</label>
              <select
                value={formData.contrato_destino_id}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  contrato_destino_id: e.target.value,
                  base_destino_id: ''
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Selecione...</option>
                {contratos.map(contrato => (
                  <option key={contrato.id} value={contrato.id}>
                    {contrato.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Base de Destino *</label>
              <select
                value={formData.base_destino_id}
                onChange={(e) => setFormData({ ...formData, base_destino_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Selecione...</option>
                {basesDestino.map(base => (
                  <option key={base.id} value={base.id}>
                    {base.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Item do Estoque *</label>
            <select
              value={formData.item_estoque_id}
              onChange={(e) => setFormData({ ...formData, item_estoque_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={!formData.base_origem_id}
            >
              <option value="">Selecione...</option>
              {itensDisponiveis.map(item => {
                const estoqueAtual = item.estoque_atual || 0
                const temEstoque = estoqueAtual > 0
                return (
                  <option key={item.id} value={item.id} disabled={!temEstoque}>
                    {item.nome} ({item.codigo}) - Estoque: {estoqueAtual}
                  </option>
                )
              })}
            </select>
            {!formData.base_origem_id && (
              <p className="text-xs text-gray-500">Selecione a base de origem primeiro</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Quantidade *</label>
            <input
              type="number"
              min={1}
              value={formData.quantidade}
              onChange={(e) => setFormData({ ...formData, quantidade: parseFloat(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="border-t pt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Prioridade *</label>
                <select
                  value={formData.prioridade}
                  onChange={(e) => setFormData({ ...formData, prioridade: e.target.value as PrioridadeTransferencia })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="baixa">Baixa</option>
                  <option value="normal">Normal</option>
                  <option value="alta">Alta</option>
                  <option value="urgente">Urgente</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Previsão de Chegada</label>
                <input
                  type="date"
                  value={formData.previsao_chegada}
                  onChange={(e) => setFormData({ ...formData, previsao_chegada: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Motivo *</label>
              <textarea
                value={formData.motivo}
                onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
                placeholder="Descreva o motivo da transferência"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Observações</label>
              <textarea
                value={formData.observacoes_solicitacao}
                onChange={(e) => setFormData({ ...formData, observacoes_solicitacao: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSalvar}
            disabled={salvando}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {salvando && <Loader2 className="w-4 h-4 animate-spin" />}
            Criar Transferência
          </button>
        </div>
      </div>
    </div>
  )
}

interface ModalEnviarTransferenciaProps {
  onClose: () => void
  transferencia: TransferenciaBaseView
  onSave: () => void
  notify: (message: string, type: 'success' | 'error' | 'info') => void
  userId: string
}

function ModalEnviarTransferencia({ onClose, transferencia, onSave, notify, userId }: ModalEnviarTransferenciaProps) {
  const [formData, setFormData] = useState<EnviarTransferenciaDTO>({
    transferencia_id: transferencia.id,
    tipo_transporte: '',
    documento_transporte: '',
    custo_transporte: 0,
    condicao_envio: 'bom',
    observacoes_envio: ''
  })
  const [salvando, setSalvando] = useState(false)

  const handleSalvar = async () => {
    setSalvando(true)
    try {
      await transferenciasService.enviarTransferencia(formData, userId)
      notify('Transferência enviada com sucesso', 'success')
      onSave()
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      notify(`Erro ao enviar: ${errorMessage}`, 'error')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Enviar Transferência</h2>
              <p className="text-sm text-gray-600 mt-1">
                Registre o envio da transferência {transferencia.numero_transferencia}
              </p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-1">
            <div className="font-semibold text-gray-900">{transferencia.numero_transferencia}</div>
            <div className="text-sm text-gray-900">
              <span className="font-medium">{transferencia.item_nome}</span> ({transferencia.item_codigo})
            </div>
            <div className="text-sm text-gray-600">
              {transferencia.quantidade} {transferencia.unidade_medida}
            </div>
            <div className="text-sm flex items-center gap-1 text-gray-900">
              <span>{transferencia.base_origem_nome}</span>
              <ArrowLeftRight className="w-3 h-3" />
              <span>{transferencia.base_destino_nome}</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Tipo de Transporte</label>
            <input
              type="text"
              value={formData.tipo_transporte}
              onChange={(e) => setFormData({ ...formData, tipo_transporte: e.target.value })}
              placeholder="Ex: Transportadora XYZ, Veículo próprio"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Documento de Transporte</label>
            <input
              type="text"
              value={formData.documento_transporte}
              onChange={(e) => setFormData({ ...formData, documento_transporte: e.target.value })}
              placeholder="Código de rastreio, NF, etc."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Custo do Transporte (R$)</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={formData.custo_transporte}
              onChange={(e) => setFormData({ ...formData, custo_transporte: parseFloat(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Condição do Item</label>
            <select
              value={formData.condicao_envio}
              onChange={(e) => setFormData({ ...formData, condicao_envio: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="novo">Novo</option>
              <option value="bom">Bom estado</option>
              <option value="regular">Estado regular</option>
              <option value="ruim">Estado ruim</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Observações</label>
            <textarea
              value={formData.observacoes_envio}
              onChange={(e) => setFormData({ ...formData, observacoes_envio: e.target.value })}
              placeholder="Informações adicionais sobre o envio"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSalvar}
            disabled={salvando}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {salvando && <Loader2 className="w-4 h-4 animate-spin" />}
            <Send className="w-4 h-4" />
            Confirmar Envio
          </button>
        </div>
      </div>
    </div>
  )
}

interface ModalReceberTransferenciaProps {
  onClose: () => void
  transferencia: TransferenciaBaseView
  onSave: () => void
  notify: (message: string, type: 'success' | 'error' | 'info') => void
  userId: string
}

function ModalReceberTransferencia({ onClose, transferencia, onSave, notify, userId }: ModalReceberTransferenciaProps) {
  const [formData, setFormData] = useState<ReceberTransferenciaDTO>({
    transferencia_id: transferencia.id,
    condicao_recebimento: 'bom',
    observacoes_recebimento: ''
  })
  const [salvando, setSalvando] = useState(false)

  const handleSalvar = async () => {
    setSalvando(true)
    try {
      await transferenciasService.receberTransferencia(formData, userId)
      notify('Transferência recebida e concluída com sucesso', 'success')
      onSave()
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      notify(`Erro ao receber: ${errorMessage}`, 'error')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Receber Transferência</h2>
              <p className="text-sm text-gray-600 mt-1">
                Confirme o recebimento da transferência {transferencia.numero_transferencia}
              </p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-1">
            <div className="font-semibold text-gray-900">{transferencia.numero_transferencia}</div>
            <div className="text-sm text-gray-900">
              <span className="font-medium">{transferencia.item_nome}</span> ({transferencia.item_codigo})
            </div>
            <div className="text-sm text-gray-600">
              Quantidade: {transferencia.quantidade} {transferencia.unidade_medida}
            </div>
            <div className="text-sm flex items-center gap-1 text-gray-900">
              <span>De: {transferencia.base_origem_nome}</span>
              <ArrowLeftRight className="w-3 h-3" />
              <span>Para: {transferencia.base_destino_nome}</span>
            </div>
            {transferencia.enviado_por_nome && (
              <div className="text-sm text-gray-600">
                Enviado por: {transferencia.enviado_por_nome}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Condição do Item Recebido *</label>
            <select
              value={formData.condicao_recebimento}
              onChange={(e) => setFormData({ ...formData, condicao_recebimento: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="novo">Novo</option>
              <option value="bom">Bom estado</option>
              <option value="regular">Estado regular</option>
              <option value="ruim">Estado ruim</option>
              <option value="danificado">Danificado</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Data do Recebimento</label>
            <input
              type="date"
              value={formData.data_recebimento || new Date().toISOString().split('T')[0]}
              onChange={(e) => setFormData({ ...formData, data_recebimento: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Observações</label>
            <textarea
              value={formData.observacoes_recebimento}
              onChange={(e) => setFormData({ ...formData, observacoes_recebimento: e.target.value })}
              placeholder="Descreva o estado do item e outras observações"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSalvar}
            disabled={salvando}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {salvando && <Loader2 className="w-4 h-4 animate-spin" />}
            <CheckCircle className="w-4 h-4" />
            Confirmar Recebimento
          </button>
        </div>
      </div>
    </div>
  )
}
