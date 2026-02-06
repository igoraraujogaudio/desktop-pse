/**
 * Hook para gerenciar operações offline
 * Fornece funções para aprovar, entregar e rejeitar solicitações offline
 */

import { useState, useEffect } from 'react';
import { offlineCache } from '../services/offlineCache';
import { offlineSync } from '../services/offlineSync';
import { supabase } from '../lib/supabase';

export function useOffline() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncQueueCount, setSyncQueueCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // Inicializar cache
    offlineCache.init().catch(console.error);

    // Listeners de conexão
    const handleOnline = () => {
      setIsOnline(true);
      syncWithServer();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Atualizar contador da fila periodicamente
    const interval = setInterval(updateQueueCount, 5000);
    updateQueueCount();

    // Iniciar sync automático
    offlineSync.startAutoSync(5); // A cada 5 minutos

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
      offlineSync.stopAutoSync();
    };
  }, []);

  const updateQueueCount = async () => {
    try {
      const queue = await offlineCache.getSyncQueue();
      setSyncQueueCount(queue.length);
    } catch (error) {
      console.error('Error updating queue count:', error);
    }
  };

  const syncWithServer = async () => {
    setIsSyncing(true);
    try {
      await offlineSync.syncAll();
      await updateQueueCount();
    } catch (error) {
      console.error('Error syncing:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  // ============================================================================
  // OPERAÇÕES OFFLINE
  // ============================================================================

  const approveSolicitacao = async (
    solicitacaoId: string,
    quantidadeAprovada: number,
    aprovadoPor: string
  ): Promise<void> => {
    try {
      if (isOnline) {
        // Online: executar diretamente
        const { error } = await supabase
          .from('solicitacoes_itens')
          .update({
            status: 'aprovada',
            quantidade_aprovada: quantidadeAprovada,
            aprovado_por: aprovadoPor,
            aprovado_em: new Date().toISOString(),
            atualizado_em: new Date().toISOString(),
          })
          .eq('id', solicitacaoId);

        if (error) throw error;

        // Atualizar cache local
        const solicitacao = await offlineCache.getSolicitacaoById(solicitacaoId);
        if (solicitacao) {
          await offlineCache.cacheSolicitacoes([{
            ...solicitacao,
            status: 'aprovada',
            quantidade_aprovada: quantidadeAprovada,
            aprovado_por: aprovadoPor,
            aprovado_em: new Date().toISOString(),
          }]);
        }
      } else {
        // Offline: adicionar à fila
        await offlineCache.addToSyncQueue({
          type: 'approve',
          table: 'solicitacoes_itens',
          data: {
            solicitacao_id: solicitacaoId,
            quantidade_aprovada: quantidadeAprovada,
            aprovado_por: aprovadoPor,
          },
        });

        // Atualizar cache local otimisticamente
        const solicitacao = await offlineCache.getSolicitacaoById(solicitacaoId);
        if (solicitacao) {
          await offlineCache.cacheSolicitacoes([{
            ...solicitacao,
            status: 'aprovada',
            quantidade_aprovada: quantidadeAprovada,
            aprovado_por: aprovadoPor,
            aprovado_em: new Date().toISOString(),
            _pendingSync: true, // Marcador de sincronização pendente
          }]);
        }

        await updateQueueCount();
      }
    } catch (error) {
      console.error('Error approving solicitacao:', error);
      throw error;
    }
  };

  const deliverSolicitacao = async (
    solicitacaoId: string,
    entregadorId: string,
    quantidadeEntregue: number,
    observacoes?: string,
    numeroLaudo?: string,
    validadeLaudo?: string
  ): Promise<void> => {
    try {
      if (isOnline) {
        // Online: usar função SQL
        const solicitacao = await offlineCache.getSolicitacaoById(solicitacaoId);
        const funcaoSQL = solicitacao?.destinatario_equipe_id 
          ? 'entregar_item_para_equipe' 
          : 'entregar_item_estoque';

        const { error } = await supabase.rpc(funcaoSQL, {
          p_solicitacao_id: solicitacaoId,
          p_entregador_id: entregadorId,
          p_quantidade_entregue: quantidadeEntregue,
          p_condicao_entrega: 'novo',
          p_observacoes_entrega: observacoes || '',
          p_entregue_em: new Date().toISOString(),
          p_atualizado_em: new Date().toISOString(),
          p_numero_laudo: numeroLaudo || null,
          p_validade_laudo: validadeLaudo || null,
        });

        if (error) throw error;

        // Atualizar cache
        if (solicitacao) {
          await offlineCache.cacheSolicitacoes([{
            ...solicitacao,
            status: 'entregue',
            quantidade_entregue: quantidadeEntregue,
            entregue_por: entregadorId,
            entregue_em: new Date().toISOString(),
          }]);
        }
      } else {
        // Offline: adicionar à fila
        await offlineCache.addToSyncQueue({
          type: 'deliver',
          table: 'solicitacoes_itens',
          data: {
            solicitacao_id: solicitacaoId,
            entregador_id: entregadorId,
            quantidade_entregue: quantidadeEntregue,
            observacoes,
            numero_laudo: numeroLaudo,
            validade_laudo: validadeLaudo,
          },
        });

        // Atualizar cache otimisticamente
        const solicitacao = await offlineCache.getSolicitacaoById(solicitacaoId);
        if (solicitacao) {
          await offlineCache.cacheSolicitacoes([{
            ...solicitacao,
            status: 'entregue',
            quantidade_entregue: quantidadeEntregue,
            entregue_por: entregadorId,
            entregue_em: new Date().toISOString(),
            _pendingSync: true,
          }]);
        }

        await updateQueueCount();
      }
    } catch (error) {
      console.error('Error delivering solicitacao:', error);
      throw error;
    }
  };

  const rejectSolicitacao = async (
    solicitacaoId: string,
    motivoRejeicao: string,
    rejeitadoPor: string
  ): Promise<void> => {
    try {
      if (isOnline) {
        // Online: executar diretamente
        const { error } = await supabase
          .from('solicitacoes_itens')
          .update({
            status: 'rejeitada',
            motivo_rejeicao: motivoRejeicao,
            rejeitado_por: rejeitadoPor,
            rejeitado_em: new Date().toISOString(),
            atualizado_em: new Date().toISOString(),
          })
          .eq('id', solicitacaoId);

        if (error) throw error;

        // Atualizar cache
        const solicitacao = await offlineCache.getSolicitacaoById(solicitacaoId);
        if (solicitacao) {
          await offlineCache.cacheSolicitacoes([{
            ...solicitacao,
            status: 'rejeitada',
            motivo_rejeicao: motivoRejeicao,
            rejeitado_por: rejeitadoPor,
            rejeitado_em: new Date().toISOString(),
          }]);
        }
      } else {
        // Offline: adicionar à fila
        await offlineCache.addToSyncQueue({
          type: 'reject',
          table: 'solicitacoes_itens',
          data: {
            solicitacao_id: solicitacaoId,
            motivo_rejeicao: motivoRejeicao,
            rejeitado_por: rejeitadoPor,
          },
        });

        // Atualizar cache otimisticamente
        const solicitacao = await offlineCache.getSolicitacaoById(solicitacaoId);
        if (solicitacao) {
          await offlineCache.cacheSolicitacoes([{
            ...solicitacao,
            status: 'rejeitada',
            motivo_rejeicao: motivoRejeicao,
            rejeitado_por: rejeitadoPor,
            rejeitado_em: new Date().toISOString(),
            _pendingSync: true,
          }]);
        }

        await updateQueueCount();
      }
    } catch (error) {
      console.error('Error rejecting solicitacao:', error);
      throw error;
    }
  };

  // ============================================================================
  // BUSCAR DADOS (CACHE-FIRST)
  // ============================================================================

  const getSolicitacoesByStatus = async (status: string): Promise<any[]> => {
    try {
      // Tentar buscar do cache primeiro
      const cached = await offlineCache.getSolicitacoesByStatus(status);
      
      if (isOnline) {
        // Se online, buscar do servidor em background e atualizar cache
        try {
          const { data } = await supabase
            .from('solicitacoes_itens')
            .select(`
              *,
              item:itens_estoque!solicitacoes_itens_item_id_fkey(id, nome, codigo, estoque_atual),
              solicitante:usuarios!solicitacoes_itens_solicitante_id_fkey(id, nome, email),
              destinatario:funcionarios_ativos!solicitacoes_itens_destinatario_id_fkey(id, nome, matricula),
              base:bases!solicitacoes_itens_base_id_fkey(id, nome)
            `)
            .eq('status', status)
            .order('criado_em', { ascending: false });

          if (data) {
            await offlineCache.cacheSolicitacoes(data);
            return data;
          }
        } catch (error) {
          console.warn('Failed to fetch from server, using cache:', error);
        }
      }

      return cached;
    } catch (error) {
      console.error('Error getting solicitacoes:', error);
      return [];
    }
  };

  return {
    isOnline,
    isSyncing,
    syncQueueCount,
    syncWithServer,
    approveSolicitacao,
    deliverSolicitacao,
    rejectSolicitacao,
    getSolicitacoesByStatus,
    offlineCache,
  };
}
