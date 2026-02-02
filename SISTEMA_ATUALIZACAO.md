# Sistema de Atualização Automática

## 🔄 Como Funciona

O aplicativo usa o **Tauri Updater Plugin** para verificar e instalar atualizações automaticamente.

### Fluxo de Atualização

```
1. App inicia → Verifica atualizações automaticamente
2. Nova versão disponível → Mostra notificação
3. Usuário clica "Baixar e Instalar" → Download em background
4. Download completo → Mostra botão "Reiniciar Agora"
5. Usuário reinicia → Nova versão ativa
```

## ⚙️ Configuração Atual

### `tauri.conf.json`

```json
{
  "version": "1.0.1",
  "plugins": {
    "updater": {
      "endpoints": [
        "https://github.com/igoraraujogaudio/desktop-pse/releases/latest/download/latest.json"
      ],
      "pubkey": "dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWduIHB1YmxpYyBrZXk6IEUwNDlFQzQwMzQ0MUYzQzQKUldURTgwRTBRT3hKNEhPU1RKRWJlOXNoNmJxREQvdmpMVS9vamg3Ky9LOFdlRTN2WGc4TXk5cnUK"
    }
  }
}
```

**Componentes:**
- **endpoints:** URL do GitHub Releases onde o arquivo `latest.json` está hospedado
- **pubkey:** Chave pública para verificar assinatura das atualizações (segurança)

## 📦 Componente UpdateChecker

Localizado em: `src/components/UpdateChecker.tsx`

### Funcionalidades

1. **Verificação Automática**
   - Verifica atualizações ao iniciar o app
   - Usa `@tauri-apps/plugin-updater`

2. **Estados do Sistema**
   - `idle` - Nenhuma atualização disponível
   - `checking` - Verificando atualizações
   - `available` - Nova versão disponível
   - `downloading` - Baixando atualização
   - `installed` - Atualização instalada (aguardando reinício)
   - `error` - Erro no processo

3. **Interface do Usuário**
   - **Nova Versão Disponível:** Card azul com botão "Baixar e Instalar"
   - **Baixando:** Barra de progresso mostrando %
   - **Instalada:** Card verde com botão "Reiniciar Agora"
   - **Erro:** Card vermelho com botão "Tentar Novamente"

4. **Posicionamento**
   - Canto inferior direito da tela
   - Animação suave de entrada
   - Botão X para fechar (exceto quando instalada)

## 🚀 Processo de Release

### 1. Preparar Nova Versão

**Atualizar versão em `tauri.conf.json`:**
```json
{
  "version": "1.0.2"  // Incrementar versão
}
```

**Atualizar versão em `package.json`:**
```json
{
  "version": "1.0.2"
}
```

### 2. Gerar Build de Produção

```bash
npm run tauri build -- --features biometric
```

**Arquivos gerados:**
```
C:\cargo-target\release\bundle\
├── msi\Almoxarifado Desktop_1.0.2_x64_pt-BR.msi
└── nsis\Almoxarifado Desktop_1.0.2_x64-setup.exe
```

### 3. Assinar Atualização

O Tauri gera automaticamente:
- `<instalador>.sig` - Arquivo de assinatura
- Usa a chave privada configurada

### 4. Criar Release no GitHub

1. Vá para: https://github.com/igoraraujogaudio/desktop-pse/releases
2. Clique em "Draft a new release"
3. Tag version: `v1.0.2`
4. Release title: `v1.0.2`
5. Descrição: Changelog da versão

**Anexar arquivos:**
```
- Almoxarifado Desktop_1.0.2_x64-setup.exe
- Almoxarifado Desktop_1.0.2_x64-setup.exe.sig
- Almoxarifado Desktop_1.0.2_x64_pt-BR.msi
- Almoxarifado Desktop_1.0.2_x64_pt-BR.msi.sig
- latest.json (gerado automaticamente pelo Tauri)
```

### 5. Arquivo `latest.json`

O Tauri gera automaticamente este arquivo durante o build:

```json
{
  "version": "1.0.2",
  "notes": "Descrição das mudanças",
  "pub_date": "2026-02-02T14:00:00Z",
  "platforms": {
    "windows-x86_64": {
      "signature": "assinatura_base64_aqui",
      "url": "https://github.com/igoraraujogaudio/desktop-pse/releases/download/v1.0.2/Almoxarifado Desktop_1.0.2_x64-setup.exe"
    }
  }
}
```

**Fazer upload deste arquivo para:**
```
https://github.com/igoraraujogaudio/desktop-pse/releases/latest/download/latest.json
```

### 6. Publicar Release

Clique em "Publish release" - as atualizações estarão disponíveis imediatamente!

## 🔐 Segurança

### Chaves de Assinatura

O sistema usa **assinatura criptográfica** para garantir que as atualizações são legítimas.

**Chave Pública** (em `tauri.conf.json`):
```
dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWduIHB1YmxpYyBrZXk6IEUwNDlFQzQwMzQ0MUYzQzQKUldURTgwRTBRT3hKNEhPU1RKRWJlOXNoNmJxREQvdmpMVS9vamg3Ky9LOFdlRTN2WGc4TXk5cnUK
```

**Chave Privada** (guardada em segredo):
- Usada para assinar cada release
- NÃO deve ser commitada no repositório
- Armazenada em local seguro

### Verificação

Quando o app baixa uma atualização:
1. Baixa o instalador + arquivo `.sig`
2. Verifica assinatura usando a chave pública
3. Se assinatura inválida → rejeita atualização
4. Se válida → instala

## 📱 Integração no App

### Em `AlmoxarifeView.tsx`

```tsx
import UpdateChecker from '../components/UpdateChecker';

function AlmoxarifeView() {
  return (
    <>
      {/* Conteúdo principal */}
      
      {/* Sistema de atualização */}
      <UpdateChecker />
    </>
  );
}
```

O componente é **sempre ativo** e verifica atualizações automaticamente.

## 🧪 Testando Atualizações

### Ambiente de Desenvolvimento

```bash
# Build de desenvolvimento não verifica atualizações
npm run tauri dev
```

### Ambiente de Produção

```bash
# Build de produção
npm run tauri build

# Instalar versão antiga (ex: 1.0.1)
# Publicar nova versão no GitHub (ex: 1.0.2)
# Abrir app instalado → Deve mostrar notificação de atualização
```

### Forçar Verificação Manual

Adicione botão no app (opcional):

```tsx
import { check } from '@tauri-apps/plugin-updater';

async function checkForUpdates() {
  const update = await check();
  if (update?.available) {
    console.log('Nova versão:', update.version);
  }
}
```

## ⚠️ Troubleshooting

### "Erro ao verificar atualizações"

**Causas possíveis:**
1. GitHub está fora do ar
2. URL do endpoint incorreta
3. Arquivo `latest.json` não existe
4. Sem conexão com internet

**Solução:**
- Verificar URL: https://github.com/igoraraujogaudio/desktop-pse/releases/latest/download/latest.json
- Testar acesso manual ao arquivo

### "Erro ao instalar atualização"

**Causas possíveis:**
1. Assinatura inválida (chave pública/privada não correspondem)
2. Arquivo corrompido durante download
3. Permissões insuficientes

**Solução:**
- Verificar que `.sig` foi gerado corretamente
- Re-gerar release com assinatura correta
- Executar app como administrador

### Atualização não aparece

**Causas possíveis:**
1. Versão no `tauri.conf.json` não foi incrementada
2. `latest.json` não foi atualizado
3. Cache do navegador/app

**Solução:**
- Confirmar que versão em `tauri.conf.json` > versão instalada
- Verificar conteúdo de `latest.json` no GitHub
- Limpar cache e reinstalar

## 📊 Monitoramento

### Logs do Sistema

O componente `UpdateChecker` loga no console:

```javascript
console.log('Verificando atualizações...');
console.log('Nova versão disponível:', version);
console.error('Erro ao verificar:', error);
```

### Analytics (Opcional)

Adicione tracking para monitorar:
- Quantos usuários verificaram atualizações
- Quantos baixaram
- Quantos instalaram
- Taxa de sucesso/erro

## 🎯 Melhores Práticas

1. **Versionamento Semântico**
   - `MAJOR.MINOR.PATCH` (ex: 1.0.2)
   - MAJOR: Mudanças incompatíveis
   - MINOR: Novas funcionalidades compatíveis
   - PATCH: Correções de bugs

2. **Changelog Claro**
   - Descrever mudanças em cada release
   - Destacar breaking changes
   - Mencionar correções importantes

3. **Testes Antes do Release**
   - Testar instalador em máquina limpa
   - Verificar que atualização funciona
   - Confirmar que app inicia corretamente

4. **Backup da Chave Privada**
   - Guardar em local seguro
   - Fazer backup em múltiplos locais
   - Se perder, não poderá assinar atualizações!

## 📝 Checklist de Release

- [ ] Incrementar versão em `tauri.conf.json`
- [ ] Incrementar versão em `package.json`
- [ ] Atualizar CHANGELOG.md
- [ ] Executar `npm run tauri build`
- [ ] Testar instalador localmente
- [ ] Criar tag no Git: `git tag v1.0.2`
- [ ] Push tag: `git push origin v1.0.2`
- [ ] Criar release no GitHub
- [ ] Upload instaladores + arquivos `.sig`
- [ ] Upload `latest.json`
- [ ] Publicar release
- [ ] Testar atualização em versão antiga instalada
- [ ] Verificar que app atualizado funciona corretamente

---

**Sistema de atualização configurado e funcionando!** 🚀

Para qualquer dúvida, consulte:
- [Tauri Updater Docs](https://tauri.app/v1/guides/distribution/updater)
- [GitHub Releases](https://github.com/igoraraujogaudio/desktop-pse/releases)
