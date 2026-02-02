import { useState, useEffect, useRef } from 'react';
import { User, Check, Loader2 } from 'lucide-react';
import { estoqueService } from '../services/estoqueService';

interface TestemunhaAutocompleteProps {
    value: string; // Name
    onChange: (value: string) => void;
    cpfValue: string;
    onCpfChange: (value: string) => void;
    label?: string;
    placeholder?: string;
    required?: boolean;
}

export function TestemunhaAutocomplete({
    value,
    onChange,
    cpfValue,
    onCpfChange,
    label = "Nome da Testemunha",
    placeholder = "Buscar funcionário...",
    required = false
}: TestemunhaAutocompleteProps) {
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Close suggestions when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSearch = async (term: string) => {
        onChange(term);
        if (term.length < 3) {
            setSuggestions([]);
            return;
        }

        setLoading(true);
        try {
            const results = await estoqueService.searchFuncionarios(term);
            setSuggestions(results);
            setShowSuggestions(true);
        } catch (error) {
            console.error('Error searching:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = (funcionario: any) => {
        onChange(funcionario.nome);
        if (funcionario.cpf) {
            onCpfChange(funcionario.cpf);
        }
        setShowSuggestions(false);
    };

    return (
        <div className="relative" ref={wrapperRef}>
            <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-500 uppercase">{label} {required && '*'}</label>
                <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        value={value}
                        onChange={(e) => handleSearch(e.target.value)}
                        onFocus={() => value.length >= 3 && setShowSuggestions(true)}
                        className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm"
                        placeholder={placeholder}
                        required={required}
                    />
                    {loading && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                        </div>
                    )}
                </div>
            </div>

            {/* CPF Field (Read-only or manual edit could be debated, but usually read-only if selected, but maybe editable if not found?)
               The user said: "se eles tiverem cadastrados tbm o cpf".
               I'll display the CPF field below, allowing manual edit if needed but primarily auto-filled.
            */}
            <div className="mt-2">
                <label className="text-xs font-semibold text-gray-500 uppercase">CPF</label>
                <input
                    type="text"
                    value={cpfValue}
                    onChange={(e) => onCpfChange(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-600 focus:outline-none focus:border-gray-400"
                    placeholder="000.000.000-00"
                    maxLength={14}
                />
            </div>

            {/* Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                    {suggestions.map((func) => (
                        <button
                            key={func.id || func.cpf || Math.random()}
                            onClick={() => handleSelect(func)}
                            className="w-full text-left px-4 py-2 hover:bg-blue-50 flex items-center gap-3 transition-colors border-b last:border-0 border-gray-50"
                        >
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs shrink-0">
                                {func.nome.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                                <div className="font-medium text-gray-900 text-sm">{func.nome}</div>
                                <div className="text-xs text-gray-500 flex gap-2">
                                    <span>{func.cargo || 'Cargo não informado'}</span>
                                    {func.matricula && <span>• Mat: {func.matricula}</span>}
                                </div>
                            </div>
                            {func.cpf && (
                                <Check className="w-4 h-4 text-green-500 ml-auto" />
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
