import { useState, useEffect } from 'react';
import { estoqueService } from '../../services/estoqueService';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { emitTo } from '@tauri-apps/api/event';
import { ChevronLeft, Eye, Package, Calendar, Tag, Users } from 'lucide-react';

interface InventarioEquipeDetalhesPageProps {
    equipeId: string;
    equipeNome: string;
    onBack: () => void;
}

export default function InventarioEquipeDetalhesPage({ equipeId, equipeNome, onBack }: InventarioEquipeDetalhesPageProps) {
    const [loading, setLoading] = useState(true);
    const [inventario, setInventario] = useState<any[]>([]);
    const [sendingToSecondScreen, setSendingToSecondScreen] = useState(false);

    useEffect(() => {
        loadInventario();
    }, [equipeId]);

    useEffect(() => {
        return () => {
            console.log('🏁 [InventarioEquipeDetalhesPage] Leaving page, resetting employee view');
            emitTo('employee', 'update-employee-view', { type: 'validation-cancelled' })
                .catch(err => console.error('Error sensing reset to employee view:', err));
        };
    }, []);

    const loadInventario = async () => {
        try {
            setLoading(true);
            const data = await estoqueService.getInventarioByEquipe(equipeId);
            setInventario(data);
        } catch (error) {
            console.error('Erro ao carregar inventário (Equipe):', error);
            alert('Erro ao carregar inventário da equipe');
        } finally {
            setLoading(false);
        }
    };

    const handleMostrarInventario = async () => {
        console.log('🔍 [InventarioEquipeDetalhesPage] handleMostrarInventario called');
        try {
            setSendingToSecondScreen(true);

            // Buscar ou criar janela do funcionário
            const allWindows = await WebviewWindow.getAll();
            let employeeWindow = allWindows.find(w => w.label === 'employee');

            if (!employeeWindow) {
                console.error('❌ [InventarioEquipeDetalhesPage] Employee window not found');
                alert('Janela de funcionário não encontrada');
                return;
            }

            // Mostrar janela
            await employeeWindow.show();
            await employeeWindow.setFocus();

            // Enviar dados do inventário para a segunda tela
            // Reuse "funcionario" structure for compatibility with EmployeeView
            await emitTo('employee', 'show-inventory', {
                funcionario: {
                    id: equipeId,
                    nome: equipeNome
                },
                inventario: inventario
            });

            console.log('✅ [InventarioEquipeDetalhesPage] Inventory sent successfully');
            alert('Inventário da equipe enviado para a segunda tela!');

        } catch (error) {
            console.error('❌ [InventarioEquipeDetalhesPage] Erro ao mostrar inventário:', error);
            alert(`Erro ao enviar para segunda tela: ${error}`);
        } finally {
            setSendingToSecondScreen(false);
        }
    };

    return (
        <div className="w-full">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 mb-6">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center">
                            <button
                                onClick={onBack}
                                className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <ChevronLeft className="h-5 w-5 text-gray-600" />
                            </button>
                            <div>
                                <h1 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                    <Users className="h-5 w-5 text-blue-600" />
                                    Inventário da Equipe: {equipeNome}
                                </h1>
                                <p className="text-sm text-gray-500">
                                    {loading ? 'Carregando...' : `${inventario.length} itens em posse`}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleMostrarInventario}
                            disabled={loading || sendingToSecondScreen}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Eye className="h-4 w-4" />
                            {sendingToSecondScreen ? 'Enviando...' : 'Mostrar na Segunda Tela'}
                        </button>
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                ) : inventario.length === 0 ? (
                    <div className="bg-white rounded-lg shadow p-8 text-center">
                        <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900">Nenhum item encontrado</h3>
                        <p className="text-gray-500 mt-1">Esta equipe não possui itens em seu inventário.</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <ul className="divide-y divide-gray-200">
                            {inventario.map((item) => (
                                <li key={item.id} className="p-4 hover:bg-gray-50 transition-colors">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start space-x-4">
                                            <div className="flex-shrink-0 pt-1">
                                                <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                                    <Package className="h-5 w-5 text-blue-600" />
                                                </div>
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-medium text-gray-900">
                                                    {item.item_estoque?.nome || 'Item sem nome'}
                                                </h3>
                                                <div className="mt-1 flex items-center space-x-4 text-xs text-gray-500">
                                                    <div className="flex items-center">
                                                        <Tag className="h-3.5 w-3.5 mr-1" />
                                                        {item.item_estoque?.categoria || 'Sem categoria'}
                                                    </div>
                                                    <div className="flex items-center">
                                                        <Calendar className="h-3.5 w-3.5 mr-1" />
                                                        Entregue em: {new Date(item.data_entrega).toLocaleDateString()}
                                                    </div>
                                                    {item.item_estoque?.codigo && (
                                                        <div className="flex items-center">
                                                            <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">
                                                                {item.item_estoque.codigo}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-bold text-blue-600">
                                                {item.quantidade}
                                            </p>
                                            <p className="text-xs text-gray-500 uppercase tracking-wide">
                                                Unidades
                                            </p>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
}
