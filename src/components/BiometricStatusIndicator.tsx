import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

interface BiometricStatus {
  isWorking: boolean;
  message: string;
  canInstallDriver: boolean;
}

export function BiometricStatusIndicator() {
  const [status, setStatus] = useState<BiometricStatus | null>(null);
  const [installing, setInstalling] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    checkBiometricStatus();
  }, []);

  const checkBiometricStatus = async () => {
    try {
      const sdkStatus = await invoke<any>('check_sdk_status');
      
      if (sdkStatus.sdk_ready) {
        setStatus({
          isWorking: true,
          message: 'Leitor biométrico pronto',
          canInstallDriver: false
        });
        setVisible(true);
        
        // Auto-hide após 3 segundos quando está OK
        setTimeout(() => {
          setVisible(false);
        }, 3000);
      } else {
        setStatus({
          isWorking: false,
          message: sdkStatus.error_message || 'Leitor biométrico não configurado',
          canInstallDriver: !sdkStatus.driver_installed
        });
        // Manter visível quando há erro
        setVisible(true);
      }
    } catch (error) {
      setStatus({
        isWorking: false,
        message: 'Erro ao verificar leitor biométrico',
        canInstallDriver: true
      });
      // Manter visível quando há erro
      setVisible(true);
    }
  };

  const installDriver = async () => {
    setInstalling(true);
    try {
      await invoke('install_biometric_driver');
      alert('Driver instalado com sucesso!\n\nIMPORTANTE: Reinicie o Windows para ativar o driver.');
      await checkBiometricStatus();
    } catch (error) {
      alert('Erro ao instalar driver: ' + error);
    } finally {
      setInstalling(false);
    }
  };

  if (!status || !visible) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div className={`
        flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border
        ${status.isWorking 
          ? 'bg-green-50 border-green-200' 
          : 'bg-yellow-50 border-yellow-200'
        }
      `}>
        {status.isWorking ? (
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
        ) : (
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
        )}
        
        <div className="flex-1">
          <p className={`text-sm font-medium ${
            status.isWorking ? 'text-green-800' : 'text-yellow-800'
          }`}>
            {status.message}
          </p>
        </div>

        {!status.isWorking && status.canInstallDriver && (
          <button
            onClick={installDriver}
            disabled={installing}
            className="
              px-3 py-1.5 text-xs font-medium text-white
              bg-blue-600 hover:bg-blue-700 rounded
              disabled:bg-gray-400 disabled:cursor-not-allowed
              transition-colors flex items-center gap-2
            "
          >
            {installing ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                Instalando...
              </>
            ) : (
              '💾 Instalar Driver'
            )}
          </button>
        )}
      </div>
    </div>
  );
}
