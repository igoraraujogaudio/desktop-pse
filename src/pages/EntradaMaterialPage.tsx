import { useState, useEffect } from 'react';
import { estoqueService } from '../services/estoqueService';
import { baseService } from '../services/baseService';
import { FileText, Plus, Trash2, ArrowLeft, Loader2, Package } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useUnifiedPermissions } from '../hooks/useUnifiedPermissions';

interface ItemNF {
    item_id?: string;
    codigo_item?: string;
    descricao: string;
    quantidade: number;
    valor_unitario: number;
    valor_total: number;
    unidade: string;
    observacoes?: string;
    estoque_atual?: number;
}

interface ItemEstoque {
    id: string;
    nome: string;
    codigo: string;
    categoria: string;
    unidade_medida: string;
    estoque_atual: number;
}

interface Base {
    id: string;
    nome: string;
    contrato_id?: string;
}

interface EntradaMaterialPageProps {
    onBack: () => void;
}

export default function EntradaMaterialPage({ onBack }: EntradaMaterialPageProps) {
    const { user } = useAuth();
    const { userBases } = useUnifiedPermissions();
    const [tipoEntrada, setTipoEntrada] = useState<'nota_fiscal' | 'transferencia'>('nota_fiscal');
    const [loading, setLoading] = useState(false);
    const [bases, setBases] = useState<Base[]>([]);
    const [baseSelecionada, setBaseSelecionada] = useState<string>('');
    const [contratoId, setContratoId] = useState<string>('');
    const [itensEstoque, setItensEstoque] = useState<ItemEstoque[]>([]);
    const [itensNF, setItensNF] = useState<ItemNF[]>([]);
    const [showItemModal, setShowItemModal] = useState(false);
    const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);

    const [numero, setNumero] = useState('');
    const [serie, setSerie] = useState('');
    const [numeroPedido, setNumeroPedido] = useState('');
    const [fornecedor, setFornecedor] = useState('');
    const [cnpjFornecedor, setCnpjFornecedor] = useState('');
    const [dataEmissao, setDataEmissao] = useState('');
    const [dataRecebimento, setDataRecebimento] = useState(new Date().toISOString().split('T')[0]);
    const [observacoes, setObservacoes] = useState('');
    const [baseOrigemId, setBaseOrigemId] = useState<string>('');
    const [numeroTransferencia, setNumeroTransferencia] = useState<string>('');

    const [itemDescricao, setItemDescricao] = useState('');
    const [itemCodigo, setItemCodigo] = useState('');
    const [itemQuantidade, setItemQuantidade] = useState('');
    const [itemValorUnitario, setItemValorUnitario] = useState('');
    const [itemUnidade, setItemUnidade] = useState('UN');
    const [itemObservacoes, setItemObservacoes] = useState('');
    const [selectedItem, setSelectedItem] = useState<ItemEstoque | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadBases();
    }, []);

    useEffect(() => {
        if (baseSelecionada) {
            loadItensEstoque();
        }
    }, [baseSelecionada]);

    const loadBases = async () => {
        try {
            const basesData = await baseService.getBasesAtivas();
            
            // Filtrar bases por acesso do usuário via usuario_bases
            const basesComAcesso = basesData.filter(base => 
                userBases.some(ub => ub.base_id === base.id && ub.ativo)
            );
            
            setBases(basesComAcesso);
            if (basesComAcesso.length > 0) {
                setBaseSelecionada(basesComAcesso[0].id);
                setContratoId(basesComAcesso[0].contrato_id || '');
            }
        } catch (error) {
            console.error('Erro ao carregar bases:', error);
        }
    };

    const loadItensEstoque = async () => {
        if (!baseSelecionada) return;

        try {
            const [epi, ferramental, consumivel, equipamento] = await Promise.all([
                estoqueService.getItensPorCategoria('epi', baseSelecionada),
                estoqueService.getItensPorCategoria('ferramental', baseSelecionada),
                estoqueService.getItensPorCategoria('consumivel', baseSelecionada),
                estoqueService.getItensPorCategoria('equipamento', baseSelecionada)
            ]);

            const todosItens = [...epi, ...ferramental, ...consumivel, ...equipamento]
                .sort((a, b) => a.nome.localeCompare(b.nome));

            setItensEstoque(todosItens);
        } catch (error) {
            console.error('Erro ao carregar itens:', error);
        }
    };

    const filteredItems = itensEstoque.filter(item =>
        item.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.codigo.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const resetItemForm = () => {
        setItemDescricao('');
        setItemCodigo('');
        setItemQuantidade('');
        setItemValorUnitario('');
        setItemUnidade('UN');
        setItemObservacoes('');
        setSelectedItem(null);
        setSearchTerm('');
    };

    const handleSelectItem = (item: ItemEstoque) => {
        setSelectedItem(item);
        setItemDescricao(item.nome);
        setItemCodigo(item.codigo || '');
        setItemUnidade(item.unidade_medida || 'UN');
        setSearchTerm('');
    };

    const handleAddItem = () => {
        if (!itemDescricao || !itemQuantidade || !itemValorUnitario) {
            alert('Preencha todos os campos obrigatórios');
            return;
        }

        const quantidade = parseInt(itemQuantidade);
        const valorUnitario = parseFloat(itemValorUnitario.replace(',', '.'));
        const valorTotal = quantidade * valorUnitario;

        const novoItem: ItemNF = {
            item_id: selectedItem?.id,
            codigo_item: itemCodigo || undefined,
            descricao: itemDescricao,
            quantidade,
            valor_unitario: valorUnitario,
            valor_total: valorTotal,
            unidade: itemUnidade,
            observacoes: itemObservacoes || undefined,
            estoque_atual: selectedItem?.estoque_atual
        };

        if (editingItemIndex !== null) {
            const novosItens = [...itensNF];
            novosItens[editingItemIndex] = novoItem;
            setItensNF(novosItens);
            setEditingItemIndex(null);
        } else {
            setItensNF([...itensNF, novoItem]);
        }

        setShowItemModal(false);
        resetItemForm();
    };

    const handleEditItem = (index: number) => {
        const item = itensNF[index];
        setItemDescricao(item.descricao);
        setItemCodigo(item.codigo_item || '');
        setItemQuantidade(item.quantidade.toString());
        setItemValorUnitario(item.valor_unitario.toString());
        setItemUnidade(item.unidade);
        setItemObservacoes(item.observacoes || '');

        if (item.item_id) {
            const itemAtualizado = itensEstoque.find(i => i.id === item.item_id);
            if (itemAtualizado) {
                setSelectedItem(itemAtualizado);
            }
        }

        setEditingItemIndex(index);
        setShowItemModal(true);
    };

    const handleRemoveItem = (index: number) => {
        const novosItens = itensNF.filter((_, i) => i !== index);
        setItensNF(novosItens);
    };

    const handleSubmit = async () => {
        if (!dataRecebimento || itensNF.length === 0 || !baseSelecionada) {
            alert('Preencha todos os campos obrigatórios');
            return;
        }

        if (tipoEntrada === 'nota_fiscal') {
            if (!numero || !fornecedor || !dataEmissao) {
                alert('Preencha todos os campos obrigatórios da Nota Fiscal');
                return;
            }
        } else if (tipoEntrada === 'transferencia') {
            if (!baseOrigemId) {
                alert('Selecione a base de origem da transferência');
                return;
            }
        }

        setLoading(true);
        try {
            const itensFormatados = itensNF.map(item => ({
                item_id: item.item_id || undefined,
                codigo_item: item.codigo_item || undefined,
                descricao: item.descricao,
                quantidade: item.quantidade,
                valor_unitario: item.valor_unitario,
                valor_total: item.valor_total,
                unidade: item.unidade,
                observacoes: item.observacoes || undefined
            }));

            if (tipoEntrada === 'nota_fiscal') {
                const valorTotalNF = itensNF.reduce((acc, item) => acc + item.valor_total, 0);

                const notaFiscal = {
                    numero,
                    serie,
                    numero_pedido: numeroPedido || undefined,
                    fornecedor,
                    cnpj_fornecedor: cnpjFornecedor || undefined,
                    data_emissao: dataEmissao,
                    data_recebimento: dataRecebimento,
                    valor_total: valorTotalNF,
                    status: 'recebida' as const,
                    observacoes: observacoes || undefined,
                    usuario_recebimento: user?.id || '',
                    base_id: baseSelecionada,
                    contrato_id: contratoId || undefined
                };

                await estoqueService.processarNotaFiscal(notaFiscal, itensFormatados);
                alert('Entrada de material processada com sucesso!');
            } else {
                await estoqueService.processarRecebimentoTransferencia(
                    {
                        base_origem_id: baseOrigemId,
                        base_destino_id: baseSelecionada,
                        numero_transferencia: numeroTransferencia || undefined,
                        data_recebimento: dataRecebimento,
                        observacoes: observacoes || undefined,
                        usuario_recebimento: user?.id || '',
                        contrato_destino_id: contratoId || undefined
                    },
                    itensFormatados
                );
                alert('Recebimento de transferência processado com sucesso!');
            }

            resetForm();
            onBack();
        } catch (error) {
            console.error('Erro ao processar entrada:', error);
            alert(`Erro ao processar entrada de material: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setTipoEntrada('nota_fiscal');
        setNumero('');
        setSerie('');
        setNumeroPedido('');
        setFornecedor('');
        setCnpjFornecedor('');
        setDataEmissao('');
        setDataRecebimento(new Date().toISOString().split('T')[0]);
        setObservacoes('');
        setBaseOrigemId('');
        setNumeroTransferencia('');
        setItensNF([]);
        resetItemForm();
    };

    const valorTotalNF = itensNF.reduce((acc, item) => acc + item.valor_total, 0);

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
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <FileText className="h-8 w-8 text-blue-600" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Entrada de Material</h1>
                            <p className="text-gray-600">Processar entrada de materiais no estoque</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-lg shadow-sm p-6">
                            <h2 className="text-lg font-semibold mb-4">Dados da Entrada</h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Tipo de Entrada *</label>
                                    <select
                                        value={tipoEntrada}
                                        onChange={(e) => setTipoEntrada(e.target.value as 'nota_fiscal' | 'transferencia')}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        <option value="nota_fiscal">Nota Fiscal</option>
                                        <option value="transferencia">Recebimento via Transferência</option>
                                    </select>
                                </div>

                                {tipoEntrada === 'nota_fiscal' && (
                                    <>
                                        <div className="grid grid-cols-3 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium mb-1">Número da NF *</label>
                                                <input
                                                    type="text"
                                                    value={numero}
                                                    onChange={(e) => setNumero(e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium mb-1">Série</label>
                                                <input
                                                    type="text"
                                                    value={serie}
                                                    onChange={(e) => setSerie(e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium mb-1">Nº Pedido</label>
                                                <input
                                                    type="text"
                                                    value={numeroPedido}
                                                    onChange={(e) => setNumeroPedido(e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium mb-1">Fornecedor *</label>
                                                <input
                                                    type="text"
                                                    value={fornecedor}
                                                    onChange={(e) => setFornecedor(e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium mb-1">CNPJ</label>
                                                <input
                                                    type="text"
                                                    value={cnpjFornecedor}
                                                    onChange={(e) => setCnpjFornecedor(e.target.value)}
                                                    placeholder="00.000.000/0000-00"
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium mb-1">Data de Emissão *</label>
                                                <input
                                                    type="date"
                                                    value={dataEmissao}
                                                    onChange={(e) => setDataEmissao(e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium mb-1">Data de Recebimento *</label>
                                                <input
                                                    type="date"
                                                    value={dataRecebimento}
                                                    onChange={(e) => setDataRecebimento(e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                />
                                            </div>
                                        </div>
                                    </>
                                )}

                                {tipoEntrada === 'transferencia' && (
                                    <>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium mb-1">Base de Origem *</label>
                                                <select
                                                    value={baseOrigemId}
                                                    onChange={(e) => setBaseOrigemId(e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                >
                                                    <option value="">Selecione...</option>
                                                    {bases.map(base => (
                                                        <option key={base.id} value={base.id}>{base.nome}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium mb-1">Nº Transferência</label>
                                                <input
                                                    type="text"
                                                    value={numeroTransferencia}
                                                    onChange={(e) => setNumeroTransferencia(e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium mb-1">Data de Recebimento *</label>
                                            <input
                                                type="date"
                                                value={dataRecebimento}
                                                onChange={(e) => setDataRecebimento(e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            />
                                        </div>
                                    </>
                                )}

                                <div>
                                    <label className="block text-sm font-medium mb-1">Base Destino *</label>
                                    <select
                                        value={baseSelecionada}
                                        onChange={(e) => {
                                            setBaseSelecionada(e.target.value);
                                            const base = bases.find(b => b.id === e.target.value);
                                            setContratoId(base?.contrato_id || '');
                                        }}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        {bases.map(base => (
                                            <option key={base.id} value={base.id}>{base.nome}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1">Observações</label>
                                    <textarea
                                        value={observacoes}
                                        onChange={(e) => setObservacoes(e.target.value)}
                                        rows={3}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow-sm p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold">Itens</h2>
                                <button
                                    onClick={() => setShowItemModal(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    <Plus className="w-4 h-4" />
                                    Adicionar Item
                                </button>
                            </div>

                            {itensNF.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                    <p>Nenhum item adicionado</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {itensNF.map((item, index) => (
                                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                            <div className="flex-1">
                                                <div className="font-medium">{item.descricao}</div>
                                                <div className="text-sm text-gray-600">
                                                    Código: {item.codigo_item || 'N/A'} | Qtd: {item.quantidade} {item.unidade} | 
                                                    Valor Unit.: R$ {item.valor_unitario.toFixed(2)} | 
                                                    Total: R$ {item.valor_total.toFixed(2)}
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleEditItem(index)}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                >
                                                    Editar
                                                </button>
                                                <button
                                                    onClick={() => handleRemoveItem(index)}
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-lg shadow-sm p-6 sticky top-6">
                            <h2 className="text-lg font-semibold mb-4">Resumo</h2>
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Total de Itens:</span>
                                    <span className="font-semibold">{itensNF.length}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Quantidade Total:</span>
                                    <span className="font-semibold">
                                        {itensNF.reduce((acc, item) => acc + item.quantidade, 0)}
                                    </span>
                                </div>
                                <div className="flex justify-between text-lg font-bold pt-3 border-t">
                                    <span>Valor Total:</span>
                                    <span className="text-blue-600">R$ {valorTotalNF.toFixed(2)}</span>
                                </div>
                            </div>

                            <button
                                onClick={handleSubmit}
                                disabled={loading || itensNF.length === 0}
                                className="w-full mt-6 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Processando...
                                    </>
                                ) : (
                                    'Processar Entrada'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {showItemModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <h3 className="text-xl font-semibold mb-4">
                                {editingItemIndex !== null ? 'Editar Item' : 'Adicionar Item'}
                            </h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Buscar Item do Estoque</label>
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder="Digite o nome ou código..."
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                    {searchTerm && filteredItems.length > 0 && (
                                        <div className="mt-2 border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                                            {filteredItems.slice(0, 10).map(item => (
                                                <button
                                                    key={item.id}
                                                    onClick={() => handleSelectItem(item)}
                                                    className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b last:border-b-0"
                                                >
                                                    <div className="font-medium">{item.nome}</div>
                                                    <div className="text-sm text-gray-600">
                                                        Código: {item.codigo} | Estoque: {item.estoque_atual}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1">Descrição *</label>
                                    <input
                                        type="text"
                                        value={itemDescricao}
                                        onChange={(e) => setItemDescricao(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Código</label>
                                        <input
                                            type="text"
                                            value={itemCodigo}
                                            onChange={(e) => setItemCodigo(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Unidade</label>
                                        <select
                                            value={itemUnidade}
                                            onChange={(e) => setItemUnidade(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        >
                                            <option value="UN">UN</option>
                                            <option value="CX">CX</option>
                                            <option value="PC">PC</option>
                                            <option value="KG">KG</option>
                                            <option value="L">L</option>
                                            <option value="M">M</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Quantidade *</label>
                                        <input
                                            type="number"
                                            value={itemQuantidade}
                                            onChange={(e) => setItemQuantidade(e.target.value)}
                                            min="1"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Valor Unitário *</label>
                                        <input
                                            type="text"
                                            value={itemValorUnitario}
                                            onChange={(e) => setItemValorUnitario(e.target.value)}
                                            placeholder="0.00"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1">Observações</label>
                                    <textarea
                                        value={itemObservacoes}
                                        onChange={(e) => setItemObservacoes(e.target.value)}
                                        rows={2}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => {
                                        setShowItemModal(false);
                                        setEditingItemIndex(null);
                                        resetItemForm();
                                    }}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleAddItem}
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    {editingItemIndex !== null ? 'Salvar' : 'Adicionar'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
