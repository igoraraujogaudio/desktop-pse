import { useState, useEffect, useMemo } from 'react';
import { useUnifiedPermissions } from '../hooks/useUnifiedPermissions';
import { useModularPermissions, PERMISSION_CODES } from '../hooks/useModularPermissions';
import { estoqueService } from '../services/estoqueService';
import { SolicitacaoItem } from '../types';
import { Base } from '../types/contratos';
import { baseService } from '../services/baseService';
import { Package, Search, Filter, RefreshCw, AlertCircle, UserPlus, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { DateFilter, DateFilterType } from '../components/DateFilter';
import { SolicitacaoCard } from '../components/SolicitacaoCard';
import { SolicitacaoDetailsPage } from './SolicitacaoDetailsPage';
import TeamDeliveryModal from '../components/TeamDeliveryModal';
import EmergencyModal from '../components/EmergencyModal';

interface SolicitacoesViewProps {
    onEntregar: (solicitacao: SolicitacaoItem) => void;
    selectedSolicitacao?: SolicitacaoItem | null;
    isDelivering?: boolean;
    onValidar?: (solicitacao?: SolicitacaoItem) => void;
    lastUpdate?: number;
}

type StatusType = 'todas' | 'pendente' | 'aprovada' | 'aguardando_estoque' | 'entregue' | 'rejeitada' | 'devolvida';

export default function SolicitacoesView({ onEntregar, selectedSolicitacao, isDelivering, onValidar, lastUpdate }: SolicitacoesViewProps) {
    const { user, hasBaseAccess } = useUnifiedPermissions();
    const { hasPermission } = useModularPermissions();

    // NAVIGATION STATE
    const [viewingDetailsId, setViewingDetailsId] = useState<string | null>(null);
    const [extraViewItem, setExtraViewItem] = useState<SolicitacaoItem | null>(null);

    const [activeStatus, setActiveStatus] = useState<StatusType>('todas');
    const [solicitacoes, setSolicitacoes] = useState<SolicitacaoItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Status counts (independent of active filter)
    const [statusCounts, setStatusCounts] = useState<Record<StatusType, number>>({
        todas: 0,
        pendente: 0,
        aprovada: 0,
        aguardando_estoque: 0,
        entregue: 0,
        rejeitada: 0,
        devolvida: 0
    });

    // Filters
    const [baseFilter, setBaseFilter] = useState<string>('todas');
    const [dateFilter, setDateFilter] = useState<DateFilterType>('7dias');
    const [startDate, setStartDate] = useState<Date | undefined>();
    const [endDate, setEndDate] = useState<Date | undefined>();

    const [availableBases, setAvailableBases] = useState<Base[]>([]);

    // Modal states
    const [emergencyModalOpen, setEmergencyModalOpen] = useState(false);
    const [_employeeModalOpen, setEmployeeModalOpen] = useState(false);
    const [teamModalOpen, setTeamModalOpen] = useState(false);

    // Permissions for buttons
    const canDeliver = hasPermission(PERMISSION_CODES.ALMOXARIFADO.CONTROLE_ENTREGA);
    const canCreateEmergency = hasPermission(PERMISSION_CODES.ALMOXARIFADO.SOLICITAR_ITEM);

    useEffect(() => {
        loadFilters();
        // Initialize date filter to 7 days
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const start = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
        const end = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1);
        setStartDate(start);
        setEndDate(end);
    }, [user]);

    useEffect(() => {
        loadSolicitacoes();
        loadStatusCounts();
    }, [activeStatus, baseFilter, startDate, endDate, lastUpdate]);

    const handleDateFilterChange = (filter: DateFilterType) => {
        setDateFilter(filter);
    };

    const handleDateRangeChange = (start: Date, end: Date) => {
        setStartDate(start);
        setEndDate(end);
    };

    const loadFilters = async () => {
        console.log('🔄 [SolicitacoesView] Loading filters for user:', user?.id);
        try {
            const bases = await baseService.getBasesAtivas();
            setAvailableBases(bases);
            console.log('✅ [SolicitacoesView] Loaded bases:', bases.length);
        } catch (error) {
            console.error('❌ [SolicitacoesView] Error loading filters:', error);
        }
    };

    const loadStatusCounts = async () => {
        if (!user) return;

        console.log('🔢 [SolicitacoesView] Loading status counts');

        try {
            const isAdmin = user.nivel_acesso === 'admin';

            // Build base query with filters
            let baseQuery = supabase
                .from('solicitacoes_itens')
                .select('id, status, base_id, criado_em', { count: 'exact', head: false });

            // Apply date filter if set
            if (dateFilter !== 'todos' && startDate && endDate) {
                baseQuery = baseQuery
                    .gte('criado_em', startDate.toISOString())
                    .lte('criado_em', endDate.toISOString());
            }

            // Apply base filter if set
            if (baseFilter !== 'todas') {
                baseQuery = baseQuery.eq('base_id', baseFilter);
            }

            // Fetch all matching records
            const { data: allRecords, error } = await baseQuery;

            if (error) {
                console.error('❌ [SolicitacoesView] Error loading status counts:', error);
                return;
            }

            // Filter by user base access if not admin
            const accessibleRecords = isAdmin
                ? allRecords || []
                : (allRecords || []).filter(r => r.base_id && hasBaseAccess(r.base_id));

            // Count by status
            const counts: Record<StatusType, number> = {
                todas: accessibleRecords.length,
                pendente: accessibleRecords.filter(r => r.status === 'pendente').length,
                aprovada: accessibleRecords.filter(r => r.status === 'aprovada').length,
                aguardando_estoque: accessibleRecords.filter(r => r.status === 'aguardando_estoque').length,
                entregue: accessibleRecords.filter(r => r.status === 'entregue').length,
                rejeitada: accessibleRecords.filter(r => r.status === 'rejeitada').length,
                devolvida: accessibleRecords.filter(r => r.status === 'devolvida').length,
            };

            console.log('✅ [SolicitacoesView] Status counts:', counts);
            setStatusCounts(counts);
        } catch (error) {
            console.error('❌ [SolicitacoesView] Error loading status counts:', error);
        }
    };

    const loadSolicitacoes = async () => {
        if (!user) {
            console.log('⚠️ [SolicitacoesView] No user, skipping load');
            return;
        }

        console.log('🔄 [SolicitacoesView] Loading solicitacoes for status:', activeStatus);
        setLoading(true);

        try {
            const isAdmin = user.nivel_acesso === 'admin';
            console.log('👤 [SolicitacoesView] User is admin:', isAdmin);

            let data: SolicitacaoItem[];

            if (activeStatus === 'todas') {
                console.log('📋 [SolicitacoesView] Fetching ALL solicitations with date filter');

                // Build query with date filtering at database level
                let query = supabase
                    .from('solicitacoes_itens')
                    .select(`
                        *,
                        item:itens_estoque!solicitacoes_itens_item_id_fkey(id, nome, codigo, estoque_atual),
                        solicitante:usuarios!solicitacoes_itens_solicitante_id_fkey(id, nome, email),
                        destinatario:usuarios!solicitacoes_itens_destinatario_id_fkey(id, nome, matricula),
                        destinatario_equipe:equipes!solicitacoes_itens_destinatario_equipe_id_fkey(id, nome),
                        responsavel_equipe:usuarios!solicitacoes_itens_responsavel_equipe_id_fkey(id, nome),
                        base:bases!solicitacoes_itens_base_id_fkey(id, nome)
                    `);

                // Apply date filter at database level if set
                if (dateFilter !== 'todos' && startDate && endDate) {
                    console.log('🗓️ [SolicitacoesView] Applying date filter:', startDate.toISOString(), 'to', endDate.toISOString());
                    query = query
                        .gte('criado_em', startDate.toISOString())
                        .lte('criado_em', endDate.toISOString());
                }

                // Apply base filter at database level if set
                if (baseFilter !== 'todas') {
                    console.log('🏢 [SolicitacoesView] Applying base filter:', baseFilter);
                    query = query.eq('base_id', baseFilter);
                }

                const { data: allData, error } = await query
                    .order('criado_em', { ascending: false })
                    .limit(1000); // Limit to prevent excessive data fetching

                if (error) {
                    console.error('❌ [SolicitacoesView] Error fetching all solicitations:', error);
                    throw error;
                }
                data = allData || [];
            } else {
                // Pass filters to status-specific query
                const filterOptions = {
                    startDate: dateFilter !== 'todos' ? startDate : undefined,
                    endDate: dateFilter !== 'todos' ? endDate : undefined,
                    baseId: baseFilter
                };
                data = await estoqueService.getSolicitacoesPorStatus(activeStatus, filterOptions);
            }

            console.log('📦 [SolicitacoesView] Fetched solicitations:', data.length);

            // Deduplicate by ID first to prevent duplicate keys
            const uniqueData = Array.from(
                new Map(data.map(item => [item.id, item])).values()
            );

            if (uniqueData.length !== data.length) {
                console.warn('⚠️ [SolicitacoesView] Found duplicate solicitations:', data.length - uniqueData.length);
            }

            let filtered = uniqueData.filter(s => {
                // Only filter by base access for non-admin users
                if (!s.base_id) {
                    console.warn('⚠️ [SolicitacoesView] Solicitation without base_id:', s.id);
                    return isAdmin;
                }

                if (!isAdmin && !hasBaseAccess(s.base_id)) {
                    console.log('🚫 [SolicitacoesView] User has no access to base:', s.base_id, s.base?.nome);
                    return false;
                }

                return true;
            });

            console.log('✅ [SolicitacoesView] Filtered solicitations:', filtered.length);
            setSolicitacoes(filtered);

            // SPECIAL CASE: If viewing details of an item that is NOT in the new list, fetch it individually
            if (viewingDetailsId) {
                const foundInList = filtered.find(s => s.id === viewingDetailsId);
                if (!foundInList) {
                    console.log('🔍 [SolicitacoesView] Viewing item not in list, fetching individually:', viewingDetailsId);

                    const { data: singleItem, error: singleError } = await supabase
                        .from('solicitacoes_itens')
                        .select(`
                            *,
                            item:itens_estoque!solicitacoes_itens_item_id_fkey(id, nome, codigo, estoque_atual),
                            solicitante:usuarios!solicitacoes_itens_solicitante_id_fkey(id, nome, email),
                            destinatario:usuarios!solicitacoes_itens_destinatario_id_fkey(id, nome, matricula),
                            destinatario_equipe:equipes!solicitacoes_itens_destinatario_equipe_id_fkey(id, nome),
                            responsavel_equipe:usuarios!solicitacoes_itens_responsavel_equipe_id_fkey(id, nome),
                            base:bases!solicitacoes_itens_base_id_fkey(id, nome)
                        `)
                        .eq('id', viewingDetailsId)
                        .single();

                    if (!singleError && singleItem) {
                        console.log('✅ [SolicitacoesView] Fetched single item:', singleItem);
                        setExtraViewItem(singleItem);
                    } else {
                        console.warn('⚠️ [SolicitacoesView] Could not fetch single item:', singleError);
                    }
                } else {
                    setExtraViewItem(null); // Clear extra item if found in list
                }
            }
        } catch (error) {
            console.error('❌ [SolicitacoesView] Error loading solicitations:', error);
            setSolicitacoes([]);
        } finally {
            setLoading(false);
        }
    };

    // ACTION HANDLERS
    const handleAprovar = async (item: SolicitacaoItem) => {
        console.log('✅ [SolicitacoesView] handleAprovar clicked for:', item.id);
        if (!user) {
            alert('Usuário não identificado.');
            return;
        }
        if (!confirm(`Aprovar solicitação de ${item.item?.nome}?`)) return;

        try {
            setLoading(true);
            await estoqueService.updateStatus(item.id, 'aprovada', user.id);
            console.log('✅ [SolicitacoesView] Approved successfully');
            loadSolicitacoes(); // Reload to show updated status
            // Stay on details page
        } catch (error) {
            console.error('❌ [SolicitacoesView] Error approving:', error);
            alert('Erro ao aprovar solicitação');
        } finally {
            setLoading(false);
        }
    };

    const handleRejeitar = async (item: SolicitacaoItem) => {
        console.log('❌ [SolicitacoesView] handleRejeitar clicked for:', item.id);

        if (!user?.id) {
            alert('Usuário não identificado. Por favor, faça login novamente.');
            return;
        }

        const motivo = prompt('Motivo da rejeição:');
        if (motivo === null) return; // Cancelled

        try {
            setLoading(true);
            await estoqueService.updateStatus(item.id, 'rejeitada', user.id, motivo);
            console.log('✅ [SolicitacoesView] Rejected successfully');
            loadSolicitacoes(); // Reload to show updated status
            // Stay on details page
        } catch (error) {
            console.error('❌ [SolicitacoesView] Error rejecting:', error);
            alert('Erro ao rejeitar solicitação');
        } finally {
            setLoading(false);
        }
    };

    const handleDevolver = async (item: SolicitacaoItem) => {
        console.log('↩️ [SolicitacoesView] handleDevolver clicked for:', item.id);

        if (!user?.id) {
            alert('Usuário não identificado. Por favor, faça login novamente.');
            return;
        }

        if (!confirm(`Confirmar devolução de ${item.item?.nome}?`)) return;
        try {
            setLoading(true);
            await estoqueService.updateStatus(item.id, 'devolvida', user.id);
            loadSolicitacoes(); // Reload to show updated status
            // Stay on details page
        } catch (error) {
            alert('Erro ao devolver item');
        } finally {
            setLoading(false);
        }
    };

    const handleTrocar = async (item: SolicitacaoItem) => {
        console.log('🔄 [SolicitacoesView] handleTrocar clicked for:', item.id);

        if (!user?.id) {
            alert('Usuário não identificado. Por favor, faça login novamente.');
            return;
        }

        if (!confirm(`Iniciar troca de ${item.item?.nome}?`)) return;
        try {
            setLoading(true);
            await estoqueService.updateStatus(item.id, 'troca', user.id);
            loadSolicitacoes(); // Reload to show updated status
            // Stay on details page
        } catch (error) {
            alert('Erro ao iniciar troca');
        } finally {
            setLoading(false);
        }
    };



    const filteredList = useMemo(() => {
        if (!searchTerm) return solicitacoes;

        const term = searchTerm.toLowerCase();
        return solicitacoes.filter(item =>
            item.item?.nome.toLowerCase().includes(term) ||
            item.item?.codigo.toLowerCase().includes(term) ||
            item.solicitante?.nome.toLowerCase().includes(term) ||
            item.destinatario?.nome.toLowerCase().includes(term)
        );
    }, [solicitacoes, searchTerm]);

    // SE ESTÁ VENDO DETALHES, MOSTRA A PÁGINA DE DETALHES
    if (viewingDetailsId) {
        // Find the solicitation from the list OR use the extra fetched item
        const solicitacaoToView = solicitacoes.find(s => s.id === viewingDetailsId) ||
            (extraViewItem?.id === viewingDetailsId ? extraViewItem : null);

        if (!solicitacaoToView) {
            // Keep waiting if loading
            if (loading) {
                return (
                    <div className="flex justify-center p-10 h-screen items-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                );
            }
            // If not found and not loading, show error or nothing (eventually should close)
            return (
                <div className="flex flex-col flex-1 h-screen items-center justify-center p-10">
                    <Package className="w-16 h-16 text-gray-300 mb-4" />
                    <h3 className="text-xl font-bold text-gray-900">Solicitação não encontrada</h3>
                    <button
                        onClick={() => setViewingDetailsId(null)}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                    >
                        Voltar para lista
                    </button>
                </div>
            );
        }

        return (
            <SolicitacaoDetailsPage
                solicitacao={solicitacaoToView}
                bases={availableBases}
                onBack={() => setViewingDetailsId(null)}
                onEntregar={onEntregar}
                onValidar={() => onValidar && onValidar(solicitacaoToView)}
                onAprovar={handleAprovar}
                onRejeitar={handleRejeitar}
                onDevolver={handleDevolver}
                onTrocar={handleTrocar}
                canDeliver={canDeliver}
                isDelivering={isDelivering}
            />
        );
    }

    // CASO CONTRÁRIO, MOSTRA A LISTA
    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Solicitações</h1>
                    <p className="text-sm text-gray-500 mt-1">Gerencie todas as solicitações de itens</p>
                </div>
                <div className="flex items-center gap-3">
                    {canCreateEmergency && (
                        <button
                            onClick={() => setEmergencyModalOpen(true)}
                            className="flex items-center gap-2 bg-red-600 text-white hover:bg-red-700 px-4 py-2 rounded-xl font-medium transition-colors shadow-lg shadow-red-200"
                        >
                            <AlertCircle className="w-4 h-4" /> Emergencial
                        </button>
                    )}
                    {canDeliver && (
                        <>
                            <button
                                onClick={() => setEmployeeModalOpen(true)}
                                className="flex items-center gap-2 bg-green-600 text-white hover:bg-green-700 px-4 py-2 rounded-xl font-medium transition-colors shadow-lg shadow-green-200"
                            >
                                <UserPlus className="w-4 h-4" /> Novo Funcionário
                            </button>
                            <button
                                onClick={() => setTeamModalOpen(true)}
                                className="flex items-center gap-2 bg-purple-600 text-white hover:bg-purple-700 px-4 py-2 rounded-xl font-medium transition-colors shadow-lg shadow-purple-200"
                            >
                                <Users className="w-4 h-4" /> Equipe
                            </button>
                        </>
                    )}
                    <button
                        onClick={loadSolicitacoes}
                        className="flex items-center gap-2 bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-xl font-medium transition-colors shadow-lg shadow-blue-200"
                    >
                        <RefreshCw className="w-4 h-4" /> Atualizar
                    </button>
                </div>
            </div>

            {/* Status Cards with Counters */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                    { status: 'todas' as const, label: 'Todas', color: 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-300' },
                    { status: 'pendente' as const, label: 'Pendente', color: 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border-yellow-300' },
                    { status: 'aprovada' as const, label: 'Aprovada', color: 'bg-green-50 text-green-700 hover:bg-green-100 border-green-300' },
                    { status: 'aguardando_estoque' as const, label: 'Aguardando', color: 'bg-orange-50 text-orange-700 hover:bg-orange-100 border-orange-300' },
                    { status: 'entregue' as const, label: 'Entregue', color: 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-300' },
                    { status: 'rejeitada' as const, label: 'Rejeitada', color: 'bg-red-50 text-red-700 hover:bg-red-100 border-red-300' },
                ].map(({ status, label, color }) => {
                    const count = statusCounts[status];
                    const isActive = activeStatus === status;

                    return (
                        <button
                            key={status}
                            onClick={() => setActiveStatus(status)}
                            className={`p-4 rounded-2xl transition-all duration-200 border-2 ${isActive
                                ? 'ring-2 ring-blue-500 shadow-lg scale-105 bg-blue-50 border-blue-500'
                                : `shadow-sm hover:shadow-md ${color}`
                                }`}
                        >
                            <div className="text-center">
                                <div className={`text-3xl font-bold ${isActive ? 'text-blue-600' : ''}`}>
                                    {count}
                                </div>
                                <div className={`text-xs font-medium mt-1 uppercase tracking-wide ${isActive ? 'text-blue-600' : ''}`}>
                                    {label}
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Filters Bar */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                <div className="flex flex-wrap gap-4 items-center">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar solicitação..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 bg-gray-50"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-gray-400" />
                        <select
                            value={baseFilter}
                            onChange={e => setBaseFilter(e.target.value)}
                            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 bg-white"
                        >
                            <option value="todas">Todas as Bases</option>
                            {availableBases.map(b => (
                                <option key={b.id} value={b.id}>{b.nome}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Date Filter */}
                <DateFilter
                    selectedFilter={dateFilter}
                    onFilterChange={handleDateFilterChange}
                    onDateRangeChange={handleDateRangeChange}
                    startDate={startDate}
                    endDate={endDate}
                />
            </div>

            {/* List */}
            {loading ? (
                <div className="flex justify-center p-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            ) : filteredList.length === 0 ? (
                <div className="bg-white rounded-[2rem] p-10 text-center border border-gray-100">
                    <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-gray-900 font-medium">Nenhuma solicitação encontrada</h3>
                    <p className="text-gray-500 text-sm">Tente mudar os filtros ou o status.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {filteredList.map(item => (
                        <div
                            key={item.id}
                            onClick={() => setViewingDetailsId(item.id)}
                            className="cursor-pointer"
                        >
                            <SolicitacaoCard
                                item={item}
                                activeStatus={activeStatus}
                                canDeliver={canDeliver}
                                selectedSolicitacao={selectedSolicitacao}
                                isDelivering={isDelivering}
                                onEntregar={onEntregar}
                                onValidar={onValidar}
                            />
                        </div>
                    ))}
                </div>
            )}

            <TeamDeliveryModal
                isOpen={teamModalOpen}
                onClose={() => setTeamModalOpen(false)}
                onSuccess={() => {
                    loadSolicitacoes();
                    alert('Entrega para equipe criada com sucesso!');
                }}
            />

            {user && (
                <EmergencyModal
                    isOpen={emergencyModalOpen}
                    onClose={() => setEmergencyModalOpen(false)}
                    onSuccess={() => {
                        loadSolicitacoes();
                        loadStatusCounts();
                    }}
                    userId={user.id}
                />
            )}
        </div>
    );
}
