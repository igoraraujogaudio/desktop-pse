import { useState, useEffect } from 'react';
import { moduloPredefinidoEquipeService } from '../services/moduloPredefinidoService';
import { teamService } from '../services/teamService';
import { catalogoService } from '../services/catalogoService';
import { Plus, Trash, Search, Box, Save, X, Users } from 'lucide-react';

export default function ModulosPredefinidosPage() {
    // State
    const [modulos, setModulos] = useState<any[]>([]);
    const [teams, setTeams] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    // Create Form State
    const [nome, setNome] = useState('');
    const [descricao, setDescricao] = useState('');
    const [selectedTeam, setSelectedTeam] = useState('');
    const [selectedItems, setSelectedItems] = useState<any[]>([]);

    // Item Search
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [modulosData, teamsData] = await Promise.all([
                moduloPredefinidoEquipeService.getModulosPredefinidosEquipe(),
                teamService.getEquipesAtivas()
            ]);
            setModulos(modulosData);
            setTeams(teamsData);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const getTeamName = (id: string) => teams.find(t => t.id === id)?.nome || 'Equipe desconhecida';

    const handleSearchItems = async (term: string) => {
        setSearchTerm(term);
        if (term.length < 3) {
            setSearchResults([]);
            return;
        }

        try {
            // Assuming baseId '1' for now, ideally user selects base or search globally? 
            // Catalogo service requires baseId. Let's try to get one from user access or just show empty?
            // For template creation, maybe we need a "Global Catalog" or just pick "Base Principal".
            // Let's use a hardcoded '1' or loop bases? 
            // Better: Let user select base context for THE SEARCH, but items are global definitions?
            // "Itens de Estoque" are bound to Base. 
            // BUT "Predefined Modules" usually define "I want Item Code X".
            // Current DB schema links to `itens_estoque` (specific ID). This restricts module to a base.
            // Assuming we search in the first accessible base for now.
            const results = await catalogoService.searchItems(term, '1'); // FIXME: Dynamic Base
            setSearchResults(results);
        } catch (error) {
            console.error('Error searching:', error);
        }
    };

    const handleAddItem = (item: any) => {
        if (selectedItems.find(i => i.item_id === item.id)) return;

        setSelectedItems(prev => [...prev, {
            item_id: item.id,
            nome: item.nome,
            codigo: item.codigo,
            quantidade: 1
        }]);
        setSearchTerm('');
        setSearchResults([]);
    };

    const handleRemoveItem = (index: number) => {
        setSelectedItems(prev => prev.filter((_, i) => i !== index));
    };

    const handleUpdateQuantity = (index: number, newQtd: number) => {
        if (newQtd < 1) return;
        setSelectedItems(prev => prev.map((item, i) =>
            i === index ? { ...item, quantidade: newQtd } : item
        ));
    };

    const handleSave = async () => {
        if (!nome || !selectedTeam || selectedItems.length === 0) {
            alert('Preencha o nome, selecione a equipe e adicione pelo menos um item.');
            return;
        }

        try {
            setLoading(true);
            await moduloPredefinidoEquipeService.createModulo(nome, descricao, selectedTeam, selectedItems);
            setIsCreating(false);
            setNome('');
            setDescricao('');
            setSelectedTeam('');
            setSelectedItems([]);
            loadData();
        } catch (error) {
            alert('Erro ao criar módulo: ' + error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja inativar este módulo?')) return;
        try {
            await moduloPredefinidoEquipeService.deleteModulo(id);
            loadData();
        } catch (error) {
            alert('Erro ao deletar: ' + error);
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Módulos de Equipe</h1>
                    <p className="text-sm text-gray-500 mt-1">Gerencie kits predefinidos vinculados a equipes</p>
                </div>
                {!isCreating && (
                    <button
                        onClick={() => setIsCreating(true)}
                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors"
                    >
                        <Plus className="w-4 h-4" /> Novo Módulo
                    </button>
                )}
            </div>

            {isCreating ? (
                <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 animate-fade-in">
                    <div className="flex justify-between items-start mb-6">
                        <h2 className="text-lg font-bold text-gray-900">Novo Módulo</h2>
                        <button onClick={() => setIsCreating(false)} className="text-gray-400 hover:text-gray-600">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Módulo</label>
                            <input
                                type="text"
                                value={nome}
                                onChange={e => setNome(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 outline-none"
                                placeholder="Ex: Kit EPI Solda"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Equipe</label>
                            <select
                                value={selectedTeam}
                                onChange={e => setSelectedTeam(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 outline-none bg-white"
                            >
                                <option value="">Selecione uma equipe...</option>
                                {teams.map(t => (
                                    <option key={t.id} value={t.id}>{t.nome}</option>
                                ))}
                            </select>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                            <input
                                type="text"
                                value={descricao}
                                onChange={e => setDescricao(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 outline-none"
                                placeholder="Descrição opcional..."
                            />
                        </div>
                    </div>

                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Adicionar Itens</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={e => handleSearchItems(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 outline-none"
                                placeholder="Busque por código ou nome..."
                            />
                            {searchResults.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 max-h-60 overflow-y-auto z-10">
                                    {searchResults.map(item => (
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
                    </div>

                    <div className="space-y-3 mb-8">
                        {selectedItems.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                                <div>
                                    <div className="font-medium text-gray-900">{item.nome}</div>
                                    <div className="text-xs text-gray-500">{item.codigo}</div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-gray-500">Qtd:</span>
                                        <input
                                            type="number"
                                            min="1"
                                            value={item.quantidade}
                                            onChange={e => handleUpdateQuantity(idx, parseInt(e.target.value) || 1)}
                                            className="w-20 px-2 py-1 border border-gray-200 rounded-lg text-center"
                                        />
                                    </div>
                                    <button
                                        onClick={() => handleRemoveItem(idx)}
                                        className="text-red-400 hover:text-red-600 p-2"
                                    >
                                        <Trash className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {selectedItems.length === 0 && (
                            <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                                Nenhum item adicionado ao módulo
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-3">
                        <button
                            onClick={() => setIsCreating(false)}
                            className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={loading}
                            className="px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2"
                        >
                            <Save className="w-4 h-4" />
                            Salvar Módulo
                        </button>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {modulos.map(modulo => (
                        <div key={modulo.id} className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
                                        <Box className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900">{modulo.nome_modulo}</h3>
                                        <div className="flex items-center gap-1 text-xs text-gray-500">
                                            <Users className="w-3 h-3" />
                                            {getTeamName(modulo.equipe_id)}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDelete(modulo.id)}
                                    className="text-gray-400 hover:text-red-500 transition-colors"
                                >
                                    <Trash className="w-4 h-4" />
                                </button>
                            </div>

                            <p className="text-sm text-gray-500 mb-6 line-clamp-2">
                                {modulo.descricao || 'Sem descrição'}
                            </p>

                            <div className="space-y-2">
                                {modulo.itens?.slice(0, 3).map((item: any) => (
                                    <div key={item.id} className="flex justify-between text-sm py-1 border-b border-gray-50 last:border-0">
                                        <span className="text-gray-600 truncate flex-1 mr-2">{item.item.nome}</span>
                                        <span className="font-medium text-gray-900">x{item.quantidade_padrao}</span>
                                    </div>
                                ))}
                                {(modulo.itens?.length || 0) > 3 && (
                                    <div className="text-center text-xs text-blue-500 pt-2 font-medium">
                                        + {(modulo.itens?.length || 0) - 3} itens
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {modulos.length === 0 && !loading && (
                        <div className="col-span-full text-center py-20 text-gray-400">
                            Nenhum módulo encontrado. Crie o primeiro!
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
