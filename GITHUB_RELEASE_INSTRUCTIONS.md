# Instruções para Criar Release v1.0.6 no GitHub

## 📦 Arquivos Necessários

Após o build finalizar, você encontrará os arquivos em:
```
c:\Dev\app.pse\almoxarifado-desktop\src-tauri\target\release\bundle\msi\
```

Arquivos necessários para o release:
- ✅ `Almoxarifado Desktop_1.0.6_x64_en-US.msi.zip`
- ✅ `Almoxarifado Desktop_1.0.6_x64_en-US.msi.zip.sig`

## 🚀 Passo a Passo

### 1. Criar Nova Release no GitHub

Acesse: https://github.com/igoraraujogaudio/desktop-pse/releases/new

### 2. Configurar Release

**Tag version:**
```
v1.0.6
```

**Release title:**
```
v1.0.6 - Correções Críticas + Sistema Offline
```

**Descrição:**
Cole o conteúdo do arquivo `RELEASE_v1.0.6.md` ou use o texto abaixo:

```markdown
## 🐛 Correções Críticas
- ✅ Desktop agora debita estoque corretamente ao finalizar entregas
- ✅ Inventário de funcionário/equipe atualizado automaticamente
- ✅ Logout automático em erro de rede

## 🚀 Novo: Sistema Offline Completo
- 💾 Cache local inteligente (IndexedDB)
- ✅ Aprovar, entregar e rejeitar offline
- ✅ Validação biométrica offline
- ⏰ Horários preservados
- 🔄 Sincronização automática

## 📊 Dados em Cache
- ~93 solicitações (últimos 7 dias)
- ~4.090 itens de estoque
- Templates biométricos
- Inventários

## 📦 Instalação
Baixe o arquivo `.msi.zip`, extraia e execute o instalador.
Desktops existentes serão atualizados automaticamente.

Consulte as notas completas da versão para mais detalhes.
```

### 3. Upload dos Arquivos

Arraste e solte os arquivos na seção "Attach binaries":
1. `Almoxarifado Desktop_1.0.6_x64_en-US.msi.zip`
2. `Almoxarifado Desktop_1.0.6_x64_en-US.msi.zip.sig`

### 4. Criar latest.json

**IMPORTANTE**: Você precisa copiar o conteúdo do arquivo `.sig` para criar o `latest.json`

Abra o arquivo `Almoxarifado Desktop_1.0.6_x64_en-US.msi.zip.sig` e copie o conteúdo.

Crie um arquivo chamado `latest.json` com o seguinte conteúdo:

```json
{
  "version": "1.0.6",
  "notes": "Correções críticas: débito de estoque, inventário e autenticação. Novo sistema offline completo com cache inteligente.",
  "pub_date": "2026-02-04T19:30:00Z",
  "platforms": {
    "windows-x86_64": {
      "signature": "COLE_AQUI_O_CONTEUDO_DO_ARQUIVO_.sig",
      "url": "https://github.com/igoraraujogaudio/desktop-pse/releases/download/v1.0.6/Almoxarifado Desktop_1.0.6_x64_en-US.msi.zip"
    }
  }
}
```

**Substitua** `COLE_AQUI_O_CONTEUDO_DO_ARQUIVO_.sig` pelo conteúdo real do arquivo `.sig`

### 5. Upload do latest.json

Faça upload do arquivo `latest.json` também na seção "Attach binaries".

### 6. Marcar como Latest Release

- ✅ Marque a opção **"Set as the latest release"**
- ❌ NÃO marque "Set as a pre-release"

### 7. Publicar

Clique em **"Publish release"**

## ✅ Verificação

Após publicar, verifique:

1. **URL do latest.json está correta:**
   ```
   https://github.com/igoraraujogaudio/desktop-pse/releases/latest/download/latest.json
   ```

2. **URL do instalador está correta:**
   ```
   https://github.com/igoraraujogaudio/desktop-pse/releases/download/v1.0.6/Almoxarifado Desktop_1.0.6_x64_en-US.msi.zip
   ```

3. **Arquivo .sig foi incluído** (necessário para verificação de assinatura)

## 🔄 Atualização Automática

Após publicar o release:

1. Desktops instalados verificarão automaticamente por atualizações
2. Notificação aparecerá para o usuário
3. Usuário clica em "Atualizar"
4. Download e instalação automáticos
5. Aplicativo reinicia com a nova versão

## 🐛 Troubleshooting

### Se o latest.json não funcionar:
- Verifique se a URL está correta no `tauri.conf.json`
- Confirme que o arquivo foi marcado como "latest release"
- Aguarde alguns minutos para propagação do GitHub

### Se a assinatura falhar:
- Verifique se copiou o conteúdo completo do arquivo `.sig`
- Confirme que não há espaços extras ou quebras de linha
- O conteúdo deve ser uma string longa sem formatação

### Se o download falhar:
- Confirme que os arquivos foram anexados corretamente
- Verifique as URLs no `latest.json`
- Teste o download manual pelo navegador

## 📝 Notas

- **Versão anterior**: 1.0.5
- **Nova versão**: 1.0.6
- **Tamanho aproximado**: ~15-20 MB (compactado)
- **Tempo de download**: ~30 segundos (conexão rápida)
- **Tempo de instalação**: ~1 minuto

## 🎉 Pronto!

Após seguir todos os passos, o sistema de atualização automática estará funcionando e os desktops instalados receberão a atualização automaticamente!
