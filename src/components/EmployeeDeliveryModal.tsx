import { useState, useEffect, useMemo } from 'react';
import { X, Search, Plus, Trash2, Users, Package } from 'lucide-react';
import { userService } from '../services/userService';
import { baseService } from '../services/baseService';
import { catalogoService } from '../services/catalogoService';
import { estoqueService } from '../services/estoqueService';
import { moduloPredefinidoService } from '../services/moduloPredefinidoService';
import { useUnifiedPermissions } from '../hooks/useUnifiedPermissions';
import type { User } from '../types';

interface Base {
    id: string;
    nome: string;
    codigo?: string;
    ativa?: boolean;
}

interface EmployeeDeliveryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    userId: string;
}

interface ItemModulo {
    id: string;
    item_estoque_id?: string;
    nome: string;
    codigo: string;
    quantidade_padrao: number;
    quantidade_solicitada: number;
    obrigatorio: boolean;
    ordem: number;
    grupo_item_id?: string;
    grupo_item?: {
        id: string;
        nome_grupo: string;
        variacoes?: Array<{
            id: string;
            nome_variacao: string;
            item_estoque_id: string;
        }>;
    };
    variacao_selecionada?: string;
}

interface ItemIndividual {
    id: string;
    item_estoque_id: string;
    nome: string;
    codigo: string;
    quantidade_solicitada: number;
    grupo_item_id?: string;
    variacao_selecionada?: string;
}


export default function EmployeeDeliveryModal({ isOpen, onClose, onSuccess, userId }: EmployeeDeliveryModalProps) {
    const { userBases } = useUnifiedPermissions();
    const [submitting, setSubmitting] = useState(false);

    // Data States
    const [funcionarios, setFuncionarios] = useState<User[]>([]);
    const [bases, setBases] = useState<Base[]>([]);
    const [modulosPredefinidos, setModulosPredefinidos] = useState<any[]>([]);
    const [itensEstoque, setItensEstoque] = useState<any[]>([]);

    // Search States
    const [searchFuncionario, setSearchFuncionario] = useState('');
    const [searchItem, setSearchItem] = useState('');

    // Form States
    const [form, setForm] = useState({
        funcionario_id: '',
        base_id: '',
        modulo_predefinido_id: '',
        observacoes: ''
    });

    // Items States
    const [itensModulo, setItensModulo] = useState<ItemModulo[]>([]);
    const [itensIndividuais, setItensIndividuais] = useState<ItemIndividual[]>([]);

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
            const [funcionariosData, basesData, modulosData] = await Promise.all([
                userService.getUsuariosAtivos(),
                baseService.getBasesAtivas(),
                moduloPredefinidoService.getModulosPredefinidos()
            ]);

            setFuncionarios(funcionariosData);
            
            // Filtrar bases por acesso do usuário via usuario_bases
            const basesComAcesso = basesData.filter(base => 
                userBases.some(ub => ub.base_id === base.id && ub.ativo)
            );
            
            setBases(basesComAcesso);
            setModulosPredefinidos(modulosData);
        } catch (error) {
            console.error('Error loading data:', error);
            alert('Erro ao carregar dados');
        }
    };

    const loadItensEstoque = async (baseId: string) => {
        try {
            const items = await catalogoService.getItensCatalogoComEstoque(baseId);
            setItensEstoque(items);
        } catch (error) {
            console.error('Error loading items:', error);
            alert('Erro ao carregar itens da base');
        }
    };

    const loadItensModulo = async (moduloId: string) => {
        try {
            const modulos = await moduloPredefinidoService.getModulosPredefinidos();
            const modulo = modulos.find(m => m.id === moduloId);
            if (modulo && modulo.itens) {
                const itensComQuantidade = modulo.itens.map((item: any) => ({
                    id: item.id,
                    item_estoque_id: item.item_estoque_id,
                    nome: item.item?.[0]?.nome || item.item?.nome || 'Item',
                    codigo: item.item?.[0]?.codigo || item.item?.codigo || '',
                    quantidade_padrao: item.quantidade_padrao || 1,
                    quantidade_solicitada: item.quantidade_padrao || 1,
                    obrigatorio: false,
                    ordem: 0
                }));
                setItensModulo(itensComQuantidade);
            }
        } catch (error) {
            console.error('Error loading module items:', error);
            alert('Erro ao carregar itens do módulo');
        }
    };


    const filteredFuncionarios = useMemo(() => {
        if (!searchFuncionario) return [];
        const term = searchFuncionario.toLowerCase();
        return funcionarios.filter(f =>
            f.nome.toLowerCase().includes(term) ||
            f.matricula?.toLowerCase().includes(term)
        );
    }, [funcionarios, searchFuncionario]);

    const filteredModulos = useMemo(() => {
        return modulosPredefinidos;
    }, [modulosPredefinidos]);

    const filteredItensEstoque = useMemo(() => {
        if (!searchItem) return [];
        const term = searchItem.toLowerCase();
        return itensEstoque.filter(item =>
            item.nome?.toLowerCase().includes(term) ||
            item.codigo?.toLowerCase().includes(term)
        );
    }, [itensEstoque, searchItem]);


    const handleSelecionarFuncionario = (funcionarioId: string) => {
        setForm(prev => ({ ...prev, funcionario_id: funcionarioId }));
        setSearchFuncionario('');
    };

    const handleModuloChange = async (moduloId: string) => {
        setForm(prev => ({ ...prev, modulo_predefinido_id: moduloId }));
        if (moduloId) {
            await loadItensModulo(moduloId);
        } else {
            setItensModulo([]);
        }
    };

    const alterarQuantidadeItemModulo = (itemId: string, novaQuantidade: number) => {
        if (novaQuantidade < 0) return;
        setItensModulo(prev =>
            prev.map(item =>
                item.id === itemId ? { ...item, quantidade_solicitada: novaQuantidade } : item
            )
        );
    };

    const removerItemModulo = (itemId: string) => {
        setItensModulo(prev => prev.filter(item => item.id !== itemId));
    };

    const adicionarItemIndividual = (item: any) => {
        const jaAdicionado = itensIndividuais.find(i => i.item_estoque_id === item.id);
        if (jaAdicionado) {
            alert('Este item já foi adicionado');
            return;
        }

        const novoItem: ItemIndividual = {
            id: `individual_${Date.now()}_${Math.random()}`,
            item_estoque_id: item.id,
            nome: item.nome,
            codigo: item.codigo,
            quantidade_solicitada: 1
        };

        setItensIndividuais(prev => [...prev, novoItem]);
        setSearchItem('');
    };


    const alterarQuantidadeItemIndividual = (itemId: string, novaQuantidade: number) => {
        if (novaQuantidade < 1) return;
        setItensIndividuais(prev =>
            prev.map(item =>
                item.id === itemId ? { ...item, quantidade_solicitada: novaQuantidade } : item
            )
        );
    };

    const removerItemIndividual = (itemId: string) => {
        setItensIndividuais(prev => prev.filter(item => item.id !== itemId));
    };


    const handleSubmit = async () => {
        if (!form.funcionario_id || !form.base_id) {
            alert('Preencha todos os campos obrigatórios');
            return;
        }

        if (itensModulo.length === 0 && itensIndividuais.length === 0) {
            alert('Adicione pelo menos um item');
            return;
        }

        setSubmitting(true);

        try {
            const todoItens = [...itensModulo, ...itensIndividuais];

            for (const item of todoItens) {
                const itemEstoqueId = item.item_estoque_id;
                if (!itemEstoqueId) continue;

                await estoqueService.criarSolicitacao({
                    item_id: itemEstoqueId,
                    solicitante_id: userId,
                    destinatario_id: form.funcionario_id,
                    base_id: form.base_id,
                    quantidade_solicitada: item.quantidade_solicitada,
                    prioridade: 'normal',
                    tipo_troca: 'fornecimento',
                    motivo_solicitacao: 'Entrega para novo funcionário',
                    observacoes: form.observacoes
                });
            }

            alert('Solicitações criadas com sucesso!');
            handleClose();
            onSuccess();
        } catch (error) {
            console.error('Error creating requests:', error);
            alert('Erro ao criar solicitações');
        } finally {
            setSubmitting(false);
        }
    };

    const handleClose = () => {
        setForm({
            funcionario_id: '',
            base_id: '',
            modulo_predefinido_id: '',
            observacoes: ''
        });
        setItensModulo([]);
        setItensIndividuais([]);
        setSearchFuncionario('');
        setSearchItem('');
        onClose();
    };

    if (!isOpen) return null;

    const funcionarioSelecionado = funcionarios.find(f => f.id === form.funcionario_id);
    const totalItens = itensModulo.length + itensIndividuais.length;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-2xl z-[60]">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                                <Users className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Entrega para Novo Funcionário</h2>
                                <p className="text-sm text-gray-500">Crie um grupo de entrega com itens pré-definidos</p>
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
                    {/* Seção 1: Funcionário */}
                    <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                                Funcionário <span className="text-red-600">*</span>
                            </label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                                <input
                                    type="text"
                                    placeholder="Digite para buscar..."
                                    value={searchFuncionario}
                                    onChange={(e) => setSearchFuncionario(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            {searchFuncionario && filteredFuncionarios.length > 0 && (
                                <div className="absolute z-50 max-h-80 overflow-y-auto border border-gray-300 rounded-lg bg-white shadow-xl mt-1 w-full">
                                    {filteredFuncionarios.map(funcionario => (
                                        <div
                                            key={funcionario.id}
                                            className={`p-4 cursor-pointer hover:bg-blue-50 border-b last:border-b-0 ${
                                                form.funcionario_id === funcionario.id ? 'bg-blue-100' : ''
                                            }`}
                                            onClick={() => handleSelecionarFuncionario(funcionario.id)}
                                        >
                                            <div className="font-medium text-sm break-words">{funcionario.nome}</div>
                                            <div className="text-xs text-gray-500 mt-1">
                                                {funcionario.matricula ? `Mat: ${funcionario.matricula}` : 'Funcionário'}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {funcionarioSelecionado && !searchFuncionario && (
                                <div className="text-sm text-blue-600 font-medium">
                                    ✓ {funcionarioSelecionado.nome}
                                </div>
                            )}
                        </div>

                    {/* Seção 2: Base */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                            Base <span className="text-red-600">*</span>
                        </label>
                        <select
                            value={form.base_id}
                            onChange={(e) => setForm(prev => ({ ...prev, base_id: e.target.value }))}
                            className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Selecione a base</option>
                            {bases.map(base => (
                                <option key={base.id} value={base.id}>{base.nome}</option>
                            ))}
                        </select>
                    </div>

                    {/* Seção 3: Módulo Pré-definido */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                            Módulo Pré-definido <span className="text-red-600">*</span>
                        </label>
                        <select
                            value={form.modulo_predefinido_id}
                            onChange={(e) => handleModuloChange(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Selecione o módulo</option>
                            {filteredModulos.map(modulo => (
                                <option key={modulo.id} value={modulo.id}>
                                    {modulo.nome_modulo} ({modulo.total_itens || 0} itens)
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Lista de Itens do Módulo */}
                    {itensModulo.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <Package className="w-5 h-5 text-blue-600" />
                                <label className="text-base font-semibold text-gray-900">
                                    Itens do Módulo ({itensModulo.length})
                                </label>
                            </div>
                            <div className="max-h-80 overflow-y-auto space-y-2">
                                {itensModulo.map(item => (
                                    <div key={item.id} className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <div className="font-medium text-sm">{item.nome}</div>
                                                <div className="text-xs text-gray-500">
                                                    {item.codigo} {item.obrigatorio && <span className="text-red-600">• Obrigatório</span>}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => alterarQuantidadeItemModulo(item.id, item.quantidade_solicitada - 1)}
                                                    disabled={item.quantidade_solicitada <= 0}
                                                    className="w-8 h-8 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                                                >
                                                    -
                                                </button>
                                                <span className="w-12 text-center font-bold">{item.quantidade_solicitada}</span>
                                                <button
                                                    onClick={() => alterarQuantidadeItemModulo(item.id, item.quantidade_solicitada + 1)}
                                                    className="w-8 h-8 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                                                >
                                                    +
                                                </button>
                                                {!item.obrigatorio && (
                                                    <button
                                                        onClick={() => removerItemModulo(item.id)}
                                                        className="ml-2 text-red-600 hover:text-red-700"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Seção 4: Itens Individuais */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <Plus className="w-5 h-5 text-blue-600" />
                            <label className="text-base font-semibold text-gray-900">Itens Individuais (Opcional)</label>
                        </div>

                        {/* Buscar Item */}
                        <div className="space-y-2">
                                <label className="text-xs font-medium text-gray-700">Buscar Item Individual</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Digite para buscar..."
                                        value={searchItem}
                                        onChange={(e) => setSearchItem(e.target.value)}
                                        disabled={!form.base_id}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                                    />
                                </div>
                                {searchItem && filteredItensEstoque.length > 0 && (
                                    <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-lg bg-white shadow-xl">
                                        {filteredItensEstoque.map(item => (
                                            <div
                                                key={item.id}
                                                className="p-2 cursor-pointer hover:bg-gray-50 border-b last:border-b-0"
                                                onClick={() => adicionarItemIndividual(item)}
                                            >
                                                <div className="text-sm font-medium">{item.nome}</div>
                                                <div className="text-xs text-gray-500">Código: {item.codigo}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                        {/* Lista de Itens Individuais */}
                        {itensIndividuais.length > 0 && (
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-900">
                                    Itens Adicionados ({itensIndividuais.length})
                                </label>
                                <div className="max-h-64 overflow-y-auto space-y-2">
                                    {itensIndividuais.map(item => (
                                        <div key={item.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <div className="font-medium text-sm">{item.nome}</div>
                                                    <div className="text-xs text-gray-500">Código: {item.codigo}</div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => alterarQuantidadeItemIndividual(item.id, item.quantidade_solicitada - 1)}
                                                        disabled={item.quantidade_solicitada <= 1}
                                                        className="w-8 h-8 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                                                    >
                                                        -
                                                    </button>
                                                    <span className="w-12 text-center font-bold">{item.quantidade_solicitada}</span>
                                                    <button
                                                        onClick={() => alterarQuantidadeItemIndividual(item.id, item.quantidade_solicitada + 1)}
                                                        className="w-8 h-8 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                                                    >
                                                        +
                                                    </button>
                                                    <button
                                                        onClick={() => removerItemIndividual(item.id)}
                                                        className="ml-2 text-red-600 hover:text-red-700"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Observações */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Observações</label>
                        <textarea
                            value={form.observacoes}
                            onChange={(e) => setForm(prev => ({ ...prev, observacoes: e.target.value }))}
                            placeholder="Observações sobre a entrega..."
                            rows={3}
                            className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 rounded-b-2xl">
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                            <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                                {totalItens} itens selecionados
                            </span>
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
                                disabled={submitting || !form.funcionario_id || !form.base_id || totalItens === 0}
                                className="px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                            >
                                {submitting ? (
                                    <>Processando...</>
                                ) : (
                                    <>
                                        <Users className="w-4 h-4" />
                                        Criar Solicitações ({totalItens} itens)
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
