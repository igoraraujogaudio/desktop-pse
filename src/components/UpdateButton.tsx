import { useState } from 'react';
import { Download, RefreshCw, Check, X, AlertCircle } from 'lucide-react';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

export default function UpdateButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [checking, setChecking] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [currentVersion, setCurrentVersion] = useState('');
  const [newVersion, setNewVersion] = useState('');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [error, setError] = useState('');
  const [updateReady, setUpdateReady] = useState(false);

  const checkForUpdates = async () => {
    setChecking(true);
    setError('');
    
    try {
      const update = await check();
      
      if (update?.available) {
        setUpdateAvailable(true);
        setCurrentVersion(update.currentVersion);
        setNewVersion(update.version);
      } else {
        setUpdateAvailable(false);
        setError('Você já está na versão mais recente!');
      }
    } catch (err) {
      console.error('Erro ao verificar atualizações:', err);
      setError('Erro ao verificar atualizações. Tente novamente.');
    } finally {
      setChecking(false);
    }
  };

  const downloadAndInstall = async () => {
    setDownloading(true);
    setError('');
    
    try {
      const update = await check();
      
      if (!update?.available) {
        setError('Nenhuma atualização disponível');
        setDownloading(false);
        return;
      }

      await update.downloadAndInstall((event) => {
        switch (event.event) {
          case 'Started':
            setDownloadProgress(0);
            break;
          case 'Progress':
            if (event.data.chunkLength) {
              setDownloadProgress(Math.min(99, downloadProgress + 5));
            }
            break;
          case 'Finished':
            setDownloadProgress(100);
            break;
        }
      });

      setUpdateReady(true);
      setDownloading(false);
    } catch (err) {
      console.error('Erro ao baixar atualização:', err);
      setError('Erro ao baixar atualização. Tente novamente.');
      setDownloading(false);
    }
  };

  const restartApp = async () => {
    await relaunch();
  };

  return (
    <>
      {/* Botão de Atualização */}
      <button
        onClick={() => {
          setIsOpen(true);
          if (!updateAvailable && !checking) {
            checkForUpdates();
          }
        }}
        className="p-2.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors relative"
        title="Verificar Atualizações"
      >
        <Download className="w-5 h-5" />
        {updateAvailable && !updateReady && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-blue-600 rounded-full animate-pulse"></span>
        )}
        {updateReady && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-green-600 rounded-full"></span>
        )}
      </button>

      {/* Modal de Atualização */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Download className="w-6 h-6 text-white" />
                <h2 className="text-xl font-bold text-white">Atualizações</h2>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/80 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Checking */}
              {checking && (
                <div className="flex flex-col items-center gap-4 py-8">
                  <RefreshCw className="w-12 h-12 text-blue-600 animate-spin" />
                  <p className="text-gray-600">Verificando atualizações...</p>
                </div>
              )}

              {/* No Update Available */}
              {!checking && !updateAvailable && !error && (
                <div className="flex flex-col items-center gap-4 py-8">
                  <Check className="w-12 h-12 text-green-600" />
                  <p className="text-gray-600">Você está na versão mais recente!</p>
                  <button
                    onClick={checkForUpdates}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Verificar Novamente
                  </button>
                </div>
              )}

              {/* Update Available */}
              {!checking && updateAvailable && !downloading && !updateReady && (
                <div className="flex flex-col gap-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <p className="font-semibold text-blue-900">Nova versão disponível!</p>
                        <p className="text-sm text-blue-700 mt-1">
                          Versão atual: <span className="font-mono">{currentVersion}</span>
                        </p>
                        <p className="text-sm text-blue-700">
                          Nova versão: <span className="font-mono font-bold">{newVersion}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={downloadAndInstall}
                    className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 font-semibold"
                  >
                    <Download className="w-5 h-5" />
                    Baixar e Instalar
                  </button>
                </div>
              )}

              {/* Downloading */}
              {downloading && (
                <div className="flex flex-col gap-4 py-4">
                  <div className="flex items-center gap-3">
                    <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
                    <p className="text-gray-700 font-semibold">Baixando atualização...</p>
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-blue-600 h-full transition-all duration-300 rounded-full"
                      style={{ width: `${downloadProgress}%` }}
                    ></div>
                  </div>
                  
                  <p className="text-center text-gray-600 text-sm">{downloadProgress}%</p>
                </div>
              )}

              {/* Update Ready */}
              {updateReady && (
                <div className="flex flex-col gap-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-600 mt-0.5" />
                      <div>
                        <p className="font-semibold text-green-900">Atualização instalada!</p>
                        <p className="text-sm text-green-700 mt-1">
                          Reinicie o aplicativo para aplicar as mudanças.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={restartApp}
                    className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 font-semibold"
                  >
                    <RefreshCw className="w-5 h-5" />
                    Reiniciar Agora
                  </button>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <X className="w-5 h-5 text-red-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-red-900">Erro</p>
                      <p className="text-sm text-red-700 mt-1">{error}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-3 flex justify-end">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
