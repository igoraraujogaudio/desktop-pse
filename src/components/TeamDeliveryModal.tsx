import { useState, useEffect } from 'react';
import { X, Search, Plus, Trash, Users, Package, Box } from 'lucide-react';
import { teamService } from '../services/teamService';
import { catalogoService } from '../services/catalogoService';
import { estoqueService } from '../services/estoqueService';
import { moduloPredefinidoEquipeService } from '../services/moduloPredefinidoService';
import { baseService } from '../services/baseService';
import { userService } from '../services/userService';
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
    const [funcionarios, setFuncionarios] = useState<any[]>([]);
    const [allModules, setAllModules] = useState<any[]>([]);
    const [bases, setBases] = useState<any[]>([]);
    const [allItems, setAllItems] = useState<any[]>([]);

    // Selection States
    const [selectedTeam, setSelectedTeam] = useState<string>('');
    const [selectedMember, setSelectedMember] = useState<string>('');
    const [selectedBase, setSelectedBase] = useState<string>('');
    const [observacoes, setObservacoes] = useState('');

    // Item Management
    const [items, setItems] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'avulso' | 'modulo'>('modulo');

    // Search States
    const [teamSearchTerm, setTeamSearchTerm] = useState('');
    const [memberSearchTerm, setMemberSearchTerm] = useState('');
    const [itemSearchTerm, setItemSearchTerm] = useState('');
    const [itemSearchResults, setItemSearchResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Derived States
    const filteredModules = selectedTeam
        ? allModules.filter(m => m.equipe_id === selectedTeam)
        : [];

    const filteredTeams = teamSearchTerm
        ? teams.filter(t => 
            t.nome?.toLowerCase().includes(teamSearchTerm.toLowerCase()) ||
            t.operacao?.toLowerCase().includes(teamSearchTerm.toLowerCase())
          )
        : [];

    const filteredMembers = memberSearchTerm
        ? funcionarios.filter(m => 
            m.nome?.toLowerCase().includes(memberSearchTerm.toLowerCase()) ||
            m.matricula?.toLowerCase().includes(memberSearchTerm.toLowerCase())
          )
        : [];

    useEffect(() => {
        if (isOpen) {
            loadInitialData();
            // Reset states
            setSelectedTeam('');
            setSelectedMember('');
            setSelectedBase('');
            setItems([]);
            setObservacoes('');
            setActiveTab('modulo');
            setTeamSearchTerm('');
            setMemberSearchTerm('');
            setItemSearchTerm('');
        }
    }, [isOpen]);

    useEffect(() => {
        if (selectedBase) {
            loadAllItems(selectedBase);
        } else {
            setAllItems([]);
        }
    }, [selectedBase]);

    const loadInitialData = async () => {
        setLoading(true);
        try {
            const [teamsData, modulesData, basesData, funcionariosData] = await Promise.all([
                teamService.getEquipesAtivas(),
                moduloPredefinidoEquipeService.getModulosPredefinidosEquipe(),
                user ? baseService.getUserBases(user.id) : Promise.resolve([]),
                userService.getUsuariosAtivos()
            ]);
            setTeams(teamsData);
            setAllModules(modulesData);
            setFuncionarios(funcionariosData);
            
            // Extract bases from user bases
            const userBases = basesData
                .map((ub: any) => ub.base)
                .filter((base: any) => base && base.ativa);
            setBases(userBases);
            
            // Auto-select base if user has access to only one
            if (userBases.length === 1) {
                setSelectedBase(userBases[0].id);
            }
        } catch (error) {
            console.error('Error loading initial data:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadAllItems = async (baseId: string) => {
        try {
            const itemsData = await catalogoService.getItensCatalogoComEstoque(baseId);
            setAllItems(itemsData);
        } catch (error) {
            console.error('Error loading items:', error);
        }
    };

    const handleSearchItems = (term: string) => {
        setItemSearchTerm(term);
        if (!term || term.length < 2) {
            setItemSearchResults([]);
            return;
        }

        const searchLower = term.toLowerCase();
        const results = allItems.filter(item => 
            item.nome?.toLowerCase().includes(searchLower) ||
            item.codigo?.toLowerCase().includes(searchLower) ||
            item.categoria?.toLowerCase().includes(searchLower)
        ).slice(0, 50);
        
        setItemSearchResults(results);
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

        if (!selectedBase) {
            alert('Selecione uma base.');
            return;
        }

        try {
            setLoading(true);
            await estoqueService.createTeamDelivery({
                equipe_id: selectedTeam,
                responsavel_id: selectedMember,
                base_id: selectedBase,
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
                    {/* Base Selection */}
                    <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Base *</label>
                        <select
                            value={selectedBase}
                            onChange={e => setSelectedBase(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm"
                        >
                            <option value="">Selecione a base</option>
                            {bases.map(b => (
                                <option key={b.id} value={b.id}>{b.nome}</option>
                            ))}
                        </select>
                        {bases.length === 1 && (
                            <p className="text-xs text-blue-600 mt-2">Base selecionada automaticamente (acesso único)</p>
                        )}
                    </div>

                    {/* Team & Responsible Selection */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-gray-50 rounded-2xl border border-gray-100">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Equipe *</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <input
                                    type="text"
                                    value={teamSearchTerm}
                                    onChange={e => setTeamSearchTerm(e.target.value)}
                                    placeholder="Digite para buscar equipe..."
                                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm"
                                />
                                {teamSearchTerm && (
                                    <X 
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 cursor-pointer hover:text-gray-600" 
                                        onClick={() => setTeamSearchTerm('')}
                                    />
                                )}
                            </div>
                            {teamSearchTerm && filteredTeams.length > 0 && (
                                <div className="mt-2 max-h-48 overflow-y-auto border border-gray-200 rounded-xl bg-white shadow-lg">
                                    {filteredTeams.map(team => (
                                        <button
                                            key={team.id}
                                            onClick={() => {
                                                setSelectedTeam(team.id);
                                                setTeamSearchTerm('');
                                            }}
                                            className={`w-full text-left px-4 py-3 hover:bg-blue-50 border-b last:border-b-0 transition-colors ${
                                                selectedTeam === team.id ? 'bg-blue-50 border-blue-200' : ''
                                            }`}
                                        >
                                            <div className="font-medium text-sm">{team.nome}</div>
                                            <div className="text-xs text-gray-500">{team.operacao || 'Operação'}</div>
                                        </button>
                                    ))}
                                </div>
                            )}
                            {selectedTeam && !teamSearchTerm && (
                                <div className="mt-2 flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                    <div className="text-sm text-blue-700">
                                        <strong>Selecionado:</strong> {teams.find(t => t.id === selectedTeam)?.nome}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Responsável Recebimento *</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <input
                                    type="text"
                                    value={memberSearchTerm}
                                    onChange={e => setMemberSearchTerm(e.target.value)}
                                    placeholder="Digite para buscar responsável..."
                                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm"
                                />
                                {memberSearchTerm && (
                                    <X 
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 cursor-pointer hover:text-gray-600" 
                                        onClick={() => setMemberSearchTerm('')}
                                    />
                                )}
                            </div>
                            {memberSearchTerm && filteredMembers.length > 0 && (
                                <div className="mt-2 max-h-48 overflow-y-auto border border-gray-200 rounded-xl bg-white shadow-lg">
                                    {filteredMembers.map(member => (
                                        <button
                                            key={member.id}
                                            onClick={() => {
                                                setSelectedMember(member.id);
                                                setMemberSearchTerm('');
                                            }}
                                            className={`w-full text-left px-4 py-3 hover:bg-blue-50 border-b last:border-b-0 transition-colors ${
                                                selectedMember === member.id ? 'bg-blue-50 border-blue-200' : ''
                                            }`}
                                        >
                                            <div className="font-medium text-sm">{member.nome}</div>
                                            <div className="text-xs text-gray-500">Mat. {member.matricula || 'N/A'}</div>
                                        </button>
                                    ))}
                                </div>
                            )}
                            {selectedMember && !memberSearchTerm && (
                                <div className="mt-2 flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                    <div className="text-sm text-blue-700">
                                        <strong>Selecionado:</strong> {funcionarios.find(m => m.id === selectedMember)?.nome}
                                    </div>
                                </div>
                            )}
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
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-200 max-h-80 overflow-y-auto z-10">
                                            {itemSearchResults.map(item => (
                                                <button
                                                    key={item.id}
                                                    onClick={() => handleAddItem(item)}
                                                    className="w-full text-left px-4 py-4 hover:bg-blue-50 flex items-center justify-between group border-b last:border-b-0"
                                                >
                                                    <div>
                                                        <div className="font-medium text-sm break-words">{item.nome}</div>
                                                        <div className="text-xs text-gray-500 mt-1">{item.codigo}</div>
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
                        disabled={loading || items.length === 0 || !selectedTeam || !selectedMember || !selectedBase}
                        className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Processando...' : 'Confirmar Entrega'}
                    </button>
                </div>
            </div>
        </div>
    );
}
