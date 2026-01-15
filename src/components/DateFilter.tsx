import { useState } from 'react';
import { Calendar, Clock, CalendarDays, CalendarRange } from 'lucide-react';

export type DateFilterType = 'todos' | 'hoje' | '7dias' | '1mes' | '6meses' | '1ano' | 'periodo';

export interface DateFilterProps {
    selectedFilter: DateFilterType;
    onFilterChange: (filter: DateFilterType) => void;
    onDateRangeChange?: (startDate: Date, endDate: Date) => void;
    startDate?: Date;
    endDate?: Date;
}

export function DateFilter({
    selectedFilter,
    onFilterChange,
    onDateRangeChange,
    startDate,
    endDate
}: DateFilterProps) {
    const [tempStartDate, setTempStartDate] = useState<string>(
        startDate ? startDate.toISOString().split('T')[0] : ''
    );
    const [tempEndDate, setTempEndDate] = useState<string>(
        endDate ? endDate.toISOString().split('T')[0] : ''
    );

    const getFilterIcon = (filter: DateFilterType) => {
        switch (filter) {
            case 'todos':
                return <CalendarDays className="w-3 h-3" />;
            case 'hoje':
                return <Clock className="w-3 h-3" />;
            case '7dias':
            case '1mes':
            case '6meses':
            case '1ano':
                return <Calendar className="w-3 h-3" />;
            case 'periodo':
                return <CalendarRange className="w-3 h-3" />;
            default:
                return <Clock className="w-3 h-3" />;
        }
    };

    const handleFilterSelect = (filter: DateFilterType) => {
        onFilterChange(filter);

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        let start: Date;
        let end: Date;

        switch (filter) {
            case 'todos':
                return;
            case 'hoje':
                start = today;
                end = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1);
                break;
            case '7dias':
                start = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
                end = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1);
                break;
            case '1mes':
                start = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
                end = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1);
                break;
            case '6meses':
                start = new Date(today.getTime() - 180 * 24 * 60 * 60 * 1000);
                end = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1);
                break;
            case '1ano':
                start = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000);
                end = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1);
                break;
            case 'periodo':
                return;
            default:
                start = today;
                end = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1);
        }

        onDateRangeChange?.(start, end);
    };

    const handlePeriodConfirm = () => {
        if (tempStartDate && tempEndDate) {
            const start = new Date(tempStartDate);
            const end = new Date(tempEndDate);
            onDateRangeChange?.(start, end);
        }
    };

    const filterOptions: { value: DateFilterType; label: string }[] = [
        { value: 'todos', label: 'Todos' },
        { value: 'hoje', label: 'Hoje' },
        { value: '7dias', label: '7 dias' },
        { value: '1mes', label: '1 mês' },
        { value: '6meses', label: '6 meses' },
        { value: '1ano', label: '1 ano' },
        { value: 'periodo', label: 'Período' }
    ];

    return (
        <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
                {filterOptions.map((option) => (
                    <button
                        key={option.value}
                        onClick={() => handleFilterSelect(option.value)}
                        className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-full transition-all duration-200 ${selectedFilter === option.value
                                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md'
                                : 'bg-white hover:bg-gray-50 text-gray-600 border border-gray-200 hover:border-gray-300'
                            }`}
                    >
                        {getFilterIcon(option.value)}
                        {option.label}
                    </button>
                ))}
            </div>

            {selectedFilter === 'periodo' && (
                <div className="border-2 border-blue-200 bg-blue-50/50 rounded-2xl p-3">
                    <div className="space-y-2">
                        <div className="text-xs font-semibold text-blue-800 uppercase tracking-wide">Selecionar Período</div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-blue-700">Data Inicial</label>
                                <input
                                    type="date"
                                    value={tempStartDate}
                                    onChange={(e) => setTempStartDate(e.target.value)}
                                    className="w-full px-2 py-1.5 text-sm border border-blue-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-medium text-blue-700">Data Final</label>
                                <input
                                    type="date"
                                    value={tempEndDate}
                                    onChange={(e) => setTempEndDate(e.target.value)}
                                    className="w-full px-2 py-1.5 text-sm border border-blue-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <button
                                onClick={handlePeriodConfirm}
                                disabled={!tempStartDate || !tempEndDate}
                                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
                            >
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {selectedFilter === 'periodo' && startDate && endDate && (
                <div className="text-xs text-blue-700 bg-blue-100 px-2 py-1 rounded-lg border border-blue-200">
                    <span className="font-medium">Período:</span> {startDate.toLocaleDateString('pt-BR')} - {endDate.toLocaleDateString('pt-BR')}
                </div>
            )}
        </div>
    );
}
