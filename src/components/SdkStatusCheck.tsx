import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { AlertCircle, CheckCircle, Loader2, RefreshCw, Download } from 'lucide-react';

interface SdkStatus {
  dll_found: boolean;
  dll_path: string | null;
  driver_installed: boolean;
  sdk_ready: boolean;
  error_message: string | null;
}

interface SdkStatusCheckProps {
  onReady?: () => void;
}

export default function SdkStatusCheck({ onReady }: SdkStatusCheckProps) {
  const [status, setStatus] = useState<SdkStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await invoke<SdkStatus>('check_sdk_status');
      setStatus(result);
      
      if (result.sdk_ready && onReady) {
        onReady();
      }
    } catch (err) {
      setError(err as string);
      console.error('Erro ao verificar status do SDK:', err);
    } finally {
      setLoading(false);
    }
  };

  const syncSdk = async () => {
    try {
      setSyncing(true);
      setError(null);
      const result = await invoke<SdkStatus>('sync_sdk_files');
      setStatus(result);
      
      if (result.sdk_ready && onReady) {
        onReady();
      }
    } catch (err) {
      setError(err as string);
      console.error('Erro ao sincronizar SDK:', err);
    } finally {
      setSyncing(false);
    }
  };

  const installDriver = async () => {
    try {
      await invoke('install_biometric_driver');
      // Aguardar um pouco e verificar novamente
      setTimeout(() => {
        checkStatus();
      }, 2000);
    } catch (err) {
      setError(err as string);
      console.error('Erro ao instalar driver:', err);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
            <h2 className="text-xl font-semibold text-gray-800">
              Verificando SDK iDBio...
            </h2>
            <p className="text-gray-600 text-center">
              Aguarde enquanto verificamos a instalação do SDK biométrico.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (status?.sdk_ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
          <div className="flex flex-col items-center space-y-4">
            <CheckCircle className="w-16 h-16 text-green-600" />
            <h2 className="text-2xl font-semibold text-gray-800">
              SDK Pronto!
            </h2>
            <p className="text-gray-600 text-center">
              O SDK iDBio está instalado e pronto para uso.
            </p>
            {status.dll_path && (
              <p className="text-xs text-gray-500 text-center break-all">
                DLL: {status.dll_path}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-red-100">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        <div className="flex flex-col space-y-6">
          {/* Header */}
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-10 h-10 text-orange-600" />
            <h2 className="text-2xl font-semibold text-gray-800">
              Configuração do SDK
            </h2>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Status Items */}
          <div className="space-y-4">
            {/* DLL Status */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                {status?.dll_found ? (
                  <CheckCircle className="w-6 h-6 text-green-600" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-orange-600" />
                )}
                <div>
                  <p className="font-medium text-gray-800">
                    Biblioteca SDK (DLL)
                  </p>
                  {status?.dll_path && (
                    <p className="text-xs text-gray-500 truncate max-w-xs">
                      {status.dll_path}
                    </p>
                  )}
                </div>
              </div>
              {!status?.dll_found && (
                <button
                  onClick={syncSdk}
                  disabled={syncing}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {syncing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sincronizando...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      <span>Sincronizar</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Driver Status */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                {status?.driver_installed ? (
                  <CheckCircle className="w-6 h-6 text-green-600" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-orange-600" />
                )}
                <div>
                  <p className="font-medium text-gray-800">
                    Driver iDBio
                  </p>
                  <p className="text-xs text-gray-500">
                    {status?.driver_installed
                      ? 'Instalado'
                      : 'Não detectado'}
                  </p>
                </div>
              </div>
              {!status?.driver_installed && (
                <button
                  onClick={installDriver}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Instalar</span>
                </button>
              )}
            </div>
          </div>

          {/* Info Message */}
          {status?.error_message && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Atenção:</strong> {status.error_message}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-3">
            <button
              onClick={checkStatus}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 flex items-center justify-center space-x-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Verificar Novamente</span>
            </button>
          </div>

          {/* Help Text */}
          <div className="text-xs text-gray-500 text-center">
            <p>
              Se você instalou o driver, pode ser necessário reiniciar o
              aplicativo para que as alterações sejam detectadas.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
