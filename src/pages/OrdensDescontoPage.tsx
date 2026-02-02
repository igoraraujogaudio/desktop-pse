import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { FileText, Search, Upload, Eye, XCircle } from 'lucide-react';
import { useUnifiedPermissions } from '../hooks/useUnifiedPermissions';
import { PDFViewerModal } from '../components/PDFViewerModal';
import { discountOrderService } from '../services/discountOrderService';
import { OrderUploadModal } from '../components/OrderUploadModal';

interface OrdemDesconto {
    id: string;
    created_at: string;
    descricao: string;
    valor_total: number;
    status: 'pendente' | 'assinada' | 'processada' | 'cancelada' | 'recusada';
    observacoes_danos?: string;
    arquivo_assinado_url?: string;
    funcionario: {
        nome: string;
        matricula: string;
        cpf?: string;
        cargo?: string;
    };
    base?: {
        nome: string;
    };
    criador?: {
        nome: string;
    };
}

export default function OrdensDescontoPage() {
    const { userBases } = useUnifiedPermissions();
    const [orders, setOrders] = useState<OrdemDesconto[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');

    // Action States
    const [selectedOrder, setSelectedOrder] = useState<OrdemDesconto | null>(null);
    const [showPDFModal, setShowPDFModal] = useState(false);
    const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // New Refusal / Upload Flow States
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    useEffect(() => {
        if (userBases.length > 0) {
            fetchOrders();
        }
    }, [userBases]);

    const fetchOrders = async () => {
        try {
            setLoading(true);

            const baseIds = userBases.map(b => b.base_id);

            let query = supabase
                .from('discount_orders')
                .select(`
                    *,
                    funcionario:funcionarios_ativos!target_user_id(nome, matricula, cpf, cargo),
                    criador:usuarios!created_by(nome)
                `)
                .eq('criado_por_setor', 'almoxarifado')
                .in('base_id', baseIds)
                .order('created_at', { ascending: false });

            const { data, error } = await query;
            if (error) throw error;

            console.log('Discount orders raw data:', data);

            // Manual mapping of base names using userBases context (works around missing FK)
            const ordersWithBase = data?.map((order: any) => {
                const userBase = userBases.find(ub => ub.base_id === order.base_id);
                return {
                    ...order,
                    base: {
                        nome: userBase?.base?.nome || 'Base Desconhecida'
                    }
                };
            });

            // Deduplicate orders to prevent key warnings
            const uniqueOrders = Array.from(new Map(ordersWithBase.map((item: any) => [item.id, item])).values());

            setOrders(uniqueOrders || []);
        } catch (error) {
            console.error('Error fetching discount orders:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleViewModel = async (order: OrdemDesconto) => {
        try {
            setLoading(true);

            // Check if PDF URL exists
            if (!order.arquivo_assinado_url) {
                alert('PDF modelo não encontrado para esta ordem.');
                return;
            }

            // Fetch PDF from existing URL
            const blob = await discountOrderService.fetchPDFFromUrl(order.arquivo_assinado_url);
            setPdfBlob(blob);
            setSelectedOrder(order);
            setShowPDFModal(true);
        } catch (error) {
            console.error('Error fetching PDF model:', error);
            alert('Erro ao carregar modelo PDF.');
        } finally {
            setLoading(false);
        }
    };

    const handleInitialUploadClick = (order: OrdemDesconto) => {
        setSelectedOrder(order);
        // Trigger file input immediately - user selects file first, then confirms action
        if (fileInputRef.current) {
            fileInputRef.current.value = ''; // Reset input
            fileInputRef.current.click();
        }
    };

    const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !selectedOrder) return;

        setSelectedFile(file);
        setShowUploadModal(true);
    };

    const handleUploadConfirm = async (action: 'assinado' | 'recusado', witnessData?: any) => {
        if (!selectedFile || !selectedOrder) return;

        try {
            setLoading(true);

            const publicUrl = await discountOrderService.uploadPDF(
                selectedFile,
                selectedOrder.id,
                action,
                witnessData
            );

            if (publicUrl) {
                alert('Operação realizada com sucesso!');
                fetchOrders(); // Refresh list
            } else {
                alert('Erro durante o processamento.');
            }
        } catch (error) {
            console.error('Error uploading file:', error);
            alert('Erro ao enviar arquivo.');
        } finally {
            setLoading(false);
            setShowUploadModal(false);
            setSelectedOrder(null);
            setSelectedFile(null);
        }
    };

    const handleCancelOrder = async (order: OrdemDesconto) => {
        if (!confirm('Tem certeza que deseja cancelar esta ordem de desconto?')) return;

        try {
            setLoading(true);
            const { error } = await supabase
                .from('discount_orders')
                .update({ status: 'cancelada' })
                .eq('id', order.id);

            if (error) throw error;

            alert('Ordem cancelada com sucesso.');
            fetchOrders();
        } catch (error) {
            console.error('Error cancelling order:', error);
            alert('Erro ao cancelar ordem.');
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

    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'pendente': return { label: 'Pendente', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
            case 'assinada': return { label: 'Assinada', className: 'bg-blue-100 text-blue-800 border-blue-200' };
            case 'recusada': return { label: 'Recusada', className: 'bg-red-100 text-red-800 border-red-200' };
            case 'processada': return { label: 'Processada', className: 'bg-green-100 text-green-800 border-green-200' };
            case 'cancelada': return { label: 'Cancelada', className: 'bg-red-100 text-red-800 border-red-200' };
            default: return { label: status, className: 'bg-gray-100 text-gray-800' };
        }
    };

    const getTypeTag = (description: string) => {
        if (description.toLowerCase().includes('perdido') || description.toLowerCase().includes('perda')) {
            return { label: 'ITEM PERDIDO', className: 'bg-red-100 text-red-700 border-red-200' };
        }
        if (description.toLowerCase().includes('danificado') || description.toLowerCase().includes('dano')) {
            return { label: 'ITEM DANIFICADO', className: 'bg-orange-100 text-orange-700 border-orange-200' };
        }
        return null;
    };

    return (
        <div className="h-full flex flex-col bg-gray-50/50">
            {/* New Upload Modal */}
            <OrderUploadModal
                isOpen={showUploadModal}
                onClose={() => {
                    setShowUploadModal(false);
                    setSelectedFile(null);
                    setSelectedOrder(null);
                }}
                onConfirm={handleUploadConfirm}
                file={selectedFile}
                orderDescription={selectedOrder?.descricao || ''}
                funcionarioNome={selectedOrder?.funcionario?.nome || ''}
            />

            {/* Hidden File Input */}
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".pdf"
                onChange={handleFileSelected}
            />

            <PDFViewerModal
                isOpen={showPDFModal}
                onClose={() => {
                    setShowPDFModal(false);
                    setPdfBlob(null);
                    setSelectedOrder(null);
                }}
                onConfirm={() => { }}
                pdfBlob={pdfBlob}
                viewOnly={true}
                title={`Ordem #${selectedOrder?.id?.slice(0, 8)}`}
            />

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
                        <option value="recusada">Recusada</option>
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
                        {filteredOrders.map((order) => {
                            const statusInfo = getStatusInfo(order.status);
                            const typeTag = getTypeTag(order.descricao);

                            return (
                                <div key={order.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-gray-900 text-lg">
                                                {order.funcionario?.nome || 'Funcionário Desconhecido'}
                                            </h3>
                                            {order.funcionario?.matricula && (
                                                <span className="text-gray-500 font-mono text-sm">({order.funcionario.matricula})</span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {typeTag && (
                                                <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold border ${typeTag.className}`}>
                                                    {typeTag.label}
                                                </span>
                                            )}
                                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border uppercase ${statusInfo.className}`}>
                                                {statusInfo.label}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="mb-4">
                                        <p className="text-gray-800 font-medium">
                                            {order.descricao}
                                        </p>
                                        <div className="flex items-center justify-between mt-2 text-sm text-gray-500">
                                            <div className="flex items-center gap-1">
                                                <span>{new Date(order.created_at).toLocaleDateString()}</span>
                                                {order.criador?.nome && (
                                                    <span className="text-gray-400">por <span className="text-gray-600 font-medium uppercase">{order.criador.nome}</span></span>
                                                )}
                                            </div>
                                            <div className="font-bold text-lg text-gray-900">
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.valor_total || 0)}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-2">
                                        <button
                                            onClick={() => handleInitialUploadClick(order)}
                                            className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-1.5"
                                        >
                                            <Upload className="w-4 h-4" /> Upload Assinado
                                        </button>
                                        <button
                                            onClick={() => handleCancelOrder(order)}
                                            className="px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-1.5"
                                        >
                                            <XCircle className="w-4 h-4" /> Cancelar
                                        </button>
                                        <button
                                            onClick={() => handleViewModel(order)}
                                            className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-1.5 border border-transparent hover:border-gray-200 rounded-lg"
                                        >
                                            <Eye className="w-4 h-4" /> {['assinada', 'processada', 'cancelada', 'recusada'].includes(order.status) ? 'Ver Ordem' : 'Ver Modelo'}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
