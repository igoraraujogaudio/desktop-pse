import { useState, useEffect } from 'react';
import { X, Package, AlertCircle } from 'lucide-react';
import { SolicitacaoItem } from '../types';

interface DeliveryValidationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (data: {
        quantidade: number;
        numeroLaudo?: string;
        validadeLaudo?: string;
        observacoes?: string;
    }) => void;
    solicitacao: SolicitacaoItem;
}

export default function DeliveryValidationModal({
    isOpen,
    onClose,
    onConfirm,
    solicitacao
}: DeliveryValidationModalProps) {
    const [quantidade, setQuantidade] = useState('');
    const [numeroLaudo, setNumeroLaudo] = useState('');
    const [validadeLaudo, setValidadeLaudo] = useState('');
    const [observacoes, setObservacoes] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});

    const requerLaudo = solicitacao?.item?.requer_laudo || false;
    const quantidadeAprovada = solicitacao?.quantidade_aprovada || 0;

    useEffect(() => {
        if (isOpen) {
            setQuantidade(quantidadeAprovada.toString());
            setNumeroLaudo('');
            setValidadeLaudo('');
            setObservacoes('');
            setErrors({});
        }
    }, [isOpen, quantidadeAprovada]);

    const handleValidadeLaudoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value.replace(/\D/g, '');
        
        if (value.length > 8) {
            value = value.slice(0, 8);
        }

        let formatted = '';
        if (value.length >= 2) {
            formatted = value.slice(0, 2);
            if (value.length >= 4) {
                formatted += '/' + value.slice(2, 4);
                if (value.length >= 8) {
                    formatted += '/' + value.slice(4, 8);
                } else if (value.length > 4) {
                    formatted += '/' + value.slice(4);
                }
            } else if (value.length > 2) {
                formatted += '/' + value.slice(2);
            }
        } else {
            formatted = value;
        }

        setValidadeLaudo(formatted);
        if (errors.validadeLaudo) {
            setErrors(prev => ({ ...prev, validadeLaudo: '' }));
        }
    };

    const isValidDate = (dateStr: string): boolean => {
        if (!dateStr || !/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
            return false;
        }

        const [day, month, year] = dateStr.split('/').map(Number);

        if (year < 1900 || year > 2100) {
            return false;
        }

        if (month < 1 || month > 12) {
            return false;
        }

        const daysInMonth = new Date(year, month, 0).getDate();
        if (day < 1 || day > daysInMonth) {
            return false;
        }

        return true;
    };

    const convertDateForSubmit = (dateStr: string): string => {
        const [day, month, year] = dateStr.split('/');
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    };

    const handleSubmit = () => {
        const newErrors: Record<string, string> = {};

        const qtd = parseInt(quantidade);
        if (!quantidade || isNaN(qtd) || qtd < 1) {
            newErrors.quantidade = 'Quantidade deve ser maior que zero';
        } else if (qtd > quantidadeAprovada) {
            newErrors.quantidade = `Quantidade não pode ser maior que ${quantidadeAprovada}`;
        }

        if (requerLaudo) {
            if (!numeroLaudo || numeroLaudo.trim() === '') {
                newErrors.numeroLaudo = 'Número do laudo é obrigatório';
            }

            if (!validadeLaudo || validadeLaudo.trim() === '') {
                newErrors.validadeLaudo = 'Validade do laudo é obrigatória';
            } else if (!/^\d{2}\/\d{2}\/\d{4}$/.test(validadeLaudo)) {
                newErrors.validadeLaudo = 'Data inválida. Use o formato DD/MM/AAAA';
            } else if (!isValidDate(validadeLaudo)) {
                newErrors.validadeLaudo = 'Data inválida. Verifique dia, mês e ano';
            }
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        onConfirm({
            quantidade: qtd,
            numeroLaudo: requerLaudo ? numeroLaudo : undefined,
            validadeLaudo: requerLaudo && validadeLaudo ? convertDateForSubmit(validadeLaudo) : undefined,
            observacoes: observacoes || undefined
        });
    };

    const handleClose = () => {
        setQuantidade('');
        setNumeroLaudo('');
        setValidadeLaudo('');
        setObservacoes('');
        setErrors({});
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-[2rem] w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl animate-scale-in">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-green-50/50 rounded-t-[2rem]">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center">
                            <Package className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Validar Entrega</h2>
                            <p className="text-sm text-gray-500">Confirme os dados da entrega</p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-white/50 transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Item Info */}
                    <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                        <div className="text-sm font-medium text-gray-700 mb-2">
                            📦 {solicitacao?.item?.nome}
                        </div>
                        <div className="text-sm text-gray-600">
                            👤 Para: {solicitacao?.destinatario?.nome || solicitacao?.destinatario_equipe?.nome}
                        </div>
                        <div className="text-sm text-gray-600">
                            ✅ Aprovada: {quantidadeAprovada} unidades
                        </div>
                        {requerLaudo && (
                            <div className="text-sm text-blue-600 font-medium mt-2">
                                ⚠️ Este item requer laudo técnico
                            </div>
                        )}
                    </div>

                    {/* Quantidade */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                            Quantidade a entregar *
                        </label>
                        <input
                            type="number"
                            value={quantidade}
                            onChange={e => {
                                setQuantidade(e.target.value);
                                if (errors.quantidade) {
                                    setErrors(prev => ({ ...prev, quantidade: '' }));
                                }
                            }}
                            min="1"
                            max={quantidadeAprovada}
                            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-500 outline-none ${
                                errors.quantidade ? 'border-red-300 bg-red-50' : 'border-gray-200'
                            }`}
                            placeholder="Digite a quantidade"
                        />
                        {errors.quantidade && (
                            <p className="text-xs text-red-600 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                {errors.quantidade}
                            </p>
                        )}
                        <p className="text-xs text-gray-500">
                            Máximo: {quantidadeAprovada} unidades
                        </p>
                    </div>

                    {/* Campos de Laudo (se necessário) */}
                    {requerLaudo && (
                        <>
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                                <div className="text-sm font-medium text-blue-800 flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4" />
                                    Este item requer laudo técnico. Preencha os dados abaixo.
                                </div>
                            </div>

                            {/* Número do Laudo */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">
                                    Número do Laudo *
                                </label>
                                <input
                                    type="text"
                                    value={numeroLaudo}
                                    onChange={e => {
                                        setNumeroLaudo(e.target.value);
                                        if (errors.numeroLaudo) {
                                            setErrors(prev => ({ ...prev, numeroLaudo: '' }));
                                        }
                                    }}
                                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-500 outline-none ${
                                        errors.numeroLaudo ? 'border-red-300 bg-red-50' : 'border-gray-200'
                                    }`}
                                    placeholder="Ex: L001/2024"
                                />
                                {errors.numeroLaudo && (
                                    <p className="text-xs text-red-600 flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3" />
                                        {errors.numeroLaudo}
                                    </p>
                                )}
                            </div>

                            {/* Validade do Laudo */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">
                                    Validade do Laudo *
                                </label>
                                <input
                                    type="text"
                                    value={validadeLaudo}
                                    onChange={handleValidadeLaudoChange}
                                    maxLength={10}
                                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-500 outline-none ${
                                        errors.validadeLaudo ? 'border-red-300 bg-red-50' : 'border-gray-200'
                                    }`}
                                    placeholder="DD/MM/AAAA"
                                />
                                {errors.validadeLaudo && (
                                    <p className="text-xs text-red-600 flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3" />
                                        {errors.validadeLaudo}
                                    </p>
                                )}
                                <p className="text-xs text-gray-500">
                                    Digite a data no formato DD/MM/AAAA (ex: 18/12/2024)
                                </p>
                            </div>
                        </>
                    )}

                    {/* Observações */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                            Observações
                        </label>
                        <textarea
                            value={observacoes}
                            onChange={e => setObservacoes(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none h-24 resize-none"
                            placeholder="Observações sobre a entrega..."
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 rounded-b-[2rem]">
                    <button
                        onClick={handleClose}
                        className="px-6 py-3 text-gray-600 font-medium hover:bg-gray-200 rounded-xl transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="px-8 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-all shadow-lg shadow-green-200"
                    >
                        Confirmar Entrega
                    </button>
                </div>
            </div>
        </div>
    );
}
