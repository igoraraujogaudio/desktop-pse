import { useState, useEffect } from "react";
import { listen, emit } from "@tauri-apps/api/event";
import { Package, User, Clock, CheckCircle, Fingerprint, ShieldCheck } from "lucide-react";
import type { EntregaData, SolicitacaoItem } from "../types";

interface ValidationData {
  type: 'validation-start' | 'validation-success' | 'validation-error' | 'validation-cancelled';
  solicitacao?: SolicitacaoItem;
  inventory?: any[];
  biometric?: {
    isEnrolled: boolean;
    finger?: string;
    userName: string;
  };
  message?: string;
}

interface InventoryDisplayData {
  funcionario: {
    id: string;
    nome: string;
  };
  inventario: any[];
}

export default function EmployeeView() {
  const [entregaData, setEntregaData] = useState<EntregaData | null>(null);
  const [validationData, setValidationData] = useState<ValidationData | null>(null);
  const [biometricInstruction, setBiometricInstruction] = useState<string>("");
  const [status, setStatus] = useState<
    "aguardando" | "em_andamento" | "validacao" | "concluida" | "mostrando_inventario"
  >("aguardando");
  const [inventoryDisplayData, setInventoryDisplayData] = useState<InventoryDisplayData | null>(null);

  useEffect(() => {
    // Escutar eventos de entrega iniciada
    const setupListener = async () => {
      const unlistenEntrega = await listen<EntregaData>(
        "entrega-iniciada",
        (event) => {
          setEntregaData(event.payload);
          setValidationData(null);
          setStatus("em_andamento");
        }
      );

      const unlistenValidation = await listen<ValidationData>(
        "update-employee-view",
        (event) => {
          console.log("📢 [EmployeeView] Received update-employee-view:", event.payload);
          if (event.payload.type === 'validation-start') {
            setValidationData(event.payload);
            setStatus("validacao");
            // Set initial instruction - wait for operator to start
            setBiometricInstruction("Aguarde a inicialização pelo almoxarife...");
          } else if (event.payload.type === 'validation-cancelled') {
            setStatus("aguardando");
            setEntregaData(null);
            setValidationData(null);
          } else if (event.payload.type === 'validation-success') {
            setBiometricInstruction("Biometria validada com sucesso!");

            // Wait a moment for the user to see the success message, then reset
            setTimeout(() => {
              setStatus("aguardando");
              setEntregaData(null);
              setValidationData(null);
            }, 3000);
          }
        }
      );

      const unlistenBiometric = await listen<string>(
        "biometric-instruction",
        (event) => {
          setBiometricInstruction(event.payload);
        }
      );

      const unlistenShowInventory = await listen<InventoryDisplayData>(
        "show-inventory",
        (event) => {
          console.log("📢 [EmployeeView] Received show-inventory:", event.payload);
          setInventoryDisplayData(event.payload);
          setStatus("mostrando_inventario");
        }
      );

      return () => {
        unlistenEntrega();
        unlistenValidation();
        unlistenBiometric();
        unlistenShowInventory();
      };
    };

    setupListener().catch(console.error);

    // SETUP ACTIVITY TRACKER
    const handleActivity = () => {
      emit('activity-detected');
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'wheel', 'touchstart'];
    events.forEach(event => document.addEventListener(event, handleActivity));

    return () => {
      events.forEach(event => document.removeEventListener(event, handleActivity));
    };
  }, []);

  if (status === "aguardando") {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 overflow-hidden">
        <div className="text-center w-full max-w-4xl flex flex-col items-center justify-center h-full gap-12 animate-in fade-in duration-1000">

          <img
            src="/logo_pse.png"
            alt="Logo PSE"
            className="w-full max-w-[600px] object-contain drop-shadow-2xl"
          />

          <div className="space-y-6">
            <h1 className="text-5xl font-bold text-gray-800 tracking-tight">
              Aguardando Atendimento
            </h1>
            <div className="flex items-center justify-center gap-4 text-blue-600">
              <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
              <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
              <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce"></div>
            </div>
            <p className="text-2xl text-gray-500 font-light">
              Por favor, aguarde o início da entrega.
            </p>
          </div>

        </div>
      </div>
    );
  }

  if (status === "validacao" && validationData) {
    const solicitacao = validationData.solicitacao;
    const inventory = Array.isArray(validationData.inventory) ? validationData.inventory : [];
    const itemNome = solicitacao?.item?.nome || "Item desconhecido";
    const qtd = solicitacao?.quantidade_aprovada || 0;
    const userName = validationData.biometric?.userName || "Usuário";
    const isEnrolled = validationData.biometric?.isEnrolled;

    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute top-0 right-0 p-12 opacity-5 animate-pulse">
          <Fingerprint className="w-96 h-96 text-blue-900" />
        </div>

        <div className="w-full max-w-7xl grid grid-cols-1 md:grid-cols-12 gap-6 relative z-10 h-[85vh]">
          {/* LEFT: Context & Inventory (Expanded to 9 cols) */}
          <div className="md:col-span-9 flex flex-col gap-6 h-full">
            {/* Context Header */}
            <div className="bg-white rounded-[2rem] p-6 shadow-xl border border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="bg-blue-50 p-4 rounded-2xl">
                  <span className="text-xs font-bold text-blue-400 uppercase tracking-wider block mb-1">Item Solicitado</span>
                  <div className="text-2xl font-black text-gray-900 leading-tight">
                    {itemNome}
                  </div>
                </div>

                <div className="h-12 w-px bg-gray-100"></div>

                <div>
                  <div className="text-sm text-gray-500 font-medium mb-1">Qtd. Aprovada</div>
                  <div className="text-xl text-blue-700 font-bold">
                    {qtd} un
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {solicitacao?.destinatario_equipe && (
                  <div className="text-right mr-4">
                    <div className="text-xs font-bold text-gray-400 uppercase">Equipe</div>
                    <div className="text-gray-900 font-bold">{solicitacao.destinatario_equipe.nome}</div>
                  </div>
                )}
                <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-xl">
                  <div className="text-right">
                    <div className="text-gray-900 font-bold">{userName}</div>
                    <div className="text-gray-500 text-xs text-right">Recebedor</div>
                  </div>
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-100">
                    <User className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
              </div>
            </div>

            {/* Expanded Inventory List */}
            <div className="bg-white/80 backdrop-blur-md rounded-[2rem] p-6 shadow-lg border border-gray-100 flex-1 flex flex-col overflow-hidden">
              <h3 className="text-lg font-bold text-gray-700 mb-4 flex items-center gap-2">
                <Package className="w-5 h-5 text-gray-400" />
                Seu Inventário Atual
                <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs font-bold ml-2">
                  {inventory.length} itens
                </span>
              </h3>

              {inventory.length > 0 ? (
                <div className="overflow-y-auto pr-2 flex-1 custom-scrollbar">
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 content-start">
                    {inventory.map((item, idx) => (
                      <div key={idx} className="flex items-center p-3 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                        <Package className="w-4 h-4 text-blue-200 mr-3 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-gray-700 font-medium truncate text-sm" title={item?.item_estoque?.nome}>
                            {item?.item_estoque?.nome || "Item sem nome"}
                          </div>
                          <div className="text-[10px] text-gray-400">
                            Cód: {item?.item_estoque?.codigo}
                          </div>
                        </div>
                        <span className="text-blue-600 text-sm font-bold ml-2 bg-blue-50 px-2 py-1 rounded-lg">
                          {item?.quantidade || 0}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                  <Package className="w-12 h-12 mb-2 opacity-20" />
                  <p>Nenhum item em posse.</p>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Biometric Prompt (Compact 3 cols) */}
          <div className="md:col-span-3 flex flex-col justify-center h-full">
            <div className="bg-white rounded-[2rem] p-6 shadow-2xl border-4 border-blue-50 w-full text-center relative overflow-hidden group py-10">

              <div className={`absolute inset-0 opacity-10 ${isEnrolled ? 'bg-blue-500' : 'bg-yellow-500'} animate-pulse`}></div>

              <div className="relative z-10">
                <div className="mb-6 relative inline-block">
                  <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 ${isEnrolled ? 'bg-blue-100 text-blue-600' : 'bg-yellow-100 text-yellow-600'} animate-bounce`}>
                    <Fingerprint className="w-12 h-12" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-green-500 text-white p-1.5 rounded-full shadow-lg animate-in zoom-in spin-in duration-500">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                </div>

                <h2 className="text-xl font-black text-gray-900 mb-3">
                  {isEnrolled ? "Validação" : "Cadastro"}
                </h2>

                <p className="text-sm text-gray-600 font-medium leading-relaxed">
                  {biometricInstruction || "Aguarde a inicialização..."}
                </p>

                {!isEnrolled && (
                  <div className="mt-4 p-3 bg-yellow-50 rounded-xl border border-yellow-200 text-yellow-800 text-xs font-bold leading-tight">
                    ✨ Primeiro acesso. Cadastro necessário.
                  </div>
                )}
              </div>
            </div>

            <div className="text-center text-gray-400 text-xs font-medium animate-pulse mt-4">
              Aguarde o sinal sonoro...
            </div>
          </div>
        </div>
      </div>
    );
  }



  if (status === "mostrando_inventario" && inventoryDisplayData) {
    const { inventario, funcionario } = inventoryDisplayData;

    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute top-0 right-0 p-12 opacity-5">
          <Package className="w-96 h-96 text-blue-900" />
        </div>

        <div className="w-full max-w-7xl relative z-10 h-[85vh] flex flex-col gap-6">
          {/* Header */}
          <div className="bg-white rounded-[2rem] p-6 shadow-xl border border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="bg-blue-50 p-4 rounded-2xl">
                <Package className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Visualização de Inventário</span>
                <div className="text-2xl font-black text-gray-900 leading-tight">
                  {funcionario.nome}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-blue-600 px-6 py-3 rounded-xl text-white shadow-lg shadow-blue-200">
              <span className="text-2xl font-bold">{inventario.length}</span>
              <span className="text-sm font-medium opacity-80">itens em posse</span>
            </div>
          </div>

          {/* Expanded Inventory List */}
          <div className="bg-white/80 backdrop-blur-md rounded-[2rem] p-8 shadow-lg border border-gray-100 flex-1 flex flex-col overflow-hidden">
            {inventario.length > 0 ? (
              <div className="overflow-y-auto pr-2 flex-1 custom-scrollbar">
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 content-start">
                  {inventario.map((item, idx) => (
                    <div key={idx} className="flex flex-col p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all hover:border-blue-200 group">
                      <div className="flex items-start justify-between mb-2">
                        <div className="p-2 bg-gray-50 rounded-lg group-hover:bg-blue-50 transition-colors">
                          <Package className="w-5 h-5 text-gray-400 group-hover:text-blue-500" />
                        </div>
                        <span className="text-xs font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-md group-hover:bg-blue-50 group-hover:text-blue-500">
                          Qtd: {item.quantidade}
                        </span>
                      </div>

                      <div className="mt-1">
                        <div className="text-gray-900 font-bold truncate text-base mb-1" title={item.item_estoque?.nome}>
                          {item.item_estoque?.nome || "Item sem nome"}
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="text-xs text-gray-400 font-mono">
                            {item.item_estoque?.codigo || 'S/N'}
                          </div>
                          <div className="text-[10px] text-gray-400 font-medium">
                            {new Date(item.data_entrega).toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      {item.status === 'em_uso' && (
                        <div className="mt-3 pt-3 border-t border-gray-50 flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                          <span className="text-[10px] font-bold text-green-600 uppercase tracking-wide">Em Uso</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                <Package className="w-20 h-20 mb-4 opacity-10" />
                <p className="text-xl font-medium">Nenhum item encontrado no inventário.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!entregaData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <div className="flex items-center justify-center mb-6">
            <div className="bg-blue-100 rounded-full p-4">
              <Package className="h-12 w-12 text-blue-600" />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-center text-gray-900 mb-2">
            Entrega de Materiais
          </h1>
          <p className="text-center text-gray-600">
            Confira os itens que estão sendo entregues
          </p>
        </div>

        {/* Informações do Funcionário */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-blue-100 rounded-full p-3">
              <User className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {entregaData.funcionario.nome}
              </h2>
              {entregaData.funcionario.matricula && (
                <p className="text-gray-600">
                  Matrícula: {entregaData.funcionario.matricula}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Lista de Itens */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            Itens a Receber
          </h3>

          <div className="space-y-4">
            {entregaData.items.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">{item.nome}</h4>
                  <p className="text-sm text-gray-600">Código: {item.codigo}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-blue-600">
                    {item.quantidade}
                  </span>
                  <span className="text-gray-500">unidade(s)</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Status */}
        {status === "em_andamento" && (
          <div className="mt-6 bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-center gap-3">
              <Clock className="h-5 w-5 text-blue-600 animate-pulse" />
              <span className="text-blue-800 font-medium">
                Aguardando validação biométrica...
              </span>
            </div>
          </div>
        )}

        {status === "concluida" && (
          <div className="mt-6 bg-green-50 border-2 border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-green-800 font-medium">
                Entrega concluída com sucesso!
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
