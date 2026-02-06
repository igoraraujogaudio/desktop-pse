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

            // 2. Create Discount Order if requested
            if (dadosTroca.gerarDesconto && dadosTroca.valorDesconto) {
                console.log('💰 [estoqueService] Generating discount order for return');

                try {
                    // Fetch details of the returned item
                    const { data: invItem } = await supabase
                        .from('historico_funcionarios')
                        .select('*, item_estoque:itens_estoque(nome, codigo)')
                        .eq('id', dadosTroca.inventoryItemId)
                        .single();

                    if (invItem && invItem.funcionario_id) {
                        await this.createDiscountOrder({
                            solicitacao: solicitacao,
                            funcionarioId: invItem.funcionario_id,
                            baseId: solicitacao.base_id,
                            itemId: invItem.item_id,
                            itemNome: invItem.item_estoque?.nome || 'Item Devolvido',
                            itemCodigo: invItem.item_estoque?.codigo || '',
                            valorTotal: dadosTroca.valorDesconto,
                            parcelas: dadosTroca.parcelasDesconto || 1,
                            condicao: dadosTroca.condicao as 'danificado' | 'perdido',
                            observacoes: dadosTroca.observacoes,
                            criadoPor: userId
                        });
                    } else {
                        console.error('❌ [estoqueService] Failed to fetch returned item details for discount order');
                    }
                } catch (err) {
                    console.error('❌ [estoqueService] Error creating discount order:', err);
                    // Don't throw here to avoid blocking the main delivery success flow, but log it.
                }
            }
        }

        console.log('✅ [estoqueService] Return processed successfully');
    },

    async createDiscountOrder(data: {
        solicitacao: SolicitacaoItem;
        funcionarioId: string;
        baseId: string;
        itemId: string;
        itemNome: string;
        itemCodigo: string;
        valorTotal: number;
        parcelas: number;
        condicao: 'danificado' | 'perdido';
        observacoes: string;
        criadoPor: string;
    }) {
        console.log('💰 [estoqueService] Creating discount order via API');

        try {
            // Fetch Employee Data for CPF (required for API)
            // Use maybeSingle() to avoid 406 errors if employee doesn't exist
            const { data: funcionario, error: fetchError } = await supabase
                .from('funcionarios_ativos')
                .select('nome, matricula, cargo, cpf')
                .eq('id', data.funcionarioId)
                .limit(1)
                .maybeSingle();

            if (fetchError) {
                console.error('❌ [estoqueService] Error fetching employee:', JSON.stringify(fetchError));
            }

            if (!funcionario) {
                console.warn('⚠️ [estoqueService] Employee not found in funcionarios_ativos, using basic data');
            }

            // Call API via service
            // This handles DB creation, PDF generation (Server-Side), and Upload
            const result = await discountOrderService.createOrderViaAPI({
                employeeName: funcionario?.nome || 'Funcionário não identificado',
                employeeFunction: funcionario?.cargo || '',
                employeeRegistration: funcionario?.matricula,
                employeeCpf: funcionario?.cpf,
                itemName: data.itemNome,
                itemCode: data.itemCodigo,
                value: data.valorTotal,
                date: new Date().toLocaleDateString('pt-BR'),
                reason: `Item ${data.condicao}`,
                observations: data.observacoes,
                // Fields required for API
                criadoPor: data.criadoPor,
                funcionarioId: data.funcionarioId,
                baseId: data.baseId,
                parcelas: data.parcelas
            });

            console.log('✅ [estoqueService] Order created via API:', result.orderId);

            return {
                order: { id: result.orderId }, // Return format expected by View
                pdfBlob: result.pdfBlob,
                publicUrl: result.publicUrl
            };

        } catch (error) {
            console.error('❌ [estoqueService] Error creating discount order:', error);
            throw error;
        }
    },

    async getItemDetails(itemId: string) {
        const { data, error } = await supabase
            .from('itens_estoque')
            .select(`
                    nome, 
                    codigo,
                    item_catalogo:itens_catalogo (
                        valor_unitario
                    )
                `)
            .eq('id', itemId)
            .single();

        if (error) throw error;

        // Extract price safely
        const itemCatalogo = data.item_catalogo as any;
        const preco = itemCatalogo?.valor_unitario || 0;

        return {
            nome: data.nome,
            codigo: data.codigo,
            preco: preco
        };
    },


    async entregarItem(solicitacaoId: string, _funcionarioId: string, quantidade: number, _condicao: string, observacoes: string, laudoNumero?: string, laudoValidade?: string, _dataVencimento?: string, _baseId?: string): Promise<void> {
        const updates: any = {
            status: 'entregue',
            quantidade_entregue: quantidade,
            entregue_em: new Date().toISOString(),
            observacoes: observacoes
        };

        if (laudoNumero) {
            updates.numero_laudo = laudoNumero;
        }

        if (laudoValidade) {
            updates.validade_laudo = laudoValidade;
        }

        const { error } = await supabase
            .from('solicitacoes_itens')
            .update(updates)
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
    },

    async findFuncionarioByCpf(cpf: string) {
        const { data, error } = await supabase
            .from('funcionarios_ativos')
            .select('nome, cpf')
            .eq('cpf', cpf.replace(/\D/g, ''))
            .limit(1)
            .maybeSingle();

        if (error) {
            console.error('❌ [estoqueService] Error searching employee by CPF:', error);
            return null;
        }
        return data;
    },

    async searchFuncionarios(term: string) {
        if (!term || term.length < 3) return [];

        console.log('🔍 [estoqueService] Searching funcionarios with term:', term);
        try {
            // Remove non-numeric chars for CPF search if term looks like CPF part?
            // Or just raw string search. CPF usually stored as string "000.000.000-00" or numeric "00000000000".
            // Let's assume raw search for robustness.
            const { data, error } = await supabase
                .from('funcionarios_ativos')
                .select('id, nome, matricula, cargo, cpf')
                .or(`nome.ilike.%${term}%,matricula.ilike.%${term}%,cpf.ilike.%${term}%`)
                .limit(20);

            if (error) {
                console.error('❌ [estoqueService] Supabase Error searching funcionarios:', error);
                throw error;
            }

            // Deduplicate results by ID
            const uniqueResults = Array.from(new Map(data?.map(item => [item.id, item])).values());

            console.log(`✅ [estoqueService] Found ${uniqueResults.length} unique results for "${term}"`);
            return uniqueResults;
        } catch (err) {
            console.error('❌ [estoqueService] Exception searching funcionarios:', err);
            return [];
        }
    },

    async getItensPorCategoria(categoria: string, baseId?: string) {
        console.log(`🔍 [estoqueService] Fetching items for category: ${categoria}, base: ${baseId || 'all'}`);
        
        let query = supabase
            .from('itens_estoque')
            .select('*')
            .eq('categoria', categoria)
            .eq('status', 'ativo');

        if (baseId) {
            query = query.eq('base_id', baseId);
        }

        const { data, error } = await query.order('nome');

        if (error) {
            console.error('❌ [estoqueService] Error fetching items:', error);
            throw error;
        }

        console.log(`✅ [estoqueService] Found ${data?.length || 0} items`);
        return data || [];
    },

    async createItem(itemData: any) {
        console.log('📝 [estoqueService] Creating new item:', itemData);

        const { data, error } = await supabase
            .from('itens_estoque')
            .insert({
                ...itemData,
                criado_em: new Date().toISOString(),
                atualizado_em: new Date().toISOString()
            })
            .select()
            .single();

        if (error) {
            console.error('❌ [estoqueService] Error creating item:', error);
            throw error;
        }

        console.log('✅ [estoqueService] Item created:', data.id);
        return data;
    },

    async processarNotaFiscal(
        notaFiscal: any,
        itens: any[]
    ) {
        console.log('📦 [estoqueService] Processing nota fiscal:', notaFiscal.numero);

        const { data: nf, error: nfError } = await supabase
            .from('notas_fiscais')
            .insert({
                ...notaFiscal,
                criado_em: new Date().toISOString(),
                atualizado_em: new Date().toISOString()
            })
            .select('*')
            .single();

        if (nfError) {
            console.error('❌ [estoqueService] Error creating nota fiscal:', nfError);
            throw nfError;
        }

        const itensComNF = itens.map(item => ({
            ...item,
            nota_fiscal_id: nf.id
        }));

        const { error: itensError } = await supabase
            .from('itens_nota_fiscal')
            .insert(itensComNF);

        if (itensError) {
            console.error('❌ [estoqueService] Error inserting items:', itensError);
            throw itensError;
        }

        for (const item of itens) {
            if (item.item_id) {
                const { data: itemAtual, error: itemAtualError } = await supabase
                    .from('itens_estoque')
                    .select('estoque_atual')
                    .eq('id', item.item_id)
                    .eq('base_id', notaFiscal.base_id)
                    .single();

                if (itemAtualError) throw itemAtualError;

                const quantidadeAnterior = itemAtual?.estoque_atual || 0;
                const quantidadeAtual = quantidadeAnterior + item.quantidade;

                const { error: movError } = await supabase
                    .from('movimentacoes_estoque')
                    .insert({
                        item_id: item.item_id,
                        tipo: 'entrada',
                        quantidade: item.quantidade,
                        quantidade_anterior: quantidadeAnterior,
                        quantidade_atual: quantidadeAtual,
                        motivo: `Entrada NF ${nf.numero}`,
                        documento_referencia: nf.numero,
                        usuario_id: nf.usuario_recebimento,
                        base_id: notaFiscal.base_id,
                        observacoes: `Entrada por Nota Fiscal ${nf.numero}`,
                        criado_em: new Date().toISOString()
                    });

                if (movError) {
                    console.error('❌ [estoqueService] Error creating movement:', movError);
                    throw movError;
                }
            }
        }

        console.log('✅ [estoqueService] Nota fiscal processed successfully');
        return nf;
    },

    async processarRecebimentoTransferencia(
        dadosTransferencia: {
            base_origem_id: string;
            base_destino_id: string;
            numero_transferencia?: string;
            data_recebimento: string;
            observacoes?: string;
            usuario_recebimento: string;
            contrato_destino_id?: string;
        },
        itens: any[]
    ) {
        console.log('🔄 [estoqueService] Processing transfer receipt');

        let numeroTransferenciaBase = dadosTransferencia.numero_transferencia;
        if (!numeroTransferenciaBase) {
            const { data: numeroData, error: numeroError } = await supabase
                .rpc('gerar_numero_transferencia');
            
            if (numeroError) throw numeroError;
            numeroTransferenciaBase = numeroData;
        }

        const { data: baseOrigem } = await supabase
            .from('bases')
            .select('nome')
            .eq('id', dadosTransferencia.base_origem_id)
            .single();

        const { data: baseDestino } = await supabase
            .from('bases')
            .select('nome')
            .eq('id', dadosTransferencia.base_destino_id)
            .single();

        for (const item of itens) {
            if (!item.item_id) continue;

            const { error: transfError } = await supabase.rpc('criar_transferencia_recebimento', {
                p_numero_transferencia: numeroTransferenciaBase,
                p_item_estoque_id: item.item_id,
                p_quantidade: item.quantidade,
                p_valor_unitario: item.valor_unitario,
                p_base_origem_id: dadosTransferencia.base_origem_id,
                p_base_destino_id: dadosTransferencia.base_destino_id,
                p_data_recebimento: dadosTransferencia.data_recebimento,
                p_solicitante_id: dadosTransferencia.usuario_recebimento,
                p_recebido_por_id: dadosTransferencia.usuario_recebimento,
                p_motivo: `Recebimento de transferência entre bases - ${numeroTransferenciaBase}`,
                p_contrato_destino_id: dadosTransferencia.contrato_destino_id || null,
                p_observacoes_recebimento: item.observacoes || dadosTransferencia.observacoes || null
            });

            if (transfError) {
                console.error('❌ [estoqueService] Error creating transfer:', transfError);
                throw transfError;
            }
        }

        for (const item of itens) {
            if (!item.item_id) continue;

            const { data: itemAtual, error: itemAtualError } = await supabase
                .from('itens_estoque')
                .select('estoque_atual')
                .eq('id', item.item_id)
                .eq('base_id', dadosTransferencia.base_destino_id)
                .single();

            if (itemAtualError) throw itemAtualError;

            const quantidadeAnterior = itemAtual?.estoque_atual || 0;
            const quantidadeAtual = quantidadeAnterior + item.quantidade;

            const { error: movError } = await supabase
                .from('movimentacoes_estoque')
                .insert({
                    item_id: item.item_id,
                    tipo: 'entrada',
                    quantidade: item.quantidade,
                    quantidade_anterior: quantidadeAnterior,
                    quantidade_atual: quantidadeAtual,
                    motivo: `Recebimento de transferência ${numeroTransferenciaBase} da base ${baseOrigem?.nome || dadosTransferencia.base_origem_id}`,
                    documento_referencia: numeroTransferenciaBase,
                    usuario_id: dadosTransferencia.usuario_recebimento,
                    base_id: dadosTransferencia.base_destino_id,
                    local_origem: baseOrigem?.nome || dadosTransferencia.base_origem_id,
                    local_destino: baseDestino?.nome || dadosTransferencia.base_destino_id,
                    observacoes: item.observacoes || dadosTransferencia.observacoes || undefined,
                    criado_em: new Date().toISOString()
                });

            if (movError) {
                console.error('❌ [estoqueService] Error creating movement:', movError);
                throw movError;
            }
        }

        console.log('✅ [estoqueService] Transfer processed successfully');
    },

    async processarDevolucao(
        funcionarioId: string,
        itens: Array<{
            id: string;
            item_estoque_id?: string;
            quantidade: number;
            source: 'inventario' | 'base';
        }>,
        condicao: 'bom' | 'danificado' | 'reteste' | 'perdido' | 'desgaste',
        observacoes: string,
        usuarioId: string
    ) {
        console.log('🔄 [estoqueService] Processing return:', { funcionarioId, itens, condicao });

        const timestamp = new Date().toISOString();
        const resultados = [];

        for (const itemSelecionado of itens) {
            const itemId = itemSelecionado.item_estoque_id || itemSelecionado.id;

            // Buscar histórico original da entrega
            const { data: historicoOriginal } = await supabase
                .from('historico_funcionarios')
                .select('solicitante_original_id, base_id, data_entrega, responsavel_entrega')
                .eq('funcionario_id', funcionarioId)
                .eq('item_id', itemId)
                .eq('tipo_movimentacao', 'entrega')
                .order('data_entrega', { ascending: false })
                .limit(1)
                .maybeSingle();

            // Buscar base_id do item se não encontrou no histórico
            let baseIdParaSalvar = historicoOriginal?.base_id;
            if (!baseIdParaSalvar) {
                const { data: itemEstoque } = await supabase
                    .from('itens_estoque')
                    .select('base_id')
                    .eq('id', itemId)
                    .maybeSingle();
                baseIdParaSalvar = itemEstoque?.base_id;
            }

            // Criar registro no histórico de funcionários
            const { data: historicoInsercao, error: historicoError } = await supabase
                .from('historico_funcionarios')
                .insert({
                    funcionario_id: funcionarioId,
                    item_id: itemId,
                    quantidade: itemSelecionado.quantidade || 1,
                    tipo_movimentacao: 'devolucao',
                    data_entrega: historicoOriginal?.data_entrega || '1900-01-01T00:00:00Z',
                    data_devolucao: timestamp,
                    condicao_entrega: 'usado_bom',
                    condicao_devolucao: condicao,
                    observacoes_devolucao: observacoes || '',
                    responsavel_entrega: historicoOriginal?.responsavel_entrega || usuarioId,
                    responsavel_devolucao: usuarioId,
                    solicitante_original_id: historicoOriginal?.solicitante_original_id,
                    base_id: baseIdParaSalvar,
                    status: condicao === 'bom' ? 'devolvido' :
                        condicao === 'desgaste' ? 'desgaste' :
                            condicao === 'danificado' ? 'danificado' :
                                condicao === 'reteste' ? 'reteste' : 'perdido'
                })
                .select()
                .single();

            if (historicoError) {
                console.error('❌ [estoqueService] Error saving to history:', historicoError);
                throw historicoError;
            }

            // Se item veio do inventário, remover do inventário
            if (itemSelecionado.source === 'inventario') {
                const { error: deleteError } = await supabase
                    .from('inventario_funcionario')
                    .delete()
                    .eq('id', itemSelecionado.id);

                if (deleteError) {
                    console.error('❌ [estoqueService] Error deleting from inventory:', deleteError);
                    throw deleteError;
                }
            }

            // Se item em bom estado, retornar ao estoque
            if (condicao === 'bom') {
                const quantidade = itemSelecionado.quantidade || 1;

                // Buscar estoque atual
                const { data: itemAtual, error: fetchError } = await supabase
                    .from('itens_estoque')
                    .select('estoque_atual')
                    .eq('id', itemId)
                    .single();

                if (fetchError) {
                    console.error('❌ [estoqueService] Error fetching stock:', fetchError);
                } else {
                    // Incrementar estoque
                    const novoEstoque = (itemAtual.estoque_atual || 0) + quantidade;
                    const { error: estoqueError } = await supabase
                        .from('itens_estoque')
                        .update({
                            estoque_atual: novoEstoque,
                            atualizado_em: timestamp
                        })
                        .eq('id', itemId);

                    if (estoqueError) {
                        console.error('❌ [estoqueService] Error updating stock:', estoqueError);
                    } else {
                        console.log(`✅ [estoqueService] Stock updated: +${quantidade} units`);
                    }
                }

                // Registrar movimentação
                const { error: movError } = await supabase
                    .from('movimentacoes_estoque')
                    .insert({
                        item_id: itemId,
                        tipo: 'entrada',
                        quantidade: quantidade,
                        motivo: `Devolução de ${condicao}`,
                        usuario_id: usuarioId,
                        base_id: baseIdParaSalvar,
                        criado_em: timestamp
                    });

                if (movError) {
                    console.error('❌ [estoqueService] Error creating movement:', movError);
                }
            }

            // Se condição for reteste, criar registro de reteste
            if (condicao === 'reteste') {
                const { error: retesteError } = await supabase
                    .from('itens_reteste')
                    .insert({
                        item_estoque_id: itemId,
                        funcionario_id: funcionarioId,
                        motivo_reteste: observacoes || 'Item devolvido para reteste',
                        data_entrada_reteste: timestamp,
                        tipo_reteste: 'devolucao',
                        status: 'aguardando_reteste',
                        criado_por: usuarioId
                    });

                if (retesteError) {
                    console.error('❌ [estoqueService] Error creating reteste:', retesteError);
                }
            }

            resultados.push(historicoInsercao);
        }

        console.log('✅ [estoqueService] Return processed successfully');
        return resultados;
    },

    async criarSolicitacao(params: {
        item_id: string;
        solicitante_id: string;
        destinatario_id: string;
        base_id: string;
        quantidade_solicitada: number;
        prioridade: 'baixa' | 'normal' | 'alta' | 'urgente';
        tipo_troca: 'desconto' | 'troca' | 'fornecimento';
        motivo_solicitacao: string;
        observacoes?: string;
    }): Promise<SolicitacaoItem> {
        console.log('🚨 [estoqueService] Creating emergency solicitation:', params);

        const insertData: Record<string, unknown> = {
            item_id: params.item_id,
            solicitante_id: params.solicitante_id,
            destinatario_id: params.destinatario_id,
            base_id: params.base_id,
            quantidade_solicitada: params.quantidade_solicitada,
            prioridade: params.prioridade,
            tipo_troca: params.tipo_troca,
            motivo_solicitacao: params.motivo_solicitacao,
        };

        if (params.observacoes) {
            insertData.observacoes = params.observacoes;
        }

        const { data, error } = await supabase
            .from('solicitacoes_itens')
            .insert(insertData)
            .select(`
                *,
                item:itens_estoque!solicitacoes_itens_item_id_fkey(id, nome, codigo, estoque_atual),
                solicitante:usuarios!solicitacoes_itens_solicitante_id_fkey(id, nome, email),
                destinatario:usuarios!solicitacoes_itens_destinatario_id_fkey(id, nome, matricula),
                base:bases!solicitacoes_itens_base_id_fkey(id, nome)
            `)
            .single();

        if (error) {
            console.error('❌ [estoqueService] Error creating solicitation:', error);
            throw error;
        }

        console.log('✅ [estoqueService] Solicitation created:', data.id);
        return data as SolicitacaoItem;
    },

    async aprovarSolicitacao(solicitacaoId: string, aprovadorId: string, quantidadeAprovada: number, observacoes?: string): Promise<void> {
        console.log('✅ [estoqueService] Approving solicitation:', solicitacaoId);

        const { error } = await supabase
            .from('solicitacoes_itens')
            .update({
                status: 'aprovada',
                quantidade_aprovada: quantidadeAprovada,
                aprovado_almoxarifado_por: aprovadorId,
                aprovado_almoxarifado_em: new Date().toISOString(),
                dupla_aprovacao_completa: true,
                observacoes: observacoes
            })
            .eq('id', solicitacaoId);

        if (error) {
            console.error('❌ [estoqueService] Error approving solicitation:', error);
            throw error;
        }

        console.log('✅ [estoqueService] Solicitation approved');
    }
};
