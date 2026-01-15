# Processo de Release e Atualização Remota (Via GitHub Releases)

Este guia explica como configurar, assinar e lançar atualizações auto-update usando GitHub Actions.

## Prerequisitos

### 1. Configurar Segredos no GitHub

Para que o GitHub Actions possa construir e assinar o app, você precisa adicionar as chaves geradas como "Secrets" no repositório GitHub.

1. Vá para o seu repositório no GitHub.
2. Clique em **Settings** > **Secrets and variables** > **Actions**.
3. Adicione os seguintes segredos:

| Nome | Valor | Descrição |
|------|-------|-----------|
| `TAURI_SIGNING_PRIVATE_KEY` | Conteúdo do arquivo `src-tauri/tauri.key` | A chave privada gerada anteriormente (também está no seu `.env`). |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | `tauri_secret_key` | A senha que foi usada. |

### 2. Configurar Token de Acesso (Opcional)

Geralmente, o `GITHUB_TOKEN` padrão funciona. Se precisar de permissões especiais, verifique as configurações de "Workflow permissions" em Settings > Actions > General e garanta que "Read and write permissions" esteja marcado.

## Criando uma Nova Versão

O processo agora é automatizado. Para lançar uma nova versão:

1. **Atualize a versão**:
   No arquivo `almoxarifado-desktop/package.json` e `almoxarifado-desktop/src-tauri/tauri.conf.json`, incremente a versão (ex: de `1.0.0` para `1.0.1`).

2. **Commit e Push**:
   ```bash
   git add .
   git commit -m "chore: release v1.0.1"
   git push
   ```

3. **Crie uma Tag**:
   A automação é disparada quando você envia uma tag começando com `v`.
   ```bash
   git tag v1.0.1
   git push origin v1.0.1
   ```

4. **Verifique o GitHub Actions**:
   Vá na aba "Actions" do seu repositório. Você verá o workflow "Release" rodando.

5. **Aprovar Release (Draft)**:
   O workflow criará um "Draft Release" (Rascunho).
   - Vá em "Releases" no GitHub.
   - Edite o rascunho criado.
   - Revise as notas de versão.
   - Clique em **Publish release**.

## Como o Atualizador Funciona

O aplicativo está configurado para buscar atualizações em:
`https://github.com/igoraraujogaudio/desktop-pse/releases/latest/download/latest.json`

Quando você publica um release, o arquivo `latest.json` e os instaladores (`.msi`, `.exe`) são disponibilizados automaticamente nessa URL. O app detectará a nova versão, baixará e instalará.

## Testando Localmente

Se quiser testar o build localmente antes de enviar:
`npm run tauri build`
(Certifique-se de que as variáveis de ambiente no `.env` estão corretas).
