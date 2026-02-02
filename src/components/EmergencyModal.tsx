import { useState, useEffect, useMemo } from 'react';
import { AlertCircle, Search, X, Plus, Package, Loader2 } from 'lucide-react';
import { estoqueService } from '../services/estoqueService';
import { catalogoService } from '../services/catalogoService';
import { userService } from '../services/userService';
import { baseService } from '../services/baseService';
import type { User } from '../types';
import type { Base } from '../types/contratos';

interface ItemEmergencial {
    id: string;
    item_estoque_id: string;
    nome: string;
    codigo: string;
    quantidade_solicitada: number;
    tipo_troca: 'fornecimento' | 'troca' | 'desconto';
    motivo_solicitacao: string;
    observacoes?: string;
}

interface EmergencyModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    userId: string;
}

interface ItemEstoque {
    id: string;
    nome: string;
    codigo: string;
    estoque_atual: number;
}

export default function EmergencyModal({ isOpen, onClose, onSuccess, userId }: EmergencyModalProps) {
    const [loading, setLoading] = useState(false);
    const [bases, setBases] = useState<Base[]>([]);
    const [usuarios, setUsuarios] = useState<User[]>([]);
    const [itensEstoque, setItensEstoque] = useState<ItemEstoque[]>([]);

    const [searchItem, setSearchItem] = useState('');
    const [searchUser, setSearchUser] = useState('');

    const [itensAdicionados, setItensAdicionados] = useState<ItemEmergencial[]>([]);

    const [form, setForm] = useState({
        base_id: '',
        solicitante_id: '',
        item_id: '',
        quantidade_solicitada: '',
        prioridade: 'urgente' as 'baixa' | 'normal' | 'alta' | 'urgente',
        tipo_troca: 'fornecimento' as 'desconto' | 'troca' | 'fornecimento',
        motivo_solicitacao: '',
        observacoes: '',
        aprovar_automaticamente: true
    });

    useEffect(() => {
        if (isOpen) {
            loadData();
        }
    }, [isOpen]);

    useEffect(() => {
        if (form.base_id) {
            loadItensEstoque(form.base_id);
        }
    }, [form.base_id]);

    const loadData = async () => {
        try {
            const [basesData, usuariosData] = await Promise.all([
                baseService.getBasesAtivas(),
                userService.getUsuariosAtivos()
            ]);

            setBases(basesData);
            setUsuarios(usuariosData);
        } catch (error) {
            console.error('Error loading data:', error);
            alert('Erro ao carregar dados');
        }
    };

    const loadItensEstoque = async (baseId: string) => {
        try {
            console.log('🔄 [EmergencyModal] Loading items for base:', baseId);
            const items = await catalogoService.getItensCatalogoComEstoque(baseId);
            console.log('✅ [EmergencyModal] Items loaded:', items.length);
            setItensEstoque(items);
        } catch (error) {
            console.error('❌ [EmergencyModal] Error loading items:', error);
            alert('Erro ao carregar itens da base');
        }
    };

    const filteredItems = useMemo(() => {
        if (!searchItem) return itensEstoque;
        const term = searchItem.toLowerCase();
        return itensEstoque.filter(item =>
            item.nome.toLowerCase().includes(term) ||
            item.codigo.toLowerCase().includes(term)
        );
    }, [itensEstoque, searchItem]);

    const filteredUsers = useMemo(() => {
        if (!searchUser) return usuarios;
        const term = searchUser.toLowerCase();
        return usuarios.filter(user =>
            user.nome.toLowerCase().includes(term) ||
            user.matricula?.toLowerCase().includes(term)
        );
    }, [usuarios, searchUser]);

    const addItem = () => {
        if (!form.item_id || !form.quantidade_solicitada) {
            alert('Selecione um item e informe a quantidade');
            return;
        }

        const item = itensEstoque.find(i => i.id === form.item_id);
        if (!item) return;

        const itemJaAdicionado = itensAdicionados.find(i => i.item_estoque_id === form.item_id);
        if (itemJaAdicionado) {
            alert('Este item já foi adicionado à lista');
            return;
        }

        const novoItem: ItemEmergencial = {
            id: `temp-${Date.now()}`,
            item_estoque_id: form.item_id,
            nome: item.nome,
            codigo: item.codigo,
            quantidade_solicitada: parseInt(form.quantidade_solicitada),
            tipo_troca: form.tipo_troca,
            motivo_solicitacao: form.motivo_solicitacao,
            observacoes: form.observacoes || undefined
        };

        setItensAdicionados(prev => [...prev, novoItem]);
        setForm(prev => ({ ...prev, item_id: '', quantidade_solicitada: '' }));
        setSearchItem('');
    };

    const removeItem = (itemId: string) => {
        setItensAdicionados(prev => prev.filter(item => item.id !== itemId));
    };

    const updateItemField = (itemId: string, field: keyof ItemEmergencial, value: string) => {
        setItensAdicionados(prev =>
            prev.map(item =>
                item.id === itemId ? { ...item, [field]: value } : item
            )
        );
    };

    const handleSubmit = async () => {
        if (!form.base_id || !form.solicitante_id || !form.motivo_solicitacao.trim()) {
            alert('Preencha todos os campos obrigatórios');
            return;
        }

        if (itensAdicionados.length === 0) {
            alert('Adicione pelo menos um item à lista');
            return;
        }

        setLoading(true);

        try {
            let solicitacoesCriadas = 0;
            const erros: string[] = [];

            for (const item of itensAdicionados) {
                try {
                    const novaSolicitacao = await estoqueService.criarSolicitacao({
                        item_id: item.item_estoque_id,
                        solicitante_id: userId,
                        destinatario_id: form.solicitante_id,
                        base_id: form.base_id,
                        quantidade_solicitada: item.quantidade_solicitada,
                        prioridade: form.prioridade,
                        tipo_troca: item.tipo_troca,
                        motivo_solicitacao: item.motivo_solicitacao,
                        observacoes: item.observacoes
                    });

                    if (form.aprovar_automaticamente) {
                        await estoqueService.aprovarSolicitacao(
                            novaSolicitacao.id,
                            userId,
                            item.quantidade_solicitada,
                            'Solicitação emergencial aprovada automaticamente pelo almoxarife'
                        );
                    }

                    solicitacoesCriadas++;
                } catch (error) {
                    console.error(`Error creating solicitation for item "${item.nome}":`, error);
                    erros.push(`Erro ao criar solicitação para "${item.nome}"`);
                }
            }

            if (solicitacoesCriadas > 0) {
                const mensagem = form.aprovar_automaticamente
                    ? `${solicitacoesCriadas} solicitação(ões) emergencial(is) criada(s) e aprovada(s) automaticamente!`
                    : `${solicitacoesCriadas} solicitação(ões) emergencial(is) criada(s) com sucesso!`;
                alert(mensagem);
            }

            if (erros.length > 0) {
                alert(`Alguns itens tiveram erro: ${erros.join('; ')}`);
            }

            if (solicitacoesCriadas > 0) {
                handleClose();
                onSuccess();
            }
        } catch (error) {
            console.error('Error creating emergency requests:', error);
            alert('Erro ao criar solicitações emergenciais');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setForm({
            base_id: '',
            solicitante_id: '',
            item_id: '',
            quantidade_solicitada: '',
            prioridade: 'urgente',
            tipo_troca: 'fornecimento',
            motivo_solicitacao: '',
            observacoes: '',
            aprovar_automaticamente: true
        });
        setItensAdicionados([]);
        setSearchItem('');
        setSearchUser('');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-2xl z-[60]">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                                <AlertCircle className="w-6 h-6 text-red-600" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Solicitação Emergencial</h2>
                                <p className="text-sm text-gray-500">Crie uma solicitação emergencial com aprovação automática</p>
                            </div>
                        </div>
                        <button
                            onClick={handleClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Base *</label>
                        <select
                            value={form.base_id}
                            onChange={(e) => setForm(prev => ({ ...prev, base_id: e.target.value }))}
                            className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
                        >
                            <option value="">Selecione a base</option>
                            {bases.map(base => (
                                <option key={base.id} value={base.id}>
                                    {base.nome} - {base.codigo}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="text-base font-semibold text-gray-900">Adicionar Itens à Solicitação</label>
                            <div className="flex items-center gap-2">
                                <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                                    {itensAdicionados.length} itens selecionados
                                </span>
                                {itensAdicionados.length > 0 && (
                                    <button
                                        onClick={() => setItensAdicionados([])}
                                        className="px-3 py-1 text-xs text-red-600 hover:text-red-700 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
                                    >
                                        <X className="w-3 h-3 inline mr-1" />
                                        Limpar
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2 relative">
                                <label className="block text-sm font-medium text-gray-700">
                                    Item {itensEstoque.length > 0 && (
                                        <span className="text-xs text-gray-500 font-normal">
                                            ({itensEstoque.length} disponíveis)
                                        </span>
                                    )}
                                </label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                                    <input
                                        type="text"
                                        placeholder={itensEstoque.length > 0 ? "Digite para buscar..." : "Selecione uma base"}
                                        value={searchItem}
                                        onChange={(e) => setSearchItem(e.target.value)}
                                        disabled={!form.base_id}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                    />
                                    {searchItem && (
                                        <X
                                            className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 cursor-pointer hover:text-gray-600 z-10"
                                            onClick={() => {
                                                setSearchItem('');
                                                setForm(prev => ({ ...prev, item_id: '' }));
                                            }}
                                        />
                                    )}
                                </div>
                                {searchItem && filteredItems.length > 0 && (
                                    <div className="absolute left-0 right-0 z-50 max-h-60 overflow-y-auto border border-gray-300 rounded-lg bg-white shadow-xl mt-1">
                                        <div className="sticky top-0 bg-gray-50 px-3 py-2 border-b text-xs text-gray-600 font-medium">
                                            {filteredItems.length} {filteredItems.length === 1 ? 'item encontrado' : 'itens encontrados'}
                                        </div>
                                        {filteredItems.map(item => (
                                            <div
                                                key={item.id}
                                                className={`p-3 cursor-pointer hover:bg-blue-50 border-b last:border-b-0 transition-colors ${form.item_id === item.id ? 'bg-blue-100 border-l-4 border-l-blue-500' : ''
                                                    }`}
                                                onClick={() => {
                                                    setForm(prev => ({ ...prev, item_id: item.id }));
                                                    setSearchItem(item.nome);
                                                }}
                                            >
                                                <div className="font-medium text-sm text-gray-900">{item.nome}</div>
                                                <div className="text-xs text-gray-500 mt-1">
                                                    Cód: {item.codigo} | Est: {item.estoque_atual}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {searchItem && filteredItems.length === 0 && itensEstoque.length > 0 && (
                                    <div className="text-xs text-gray-500 mt-1">
                                        Nenhum item encontrado
                                    </div>
                                )}
                                {form.item_id && !searchItem && (
                                    <div className="text-sm text-blue-600 font-medium truncate">
                                        ✓ {itensEstoque.find(i => i.id === form.item_id)?.nome}
                                    </div>
                                )}
                                {!form.base_id && (
                                    <div className="text-xs text-amber-600">
                                        ⚠️ Selecione uma base
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">Quantidade</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={form.quantidade_solicitada}
                                    onChange={(e) => setForm(prev => ({ ...prev, quantidade_solicitada: e.target.value }))}
                                    placeholder="Ex: 5"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">&nbsp;</label>
                                <button
                                    onClick={addItem}
                                    disabled={!form.item_id || !form.quantidade_solicitada}
                                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                                >
                                    <Plus className="w-4 h-4" />
                                    Adicionar Item
                                </button>
                            </div>
                        </div>

                        {itensAdicionados.length > 0 && (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <Package className="w-4 h-4 text-blue-600" />
                                    <label className="text-sm font-semibold text-gray-900">Itens Selecionados</label>
                                </div>

                                <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg p-4 space-y-3">
                                    {itensAdicionados.map((item) => (
                                        <div key={item.id} className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex-1">
                                                    <div className="font-medium text-sm">{item.nome}</div>
                                                    <div className="text-xs text-gray-500">
                                                        {item.codigo} - Qtd: {item.quantidade_solicitada}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => removeItem(item.id)}
                                                    className="text-red-600 hover:text-red-700 hover:bg-red-100 p-1 rounded transition-colors"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <label className="text-xs font-medium text-gray-700">Tipo</label>
                                                    <select
                                                        value={item.tipo_troca}
                                                        onChange={(e) => updateItemField(item.id, 'tipo_troca', e.target.value)}
                                                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                                                    >
                                                        <option value="fornecimento">Fornecimento</option>
                                                        <option value="troca">Troca</option>
                                                        <option value="desconto">Desconto</option>
                                                    </select>
                                                </div>

                                                <div className="space-y-1">
                                                    <label className="text-xs font-medium text-gray-700">Motivo</label>
                                                    <input
                                                        type="text"
                                                        value={item.motivo_solicitacao}
                                                        onChange={(e) => updateItemField(item.id, 'motivo_solicitacao', e.target.value)}
                                                        placeholder="Motivo específico..."
                                                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                                                    />
                                                </div>
                                            </div>

                                            <div className="mt-3 space-y-1">
                                                <label className="text-xs font-medium text-gray-700">Observações (opcional)</label>
                                                <input
                                                    type="text"
                                                    value={item.observacoes || ''}
                                                    onChange={(e) => updateItemField(item.id, 'observacoes', e.target.value)}
                                                    placeholder="Observações adicionais..."
                                                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="space-y-2 relative">
                        <label className="block text-sm font-medium text-gray-700">Funcionário *</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                            <input
                                type="text"
                                placeholder="Digite para buscar funcionário..."
                                value={searchUser}
                                onChange={(e) => setSearchUser(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
                            />
                            {searchUser && (
                                <X
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 cursor-pointer hover:text-gray-600 z-10"
                                    onClick={() => {
                                        setSearchUser('');
                                        setForm(prev => ({ ...prev, solicitante_id: '' }));
                                    }}
                                />
                            )}
                        </div>
                        {searchUser && filteredUsers.length > 0 && (
                            <div className="absolute left-0 right-0 z-50 max-h-60 overflow-y-auto border border-gray-300 rounded-lg bg-white shadow-xl mt-1">
                                {filteredUsers.map(usuario => (
                                    <div
                                        key={usuario.id}
                                        className={`p-3 cursor-pointer hover:bg-blue-50 border-b last:border-b-0 transition-colors ${form.solicitante_id === usuario.id ? 'bg-blue-100 border-l-4 border-l-blue-500' : ''
                                            }`}
                                        onClick={() => {
                                            setForm(prev => ({ ...prev, solicitante_id: usuario.id }));
                                            setSearchUser(usuario.nome);
                                        }}
                                    >
                                        <div className="font-medium text-sm text-gray-900">
                                            {usuario.nome} {usuario.id === userId ? '(Você mesmo)' : ''}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1">
                                            {usuario.matricula ? `Mat: ${usuario.matricula}` : 'Funcionário'}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {form.solicitante_id && !searchUser && (
                            <div className="text-sm text-blue-600 font-medium truncate">
                                ✓ {usuarios.find(u => u.id === form.solicitante_id)?.nome}
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Prioridade</label>
                            <select
                                value={form.prioridade}
                                onChange={(e) => setForm(prev => ({ ...prev, prioridade: e.target.value as any }))}
                                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
                            >
                                <option value="urgente">🔴 Urgente</option>
                                <option value="alta">🟡 Alta</option>
                                <option value="normal">🟢 Normal</option>
                                <option value="baixa">⚪ Baixa</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Tipo</label>
                            <select
                                value={form.tipo_troca}
                                onChange={(e) => setForm(prev => ({ ...prev, tipo_troca: e.target.value as any }))}
                                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
                            >
                                <option value="fornecimento">Fornecimento</option>
                                <option value="troca">Troca</option>
                                <option value="desconto">Desconto</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Motivo da Solicitação *</label>
                        <textarea
                            value={form.motivo_solicitacao}
                            onChange={(e) => setForm(prev => ({ ...prev, motivo_solicitacao: e.target.value }))}
                            placeholder="Descreva o motivo da solicitação emergencial..."
                            rows={3}
                            className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Observações</label>
                        <textarea
                            value={form.observacoes}
                            onChange={(e) => setForm(prev => ({ ...prev, observacoes: e.target.value }))}
                            placeholder="Observações adicionais..."
                            rows={2}
                            className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="aprovar_automaticamente"
                            checked={form.aprovar_automaticamente}
                            onChange={(e) => setForm(prev => ({ ...prev, aprovar_automaticamente: e.target.checked }))}
                            className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                        />
                        <label htmlFor="aprovar_automaticamente" className="text-sm font-medium text-gray-700">
                            ⚡ Aprovar automaticamente (solicitação emergencial)
                        </label>
                    </div>
                </div>

                <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 rounded-b-2xl">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                                {itensAdicionados.length} itens selecionados
                            </span>
                            {form.aprovar_automaticamente && (
                                <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                                    Aprovação automática
                                </span>
                            )}
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={handleClose}
                                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={loading || itensAdicionados.length === 0 || !form.solicitante_id || !form.base_id || !form.motivo_solicitacao.trim()}
                                className="px-6 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Processando...
                                    </>
                                ) : (
                                    <>
                                        <AlertCircle className="w-4 h-4" />
                                        Criar Solicitações ({itensAdicionados.length} itens)
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
