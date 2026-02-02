import { useState, useEffect } from 'react';
import { DollarSign, CreditCard, AlertCircle } from 'lucide-react';

interface DiscountOrderFormProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (data: { valorTotal: number; parcelas: number }) => void;
    itemNome: string;
    itemPreco: number;
    condicao: 'danificado' | 'perdido';
}

export function DiscountOrderForm({
    isOpen,
    onClose,
    onConfirm,
    itemNome,
    itemPreco,
    condicao
}: DiscountOrderFormProps) {
    const [valorTotal, setValorTotal] = useState(itemPreco);
    const [parcelas, setParcelas] = useState(1);

    useEffect(() => {
        if (isOpen) {
            setValorTotal(itemPreco);
            setParcelas(1);
        }
    }, [isOpen, itemPreco]);

    if (!isOpen) return null;

    const valorPorParcela = parcelas > 1 ? valorTotal / parcelas : valorTotal;

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    };

    const formatCurrencyInput = (value: number) => {
        return (value).toFixed(2).replace('.', ',');
    };

    const handleValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value.replace(/\D/g, '');
        if (rawValue === '') {
            setValorTotal(0);
            return;
        }
        const numeroValor = parseInt(rawValue) / 100;
        setValorTotal(numeroValor);
    };

    const handleSubmit = () => {
        if (valorTotal <= 0) {
            alert('O valor deve ser maior que zero');
            return;
        }
        if (parcelas < 1 || parcelas > 12) {
            alert('O número de parcelas deve estar entre 1 e 12');
            return;
        }
        onConfirm({ valorTotal, parcelas });
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 border border-gray-100">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 bg-red-50/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-red-100 text-red-600">
                            <DollarSign className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Ordem de Desconto</h2>
                            <p className="text-sm text-gray-500">Item {condicao} - Desconto obrigatório</p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Item Info */}
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-orange-500 mt-0.5 shrink-0" />
                            <div>
                                <div className="text-sm font-bold text-gray-900">Item para Desconto</div>
                                <div className="text-sm text-gray-600 mt-1">
                                    <strong>{itemNome}</strong>
                                    <br />
                                    <span className="text-xs opacity-75">Condição: {condicao}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Valor */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-900 flex items-center justify-between">
                            Valor do Item
                            <span className="text-xs text-gray-500 font-normal">Editável</span>
                        </label>
                        <div className="relative">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                                R$
                            </div>
                            <input
                                type="text"
                                value={formatCurrencyInput(valorTotal)}
                                onChange={handleValorChange}
                                onFocus={(e) => e.target.select()}
                                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all text-right font-mono text-lg"
                                placeholder="0,00"
                            />
                        </div>
                        <div className="text-xs text-gray-500">
                            Valor do estoque: {formatCurrency(itemPreco)}
                        </div>
                    </div>

                    {/* Parcelas */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-900 flex items-center gap-2">
                            <CreditCard className="w-4 h-4" />
                            Número de Parcelas
                        </label>
                        <input
                            type="number"
                            min="1"
                            max="12"
                            value={parcelas}
                            onChange={(e) => setParcelas(Math.max(1, Math.min(12, parseInt(e.target.value) || 1)))}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all text-center text-lg font-medium"
                        />
                        <div className="text-xs text-gray-500 text-center">
                            Máximo 12 parcelas
                        </div>
                    </div>

                    {/* Summary */}
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-gray-700">Valor Total:</span>
                                <span className="text-lg font-bold text-red-600">
                                    {formatCurrency(valorTotal)}
                                </span>
                            </div>
                            {parcelas > 1 && (
                                <div className="flex justify-between items-center pt-2 border-t border-red-200">
                                    <span className="text-sm font-medium text-gray-700">
                                        {parcelas}x de:
                                    </span>
                                    <span className="text-base font-bold text-red-600">
                                        {formatCurrency(valorPorParcela)}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 text-gray-600 font-medium hover:bg-gray-200 rounded-xl transition-colors text-sm"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="px-6 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-200 text-sm flex items-center gap-2"
                    >
                        Confirmar Desconto
                        <DollarSign className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
