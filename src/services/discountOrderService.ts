import { supabase } from '../lib/supabase';

export interface DiscountOrderData {
    employeeName: string;
    employeeFunction?: string;
    employeeRegistration?: string;
    employeeCpf?: string;
    itemName: string;
    itemCode?: string;
    value: number;
    date: string;
    reason: string;
    observations?: string;
    baseName?: string;
    // New fields required for API
    criadoPor: string;
    funcionarioId: string;
    baseId: string; // Required for backend to know the state
    parcelas: number;
}

export const discountOrderService = {
    async createOrderViaAPI(data: DiscountOrderData): Promise<{ orderId: string, publicUrl: string, pdfBlob: Blob }> {
        console.log('🔄 [discountOrderService] Creating order via API:', data);

        try {
            // Import Tauri's fetch to bypass CORS
            const { fetch: tauriFetch } = await import('@tauri-apps/plugin-http');

            // Construct payload matching API expectations
            const payload = {
                created_by: data.criadoPor,
                target_user_id: data.funcionarioId,
                valor_total: data.value,
                valor_parcela: data.parcelas > 1 ? data.value / data.parcelas : data.value,
                parcelas: data.parcelas,
                descricao: `Desconto referente a ${data.itemName} ${data.itemCode ? `(${data.itemCode})` : ''} - ${data.reason}. ${data.observations || ''}`,
                cpf: data.employeeCpf ? data.employeeCpf.replace(/\D/g, '') : null,
                data_geracao: new Date().toISOString().slice(0, 10),
                base_id: data.baseId,

                // Fields for automatic classification
                tipo_documento: 'nf',
                observacoes_danos: data.observations,
                documentos: ['NF']
            };

            console.log('📤 [discountOrderService] Payload:', payload);

            const response = await tauriFetch('https://app.pse.srv.br/api/discount-orders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ [discountOrderService] API Error:', errorText);
                throw new Error(`API Error: ${response.status} - ${errorText}`);
            }

            // The API returns the PDF binary (blob) AND headers with metadata
            const arrayBuffer = await response.arrayBuffer();
            const pdfBlob = new Blob([arrayBuffer], { type: 'application/pdf' });

            const publicUrl = response.headers.get('X-Supabase-File-Url');
            const orderId = response.headers.get('X-Discount-Order-Id');

            if (!publicUrl || !orderId) {
                console.error('❌ [discountOrderService] Missing headers in API response:', {
                    url: publicUrl,
                    id: orderId
                });
                // Fallback: If headers are missing but we have blob, maybe we can't get ID/URL easily.
                // But the API *should* return them.
                throw new Error('API response missing critical headers (X-Supabase-File-Url or X-Discount-Order-Id)');
            }

            console.log('✅ [discountOrderService] Order created via API:', { orderId, publicUrl });

            return {
                orderId,
                publicUrl,
                pdfBlob
            };

        } catch (error) {
            console.error('❌ [discountOrderService] Exception calling API:', error);
            throw error;
        }
    },

    async generateDiscountOrderPDF(data: Omit<DiscountOrderData, 'criadoPor' | 'funcionarioId' | 'baseId' | 'parcelas'> & { orderId: string }): Promise<Blob> {
        console.log('🔄 [discountOrderService] Regenerating PDF for order:', data.orderId);

        try {
            // Import Tauri's fetch to bypass CORS
            const { fetch: tauriFetch } = await import('@tauri-apps/plugin-http');

            // Call the API to regenerate the PDF for viewing
            const response = await tauriFetch(`https://app.pse.srv.br/api/discount-orders/${data.orderId}/pdf`, {
                method: 'GET'
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ [discountOrderService] PDF Generation Error:', errorText);
                throw new Error(`PDF Generation Error: ${response.status} - ${errorText}`);
            }

            const arrayBuffer = await response.arrayBuffer();
            const pdfBlob = new Blob([arrayBuffer], { type: 'application/pdf' });
            console.log('✅ [discountOrderService] PDF regenerated successfully');

            return pdfBlob;

        } catch (error) {
            console.error('❌ [discountOrderService] Exception generating PDF:', error);
            throw error;
        }
    },

    async fetchPDFFromUrl(url: string): Promise<Blob> {
        console.log('🔄 [discountOrderService] Fetching PDF from URL:', url);
        try {
            // Import Tauri's fetch to bypass CORS
            const { fetch: tauriFetch } = await import('@tauri-apps/plugin-http');

            const response = await tauriFetch(url, {
                method: 'GET'
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch PDF: ${response.status}`);
            }

            const arrayBuffer = await response.arrayBuffer();
            return new Blob([arrayBuffer], { type: 'application/pdf' });
        } catch (error) {
            console.error('❌ [discountOrderService] Error fetching PDF from URL:', error);
            throw error;
        }
    },

    async uploadPDF(file: File, orderId: string, action: 'assinado' | 'recusado' = 'assinado', testemunhas?: {
        testemunha1_nome: string;
        testemunha1_cpf: string;
        testemunha2_nome: string;
        testemunha2_cpf: string;
    }): Promise<string | null> {
        console.log('🔄 [discountOrderService] Uploading file for order:', orderId, 'Action:', action);

        try {

            // Upload to Supabase storage
            const fileName = `discount-order-${orderId}-${action}-${Date.now()}.pdf`;
            const { error: uploadError } = await supabase.storage
                .from('ordens-desconto-pdfs')
                .upload(fileName, file, {
                    contentType: 'application/pdf',
                    upsert: false
                });

            if (uploadError) {
                console.error('❌ [discountOrderService] Upload error:', uploadError);
                throw uploadError;
            }

            // Get public URL
            const { data: urlData } = supabase.storage
                .from('ordens-desconto-pdfs')
                .getPublicUrl(fileName);

            console.log('✅ [discountOrderService] PDF uploaded successfully:', urlData.publicUrl);

            // Prepare update data
            const updateData: any = {
                arquivo_assinado_url: urlData.publicUrl,
                status: action === 'assinado' ? 'assinada' : 'recusada',
                recusado: action === 'recusado'
            };

            if (action === 'recusado' && testemunhas) {
                updateData.testemunha1_nome = testemunhas.testemunha1_nome;
                updateData.testemunha1_cpf = testemunhas.testemunha1_cpf;
                updateData.testemunha2_nome = testemunhas.testemunha2_nome;
                updateData.testemunha2_cpf = testemunhas.testemunha2_cpf;
            }

            // Update order status and fields
            const { error: dbError } = await supabase
                .from('discount_orders')
                .update(updateData)
                .eq('id', orderId);

            if (dbError) throw dbError;

            // Send email notification (replicating web app behavior)
            try {
                const { fetch: tauriFetch } = await import('@tauri-apps/plugin-http');
                console.log('📧 [discountOrderService] Sending email notification...');

                // Note: If API requires auth, we might need to attach token here.
                // Assuming public or IP-based for now as implementation matching web app's client side fetch.
                const emailResponse = await tauriFetch('https://app.pse.srv.br/api/email/send-discount-order', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        orderId,
                        fileUrl: urlData.publicUrl,
                        action
                    })
                });

                if (emailResponse.ok) {
                    console.log('✅ [discountOrderService] Email notification sent successfully.');
                } else {
                    console.warn('⚠️ [discountOrderService] Email API returned error:', await emailResponse.text());
                }
            } catch (emailError) {
                console.error('⚠️ [discountOrderService] Failed to send email:', emailError);
            }

            return urlData.publicUrl;

        } catch (error) {
            console.error('❌ [discountOrderService] Exception uploading PDF:', error);
            return null;
        }
    },

    async deleteOrder(orderId: string): Promise<void> {
        console.log('🗑️ [discountOrderService] Deleting order via Supabase:', orderId);
        try {
            // 1. Delete PDF from Storage (optional effort)
            const fileName = `discount-order-${orderId}.pdf`;
            const { error: storageError } = await supabase.storage
                .from('ordens-desconto-pdfs')
                .remove([fileName]);

            if (storageError) {
                console.warn('⚠️ [discountOrderService] Failed to delete PDF from storage:', storageError);
            } else {
                console.log('✅ [discountOrderService] PDF deleted from storage');
            }

            // 2. Delete Order from DB
            const { error: dbError } = await supabase
                .from('discount_orders')
                .delete()
                .eq('id', orderId);

            if (dbError) {
                console.error('❌ [discountOrderService] DB Error deleting order:', dbError);
                throw new Error(dbError.message);
            }

            console.log('✅ [discountOrderService] Order deleted successfully from DB');
        } catch (error) {
            console.error('❌ [discountOrderService] Error deleting order:', error);
            throw error;
        }
    }
};

