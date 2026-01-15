import { useState, useEffect } from 'react';
import { inventarioService } from '../../services/inventarioService';
import { Package, Users, UserCheck, AlertTriangle, RefreshCw } from 'lucide-react';

interface InventarioStats {
    equipes_total: number;
    equipes_atualizadas: number;
    funcionarios_total: number;
    funcionarios_atualizados: number;
    itens_distribuidos: number;
    laudos_vencendo: number;
}

interface InventariosHubPageProps {
    onNavigate: (page: 'equipes' | 'funcionarios') => void;
}

export default function InventariosHubPage({ onNavigate }: InventariosHubPageProps) {
    const [stats, setStats] = useState<InventarioStats>({
        equipes_total: 0,
        equipes_atualizadas: 0,
        funcionarios_total: 0,
        funcionarios_atualizados: 0,
        itens_distribuidos: 0,
        laudos_vencendo: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            setLoading(true);
            const statsData = await inventarioService.getStats();
            setStats(statsData);
        } catch (error) {
            console.error('Erro ao carregar estatísticas:', error);
        } finally {
            setLoading(false);
        }
    };

    const inventarioOptions = [
        {
            id: 'funcionarios',
            title: 'Inventário de Funcionários',
            description: 'Controle EPIs e equipamentos por funcionário',
            icon: UserCheck,
            color: 'bg-green-500',
            stats: {
                total: stats.funcionarios_total,
                updated: stats.funcionarios_atualizados,
                percentage: stats.funcionarios_total > 0 ? Math.round((stats.funcionarios_atualizados / stats.funcionarios_total) * 100) : 0
            }
        },
        {
            id: 'equipes',
            title: 'Inventário de Equipes',
            description: 'Gerencie itens distribuídos para equipes específicas',
            icon: Users,
            color: 'bg-blue-500',
            stats: {
                total: stats.equipes_total,
                updated: stats.equipes_atualizadas,
                percentage: stats.equipes_total > 0 ? Math.round((stats.equipes_atualizadas / stats.equipes_total) * 100) : 0
            }
        }
    ];

    return (
        <div className="w-full">
            <div className="space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Inventários</h1>
                        <p className="text-gray-600">Central de controle de inventários do almoxarifado</p>
                    </div>
                    <button
                        onClick={loadStats}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        Atualizar
                    </button>
                </div>

                {/* Cards de Estatísticas Gerais */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-medium text-gray-600">Itens Distribuídos</h3>
                            <Package className="h-4 w-4 text-gray-400" />
                        </div>
                        <div className="text-2xl font-bold text-gray-900">{stats.itens_distribuidos.toLocaleString()}</div>
                        <p className="text-xs text-gray-500">Total em uso</p>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-medium text-gray-600">Equipes Ativas</h3>
                            <Users className="h-4 w-4 text-gray-400" />
                        </div>
                        <div className="text-2xl font-bold text-gray-900">{stats.equipes_total}</div>
                        <p className="text-xs text-gray-500">{stats.equipes_atualizadas} atualizadas</p>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-medium text-gray-600">Funcionários</h3>
                            <UserCheck className="h-4 w-4 text-gray-400" />
                        </div>
                        <div className="text-2xl font-bold text-gray-900">{stats.funcionarios_total}</div>
                        <p className="text-xs text-gray-500">{stats.funcionarios_atualizados} com inventário</p>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-medium text-gray-600">Laudos Vencendo</h3>
                            <AlertTriangle className="h-4 w-4 text-orange-500" />
                        </div>
                        <div className="text-2xl font-bold text-orange-600">{stats.laudos_vencendo}</div>
                        <p className="text-xs text-gray-500">Próximos 30 dias</p>
                    </div>
                </div>

                {/* Opções de Inventário */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {inventarioOptions.map((option) => {
                        const Icon = option.icon;
                        return (
                            <div
                                key={option.id}
                                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer"
                                onClick={() => onNavigate(option.id as 'equipes' | 'funcionarios')}
                            >
                                <div className="p-6">
                                    <div className="flex items-center mb-4">
                                        <div className={`p-3 rounded-lg ${option.color}`}>
                                            <Icon className="h-6 w-6 text-white" />
                                        </div>
                                    </div>
                                    <h2 className="text-xl font-bold text-gray-900 mb-2 hover:text-blue-600 transition-colors">
                                        {option.title}
                                    </h2>
                                    <p className="text-gray-600 mb-4">{option.description}</p>

                                    {/* Estatísticas */}
                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-gray-900">{option.stats.total}</div>
                                            <div className="text-sm text-gray-500">Total</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-green-600">{option.stats.updated}</div>
                                            <div className="text-sm text-gray-500">Atualizados</div>
                                        </div>
                                    </div>



                                    {/* Botão de Ação */}
                                    <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors">
                                        Acessar {option.title}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Alertas */}
                {stats.laudos_vencendo > 0 && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                            <div>
                                <h3 className="text-lg font-bold text-orange-800 mb-1">Atenção Necessária</h3>
                                <p className="text-orange-700">
                                    Existem <strong>{stats.laudos_vencendo} laudos</strong> que irão vencer nos próximos 30 dias.
                                    Verifique os inventários para garantir a conformidade.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
