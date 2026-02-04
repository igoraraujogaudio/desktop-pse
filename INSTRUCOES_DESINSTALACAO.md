# Instruções de Desinstalação Completa

## Para remover completamente o aplicativo e seus dados:

1. **Desinstale o aplicativo normalmente** pelo Painel de Controle do Windows ou Configurações

2. **Antes de desinstalar**, você pode executar o comando de limpeza:
   - Abra o aplicativo
   - Abra o Console do Desenvolvedor (F12)
   - Execute o seguinte comando:
   ```javascript
   await window.__TAURI__.invoke('cleanup_app_data')
   ```

3. **Ou manualmente após desinstalar**, delete a pasta:
   ```
   C:\ProgramData\AlmoxarifadoDesktop
   ```

Esta pasta contém:
- Logs de biometria (`biometria.log`)
- Configurações do aplicativo
- Dados temporários

## Nota
O desinstalador padrão do Windows remove apenas os arquivos do programa instalado, não os dados do usuário. Use o comando acima ou delete manualmente a pasta para uma remoção completa.
