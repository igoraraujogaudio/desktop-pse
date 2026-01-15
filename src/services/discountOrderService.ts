import { supabase } from '../lib/supabase';
import jsPDF from 'jspdf';
import { discountOrderTemplate } from '../templates/discountOrderTemplate';

export interface DiscountOrderData {
    employeeName: string;
    employeeFunction?: string;
    employeeRegistration?: string;
    employeeCpf?: string; // Add CPF
    itemName: string;
    itemCode?: string;
    value: number;
    date: string;
    reason: string;
    observations?: string;
    orderId: string;
    baseName?: string; // Add Base
}

export const discountOrderService = {
    async generateDiscountOrderPDF(data: DiscountOrderData): Promise<Blob> {
        console.log('🔄 [discountOrderService] Generating PDF from HTML template:', data.orderId);

        // 1. Prepare Data for Replacement
        const valorExtenso = this.numeroParaExtenso(data.value);
        const cpfFormatted = this.formatarCPF(data.employeeCpf || '');
        const itemTotal = data.value.toFixed(2).replace('.', ',');
        const baseState = this.obterEstadoBase(data.baseName || 'São Paulo');

        const itensTabela = `
        <tr>
          <td>
            <div class="item-name">${data.itemName} ${data.itemCode ? `(${data.itemCode})` : ''}</div>
          </td>
          <td class="text-center">1</td>
          <td class="text-right">R$ ${itemTotal}</td>
          <td class="text-right">R$ ${itemTotal}</td>
          <td>
            <div class="item-motive">${data.reason}</div>
          </td>
        </tr>`;

        const templateData: Record<string, string | number> = {
            nome_colaborador: data.employeeName,
            cpf: cpfFormatted,
            descricao: `Desconto referente a ${data.itemName} - ${data.reason}. ${data.observations || ''}`,
            valor_total: itemTotal,
            valor_total_extenso: valorExtenso,
            itens_tabela: itensTabela,
            documentos_comprobatórios: '<li>Ordem de Serviço (Digital)</li>',
            data_geracao: data.date,
            estado_base: baseState,
            matricula: data.employeeRegistration || ''
        };

        // 2. Replace placeholders
        let htmlContent = this.substituirPlaceholders(discountOrderTemplate, templateData);

        // 3. Generate PDF using jsPDF .html()
        // We create a temporary doc to render the HTML
        // Note: .html() is async and requires the container to be in the DOM or using html2canvas options
        // For simple usage without attaching to DOM, we might need a workaround or just use the Promise

        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'pt',
            format: 'a4'
        });

        return new Promise<Blob>((resolve) => {
            doc.html(htmlContent, {
                callback: function (doc) {
                    const blob = doc.output('blob');
                    resolve(blob);
                },
                x: 0,
                y: 0,
                width: 595.28, // A4 width in pt
                windowWidth: 800, // Adjust window width for CSS layout to fit
                autoPaging: 'text',
                margin: 0
            });
        });
    },

    async uploadPDF(pdfBlob: Blob, orderId: string): Promise<string | null> {
        try {
            const fileName = `${orderId}_${Date.now()}.pdf`;
            const { error } = await supabase.storage
                .from('ordens-desconto')
                .upload(fileName, pdfBlob, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) {
                console.error('❌ [discountOrderService] Upload error:', error);
                return null;
            }

            const { data: { publicUrl } } = supabase.storage
                .from('ordens-desconto')
                .getPublicUrl(fileName);

            return publicUrl;
        } catch (err) {
            console.error('❌ [discountOrderService] Upload exception:', err);
            return null;
        }
    },

    // Helper functions from web service
    substituirPlaceholders(template: string, dados: Record<string, string | number>): string {
        let resultado = template;
        Object.keys(dados).forEach(key => {
            const placeholder = `{{${key}}}`;
            resultado = resultado.replace(new RegExp(placeholder, 'g'), String(dados[key]));
        });
        return resultado;
    },

    formatarCPF(cpf: string): string {
        if (!cpf) return '';
        // Remove non-digits
        const nums = cpf.replace(/\D/g, '');
        return nums.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    },

    obterEstadoBase(baseNome: string): string {
        const mapeamentoEstados: { [key: string]: string } = {
            'São Paulo': 'São Paulo',
            'Rio de Janeiro': 'Rio de Janeiro',
            'Belo Horizonte': 'Minas Gerais',
            'Salvador': 'Bahia',
            'Brasília': 'Distrito Federal',
            'Fortaleza': 'Ceará',
            'Recife': 'Pernambuco',
            'Porto Alegre': 'Rio Grande do Sul',
            'Curitiba': 'Paraná',
            'Goiânia': 'Goiás'
        };
        return mapeamentoEstados[baseNome] || 'São Paulo';
    },

    numeroParaExtenso(valor: number): string {
        const unidades = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
        const dezenas = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
        const centenas = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

        if (valor === 0) return 'zero reais';

        const reais = Math.floor(valor);
        const centavos = Math.round((valor - reais) * 100);
        let resultado = '';

        if (reais > 0) {
            if (reais >= 1000) {
                const milhares = Math.floor(reais / 1000);
                resultado += this.numeroParaExtenso(milhares) + ' mil ';
                const resto = reais % 1000;
                if (resto > 0) resultado += this.numeroParaExtenso(resto);
            } else if (reais >= 100) {
                const centena = Math.floor(reais / 100);
                resultado += centenas[centena] + ' ';
                const resto = reais % 100;
                if (resto > 0) resultado += this.numeroParaExtenso(resto);
            } else if (reais >= 20) {
                const dezena = Math.floor(reais / 10);
                resultado += dezenas[dezena] + ' ';
                const resto = reais % 10;
                if (resto > 0) resultado += unidades[resto] + ' ';
            } else if (reais >= 10) {
                if (reais === 10) resultado += 'dez ';
                else if (reais === 11) resultado += 'onze ';
                else if (reais === 12) resultado += 'doze ';
                else if (reais === 13) resultado += 'treze ';
                else if (reais === 14) resultado += 'quatorze ';
                else if (reais === 15) resultado += 'quinze ';
                else if (reais === 16) resultado += 'dezesseis ';
                else if (reais === 17) resultado += 'dezessete ';
                else if (reais === 18) resultado += 'dezoito ';
                else if (reais === 19) resultado += 'dezenove ';
            } else {
                resultado += unidades[reais] + ' ';
            }
            if (!resultado.includes('mil')) resultado += reais === 1 ? 'real' : 'reais';
        }

        if (centavos > 0) {
            if (reais > 0) resultado += ' e ';
            if (centavos === 1) resultado += 'um centavo';
            else resultado += this.numeroParaExtenso(centavos) + ' centavos';
        }

        return resultado.trim();
    }
};
