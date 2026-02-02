import { useState, useEffect, useCallback } from 'react'
import { emprestimosTerceirosService } from '../services/emprestimosTerceirosService'
import type {
  EmpresaTerceira,
  EmprestimoTerceiroAtivo,
  StatusEmprestimo
} from '../types/emprestimos-terceiros'
import {
  Building2,
  PackagePlus,
  ArrowLeftRight,
  Eye,
  Plus,
  AlertTriangle,
  Loader2,
  X
} from 'lucide-react'

export default function EmprestimosTerceirosPage() {
  const [loading, setLoading] = useState(true)
  const [empresas, setEmpresas] = useState<EmpresaTerceira[]>([])
  const [emprestimos, setEmprestimos] = useState<EmprestimoTerceiroAtivo[]>([])
  const [activeTab, setActiveTab] = useState<'emprestimos' | 'empresas'>('emprestimos')
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [detalhesOpen, setDetalhesOpen] = useState(false)
  const [emprestimoDetalhes, setEmprestimoDetalhes] = useState<EmprestimoTerceiroAtivo | null>(null)

  const notify = (message: string, type: 'success' | 'error' | 'info') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 5000)
  }

  const carregarDados = useCallback(async () => {
    setLoading(true)
    try {
      const [emp, emprest] = await Promise.all([
        emprestimosTerceirosService.getEmpresas(),
        emprestimosTerceirosService.getEmprestimos()
      ])
      setEmpresas(emp)
      setEmprestimos(emprest)
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

  const getStatusBadge = (status: StatusEmprestimo) => {
    const styles = {
      ativo: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-300', icon: '✓' },
      devolvido: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-300', icon: '↩' },
      baixado: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-300', icon: '📋' },
      perdido: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-300', icon: '⚠' },
      cancelado: { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-300', icon: '✕' }
    }
    
    const labels = {
      ativo: 'Ativo',
      devolvido: 'Devolvido',
      baixado: 'Baixado',
      perdido: 'Perdido',
      cancelado: 'Cancelado'
    }
    
    const style = styles[status]
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md border ${style.bg} ${style.text} ${style.border} text-xs font-semibold`}>
        <span>{style.icon}</span>
        {labels[status]}
      </span>
    )
  }

  const formatarData = (data: string) => {
    if (!data) return ''
    return new Date(data).toLocaleDateString('pt-BR')
  }

  const formatarCPF = (cpf?: string) => {
    if (!cpf) return ''
    const digits = cpf.replace(/\D/g, '')
    if (digits.length !== 11) return cpf
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }

  const abrirDetalhes = (emp: EmprestimoTerceiroAtivo) => {
    setEmprestimoDetalhes(emp)
    setDetalhesOpen(true)
  }

  const emprestimosAtivos = emprestimos.filter(e => e.status === 'ativo')
  const emprestimosEmAtraso = emprestimosAtivos.filter(e => e.em_atraso)

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
          <h1 className="text-3xl font-bold text-gray-900">Empréstimos para Empresas Terceiras</h1>
        </div>
        <p className="text-gray-600">
          Gerencie empréstimos e transferências de itens do almoxarifado para colaboradores de outras empresas
        </p>
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('emprestimos')}
          className={`flex items-center gap-2 px-4 py-2 font-medium transition-colors ${
            activeTab === 'emprestimos'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <PackagePlus className="w-4 h-4" />
          Empréstimos
        </button>
        <button
          onClick={() => setActiveTab('empresas')}
          className={`flex items-center gap-2 px-4 py-2 font-medium transition-colors ${
            activeTab === 'empresas'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Empresas
        </button>
      </div>

      {activeTab === 'emprestimos' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold text-gray-900">Empréstimos e Transferências</h2>
            <button
              onClick={() => notify('Funcionalidade em desenvolvimento', 'info')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Novo Empréstimo
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-sm font-medium text-green-600 mb-1">Ativos</div>
              <div className="text-2xl font-bold text-green-600">{emprestimosAtivos.length}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-sm font-medium text-red-600 mb-1">Em Atraso</div>
              <div className="text-2xl font-bold text-red-600">{emprestimosEmAtraso.length}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-sm font-medium text-gray-600 mb-1">Total</div>
              <div className="text-2xl font-bold text-gray-900">{emprestimos.length}</div>
            </div>
          </div>

          {emprestimosEmAtraso.length > 0 && (
            <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <span className="text-red-800 font-medium">
                Existem {emprestimosEmAtraso.length} empréstimo(s) em atraso!
              </span>
            </div>
          )}

          {emprestimos.length === 0 ? (
            <div className="bg-white p-10 rounded-lg shadow text-center text-gray-500">
              Nenhum empréstimo registrado
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Documento</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Empresa</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Item</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Qtd</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Data</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {emprestimos.map((emp) => (
                      <tr key={emp.id} className={emp.em_atraso ? 'bg-red-50' : ''}>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{emp.numero_documento}</div>
                          <div className="text-xs text-gray-500">
                            {emp.tipo_operacao === 'emprestimo' ? 'Empréstimo' : 'Transferência'}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-900">{emp.empresa_razao_social}</td>
                        <td className="px-4 py-3">
                          <div className="text-gray-900">{emp.item_nome}</div>
                          <div className="text-xs text-gray-500">{emp.item_codigo}</div>
                        </td>
                        <td className="px-4 py-3 text-gray-900">{emp.quantidade_pendente}</td>
                        <td className="px-4 py-3 text-gray-900">{formatarData(emp.data_emprestimo)}</td>
                        <td className="px-4 py-3">{getStatusBadge(emp.status)}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => abrirDetalhes(emp)}
                            className="p-2 text-gray-600 hover:bg-gray-50 rounded transition-colors"
                            title="Ver detalhes"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
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

      {activeTab === 'empresas' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold text-gray-900">Empresas Terceiras Cadastradas</h2>
            <button
              onClick={() => notify('Funcionalidade em desenvolvimento', 'info')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nova Empresa
            </button>
          </div>

          {empresas.length === 0 ? (
            <div className="bg-white p-10 rounded-lg shadow text-center text-gray-500">
              Nenhuma empresa cadastrada
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {empresas.map((empresa) => (
                <div key={empresa.id} className="bg-white p-6 rounded-lg shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{empresa.razao_social}</h3>
                      {empresa.nome_fantasia && (
                        <p className="text-sm text-gray-600">{empresa.nome_fantasia}</p>
                      )}
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      empresa.ativo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {empresa.ativo ? 'Ativa' : 'Inativa'}
                    </span>
                  </div>
                  {empresa.cnpj && (
                    <div className="text-sm text-gray-700">
                      <span className="font-medium">CNPJ:</span> {empresa.cnpj}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {detalhesOpen && emprestimoDetalhes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="text-xl font-semibold text-gray-900">Detalhes do Empréstimo</h3>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="text-sm text-gray-700 font-medium">{emprestimoDetalhes.numero_documento}</span>
                  {getStatusBadge(emprestimoDetalhes.status)}
                  <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                    {emprestimoDetalhes.tipo_operacao === 'emprestimo' ? 'Empréstimo' : 'Transferência'}
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  setDetalhesOpen(false)
                  setEmprestimoDetalhes(null)
                }}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="font-semibold text-gray-900 mb-2">Empresa</div>
                <div className="text-gray-800">{emprestimoDetalhes.empresa_razao_social}</div>
                {emprestimoDetalhes.empresa_cnpj && (
                  <div className="text-gray-600">CNPJ: {emprestimoDetalhes.empresa_cnpj}</div>
                )}
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="font-semibold text-gray-900 mb-2">Colaborador</div>
                <div className="text-gray-800">{emprestimoDetalhes.colaborador_nome}</div>
                <div className="text-gray-600">CPF: {formatarCPF(emprestimoDetalhes.colaborador_cpf)}</div>
                {emprestimoDetalhes.colaborador_telefone && (
                  <div className="text-gray-600">Tel: {emprestimoDetalhes.colaborador_telefone}</div>
                )}
                {emprestimoDetalhes.colaborador_funcao && (
                  <div className="text-gray-600">Função: {emprestimoDetalhes.colaborador_funcao}</div>
                )}
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="font-semibold text-gray-900 mb-2">Item</div>
                <div className="text-gray-800">{emprestimoDetalhes.item_nome}</div>
                <div className="text-gray-600">Código: {emprestimoDetalhes.item_codigo}</div>
                {emprestimoDetalhes.unidade_medida && (
                  <div className="text-gray-600">Unid: {emprestimoDetalhes.unidade_medida}</div>
                )}
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="font-semibold text-gray-900 mb-2">Quantidades</div>
                <div className="text-gray-800">Total: {emprestimoDetalhes.quantidade}</div>
                <div className="text-gray-600">Devolvida: {emprestimoDetalhes.quantidade_devolvida}</div>
                <div className="text-gray-600">Pendente: {emprestimoDetalhes.quantidade_pendente}</div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="font-semibold text-gray-900 mb-2">Datas</div>
                <div className="text-gray-600">Empréstimo: {formatarData(emprestimoDetalhes.data_emprestimo)}</div>
                {emprestimoDetalhes.data_previsao_devolucao && (
                  <div className="text-gray-600">Previsão: {formatarData(emprestimoDetalhes.data_previsao_devolucao)}</div>
                )}
                {emprestimoDetalhes.data_devolucao_real && (
                  <div className="text-gray-600">Devolução: {formatarData(emprestimoDetalhes.data_devolucao_real)}</div>
                )}
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="font-semibold text-gray-900 mb-2">Motivo</div>
                <div className="text-gray-700 whitespace-pre-wrap">{emprestimoDetalhes.motivo || '-'}</div>
                {emprestimoDetalhes.projeto_obra && (
                  <div className="text-gray-600 mt-2">Projeto/Obra: {emprestimoDetalhes.projeto_obra}</div>
                )}
                {emprestimoDetalhes.documento_referencia && (
                  <div className="text-gray-600">Doc. Referência: {emprestimoDetalhes.documento_referencia}</div>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => {
                  setDetalhesOpen(false)
                  setEmprestimoDetalhes(null)
                }}
                className="px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
