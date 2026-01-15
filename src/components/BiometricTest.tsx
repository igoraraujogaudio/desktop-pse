import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Fingerprint, CheckCircle, XCircle, RefreshCw, AlertTriangle, User } from "lucide-react";
import { supabase } from "../lib/supabase";

interface ValidationResult {
    success: boolean;
    reason: string;
    score?: number;
    percent?: number;
    quality?: number;
    enrolled: boolean;
}

interface Usuario {
    id: string;
    nome: string;
    matricula?: string;
}

export default function BiometricTest() {
    const [status, setStatus] = useState<"idle" | "capturing" | "success" | "error">("idle");
    const [message, setMessage] = useState("");
    const [result, setResult] = useState<ValidationResult | null>(null);

    // User selection state
    const [users, setUsers] = useState<Usuario[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<string>("");
    const [loadingUsers, setLoadingUsers] = useState(false);

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            setLoadingUsers(true);
            const { data, error } = await supabase
                .from("usuarios")
                .select("id, nome, matricula")
                .order("nome");

            if (error) throw error;

            if (data) {
                setUsers(data);
                // Select first user automatically if available
                if (data.length > 0) {
                    setSelectedUserId(data[0].id);
                }
            }
        } catch (error) {
            console.error("Erro ao carregar usuários:", error);
            setMessage("Erro ao carregar lista de usuários.");
            setStatus("error");
        } finally {
            setLoadingUsers(false);
        }
    };

    const testReader = async () => {
        if (!selectedUserId) {
            alert("Por favor, selecione um usuário para o teste.");
            return;
        }

        let unlisten: (() => void) | undefined;

        try {
            setStatus("capturing");
            setMessage("Iniciando processo...");
            setResult(null);

            // Ouvir instruções do backend (ex: "Posicione o dedo 1/3", "Retire o dedo")
            const { listen } = await import('@tauri-apps/api/event');
            unlisten = await listen<string>('biometric-instruction', (event) => {
                setMessage(event.payload);
            });

            const res = await invoke<ValidationResult>("validate_or_enroll_fingerprint", {
                userId: selectedUserId,
                minPercent: 90, // Threshold aumentado para 90% (Alta Segurança)
            });

            setResult(res);
            setStatus(res.success ? "success" : "error");

            if (res.success) {
                setMessage(res.reason || "Leitura realizada com sucesso!");
            } else {
                setMessage(`Falha na leitura: ${res.reason}`);
            }

        } catch (error) {
            console.error("Erro no teste:", error);
            setStatus("error");
            setMessage(`Erro técnico: ${typeof error === 'string' ? error : JSON.stringify(error)}`);
        } finally {
            if (unlisten) unlisten();
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 max-w-2xl mx-auto mt-10">
            <div className="text-center mb-8">
                <div className="mx-auto bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                    <Fingerprint className="w-8 h-8 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Teste do Leitor Biométrico</h2>
                <p className="text-gray-500 mt-2">
                    Selecione um usuário e utilize o leitor para cadastrar ou validar uma digital.
                </p>
            </div>

            {/* User Selection Section */}
            <div className="mb-8 max-w-md mx-auto">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Usuário para Teste
                </label>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <select
                        value={selectedUserId}
                        onChange={(e) => setSelectedUserId(e.target.value)}
                        disabled={loadingUsers || status === "capturing"}
                        className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    >
                        <option value="">Selecione um usuário...</option>
                        {users.map((user) => (
                            <option key={user.id} value={user.id}>
                                {user.nome} {user.matricula ? `(${user.matricula})` : ""}
                            </option>
                        ))}
                    </select>
                </div>
                {loadingUsers && (
                    <p className="text-xs text-gray-500 mt-1 ml-1">Carregando usuários...</p>
                )}
            </div>

            <div className="flex justify-center mb-8">
                <button
                    onClick={testReader}
                    disabled={status === "capturing" || !selectedUserId}
                    className={`
            relative flex items-center gap-3 px-8 py-4 rounded-xl text-lg font-semibold text-white transition-all
            ${status === "capturing" || !selectedUserId
                            ? "bg-gray-400 cursor-not-allowed"
                            : "bg-blue-600 hover:bg-blue-700 hover:shadow-lg active:transform active:scale-95"}
          `}
                >
                    {status === "capturing" ? (
                        <>
                            <RefreshCw className="w-5 h-5 animate-spin" />
                            Lendo digital...
                        </>
                    ) : (
                        <>
                            <Fingerprint className="w-6 h-6" />
                            Testar Leitor
                        </>
                    )}
                </button>
            </div>

            {status !== "idle" && (
                <div className={`rounded-xl p-6 border ${status === "success" ? "bg-green-50 border-green-200" :
                    status === "error" ? "bg-red-50 border-red-200" :
                        "bg-blue-50 border-blue-200"
                    }`}>
                    <div className="flex items-start gap-4">
                        {status === "success" && <CheckCircle className="w-6 h-6 text-green-600 mt-1" />}
                        {status === "error" && <XCircle className="w-6 h-6 text-red-600 mt-1" />}
                        {status === "capturing" && <RefreshCw className="w-6 h-6 text-blue-600 animate-spin mt-1" />}

                        <div className="flex-1">
                            <h3 className={`font-semibold text-lg mb-1 ${status === "success" ? "text-green-900" :
                                status === "error" ? "text-red-900" :
                                    "text-blue-900"
                                }`}>
                                {message}
                            </h3>

                            {result && (
                                <div className="mt-4 grid grid-cols-2 gap-4">
                                    <div className="bg-white/60 rounded-lg p-3">
                                        <span className="text-xs font-medium uppercase tracking-wider text-gray-500">Qualidade</span>
                                        <div className="text-xl font-bold text-gray-900">
                                            {result.quality !== undefined ? `${result.quality}%` : '-'}
                                        </div>
                                    </div>

                                    <div className="bg-white/60 rounded-lg p-3">
                                        <span className="text-xs font-medium uppercase tracking-wider text-gray-500">Score de Similaridade</span>
                                        <div className="text-xl font-bold text-gray-900">
                                            {result.percent !== undefined ? `${result.percent}%` : '-'}
                                            <span className="text-xs text-gray-400 font-normal ml-1">
                                                (Raw: {result.score})
                                            </span>
                                        </div>
                                    </div>

                                    <div className="col-span-2 bg-white/60 rounded-lg p-3">
                                        <span className="text-xs font-medium uppercase tracking-wider text-gray-500">Status da Validação</span>
                                        <div className="font-medium text-gray-900 mt-1">
                                            {result.enrolled ? "Digital Cadastrada (Enroll)" : "Digital Verificada (Match)"}
                                        </div>
                                        {result.reason && (
                                            <div className="text-sm text-gray-600 mt-1">
                                                Detalhe: {result.reason}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="mt-8 pt-6 border-t border-gray-100">
                <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    Dicas de diagnóstico
                </h4>
                <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-1.5 flex-shrink-0" />
                        Se o leitor não piscar, verifique a conexão USB e o status do driver na tela inicial.
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-1.5 flex-shrink-0" />
                        Qualidade abaixo de 60% pode indicar sujeira no sensor ou dedo muito seco/úmido.
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-1.5 flex-shrink-0" />
                        O erro "Device not found" geralmente requer reinstalação do driver via tela inicial.
                    </li>
                </ul>
            </div>
        </div>
    );
}
