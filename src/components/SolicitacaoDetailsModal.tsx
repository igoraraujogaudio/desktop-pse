import { X, ArrowLeft, Package, CheckCircle } from 'lucide-react';
import { SolicitacaoItem } from '../types';

interface SolicitacaoDetailsModalProps {
    solicitacao: SolicitacaoItem;
    onClose: () => void;
    bases: Array<{ id: string; nome: string }>;
}

export function SolicitacaoDetailsModal({ solicitacao, onClose, bases }: SolicitacaoDetailsModalProps) {
    const formatDate = (dateString?: string | null) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const isTeamRequest = solicitacao.destinatario?.nome?.toLowerCase().includes('equipe');

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl max-w-[95vw] max-h-[95vh] overflow-auto w-full">
                {/* Header com botão fechar */}
                <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between z-10">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Voltar
                    </button>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* HEADER - Color based on status */}
                <div className={`p-6 ${solicitacao.status === 'aprovada' ? 'bg-gradient-to-r from-green-500 to-green-600' :
                        solicitacao.status === 'pendente' ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' :
                            solicitacao.status === 'entregue' ? 'bg-gradient-to-r from-purple-500 to-purple-600' :
                                solicitacao.status === 'rejeitada' ? 'bg-gradient-to-r from-red-500 to-red-600' :
                                    solicitacao.status === 'aguardando_estoque' ? 'bg-gradient-to-r from-orange-500 to-orange-600' :
                                        'bg-gradient-to-r from-gray-500 to-gray-600'
                    } text-white`}>
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        {/* Destinatário/Equipe */}
                        <div className="text-center">
                            {isTeamRequest ? (
                                <div className="flex gap-2">
                                    <div>
                                        <div className="text-xs font-bold uppercase tracking-wider opacity-90 mb-1">EQUIPE</div>
                                        <div className="bg-orange-500 text-white font-bold text-sm px-3 py-1.5 rounded-lg shadow-lg border-2 border-orange-600">
                                            <div className="flex items-center justify-center gap-1">
                                                <span>🏢</span>
                                                <span className="truncate">{solicitacao.destinatario?.nome?.split(' - ')[0]}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold uppercase tracking-wider opacity-90 mb-1">RESPONSÁVEL</div>
                                        <div className="bg-blue-500 text-white font-bold text-sm px-3 py-1.5 rounded-lg shadow-lg border-2 border-blue-600">
                                            <div className="flex items-center justify-center gap-1">
                                                <span>👨‍💼</span>
                                                <span className="truncate">{solicitacao.solicitante?.nome?.split(' ')[0]}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <div className="text-xs font-bold uppercase tracking-wider opacity-90 mb-1">DESTINATÁRIO</div>
                                    <div className="bg-blue-800 text-white font-bold text-sm px-3 py-1.5 rounded-lg shadow-lg border-2 border-blue-900">
                                        <div className="flex items-center justify-center gap-1">
                                            <span>👤</span>
                                            <span className="truncate">{solicitacao.destinatario?.nome || 'Destinatário não informado'}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Número e Base */}
                        <div className="text-center">
                            <div className="flex items-center gap-3 justify-center">
                                {solicitacao.numero_solicitacao && (
                                    <div>
                                        <div className="text-xs font-bold uppercase tracking-wider opacity-90 mb-1">NÚMERO</div>
                                        <div className="bg-white text-gray-900 font-bold text-sm px-3 py-1.5 rounded-lg shadow-lg border-2 border-gray-300">
                                            📋 {solicitacao.numero_solicitacao}
                                        </div>
                                    </div>
                                )}
                                <div>
                                    <div className="text-xs font-bold uppercase tracking-wider opacity-90 mb-1">BASE</div>
                                    <div className="bg-red-500 text-white font-bold text-sm px-3 py-1.5 rounded-lg shadow-lg border-2 border-red-600">
                                        🏢 {solicitacao.base?.nome || bases.find(b => b.id === solicitacao.base_id)?.nome || 'N/A'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Status */}
                        <div className="text-center">
                            <div className="text-xs font-bold uppercase tracking-wider opacity-90 mb-1">STATUS</div>
                            <div className={`text-white font-bold text-sm px-3 py-1.5 rounded-lg shadow-lg border-2 ${solicitacao.status === 'aprovada' ? 'bg-green-500 border-green-600' :
                                    solicitacao.status === 'pendente' ? 'bg-yellow-500 border-yellow-600' :
                                        solicitacao.status === 'entregue' ? 'bg-purple-500 border-purple-600' :
                                            solicitacao.status === 'rejeitada' ? 'bg-red-500 border-red-600' :
                                                solicitacao.status === 'aguardando_estoque' ? 'bg-orange-500 border-orange-600' :
                                                    'bg-gray-500 border-gray-600'
                                }`}>
                                {solicitacao.status === 'aprovada' ? '✅' :
                                    solicitacao.status === 'pendente' ? '⏳' :
                                        solicitacao.status === 'entregue' ? '📦' :
                                            solicitacao.status === 'rejeitada' ? '❌' :
                                                solicitacao.status === 'aguardando_estoque' ? '⏰' :
                                                    '❓'} {solicitacao.status.toUpperCase()}
                            </div>
                        </div>
                    </div>
                </div>

                {/* CONTEÚDO */}
                <div className="p-6 space-y-6">
                    {/* Informações Básicas */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Solicitante */}
                        <div>
                            <div className="flex items-center gap-2 font-semibold text-gray-900 mb-2">
                                <span className="text-gray-400">👤</span>
                                Solicitante
                            </div>
                            <div className="text-gray-700 font-medium">
                                {solicitacao.solicitante?.nome || 'Não informado'}
                            </div>
                        </div>

                        {/* Item */}
                        <div>
                            <div className="flex items-center gap-2 font-semibold text-gray-900 mb-2">
                                <Package className="w-4 h-4 text-gray-400" />
                                Item
                            </div>
                            <div className="text-gray-900 font-bold">{solicitacao.item?.nome || 'Item'}</div>
                            <div className="text-sm text-gray-600">Código: {solicitacao.item?.codigo}</div>
                        </div>
                    </div>

                    {/* Quantidades */}
                    <div>
                        <div className="font-semibold text-gray-900 mb-3">Quantidades</div>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                                <div className="text-xs font-bold uppercase text-blue-600 mb-1">SOLICITADA</div>
                                <div className="text-2xl font-bold text-blue-800">{solicitacao.quantidade_solicitada}</div>
                            </div>
                            {solicitacao.quantidade_aprovada && (
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                                    <div className="text-xs font-bold uppercase text-green-600 mb-1">APROVADA</div>
                                    <div className="text-2xl font-bold text-green-800">{solicitacao.quantidade_aprovada}</div>
                                </div>
                            )}
                            {solicitacao.quantidade_entregue && (
                                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
                                    <div className="text-xs font-bold uppercase text-purple-600 mb-1">ENTREGUE</div>
                                    <div className="text-2xl font-bold text-purple-800">{solicitacao.quantidade_entregue}</div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Dupla Aprovação */}
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <CheckCircle className="w-5 h-5 text-blue-600" />
                            <span className="font-bold uppercase text-blue-700">DUPLA APROVAÇÃO</span>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            {/* Almoxarifado */}
                            <div className={`p-3 rounded-lg border ${solicitacao.aprovado_almoxarifado_por
                                    ? 'bg-green-50 border-green-300'
                                    : 'bg-gray-50 border-gray-300'
                                }`}>
                                <div className="flex items-center gap-2 mb-1">
                                    <div className={`w-3 h-3 rounded-full ${solicitacao.aprovado_almoxarifado_por ? 'bg-green-500' : 'bg-gray-400'
                                        }`}></div>
                                    <span className="text-xs font-bold text-gray-600">🏢 ALMOXARIFADO</span>
                                </div>
                                <div className={`text-sm font-bold ${solicitacao.aprovado_almoxarifado_por ? 'text-green-700' : 'text-gray-500'
                                    }`}>
                                    {solicitacao.aprovado_almoxarifado_por ? '✓ APROVADO' : '○ PENDENTE'}
                                </div>
                            </div>

                            {/* SESMT */}
                            <div className={`p-3 rounded-lg border ${solicitacao.status === 'rejeitada'
                                    ? 'bg-red-50 border-red-300'
                                    : solicitacao.aprovado_sesmt_por
                                        ? 'bg-blue-50 border-blue-300'
                                        : 'bg-gray-50 border-gray-300'
                                }`}>
                                <div className="flex items-center gap-2 mb-1">
                                    <div className={`w-3 h-3 rounded-full ${solicitacao.status === 'rejeitada' ? 'bg-red-500' :
                                            solicitacao.aprovado_sesmt_por ? 'bg-blue-500' : 'bg-gray-400'
                                        }`}></div>
                                    <span className="text-xs font-bold text-gray-600">🛡️ SESMT</span>
                                </div>
                                <div className={`text-sm font-bold ${solicitacao.status === 'rejeitada' ? 'text-red-700' :
                                        solicitacao.aprovado_sesmt_por ? 'text-blue-700' : 'text-gray-500'
                                    }`}>
                                    {solicitacao.status === 'rejeitada' ? '○ REJEITADO' :
                                        solicitacao.aprovado_sesmt_por ? '✓ APROVADO' : '○ PENDENTE'}
                                </div>
                            </div>
                        </div>

                        {/* Status Geral */}
                        {solicitacao.dupla_aprovacao_completa ? (
                            <div className="mt-3 p-2 bg-green-100 border border-green-300 rounded-lg">
                                <span className="text-sm font-bold text-green-800">✅ PRONTA PARA ENTREGA</span>
                            </div>
                        ) : (
                            <div className="mt-3 p-2 bg-yellow-100 border border-yellow-300 rounded-lg">
                                <span className="text-sm font-bold text-yellow-800">⚠️ AGUARDANDO APROVAÇÃO</span>
                            </div>
                        )}
                    </div>

                    {/* Tipo e Motivo */}
                    <div className="grid grid-cols-2 gap-4">
                        {solicitacao.tipo_troca && (
                            <div>
                                <div className="font-semibold text-gray-900 mb-1">📋 Tipo</div>
                                <div className={`text-sm font-medium ${solicitacao.tipo_troca === 'fornecimento' ? 'text-green-600' :
                                        solicitacao.tipo_troca === 'troca' ? 'text-blue-600' :
                                            'text-red-600'
                                    }`}>
                                    {solicitacao.tipo_troca === 'fornecimento' ? 'Fornecimento' :
                                        solicitacao.tipo_troca === 'troca' ? 'Troca' :
                                            'Desconto'}
                                </div>
                            </div>
                        )}
                        {solicitacao.motivo_solicitacao && (
                            <div>
                                <div className="font-semibold text-gray-900 mb-1">📝 Motivo</div>
                                <div className="text-sm text-gray-700">{solicitacao.motivo_solicitacao}</div>
                            </div>
                        )}
                    </div>

                    {/* Observações */}
                    {solicitacao.observacoes && (
                        <div>
                            <div className="font-semibold text-gray-900 mb-2">Observações</div>
                            <div className="bg-gray-50 p-3 rounded-lg text-sm italic text-gray-600 border border-gray-200">
                                "{solicitacao.observacoes}"
                            </div>
                        </div>
                    )}

                    {/* Data */}
                    <div className="text-sm text-gray-500 italic border-t border-gray-200 pt-4">
                        Solicitação assinada digitalmente em {formatDate(solicitacao.criado_em)}
                    </div>
                </div>
            </div>
        </div>
    );
}
