import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { estoqueService } from '../services/estoqueService';
import { ArrowLeft, Search, Package, User, Loader2, AlertCircle, CheckCircle, Trash2, Plus, FileText } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { discountOrderService } from '../services/discountOrderService';

interface Funcionario {
    id: string;
    nome: string;
    matricula?: string;
    cpf?: string;
}

interface ItemInventario {
    id: string;
    item_estoque_id: string;
    quantidade: number;
    data_entrega: string;
    item_estoque: {
        nome: string;
        codigo: string;
        categoria: string;
    };
}

interface ItemSelecionado {
    id: string;
    item_estoque_id?: string;
    nome: string;
    codigo?: string;
    quantidade: number;
    source: 'inventario' | 'base';
}

interface ItemEstoque {
    id: string;
    nome: string;
    codigo: string;
    categoria: string;
    estoque_atual: number;
}

interface DevolucaoPageProps {
    onBack: () => void;
}

export default function DevolucaoPage({ onBack }: DevolucaoPageProps) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [searchFuncionario, setSearchFuncionario] = useState('');
    const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
    const [selectedFuncionario, setSelectedFuncionario] = useState<Funcionario | null>(null);
    const [showFuncionarioList, setShowFuncionarioList] = useState(false);
    const [inventarioFuncionario, setInventarioFuncionario] = useState<ItemInventario[]>([]);
    const [selectedItems, setSelectedItems] = useState<ItemSelecionado[]>([]);
    const [condicao, setCondicao] = useState<'bom' | 'danificado' | 'reteste' | 'perdido' | 'desgaste'>('bom');
    const [observacoes, setObservacoes] = useState('');
    
    // Busca de item individual
    const [showItemSearch, setShowItemSearch] = useState(false);
    const [searchItem, setSearchItem] = useState('');
    const [itensDisponiveis, setItensDisponiveis] = useState<ItemEstoque[]>([]);
    const [showItemList, setShowItemList] = useState(false);
    
    // Ordem de desconto
    const [gerarOrdemDesconto, setGerarOrdemDesconto] = useState(false);
    const [valorDesconto, setValorDesconto] = useState('');
    const [parcelasDesconto, setParcelasDesconto] = useState('1');

    useEffect(() => {
        if (searchFuncionario.length >= 2) {
            searchFuncionarios();
        } else {
            setFuncionarios([]);
            setShowFuncionarioList(false);
        }
    }, [searchFuncionario]);

    useEffect(() => {
        if (selectedFuncionario) {
            loadInventarioFuncionario();
        }
    }, [selectedFuncionario]);

    useEffect(() => {
        if (searchItem.length >= 2) {
            searchItensEstoque();
        } else {
            setItensDisponiveis([]);
            setShowItemList(false);
        }
    }, [searchItem]);

    const searchFuncionarios = async () => {
        try {
            const { data, error } = await supabase
                .from('usuarios')
                .select('id, nome, matricula, cpf')
                .or(`nome.ilike.%${searchFuncionario}%,matricula.ilike.%${searchFuncionario}%,cpf.ilike.%${searchFuncionario}%`)
                .eq('ativo', true)
                .limit(10);

            if (error) throw error;
            setFuncionarios(data || []);
            setShowFuncionarioList(true);
        } catch (error) {
            console.error('Erro ao buscar funcionários:', error);
        }
    };

    const loadInventarioFuncionario = async () => {
        if (!selectedFuncionario) return;

        try {
            const { data, error } = await supabase
                .from('inventario_funcionario')
                .select(`
                    id,
                    item_estoque_id,
                    quantidade,
                    data_entrega,
                    item_estoque:itens_estoque(nome, codigo, categoria)
                `)
                .eq('funcionario_id', selectedFuncionario.id)
                .eq('status', 'em_uso');

            if (error) throw error;
            
            // Transformar dados para o formato correto
            const inventarioFormatado = (data || []).map((item: any) => ({
                id: item.id,
                item_estoque_id: item.item_estoque_id,
                quantidade: item.quantidade,
                data_entrega: item.data_entrega,
                item_estoque: Array.isArray(item.item_estoque) ? item.item_estoque[0] : item.item_estoque
            }));
            
            setInventarioFuncionario(inventarioFormatado);
        } catch (error) {
            console.error('Erro ao carregar inventário:', error);
        }
    };

    const handleSelectFuncionario = (funcionario: Funcionario) => {
        setSelectedFuncionario(funcionario);
        setSearchFuncionario(funcionario.nome);
        setShowFuncionarioList(false);
        setSelectedItems([]);
    };

    const handleToggleItem = (item: ItemInventario) => {
        const itemId = item.id;
        const isSelected = selectedItems.some(i => i.id === itemId);

        if (isSelected) {
            setSelectedItems(selectedItems.filter(i => i.id !== itemId));
        } else {
            setSelectedItems([
                ...selectedItems,
                {
                    id: item.id,
                    item_estoque_id: item.item_estoque_id,
                    nome: item.item_estoque.nome,
                    codigo: item.item_estoque.codigo,
                    quantidade: item.quantidade,
                    source: 'inventario'
                }
            ]);
        }
    };

    const handleRemoveItem = (itemId: string) => {
        setSelectedItems(selectedItems.filter(i => i.id !== itemId));
    };

    const searchItensEstoque = async () => {
        try {
            const { data, error } = await supabase
                .from('itens_estoque')
                .select('id, nome, codigo, categoria, estoque_atual')
                .or(`nome.ilike.%${searchItem}%,codigo.ilike.%${searchItem}%`)
                .gt('estoque_atual', 0)
                .limit(10);

            if (error) throw error;
            setItensDisponiveis(data || []);
            setShowItemList(true);
        } catch (error) {
            console.error('Erro ao buscar itens:', error);
        }
    };

    const handleAddItemIndividual = (item: ItemEstoque, quantidade: number) => {
        if (quantidade <= 0 || quantidade > item.estoque_atual) {
            alert('Quantidade inválida');
            return;
        }

        setSelectedItems([
            ...selectedItems,
            {
                id: item.id,
                item_estoque_id: item.id,
                nome: item.nome,
                codigo: item.codigo,
                quantidade: quantidade,
                source: 'base'
            }
        ]);

        setSearchItem('');
        setShowItemSearch(false);
        setShowItemList(false);
    };

    const handleProcessarDevolucao = async () => {
        if (!selectedFuncionario || selectedItems.length === 0) {
            alert('Selecione um funcionário e pelo menos um item');
            return;
        }

        if (!observacoes && (condicao === 'danificado' || condicao === 'perdido' || condicao === 'reteste')) {
            alert('Observações são obrigatórias para itens danificados, perdidos ou em reteste');
            return;
        }

        if (gerarOrdemDesconto && !valorDesconto) {
            alert('Informe o valor do desconto');
            return;
        }

        setLoading(true);
        try {
            // Processar devolução
            await estoqueService.processarDevolucao(
                selectedFuncionario.id,
                selectedItems,
                condicao,
                observacoes,
                user?.id || ''
            );

            // Gerar ordem de desconto se solicitado
            if (gerarOrdemDesconto && valorDesconto && (condicao === 'danificado' || condicao === 'perdido')) {
                try {
                    const valorTotal = parseFloat(valorDesconto);
                    const parcelas = parseInt(parcelasDesconto) || 1;

                    // Buscar dados do funcionário
                    const { data: funcionario } = await supabase
                        .from('usuarios')
                        .select('nome, cargo, matricula, cpf, base_id')
                        .eq('id', selectedFuncionario.id)
                        .single();

                    if (!funcionario?.cpf) {
                        throw new Error('CPF do funcionário não encontrado');
                    }

                    const itemsDescription = selectedItems.map(i => `${i.nome} (Qtd: ${i.quantidade})`).join(', ');
                    const primeiroItem = selectedItems[0];

                    const result = await discountOrderService.createOrderViaAPI({
                        employeeName: funcionario.nome,
                        employeeFunction: funcionario.cargo || '',
                        employeeRegistration: funcionario.matricula || '',
                        employeeCpf: funcionario.cpf,
                        itemName: primeiroItem.nome,
                        itemCode: primeiroItem.codigo || '',
                        value: valorTotal,
                        date: new Date().toISOString().split('T')[0],
                        reason: `Devolução - ${getCondicaoLabel(condicao)}`,
                        observations: `${itemsDescription}\n\n${observacoes}`,
                        funcionarioId: selectedFuncionario.id,
                        baseId: funcionario.base_id || '',
                        criadoPor: user?.id || '',
                        parcelas: parcelas
                    });

                    console.log('✅ Ordem de desconto gerada:', result.orderId);
                    alert(`Devolução processada com sucesso!\n\nOrdem de desconto #${result.orderId} gerada.`);
                } catch (ordemError) {
                    console.error('❌ Erro ao gerar ordem de desconto:', ordemError);
                    alert(`Devolução processada, mas erro ao gerar ordem de desconto: ${ordemError instanceof Error ? ordemError.message : 'Erro desconhecido'}`);
                }
            } else {
                alert('Devolução processada com sucesso!');
            }
            
            // Resetar formulário
            setSelectedFuncionario(null);
            setSearchFuncionario('');
            setSelectedItems([]);
            setCondicao('bom');
            setObservacoes('');
            setInventarioFuncionario([]);
            setGerarOrdemDesconto(false);
            setValorDesconto('');
            setParcelasDesconto('1');
        } catch (error) {
            console.error('Erro ao processar devolução:', error);
            alert(`Erro ao processar devolução: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        } finally {
            setLoading(false);
        }
    };

    const getCondicaoColor = (cond: string) => {
        switch (cond) {
            case 'bom': return 'bg-green-100 text-green-800 border-green-200';
            case 'desgaste': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'danificado': return 'bg-red-100 text-red-800 border-red-200';
            case 'reteste': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'perdido': return 'bg-gray-100 text-gray-800 border-gray-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getCondicaoLabel = (cond: string) => {
        switch (cond) {
            case 'bom': return 'Bom Estado';
            case 'desgaste': return 'Desgaste Natural';
            case 'danificado': return 'Danificado';
            case 'reteste': return 'Reteste';
            case 'perdido': return 'Perdido';
            default: return cond;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                <div className="mb-6 flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-100 rounded-lg">
                            <Package className="h-8 w-8 text-orange-600" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Devolução de Material</h1>
                            <p className="text-gray-600">Processar devolução de itens de funcionários</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        {/* Buscar Funcionário */}
                        <div className="bg-white rounded-lg shadow-sm p-6">
                            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <User className="w-5 h-5" />
                                1. Selecionar Funcionário
                            </h2>

                            <div className="relative">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="text"
                                        value={searchFuncionario}
                                        onChange={(e) => setSearchFuncionario(e.target.value)}
                                        placeholder="Digite nome, matrícula ou CPF..."
                                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                    />
                                </div>

                                {showFuncionarioList && funcionarios.length > 0 && (
                                    <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                                        {funcionarios.map(func => (
                                            <button
                                                key={func.id}
                                                onClick={() => handleSelectFuncionario(func)}
                                                className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b last:border-b-0 transition-colors"
                                            >
                                                <div className="font-medium">{func.nome}</div>
                                                <div className="text-sm text-gray-600">
                                                    {func.matricula && `Mat: ${func.matricula}`}
                                                    {func.cpf && ` | CPF: ${func.cpf}`}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {selectedFuncionario && (
                                <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="font-semibold text-gray-900">{selectedFuncionario.nome}</div>
                                            <div className="text-sm text-gray-600">
                                                {selectedFuncionario.matricula && `Matrícula: ${selectedFuncionario.matricula}`}
                                            </div>
                                        </div>
                                        <CheckCircle className="w-6 h-6 text-green-600" />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Inventário do Funcionário */}
                        {selectedFuncionario && (
                            <div className="bg-white rounded-lg shadow-sm p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-lg font-semibold flex items-center gap-2">
                                        <Package className="w-5 h-5" />
                                        2. Selecionar Itens para Devolução
                                    </h2>
                                    <button
                                        onClick={() => setShowItemSearch(!showItemSearch)}
                                        className="flex items-center gap-2 px-3 py-2 text-sm bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Adicionar Item Individual
                                    </button>
                                </div>

                                {/* Busca de Item Individual */}
                                {showItemSearch && (
                                    <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                        <h3 className="text-sm font-medium mb-2">Buscar Item da Base</h3>
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <input
                                                type="text"
                                                value={searchItem}
                                                onChange={(e) => setSearchItem(e.target.value)}
                                                placeholder="Digite o nome ou código do item..."
                                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                                            />
                                        </div>

                                        {showItemList && itensDisponiveis.length > 0 && (
                                            <div className="mt-2 max-h-48 overflow-y-auto space-y-2">
                                                {itensDisponiveis.map(item => (
                                                    <div key={item.id} className="p-3 bg-white border border-gray-200 rounded-lg">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex-1">
                                                                <div className="font-medium text-sm">{item.nome}</div>
                                                                <div className="text-xs text-gray-600">
                                                                    Código: {item.codigo} | Estoque: {item.estoque_atual}
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <input
                                                                    type="number"
                                                                    min="1"
                                                                    max={item.estoque_atual}
                                                                    defaultValue="1"
                                                                    className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                                                                    id={`qty-${item.id}`}
                                                                />
                                                                <button
                                                                    onClick={() => {
                                                                        const input = document.getElementById(`qty-${item.id}`) as HTMLInputElement;
                                                                        handleAddItemIndividual(item, parseInt(input.value) || 1);
                                                                    }}
                                                                    className="px-3 py-1 bg-orange-600 text-white rounded text-sm hover:bg-orange-700"
                                                                >
                                                                    Adicionar
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {inventarioFuncionario.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500">
                                        <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                        <p>Nenhum item em uso por este funcionário</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {inventarioFuncionario.map(item => {
                                            const isSelected = selectedItems.some(i => i.id === item.id);
                                            return (
                                                <div
                                                    key={item.id}
                                                    onClick={() => handleToggleItem(item)}
                                                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                                                        isSelected
                                                            ? 'border-orange-500 bg-orange-50'
                                                            : 'border-gray-200 hover:border-gray-300 bg-white'
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex-1">
                                                            <div className="font-medium text-gray-900">
                                                                {item.item_estoque.nome}
                                                            </div>
                                                            <div className="text-sm text-gray-600">
                                                                Código: {item.item_estoque.codigo} | 
                                                                Quantidade: {item.quantidade} | 
                                                                Categoria: {item.item_estoque.categoria}
                                                            </div>
                                                            <div className="text-xs text-gray-500 mt-1">
                                                                Entregue em: {new Date(item.data_entrega).toLocaleDateString('pt-BR')}
                                                            </div>
                                                        </div>
                                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                                                            isSelected
                                                                ? 'border-orange-500 bg-orange-500'
                                                                : 'border-gray-300'
                                                        }`}>
                                                            {isSelected && (
                                                                <CheckCircle className="w-4 h-4 text-white" />
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Detalhes da Devolução */}
                        {selectedItems.length > 0 && (
                            <div className="bg-white rounded-lg shadow-sm p-6">
                                <h2 className="text-lg font-semibold mb-4">3. Detalhes da Devolução</h2>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Condição do Item *</label>
                                        <select
                                            value={condicao}
                                            onChange={(e) => setCondicao(e.target.value as any)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                        >
                                            <option value="bom">Bom Estado (retorna ao estoque)</option>
                                            <option value="desgaste">Desgaste Natural</option>
                                            <option value="danificado">Danificado</option>
                                            <option value="reteste">Reteste</option>
                                            <option value="perdido">Perdido</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-2">
                                            Observações {(condicao !== 'bom') && '*'}
                                        </label>
                                        <textarea
                                            value={observacoes}
                                            onChange={(e) => setObservacoes(e.target.value)}
                                            rows={4}
                                            placeholder="Descreva o estado do item, motivo da devolução, etc..."
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                        />
                                    </div>

                                    {condicao === 'bom' && (
                                        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                                            <div className="flex items-start gap-2">
                                                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                                                <div className="text-sm text-green-800">
                                                    <strong>Item em bom estado:</strong> Será automaticamente retornado ao estoque após a devolução.
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {condicao === 'reteste' && (
                                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                            <div className="flex items-start gap-2">
                                                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                                                <div className="text-sm text-blue-800">
                                                    <strong>Item para reteste:</strong> Será enviado para análise e reteste antes de retornar ao estoque.
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {(condicao === 'danificado' || condicao === 'perdido') && (
                                        <>
                                            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                                                <div className="flex items-start gap-2">
                                                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                                                    <div className="text-sm text-red-800">
                                                        <strong>Atenção:</strong> Pode ser necessário gerar ordem de desconto para este item.
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Ordem de Desconto */}
                                            <div className="border border-gray-200 rounded-lg p-4">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <input
                                                        type="checkbox"
                                                        id="gerarOrdem"
                                                        checked={gerarOrdemDesconto}
                                                        onChange={(e) => setGerarOrdemDesconto(e.target.checked)}
                                                        className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                                                    />
                                                    <label htmlFor="gerarOrdem" className="flex items-center gap-2 font-medium text-sm cursor-pointer">
                                                        <FileText className="w-4 h-4" />
                                                        Gerar Ordem de Desconto
                                                    </label>
                                                </div>

                                                {gerarOrdemDesconto && (
                                                    <div className="space-y-3 ml-6">
                                                        <div>
                                                            <label className="block text-sm font-medium mb-1">Valor Total do Desconto *</label>
                                                            <input
                                                                type="number"
                                                                value={valorDesconto}
                                                                onChange={(e) => setValorDesconto(e.target.value)}
                                                                placeholder="0.00"
                                                                step="0.01"
                                                                min="0"
                                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-medium mb-1">Número de Parcelas</label>
                                                            <input
                                                                type="number"
                                                                value={parcelasDesconto}
                                                                onChange={(e) => setParcelasDesconto(e.target.value)}
                                                                min="1"
                                                                max="12"
                                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                                            />
                                                        </div>
                                                        {valorDesconto && parcelasDesconto && (
                                                            <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                                                                Valor por parcela: R$ {(parseFloat(valorDesconto) / parseInt(parcelasDesconto)).toFixed(2)}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Resumo */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-lg shadow-sm p-6 sticky top-6">
                            <h2 className="text-lg font-semibold mb-4">Resumo da Devolução</h2>

                            <div className="space-y-4">
                                <div>
                                    <div className="text-sm text-gray-600 mb-1">Funcionário</div>
                                    <div className="font-medium">
                                        {selectedFuncionario ? selectedFuncionario.nome : 'Não selecionado'}
                                    </div>
                                </div>

                                <div>
                                    <div className="text-sm text-gray-600 mb-1">Itens Selecionados</div>
                                    <div className="font-medium text-2xl text-orange-600">
                                        {selectedItems.length}
                                    </div>
                                </div>

                                {selectedItems.length > 0 && (
                                    <>
                                        <div>
                                            <div className="text-sm text-gray-600 mb-2">Condição</div>
                                            <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${getCondicaoColor(condicao)}`}>
                                                {getCondicaoLabel(condicao)}
                                            </div>
                                        </div>

                                        <div className="border-t pt-4">
                                            <div className="text-sm font-medium mb-2">Itens:</div>
                                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                                {selectedItems.map(item => (
                                                    <div key={item.id} className="flex items-start justify-between p-2 bg-gray-50 rounded text-sm">
                                                        <div className="flex-1">
                                                            <div className="font-medium">{item.nome}</div>
                                                            <div className="text-xs text-gray-600">Qtd: {item.quantidade}</div>
                                                        </div>
                                                        <button
                                                            onClick={() => handleRemoveItem(item.id)}
                                                            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            <button
                                onClick={handleProcessarDevolucao}
                                disabled={loading || selectedItems.length === 0 || !selectedFuncionario}
                                className="w-full mt-6 px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Processando...
                                    </>
                                ) : (
                                    `Processar ${selectedItems.length} Devolução(ões)`
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
