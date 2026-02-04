import { CheckCircle } from 'lucide-react';
import { SolicitacaoItem } from '../types';

interface SolicitacaoCardProps {
    item: SolicitacaoItem;
    activeStatus: string;
    canDeliver: boolean;
    selectedSolicitacao?: SolicitacaoItem | null;
    isDelivering?: boolean;
    onEntregar: (item: SolicitacaoItem) => void;
    onValidar?: () => void;
}

export function SolicitacaoCard({
    item,
    activeStatus,
    canDeliver,
    selectedSolicitacao,
    isDelivering,
    onEntregar: _onEntregar,
    onValidar
}: SolicitacaoCardProps) {
    // Detect if this is a team request (equipe)
    // Detect if this is a team request (equipe)
    const isTeamRequest = !!item.destinatario_equipe;

    return (
        <div className="bg-white rounded-xl border border-gray-100 hover:shadow-lg transition-all overflow-hidden">
            {/* Colored Header Bar - Color based on STATUS */}
            <div className={`p-3 ${item.status === 'aprovada' ? 'bg-gradient-to-r from-green-500 to-green-600' :
                item.status === 'pendente' ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' :
                    item.status === 'entregue' ? 'bg-gradient-to-r from-purple-500 to-purple-600' :
                        item.status === 'rejeitada' ? 'bg-gradient-to-r from-red-500 to-red-600' :
                            item.status === 'aguardando_estoque' ? 'bg-gradient-to-r from-orange-500 to-orange-600' :
                                'bg-gradient-to-r from-gray-500 to-gray-600'
                } text-white`}>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {/* Team-specific header */}
                    {isTeamRequest ? (
                        <>
                            {/* Equipe */}
                            <div>
                                <div className="text-[10px] font-bold uppercase tracking-wider opacity-90 mb-1">EQUIPE</div>
                                <div className="bg-orange-500 text-white font-bold text-xs px-2 py-1.5 rounded-md shadow-md border-2 border-orange-600">
                                    🔧 {item.destinatario_equipe?.nome || 'N/A'}
                                </div>
                            </div>

                            {/* Responsável */}
                            <div>
                                <div className="text-[10px] font-bold uppercase tracking-wider opacity-90 mb-1">RESPONSÁVEL</div>
                                <div className="bg-blue-500 text-white font-bold text-xs px-2 py-1.5 rounded-md shadow-md border-2 border-blue-600 truncate">
                                    👨‍💼 {item.responsavel_equipe?.nome || 'N/A'}
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Destinatário */}
                            <div>
                                <div className="text-[10px] font-bold uppercase tracking-wider opacity-90 mb-1">DESTINATÁRIO</div>
                                <div className="bg-blue-800 text-white font-bold text-xs px-2 py-1.5 rounded-md shadow-md border-2 border-blue-900 truncate">
                                    � {item.destinatario?.nome || 'N/A'}
                                </div>
                            </div>

                            {/* Número da Solicitação */}
                            {item.numero_solicitacao && (
                                <div>
                                    <div className="text-[10px] font-bold uppercase tracking-wider opacity-90 mb-1">NÚMERO</div>
                                    <div className="bg-white text-gray-900 font-bold text-xs px-2 py-1.5 rounded-md shadow-md border-2 border-gray-300">
                                        📋 {item.numero_solicitacao}
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* Base de Entrega */}
                    <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider opacity-90 mb-1">BASE DE ENTREGA</div>
                        <div className="bg-red-500 text-white font-bold text-xs px-2 py-1.5 rounded-md shadow-md border-2 border-red-600 truncate">
                            🏢 {item.base?.nome}
                        </div>
                    </div>

                    {/* Status */}
                    <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider opacity-90 mb-1">STATUS</div>
                        <div className={`text-white font-bold text-xs px-2 py-1.5 rounded-md shadow-md border-2 truncate ${item.status === 'aprovada' ? 'bg-green-500 border-green-600' :
                            item.status === 'pendente' ? 'bg-yellow-500 border-yellow-600' :
                                item.status === 'entregue' ? 'bg-purple-500 border-purple-600' :
                                    item.status === 'rejeitada' ? 'bg-red-500 border-red-600' :
                                        item.status === 'aguardando_estoque' ? 'bg-orange-500 border-orange-600' :
                                            'bg-gray-500 border-gray-600'
                            }`}>
                            {item.status === 'aprovada' ? '✅ APROVADA' :
                                item.status === 'pendente' ? '⏳ PENDENTE' :
                                    item.status === 'entregue' ? '📦 ENTREGUE' :
                                        item.status === 'rejeitada' ? '❌ REJEITADA' :
                                            item.status === 'aguardando_estoque' ? '⏰ AGUARDANDO' :
                                                item.status.toUpperCase()}
                        </div>
                    </div>
                </div>
            </div>

            {/* Card Content - EXACTLY like web */}
            <div className="px-4 pt-0 pb-4">
                {/* SOLICITANTE, TIPO E MOTIVO NA MESMA LINHA */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                    {/* SOLICITANTE */}
                    <div>
                        <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">SOLICITANTE</div>
                        <div className="bg-purple-500 text-white font-bold text-sm px-3 py-1.5 rounded-lg shadow-lg border-2 border-purple-600 transform hover:scale-105 transition-all duration-200">
                            <div className="flex items-center justify-center gap-1">
                                <span>📝</span>
                                <span className="truncate">{item.solicitante?.nome || 'Solicitante não informado'}</span>
                            </div>
                        </div>
                    </div>

                    {/* TIPO */}
                    <div className="bg-gray-50 p-3 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs">📋</span>
                            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">TIPO</span>
                        </div>
                        <div className={`text-sm font-medium ${item.tipo_troca === 'fornecimento' ? 'text-green-600' :
                            item.tipo_troca === 'troca' ? 'text-blue-600' :
                                'text-red-600'
                            }`}>
                            {item.tipo_troca === 'fornecimento' ? 'Fornecimento' :
                                item.tipo_troca === 'troca' ? 'Troca' :
                                    'Desconto'}
                        </div>
                    </div>

                    {/* MOTIVO */}
                    <div className="bg-gray-50 p-3 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs">📝</span>
                            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">MOTIVO</span>
                        </div>
                        <div className="text-sm text-gray-700 line-clamp-2">{item.motivo_solicitacao}</div>
                    </div>
                </div>

                {/* LINHA PRINCIPAL - ITEM E QUANTIDADES NA MESMA LINHA */}
                <div className="flex flex-col md:flex-row md:items-start gap-3 mb-3">
                    {/* ITEM */}
                    <div className="flex-shrink-0 md:max-w-md">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs">📦</span>
                            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">ITEM</span>
                        </div>
                        <div className="text-base font-bold text-gray-900">{item.item?.nome || 'Item'}</div>
                        <div className="text-xs text-gray-600">
                            {item.item?.codigo && `Código: ${item.item.codigo}`}
                        </div>
                    </div>

                    {/* QUANTIDADES DESTACADAS - Only show if they exist */}
                    <div className="flex gap-3 flex-wrap md:flex-nowrap">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center min-w-[120px]">
                            <div className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-1">SOLICITADA</div>
                            <div className="text-lg font-bold text-blue-800">{item.quantidade_solicitada}</div>
                        </div>
                        {item.quantidade_aprovada && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center min-w-[120px]">
                                <div className="text-xs font-bold uppercase tracking-wider text-green-600 mb-1">APROVADA</div>
                                <div className="text-lg font-bold text-green-800">{item.quantidade_aprovada}</div>
                            </div>
                        )}
                        {item.quantidade_entregue && (
                            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-center min-w-[120px]">
                                <div className="text-xs font-bold uppercase tracking-wider text-purple-600 mb-1">ENTREGUE</div>
                                <div className="text-lg font-bold text-purple-800">{item.quantidade_entregue}</div>
                            </div>
                        )}
                    </div>
                </div>

                {/* STATUS DA DUPLA APROVAÇÃO - SEMPRE VISÍVEL */}
                <div className="mb-3 p-3 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                            <CheckCircle className="w-3 h-3 text-white" />
                        </div>
                        <span className="text-sm font-bold uppercase tracking-wider text-blue-700">
                            DUPLA APROVAÇÃO
                        </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        {/* Almoxarifado */}
                        <div className={`p-2 rounded-lg border ${item.aprovado_almoxarifado_por
                            ? 'bg-green-50 border-green-300'
                            : 'bg-gray-50 border-gray-300'
                            }`}>
                            <div className="flex items-center gap-2 mb-1">
                                <div className={`w-3 h-3 rounded-full ${item.aprovado_almoxarifado_por
                                    ? 'bg-green-500'
                                    : 'bg-gray-400'
                                    }`}></div>
                                <span className="text-xs font-bold text-gray-600">
                                    🏢 ALMOXARIFADO
                                </span>
                            </div>
                            <div className="text-sm font-semibold">
                                {item.aprovado_almoxarifado_por ? (
                                    <div className="text-green-700 flex items-center gap-1">
                                        <span className="font-bold">✓ APROVADO</span>
                                    </div>
                                ) : (
                                    <div className="text-gray-500 flex items-center gap-1">
                                        <span className="font-bold">○ PENDENTE</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* SESMT */}
                        <div className={`p-2 rounded-lg border ${item.status === 'rejeitada'
                            ? 'bg-red-50 border-red-300'
                            : item.aprovado_sesmt_por
                                ? 'bg-blue-50 border-blue-300'
                                : 'bg-gray-50 border-gray-300'
                            }`}>
                            <div className="flex items-center gap-2 mb-1">
                                <div className={`w-3 h-3 rounded-full ${item.status === 'rejeitada'
                                    ? 'bg-red-500'
                                    : item.aprovado_sesmt_por
                                        ? 'bg-blue-500'
                                        : 'bg-gray-400'
                                    }`}></div>
                                <span className="text-xs font-bold text-gray-600">
                                    🛡️ SESMT
                                </span>
                            </div>
                            <div className="text-sm font-semibold">
                                {item.status === 'rejeitada' ? (
                                    <div className="text-red-700 flex items-center gap-1">
                                        <span className="font-bold">○ REJEITADO</span>
                                    </div>
                                ) : item.aprovado_sesmt_por ? (
                                    <div className="text-blue-700 flex items-center gap-1">
                                        <span className="font-bold">✓ APROVADO</span>
                                    </div>
                                ) : (
                                    <div className="text-gray-500 flex items-center gap-1">
                                        <span className="font-bold">○ PENDENTE</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Status Geral - COMPACTO */}
                    {item.dupla_aprovacao_completa ? (
                        <div className="mt-2 p-2 bg-green-100 border border-green-300 rounded-lg">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-green-800">
                                    ✅ PRONTA PARA ENTREGA
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="mt-2 p-2 bg-yellow-100 border border-yellow-300 rounded-lg">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-yellow-800">
                                    ⚠️ AGUARDANDO APROVAÇÃO
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Observations */}
                {item.observacoes && (
                    <div className="bg-gray-50 p-2 rounded-md text-xs italic text-gray-600 border border-gray-200 mb-3">
                        "{item.observacoes}"
                    </div>
                )}

                {/* Date and Actions */}
                <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                    <div className="text-xs text-gray-500 italic">
                        Solicitação assinada digitalmente em {new Date(item.criado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })} às {new Date(item.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </div>

                    {(activeStatus === 'aprovada' || activeStatus === 'aguardando_estoque') && canDeliver && (
                        <div>
                            {selectedSolicitacao?.id === item.id ? (
                                <button
                                    onClick={() => onValidar && onValidar()}
                                    disabled={isDelivering}
                                    className="flex items-center justify-center gap-1.5 bg-green-500 text-white hover:bg-green-600 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shadow-md animate-pulse"
                                >
                                    <CheckCircle className="w-3.5 h-3.5" /> Validar
                                </button>
                            ) : null}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
