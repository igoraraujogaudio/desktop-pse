import { useState, useEffect } from 'react';
import { check, Update } from '@tauri-apps/plugin-updater';
import { RefreshCw, Download, AlertCircle, X, CheckCircle } from 'lucide-react';
import { relaunch } from '@tauri-apps/plugin-process';

export default function UpdateChecker() {
    const [update, setUpdate] = useState<Update | null>(null);
    const [status, setStatus] = useState<'idle' | 'checking' | 'available' | 'downloading' | 'installed' | 'error'>('idle');
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState<number>(0);

    const checkUpdate = async () => {
        console.log('🔍 [UPDATER-FRONTEND] Iniciando verificação de atualizações');
        setStatus('checking');
        setError(null);
        try {
            console.log('📡 [UPDATER-FRONTEND] Chamando API check()...');
            
            // Tentar fazer fetch manual para debug
            try {
                const response = await fetch('https://raw.githubusercontent.com/igoraraujogaudio/desktop-pse/master/latest.json');
                const text = await response.text();
                console.log('🔍 [DEBUG] Fetch manual - Status:', response.status);
                console.log('🔍 [DEBUG] Fetch manual - Content-Type:', response.headers.get('content-type'));
                console.log('🔍 [DEBUG] Fetch manual - Body length:', text.length);
                console.log('🔍 [DEBUG] Fetch manual - Body:', text.substring(0, 200));
            } catch (debugError) {
                console.error('❌ [DEBUG] Erro no fetch manual:', debugError);
            }
            
            const updateResult = await check();
            console.log('📦 [UPDATER-FRONTEND] Resultado:', updateResult);
            
            if (updateResult?.available) {
                console.log('✅ [UPDATER-FRONTEND] Atualização disponível:', {
                    version: updateResult.version,
                    body: updateResult.body,
                    date: updateResult.date
                });
                setUpdate(updateResult);
                setStatus('available');
            } else {
                console.log('ℹ️ [UPDATER-FRONTEND] Nenhuma atualização disponível');
                setStatus('idle');
            }
        } catch (e) {
            console.error('❌ [UPDATER-FRONTEND] Erro na verificação:', e);
            console.error('❌ [UPDATER-FRONTEND] Erro completo:', JSON.stringify(e, Object.getOwnPropertyNames(e)));
            setStatus('error');
            setError(`Erro ao verificar atualizações: ${e}`);
        }
    };

    const installUpdate = async () => {
        if (!update) return;
        console.log('⬇️ [UPDATER-FRONTEND] Iniciando download da atualização');
        console.log('📦 [UPDATER-FRONTEND] Update object:', update);
        setStatus('downloading');
        try {
            console.log('📥 [UPDATER-FRONTEND] Chamando downloadAndInstall...');
            let lastProgress = 0;
            await update.downloadAndInstall((event: any) => {
                console.log('📊 [UPDATER-FRONTEND] Evento completo:', JSON.stringify(event));
                switch (event.event) {
                    case 'Started':
                        console.log('🚀 [UPDATER-FRONTEND] Download iniciado');
                        console.log('🔍 [UPDATER-FRONTEND] Event data:', event.data);
                        setProgress(0);
                        break;
                    case 'Progress':
                        if (event.data.contentLength) {
                            const progress = (event.data.chunkLength / event.data.contentLength) * 100;
                            if (progress !== lastProgress) {
                                console.log(`📈 [UPDATER-FRONTEND] Progresso: ${progress.toFixed(2)}% (${event.data.chunkLength}/${event.data.contentLength} bytes)`);
                                lastProgress = progress;
                            }
                            setProgress(progress);
                        }
                        break;
                    case 'Finished':
                        console.log('✅ [UPDATER-FRONTEND] Download concluído - iniciando instalação');
                        console.log('🔍 [UPDATER-FRONTEND] Finished event data:', event.data);
                        setProgress(100);
                        break;
                    default:
                        console.log(`⚠️ [UPDATER-FRONTEND] Evento desconhecido: ${event.event}`, event);
                }
            });
            console.log('🎉 [UPDATER-FRONTEND] Atualização instalada com sucesso');
            setStatus('installed');
        } catch (e) {
            console.error('❌ [UPDATER-FRONTEND] Erro na instalação:', e);
            console.error('❌ [UPDATER-FRONTEND] Erro completo:', JSON.stringify(e, Object.getOwnPropertyNames(e)));
            console.error('❌ [UPDATER-FRONTEND] Stack trace:', (e as Error).stack);
            setStatus('error');
            setError(`Erro ao instalar atualização: ${e}`);
        }
    };

    const restartApp = async () => {
        try {
            await relaunch();
        } catch (e) {
            console.error("Failed to relaunch", e);
            // Fallback: just close or tell user
        }
    };

    // Auto-check on mount
    useEffect(() => {
        checkUpdate();
    }, []);

    if (status === 'idle' && !update) return null;

    // Error State
    if (status === 'error') {
        return (
            <div className="fixed bottom-4 right-4 bg-white p-4 rounded-xl shadow-lg border border-red-100 flex flex-col gap-3 z-50 w-80 animate-in slide-in-from-bottom">
                <button
                    onClick={() => setStatus('idle')}
                    className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                >
                    <X className="w-4 h-4" />
                </button>
                <div className="flex items-start gap-3">
                    <div className="p-2 bg-red-100 text-red-600 rounded-lg">
                        <AlertCircle className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900">Erro na Atualização</h3>
                        <p className="text-sm text-gray-500 mt-1">{error || 'Ocorreu um erro desconhecido.'}</p>
                    </div>
                </div>
                <button
                    onClick={checkUpdate}
                    className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                    <RefreshCw className="w-4 h-4" />
                    Tentar Novamente
                </button>
            </div>
        );
    }

    if (status === 'installed') {
        return (
            <div className="fixed bottom-4 right-4 bg-white p-4 rounded-xl shadow-lg border border-green-100 flex flex-col gap-3 z-50 w-80 animate-in slide-in-from-bottom">
                <div className="flex items-start gap-3">
                    <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                        <CheckCircle className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900">Atualização Instalada</h3>
                        <p className="text-sm text-gray-500 mt-1">
                            Reinicie o aplicativo para aplicar as mudanças.
                        </p>
                    </div>
                </div>
                <button
                    onClick={restartApp}
                    className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                >
                    Reiniciar Agora
                </button>
            </div>
        );
    }

    if (status === 'available' || status === 'downloading' || status === 'checking') {
        if (status === 'checking') return null; // Don't show modal just for checking unless manually triggered (future improvement)

        return (
            <div className="fixed bottom-4 right-4 bg-white p-4 rounded-xl shadow-2xl border border-blue-100 flex flex-col gap-3 z-50 w-80 animate-in slide-in-from-bottom">
                <button
                    onClick={() => setStatus('idle')}
                    className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                >
                    <X className="w-4 h-4" />
                </button>

                <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                        <Download className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900">Nova Versão Disponível</h3>
                        <p className="text-sm text-gray-500 mt-1">
                            Versão {update?.version} está disponível.
                        </p>
                    </div>
                </div>

                {status === 'downloading' ? (
                    <div className="space-y-2">
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-blue-600 transition-all duration-300"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <p className="text-xs text-center text-gray-500">Baixando... {Math.round(progress)}%</p>
                    </div>
                ) : (
                    <button
                        onClick={installUpdate}
                        className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                    >
                        <Download className="w-4 h-4" />
                        Baixar e Instalar
                    </button>
                )}
            </div>
        );
    }

    return null;
}
