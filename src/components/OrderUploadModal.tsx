import { useState, useEffect } from 'react';
import { Check, AlertCircle, FileText, XCircle } from 'lucide-react';
import { TestemunhaAutocomplete } from './TestemunhaAutocomplete';

interface WitnessData {
    testemunha1_nome: string;
    testemunha1_cpf: string;
    testemunha2_nome: string;
    testemunha2_cpf: string;
}

interface OrderUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (action: 'assinado' | 'recusado', witnessData?: WitnessData) => void;
    file: File | null;
    orderDescription: string;
    funcionarioNome: string;
}

export function OrderUploadModal({ isOpen, onClose, onConfirm, file, orderDescription, funcionarioNome }: OrderUploadModalProps) {
    const [action, setAction] = useState<'assinado' | 'recusado'>('assinado');

    // Witness State
    const [testemunhas, setTestemunhas] = useState<WitnessData>({
        testemunha1_nome: '',
        testemunha1_cpf: '',
        testemunha2_nome: '',
        testemunha2_cpf: ''
    });

    // Removed unused loading state
    const [error, setError] = useState<string | null>(null);

    // Reset state when opening
    useEffect(() => {
        if (isOpen) {
            setAction('assinado');
            setTestemunhas({
                testemunha1_nome: '',
                testemunha1_cpf: '',
                testemunha2_nome: '',
                testemunha2_cpf: ''
            });
            setError(null);
        }
    }, [isOpen]);

    const validarCPF = (cpf: string) => {
        const cleanCPF = cpf.replace(/\D/g, '');
        return cleanCPF.length === 11;
    };

    const handleSubmit = () => {
        if (action === 'recusado') {
            const { testemunha1_nome, testemunha1_cpf, testemunha2_nome, testemunha2_cpf } = testemunhas;

            if (!testemunha1_nome || !testemunha1_cpf || !testemunha2_nome || !testemunha2_cpf) {
                setError('Para recusa, os dados completos das duas testemunhas são obrigatórios.');
                return;
            }

            if (!validarCPF(testemunha1_cpf) || !validarCPF(testemunha2_cpf)) {
                setError('Um ou mais CPFs inválidos. O CPF deve conter 11 dígitos.');
                return;
            }

            onConfirm('recusado', testemunhas);
        } else {
            onConfirm('assinado');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl p-0 overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white shrink-0">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <FileText className="w-6 h-6" />
                        Confirmar Upload
                    </h2>
                    <p className="text-blue-100 text-sm mt-1">
                        Arquivo: {file?.name}
                    </p>
                </div>

                <div className="p-6 overflow-y-auto">
                    {/* Order Summary */}
                    <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-100 text-sm">
                        <div className="flex justify-between mb-2">
                            <span className="text-gray-500">Funcionário:</span>
                            <span className="font-medium text-gray-900">{funcionarioNome}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Descrição:</span>
                            <span className="font-medium text-gray-900 truncate max-w-[250px]">{orderDescription}</span>
                        </div>
                    </div>

                    {/* Action Selection */}
                    <div className="mb-6">
                        <label className="text-sm font-semibold text-gray-700 mb-3 block">O que aconteceu com este documento?</label>
                        <div className="grid grid-cols-2 gap-4">
                            <div
                                onClick={() => setAction('assinado')}
                                className={`cursor-pointer p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 text-center ${action === 'assinado'
                                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                                    : 'border-gray-200 hover:border-blue-200 hover:bg-gray-50 text-gray-600'
                                    }`}
                            >
                                <Check className={`w-6 h-6 ${action === 'assinado' ? 'text-blue-600' : 'text-gray-400'}`} />
                                <span className="font-medium text-sm">Assinado</span>
                            </div>

                            <div
                                onClick={() => setAction('recusado')}
                                className={`cursor-pointer p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 text-center ${action === 'recusado'
                                    ? 'border-red-500 bg-red-50 text-red-700'
                                    : 'border-gray-200 hover:border-red-200 hover:bg-gray-50 text-gray-600'
                                    }`}
                            >
                                <XCircle className={`w-6 h-6 ${action === 'recusado' ? 'text-red-600' : 'text-gray-400'}`} />
                                <span className="font-medium text-sm">Recusado</span>
                            </div>
                        </div>
                    </div>

                    {/* Witness Fields (Only if Refused) */}
                    {action === 'recusado' && (
                        <div className="animate-in slide-in-from-top-2 duration-200">
                            <div className="flex items-center gap-2 mb-4 text-red-700 bg-red-50 p-3 rounded-lg text-sm border border-red-100">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                Para recusa, busque e selecione duas testemunhas.
                            </div>

                            <div className="space-y-4">
                                {/* Witness 1 */}
                                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                                    <h3 className="text-xs font-bold uppercase text-gray-400 mb-3">Testemunha 1</h3>
                                    <TestemunhaAutocomplete
                                        label="Nome (Busca)"
                                        value={testemunhas.testemunha1_nome}
                                        onChange={(v) => setTestemunhas(prev => ({ ...prev, testemunha1_nome: v }))}
                                        cpfValue={testemunhas.testemunha1_cpf}
                                        onCpfChange={(v) => setTestemunhas(prev => ({ ...prev, testemunha1_cpf: v }))}
                                        required
                                    />
                                </div>

                                {/* Witness 2 */}
                                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                                    <h3 className="text-xs font-bold uppercase text-gray-400 mb-3">Testemunha 2</h3>
                                    <TestemunhaAutocomplete
                                        label="Nome (Busca)"
                                        value={testemunhas.testemunha2_nome}
                                        onChange={(v) => setTestemunhas(prev => ({ ...prev, testemunha2_nome: v }))}
                                        cpfValue={testemunhas.testemunha2_cpf}
                                        onCpfChange={(v) => setTestemunhas(prev => ({ ...prev, testemunha2_cpf: v }))}
                                        required
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 text-sm border border-red-100">
                            <AlertCircle className="w-4 h-4" />
                            {error}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3 shrink-0">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition-colors text-sm"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        className={`px-6 py-2.5 text-white font-bold rounded-xl transition-all shadow-lg text-sm flex items-center gap-2 ${action === 'assinado'
                            ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'
                            : 'bg-red-600 hover:bg-red-700 shadow-red-200'
                            }`}
                    >
                        {action === 'assinado' ? 'Confirmar Assinatura' : 'Confirmar Recusa'}
                    </button>
                </div>
            </div>
        </div>
    );
}
