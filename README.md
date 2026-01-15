# Almoxarifado Desktop - PSE

Aplicativo desktop Tauri para gerenciamento de entregas de almoxarifado com suporte a biometria.

## 📋 Características

- **Duas janelas sincronizadas:**
  - Janela principal (almoxarife): Interface para gerenciar entregas
  - Janela secundária (funcionário): Exibe informações da entrega para o funcionário

- **Integração com Supabase:** Conexão com banco de dados para buscar solicitações e realizar entregas

- **Suporte a biometria:** Validação de entrega através de digital (iDBio SDK)

## 🚀 Instalação

### Requisitos do Sistema

- **Windows 10/11** (64-bit)
- **Node.js 18+**
- **Rust** (para build do Tauri) - https://www.rust-lang.org/tools/install
- **Driver iDBio** (instalado automaticamente ou manualmente)

1. **Instalar dependências:**
   ```bash
   npm install
   ```

2. **Configurar variáveis de ambiente:**
   Crie um arquivo `.env` na raiz do projeto:
   ```
   VITE_SUPABASE_URL=https://seu-projeto.supabase.co
   VITE_SUPABASE_ANON_KEY=sua-chave-anon-key
   ```

3. **SDK iDBio (Automático):**
   O aplicativo verifica e sincroniza automaticamente o SDK na inicialização.
   - A DLL `libcidbio.dll` é copiada automaticamente do SDK bundled
   - O status do driver é verificado automaticamente
   - Se necessário, você pode instalar o driver pela interface do aplicativo


## 🛠️ Desenvolvimento

Para rodar o aplicativo em modo desenvolvimento:

```bash
npm run tauri:dev
```

Isso iniciará:
- O servidor Vite na porta 1420
- O aplicativo Tauri com as duas janelas

## 📦 Build

Para criar o executável:

```bash
npm run tauri:build
```

O executável será gerado em `src-tauri/target/release/`

## 🏗️ Estrutura do Projeto

```
almoxarifado-desktop/
├── src/
│   ├── pages/
│   │   ├── AlmoxarifeView.tsx    # Interface do almoxarife
│   │   └── EmployeeView.tsx      # Interface do funcionário
│   ├── lib/
│   │   └── supabase.ts           # Cliente Supabase
│   ├── types.ts                  # Tipos TypeScript
│   ├── App.tsx                   # Componente raiz
│   └── main.tsx                  # Entry point
├── src-tauri/
│   ├── src/
│   │   └── main.rs               # Código Rust do Tauri
│   ├── tauri.conf.json           # Configuração do Tauri
│   └── Cargo.toml                # Dependências Rust
└── package.json
```

## 📝 Funcionalidades Principais

### Almoxarife View
- Lista de solicitações aprovadas pendentes de entrega
- Busca por item, código, funcionário ou número de solicitação
- Iniciar entrega com validação biométrica
- Comunicação com janela do funcionário

### Employee View
- Exibe informações da entrega em andamento
- Mostra itens a serem entregues
- Aguarda validação biométrica
- Status da entrega (aguardando, em andamento, concluída)

## 🔧 Próximos Passos

- [ ] Integração completa com SDK de biometria (iDBio)
- [ ] Comunicação entre janelas via eventos Tauri
- [ ] Integração com API de entrega do Supabase
- [ ] Validação biométrica na finalização da entrega
- [ ] Suporte a múltiplos monitores
- [ ] Histórico de entregas

## 🔍 Verificação Automática do SDK

O aplicativo possui um sistema de verificação automática do SDK iDBio:

### Na Inicialização

1. **Verificação da DLL**: O app verifica se `libcidbio.dll` está acessível
2. **Sincronização Automática**: Se não encontrada, copia do SDK bundled
3. **Verificação do Driver**: Verifica no registro do Windows se o driver está instalado
4. **Interface de Status**: Exibe tela de status se houver problemas

### Tela de Status do SDK

A tela de status mostra:
- ✅ **DLL encontrada** ou ⚠️ **DLL não encontrada** (com botão para sincronizar)
- ✅ **Driver instalado** ou ⚠️ **Driver não instalado** (com botão para instalar)
- Mensagens de erro detalhadas
- Opção de verificar novamente

### Instalação do Driver

Se o driver não estiver instalado:
1. Clique no botão "Instalar" na tela de status
2. Execute o instalador com permissões de administrador
3. Reinicie o aplicativo após a instalação

## 🛠️ Troubleshooting

### Problema: DLL não encontrada

**Solução:**
1. Clique em "Sincronizar" na tela de status do SDK
2. Se o erro persistir, verifique se o arquivo existe em `IDBIO_SDK/lib/C_C++/win64/libcidbio.dll`
3. Tente recompilar o aplicativo: `npm run tauri:build`

### Problema: Driver não detectado

**Solução:**
1. Clique em "Instalar" na tela de status
2. Execute o instalador como administrador
3. Reinicie o computador se solicitado
4. Reinicie o aplicativo

### Problema: Erro ao compilar

**Solução:**
1. Certifique-se de que o Rust está instalado: `rustc --version`
2. Verifique se a pasta `IDBIO_SDK` existe na raiz do projeto
3. Limpe o cache de build: `cd src-tauri && cargo clean`
4. Tente novamente: `npm run tauri:build`

### Problema: SDK pronto mas biometria não funciona

**Solução:**
1. Verifique se o leitor biométrico está conectado
2. Teste o leitor com o software de exemplo do SDK
3. Verifique as variáveis de ambiente `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`
4. Verifique os logs do aplicativo para mensagens de erro

## 📚 Documentação

- [Tauri Docs](https://tauri.app/)
- [Supabase Docs](https://supabase.com/docs)
- [React Docs](https://react.dev/)
