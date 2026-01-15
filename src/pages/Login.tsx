import { useState } from "react";
import { supabase } from "../lib/supabase";
import { Lock, User, Loader2, ArrowRight } from "lucide-react";

interface LoginProps {
    onLoginSuccess: () => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
    const [matricula, setMatricula] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            // 1. Buscar email pela matrícula
            const { data: userData, error: userError } = await supabase
                .from("usuarios")
                .select("email")
                .eq("matricula", matricula)
                .single();

            if (userError || !userData) {
                console.error("Erro ao buscar usuário:", userError);
                throw new Error("Matrícula não encontrada.");
            }

            if (!userData.email) {
                throw new Error("Usuário sem email cadastrado.");
            }

            // 2. Tentar login com o email encontrado
            const { error: authError } = await supabase.auth.signInWithPassword({
                email: userData.email,
                password,
            });

            if (authError) throw authError;

            onLoginSuccess();
        } catch (err: any) {
            console.error("Erro no login:", err);
            setError(err.message || "Falha ao realizar login. Verifique suas credenciais.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                {/* Header */}
                <div className="bg-blue-600 p-8 text-center">
                    <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                        <Lock className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">Bem-vindo ao PSE</h1>
                    <p className="text-blue-100 mt-2 text-sm">Controle de Almoxarifado & Biometria</p>
                </div>

                {/* Form */}
                <form onSubmit={handleLogin} className="p-8 space-y-6">
                    {error && (
                        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 block">Matrícula</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <User className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                required
                                value={matricula}
                                onChange={(e) => setMatricula(e.target.value)}
                                className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                placeholder="Digite sua matrícula"
                                autoFocus
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 block">Senha</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Lock className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={`
                            w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white 
                            bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                            transition-all transform active:scale-95
                            ${loading ? "opacity-75 cursor-not-allowed" : ""}
                        `}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Entrando...
                            </>
                        ) : (
                            <>
                                Acessar Sistema
                                <ArrowRight className="w-5 h-5" />
                            </>
                        )}
                    </button>

                    <div className="text-center text-xs text-gray-400 mt-4">
                        v1.0.0 • Desenvolvido para PSE
                    </div>
                </form>
            </div>
        </div>
    );
}
