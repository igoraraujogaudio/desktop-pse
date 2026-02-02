# Como Resolver o Erro do Updater

## ❌ Erro Atual
```
[2026-02-02T14:56:57Z ERROR tauri_plugin_updater::updater] update endpoint did not respond with a successful status code
```

## 🔍 Causa
O Tauri Updater está tentando acessar:
```
https://github.com/igoraraujogaudio/desktop-pse/releases/latest/download/latest.json
```

Mas esse arquivo **NÃO EXISTE** no GitHub Release, mesmo tendo uma build nova.

## ✅ Solução Passo a Passo

### 1. Localizar os Arquivos de Build

Após executar `npm run tauri build`, os arquivos são gerados em:
```
C:\cargo-target\release\bundle\
├── msi\Almoxarifado Desktop_1.0.2_x64_pt-BR.msi
├── msi\Almoxarifado Desktop_1.0.2_x64_pt-BR.msi.sig
├── nsis\Almoxarifado Desktop_1.0.2_x64-setup.exe
└── nsis\Almoxarifado Desktop_1.0.2_x64-setup.exe.sig
```

**IMPORTANTE:** Você também precisa do arquivo `latest.json` que foi gerado pelo Tauri.

### 2. Encontrar o arquivo latest.json

O Tauri gera automaticamente o `latest.json` durante o build. Procure em:
```
C:\cargo-target\release\
```

Ou use o arquivo que criei em: `c:\Dev\app.pse\almoxarifado-desktop\latest.json`

### 3. Editar o latest.json

**CRÍTICO:** Você precisa adicionar a **assinatura** no arquivo `latest.json`.

A assinatura está no arquivo `.sig` gerado pelo Tauri. Abra o arquivo:
```
C:\cargo-target\release\bundle\nsis\Almoxarifado Desktop_1.0.2_x64-setup.exe.sig
```

Copie o conteúdo (é uma string base64) e cole no campo `signature` do `latest.json`:

```json
{
  "version": "1.0.2",
  "notes": "Nova versão com melhorias e correções",
  "pub_date": "2026-02-02T14:56:00Z",
  "platforms": {
    "windows-x86_64": {
      "signature": "COLE_A_ASSINATURA_AQUI_DO_ARQUIVO_.sig",
      "url": "https://github.com/igoraraujogaudio/desktop-pse/releases/download/v1.0.2/Almoxarifado_Desktop_1.0.2_x64-setup.exe"
    }
  }
}
```

### 4. Criar Release no GitHub

1. Acesse: https://github.com/igoraraujogaudio/desktop-pse/releases
2. Clique em **"Draft a new release"**
3. Preencha:
   - **Tag version:** `v1.0.2`
   - **Release title:** `v1.0.2`
   - **Description:** Descreva as mudanças

### 5. Fazer Upload dos Arquivos

Arraste e solte os seguintes arquivos na área de assets:

```
✅ Almoxarifado Desktop_1.0.2_x64-setup.exe
✅ Almoxarifado Desktop_1.0.2_x64-setup.exe.sig
✅ Almoxarifado Desktop_1.0.2_x64_pt-BR.msi
✅ Almoxarifado Desktop_1.0.2_x64_pt-BR.msi.sig
✅ latest.json (EDITADO com a assinatura)
```

### 6. Publicar Release

Clique em **"Publish release"**

### 7. Verificar se Funcionou

Após publicar, teste se o endpoint está acessível:

Abra no navegador:
```
https://github.com/igoraraujogaudio/desktop-pse/releases/latest/download/latest.json
```

Deve retornar o JSON com a versão 1.0.2.

### 8. Testar no App

Abra o aplicativo instalado (versão antiga) e ele deve:
1. Verificar atualizações automaticamente
2. Mostrar notificação de nova versão
3. Permitir baixar e instalar

## 🚨 Problemas Comuns

### "Arquivo latest.json não encontrado após build"

**Solução:** Use o arquivo que criei em `latest.json` e edite manualmente com a assinatura.

### "Assinatura inválida"

**Causa:** A assinatura no `latest.json` não corresponde ao arquivo `.sig`

**Solução:** 
1. Abra o arquivo `.sig` no Notepad
2. Copie TODO o conteúdo (incluindo o cabeçalho "untrusted comment")
3. Cole exatamente no campo `signature`

### "URL do instalador está errada"

Certifique-se que a URL no `latest.json` aponta para o arquivo correto no GitHub:
```
https://github.com/igoraraujogaudio/desktop-pse/releases/download/v1.0.2/Almoxarifado_Desktop_1.0.2_x64-setup.exe
```

**ATENÇÃO:** O nome do arquivo pode ter espaços ou underscores dependendo de como o Tauri gerou. Verifique o nome exato.

## 📋 Checklist Final

- [ ] Build gerado com `npm run tauri build`
- [ ] Arquivo `latest.json` criado/editado com assinatura
- [ ] Release criado no GitHub com tag `v1.0.2`
- [ ] Todos os 5 arquivos enviados (2 instaladores + 2 .sig + latest.json)
- [ ] Release publicado
- [ ] URL testada no navegador
- [ ] App testado e atualização funcionando

## 🎯 Próximos Passos

Depois de seguir esses passos, o erro deve desaparecer e o updater funcionará corretamente!
