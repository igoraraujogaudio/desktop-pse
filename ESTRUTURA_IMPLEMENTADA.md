# Estrutura do Aplicativo Almoxarifado Desktop - PSE

## 📋 Resumo

Foi criado um aplicativo desktop Tauri para gerenciamento de entregas de almoxarifado com suporte a duas janelas sincronizadas e integração com Supabase.

## ✅ O que foi implementado

### 1. Estrutura Básica do Projeto
- ✅ Projeto Tauri configurado com React + Vite + TypeScript
- ✅ Configuração de duas janelas (almoxarife e funcionário)
- ✅ Tailwind CSS configurado para estilização
- ✅ Estrutura de pastas organizada

### 2. Janela do Almoxarife (Principal)
- ✅ Interface para listar solicitações aprovadas pendentes de entrega
- ✅ Busca por item, código, funcionário ou número de solicitação
- ✅ Botão para iniciar entrega
- ✅ Integração com Supabase para buscar solicitações
- ✅ Comunicação com janela do funcionário via eventos Tauri

### 3. Janela do Funcionário (Secundária)
- ✅ Interface de espera quando não há entrega em andamento
- ✅ Exibição de informações da entrega (funcionário, itens, quantidades)
- ✅ Lista de itens a serem entregues
- ✅ Status da entrega (aguardando, em andamento, concluída)
- ✅ Escuta de eventos da janela principal

### 4. Integração com Supabase
- ✅ Cliente Supabase configurado
- ✅ Busca de solicitações aprovadas
- ✅ Relacionamentos com itens, funcionários e bases
- ✅ Preparado para atualização de status de entrega

### 5. Comunicação entre Janelas
- ✅ Sistema de eventos Tauri implementado
- ✅ Emissão de eventos da janela principal para secundária
- ✅ Escuta de eventos na janela secundária
- ✅ Controle de visibilidade das janelas

## 🔧 Arquitetura

### Estrutura de Arquivos

```
almoxarifado-desktop/
├── src/
│   ├── pages/
│   │   ├── AlmoxarifeView.tsx    # Interface do almoxarife
│   │   └── EmployeeView.tsx      # Interface do funcionário
│   ├── lib/
│   │   └── supabase.ts           # Cliente Supabase
│   ├── types.ts                  # Tipos TypeScript
│   ├── App.tsx                   # Componente raiz (detecta janela)
│   ├── main.tsx                  # Entry point
│   └── index.css                 # Estilos globais
├── src-tauri/
│   ├── src/
│   │   └── main.rs               # Código Rust do Tauri
│   ├── tauri.conf.json           # Configuração (2 janelas)
│   ├── Cargo.toml                # Dependências Rust
│   └── build.rs                  # Build script
└── package.json
```

### Fluxo de Dados

1. **Almoxarife inicia entrega:**
   - Usuário clica em "Iniciar Entrega" em uma solicitação
   - Janela do funcionário é mostrada
   - Evento "entrega-iniciada" é emitido com dados da entrega

2. **Janela do funcionário recebe dados:**
   - Escuta o evento "entrega-iniciada"
   - Atualiza o estado para mostrar informações da entrega
   - Exibe itens e quantidades

3. **Finalização (a implementar):**
   - Captura biométrica
   - Atualização no Supabase
   - Atualização do status
   - Ocultar janela do funcionário

## 📝 Próximos Passos

### Integração com Biometria (TODO)
- [ ] Integrar SDK iDBio (C/C++ DLL)
- [ ] Criar comandos Tauri para captura de digital
- [ ] Interface para captura de biometria
- [ ] Validação biométrica antes de fina                                   lizar entrega

### Melhorias de Funcionalidade
- [x] Implementar seleção de usuário no teste de hardware
- [x] Implementar cadastro biométrico com 3 capturas e validação de qualidade (>90%) [NEW]
- [ ] Adicionar histórico de entregas
- [ ] Suporte a múltiplos monitores (configuração de posição)
- [ ] Feedback visual durante captura biométrica
- [ ] Tratamento de erros mais robusto
- [ ] Loading states e feedback ao usuário

### Interface
- [ ] Melhorar design da janela do funcionário
- [ ] Adicionar animações
- [ ] Temas (claro/escuro)
- [ ] Responsividade

## 🔑 Configuração Necessária

### Variáveis de Ambiente
Criar arquivo `.env`:
```
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-key
```

### Dependências
- Node.js 18+
- Rust (para build do Tauri)
- Supabase project configurado

## 🚀 Como Executar

```bash
# Instalar dependências
npm install

# Rodar em desenvolvimento
npm run tauri:dev

# Build para produção
npm run tauri:build
```

## 📚 Tecnologias Utilizadas

- **Tauri 2.0**: Framework para aplicativos desktop
- **React 18**: Biblioteca UI
- **TypeScript**: Tipagem estática
- **Vite**: Build tool
- **Tailwind CSS**: Framework CSS
- **Supabase**: Backend/Banco de dados
- **Lucide React**: Ícones

## 🎯 Objetivos Alcançados

✅ Aplicativo desktop funcional com Tauri
✅ Duas janelas configuradas (almoxarife e funcionário)
✅ Integração básica com Supabase
✅ Comunicação entre janelas via eventos
✅ Interface básica para ambas as janelas
✅ Estrutura preparada para expansão
