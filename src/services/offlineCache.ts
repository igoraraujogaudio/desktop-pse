/**
 * Serviço de Cache Offline usando IndexedDB
 * Permite operações offline com sincronização automática quando a conexão retorna
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface OfflineDB extends DBSchema {
  // Cache de dados
  solicitacoes: {
    key: string;
    value: any;
    indexes: { 'by-status': string; 'by-base': string };
  };
  itens_estoque: {
    key: string;
    value: any;
    indexes: { 'by-base': string };
  };
  usuarios: {
    key: string;
    value: any;
  };
  bases: {
    key: string;
    value: any;
  };
  equipes: {
    key: string;
    value: any;
  };
  inventario_funcionario: {
    key: string;
    value: any;
    indexes: { 'by-funcionario': string };
  };
  inventario_equipe: {
    key: string;
    value: any;
    indexes: { 'by-equipe': string };
  };
  biometric_templates: {
    key: string;
    value: any;
    indexes: { 'by-user': string };
  };
  
  // Fila de sincronização para operações offline
  sync_queue: {
    key: number;
    value: {
      id?: number;
      type: 'approve' | 'deliver' | 'reject' | 'create' | 'update';
      table: string;
      data: any;
      timestamp: string;
      retries: number;
      error?: string;
    };
    indexes: { 'by-timestamp': string };
  };
  
  // Metadados
  metadata: {
    key: string;
    value: {
      key: string;
      lastSync: string;
      version: number;
    };
  };
}

class OfflineCacheService {
  private db: IDBPDatabase<OfflineDB> | null = null;
  private readonly DB_NAME = 'almoxarifado_offline';
  private readonly DB_VERSION = 1;

  async init(): Promise<void> {
    try {
      this.db = await openDB<OfflineDB>(this.DB_NAME, this.DB_VERSION, {
        upgrade(db) {
          // Criar stores se não existirem
          if (!db.objectStoreNames.contains('solicitacoes')) {
            const solicitacoesStore = db.createObjectStore('solicitacoes', { keyPath: 'id' });
            solicitacoesStore.createIndex('by-status', 'status');
            solicitacoesStore.createIndex('by-base', 'base_id');
          }

          if (!db.objectStoreNames.contains('itens_estoque')) {
            const itensStore = db.createObjectStore('itens_estoque', { keyPath: 'id' });
            itensStore.createIndex('by-base', 'base_id');
          }

          if (!db.objectStoreNames.contains('usuarios')) {
            db.createObjectStore('usuarios', { keyPath: 'id' });
          }

          if (!db.objectStoreNames.contains('bases')) {
            db.createObjectStore('bases', { keyPath: 'id' });
          }

          if (!db.objectStoreNames.contains('equipes')) {
            db.createObjectStore('equipes', { keyPath: 'id' });
          }

          if (!db.objectStoreNames.contains('inventario_funcionario')) {
            const invFuncStore = db.createObjectStore('inventario_funcionario', { keyPath: 'id' });
            invFuncStore.createIndex('by-funcionario', 'funcionario_id');
          }

          if (!db.objectStoreNames.contains('inventario_equipe')) {
            const invEquipeStore = db.createObjectStore('inventario_equipe', { keyPath: 'id' });
            invEquipeStore.createIndex('by-equipe', 'equipe_id');
          }

          if (!db.objectStoreNames.contains('biometric_templates')) {
            const bioStore = db.createObjectStore('biometric_templates', { keyPath: 'id' });
            bioStore.createIndex('by-user', 'user_id');
          }

          if (!db.objectStoreNames.contains('sync_queue')) {
            const syncStore = db.createObjectStore('sync_queue', { keyPath: 'id', autoIncrement: true });
            syncStore.createIndex('by-timestamp', 'timestamp');
          }

          if (!db.objectStoreNames.contains('metadata')) {
            db.createObjectStore('metadata', { keyPath: 'key' });
          }
        },
      });

      console.log('✅ [OfflineCache] IndexedDB initialized');
    } catch (error) {
      console.error('❌ [OfflineCache] Failed to initialize IndexedDB:', error);
      throw error;
    }
  }

  // ============================================================================
  // CACHE DE DADOS
  // ============================================================================

  async cacheSolicitacoes(solicitacoes: any[]): Promise<void> {
    if (!this.db) await this.init();
    const tx = this.db!.transaction('solicitacoes', 'readwrite');
    await Promise.all(solicitacoes.map(s => tx.store.put(s)));
    await tx.done;
    console.log(`✅ [OfflineCache] Cached ${solicitacoes.length} solicitações`);
  }

  async getSolicitacoesByStatus(status: string): Promise<any[]> {
    if (!this.db) await this.init();
    return await this.db!.getAllFromIndex('solicitacoes', 'by-status', status);
  }

  async getSolicitacaoById(id: string): Promise<any | undefined> {
    if (!this.db) await this.init();
    return await this.db!.get('solicitacoes', id);
  }

  async cacheItensEstoque(itens: any[]): Promise<void> {
    if (!this.db) await this.init();
    const tx = this.db!.transaction('itens_estoque', 'readwrite');
    await Promise.all(itens.map(item => tx.store.put(item)));
    await tx.done;
    console.log(`✅ [OfflineCache] Cached ${itens.length} itens de estoque`);
  }

  async getItensEstoqueByBase(baseId: string): Promise<any[]> {
    if (!this.db) await this.init();
    return await this.db!.getAllFromIndex('itens_estoque', 'by-base', baseId);
  }

  async cacheUsuarios(usuarios: any[]): Promise<void> {
    if (!this.db) await this.init();
    const tx = this.db!.transaction('usuarios', 'readwrite');
    await Promise.all(usuarios.map(u => tx.store.put(u)));
    await tx.done;
    console.log(`✅ [OfflineCache] Cached ${usuarios.length} usuários`);
  }

  async getUsuarioById(id: string): Promise<any | undefined> {
    if (!this.db) await this.init();
    return await this.db!.get('usuarios', id);
  }

  async cacheBases(bases: any[]): Promise<void> {
    if (!this.db) await this.init();
    const tx = this.db!.transaction('bases', 'readwrite');
    await Promise.all(bases.map(b => tx.store.put(b)));
    await tx.done;
    console.log(`✅ [OfflineCache] Cached ${bases.length} bases`);
  }

  async getAllBases(): Promise<any[]> {
    if (!this.db) await this.init();
    return await this.db!.getAll('bases');
  }

  async cacheInventarioFuncionario(inventario: any[]): Promise<void> {
    if (!this.db) await this.init();
    const tx = this.db!.transaction('inventario_funcionario', 'readwrite');
    await Promise.all(inventario.map(inv => tx.store.put(inv)));
    await tx.done;
    console.log(`✅ [OfflineCache] Cached ${inventario.length} inventário funcionário`);
  }

  async getInventarioByFuncionario(funcionarioId: string): Promise<any[]> {
    if (!this.db) await this.init();
    return await this.db!.getAllFromIndex('inventario_funcionario', 'by-funcionario', funcionarioId);
  }

  async cacheBiometricTemplates(templates: any[]): Promise<void> {
    if (!this.db) await this.init();
    const tx = this.db!.transaction('biometric_templates', 'readwrite');
    await Promise.all(templates.map(t => tx.store.put(t)));
    await tx.done;
    console.log(`✅ [OfflineCache] Cached ${templates.length} biometric templates`);
  }

  async getBiometricTemplateByUser(userId: string): Promise<any[]> {
    if (!this.db) await this.init();
    return await this.db!.getAllFromIndex('biometric_templates', 'by-user', userId);
  }

  async getAllBiometricTemplates(): Promise<any[]> {
    if (!this.db) await this.init();
    return await this.db!.getAll('biometric_templates');
  }

  // ============================================================================
  // FILA DE SINCRONIZAÇÃO
  // ============================================================================

  async addToSyncQueue(operation: {
    type: 'approve' | 'deliver' | 'reject' | 'create' | 'update';
    table: string;
    data: any;
  }): Promise<number> {
    if (!this.db) await this.init();
    
    const queueItem = {
      ...operation,
      timestamp: new Date().toISOString(),
      retries: 0,
    };

    const id = await this.db!.add('sync_queue', queueItem);
    console.log(`📥 [OfflineCache] Added to sync queue: ${operation.type} on ${operation.table}`, id);
    return id;
  }

  async getSyncQueue(): Promise<any[]> {
    if (!this.db) await this.init();
    return await this.db!.getAll('sync_queue');
  }

  async removeFromSyncQueue(id: number): Promise<void> {
    if (!this.db) await this.init();
    await this.db!.delete('sync_queue', id);
    console.log(`✅ [OfflineCache] Removed from sync queue: ${id}`);
  }

  async updateSyncQueueItem(id: number, updates: Partial<any>): Promise<void> {
    if (!this.db) await this.init();
    const item = await this.db!.get('sync_queue', id);
    if (item) {
      await this.db!.put('sync_queue', { ...item, ...updates });
    }
  }

  async clearSyncQueue(): Promise<void> {
    if (!this.db) await this.init();
    await this.db!.clear('sync_queue');
    console.log('✅ [OfflineCache] Sync queue cleared');
  }

  // ============================================================================
  // METADADOS
  // ============================================================================

  async setLastSync(key: string): Promise<void> {
    if (!this.db) await this.init();
    await this.db!.put('metadata', {
      key,
      lastSync: new Date().toISOString(),
      version: this.DB_VERSION,
    });
  }

  async getLastSync(key: string): Promise<string | null> {
    if (!this.db) await this.init();
    const metadata = await this.db!.get('metadata', key);
    return metadata?.lastSync || null;
  }

  // ============================================================================
  // LIMPEZA
  // ============================================================================

  async clearAllCache(): Promise<void> {
    if (!this.db) await this.init();
    const stores = ['solicitacoes', 'itens_estoque', 'usuarios', 'bases', 'equipes', 'inventario_funcionario', 'inventario_equipe', 'biometric_templates'];
    for (const store of stores) {
      await this.db!.clear(store as any);
    }
    console.log('✅ [OfflineCache] All cache cleared');
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

export const offlineCache = new OfflineCacheService();
