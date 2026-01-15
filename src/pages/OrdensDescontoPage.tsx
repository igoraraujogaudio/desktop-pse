import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase'; // Correct path if needed, let me check where others import it from.
import { FileText, Search, Download, Clock } from 'lucide-react';

interface OrdemDesconto {
    id: string;
    created_at: string;
    descricao: string;
    valor_total: number;
    status: 'pendente' | 'assinada' | 'processada';
    observacoes?: string;
    funcionario: {
        nome: string;
    }
}

export default function OrdensDescontoPage() {
    const [orders, setOrders] = useState<OrdemDesconto[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            let query = supabase
                .from('ordens_desconto')
                .select(`
                    *,
                    funcionario:funcionarios(nome)
                `)
                .order('created_at', { ascending: false });

            const { data, error } = await query;

            if (error) throw error;
            setOrders(data || []);
        } catch (error) {
            console.error('Error fetching discount orders:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredOrders = orders.filter(order => {
        const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
        const matchesSearch = order.funcionario?.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.descricao?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pendente': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'assinada': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'processada': return 'bg-green-100 text-green-800 border-green-200';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="h-full flex flex-col bg-gray-50/50">
            {/* Header */}
            <div className="p-8 pb-4">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Ordens de Desconto</h1>
                        <p className="text-gray-500 mt-1">Gerencie as ordens de desconto geradas por avarias ou perdas</p>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar por funcionário ou descrição..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                        />
                    </div>
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none cursor-pointer min-w-[150px]"
                    >
                        <option value="all">Todos os Status</option>
                        <option value="pendente">Pendente</option>
                        <option value="assinada">Assinada</option>
                        <option value="processada">Processada</option>
                    </select>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto px-8 pb-8">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                ) : filteredOrders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                        <FileText className="w-12 h-12 mb-4 opacity-50" />
                        <p>Nenhuma ordem de desconto encontrada</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {filteredOrders.map((order) => (
                            <div key={order.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex items-center gap-4">
                                <div className="p-3 bg-red-50 text-red-600 rounded-lg">
                                    <FileText className="w-6 h-6" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between mb-1">
                                        <h3 className="font-semibold text-gray-900 truncate">{order.descricao}</h3>
                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
                                            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm text-gray-500">
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600">
                                                {order.funcionario?.nome?.charAt(0)}
                                            </div>
                                            {order.funcionario?.nome || 'Funcionário Desconhecido'}
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <Clock className="w-4 h-4" />
                                            {new Date(order.created_at).toLocaleDateString()}
                                        </div>
                                        <div className="font-medium text-gray-900 ml-auto">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.valor_total || 0)}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 border-l pl-4 ml-2">
                                    <button
                                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        title="Baixar PDF"
                                    >
                                        <Download className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
