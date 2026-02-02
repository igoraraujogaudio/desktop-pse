
import { useState, useEffect } from 'react';
import { SolicitacaoItem } from '../types';
import { estoqueService } from "../services/estoqueService";
import { AlertCircle, CheckCircle, Package, AlertTriangle, FileText } from 'lucide-react';
import { DiscountOrderForm } from './DiscountOrderForm';

interface TrocaModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (dados: DadosTroca) => Promise<void>;
    onReadyForValidation: () => void; // New prop for next step
    solicitacao: SolicitacaoItem;
    inventoryItem?: any;
}

export interface DadosTroca {
    condicao: 'bom' | 'desgaste' | 'danificado' | 'reteste' | 'perdido';
    observacoes: string;
    gerarDesconto: boolean;
    inventoryItemId?: string;
    valorDesconto?: number;
    parcelasDesconto?: number;
}

export function TrocaModal({ isOpen, onClose, onConfirm, onReadyForValidation, solicitacao, inventoryItem }: TrocaModalProps) {
    const [condicao, setCondicao] = useState<'bom' | 'desgaste' | 'danificado' | 'reteste' | 'perdido'>('bom');
    const [observacoes, setObservacoes] = useState('');
    // gerarDesconto is derived from isCritical in this flow, state removed as it was unused
    const [loading, setLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false); // Success state
    const [itemDetails, setItemDetails] = useState<{ nome: string; preco: number; codigo: string } | null>(null);
    const [showDiscountForm, setShowDiscountForm] = useState(false);
    const [discountData, setDiscountData] = useState<{ valorTotal: number; parcelas: number } | null>(null);

    // Auto-enable discount for critical conditions
    const isCritical = condicao === 'danificado' || condicao === 'perdido';

    useEffect(() => {
        if (isCritical && solicitacao?.item_id) {
            estoqueService.getItemDetails(solicitacao.item_id)
                .then(data => setItemDetails(data))
                .catch(err => console.error('Error fetching item details:', err));
        }
    }, [isCritical, solicitacao?.item_id]);

    // Reset discount data when condition changes
    useEffect(() => {
        if (!isCritical) {
            setDiscountData(null);
        }
    }, [isCritical]);

    if (!isOpen) return null;

    const handleSubmit = async (discountDataOverride?: { valorTotal: number; parcelas: number }) => {
        if (isCritical && !observacoes.trim()) {
            alert('Observações são obrigatórias para itens danificados ou perdidos.');
            return;
        }

        const finalDiscountData = discountDataOverride || discountData;

        // For critical conditions, show discount form first if we don't have data yet
        if (isCritical && !finalDiscountData) {
            setShowDiscountForm(true);
            return;
        }

        setLoading(true);

        try {
            await onConfirm({
                condicao,
                observacoes,
                gerarDesconto: isCritical,
                inventoryItemId: inventoryItem?.id,
                valorDesconto: finalDiscountData?.valorTotal,
                parcelasDesconto: finalDiscountData?.parcelas
            });
            setIsSuccess(true);
        } catch (error) {
            console.error('Erro ao processar troca:', error);
            alert('Erro ao processar troca. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    const handleDiscountConfirm = (data: { valorTotal: number; parcelas: number }) => {
        setDiscountData(data);
        setShowDiscountForm(false);
        // Pass data directly to bypass React state update delay
        handleSubmit(data);
    };



    return (
        <>
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 border border-gray-100">
                    {/* Header */}
                    <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                        <div className="flex items-center gap-3">
                            <div className={`p-2.5 rounded-xl ${isSuccess ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                                {isSuccess ? <CheckCircle className="w-6 h-6" /> : <Package className="w-6 h-6" />}
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">{isSuccess ? 'Troca Registrada' : 'Registrar Devolução'}</h2>
                                <p className="text-sm text-gray-500">{isSuccess ? 'Pronto para validação' : 'Troca de item antigo pelo novo'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-6 overflow-y-auto flex-1">
                        {isSuccess ? (
                            <div className="flex flex-col items-center justify-center py-6 space-y-4">
                                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center animate-in zoom-in-50">
                                    <CheckCircle className="w-8 h-8 text-green-600" />
                                </div>
                                <div className="text-center">
                                    <h3 className="text-lg font-bold text-gray-900">Devolução Processada!</h3>
                                    <p className="text-gray-500 max-w-xs mx-auto mt-2">
                                        O item anterior foi registrado como <strong>{condicao}</strong>.
                                        <br />
                                        Agora você pode prosseguir com a entrega do novo item.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* Item Info */}
                                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
                                    <div>
                                        <div className="text-sm font-bold text-gray-900">Item a ser Devolvido</div>
                                        <div className="text-sm text-gray-600 mt-1">
                                            {inventoryItem ? (
                                                <>
                                                    Identificado no inventário: <strong>{inventoryItem.item_estoque?.nome}</strong>
                                                    <br />
                                                    <span className="text-xs opacity-75">Data de Entrega: {new Date(inventoryItem.data_entrega).toLocaleDateString()}</span>
                                                </>
                                            ) : (
                                                <span className="text-gray-400 italic">Nenhum item encontrado no inventário</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Condition Selection */}
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-900">Condição do Item</label>
                                    <div className="grid grid-cols-1 gap-2">
                                        {[
                                            { value: 'bom', label: 'Bom Estado', icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50 border-green-200', desc: 'Volta ao estoque' },
                                            { value: 'desgaste', label: 'Desgaste Natural', icon: AlertCircle, color: 'text-gray-600', bg: 'bg-gray-50 border-gray-200', desc: 'Não volta ao estoque' },
                                            { value: 'danificado', label: 'Danificado', icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200', desc: 'Descarte' },
                                            { value: 'reteste', label: 'Para Reteste', icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200', desc: 'Não volta ao estoque' },
                                            { value: 'perdido', label: 'Perdido', icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50 border-red-200', desc: 'Não devolvido' }
                                        ].map((option) => (
                                            <button
                                                key={option.value}
                                                onClick={() => setCondicao(option.value as any)}
                                                className={`p-3 rounded-xl border-2 transition-all flex flex-col items-start gap-1 ${condicao === option.value
                                                    ? `border-blue-500 bg-blue-50/50 ring-1 ring-blue-500`
                                                    : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <option.icon className={`w-4 h-4 ${condicao === option.value ? option.color : 'text-gray-400'}`} />
                                                    <span className={`font-medium text-sm ${condicao === option.value ? 'text-gray-900' : 'text-gray-500'}`}>
                                                        {option.label}
                                                    </span>
                                                </div>
                                                <span className="text-[10px] text-gray-400 font-medium pl-6">
                                                    {option.desc}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Observações */}
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-900 flex items-center justify-between">
                                        Observações
                                        {isCritical && <span className="text-xs text-red-500 font-medium">* Obrigatório</span>}
                                    </label>
                                    <textarea
                                        value={observacoes}
                                        onChange={(e) => setObservacoes(e.target.value)}
                                        className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all min-h-[100px] text-sm"
                                        placeholder="Descreva o estado do item ou motivo da troca..."
                                    />
                                </div>

                                {/* Gerar Desconto Toggle */}
                                {isCritical && (
                                    <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                                        <label className="flex items-center gap-3 p-4 border border-red-200 bg-red-50 rounded-xl opacity-90">
                                            <div className="w-5 h-5 rounded border flex items-center justify-center bg-red-500 border-red-500">
                                                <CheckCircle className="w-3.5 h-3.5 text-white" />
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={true}
                                                disabled={true}
                                                className="hidden"
                                            />
                                            <div className="flex-1">
                                                <div className="font-bold text-gray-900 text-sm flex items-center gap-2">
                                                    Ordem de Desconto
                                                    <span className="text-xs text-red-600 font-medium">* Obrigatório</span>
                                                </div>
                                                <div className="text-xs text-gray-600">Será gerada automaticamente para o funcionário assinar</div>
                                            </div>
                                            <FileText className="w-5 h-5 text-red-500" />
                                        </label>

                                        {/* Price Preview */}
                                        {itemDetails && (
                                            <div className="mt-2 p-3 bg-red-50 border border-red-100 rounded-lg flex items-center justify-between text-sm">
                                                <span className="text-gray-700">Valor do Item:</span>
                                                <span className="font-bold text-red-600">
                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(itemDetails.preco || 0)}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
                        {isSuccess ? (
                            <button
                                onClick={() => {
                                    onClose();
                                    onReadyForValidation();
                                }}
                                className="w-full px-6 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-all shadow-lg shadow-green-200 text-sm flex items-center justify-center gap-2 animate-in fade-in"
                            >
                                Seguir para Validação
                                <CheckCircle className="w-4 h-4" />
                            </button>
                        ) : (
                            <>
                                <button
                                    onClick={onClose}
                                    disabled={loading}
                                    className="px-5 py-2.5 text-gray-600 font-medium hover:bg-gray-200 rounded-xl transition-colors text-sm"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={() => handleSubmit()}
                                    disabled={loading}
                                    className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-200 text-sm flex items-center gap-2"
                                >
                                    {loading ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Processando...
                                        </>
                                    ) : (
                                        <>
                                            Confirmar Troca
                                            <CheckCircle className="w-4 h-4" />
                                        </>
                                    )}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Discount Order Form Modal */}
            {
                showDiscountForm && itemDetails && (
                    <DiscountOrderForm
                        isOpen={showDiscountForm}
                        onClose={() => setShowDiscountForm(false)}
                        onConfirm={handleDiscountConfirm}
                        itemNome={itemDetails.nome}
                        itemPreco={itemDetails.preco}
                        condicao={condicao as 'danificado' | 'perdido'}
                    />
                )
            }
        </>
    );
}
