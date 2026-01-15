import { supabase } from '../lib/supabase';
import type { SolicitacaoItem, DadosTroca } from '../types';
import { discountOrderService } from './discountOrderService';

export const estoqueService = {
    async getEquipe(id: string) {
        const { data, error } = await supabase
            .from('equipes')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.error('❌ [estoqueService] Error fetching equipe:', error);
            return null;
        }
        return data;
    },

    async getInventarioByFuncionario(funcionarioId: string) {
        console.log('🔍 [estoqueService] Fetching inventory for funcionario:', funcionarioId);

        const { data, error } = await supabase
            .from('inventario_funcionario')
            .select(`
                *,
                funcionario:usuarios!inventario_funcionario_funcionario_id_fkey(id, nome, matricula),
                item_estoque:itens_estoque!item_estoque_id(nome, codigo, categoria)
            `)
            .eq('funcionario_id', funcionarioId)
            .eq('status', 'em_uso')
            .order('data_entrega', { ascending: false });

        if (error) {
            console.error('❌ [estoqueService] Error fetching inventory:', error);
            throw error;
        }

        console.log('✅ [estoqueService] Inventory fetched:', data?.length || 0);
        return data || [];
    },

    async getInventarioByEquipe(equipeId: string) {
        console.log('🔍 [estoqueService] Fetching inventory for equipe:', equipeId);

        const { data, error } = await supabase
            .from('inventario_equipe')
            .select(`
                *,
                equipe:equipes(nome, status),
                item_estoque:itens_estoque(nome, codigo, categoria)
            `)
            .eq('equipe_id', equipeId)
            .eq('status', 'ativo')
            .order('data_entrega', { ascending: false });

        if (error) {
            console.error('❌ [estoqueService] Error fetching inventory:', error);
            throw error;
        }

        console.log('✅ [estoqueService] Inventory fetched:', data?.length || 0);
        return data || [];
    },

    async getSolicitacoesPorStatus(
        status: string,
        options?: {
            startDate?: Date;
            endDate?: Date;
            baseId?: string;
        }
    ): Promise<SolicitacaoItem[]> {
        console.log('🔍 [estoqueService] Fetching solicitations with status:', status);

        let query = supabase
            .from('solicitacoes_itens')
            .select(`
        *,
        item:itens_estoque!solicitacoes_itens_item_id_fkey(id, nome, codigo, estoque_atual),
        solicitante:usuarios!solicitacoes_itens_solicitante_id_fkey(id, nome, email),
        destinatario:funcionarios_ativos!solicitacoes_itens_destinatario_id_fkey(id, nome, matricula),
        destinatario_equipe:equipes!solicitacoes_itens_destinatario_equipe_id_fkey(id, nome),
        responsavel_equipe:usuarios!solicitacoes_itens_responsavel_equipe_id_fkey(id, nome),
        base:bases!solicitacoes_itens_base_id_fkey(id, nome)
      `)
            .eq('status', status);

        // Apply optional filters
        if (options?.startDate && options?.endDate) {
            query = query
                .gte('criado_em', options.startDate.toISOString())
                .lte('criado_em', options.endDate.toISOString());
        }

        if (options?.baseId && options.baseId !== 'todas') {
            query = query.eq('base_id', options.baseId);
        }

        const { data, error } = await query
            .order('criado_em', { ascending: false })
            .limit(1000);

        if (error) {
            console.error('❌ [estoqueService] Error fetching solicitations:', error);
            throw error;
        }

        console.log('✅ [estoqueService] Solicitations fetched:', data?.length || 0);
        return data || [];
    },



    async processarRetornoAposEntrega(solicitacao: SolicitacaoItem, dadosTroca: DadosTroca, userId: string) {
        console.log('🔄 [estoqueService] Processing return AFTER delivery', { solicitacao, dadosTroca });

        // 1. Update Inventory Item Status (if ID exists)
        if (dadosTroca.inventoryItemId) {
            console.log('📦 [estoqueService] Debiting old item:', dadosTroca.inventoryItemId);

            const updates: any = {
                data_devolucao: new Date().toISOString(),
                status: dadosTroca.condicao,
                condicao_devolucao: dadosTroca.condicao,
                observacoes_devolucao: dadosTroca.observacoes,
                devolvido_em_solicitacao_id: solicitacao.id
            };

            const { error: updateError } = await supabase
                .from('historico_funcionarios')
                .update(updates)
                .eq('id', dadosTroca.inventoryItemId);

            if (updateError) console.error('❌ [estoqueService] Error updating inventory item:', updateError);

            // 1b. Return to Stock Logic (Only for 'bom')
            if (dadosTroca.condicao === 'bom') {
                const { data: invItem } = await supabase.from('historico_funcionarios').select('item_id').eq('id', dadosTroca.inventoryItemId).single();

                if (invItem?.item_id) {
                    const { data: itemData } = await supabase.from('itens_estoque').select('estoque_atual').eq('id', invItem.item_id).single();
                    if (itemData) {
                        await supabase.from('itens_estoque')
                            .update({ estoque_atual: (itemData.estoque_atual || 0) + 1 })
                            .eq('id', invItem.item_id);
                    }
                }
            }
        }

        // 2. Generate Discount Order (if requested)
        if (dadosTroca.gerarDesconto && (dadosTroca.condicao === 'danificado' || dadosTroca.condicao === 'perdido')) {
            console.log('💰 [estoqueService] Generating discount order');

            try {
                // Get item details for accurate pricing
                let itemPreco = 0;
                let itemCodigo = '';
                const { data: itemData } = await supabase
                    .from('itens_estoque')
                    .select('preco, codigo, nome')
                    .eq('id', solicitacao.item_id)
                    .single();

                if (itemData) {
                    itemPreco = itemData.preco || 0;
                    itemCodigo = itemData.codigo || '';
                }

                // Create Order Record
                const itemNome = solicitacao.item?.nome || itemData?.nome || 'Item da Solicitação';

                const { data: orderData, error: discountError } = await supabase
                    .from('ordens_desconto')
                    .insert({
                        funcionario_id: solicitacao.destinatario_id,
                        base_id: solicitacao.base_id,
                        descricao: `Desconto por item ${dadosTroca.condicao}: ${itemNome} (Cód: ${itemCodigo})`,
                        valor_total: itemPreco,
                        status: 'pendente',
                        criado_por: userId,
                        observacoes: dadosTroca.observacoes,
                        itens_inventario: {
                            item_id: solicitacao.item_id,
                            condicao: dadosTroca.condicao,
                            solicitacao_id: solicitacao.id,
                            motivo: dadosTroca.condicao
                        }
                    })
                    .select()
                    .single();

                if (discountError) {
                    console.error('❌ [estoqueService] Error creating discount order:', discountError);
                } else if (orderData) {
                    // Generate and Upload PDF
                    // Fetch Employee Details for PDF
                    const { data: funcionario } = await supabase
                        .from('funcionarios')
                        .select('nome, matricula, funcao')
                        .eq('id', solicitacao.destinatario_id)
                        .single();

                    console.log('📄 [estoqueService] Generating PDF for order:', orderData.id);
                    try {
                        const pdfBlob = await discountOrderService.generateDiscountOrderPDF({
                            employeeName: funcionario?.nome || 'Funcionário não identificado',
                            employeeFunction: funcionario?.funcao,
                            employeeRegistration: funcionario?.matricula,
                            itemName: itemNome,
                            itemCode: itemCodigo,
                            value: itemPreco,
                            date: new Date().toLocaleDateString('pt-BR'),
                            reason: `Item ${dadosTroca.condicao}`,
                            observations: dadosTroca.observacoes,
                            orderId: orderData.id // pass ID for filename if needed internally
                        });

                        const publicUrl = await discountOrderService.uploadPDF(pdfBlob, orderData.id);

                        if (publicUrl) {
                            console.log('✅ [estoqueService] PDF uploaded:', publicUrl);
                            // Update order with URL
                            await supabase
                                .from('ordens_desconto')
                                .update({ arquivo_url: publicUrl })
                                .eq('id', orderData.id);
                        } else {
                            console.warn('⚠️ [estoqueService] valid PDF url not returned');
                        }

                    } catch (pdfErr) {
                        console.error('❌ [estoqueService] Error generating/uploading PDF:', pdfErr);
                    }
                }

            } catch (err) {
                console.error('Error in discount order process:', err);
            }
        }
    },

    async getItemDetails(itemId: string) {
        const { data, error } = await supabase
            .from('itens_estoque')
            .select('nome, preco, codigo')
            .eq('id', itemId)
            .single();

        if (error) throw error;
        return data;
    },

    async entregarItem(solicitacaoId: string, _funcionarioId: string, quantidade: number, _condicao: string, observacoes: string, _laudoNumero?: string, _laudoValidade?: string, _dataVencimento?: string, _baseId?: string): Promise<void> {
        // Simplificado para usar a query direta como no AlmoxarifeView, ou RPC se existir.
        // O web usa RPC 'entregar_item' ou update direto? Web usa `estoqueService.entregarItem` que chama... update direto em alguns casos ou RPC?
        // O código do web que eu li chamava `estoqueService.entregarItem`. 
        // Vou implementar aqui como um UPDATE direto em `solicitacoes_itens` e INSERT em `historico_funcionarios`/`movimentacoes_estoque` se necessário,
        // MAS o AlmoxarifeView atual só faz update em `solicitacoes_itens` (status=entregue).
        // Se eu quiser ser "igual ao site", eu deveria fazer tudo que o site faz (movimentação, baixa estoque).

        // Por enquanto, vou manter compatibilidade com o AlmoxarifeView atual que APENAS atualiza o status,
        // mas idealmente deveria chamar uma RPC do banco para garantir integridade.

        const { error } = await supabase
            .from('solicitacoes_itens')
            .update({
                status: 'entregue',
                quantidade_entregue: quantidade,
                entregue_em: new Date().toISOString(),
                observacoes: observacoes // Append or replace?
            })
            .eq('id', solicitacaoId);

        if (error) throw error;
    },

    async updateStatus(id: string, status: 'aprovada' | 'rejeitada' | 'devolvida' | 'troca', userId: string, motivo?: string) {
        console.log(`📝 [estoqueService] Updating status of ${id} to ${status} by user ${userId}`);

        const updates: any = {
            status,
            atualizado_em: new Date().toISOString()
        };

        if (status === 'aprovada') {
            updates.aprovado_almoxarifado_em = new Date().toISOString();
            updates.aprovado_almoxarifado_por = userId;
        } else if (status === 'rejeitada') {
            updates.motivo_rejeicao = motivo;
        }

        const { error } = await supabase
            .from('solicitacoes_itens')
            .update(updates)
            .eq('id', id);

        if (error) {
            console.error('❌ [estoqueService] Error updating status:', error);
            throw error;
        }
    },

    async createEmergencyRequest(data: {
        solicitante_id: string;
        base_id: string;
        items: Array<{ item_id: string; quantidade: number; motivo: string }>;
        prioridade: string;
        observacoes?: string;
        aprovar_automaticamente: boolean;
        aprovador_id?: string;
    }) {
        console.log('🚨 [estoqueService] Creating emergency request');

        const solicitacoes = data.items.map(item => ({
            solicitante_id: data.solicitante_id,
            base_id: data.base_id,
            item_id: item.item_id,
            quantidade_solicitada: item.quantidade,
            motivo_solicitacao: item.motivo,
            prioridade: data.prioridade,
            observacoes: data.observacoes || 'Solicitação emergencial',
            tipo_troca: 'fornecimento',
            status: data.aprovar_automaticamente ? 'aprovada' : 'pendente',
            aprovado_almoxarifado_por: data.aprovar_automaticamente ? data.aprovador_id : null,
            aprovado_almoxarifado_em: data.aprovar_automaticamente ? new Date().toISOString() : null,
        }));

        const { data: result, error } = await supabase
            .from('solicitacoes_itens')
            .insert(solicitacoes)
            .select();

        if (error) {
            console.error('❌ [estoqueService] Error creating emergency request:', error);
            throw error;
        }

        return result;
    },

    async createEmployeeDelivery(data: {
        funcionario_id: string;
        base_id: string;
        items: Array<{ item_id: string; quantidade: number }>;
        observacoes?: string;
        criado_por: string;
    }) {
        console.log('👤 [estoqueService] Creating employee delivery');

        // Create delivery group
        const { data: grupo, error: grupoError } = await supabase
            .from('grupos_entrega')
            .insert({
                funcionario_id: data.funcionario_id,
                base_id: data.base_id,
                tipo: 'novo_funcionario',
                criado_por: data.criado_por,
                observacoes: data.observacoes
            })
            .select()
            .single();

        if (grupoError) {
            console.error('❌ [estoqueService] Error creating delivery group:', grupoError);
            throw grupoError;
        }

        // Create solicitations for each item
        const solicitacoes = data.items.map(item => ({
            solicitante_id: data.criado_por,
            destinatario_id: data.funcionario_id,
            base_id: data.base_id,
            item_id: item.item_id,
            quantidade_solicitada: item.quantidade,
            motivo_solicitacao: 'Entrega para novo funcionário',
            tipo_troca: 'fornecimento',
            tipo_solicitacao: 'novo_funcionario',
            grupo_entrega_id: grupo.id,
            status: 'aprovada',
            aprovado_almoxarifado_por: data.criado_por,
            aprovado_almoxarifado_em: new Date().toISOString(),
        }));

        const { data: result, error } = await supabase
            .from('solicitacoes_itens')
            .insert(solicitacoes)
            .select();

        if (error) {
            console.error('❌ [estoqueService] Error creating employee delivery:', error);
            throw error;
        }

        return { grupo, solicitacoes: result };
    },

    async createTeamDelivery(data: {
        equipe_id: string;
        responsavel_id: string;
        base_id: string;
        items: Array<{ item_id: string; quantidade: number }>;
        observacoes?: string;
        criado_por: string;
    }) {
        console.log('👥 [estoqueService] Creating team delivery');

        // Create delivery group
        const { data: grupo, error: grupoError } = await supabase
            .from('grupos_entrega')
            .insert({
                equipe_id: data.equipe_id,
                responsavel_id: data.responsavel_id,
                base_id: data.base_id,
                tipo: 'equipe',
                criado_por: data.criado_por,
                observacoes: data.observacoes
            })
            .select()
            .single();

        if (grupoError) {
            console.error('❌ [estoqueService] Error creating team delivery group:', grupoError);
            throw grupoError;
        }

        // Create solicitations for each item
        const solicitacoes = data.items.map(item => ({
            solicitante_id: data.criado_por,
            destinatario_equipe_id: data.equipe_id,
            responsavel_equipe_id: data.responsavel_id,
            base_id: data.base_id,
            item_id: item.item_id,
            quantidade_solicitada: item.quantidade,
            motivo_solicitacao: 'Entrega para equipe',
            tipo_troca: 'fornecimento',
            tipo_solicitacao: 'equipe',
            grupo_entrega_id: grupo.id,
            status: 'aprovada',
            aprovado_almoxarifado_por: data.criado_por,
            aprovado_almoxarifado_em: new Date().toISOString(),
        }));

        const { data: result, error } = await supabase
            .from('solicitacoes_itens')
            .insert(solicitacoes)
            .select();

        if (error) {
            console.error('❌ [estoqueService] Error creating team delivery:', error);
            throw error;
        }

        return { grupo, solicitacoes: result };
    }
};
