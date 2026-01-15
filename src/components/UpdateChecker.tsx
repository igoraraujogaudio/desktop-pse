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
        setStatus('checking');
        setError(null);
        try {
            const updateResult = await check();
            if (updateResult?.available) {
                setUpdate(updateResult);
                setStatus('available');
            } else {
                setStatus('idle');
                // Optional: Show "No update available" toast
            }
        } catch (e) {
            console.error(e);
            setStatus('error');
            setError('Erro ao verificar atualizações');
        }
    };

    const installUpdate = async () => {
        if (!update) return;
        setStatus('downloading');
        try {
            await update.downloadAndInstall((event: any) => {
                switch (event.event) {
                    case 'Started':
                        setProgress(0);
                        break;
                    case 'Progress':
                        if (event.data.contentLength) {
                            setProgress((event.data.chunkLength / event.data.contentLength) * 100);
                        }
                        break;
                    case 'Finished':
                        setProgress(100);
                        break;
                }
            });
            setStatus('installed');
        } catch (e) {
            console.error(e);
            setStatus('error');
            setError('Erro ao instalar atualização');
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
