import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Package, CheckCircle, Truck, XCircle, RotateCcw, ArrowRightLeft } from 'lucide-react';
import { SolicitacaoItem } from '../types';
import { Base } from '../types/contratos';
import { SignatureRenderer } from '../components/SignatureRenderer';
import { estoqueService } from '../services/estoqueService';

interface SolicitacaoDetailsPageProps {
    solicitacao: SolicitacaoItem;
    bases: Base[];
    onBack: () => void;
    onEntregar: (solicitacao: SolicitacaoItem) => void;
    onValidar?: () => void;
    onAprovar?: (solicitacao: SolicitacaoItem) => void;
    onRejeitar?: (solicitacao: SolicitacaoItem) => void;
    onDevolver?: (solicitacao: SolicitacaoItem) => void;
    onTrocar?: (solicitacao: SolicitacaoItem) => void;
    canDeliver: boolean;
    isDelivering?: boolean;
}

export function SolicitacaoDetailsPage({
    solicitacao,
    bases,
    onBack,
    onEntregar,
    onValidar,
    onAprovar,
    onRejeitar,
    onDevolver,
    onTrocar,
    canDeliver,
    isDelivering
}: SolicitacaoDetailsPageProps) {
    const [inventarioItems, setInventarioItems] = useState<any[]>([]);
    const [loadingInventario, setLoadingInventario] = useState(false);
    const [inventarioModalOpen, setInventarioModalOpen] = useState(false);

    // Fetch inventory data
    useEffect(() => {
        const loadInventario = async () => {
            setLoadingInventario(true);
            try {
                let items = [];
                if (solicitacao.destinatario_equipe?.id) {
                    items = await estoqueService.getInventarioByEquipe(solicitacao.destinatario_equipe.id);
                } else if (solicitacao.destinatario_id) {
                    items = await estoqueService.getInventarioByFuncionario(solicitacao.destinatario_id);
                } else if (solicitacao.destinatario?.id) {
                    items = await estoqueService.getInventarioByFuncionario(solicitacao.destinatario.id);
                }
                setInventarioItems(items || []);
            } catch (error) {
                console.error("Erro ao carregar inventário:", error);
            } finally {
                setLoadingInventario(false);
            }
        };

        loadInventario();
    }, [solicitacao]);

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

    const getTimelineSteps = () => {
        if (!solicitacao) return [];

        const steps = [
            { label: 'Solicitada', key: 'pendente', date: solicitacao.criado_em, completed: true },
            { label: 'Aprovada Almoxarifado', key: 'aprovada_almox', date: solicitacao.aprovado_almoxarifado_em, completed: !!solicitacao.aprovado_almoxarifado_em },
            { label: 'Aprovada SESMT', key: 'aprovada_sesmt', date: solicitacao.aprovado_sesmt_em, completed: !!solicitacao.aprovado_sesmt_em },
            { label: 'Entregue', key: 'entregue', date: solicitacao.entregue_em, completed: !!solicitacao.entregue_em },
        ];

        if (solicitacao.status === 'rejeitada') {
            steps.push({ label: 'Rejeitada', key: 'rejeitada', date: solicitacao.atualizado_em, completed: true });
        }

        return steps.filter(s => s.date || s.completed);
    };

    const timelineSteps = getTimelineSteps();
    const currentStatus = solicitacao.status;
    const currentIdx = timelineSteps.findIndex(s => s.key === currentStatus || (currentStatus === 'aprovada' && s.key === 'aprovada_sesmt'));
    const isTeamRequest = !!solicitacao.destinatario_equipe;

    const categoryStats = useMemo(() => {
        const stats: Record<string, number> = {};
        inventarioItems.forEach(item => {
            const cat = item.item_estoque?.categoria || 'Outros';
            stats[cat] = (stats[cat] || 0) + (item.quantidade || 1);
        });

        return Object.entries(stats)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3);
    }, [inventarioItems]);

    return (
        <div className="container mx-auto p-6 max-w-7xl animate-in fade-in duration-500">
            {/* Actions Bar */}
            <div className="mb-6 flex items-center justify-between">
                <button
                    onClick={onBack}
                    className="group px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 hover:text-gray-900 transition-all shadow-sm hover:shadow-md flex items-center gap-2 font-medium"
                >
                    <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                    Voltar para Solicitações
                </button>

            </div>

            {/* HEADER - Color based on status */}
            <div className={`p-8 rounded-t-2xl shadow-xl relative overflow-hidden ${solicitacao.status === 'aprovada' ? 'bg-gradient-to-br from-green-600 to-green-700' :
                solicitacao.status === 'pendente' ? 'bg-gradient-to-br from-yellow-500 to-yellow-600' :
                    solicitacao.status === 'entregue' ? 'bg-gradient-to-br from-purple-600 to-indigo-700' :
                        solicitacao.status === 'rejeitada' ? 'bg-gradient-to-br from-red-600 to-red-700' :
                            solicitacao.status === 'aguardando_estoque' ? 'bg-gradient-to-br from-orange-500 to-orange-600' :
                                'bg-gradient-to-br from-gray-600 to-gray-700'
                } text-white`}>

                {/* Background Pattern */}
                <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                    <Package className="w-64 h-64" />
                </div>

                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                    {/* Destinatário/Equipe */}
                    <div className="text-center md:text-left flex-1">
                        {isTeamRequest ? (
                            <div className="flex flex-wrap justify-center md:justify-start gap-3">
                                <div>
                                    <div className="text-[10px] font-bold uppercase tracking-wider opacity-80 mb-1.5 ml-1">EQUIPE</div>
                                    <div className="bg-white/20 backdrop-blur-md text-white font-bold text-sm px-4 py-2 rounded-xl border border-white/30 shadow-inner">
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg">🏢</span>
                                            <span className="whitespace-normal">{solicitacao.destinatario_equipe?.nome}</span>
                                        </div>
                                    </div>
                                </div>
                                {solicitacao.responsavel_equipe && (
                                    <div>
                                        <div className="text-[10px] font-bold uppercase tracking-wider opacity-80 mb-1.5 ml-1">RESPONSÁVEL</div>
                                        <div className="bg-white/20 backdrop-blur-md text-white font-bold text-sm px-4 py-2 rounded-xl border border-white/30 shadow-inner">
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg">👨‍💼</span>
                                                <span className="whitespace-normal">{solicitacao.responsavel_equipe.nome}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div>
                                <div className="text-[10px] font-bold uppercase tracking-wider opacity-80 mb-1.5 ml-1">DESTINATÁRIO</div>
                                <div className="bg-white/20 backdrop-blur-md text-white font-bold text-lg px-6 py-3 rounded-xl border border-white/30 shadow-lg inline-block max-w-full">
                                    <div className="flex items-center gap-3">
                                        <div className="p-1.5 bg-white/20 rounded-full">
                                            <span className="text-xl">👤</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="whitespace-normal break-words leading-tight">{solicitacao.destinatario?.nome || 'Destinatário não informado'}</span>
                                            {solicitacao.destinatario?.matricula && (
                                                <span className="text-xs opacity-75 font-normal mt-0.5">
                                                    Matrícula: {solicitacao.destinatario.matricula}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Número e Base */}
                    <div className="flex flex-wrap justify-center gap-4">
                        {solicitacao.numero_solicitacao && (
                            <div className="text-center">
                                <div className="text-[10px] font-bold uppercase tracking-wider opacity-80 mb-1.5">NÚMERO</div>
                                <div className="bg-white text-gray-900 font-bold text-sm px-4 py-2 rounded-xl shadow-lg border-2 border-white/50">
                                    📋 {solicitacao.numero_solicitacao}
                                </div>
                            </div>
                        )}
                        <div className="text-center">
                            <div className="text-[10px] font-bold uppercase tracking-wider opacity-80 mb-1.5">BASE DE ENTREGA</div>
                            <div className="bg-white/20 backdrop-blur-md text-white font-bold text-sm px-4 py-2 rounded-xl border border-white/30 shadow-inner min-w-[140px]">
                                🏢 {solicitacao.base?.nome || bases.find(b => b.id === solicitacao.base_id)?.nome || 'N/A'}
                            </div>
                        </div>
                    </div>

                    {/* Status */}
                    <div className="text-center min-w-[120px]">
                        <div className="text-[10px] font-bold uppercase tracking-wider opacity-80 mb-1.5">STATUS ATUAL</div>
                        <div className={`font-bold text-sm px-4 py-2 rounded-xl shadow-lg border-2 border-white/30 backdrop-blur-md bg-white/20`}>
                            <div className="flex items-center justify-center gap-2">
                                <span className="text-lg">
                                    {solicitacao.status === 'aprovada' ? '✅' :
                                        solicitacao.status === 'pendente' ? '⏳' :
                                            solicitacao.status === 'entregue' ? '📦' :
                                                solicitacao.status === 'rejeitada' ? '❌' :
                                                    solicitacao.status === 'aguardando_estoque' ? '⏰' : '❓'}
                                </span>
                                <span>{solicitacao.status.toUpperCase()}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* CONTEÚDO */}
            <div className="bg-white rounded-b-2xl shadow-xl border border-gray-100 p-8 -mt-2 relative z-20">
                {/* Layout em grid de 4 colunas */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                    {/* Coluna 1 - Informações Básicas (3 cols) */}
                    <div className="md:col-span-4 space-y-8">
                        {/* Solicitante */}
                        <div className="group">
                            <div className="flex items-center gap-2 font-bold text-gray-900 mb-3 text-sm uppercase tracking-wide">
                                <span className="text-gray-400 group-hover:text-blue-600 transition-colors">👤</span>
                                Solicitante
                            </div>
                            <div className="pl-6 border-l-2 border-gray-100 group-hover:border-blue-500 transition-colors">
                                <div className="text-gray-900 font-semibold text-lg leading-tight mb-1">
                                    {solicitacao.solicitante?.nome || 'Não informado'}
                                </div>
                                {solicitacao.solicitante?.matricula && (
                                    <div className="text-xs text-gray-500 font-medium bg-gray-100 inline-block px-2 py-0.5 rounded">
                                        Mat: {solicitacao.solicitante.matricula}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Assinatura Digital */}
                        {solicitacao.assinatura_digital && (
                            <div className="group">
                                <div className="flex items-center gap-2 font-bold text-gray-900 mb-3 text-sm uppercase tracking-wide">
                                    <span className="text-purple-500 group-hover:text-purple-700 transition-colors">✍️</span>
                                    Assinatura Digital
                                </div>
                                <div className="bg-white border border-gray-200 rounded-lg p-3 overflow-hidden group-hover:shadow-md transition-all">
                                    <div className="w-full max-w-full overflow-hidden">
                                        <SignatureRenderer
                                            signatureData={solicitacao.assinatura_digital}
                                            width={280}
                                            height={100}
                                            className="w-full max-w-full h-auto"
                                        />
                                    </div>
                                    <div className="relative z-10 text-center mt-3 pt-2 border-t border-gray-100">
                                        <div className="text-[10px] font-bold text-purple-700 uppercase tracking-wider mb-1">Autenticado</div>
                                        <div className="text-sm text-gray-700 font-medium">
                                            {solicitacao.assinatura_nome || solicitacao.solicitante?.nome}
                                        </div>
                                        <div className="text-[10px] text-gray-500 mt-1">
                                            {formatDate(solicitacao.criado_em)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Motivo da Rejeição */}
                        {solicitacao.status === 'rejeitada' && solicitacao.motivo_rejeicao && (
                            <div className="animate-pulse">
                                <div className="flex items-center gap-2 font-bold text-red-700 mb-2 text-sm uppercase tracking-wide">
                                    <span className="text-red-500">⚠️</span>
                                    Motivo da Rejeição
                                </div>
                                <div className="text-sm text-red-900 bg-red-50 p-4 rounded-xl border border-red-200">
                                    "{solicitacao.motivo_rejeicao}"
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Coluna 2 - Inventário (5 cols) */}
                    <div className="md:col-span-4 flex flex-col">
                        <div className="flex items-center gap-2 font-bold text-gray-900 mb-3 text-sm uppercase tracking-wide">
                            <span className="text-blue-500">📦</span>
                            Contexto do Usuário
                        </div>
                        <div
                            className="bg-gradient-to-br from-white to-blue-50 border border-blue-100 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all cursor-pointer group relative overflow-hidden"
                            onClick={() => setInventarioModalOpen(true)}
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-blue-500/10 transition-all"></div>

                            <div className="flex items-start justify-between mb-6 relative z-10">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-white shadow-sm ring-1 ring-blue-100 rounded-xl group-hover:scale-110 transition-transform duration-300">
                                        <Package className="w-8 h-8 text-blue-600" />
                                    </div>
                                    <div>
                                        <div className="font-bold text-gray-900 text-lg group-hover:text-blue-700 transition-colors">Inventário Atual</div>
                                        <div className="text-sm text-gray-500 font-medium">
                                            {isTeamRequest ? solicitacao.destinatario?.nome : solicitacao.destinatario?.nome?.split(' ')[0] || 'Destinatário'}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right bg-white px-4 py-2 rounded-xl shadow-sm border border-blue-50">
                                    <div className="text-2xl font-black text-blue-600 leading-none">{inventarioItems.length}</div>
                                    <div className="text-[10px] uppercase font-bold text-gray-400">Itens</div>
                                </div>
                            </div>



                            <div className="relative z-10">
                                {inventarioItems.length > 0 ? (
                                    <div className="grid grid-cols-3 gap-3">
                                        {categoryStats.map(([cat, count]) => (
                                            <div key={cat} className="bg-white/80 rounded-lg p-3 border border-blue-50">
                                                <div className="text-[10px] font-bold text-gray-500 uppercase mb-1 truncate" title={cat}>
                                                    {cat}
                                                </div>
                                                <div className="text-lg font-bold text-gray-800">{count}</div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-6 bg-white/50 rounded-xl border border-dashed border-gray-200">
                                        <p className="text-gray-400 text-sm font-medium">Nenhum item registrado</p>
                                    </div>
                                )}
                            </div>

                            <div className="mt-6 text-center relative z-10">
                                <span className="inline-flex items-center gap-1 text-sm text-blue-600 font-bold hover:gap-2 transition-all">
                                    Ver inventário completo
                                    <span className="text-lg">→</span>
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Coluna 3 - Timeline e Aprovações (4 cols) */}
                    <div className="md:col-span-4 pl-4 space-y-8">
                        {/* Dupla Aprovação */}
                        <div>
                            <div className="flex items-center gap-2 font-bold text-gray-900 mb-3 text-sm uppercase tracking-wide">
                                <span className="text-green-500">🛡️</span>
                                Aprovações
                            </div>
                            <div className="grid grid-cols-1 gap-3">
                                {/* Almoxarifado */}
                                <div className={`px-4 py-3 rounded-xl border flex items-center justify-between shadow-sm transition-all ${solicitacao.aprovado_almoxarifado_por
                                    ? 'bg-gradient-to-r from-green-50 to-white border-green-200'
                                    : 'bg-white border-gray-200'
                                    } `}>
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-sm ${solicitacao.aprovado_almoxarifado_por ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                                            🏢
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold text-gray-500 uppercase tracking-tight">Almoxarifado</div>
                                            <div className={`text-sm font-bold ${solicitacao.aprovado_almoxarifado_por ? 'text-green-700' : 'text-gray-400'}`}>
                                                {solicitacao.aprovado_almoxarifado_por ? 'Aprovado' : 'Pendente'}
                                            </div>
                                        </div>
                                    </div>
                                    {solicitacao.aprovado_almoxarifado_por && (
                                        <CheckCircle className="w-5 h-5 text-green-500" />
                                    )}
                                </div>

                                {/* SESMT */}
                                <div className={`px-4 py-3 rounded-xl border flex items-center justify-between shadow-sm transition-all ${solicitacao.status === 'rejeitada' ? 'bg-red-50 border-red-200' :
                                    solicitacao.aprovado_sesmt_por ? 'bg-gradient-to-r from-blue-50 to-white border-blue-200' : 'bg-white border-gray-200'
                                    } `}>
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-sm ${solicitacao.status === 'rejeitada' ? 'bg-red-100 text-red-600' :
                                            solicitacao.aprovado_sesmt_por ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'
                                            }`}>
                                            🛡️
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold text-gray-500 uppercase tracking-tight">SESMT</div>
                                            <div className={`text-sm font-bold ${solicitacao.status === 'rejeitada' ? 'text-red-700' :
                                                solicitacao.aprovado_sesmt_por ? 'text-blue-700' : 'text-gray-400'
                                                }`}>
                                                {solicitacao.status === 'rejeitada' ? 'Rejeitado' : solicitacao.aprovado_sesmt_por ? 'Aprovado' : 'Pendente'}
                                            </div>
                                        </div>
                                    </div>
                                    {solicitacao.aprovado_sesmt_por && !solicitacao.motivo_rejeicao && (
                                        <CheckCircle className="w-5 h-5 text-blue-500" />
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Timeline */}
                        <div>
                            <div className="flex items-center gap-2 font-bold text-gray-900 mb-3 text-sm uppercase tracking-wide">
                                <span className="text-gray-400">⏳</span>
                                Linha do Tempo
                            </div>
                            <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm relative">
                                {/* Vertical Line */}
                                <div className="absolute left-[34px] top-8 bottom-8 w-0.5 bg-gray-100"></div>

                                <ul className="space-y-6 relative">
                                    {timelineSteps.map((step, idx) => (
                                        <li key={step.key} className="flex items-start gap-4 relative z-10 group">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-sm transition-all duration-300 ring-4 ring-white ${idx <= currentIdx
                                                ? 'bg-gradient-to-br from-green-500 to-green-600 text-white scale-110'
                                                : 'bg-gray-100 text-gray-400'
                                                } `}>
                                                {idx + 1}
                                            </div>
                                            <div className="flex-1 pt-0.5">
                                                <div className={`font-bold transition-colors ${idx <= currentIdx ? 'text-gray-900' : 'text-gray-400'}`}>
                                                    {step.label}
                                                </div>
                                                <div className="text-xs font-medium text-gray-400 mt-0.5">
                                                    {formatDate(step.date)}
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Seção do Item Principal - Cartão Grande */}
                <div className="mt-8 pt-8 border-t border-gray-100">
                    <div className="flex items-center gap-2 font-bold text-gray-900 mb-4 text-sm uppercase tracking-wide">
                        <span className="text-orange-500">📄</span>
                        Detalhes do Item
                    </div>

                    <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 hover:shadow-md transition-shadow">
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">

                            {/* Nome e Código (4 cols) */}
                            <div className="md:col-span-4">
                                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Item Solicitado</div>
                                <div className="text-xl font-black text-gray-900 leading-snug mb-1">
                                    {solicitacao.item?.nome || 'Item Desconhecido'}
                                </div>
                                {solicitacao.item?.codigo && (
                                    <div className="font-mono text-xs text-gray-500 bg-white px-2 py-1 rounded border border-gray-200 inline-block">
                                        COD: {solicitacao.item.codigo}
                                    </div>
                                )}
                            </div>

                            {/* Tipo (2 cols) */}
                            <div className="md:col-span-2 text-center md:text-left">
                                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 md:text-center">Tipo</div>
                                <div className="flex justify-center md:justify-center">
                                    <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide shadow-sm ${solicitacao.tipo_troca === 'fornecimento' ? 'bg-green-100 text-green-700 ring-1 ring-green-200' :
                                        solicitacao.tipo_troca === 'troca' ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-200' :
                                            'bg-red-100 text-red-700 ring-1 ring-red-200'
                                        }`}>
                                        {solicitacao.tipo_troca || 'N/A'}
                                    </span>
                                </div>
                            </div>

                            {/* Quantidades (3 cols) */}
                            <div className="md:col-span-3">
                                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 text-center">Quantidades</div>
                                <div className="flex items-center justify-center gap-2">
                                    <div className="flex flex-col items-center bg-white p-2 rounded-lg border border-blue-100 shadow-sm min-w-[70px]">
                                        <span className="text-[10px] font-bold text-blue-400 uppercase">Solic.</span>
                                        <span className="text-xl font-black text-blue-600">{solicitacao.quantidade_solicitada}</span>
                                    </div>

                                    {solicitacao.quantidade_aprovada !== undefined && (
                                        <>
                                            <div className="text-gray-300">→</div>
                                            <div className="flex flex-col items-center bg-white p-2 rounded-lg border border-green-100 shadow-sm min-w-[70px]">
                                                <span className="text-[10px] font-bold text-green-400 uppercase">Aprov.</span>
                                                <span className="text-xl font-black text-green-600">{solicitacao.quantidade_aprovada}</span>
                                            </div>
                                        </>
                                    )}

                                    {solicitacao.quantidade_entregue !== undefined && (
                                        <>
                                            <div className="text-gray-300">→</div>
                                            <div className="flex flex-col items-center bg-white p-2 rounded-lg border border-purple-100 shadow-sm min-w-[70px]">
                                                <span className="text-[10px] font-bold text-purple-400 uppercase">Entr.</span>
                                                <span className="text-xl font-black text-purple-600">{solicitacao.quantidade_entregue}</span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Motivo (3 cols) */}
                            <div className="md:col-span-3">
                                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Motivo da Solicitação</div>
                                <div className="text-sm text-gray-700 bg-white p-3 rounded-xl border border-gray-200 italic line-clamp-3">
                                    "{solicitacao.motivo_solicitacao}"
                                </div>
                            </div>
                        </div>

                        {/* Observações Footer */}
                        {solicitacao.observacoes && (
                            <div className="mt-4 pt-4 border-t border-gray-200 flex gap-3 text-sm">
                                <span className="font-bold text-gray-500">Observações:</span>
                                <span className="text-gray-600 italic">{solicitacao.observacoes}</span>
                            </div>
                        )}
                    </div>
                </div>
                {/* Action Buttons Footer */}
                <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end gap-3 flex-wrap">
                    {/* APROVADA - Validar/Entregar */}
                    {(solicitacao.status === 'aprovada' || solicitacao.status === 'aguardando_estoque') && canDeliver && (
                        <>
                            {onValidar ? (
                                <button
                                    onClick={onValidar}
                                    disabled={isDelivering}
                                    className="flex items-center gap-2 bg-green-600 text-white hover:bg-green-700 px-8 py-3 rounded-xl font-bold transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 animate-pulse text-lg"
                                >
                                    <CheckCircle className="w-6 h-6" />
                                    Validar Entrega
                                </button>
                            ) : (
                                <button
                                    onClick={() => onEntregar(solicitacao)}
                                    className="flex items-center gap-2 bg-blue-600 text-white hover:bg-blue-700 px-8 py-3 rounded-xl font-bold transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 text-lg"
                                >
                                    <Truck className="w-6 h-6" />
                                    Entregar Material
                                </button>
                            )}
                        </>
                    )}

                    {/* PENDENTE - Aprovar/Rejeitar */}
                    {solicitacao.status === 'pendente' && (
                        <>
                            {onRejeitar && (
                                <button
                                    onClick={() => onRejeitar(solicitacao)}
                                    className="flex items-center gap-2 bg-red-100 text-red-700 hover:bg-red-200 px-6 py-3 rounded-xl font-bold transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
                                >
                                    <XCircle className="w-5 h-5" />
                                    Rejeitar
                                </button>
                            )}
                            {onAprovar && (
                                <button
                                    onClick={() => onAprovar(solicitacao)}
                                    className="flex items-center gap-2 bg-green-600 text-white hover:bg-green-700 px-8 py-3 rounded-xl font-bold transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 text-lg"
                                >
                                    <CheckCircle className="w-6 h-6" />
                                    Aprovar
                                </button>
                            )}
                        </>
                    )}

                    {/* ENTREGUE - Devolver/Trocar */}
                    {solicitacao.status === 'entregue' && (
                        <>
                            {onDevolver && (
                                <button
                                    onClick={() => onDevolver(solicitacao)}
                                    className="flex items-center gap-2 bg-orange-100 text-orange-700 hover:bg-orange-200 px-6 py-3 rounded-xl font-bold transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
                                >
                                    <RotateCcw className="w-5 h-5" />
                                    Devolver
                                </button>
                            )}
                            {onTrocar && (
                                <button
                                    onClick={() => onTrocar(solicitacao)}
                                    className="flex items-center gap-2 bg-blue-600 text-white hover:bg-blue-700 px-6 py-3 rounded-xl font-bold transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
                                >
                                    <ArrowRightLeft className="w-5 h-5" />
                                    Trocar
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Inventory Modal */}
            {inventarioModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">Inventário do Destinatário</h2>
                                <p className="text-sm text-gray-500">{solicitacao.destinatario?.nome}</p>
                            </div>
                            <button
                                onClick={() => setInventarioModalOpen(false)}
                                className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="p-8 overflow-y-auto flex-1 bg-gray-50/30">
                            {loadingInventario ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                                        <Package className="w-8 h-8 text-blue-400 animate-pulse" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-1">Carregando Inventário</h3>
                                    <p className="text-gray-500 max-w-sm">
                                        Estamos conectando ao banco de dados para buscar os itens em posse deste colaborador.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {inventarioItems.length > 0 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {inventarioItems.map((item, index) => (
                                                <div key={index} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
                                                    <div className="p-2 bg-blue-50 rounded-lg">
                                                        <Package className="w-5 h-5 text-blue-600" />
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-gray-900">{item.item_estoque?.nome || 'Item sem nome'}</div>
                                                        <div className="text-xs text-gray-500">
                                                            {item.data_retirada ? `Retirado em ${formatDate(item.data_retirada)}` : `ID: ${item.item_estoque?.codigo || item.id}`}
                                                        </div>
                                                    </div>
                                                    <div className="ml-auto text-sm font-bold text-gray-700">
                                                        {item.quantidade} un
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-12">
                                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <Package className="w-8 h-8 text-gray-400" />
                                            </div>
                                            <h3 className="text-lg font-semibold text-gray-900 mb-1">Inventário Vazio</h3>
                                            <p className="text-gray-500">Nenhum item encontrado no inventário deste destinatário.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
