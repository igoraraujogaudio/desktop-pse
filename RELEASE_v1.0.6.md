# Release v1.0.6 - Correções Críticas + Sistema Offline

## 🐛 Correções Críticas

### Débito de Estoque
- ✅ **Desktop agora debita estoque corretamente** ao finalizar entregas
- ✅ Usa a mesma função SQL do site (`entregar_item_estoque` / `entregar_item_para_equipe`)
- ✅ Garante integridade dos dados e transações atômicas

### Atualização de Inventário
- ✅ **Inventário de funcionário/equipe atualizado automaticamente** após entregas
- ✅ Sincronizado com o comportamento do site

### Autenticação
- ✅ **Logout automático** quando usuário não encontrado no banco de dados
- ✅ **Logout em erro de rede** para evitar loops infinitos de tentativas
- ✅ Redireciona corretamente para tela de login

## 🚀 Novo: Sistema Offline Completo

### Cache Local Inteligente (IndexedDB)
- 💾 **Cache persistente** de dados essenciais:
  - Solicitações (últimos 7 dias)
  - Itens de estoque (todos)
  - Usuários e bases
  - Inventários
  - Templates biométricos
- 🔄 **Sincronização automática** a cada 5 minutos quando online
- 📊 **Indicador visual** compacto no canto superior direito

### Operações Offline
- ✅ **Aprovar solicitações offline**
- ✅ **Entregar itens offline**
- ✅ **Rejeitar solicitações offline**
- ✅ **Validação biométrica offline** (com templates em cache)
- ⏰ **Horários preservados** - operações mantêm timestamp original
- 🔄 **Fila de sincronização** com retry automático (até 3 tentativas)

### Indicadores Visuais
- 📴 **Banner amarelo** quando offline mostrando operações pendentes
- 🔄 **Banner azul** durante sincronização
- 💾 **Ícone de cache** no canto superior direito:
  - Badge com número de solicitações em cache
  - Cor indica frescor dos dados (verde/amarelo/laranja/vermelho)
  - Clique para atualizar cache
  - Hover para ver detalhes

## 📊 Dados em Cache

- **Solicitações**: ~93 (últimos 7 dias, pendentes/aprovadas/aguardando)
- **Itens de estoque**: ~4.090 (todos os itens)
- **Bases**: 6 bases ativas
- **Usuários**: 500 usuários
- **Templates biométricos**: Todos os templates cadastrados
- **Inventários**: Inventário do funcionário logado

## 🔧 Melhorias Técnicas

- **Cache-first strategy** para melhor performance
- **Transações atômicas** no banco de dados
- **Código mais limpo** (25 linhas vs 150 linhas para entregas)
- **Logs detalhados** para debugging
- **Tratamento robusto de erros** de rede

## 📦 Instalação

### Nova Instalação
1. Baixe o arquivo `Almoxarifado Desktop_1.0.6_x64_en-US.msi.zip`
2. Extraia o arquivo `.msi`
3. Execute o instalador
4. O aplicativo será instalado e configurado automaticamente

### Atualização Automática
- Desktops com v1.0.5 ou anterior serão **atualizados automaticamente**
- Notificação aparecerá solicitando atualização
- Clique em "Atualizar" para instalar a nova versão
- Aplicativo reiniciará automaticamente

## 🧪 Como Testar o Modo Offline

1. **Desconecte a internet** (WiFi off)
2. **Faça uma entrega** normalmente
3. **Veja o banner amarelo** indicando modo offline
4. **Reconecte a internet**
5. **Veja o banner azul** sincronizando
6. **Verifique no banco** que a entrega foi processada com horário correto

## ⚠️ Notas Importantes

- **Primeira vez**: Clique no ícone de cache (canto superior direito) para carregar dados iniciais
- **Conflitos**: Se o mesmo item for modificado offline e online, a última operação prevalece
- **Espaço**: IndexedDB usa ~50-100MB dependendo do navegador
- **Sincronização**: Automática a cada 5 minutos quando online

## 🔄 Changelog Completo

### Adicionado
- Sistema offline completo com IndexedDB
- Cache inteligente de dados (7 dias)
- Fila de sincronização com retry automático
- Indicador visual de cache compacto
- Suporte para validação biométrica offline
- Templates biométricos em cache
- Banners de status (offline/sincronizando)

### Corrigido
- Débito de estoque ao finalizar entregas
- Atualização de inventário funcionário/equipe
- Logout em erro de rede
- Loop infinito de tentativas de autenticação
- Timeout de conexão

### Melhorado
- Performance geral com cache local
- Código mais limpo e manutenível
- Logs mais detalhados
- Tratamento de erros robusto
- UX com feedback claro ao usuário

## 📝 Documentação

Consulte `OFFLINE_MODE.md` para documentação completa do sistema offline.

---

**Data de Release**: 04/02/2026  
**Versão**: 1.0.6  
**Build**: Tauri 2.x
