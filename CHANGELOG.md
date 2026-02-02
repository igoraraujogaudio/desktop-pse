# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

## [1.0.2] - 2026-02-02

### 🎉 Corrigido
- **Leitor Biométrico:** Resolvido problema crítico de detecção do leitor
  - Identificada e corrigida DLL incorreta (agora usa DLL do exemplo C# - 1.4 MB)
  - Implementada detecção automática de porta COM (sem configuração manual)
  - Configurado carregamento dinâmico com `raw-dylib` e `extern "system"`
  - Qualidade de captura: 100%
  
### ✨ Melhorado
- **Interface de Diagnóstico:** Substituído painel completo por indicador discreto
  - Aparece apenas quando há erro ou temporariamente (3s) quando OK
  - Botão de instalar driver aparece apenas quando necessário
  - Animação suave de entrada/saída
  
- **Sistema de Atualização:** Documentação completa criada
  - Processo de release automatizado
  - Verificação automática de atualizações ao iniciar
  - Interface intuitiva para download e instalação

### 📦 Instalação
- **DLL Correta:** Agora inclui `libcidbio.dll` do exemplo C# no bundle
- **Driver:** Scripts de instalação atualizados com instruções claras
- **Documentação:** Guias completos de instalação e troubleshooting

### 🔧 Técnico
- Atualizado `build.rs` para copiar DLL correta
- Configurado FFI com `#[link(kind = "raw-dylib")]`
- Removida configuração manual de porta COM
- SDK detecta leitor automaticamente via `CIDBIO_Init()`

## [1.0.1] - 2026-01-XX

### Inicial
- Primeira versão do aplicativo desktop
- Sistema de autenticação com Supabase
- Gestão de almoxarifado
- Integração biométrica básica

---

## Tipos de Mudanças
- **🎉 Corrigido** - Correções de bugs
- **✨ Melhorado** - Melhorias em funcionalidades existentes
- **🚀 Adicionado** - Novas funcionalidades
- **⚠️ Depreciado** - Funcionalidades que serão removidas
- **🗑️ Removido** - Funcionalidades removidas
- **🔒 Segurança** - Correções de segurança
