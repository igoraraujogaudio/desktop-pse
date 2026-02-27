import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { WebviewWindow, getAllWebviewWindows } from "@tauri-apps/api/webviewWindow";
import { availableMonitors, currentMonitor } from "@tauri-apps/api/window";
import { emitTo, listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { Package, Fingerprint, LogOut, ClipboardList, CheckCircle, FolderOpen, FileText, PackagePlus, PackageMinus, ArrowLeftRight, Users } from "lucide-react";
import UpdateButton from "../components/UpdateButton";
import type { SolicitacaoItem, EntregaData } from "../types";
import { estoqueService } from "../services/estoqueService";
import { discountOrderService } from "../services/discountOrderService";
import SolicitacoesView from "./SolicitacoesView";
import ModulosPredefinidosPage from "./ModulosPredefinidosPage";
import InventariosHubPage from "./inventarios/InventariosHubPage";
import InventarioEquipesPage from "./inventarios/InventarioEquipesPage";
import InventarioFuncionariosPage from "./inventarios/InventarioFuncionariosPage";
import InventarioDetalhesPage from "./inventarios/InventarioDetalhesPage";
import InventarioEquipeDetalhesPage from "./inventarios/InventarioEquipeDetalhesPage";
import OrdensDescontoPage from "./OrdensDescontoPage";
import EntradaMaterialPage from "./EntradaMaterialPage";
import DevolucaoPage from "./DevolucaoPage";
import TransferenciasPage from "./TransferenciasPage";
import EmprestimosTerceirosPage from "./EmprestimosTerceirosPage";
import { TrocaModal, DadosTroca } from '../components/TrocaModal';
import { PDFViewerModal } from '../components/PDFViewerModal';
import DeliveryValidationModal from '../components/DeliveryValidationModal';
import UpdateChecker from "../components/UpdateChecker";
import { useAuth } from "../hooks/useAuth";
import { useOffline } from "../hooks/useOffline";
import { CacheIndicator } from "../components/CacheIndicator";

interface AlmoxarifeViewProps {
  onLogout: () => void;
}

export default function AlmoxarifeView({ onLogout }: AlmoxarifeViewProps) {
  const { user } = useAuth();
  const { isOnline, isSyncing, syncQueueCount, deliverSolicitacao: deliverOffline } = useOffline();
  const [activeTab, setActiveTab] = useState<'solicitacoes' | 'modulos' | 'inventarios' | 'ordens-desconto' | 'entrada-material' | 'devolucoes' | 'transferencias' | 'emprestimos-terceiros'>('solicitacoes');
  const [inventarioSubPage, setInventarioSubPage] = useState<'hub' | 'equipes' | 'funcionarios' | 'detalhes' | 'detalhes-equipe'>('hub');
  const [selectedFuncionario, setSelectedFuncionario] = useState<{ id: string; nome: string } | null>(null);
  const [selectedEquipe, setSelectedEquipe] = useState<{ id: string; nome: string } | null>(null);
  const [selectedSolicitacao, setSelectedSolicitacao] =
    useState<SolicitacaoItem | null>(null);

  const [isDelivering, setIsDelivering] = useState(false);
  // Store pending return data to process AFTER delivery
  const [pendingReturnData, setPendingReturnData] = useState<{
    solicitacao: SolicitacaoItem;
    dados: DadosTroca;
  } | null>(null);
  const [employeeWindow, setEmployeeWindow] = useState<WebviewWindow | null>(null);

  // PDF and Discount Order states
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [showPDFModal, setShowPDFModal] = useState(false);
  const [currentDiscountOrderId, setCurrentDiscountOrderId] = useState<string | null>(null);

  // Last update trigger for SolicitacoesView
  const [lastUpdate, setLastUpdate] = useState<number>(0);

  // BIOMETRIC MODAL STATE
  const [biometricModal, setBiometricModal] = useState<{
    open: boolean;
    userId: string;
    userName: string;
    isEnrolled: boolean;
    finger?: string;
    selectedFinger: string; // Selection for new enrollment
    targetSolicitacao: SolicitacaoItem | null;
    message?: string;
    processing: boolean;
    validationResult?: 'success' | 'failure' | null;
    validationMessage?: string;
    fingerprintImage?: string;
  }>({
    open: false,
    userId: '',
    userName: '',
    isEnrolled: false,
    targetSolicitacao: null,
    selectedFinger: 'right_index',
    message: '',
    processing: false,
    validationResult: null,
    validationMessage: '',
    fingerprintImage: undefined
  });

  // TROCA MODAL STATE
  const [trocaModal, setTrocaModal] = useState<{
    open: boolean;
    solicitacao: SolicitacaoItem | null;
    inventoryItem: any;
  }>({
    open: false,
    solicitacao: null,
    inventoryItem: null
  });

  // DELIVERY VALIDATION MODAL STATE
  const [deliveryValidationModal, setDeliveryValidationModal] = useState<{
    open: boolean;
    solicitacao: SolicitacaoItem | null;
    skipChecks: boolean;
  }>({
    open: false,
    solicitacao: null,
    skipChecks: false
  });

  useEffect(() => {
    setupEmployeeWindow();
  }, []);

  const setupEmployeeWindow = async () => {
    try {
      // Check if window already exists
      const windows = await getAllWebviewWindows();
      let win = windows.find((w: { label: string; }) => w.label === 'employee');

      if (!win) {
        // Create new window
        win = new WebviewWindow('employee', {
          url: 'employee.html',
          title: 'Almoxarifado - Funcionário',
          width: 1200,
          height: 800,
          decorations: false, // Remove decorations for full screen feel
          skipTaskbar: false,
          visible: false // Start hidden until moved
        });

        // Wait for creation
        await new Promise<void>((resolve, reject) => {
          win?.once('tauri://created', () => resolve());
          win?.once('tauri://error', (e: unknown) => reject(e));
        });
      }

      // MONITOR SETUP
      const monitors = await availableMonitors();
      const current = await currentMonitor();

      console.log('🖥️ Configuração de Monitores:', {
        total: monitors.length,
        current: current?.name
      });

      // Find secondary monitor (not the current one)
      const secondaryMonitor = monitors.find(m => m.name !== current?.name) || current;

      if (secondaryMonitor) {
        console.log('Testing moving to monitor', secondaryMonitor.name);

        // Move to position
        await win.setPosition(secondaryMonitor.position);

        // Fullscreen
        await win.setFullscreen(true);
      }

      setEmployeeWindow(win);
      await win.show();
      await win.setFocus();

    } catch (error) {
      console.error('❌ Error setting up employee window:', error);
    }
  };



  const openEmployeeWindow = async () => {
    if (employeeWindow) {
      await employeeWindow.show();
      await employeeWindow.setFocus();
    }
  };

  const abrirJanelaEntrega = async (solicitacao: SolicitacaoItem) => {
    if (!employeeWindow) {
      alert("Janela do funcionário não está disponível");
      return;
    }

    setSelectedSolicitacao(solicitacao);
    setIsDelivering(true);

    // Mostrar janela do funcionário
    await openEmployeeWindow();

    // Enviar dados da entrega para a janela do funcionário
    const entregaData: EntregaData = {
      solicitacao,
      items: [
        {
          nome: solicitacao.item?.nome || "Item desconhecido",
          codigo: solicitacao.item?.codigo || "",
          quantidade: solicitacao.quantidade_aprovada || solicitacao.quantidade_solicitada,
        },
      ],
      funcionario: solicitacao.destinatario || {
        id: "",
        nome: "Funcionário não identificado",
      },
      timestamp: new Date().toISOString(),
    };

    // Enviar evento para a janela do funcionário usando emitTo
    await emitTo("employee", "entrega-iniciada", entregaData);
  }

  const iniciarEntrega = async (solicitacao: SolicitacaoItem) => {
    // console.log('Iniciar Entrega:', solicitacao);
    // alert(`DEBUG: Iniciando entrega. Tipo: ${solicitacao.tipo_troca}`);

    // CHECK FOR TROCA
    if (solicitacao.tipo_troca === 'troca') {
      try {

        // Find item in user's inventory that matches the requested item
        // Matches by item_id (assuming they are returning the same type of item)
        // Or matches by similar category? Usually same item_id for "troca".
        const inventory = await estoqueService.getInventarioByFuncionario(solicitacao.destinatario_id || '');
        const existingItem = inventory.find((i: any) => i.item_id === solicitacao.item_id); // Simple match

        setTrocaModal({
          open: true,
          solicitacao: solicitacao,
          inventoryItem: existingItem
        });
        return; // Stop here, wait for modal
      } catch (error) {
        console.error("Error finding inventory for exchange:", error);
        // Fallback: Proceed with empty inventory item or alert?
        // User can still manually describe or proceed if we allow.
        setTrocaModal({
          open: true,
          solicitacao: solicitacao,
          inventoryItem: null
        });
        return;
      }
    }

    // Normal Delivery
    await abrirJanelaEntrega(solicitacao);
  };



  // 1. First step: Check status and open modal
  const validarBiometriaEFinalizar = async (solicitacaoEspecifica?: SolicitacaoItem, skipChecks: boolean = false) => {
    console.log('👀 [AlmoxarifeView] validarBiometriaEFinalizar called', {
      id: solicitacaoEspecifica?.id,
      skipChecks,
      tipo_troca: solicitacaoEspecifica?.tipo_troca
    });

    const targetSolicitacao = solicitacaoEspecifica || selectedSolicitacao;
    const userIdToValidate = targetSolicitacao?.destinatario_id || targetSolicitacao?.responsavel_equipe_id;

    if (!targetSolicitacao || !userIdToValidate) {
      console.warn('⚠️ [AlmoxarifeView] Validation failed: Missing target or user', { targetSolicitacao, userIdToValidate });
      alert("Solicitação sem destinatário ou responsável definido para validação biométrica.");
      return;
    }

    // CHECK FOR TROCA (unless skipped)
    if (!skipChecks && targetSolicitacao.tipo_troca === 'troca') {
      console.log('🔄 [AlmoxarifeView] Intercepting for Troca Modal', targetSolicitacao);
      try {

        // Find item in user's inventory
        const inventory = await estoqueService.getInventarioByFuncionario(targetSolicitacao.destinatario_id || '');
        const existingItem = inventory.find((i: any) => i.item_id === targetSolicitacao.item_id);

        console.log('📦 [AlmoxarifeView] Inventory item found for exchange:', existingItem);

        setTrocaModal({
          open: true,
          solicitacao: targetSolicitacao,
          inventoryItem: existingItem
        });
        console.log('🔓 [AlmoxarifeView] TrocaModal state set to OPEN');
        return;
      } catch (error) {
        console.error("❌ [AlmoxarifeView] Error finding inventory for exchange:", error);
        setTrocaModal({
          open: true,
          solicitacao: targetSolicitacao,
          inventoryItem: null
        });
        return;
      }
    }

    // OPEN DELIVERY VALIDATION MODAL FIRST
    console.log('📋 [AlmoxarifeView] Opening Delivery Validation Modal');
    setDeliveryValidationModal({
      open: true,
      solicitacao: targetSolicitacao,
      skipChecks
    });
  };

  // Continue to biometric validation after delivery validation
  const proceedToBiometricValidation = async (solicitacao: SolicitacaoItem, deliveryData: {
    quantidade: number;
    numeroLaudo?: string;
    validadeLaudo?: string;
    observacoes?: string;
  }) => {
    console.log('⏩ [AlmoxarifeView] Proceeding to Biometric Validation with delivery data:', deliveryData);

    const userIdToValidate = solicitacao?.destinatario_id || solicitacao?.responsavel_equipe_id;
    const userNameToValidate = solicitacao?.destinatario?.nome || solicitacao?.responsavel_equipe?.nome || "Responsável";

    if (!userIdToValidate) {
      alert("Erro: destinatário não encontrado.");
      return;
    }

    // Store delivery data for later use
    (solicitacao as any)._deliveryData = deliveryData;

    try {


      console.log('🔍 [AlmoxarifeView] Checking biometric enrollment for user:', userIdToValidate, userNameToValidate);

      // Check if user has biometrics
      const { data, error } = await supabase
        .from('biometric_templates')
        .select('finger, ativo')
        .eq('user_id', userIdToValidate)
        .eq('ativo', true) // Only active templates
        .limit(1);

      console.log('📊 [AlmoxarifeView] Biometric query result:', { data, error, userIdToValidate });

      if (error) {
        console.error('❌ [AlmoxarifeView] Error querying biometric_templates:', error);
        throw error;
      }

      const getFingerName = (finger: string) => {
        const map: Record<string, string> = {
          'right_thumb': 'Polegar Direito',
          'right_index': 'Indicador Direito',
          'right_middle': 'Médio Direito',
          'right_ring': 'Anelar Direito',
          'right_little': 'Mínimo Direito',
          'left_thumb': 'Polegar Esquerdo',
          'left_index': 'Indicador Esquerdo',
          'left_middle': 'Médio Esquerdo',
          'left_ring': 'Anelar Esquerdo',
          'left_little': 'Mínimo Esquerdo'
        };
        return map[finger.toLowerCase()] || finger;
      };

      const isEnrolled = data && data.length > 0;
      const rawFinger = isEnrolled ? (data[0].finger || 'Indicador Direito') : undefined;
      const finger = rawFinger ? getFingerName(rawFinger) : undefined;

      console.log('✅ [AlmoxarifeView] Enrollment status:', { isEnrolled, finger, rawFinger, dataLength: data?.length });

      // FETCH INVENTORY FOR SECOND SCREEN
      let userInventory: any[] = [];
      try {
        if (solicitacao.destinatario_equipe?.id) {
          userInventory = await estoqueService.getInventarioByEquipe(solicitacao.destinatario_equipe.id);
        } else if (userIdToValidate) {
          userInventory = await estoqueService.getInventarioByFuncionario(userIdToValidate);
        }
      } catch (e) {
        console.error("Error fetching inventory for second screen", e);
      }

      // Emit event to Employee Window
      await emitTo("employee", "update-employee-view", {
        type: 'validation-start',
        solicitacao: solicitacao,
        inventory: userInventory,
        biometric: {
          isEnrolled,
          finger,
          userName: userNameToValidate
        }
      });

      setBiometricModal({
        open: true,
        userId: userIdToValidate,
        userName: userNameToValidate,
        isEnrolled,
        finger,
        selectedFinger: 'right_index', // Default for new opening
        targetSolicitacao: solicitacao,
        processing: false,
        message: ''
      });

    } catch (error) {
      console.error("Erro ao verificar biometria:", error);
      alert("Erro ao verificar status biométrico do usuário.");
    }
  };

  // 2. Second step: Execute biometric action after modal confirmation
  const handleConfirmBiometrics = async () => {
    const { userId, targetSolicitacao } = biometricModal;
    if (!userId || !targetSolicitacao) return;

    // Set processing state and keep modal open
    setBiometricModal(prev => ({
      ...prev,
      processing: true,
      message: 'Inicializando sensor...',
      validationResult: null
    }));

    // Listen to real-time instructions
    let lastMessage = '';
    const unlisten = await listen<string>('biometric-instruction', (event) => {
      // Evitar atualizações duplicadas
      if (event.payload !== lastMessage) {
        lastMessage = event.payload;
        setBiometricModal(prev => ({ ...prev, message: event.payload }));
        // Forward to employee window
        emitTo("employee", "biometric-instruction", event.payload).catch(console.error);
      }
    });

    // Listen to fingerprint images
    const unlistenImage = await listen<string>('biometric-image', (event) => {
      setBiometricModal(prev => ({ ...prev, fingerprintImage: event.payload }));
    });

    
    // Explicitly send initial instruction (only for validation, not enrollment)
    if (biometricModal.isEnrolled) {
      const initialMessage = `Coloque o Dedo ${biometricModal.finger || 'INDICADOR'}`;
      emitTo("employee", "biometric-instruction", initialMessage).catch(console.error);
    }

    try {
      const result = await invoke<{
        success: boolean;
        reason: string;
        score?: number;
        percent?: number;
        quality?: number;
        enrolled: boolean;
      }>("validate_or_enroll_fingerprint", {
        userId: userId,
        minPercent: 90,
        fingerId: biometricModal.isEnrolled ? undefined : biometricModal.selectedFinger,
        supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
        serviceKey: import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY,
      });

      unlisten(); // Stop listening
      unlistenImage();

      if (!result.success) {
        // Show failure in modal with retry option
        setBiometricModal(prev => ({
          ...prev,
          processing: false,
          validationResult: 'failure',
          validationMessage: result.reason || 'Falha na validação. Por favor, tente novamente.',
          message: ''
        }));
        setIsDelivering(false);
        return;
      }

      // Show success
      let validationMessage = "Biometria validada com sucesso!";

      if (!biometricModal.isEnrolled) {
        validationMessage = "Cadastro biométrico realizado com sucesso!";
      } else if (result.percent !== undefined && result.percent !== null) {
        validationMessage = `Biometria validada com sucesso! Similaridade: ${result.percent}%`;
      }

      setBiometricModal(prev => ({
        ...prev,
        processing: false,
        validationResult: 'success',
        validationMessage: validationMessage,
        message: ''
      }));

      // Close modal after 3 seconds and proceed
      setTimeout(async () => {
        setBiometricModal(prev => ({ ...prev, open: false }));
        await finalizarEntrega(targetSolicitacao);
      }, 3000);

    } catch (error) {
      unlisten();
      unlistenImage();
      console.error("Erro na validação biométrica:", error);
      
      // Melhorar mensagem de erro baseada no tipo de erro
      let errorMessage = 'Erro ao comunicar com o sensor biométrico';
      const errorStr = String(error);
      
      if (errorStr.includes('não foi possível detectar o leitor')) {
        errorMessage = 'Leitor biométrico não detectado. Verifique se está conectado na porta USB.';
      } else if (errorStr.includes('código de erro -1')) {
        errorMessage = 'Sensor não inicializado. Verifique a conexão USB e tente novamente.';
      } else if (errorStr.includes('Verifique se o leitor está conectado')) {
        errorMessage = 'Não foi possível comunicar com o leitor. Verifique a conexão USB.';
      } else if (errorStr.includes('CIDBIO')) {
        errorMessage = 'Erro no sensor biométrico. Tente reconectar o leitor USB.';
      }
      
      setBiometricModal(prev => ({
        ...prev,
        processing: false,
        validationResult: 'failure',
        validationMessage: errorMessage,
        message: ''
      }));
      setIsDelivering(false);
    }
  };

  const finalizarEntrega = async (solicitacao: SolicitacaoItem) => {
    if (!solicitacao) return;

    try {
      setIsDelivering(true);

      // Get delivery data stored during validation
      const deliveryData = (solicitacao as any)._deliveryData || {};
      const quantidadeEntregue = deliveryData.quantidade || solicitacao.quantidade_aprovada;

      // PROCESS RETURN IF PENDING
      // This is done BEFORE delivery to ensure inventory is debited first
      if (pendingReturnData && pendingReturnData.solicitacao.id === solicitacao.id) {
        console.log('🔄 [AlmoxarifeView] Processing pending return BEFORE delivery', pendingReturnData);
        try {
          // Wait for return processing to complete
          await estoqueService.processarRetornoAposEntrega(
            pendingReturnData.solicitacao,
            pendingReturnData.dados,
            user!.id
          );
          console.log('✅ [AlmoxarifeView] Return processed successfully');
        } catch (returnError) {
          console.error('❌ [AlmoxarifeView] Error processing return:', returnError);
          alert('Erro ao processar devolução do item antigo. Operação cancelada.');
          setIsDelivering(false);
          return; // Stop delivery if return fails
        }
      }

      // Atualizar status da solicitação com dados de entrega
      const updates: any = {
        status: "entregue",
        quantidade_entregue: quantidadeEntregue,
        entregue_em: new Date().toISOString(),
        entregue_por: user!.id
      };

      if (deliveryData.numeroLaudo) {
        updates.numero_laudo = deliveryData.numeroLaudo;
      }

      if (deliveryData.validadeLaudo) {
        updates.validade_laudo = deliveryData.validadeLaudo;
      }

      if (deliveryData.observacoes) {
        updates.observacoes = deliveryData.observacoes;
      }

      // ============================================================================
      // USAR SISTEMA OFFLINE - Funciona online e offline
      // ============================================================================
      console.log('🔄 [AlmoxarifeView] Processando entrega (offline-aware)...');
      
      try {
        await deliverOffline(
          solicitacao.id,
          user!.id,
          quantidadeEntregue,
          deliveryData.observacoes,
          deliveryData.numeroLaudo,
          deliveryData.validadeLaudo
        );

        console.log('✅ [AlmoxarifeView] Entrega processada com sucesso');
        
        // Mostrar mensagem apropriada
        if (!isOnline) {
          alert('✅ Entrega salva!\n\n📴 Você está offline. A entrega será sincronizada automaticamente quando a conexão retornar.');
        } else {
          alert('✅ Entrega realizada com sucesso!');
        }

      } catch (entregaErr) {
        console.error('❌ [AlmoxarifeView] Erro ao processar entrega:', entregaErr);
        alert(`Erro ao processar entrega: ${entregaErr instanceof Error ? entregaErr.message : 'Erro desconhecido'}`);
        setIsDelivering(false);
        return;
      }

      // Limpar dados pendentes após sucesso
      setPendingReturnData(null);

      // Recarregar lista (handled by SolicitacoesView via event/prop if needed, but here we just clear selection)
      setSelectedSolicitacao(null);
      setIsDelivering(false);

      // Trigger update for SolicitacoesView
      setLastUpdate(Date.now());

      // Ocultar janela do funcionário
      if (employeeWindow) {
        await employeeWindow.hide();
      }
    } catch (error) {
      console.error("Erro ao finalizar entrega:", error);
      alert("Erro ao finalizar entrega");
    }
  };

  const handleTrocaConfirm = async (dados: DadosTroca) => {
    if (!trocaModal.solicitacao || !user?.id) return;

    console.log('📥 [AlmoxarifeView] Processing troca confirmation', dados);

    // If has discount data, create discount order first
    if (dados.valorDesconto && dados.parcelasDesconto) {
      try {
        console.log('💰 [AlmoxarifeView] Creating discount order with PDF');

        const result = await estoqueService.createDiscountOrder({
          solicitacao: trocaModal.solicitacao,
          // Use destinatario_id for individual deliveries, responsavel_equipe_id for team deliveries
          funcionarioId: trocaModal.solicitacao.destinatario_id || trocaModal.solicitacao.responsavel_equipe_id!,
          baseId: trocaModal.solicitacao.base_id!,
          itemId: trocaModal.solicitacao.item_id!,
          itemNome: trocaModal.solicitacao.item?.nome || '',
          itemCodigo: trocaModal.solicitacao.item?.codigo || '',
          valorTotal: dados.valorDesconto,
          parcelas: dados.parcelasDesconto,
          condicao: dados.condicao as 'danificado' | 'perdido',
          observacoes: dados.observacoes,
          criadoPor: user.id
        });

        console.log('✅ [AlmoxarifeView] Discount order created:', result.order.id);

        // Store PDF and show modal
        setPdfBlob(result.pdfBlob);
        setCurrentDiscountOrderId(result.order.id);
        setShowPDFModal(true);

        // Store pending return data to process after PDF confirmation
        setPendingReturnData({
          solicitacao: trocaModal.solicitacao,
          dados
        });

      } catch (error) {
        console.error('❌ [AlmoxarifeView] Error creating discount order:', error);
        alert('Erro ao criar ordem de desconto. Consulte o log.');
        throw error;
      }
    } else {
      // No discount, just store data for processing after delivery
      setPendingReturnData({
        solicitacao: trocaModal.solicitacao,
        dados
      });
    }
  };

  const handleTrocaValidation = () => {
    // If showing PDF modal, don't proceed to validation yet (wait for confirm)
    if (showPDFModal) return;

    if (trocaModal.solicitacao) {
      // Proceed to validation, skipping the troca check since we just did it
      validarBiometriaEFinalizar(trocaModal.solicitacao, true);
    }
  };

  const handlePDFConfirm = () => {
    setShowPDFModal(false);
    setCurrentDiscountOrderId(null);
    // After confirming PDF, proceed to validation automatically
    if (trocaModal.solicitacao) {
      validarBiometriaEFinalizar(trocaModal.solicitacao, true);
    }
  };

  const handlePDFClose = async () => {
    if (currentDiscountOrderId) {
      if (confirm("Deseja cancelar a ordem de desconto gerada? Isso irá excluir o registro.")) {
        try {
          await discountOrderService.deleteOrder(currentDiscountOrderId);
          // Clear pending data as flow is cancelled
          setPendingReturnData(null);
          setPdfBlob(null);
          setCurrentDiscountOrderId(null);
          setShowPDFModal(false);
          setTrocaModal(prev => ({ ...prev, open: false }));
          console.log('🗑️ [AlmoxarifeView] Order cancelled and deleted.');
        } catch (e) {
          alert("Erro ao excluir ordem. Consulte o log.");
          console.error(e);
        }
      }
    } else {
      setShowPDFModal(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100/50 flex">
      {/* Floating Sidebar (Dock Style) - More Compact */}
      <aside className="fixed left-4 top-4 bottom-4 w-16 bg-white rounded-[2rem] shadow-sm border border-gray-100 flex flex-col items-center py-6 z-50 justify-between">

        {/* Top Section - Navigation */}
        <div className="flex flex-col gap-2 w-full items-center">
          {/* Menu / Toggle */}

          <nav className="flex flex-col gap-3 w-full px-2 items-center">
            <button
              onClick={() => setActiveTab('solicitacoes')}
              className={`p-2.5 rounded-xl transition-all duration-300 relative group ${activeTab === 'solicitacoes'
                ? 'bg-blue-50 text-blue-600 shadow-sm'
                : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
                }`}
              title="Solicitações"
            >
              <ClipboardList className="w-5 h-5" />
              {activeTab === 'solicitacoes' && (
                <span className="absolute -right-1 top-1/2 -translate-y-1/2 w-1 h-3 bg-blue-600 rounded-l-full" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('modulos')}
              className={`p-2.5 rounded-xl transition-all duration-300 relative group ${activeTab === 'modulos'
                ? 'bg-blue-50 text-blue-600 shadow-sm'
                : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
                }`}
              title="Módulos Predefinidos"
            >
              <Package className="w-5 h-5" />
              {activeTab === 'modulos' && (
                <span className="absolute -right-1 top-1/2 -translate-y-1/2 w-1 h-3 bg-blue-600 rounded-l-full" />
              )}
            </button>

            <button
              onClick={() => {
                setActiveTab('inventarios');
                setInventarioSubPage('hub');
              }}
              className={`p-2.5 rounded-xl transition-all duration-300 relative group ${activeTab === 'inventarios'
                ? 'bg-blue-50 text-blue-600 shadow-sm'
                : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
                }`}
              title="Inventários"
            >
              <FolderOpen className="w-5 h-5" />
              {activeTab === 'inventarios' && (
                <span className="absolute -right-1 top-1/2 -translate-y-1/2 w-1 h-3 bg-blue-600 rounded-l-full" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('ordens-desconto')}
              className={`p-2.5 rounded-xl transition-all duration-300 relative group ${activeTab === 'ordens-desconto'
                ? 'bg-blue-50 text-blue-600 shadow-sm'
                : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
                }`}
              title="Ordens de Desconto"
            >
              <FileText className="w-5 h-5" />
              {activeTab === 'ordens-desconto' && (
                <span className="absolute -right-1 top-1/2 -translate-y-1/2 w-1 h-3 bg-blue-600 rounded-l-full" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('entrada-material')}
              className={`p-2.5 rounded-xl transition-all duration-300 relative group ${activeTab === 'entrada-material'
                ? 'bg-blue-50 text-blue-600 shadow-sm'
                : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
                }`}
              title="Entrada de Material"
            >
              <PackagePlus className="w-5 h-5" />
              {activeTab === 'entrada-material' && (
                <span className="absolute -right-1 top-1/2 -translate-y-1/2 w-1 h-3 bg-blue-600 rounded-l-full" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('devolucoes')}
              className={`p-2.5 rounded-xl transition-all duration-300 relative group ${activeTab === 'devolucoes'
                ? 'bg-blue-50 text-blue-600 shadow-sm'
                : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
                }`}
              title="Devoluções"
            >
              <PackageMinus className="w-5 h-5" />
              {activeTab === 'devolucoes' && (
                <span className="absolute -right-1 top-1/2 -translate-y-1/2 w-1 h-3 bg-blue-600 rounded-l-full" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('transferencias')}
              className={`p-2.5 rounded-xl transition-all duration-300 relative group ${activeTab === 'transferencias'
                ? 'bg-blue-50 text-blue-600 shadow-sm'
                : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
                }`}
              title="Transferências Entre Bases"
            >
              <ArrowLeftRight className="w-5 h-5" />
              {activeTab === 'transferencias' && (
                <span className="absolute -right-1 top-1/2 -translate-y-1/2 w-1 h-3 bg-blue-600 rounded-l-full" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('emprestimos-terceiros')}
              className={`p-2.5 rounded-xl transition-all duration-300 relative group ${activeTab === 'emprestimos-terceiros'
                ? 'bg-blue-50 text-blue-600 shadow-sm'
                : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
                }`}
              title="Empréstimos para Terceiros"
            >
              <Users className="w-5 h-5" />
              {activeTab === 'emprestimos-terceiros' && (
                <span className="absolute -right-1 top-1/2 -translate-y-1/2 w-1 h-3 bg-blue-600 rounded-l-full" />
              )}
            </button>
          </nav>
        </div>

        {/* Bottom Section - User Avatar */}
        <div className="flex flex-col gap-4 items-center">
          {/* Update Button */}
          <UpdateButton />
          
          {/* Logout */}
          <button
            onClick={onLogout}
            className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
            title="Sair"
          >
            <LogOut className="w-5 h-5" />
          </button>

          {/* Avatar Circle with User Initial */}
          <div
            className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-md cursor-pointer hover:ring-4 hover:ring-blue-100 transition-all relative group"
            title={user?.nome || 'Usuário'}
          >
            {user?.nome?.charAt(0).toUpperCase() || 'U'}

            {/* Tooltip with full name */}
            <div className="absolute left-full ml-3 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
              {user?.nome || 'Usuário'}
              {user?.matricula && (
                <div className="text-gray-400 text-xs mt-1">
                  Mat: {user.matricula}
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content - Adjusted margin for fixed compact sidebar */}
      <main className="flex-1 ml-24 p-6 overflow-auto h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Offline Status Indicator */}
          {!isOnline && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg shadow-sm">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="text-2xl">📴</span>
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-yellow-800">
                    Modo Offline
                  </p>
                  <p className="text-xs text-yellow-700 mt-1">
                    {syncQueueCount > 0 
                      ? `${syncQueueCount} operação(ões) aguardando sincronização`
                      : 'Você pode continuar trabalhando. As operações serão sincronizadas quando a conexão retornar.'
                    }
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Syncing Indicator */}
          {isOnline && isSyncing && (
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-lg shadow-sm">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="text-2xl animate-spin">🔄</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-blue-800">
                    Sincronizando operações offline...
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'solicitacoes' ? (
            <SolicitacoesView
              onEntregar={iniciarEntrega}
              selectedSolicitacao={selectedSolicitacao}
              isDelivering={isDelivering}
              onValidar={validarBiometriaEFinalizar}
              lastUpdate={lastUpdate}
            />
          ) : activeTab === 'modulos' ? (
            <ModulosPredefinidosPage />
          ) : activeTab === 'inventarios' ? (
            <>
              {inventarioSubPage === 'hub' && (
                <InventariosHubPage
                  onNavigate={(page) => setInventarioSubPage(page)}
                />
              )}
              {inventarioSubPage === 'equipes' && (
                <InventarioEquipesPage
                  onBack={() => setInventarioSubPage('hub')}
                  onSelectEquipe={(id, nome) => {
                    setSelectedEquipe({ id, nome });
                    setInventarioSubPage('detalhes-equipe');
                  }}
                />
              )}
              {inventarioSubPage === 'funcionarios' && (
                <InventarioFuncionariosPage
                  onBack={() => setInventarioSubPage('hub')}
                  onSelectFuncionario={(id, nome) => {
                    setSelectedFuncionario({ id, nome });
                    setInventarioSubPage('detalhes');
                  }}
                />
              )}
              {inventarioSubPage === 'detalhes' && selectedFuncionario && (
                <InventarioDetalhesPage
                  funcionarioId={selectedFuncionario.id}
                  funcionarioNome={selectedFuncionario.nome}
                  onBack={() => setInventarioSubPage('funcionarios')}
                />
              )}
              {inventarioSubPage === 'detalhes-equipe' && selectedEquipe && (
                <InventarioEquipeDetalhesPage
                  equipeId={selectedEquipe.id}
                  equipeNome={selectedEquipe.nome}
                  onBack={() => setInventarioSubPage('equipes')}
                />
              )}
            </>
          ) : activeTab === 'ordens-desconto' ? (
            <OrdensDescontoPage />
          ) : activeTab === 'entrada-material' ? (
            <EntradaMaterialPage onBack={() => setActiveTab('solicitacoes')} />
          ) : activeTab === 'devolucoes' ? (
            <DevolucaoPage onBack={() => setActiveTab('solicitacoes')} />
          ) : activeTab === 'transferencias' ? (
            <TransferenciasPage />
          ) : activeTab === 'emprestimos-terceiros' ? (
            <EmprestimosTerceirosPage />
          ) : null}
        </div>
      </main>
      {/* Biometric Instruction Modal */}
      {biometricModal.open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 transform scale-100 transition-all">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className={`p-4 rounded-full ${biometricModal.isEnrolled ? 'bg-blue-100 text-blue-600' : 'bg-yellow-100 text-yellow-600'}`}>
                <Fingerprint className="w-12 h-12" />
              </div>

              <h3 className="text-2xl font-bold text-gray-900">
                {biometricModal.isEnrolled ? 'Validar Identidade' : 'Novo Cadastro'}
              </h3>

              <div className="space-y-2">
                <p className="text-gray-600">
                  <span className="font-semibold block text-gray-900 text-lg mb-1">{biometricModal.userName}</span>
                  {biometricModal.isEnrolled ? (
                    <>
                      Usuário já possui biometria cadastrada.
                      <br />
                      <span className="text-blue-600 font-medium block mt-2">
                        Solicite dedo: {biometricModal.finger || 'Indicador'}
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Selecione o Dedo
                        </label>
                        <select
                          value={biometricModal.selectedFinger}
                          onChange={(e) => setBiometricModal(prev => ({ ...prev, selectedFinger: e.target.value }))}
                          className="w-full p-3 rounded-xl border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                          disabled={biometricModal.processing}
                        >
                          <option value="right_index">Indicador Direito (Padrão)</option>
                          <option value="right_thumb">Polegar Direito</option>
                          <option value="right_middle">Médio Direito</option>
                          <option value="right_ring">Anelar Direito</option>
                          <option value="right_little">Mínimo Direito</option>
                          <option value="left_index">Indicador Esquerdo</option>
                          <option value="left_thumb">Polegar Esquerdo</option>
                          <option value="left_middle">Médio Esquerdo</option>
                          <option value="left_ring">Anelar Esquerdo</option>
                          <option value="left_little">Mínimo Esquerdo</option>
                        </select>
                      </div>
                      <span className="text-yellow-600 font-medium block mt-2 text-sm">
                        Será realizado um novo cadastro.
                      </span>
                    </>
                  )}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 w-full pt-4">
                {biometricModal.processing ? (
                  <div className="col-span-2 flex flex-col items-center justify-center p-4 bg-blue-50 rounded-xl space-y-3">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="text-blue-700 font-bold text-lg animate-pulse">{biometricModal.message || "Aguardando..."}</p>
                  </div>
                ) : biometricModal.validationResult === 'success' ? (
                  <div className="col-span-2 flex flex-col items-center justify-center p-6 bg-green-50 rounded-xl border border-green-200 animate-in zoom-in-95">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-3">
                      <CheckCircle className="w-10 h-10 text-green-600" />
                    </div>
                    <h4 className="text-xl font-bold text-green-700 mb-1">Validado!</h4>
                    <p className="text-green-800 text-center font-medium">
                      {biometricModal.validationMessage}
                    </p>
                    {/* Emit Success Event to Employee Window */}
                    {(() => {
                      emitTo("employee", "update-employee-view", {
                        type: 'validation-success',
                        message: biometricModal.validationMessage
                      }).catch(console.error);
                      return null;
                    })()}
                  </div>
                ) : (
                  <>
                    {biometricModal.validationResult === 'failure' && (
                      <div className="col-span-2 bg-red-50 text-red-700 p-3 rounded-lg text-sm text-center border border-red-200 mb-2">
                        {biometricModal.validationMessage}
                        {/* Emit Failure Event to Employee Window */}
                        {(() => {
                          emitTo("employee", "update-employee-view", {
                            type: 'validation-error',
                            message: biometricModal.validationMessage || "Não reconhecido. Tente novamente."
                          }).catch(console.error);
                          return null;
                        })()}
                      </div>
                    )}
                    <button
                      onClick={() => {
                        emitTo("employee", "update-employee-view", {
                          type: 'validation-cancelled'
                        }).catch(console.error);
                        setBiometricModal(prev => ({ ...prev, open: false }));
                      }}
                      className="px-4 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleConfirmBiometrics}
                      className={`px-4 py-3 rounded-xl text-white font-bold shadow-lg transition-all active:scale-95 ${biometricModal.isEnrolled
                        ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'
                        : 'bg-yellow-600 hover:bg-yellow-700 shadow-yellow-200'
                        }`}
                    >
                      {biometricModal.validationResult === 'failure' ? 'Tentar Novamente' : (biometricModal.isEnrolled ? 'Iniciar Validação' : 'Iniciar Cadastro')}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Delivery Validation Modal */}
      {deliveryValidationModal.open && deliveryValidationModal.solicitacao && (
        <DeliveryValidationModal
          isOpen={deliveryValidationModal.open}
          onClose={() => setDeliveryValidationModal(prev => ({ ...prev, open: false }))}
          onConfirm={(deliveryData) => {
            if (deliveryValidationModal.solicitacao) {
              setDeliveryValidationModal(prev => ({ ...prev, open: false }));
              proceedToBiometricValidation(deliveryValidationModal.solicitacao, deliveryData);
            }
          }}
          solicitacao={deliveryValidationModal.solicitacao}
        />
      )}

      {/* Troca Modal */}
      {trocaModal.open && trocaModal.solicitacao && (
        <TrocaModal
          isOpen={trocaModal.open}
          onClose={() => setTrocaModal(prev => ({ ...prev, open: false }))}
          onConfirm={handleTrocaConfirm}
          onReadyForValidation={handleTrocaValidation}
          solicitacao={trocaModal.solicitacao}
          inventoryItem={trocaModal.inventoryItem}
        />
      )}

      {/* PDF Viewer Modal */}
      {showPDFModal && pdfBlob && (
        <PDFViewerModal
          isOpen={showPDFModal}
          onClose={handlePDFClose}
          onConfirm={handlePDFConfirm}
          pdfBlob={pdfBlob}
          title="Ordem de Desconto Gerada"
        />
      )}
      {/* Update Checker */}
      <UpdateChecker />

      {/* Cache Indicator */}
      {user && (
        <CacheIndicator 
          userId={user.id}
        />
      )}
    </div>
  );
}
