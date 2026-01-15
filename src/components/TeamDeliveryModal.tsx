import { useState, useEffect } from 'react';
import { X, Search, Plus, Trash, Users, User, Package, Box } from 'lucide-react';
import { teamService } from '../services/teamService';
import { catalogoService } from '../services/catalogoService';
import { estoqueService } from '../services/estoqueService';
import { moduloPredefinidoEquipeService } from '../services/moduloPredefinidoService';
import { useAuth } from '../hooks/useAuth';

interface TeamDeliveryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function TeamDeliveryModal({ isOpen, onClose, onSuccess }: TeamDeliveryModalProps) {
    const { user } = useAuth();

    // Data States
    const [teams, setTeams] = useState<any[]>([]);
    const [members, setMembers] = useState<any[]>([]);
    const [allModules, setAllModules] = useState<any[]>([]);

    // Selection States
    const [selectedTeam, setSelectedTeam] = useState<string>('');
    const [selectedMember, setSelectedMember] = useState<string>('');
    const [observacoes, setObservacoes] = useState('');

    // Item Management
    const [items, setItems] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'avulso' | 'modulo'>('modulo');

    // Search States
    const [itemSearchTerm, setItemSearchTerm] = useState('');
    const [itemSearchResults, setItemSearchResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Derived States
    const filteredModules = selectedTeam
        ? allModules.filter(m => m.equipe_id === selectedTeam)
        : [];

    useEffect(() => {
        if (isOpen) {
            loadInitialData();
            // Reset states
            setSelectedTeam('');
            setSelectedMember('');
            setItems([]);
            setObservacoes('');
            setActiveTab('modulo');
        }
    }, [isOpen]);

    useEffect(() => {
        if (selectedTeam) {
            loadTeamMembers(selectedTeam);
        } else {
            setMembers([]);
            setSelectedMember('');
        }
    }, [selectedTeam]);

    const loadInitialData = async () => {
        setLoading(true);
        try {
            const [teamsData, modulesData] = await Promise.all([
                teamService.getEquipesAtivas(),
                moduloPredefinidoEquipeService.getModulosPredefinidosEquipe()
            ]);
            setTeams(teamsData);
            setAllModules(modulesData);
        } catch (error) {
            console.error('Error loading initial data:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadTeamMembers = async (teamId: string) => {
        try {
            const membersData = await teamService.getTeamMembers(teamId);
            setMembers(membersData);
        } catch (error) {
            console.error('Error loading team members:', error);
        }
    };

    const handleSearchItems = async (term: string) => {
        setItemSearchTerm(term);
        if (term.length < 3) {
            setItemSearchResults([]);
            return;
        }

        try {
            // FIXME: Hardcoded baseId '1' for now, should come from context or selection
            const results = await catalogoService.searchItems(term, '1');
            setItemSearchResults(results);
        } catch (error) {
            console.error('Error searching items:', error);
        }
    };

    const handleAddItem = (item: any, quantity: number = 1) => {
        setItems(prev => {
            const existing = prev.find(i => i.item_id === item.id);
            if (existing) {
                return prev.map(i => i.item_id === item.id
                    ? { ...i, quantidade: i.quantidade + quantity }
                    : i
                );
            }
            return [...prev, {
                item_id: item.id,
                nome: item.nome,
                codigo: item.codigo,
                quantidade: quantity
            }];
        });
        setItemSearchTerm('');
        setItemSearchResults([]);
    };

    const handleAddModule = (modulo: any) => {
        if (!modulo.itens) return;

        const newItems = modulo.itens.map((i: any) => ({
            item_id: i.item.id,
            nome: i.item.nome,
            codigo: i.item.codigo,
            quantidade: i.quantidade_padrao
        }));

        setItems(prev => {
            // Merge logic: valid? Or just append? 
            // Let's simple append or sum if exists
            const merged = [...prev];
            newItems.forEach((newItem: any) => {
                const existingIndex = merged.findIndex(i => i.item_id === newItem.item_id);
                if (existingIndex >= 0) {
                    merged[existingIndex].quantidade += newItem.quantidade;
                } else {
                    merged.push(newItem);
                }
            });
            return merged;
        });
        // Feedback?
    };

    const handleRemoveItem = (index: number) => {
        setItems(prev => prev.filter((_, i) => i !== index));
    };

    const handleUpdateQuantity = (index: number, newQtd: number) => {
        if (newQtd < 1) return;
        setItems(prev => prev.map((item, i) =>
            i === index ? { ...item, quantidade: newQtd } : item
        ));
    };

    const handleSubmit = async () => {
        if (!selectedTeam || !selectedMember || items.length === 0) {
            alert('Selecione a equipe, o responsável e pelo menos um item.');
            return;
        }

        if (!user) {
            alert('Erro: Usuário não autenticado.');
            return;
        }

        try {
            setLoading(true);
            await estoqueService.createTeamDelivery({
                equipe_id: selectedTeam,
                responsavel_id: selectedMember,
                base_id: '1', // FIXME: Hardcoded baseId
                items: items,
                observacoes,
                criado_por: user.id
            });
            onSuccess();
            onClose();
        } catch (error) {
            alert('Erro ao criar entrega: ' + error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-[2rem] w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl animate-scale-in">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-blue-50/50 rounded-t-[2rem]">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center">
                            <Users className="w-6 h-6 text-purple-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Entrega para Equipe</h2>
                            <p className="text-sm text-gray-500">Adicione itens avulsos ou kits predefinidos</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-white/50 transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Team & Responsible Selection */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-gray-50 rounded-2xl border border-gray-100">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Equipe</label>
                            <div className="relative">
                                <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <select
                                    value={selectedTeam}
                                    onChange={e => setSelectedTeam(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 outline-none bg-white appearance-none"
                                >
                                    <option value="">Selecione uma equipe</option>
                                    {teams.map(t => (
                                        <option key={t.id} value={t.id}>{t.nome}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Responsável Recebimento</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <select
                                    value={selectedMember}
                                    onChange={e => setSelectedMember(e.target.value)}
                                    disabled={!selectedTeam}
                                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 outline-none bg-white appearance-none disabled:bg-gray-100 disabled:text-gray-400"
                                >
                                    <option value="">Selecione o responsável</option>
                                    {members.map(m => (
                                        <option key={m.id} value={m.id}>{m.nome}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Items Section */}
                    <div>
                        <div className="flex items-center gap-4 mb-4 border-b border-gray-100">
                            <button
                                onClick={() => setActiveTab('modulo')}
                                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'modulo'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                            >
                                <div className="flex items-center gap-2">
                                    <Box className="w-4 h-4" /> Kits / Módulos
                                </div>
                            </button>
                            <button
                                onClick={() => setActiveTab('avulso')}
                                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'avulso'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                            >
                                <div className="flex items-center gap-2">
                                    <Package className="w-4 h-4" /> Itens Avulsos
                                </div>
                            </button>
                        </div>

                        <div className="bg-white rounded-xl border border-gray-100 p-4 min-h-[150px]">
                            {activeTab === 'modulo' ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {/* Show prompt if no team selected */}
                                    {!selectedTeam ? (
                                        <div className="col-span-full text-center text-gray-400 py-8">
                                            Selecione uma equipe para ver seus módulos
                                        </div>
                                    ) : filteredModules.length === 0 ? (
                                        <div className="col-span-full text-center text-gray-400 py-8">
                                            Nenhum módulo encontrado para esta equipe
                                        </div>
                                    ) : (
                                        filteredModules.map(mod => (
                                            <button
                                                key={mod.id}
                                                onClick={() => handleAddModule(mod)}
                                                className="text-left p-4 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all group"
                                            >
                                                <div className="font-bold text-gray-900 mb-1 group-hover:text-blue-700">{mod.nome_modulo}</div>
                                                <div className="text-xs text-gray-500">{mod.itens?.length || 0} itens - Clique para adicionar</div>
                                            </button>
                                        ))
                                    )}
                                </div>
                            ) : (
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                    <input
                                        type="text"
                                        value={itemSearchTerm}
                                        onChange={e => handleSearchItems(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 outline-none"
                                        placeholder="Busque itens avulsos..."
                                        autoFocus
                                    />
                                    {itemSearchResults.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 max-h-60 overflow-y-auto z-10">
                                            {itemSearchResults.map(item => (
                                                <button
                                                    key={item.id}
                                                    onClick={() => handleAddItem(item)}
                                                    className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center justify-between group"
                                                >
                                                    <div>
                                                        <div className="font-medium text-gray-900">{item.nome}</div>
                                                        <div className="text-xs text-gray-500">{item.codigo}</div>
                                                    </div>
                                                    <Plus className="w-4 h-4 text-blue-600 opacity-0 group-hover:opacity-100" />
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Selected Items List */}
                    <div className="bg-gray-50 rounded-2xl p-6">
                        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4">Itens Selecionados ({items.length})</h3>
                        <div className="space-y-3">
                            {items.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
                                    <div className="flex-1">
                                        <div className="font-medium text-gray-900">{item.nome}</div>
                                        <div className="text-xs text-gray-500">{item.codigo}</div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2 bg-gray-50 px-2 py-1 rounded-lg">
                                            <span className="text-xs text-gray-500">Qtd</span>
                                            <input
                                                type="number"
                                                min="1"
                                                value={item.quantidade}
                                                onChange={e => handleUpdateQuantity(idx, parseInt(e.target.value) || 1)}
                                                className="w-16 bg-transparent text-center font-bold text-gray-900 outline-none"
                                            />
                                        </div>
                                        <button
                                            onClick={() => handleRemoveItem(idx)}
                                            className="text-gray-400 hover:text-red-500 p-2 transition-colors"
                                        >
                                            <Trash className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {items.length === 0 && (
                                <div className="text-center py-6 text-gray-400 text-sm">
                                    Adicione itens via módulo ou busca individual
                                </div>
                            )}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Observações</label>
                        <textarea
                            value={observacoes}
                            onChange={e => setObservacoes(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 outline-none h-24 resize-none"
                            placeholder="Informações adicionais sobre a entrega..."
                        />
                    </div>
                </div>

                <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 rounded-b-[2rem]">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 text-gray-600 font-medium hover:bg-gray-200 rounded-xl transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading || items.length === 0 || !selectedTeam || !selectedMember}
                        className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Processando...' : 'Confirmar Entrega'}
                    </button>
                </div>
            </div>
        </div>
    );
}
