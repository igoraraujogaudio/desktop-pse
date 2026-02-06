# 📴 Modo Offline - Almoxarifado Desktop

## Visão Geral

O sistema agora suporta **operações offline completas** com sincronização automática quando a conexão retorna.

## 🎯 Funcionalidades

### ✅ O que funciona offline:

- **Aprovar solicitações** - Aprovações são salvas localmente e sincronizadas depois
- **Entregar itens** - Entregas são registradas com horário correto e sincronizadas
- **Rejeitar solicitações** - Rejeições são armazenadas e processadas ao reconectar
- **Visualizar dados** - Todo o cache local permanece acessível
- **Buscar solicitações** - Busca funciona no cache local

### 🔄 Sincronização Automática

- **Detecção automática** de conexão/desconexão
- **Fila de sincronização** para operações offline
- **Retry automático** (até 3 tentativas) para operações que falharem
- **Horários corretos** - Operações mantêm o timestamp de quando foram realizadas
- **Sync periódico** - A cada 5 minutos quando online

## 📦 Arquitetura

### 1. **offlineCache.ts** - Armazenamento Local (IndexedDB)
```typescript
// Armazena dados localmente
- solicitacoes
- itens_estoque
- usuarios
- bases
- inventario_funcionario
- inventario_equipe
- sync_queue (fila de sincronização)
```

### 2. **offlineSync.ts** - Sincronização
```typescript
// Gerencia sincronização com servidor
- Processa fila de operações offline
- Atualiza cache com dados do servidor
- Retry automático em caso de falha
```

### 3. **useOffline.ts** - Hook React
```typescript
// Interface para componentes React
const {
  isOnline,           // Status da conexão
  isSyncing,          // Se está sincronizando
  syncQueueCount,     // Número de operações pendentes
  approveSolicitacao, // Aprovar (online ou offline)
  deliverSolicitacao, // Entregar (online ou offline)
  rejectSolicitacao,  // Rejeitar (online ou offline)
} = useOffline();
```

## 🚀 Como Usar

### 1. Importar o Hook

```typescript
import { useOffline } from '../hooks/useOffline';

function MeuComponente() {
  const {
    isOnline,
    syncQueueCount,
    approveSolicitacao,
    deliverSolicitacao,
  } = useOffline();

  // Seu código aqui
}
```

### 2. Aprovar Solicitação (Online ou Offline)

```typescript
await approveSolicitacao(
  solicitacaoId,
  quantidadeAprovada,
  aprovadoPorUserId
);
```

### 3. Entregar Item (Online ou Offline)

```typescript
await deliverSolicitacao(
  solicitacaoId,
  entregadorId,
  quantidadeEntregue,
  observacoes,
  numeroLaudo,
  validadeLaudo
);
```

### 4. Mostrar Status de Conexão

```tsx
{!isOnline && (
  <div className="bg-yellow-100 p-2 text-center">
    📴 Modo Offline - {syncQueueCount} operações pendentes
  </div>
)}

{isSyncing && (
  <div className="bg-blue-100 p-2 text-center">
    🔄 Sincronizando...
  </div>
)}
```

## 🔧 Integração com Componentes Existentes

### Exemplo: AlmoxarifeView.tsx

```typescript
import { useOffline } from '../hooks/useOffline';

export default function AlmoxarifeView() {
  const { 
    isOnline, 
    syncQueueCount,
    deliverSolicitacao 
  } = useOffline();

  const finalizarEntrega = async (solicitacao: SolicitacaoItem) => {
    try {
      // Usar função offline-aware
      await deliverSolicitacao(
        solicitacao.id,
        user!.id,
        quantidadeEntregue,
        deliveryData.observacoes,
        deliveryData.numeroLaudo,
        deliveryData.validadeLaudo
      );

      // Sucesso!
      alert(isOnline 
        ? 'Entrega realizada com sucesso!' 
        : 'Entrega salva! Será sincronizada quando a conexão retornar.'
      );
    } catch (error) {
      alert('Erro ao processar entrega');
    }
  };

  return (
    <div>
      {/* Indicador de status */}
      {!isOnline && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              📴
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                Modo Offline - {syncQueueCount} operações aguardando sincronização
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Resto do componente */}
    </div>
  );
}
```

## 🎨 UI/UX Recomendações

### 1. Indicador Visual de Status
```tsx
<div className="fixed top-0 right-0 m-4 z-50">
  {!isOnline ? (
    <Badge variant="warning">
      📴 Offline ({syncQueueCount} pendentes)
    </Badge>
  ) : syncQueueCount > 0 ? (
    <Badge variant="info">
      🔄 Sincronizando {syncQueueCount}...
    </Badge>
  ) : (
    <Badge variant="success">
      ✅ Online
    </Badge>
  )}
</div>
```

### 2. Feedback ao Usuário
```typescript
// Após operação offline
toast.success(
  'Operação salva!',
  { description: 'Será sincronizada quando a conexão retornar.' }
);
```

### 3. Lista de Operações Pendentes
```tsx
{syncQueueCount > 0 && (
  <Button onClick={syncWithServer}>
    Sincronizar Agora ({syncQueueCount})
  </Button>
)}
```

## 🔍 Debugging

### Ver Fila de Sincronização
```typescript
import { offlineCache } from '../services/offlineCache';

const queue = await offlineCache.getSyncQueue();
console.log('Fila de sincronização:', queue);
```

### Forçar Sincronização
```typescript
import { offlineSync } from '../services/offlineSync';

await offlineSync.syncAll();
```

### Limpar Cache
```typescript
await offlineCache.clearAllCache();
await offlineCache.clearSyncQueue();
```

## ⚠️ Limitações

1. **Conflitos de dados** - Se o mesmo item for modificado offline e online, a última operação prevalece
2. **Espaço de armazenamento** - IndexedDB tem limite (~50MB-100MB dependendo do navegador)
3. **Operações complexas** - Algumas operações muito complexas podem não funcionar offline

## 🚀 Próximos Passos

Para integrar completamente:

1. ✅ Substituir chamadas diretas ao Supabase por `useOffline` hook
2. ✅ Adicionar indicadores visuais de status offline
3. ✅ Testar cenários de perda de conexão
4. ✅ Adicionar botão de sincronização manual
5. ✅ Implementar resolução de conflitos se necessário

## 📝 Notas Técnicas

- **IndexedDB** é usado para armazenamento persistente
- **Timestamps originais** são preservados nas operações offline
- **Funções SQL** são chamadas na sincronização para garantir integridade
- **Retry automático** com backoff exponencial
- **Cache-first strategy** para melhor performance

## 🎉 Benefícios

- ✅ **Trabalho ininterrupto** mesmo sem internet
- ✅ **Dados sempre disponíveis** via cache local
- ✅ **Sincronização automática** transparente
- ✅ **Horários corretos** preservados
- ✅ **Melhor UX** sem travamentos por timeout
