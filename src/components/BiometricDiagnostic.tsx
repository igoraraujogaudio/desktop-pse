import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

export function BiometricDiagnostic() {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    details?: any;
  } | null>(null);

  const testConnection = async () => {
    setTesting(true);
    setResult(null);

    try {
      const response = await invoke<string>('test_biometric_connection');
      const data = JSON.parse(response);
      setResult({
        success: true,
        message: data.message,
        details: data
      });
    } catch (error) {
      setResult({
        success: false,
        message: String(error)
      });
    } finally {
      setTesting(false);
    }
  };

  const checkSdkStatus = async () => {
    setTesting(true);
    setResult(null);

    try {
      const status = await invoke<any>('check_sdk_status');
      setResult({
        success: status.sdk_ready,
        message: status.sdk_ready 
          ? 'SDK pronto para uso' 
          : status.error_message || 'SDK não está pronto',
        details: status
      });
    } catch (error) {
      setResult({
        success: false,
        message: String(error)
      });
    } finally {
      setTesting(false);
    }
  };

  const installDriver = async () => {
    setTesting(true);
    setResult(null);

    try {
      await invoke('install_biometric_driver');
      setResult({
        success: true,
        message: 'Instalador do driver iniciado. Siga as instruções na janela que abriu.'
      });
    } catch (error) {
      setResult({
        success: false,
        message: String(error)
      });
    } finally {
      setTesting(false);
    }
  };

  const reinitializeSdk = async () => {
    setTesting(true);
    setResult(null);

    try {
      const response = await invoke<string>('reinitialize_biometric_sdk');
      setResult({
        success: true,
        message: response
      });
    } catch (error) {
      setResult({
        success: false,
        message: String(error)
      });
    } finally {
      setTesting(false);
    }
  };

  const listComPorts = async () => {
    setTesting(true);
    setResult(null);

    try {
      const response = await invoke<string>('list_com_ports');
      const data = JSON.parse(response);
      setResult({
        success: true,
        message: data.message,
        details: data
      });
    } catch (error) {
      setResult({
        success: false,
        message: String(error)
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-xl p-4 max-w-md z-50 border-2 border-gray-200">
      <h3 className="text-lg font-bold mb-3 text-gray-800">🔬 Diagnóstico Biométrico</h3>
      
      <div className="space-y-2 mb-4">
        <button
          onClick={listComPorts}
          disabled={testing}
          className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 transition-colors text-sm font-medium"
        >
          {testing ? '⏳ Listando...' : '📋 Listar Portas COM'}
        </button>

        <button
          onClick={checkSdkStatus}
          disabled={testing}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors text-sm font-medium"
        >
          {testing ? '⏳ Verificando...' : '📊 Verificar Status do SDK'}
        </button>

        <button
          onClick={testConnection}
          disabled={testing}
          className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors text-sm font-medium"
        >
          {testing ? '⏳ Testando...' : '🔌 Testar Conexão do Leitor'}
        </button>

        <button
          onClick={reinitializeSdk}
          disabled={testing}
          className="w-full px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:bg-gray-400 transition-colors text-sm font-medium"
        >
          {testing ? '⏳ Reinicializando...' : '🔄 Reinicializar SDK'}
        </button>

        <button
          onClick={installDriver}
          disabled={testing}
          className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 transition-colors text-sm font-medium"
        >
          {testing ? '⏳ Instalando...' : '💾 Instalar Driver'}
        </button>
      </div>

      {result && (
        <div className={`p-3 rounded-lg ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <div className={`font-semibold mb-1 ${result.success ? 'text-green-800' : 'text-red-800'}`}>
            {result.success ? '✅ Sucesso' : '❌ Erro'}
          </div>
          <div className={`text-sm ${result.success ? 'text-green-700' : 'text-red-700'}`}>
            {result.message}
          </div>
          {result.details && (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs text-gray-600 hover:text-gray-800">
                Ver detalhes
              </summary>
              <pre className="mt-2 text-xs bg-white p-2 rounded border overflow-auto max-h-40">
                {JSON.stringify(result.details, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}

      <div className="mt-3 text-xs text-gray-500 border-t pt-2">
        <p className="font-semibold mb-1">💡 Dicas:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Verifique se o LED do leitor está azul</li>
          <li>Tente desconectar e reconectar o USB</li>
          <li>Instale o driver se necessário</li>
          <li>Verifique os logs do aplicativo</li>
        </ul>
      </div>
    </div>
  );
}
