import { X, Printer, Download } from 'lucide-react';
import { useState, useEffect } from 'react';

interface PDFViewerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    pdfBlob: Blob | null;
    title?: string;
    viewOnly?: boolean;
}

export function PDFViewerModal({ isOpen, onClose, onConfirm, pdfBlob, title = "Ordem de Desconto", viewOnly = false }: PDFViewerModalProps) {
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);

    useEffect(() => {
        if (pdfBlob && isOpen) {
            const url = URL.createObjectURL(pdfBlob);
            setPdfUrl(url);

            return () => {
                if (url) {
                    URL.revokeObjectURL(url);
                }
            };
        }
    }, [pdfBlob, isOpen]);

    if (!isOpen) return null;

    const handlePrint = () => {
        if (pdfUrl) {
            const printWindow = window.open(pdfUrl, '_blank');
            if (printWindow) {
                printWindow.onload = () => {
                    printWindow.print();
                };
            }
        }
    };

    const handleDownload = () => {
        if (pdfUrl) {
            const link = document.createElement('a');
            link.href = pdfUrl;
            link.download = `ordem_desconto_${Date.now()}.pdf`;
            link.click();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
                        <p className="text-sm text-gray-500">Revise e imprima o documento</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handlePrint}
                            className="p-2 hover:bg-gray-200 rounded-lg transition-colors text-gray-700"
                            title="Imprimir"
                        >
                            <Printer className="w-5 h-5" />
                        </button>
                        <button
                            onClick={handleDownload}
                            className="p-2 hover:bg-gray-200 rounded-lg transition-colors text-gray-700"
                            title="Baixar"
                        >
                            <Download className="w-5 h-5" />
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-200 rounded-lg transition-colors text-gray-700"
                            title="Fechar"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* PDF Viewer */}
                <div className="flex-1 overflow-hidden bg-gray-100">
                    {pdfUrl ? (
                        <iframe
                            src={pdfUrl}
                            className="w-full h-full border-0"
                            title="PDF Viewer"
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-center">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                                <p className="text-gray-500">Carregando PDF...</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
                    {viewOnly ? (
                        <button
                            onClick={onClose}
                            className="px-6 py-2.5 bg-gray-600 text-white font-medium hover:bg-gray-700 rounded-xl transition-colors text-sm"
                        >
                            Fechar
                        </button>
                    ) : (
                        <>
                            <button
                                onClick={onClose}
                                className="px-5 py-2.5 text-gray-600 font-medium hover:bg-gray-200 rounded-xl transition-colors text-sm"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => {
                                    onConfirm();
                                    onClose();
                                }}
                                className="px-6 py-2.5 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-all shadow-lg shadow-green-200 text-sm flex items-center gap-2"
                            >
                                Confirmar e Continuar
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
