/**
 * Serviço de Sincronização Offline
 * Gerencia sincronização automática quando a conexão retorna
 */

import { supabase } from '../lib/supabase';
import { offlineCache } from './offlineCache';

class OfflineSyncService {
  private isSyncing = false;
  private syncInterval: NodeJS.Timeout | null = null;
  private isOnline = navigator.onLine;

  constructor() {
    this.setupOnlineListeners();
  }

  private setupOnlineListeners(): void {
    window.addEventListener('online', () => {
      console.log('🌐 [OfflineSync] Connection restored - starting sync');
      this.isOnline = true;
      this.syncAll();
    });

    window.addEventListener('offline', () => {
      console.log('📴 [OfflineSync] Connection lost - entering offline mode');
      this.isOnline = false;
    });
  }

  getOnlineStatus(): boolean {
    return this.isOnline;
  }

  async syncAll(): Promise<void> {
    if (this.isSyncing) {
      console.log('⏳ [OfflineSync] Sync already in progress');
      return;
    }

    if (!this.isOnline) {
      console.log('📴 [OfflineSync] Offline - skipping sync');
      return;
    }

    this.isSyncing = true;
    console.log('🔄 [OfflineSync] Starting full sync...');

    try {
      // 1. Processar fila de sincronização (operações offline)
      await this.processSyncQueue();

      // 2. Atualizar cache com dados mais recentes do servidor
      await this.refreshCache();

      console.log('✅ [OfflineSync] Sync completed successfully');
    } catch (error) {
      console.error('❌ [OfflineSync] Sync failed:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  private async processSyncQueue(): Promise<void> {
    const queue = await offlineCache.getSyncQueue();
    console.log(`📋 [OfflineSync] Processing ${queue.length} queued operations`);

    for (const item of queue) {
      try {
        console.log(`🔄 [OfflineSync] Processing: ${item.type} on ${item.table}`);
        
        switch (item.type) {
          case 'approve':
            await this.syncApproval(item);
            break;
          case 'deliver':
            await this.syncDelivery(item);
            break;
          case 'reject':
            await this.syncRejection(item);
            break;
          case 'create':
            await this.syncCreate(item);
            break;
          case 'update':
            await this.syncUpdate(item);
            break;
        }

        // Remover da fila após sucesso
        await offlineCache.removeFromSyncQueue(item.id!);
        console.log(`✅ [OfflineSync] Synced: ${item.type} on ${item.table}`);

      } catch (error) {
        console.error(`❌ [OfflineSync] Failed to sync item ${item.id}:`, error);
        
        // Incrementar contador de tentativas
        await offlineCache.updateSyncQueueItem(item.id!, {
          retries: item.retries + 1,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        // Se falhou muitas vezes, marcar como erro permanente
        if (item.retries >= 3) {
          console.error(`🚨 [OfflineSync] Item ${item.id} failed after 3 retries - marking as permanent error`);
        }
      }
    }
  }

  private async syncApproval(item: any): Promise<void> {
    const { solicitacao_id, quantidade_aprovada, aprovado_por } = item.data;
    
    const { error } = await supabase
      .from('solicitacoes_itens')
      .update({
        status: 'aprovada',
        quantidade_aprovada,
        aprovado_por,
        aprovado_em: item.timestamp,
        atualizado_em: item.timestamp,
      })
      .eq('id', solicitacao_id);

    if (error) throw error;
  }

  private async syncDelivery(item: any): Promise<void> {
    const { solicitacao_id, entregador_id, quantidade_entregue, observacoes, numero_laudo, validade_laudo } = item.data;
    
    // Usar a função SQL para garantir débito de estoque e inventário
    const { error } = await supabase.rpc('entregar_item_estoque', {
      p_solicitacao_id: solicitacao_id,
      p_entregador_id: entregador_id,
      p_quantidade_entregue: quantidade_entregue,
      p_condicao_entrega: 'novo',
      p_observacoes_entrega: observacoes || '',
      p_entregue_em: item.timestamp,
      p_atualizado_em: item.timestamp,
      p_numero_laudo: numero_laudo || null,
      p_validade_laudo: validade_laudo || null,
    });

    if (error) throw error;
  }

  private async syncRejection(item: any): Promise<void> {
    const { solicitacao_id, motivo_rejeicao, rejeitado_por } = item.data;
    
    const { error } = await supabase
      .from('solicitacoes_itens')
      .update({
        status: 'rejeitada',
        motivo_rejeicao,
        rejeitado_por,
        rejeitado_em: item.timestamp,
        atualizado_em: item.timestamp,
      })
      .eq('id', solicitacao_id);

    if (error) throw error;
  }

  private async syncCreate(item: any): Promise<void> {
    const { error } = await supabase
      .from(item.table)
      .insert(item.data);

    if (error) throw error;
  }

  private async syncUpdate(item: any): Promise<void> {
    const { id, ...updateData } = item.data;
    
    const { error } = await supabase
      .from(item.table)
      .update(updateData)
      .eq('id', id);

    if (error) throw error;
  }

  private async refreshCache(): Promise<void> {
    console.log('🔄 [OfflineSync] Refreshing cache from server...');

    try {
      // Buscar dados atualizados do servidor
      const [solicitacoes, itens, bases] = await Promise.all([
        this.fetchSolicitacoes(),
        this.fetchItensEstoque(),
        this.fetchBases(),
      ]);

      // Atualizar cache local
      await Promise.all([
        offlineCache.cacheSolicitacoes(solicitacoes),
        offlineCache.cacheItensEstoque(itens),
        offlineCache.cacheBases(bases),
      ]);

      // Atualizar timestamp de última sincronização
      await offlineCache.setLastSync('full_sync');

      console.log('✅ [OfflineSync] Cache refreshed');
    } catch (error) {
      console.error('❌ [OfflineSync] Failed to refresh cache:', error);
      throw error;
    }
  }

  private async fetchSolicitacoes(): Promise<any[]> {
    const { data, error } = await supabase
      .from('solicitacoes_itens')
      .select(`
        *,
        item:itens_estoque!solicitacoes_itens_item_id_fkey(id, nome, codigo, estoque_atual),
        solicitante:usuarios!solicitacoes_itens_solicitante_id_fkey(id, nome, email),
        destinatario:funcionarios_ativos!solicitacoes_itens_destinatario_id_fkey(id, nome, matricula),
        base:bases!solicitacoes_itens_base_id_fkey(id, nome)
      `)
      .in('status', ['pendente', 'aprovada', 'aguardando_estoque'])
      .order('criado_em', { ascending: false })
      .limit(500);

    if (error) throw error;
    return data || [];
  }

  private async fetchItensEstoque(): Promise<any[]> {
    const { data, error } = await supabase
      .from('itens_estoque')
      .select('*')
      .order('nome');

    if (error) throw error;
    return data || [];
  }

  private async fetchBases(): Promise<any[]> {
    const { data, error } = await supabase
      .from('bases')
      .select('*')
      .eq('ativa', true)
      .order('nome');

    if (error) throw error;
    return data || [];
  }

  startAutoSync(intervalMinutes: number = 5): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(() => {
      if (this.isOnline) {
        this.syncAll();
      }
    }, intervalMinutes * 60 * 1000);

    console.log(`✅ [OfflineSync] Auto-sync started (every ${intervalMinutes} minutes)`);
  }

  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('⏹️ [OfflineSync] Auto-sync stopped');
    }
  }
}

export const offlineSync = new OfflineSyncService();
