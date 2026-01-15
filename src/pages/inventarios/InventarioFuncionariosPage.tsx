import { useState, useEffect, useMemo } from 'react';
import { userService } from '../../services/userService';
import { ChevronLeft, Search, X, Loader2, Users, UserCheck, Briefcase, Building } from 'lucide-react';

interface Funcionario {
    id: string;
    nome: string;
    matricula?: string;
    cargo?: string;
    operacao?: string;
    email?: string;
    status?: string;
}

interface InventarioFuncionariosPageProps {
    onBack: () => void;
    onSelectFuncionario: (id: string, nome: string) => void;
}

export default function InventarioFuncionariosPage({ onBack, onSelectFuncionario }: InventarioFuncionariosPageProps) {
    const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadFuncionarios();
    }, []);

    const loadFuncionarios = async () => {
        try {
            setLoading(true);
            const funcionariosAtivos = await userService.getUsuariosAtivos();
            setFuncionarios(funcionariosAtivos);
        } catch (error) {
            console.error('Erro ao carregar funcionários:', error);
        } finally {
            setLoading(false);
        }
    };

    const funcionariosFiltrados = useMemo(() => {
        if (!searchTerm.trim()) {
            return funcionarios;
        }

        const termo = searchTerm.toLowerCase();
        return funcionarios.filter(funcionario => {
            const nomeLower = funcionario.nome.toLowerCase();
            const matriculaLower = funcionario.matricula?.toLowerCase() || '';
            const cargoLower = funcionario.cargo?.toLowerCase() || '';
            const operacaoLower = funcionario.operacao?.toLowerCase() || '';

            return nomeLower.includes(termo) ||
                matriculaLower.includes(termo) ||
                cargoLower.includes(termo) ||
                operacaoLower.includes(termo);
        });
    }, [funcionarios, searchTerm]);

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
                                Inventários de Funcionários
                            </h1>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search Bar */}
            <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4">
                <div className="max-w-7xl mx-auto">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar por nome, matrícula ou cargo..."
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

            {/* Loading */}
            {loading && (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    <span className="ml-2 text-gray-600">Carregando funcionários...</span>
                </div>
            )}

            {/* Lista de Funcionários */}
            {!loading && (
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="space-y-4">
                        {funcionariosFiltrados.map((funcionario) => (
                            <div
                                key={funcionario.id}
                                className="bg-white rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer p-4"
                                onClick={() => onSelectFuncionario(funcionario.id, funcionario.nome)}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-4">
                                        <div className="flex-shrink-0">
                                            <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                                <UserCheck className="h-5 w-5 text-blue-600" />
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-sm font-medium text-gray-900 truncate">
                                                {funcionario.nome}
                                            </h3>
                                            <div className="flex items-center space-x-4 mt-1">
                                                <div className="flex items-center text-xs text-gray-500">
                                                    <UserCheck className="h-3 w-3 mr-1" />
                                                    {funcionario.matricula || 'N/A'}
                                                </div>
                                                <div className="flex items-center text-xs text-gray-500">
                                                    <Briefcase className="h-3 w-3 mr-1" />
                                                    {funcionario.cargo || 'N/A'}
                                                </div>
                                                {funcionario.operacao && (
                                                    <div className="flex items-center text-xs text-gray-500">
                                                        <Building className="h-3 w-3 mr-1" />
                                                        {funcionario.operacao}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <ChevronLeft className="h-5 w-5 text-gray-400 rotate-180" />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Empty State */}
                    {funcionariosFiltrados.length === 0 && !loading && (
                        <div className="text-center py-12">
                            <Users className="mx-auto h-12 w-12 text-gray-400" />
                            <h3 className="mt-2 text-sm font-medium text-gray-900">
                                {searchTerm ? 'Nenhum funcionário encontrado' : 'Nenhum funcionário disponível'}
                            </h3>
                            <p className="mt-1 text-sm text-gray-500">
                                {searchTerm
                                    ? 'Tente ajustar os termos de busca'
                                    : 'Não há funcionários cadastrados no seu contrato'}
                            </p>
                        </div>
                    )}

                    {/* Footer Info */}
                    {!loading && funcionariosFiltrados.length > 0 && (
                        <div className="text-center py-4">
                            <p className="text-sm text-gray-500">
                                {funcionariosFiltrados.length} funcionário{funcionariosFiltrados.length !== 1 ? 's' : ''} encontrado{funcionariosFiltrados.length !== 1 ? 's' : ''}
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
