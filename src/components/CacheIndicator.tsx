/**
 * Indicador de Cache Offline
 * Mostra status do cache e permite sincronização manual
 */

import { useState, useEffect } from 'react';
import { Database, RefreshCw } from 'lucide-react';
import { offlineCache } from '../services/offlineCache';
import { supabase } from '../lib/supabase';

interface CacheIndicatorProps {
  userId: string;
}

export function CacheIndicator({ userId }: CacheIndicatorProps) {
  const [cacheStatus, setCacheStatus] = useState<{
    solicitacoes: number;
    itens: number;
    lastSync: string | null;
    isLoading: boolean;
  }>({
    solicitacoes: 0,
    itens: 0,
    lastSync: null,
    isLoading: false,
  });

  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadCacheStatus();
    const interval = setInterval(loadCacheStatus, 10000); // Atualizar a cada 10s
    return () => clearInterval(interval);
  }, [userId]);

  const loadCacheStatus = async () => {
    try {
      await offlineCache.init();

      // Contar TODOS os itens no cache
      const db = await offlineCache['db'];
      if (!db) {
        await offlineCache.init();
      }

      const [solicitacoesPendentes, solicitacoesAprovadas, solicitacoesAguardando, itensEstoque, lastSync] = await Promise.all([
        offlineCache.getSolicitacoesByStatus('pendente').then(s => s.length),
        offlineCache.getSolicitacoesByStatus('aprovada').then(s => s.length),
        offlineCache.getSolicitacoesByStatus('aguardando_estoque').then(s => s.length),
        offlineCache['db']?.getAll('itens_estoque').then(i => i?.length || 0) || 0,
        offlineCache.getLastSync('full_sync'),
      ]);

      const totalSolicitacoes = solicitacoesPendentes + solicitacoesAprovadas + solicitacoesAguardando;

      setCacheStatus({
        solicitacoes: totalSolicitacoes,
        itens: itensEstoque,
        lastSync,
        isLoading: false,
      });
    } catch (error) {
      console.error('Error loading cache status:', error);
    }
  };

  const refreshCache = async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    setCacheStatus(prev => ({ ...prev, isLoading: true }));

    try {
      console.log('🔄 [CacheIndicator] Starting cache refresh...');

      // Calcular data de 7 dias atrás
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const dateFilter = sevenDaysAgo.toISOString();

      console.log(`📅 [CacheIndicator] Filtering data from last 7 days (since ${dateFilter})`);

      // 1. Buscar solicitações dos últimos 7 dias
      const { data: solicitacoes, error: solError } = await supabase
        .from('solicitacoes_itens')
        .select(`
          *,
          item:itens_estoque!solicitacoes_itens_item_id_fkey(id, nome, codigo, estoque_atual),
          solicitante:usuarios!solicitacoes_itens_solicitante_id_fkey(id, nome, email),
          destinatario:funcionarios_ativos!solicitacoes_itens_destinatario_id_fkey(id, nome, matricula),
          destinatario_equipe:equipes!solicitacoes_itens_destinatario_equipe_id_fkey(id, nome),
          responsavel_equipe:usuarios!solicitacoes_itens_responsavel_equipe_id_fkey(id, nome),
          base:bases!solicitacoes_itens_base_id_fkey(id, nome)
        `)
        .in('status', ['pendente', 'aprovada', 'aguardando_estoque'])
        .gte('criado_em', dateFilter)
        .order('criado_em', { ascending: false })
        .limit(500);

      if (solError) throw solError;

      // 2. Buscar TODOS os itens de estoque
      const { data: itens, error: itensError } = await supabase
        .from('itens_estoque')
        .select('*')
        .order('nome');

      if (itensError) throw itensError;

      // 3. Buscar bases
      const { data: bases, error: basesError } = await supabase
        .from('bases')
        .select('*')
        .eq('ativa', true)
        .order('nome');

      if (basesError) throw basesError;

      // 4. Buscar usuários (para referências)
      const { data: usuarios, error: usuariosError } = await supabase
        .from('usuarios')
        .select('id, nome, email, matricula')
        .eq('ativo', true)
        .limit(500);

      if (usuariosError) throw usuariosError;

      // 5. Buscar inventário do funcionário
      const { data: inventario, error: invError } = await supabase
        .from('inventario_funcionario')
        .select('*')
        .eq('funcionario_id', userId)
        .eq('status', 'em_uso');

      if (invError) throw invError;

      // 6. Buscar templates biométricos
      const { data: biometricTemplates, error: bioError } = await supabase
        .from('biometric_templates')
        .select('*')
        .limit(1000);

      if (bioError) {
        console.warn('⚠️ [CacheIndicator] Could not fetch biometric templates:', bioError);
      }

      // Salvar no cache
      await Promise.all([
        offlineCache.cacheSolicitacoes(solicitacoes || []),
        offlineCache.cacheItensEstoque(itens || []),
        offlineCache.cacheBases(bases || []),
        offlineCache.cacheUsuarios(usuarios || []),
        offlineCache.cacheInventarioFuncionario(inventario || []),
        offlineCache.cacheBiometricTemplates(biometricTemplates || []),
      ]);

      // Atualizar timestamp
      await offlineCache.setLastSync('full_sync');

      console.log('✅ [CacheIndicator] Cache refreshed successfully');
      console.log(`   - Solicitações: ${solicitacoes?.length || 0}`);
      console.log(`   - Itens: ${itens?.length || 0}`);
      console.log(`   - Bases: ${bases?.length || 0}`);
      console.log(`   - Usuários: ${usuarios?.length || 0}`);
      console.log(`   - Inventário: ${inventario?.length || 0}`);
      console.log(`   - Templates biométricos: ${biometricTemplates?.length || 0}`);

      await loadCacheStatus();
    } catch (error) {
      console.error('❌ [CacheIndicator] Error refreshing cache:', error);
      alert('Erro ao atualizar cache. Verifique sua conexão.');
    } finally {
      setIsRefreshing(false);
      setCacheStatus(prev => ({ ...prev, isLoading: false }));
    }
  };

  const formatLastSync = (lastSync: string | null): string => {
    if (!lastSync) return 'Nunca';

    const date = new Date(lastSync);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Agora mesmo';
    if (diffMins < 60) return `${diffMins} min atrás`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h atrás`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d atrás`;
  };

  const getCacheStatusColor = (): string => {
    if (!cacheStatus.lastSync) return 'text-red-600';
    
    const date = new Date(cacheStatus.lastSync);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 10) return 'text-green-600'; // Recente
    if (diffMins < 60) return 'text-yellow-600'; // Moderado
    return 'text-orange-600'; // Antigo
  };


  return (
    <div className="fixed top-4 right-4 z-50 group">
      {/* Compact Icon Button */}
      <button
        onClick={refreshCache}
        disabled={isRefreshing}
        className="bg-white rounded-full shadow-lg border border-gray-200 p-3 hover:shadow-xl transition-all disabled:opacity-50 relative"
        title="Cache Offline - Clique para atualizar"
      >
        <Database className={`w-5 h-5 ${getCacheStatusColor()}`} />
        
        {/* Refresh indicator */}
        {isRefreshing && (
          <div className="absolute inset-0 flex items-center justify-center">
            <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
          </div>
        )}

        {/* Count badge */}
        {cacheStatus.solicitacoes > 0 && (
          <div className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs font-bold rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center">
            {cacheStatus.solicitacoes}
          </div>
        )}
      </button>

      {/* Tooltip on hover */}
      <div className="absolute right-0 top-full mt-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <div className="bg-gray-900 text-white text-xs rounded-lg p-3 shadow-xl min-w-[200px]">
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-300">Solicitações:</span>
              <span className="font-semibold">{cacheStatus.solicitacoes}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Itens:</span>
              <span className="font-semibold">{cacheStatus.itens}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-gray-700">
              <span className="text-gray-300">Última sync:</span>
              <span className="font-semibold">{formatLastSync(cacheStatus.lastSync)}</span>
            </div>
          </div>
          {!cacheStatus.lastSync && (
            <div className="mt-2 pt-2 border-t border-gray-700 text-gray-400">
              Clique para carregar cache
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
