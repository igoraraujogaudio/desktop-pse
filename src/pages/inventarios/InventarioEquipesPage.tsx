import { useState, useEffect, useMemo } from 'react';
import { inventarioService } from '../../services/inventarioService';
import { teamService } from '../../services/teamService';
import { baseService } from '../../services/baseService';
import { contratoService } from '../../services/contratoService';
import { ChevronLeft, Search, X, Loader2, Users, Briefcase, Building, FileText } from 'lucide-react';

interface Equipe {
    id: string;
    nome: string;
    operacao: string;
    contrato_id?: string;
    contrato?: { id: string; nome: string };
    base_id?: string;
    base?: { id: string; nome: string };
}

interface InventarioEquipesPageProps {
    onBack: () => void;
    onSelectEquipe: (id: string, nome: string) => void;
}

export default function InventarioEquipesPage({ onBack, onSelectEquipe }: InventarioEquipesPageProps) {
    const [equipes, setEquipes] = useState<Equipe[]>([]);
    const [inventarios, setInventarios] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedContrato, setSelectedContrato] = useState<string>('todos');
    const [selectedOperacao, setSelectedOperacao] = useState<string>('todos');
    const [contratos, setContratos] = useState<any[]>([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);

            // Load bases
            const basesData = await baseService.getBasesAtivas();

            // Load contratos
            const contratosData = await contratoService.getContratosAtivos();
            setContratos(contratosData);

            // Load equipes
            const equipesData = await teamService.getEquipesAtivas();

            // Map equipes with related data
            const equipesComRelacoes = equipesData.map((equipe: any) => ({
                id: equipe.id,
                nome: equipe.nome,
                operacao: equipe.operacao,
                contrato_id: equipe.contrato_id || undefined,
                contrato: contratosData.find((c: any) => c.id === equipe.contrato_id),
                base_id: equipe.base_id || undefined,
                base: basesData.find((b: any) => b.id === equipe.base_id)
            }));

            setEquipes(equipesComRelacoes);

            // Load inventarios
            const inventariosData = await inventarioService.getInventarioEquipes();
            setInventarios(inventariosData);

        } catch (error) {
            console.error('Erro ao carregar dados:', error);
        } finally {
            setLoading(false);
        }
    };

    const operacoesUnicas = useMemo(() => {
        const operacoes = new Set<string>();
        equipes.forEach(equipe => {
            if (equipe.operacao) {
                operacoes.add(equipe.operacao);
            }
        });
        return Array.from(operacoes).sort();
    }, [equipes]);

    const filteredEquipes = useMemo(() => {
        if (!equipes || equipes.length === 0) {
            return [];
        }

        const termo = searchTerm.toLowerCase();
        return equipes.filter((equipe) => {
            const matchesSearch = !termo ||
                equipe.nome.toLowerCase().includes(termo) ||
                equipe.operacao.toLowerCase().includes(termo) ||
                equipe.base?.nome?.toLowerCase().includes(termo) ||
                equipe.contrato?.nome?.toLowerCase().includes(termo);
            const matchesContrato = selectedContrato === 'todos' || equipe.contrato_id === selectedContrato;
            const matchesOperacao = selectedOperacao === 'todos' || equipe.operacao === selectedOperacao;

            return matchesSearch && matchesContrato && matchesOperacao;
        });
    }, [equipes, selectedContrato, selectedOperacao, searchTerm]);

    const clearSearch = () => {
        setSearchTerm('');
    };

    return (
        <div className="w-full">
            {/* Header */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center">
                            <button
                                onClick={onBack}
                                className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <ChevronLeft className="h-5 w-5 text-gray-600" />
                            </button>
                            <h1 className="text-lg font-semibold text-gray-900">
                                Inventários de Equipes
                            </h1>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filtros e Search Bar */}
            <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4">
                <div className="max-w-7xl mx-auto space-y-4">
                    {/* Filtros */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <select
                                value={selectedContrato}
                                onChange={(e) => setSelectedContrato(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="todos">Todos os Contratos</option>
                                {contratos.map(contrato => (
                                    <option key={contrato.id} value={contrato.id}>
                                        {contrato.nome}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <select
                                value={selectedOperacao}
                                onChange={(e) => setSelectedOperacao(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="todos">Todas as Operações</option>
                                {operacoesUnicas.map(operacao => (
                                    <option key={operacao} value={operacao}>
                                        {operacao}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Buscar por nome, operação ou base..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                            {searchTerm && (
                                <button
                                    onClick={clearSearch}
                                    className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
                                >
                                    <X className="h-4 w-4 text-gray-400" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Loading inicial */}
            {loading && (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    <span className="ml-2 text-gray-600">Carregando equipes...</span>
                </div>
            )}

            {/* Lista de Equipes */}
            {!loading && (
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="space-y-4">
                        {filteredEquipes.map((equipe) => {
                            // Contar itens do inventário desta equipe
                            const itensInventarioEquipe = inventarios.filter(inv => inv.equipe_id === equipe.id);
                            const totalItens = itensInventarioEquipe.length;
                            const quantidadeTotal = itensInventarioEquipe.reduce((total, inv) => total + (inv.quantidade_total || 0), 0);
                            const itensComLaudo = itensInventarioEquipe.filter(inv => inv.numero_laudo).length;

                            return (
                                <div
                                    key={equipe.id}
                                    className="bg-white rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer p-4"
                                    onClick={() => onSelectEquipe(equipe.id, equipe.nome)}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-4 flex-1">
                                            <div className="flex-shrink-0">
                                                <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                                    <Users className="h-5 w-5 text-blue-600" />
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-sm font-medium text-gray-900 truncate">
                                                    {equipe.nome}
                                                </h3>
                                                <div className="flex items-center space-x-4 mt-1 flex-wrap gap-y-1">
                                                    <div className="flex items-center text-xs text-gray-500">
                                                        <Briefcase className="h-3 w-3 mr-1" />
                                                        {equipe.operacao || 'N/A'}
                                                    </div>
                                                    {equipe.base?.nome && (
                                                        <div className="flex items-center text-xs text-gray-500">
                                                            <Building className="h-3 w-3 mr-1" />
                                                            {equipe.base.nome}
                                                        </div>
                                                    )}
                                                    {equipe.contrato?.nome && (
                                                        <div className="flex items-center text-xs text-gray-500">
                                                            <FileText className="h-3 w-3 mr-1" />
                                                            {equipe.contrato.nome}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            {/* Contadores */}
                                            {totalItens > 0 && (
                                                <div className="flex items-center space-x-3 text-xs text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
                                                    <div className="text-center">
                                                        <div className="font-semibold text-gray-900">{totalItens}</div>
                                                        <div className="text-gray-500">Itens</div>
                                                    </div>
                                                    <div className="h-8 w-px bg-gray-300" />
                                                    <div className="text-center">
                                                        <div className="font-semibold text-gray-900">{quantidadeTotal}</div>
                                                        <div className="text-gray-500">Total</div>
                                                    </div>
                                                    {itensComLaudo > 0 && (
                                                        <>
                                                            <div className="h-8 w-px bg-gray-300" />
                                                            <div className="text-center">
                                                                <div className="font-semibold text-blue-600">{itensComLaudo}</div>
                                                                <div className="text-gray-500">Laudo</div>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <ChevronLeft className="h-5 w-5 text-gray-400 ml-2 flex-shrink-0 rotate-180" />
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Empty State */}
                    {filteredEquipes.length === 0 && !loading && (
                        <div className="text-center py-12">
                            <Users className="mx-auto h-12 w-12 text-gray-400" />
                            <h3 className="mt-2 text-sm font-medium text-gray-900">
                                {searchTerm ? 'Nenhuma equipe encontrada' : 'Nenhuma equipe disponível'}
                            </h3>
                            <p className="mt-1 text-sm text-gray-500">
                                {searchTerm
                                    ? 'Tente ajustar os termos de busca'
                                    : 'Não há equipes cadastradas no seu contrato'}
                            </p>
                        </div>
                    )}

                    {/* Footer Info */}
                    {!loading && filteredEquipes.length > 0 && (
                        <div className="text-center py-4">
                            <p className="text-sm text-gray-500">
                                {filteredEquipes.length} equipe{filteredEquipes.length !== 1 ? 's' : ''} encontrada{filteredEquipes.length !== 1 ? 's' : ''}
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
